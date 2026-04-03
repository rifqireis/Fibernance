"""Account service business logic."""

from datetime import datetime
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.models import Account, RestockQueue
from app.services.order_service import evaluate_order_readiness

logger = logging.getLogger(__name__)

# Constants
WDP_TO_DIAMOND_RATIO = 100  # 1 WDP = 100 Diamond
WDP_POTENTIAL_PER_DAY = 20  # Each WDP day generates 20 potential diamonds
WDP_POTENTIAL_CAP = 140  # Maximum potential from WDP (7 days * 20)
STOCK_THRESHOLD_AVAILABLE = 300
STOCK_THRESHOLD_FORECAST = 300

# SKU Product Mapping - Defines instant diamonds and total value per SKU
SKU_MAP = {
    "WDP_BR": {
        "instant": 80,  # Instant diamonds received immediately
        "days": 7,  # WDP claim period (20 diamond/day)
        "total_value": 220,  # Total value for LUNASI settlement (80 + 7*20)
    },
    "WDP_TR": {
        "instant": 80,
        "days": 7,
        "total_value": 220,
    },
    "ML_86": {
        "instant": 86,  # 86 Diamonds (no WDP period)
        "days": 0,
        "total_value": 86,
    },
}


# ============================================================================
# COMPUTED FIELD CALCULATORS
# ============================================================================


def calculate_real_diamond(account: Account) -> int:
    """
    Calculate real (current) diamond stock.

    Args:
        account: Account object

    Returns:
        int: Current stock_diamond value
    """
    return account.stock_diamond


def calculate_wdp_potential(account: Account) -> int:
    """
    Calculate potential diamonds from WDP debt, capped at 140.

    Logic:
    - wdp_potential = (pending_wdp / WDP_TO_DIAMOND_RATIO) * WDP_POTENTIAL_PER_DAY
    - Capped at WDP_POTENTIAL_CAP (140)

    Args:
        account: Account object

    Returns:
        int: Potential diamonds from WDP (0-140)
    """
    if account.pending_wdp <= 0:
        return 0

    # pending_wdp is in diamonds, convert to days then to potential
    # 1 WDP = 100 diamonds, 1 WDP day = 20 potential diamonds
    wdp_days = account.pending_wdp / WDP_TO_DIAMOND_RATIO
    wdp_potential = int(wdp_days * WDP_POTENTIAL_PER_DAY)

    # Cap at 140 (7 days max)
    return min(wdp_potential, WDP_POTENTIAL_CAP)


def calculate_potential_diamond(account: Account) -> int:
    """
    Calculate total potential diamonds (stock + WDP potential).

    Args:
        account: Account object

    Returns:
        int: Current stock + potential from WDP (capped)
    """
    return account.stock_diamond + calculate_wdp_potential(account)


def classify_account(account: Account) -> str:
    """
    Classify account based on stock levels.

    Logic:
    - "Available": stock_diamond >= 300
    - "Forecast": (stock_diamond + potential) >= 300 AND stock_diamond < 300
    - "Preorder": (stock_diamond + potential) < 300

    Args:
        account: Account object

    Returns:
        str: Classification ("Available", "Forecast", or "Preorder")
    """
    real_diamond = calculate_real_diamond(account)

    if real_diamond >= STOCK_THRESHOLD_AVAILABLE:
        return "Available"

    potential_diamond = calculate_potential_diamond(account)
    if potential_diamond >= STOCK_THRESHOLD_FORECAST:
        return "Forecast"

    return "Preorder"



# ============================================================================
# ACCOUNT MODIFICATION FUNCTIONS
# ============================================================================


async def _apply_deficit_payment(
    session: AsyncSession,
    account: Account,
    available_diamonds: int,
) -> tuple[int, set[str]]:
    """Apply incoming diamonds to account deficits and resolve active restock queues."""

    if available_diamonds <= 0 or account.deficit_diamond <= 0:
        return available_diamonds, set()

    deficit_payment = min(available_diamonds, account.deficit_diamond)
    account.deficit_diamond = max(0, account.deficit_diamond - deficit_payment)
    available_diamonds -= deficit_payment

    remaining_queue_payment = deficit_payment
    resolved_order_ids: set[str] = set()
    stmt = (
        select(RestockQueue)
        .where(
            RestockQueue.account_id == account.id,
            RestockQueue.status.in_(["OPEN", "IN_PROGRESS"]),
        )
        .order_by(RestockQueue.created_at, RestockQueue.id)
    )
    result = await session.execute(stmt)
    open_queues = result.scalars().all()
    resolution_time = datetime.now()

    for queue in open_queues:
        if remaining_queue_payment <= 0:
            break

        queue_payment = min(queue.deficit_diamond, remaining_queue_payment)
        queue.deficit_diamond -= queue_payment
        remaining_queue_payment -= queue_payment
        queue.updated_at = resolution_time

        if queue.deficit_diamond == 0:
            queue.status = "RESOLVED"
            resolved_order_ids.add(queue.order_id)

        session.add(queue)

    return available_diamonds, resolved_order_ids


def _apply_pending_wdp_legacy_settlement(account: Account, available_diamonds: int) -> int:
    """Apply remaining diamond value to legacy pending WDP after deficit settlement."""

    if available_diamonds <= 0 or account.pending_wdp <= 0:
        return available_diamonds

    debt_payment = min(available_diamonds, account.pending_wdp)
    account.pending_wdp = max(0, account.pending_wdp - debt_payment)
    return available_diamonds - debt_payment


async def apply_topup_success(
    session: AsyncSession,
    account_id: int,
    received_diamonds: int = 0,
    received_wdp_days: int = 0,
) -> Account:
    """
    Apply successful topup to an account using deficit-first allocation.

    Logic:
    1. Preserve the legacy pending_wdp bookkeeping for WDP-based topups.
    2. Apply any real diamond value to deficit_diamond first.
    3. Resolve the oldest open restock queues for the account.
    4. Add any remaining diamonds to stock_diamond.

    Args:
        session: AsyncSession for database operations
        account_id: Account ID to topup
        received_diamonds: Number of diamonds received (default 0)
        received_wdp_days: Number of WDP days received (default 0)

    Returns:
        Updated Account object

    Raises:
        ValueError: If account not found or invalid input
    """

    # Validate input
    if received_diamonds < 0:
        raise ValueError("received_diamonds cannot be negative")
    if received_wdp_days < 0:
        raise ValueError("received_wdp_days cannot be negative")

    # Fetch account with pessimistic lock (FOR UPDATE)
    stmt = select(Account).where(Account.id == account_id)
    result = await session.execute(stmt)
    account = result.scalars().first()

    if not account:
        raise ValueError(f"Account with ID {account_id} not found")

    if not account.is_active:
        raise ValueError(f"Account {account.name} is not active")

    available_diamonds = received_diamonds

    # Preserve the existing WDP bookkeeping flow for compatibility.
    if received_wdp_days > 0:
        debt_payment = min(received_wdp_days, account.pending_wdp)
        remaining_wdp = received_wdp_days - debt_payment

        account.pending_wdp = max(0, account.pending_wdp - debt_payment)

        if remaining_wdp > 0:
            available_diamonds += remaining_wdp * WDP_TO_DIAMOND_RATIO

    available_diamonds, resolved_order_ids = await _apply_deficit_payment(
        session=session,
        account=account,
        available_diamonds=available_diamonds,
    )
    account.stock_diamond += available_diamonds

    # Mark as modified
    session.add(account)

    # Commit transaction (ACID compliant)
    await session.commit()
    await session.refresh(account)

    for resolved_order_id in sorted(resolved_order_ids):
        try:
            await evaluate_order_readiness(session, resolved_order_id)
        except Exception as exc:
            logger.error(
                "Failed to reconcile order readiness for %s after topup success: %s",
                resolved_order_id,
                exc,
            )

    if resolved_order_ids:
        await session.refresh(account)

    return account


async def apply_digiflazz_success(
    session: AsyncSession,
    account_id: int,
    sku: str,
    topup_type: str = "REGULAR",
) -> Account:
    """
        Apply successful Digiflazz topup to an account with deficit-first logic.

    Logic:
    - Resolves SKU to instant diamonds and total value using SKU_MAP
    - If type is LUNASI (Settlement):
            * Use the total value to reduce deficit_diamond first
            * Resolve the oldest open restock queues for that account
            * Apply any remaining value to legacy pending_wdp
            * Add the final remainder to stock_diamond
    - If type is REGULAR (Normal topup):
            * Apply instant diamonds to deficit_diamond first
            * Resolve the oldest open restock queues for that account
            * Add any remaining instant diamonds to stock_diamond
            * Keep the legacy pending_wdp increment for WDP-style SKUs

    Args:
        session: AsyncSession for database operations
        account_id: Account ID to topup
        sku: SKU code (e.g., "WDP_BR", "WDP_TR", "ML_86")
        topup_type: Type of topup (REGULAR, LUNASI, BULK)

    Returns:
        Updated Account object

    Raises:
        ValueError: If account not found, invalid SKU, or invalid input
    """

    # Validate SKU
    if sku not in SKU_MAP:
        raise ValueError(f"Unknown SKU: {sku}. Available: {list(SKU_MAP.keys())}")

    if topup_type not in ["REGULAR", "LUNASI", "BULK"]:
        raise ValueError(f"Invalid topup type: {topup_type}")

    # Get SKU data
    sku_data = SKU_MAP[sku]
    instant_diamonds = sku_data["instant"]
    total_value = sku_data["total_value"]

    # Fetch account
    stmt = select(Account).where(Account.id == account_id)
    result = await session.execute(stmt)
    account = result.scalars().first()

    if not account:
        raise ValueError(f"Account with ID {account_id} not found")

    if not account.is_active:
        raise ValueError(f"Account {account.name} is not active")

    # Apply type-specific logic
    if topup_type == "LUNASI":
        remaining_diamonds, resolved_order_ids = await _apply_deficit_payment(
            session=session,
            account=account,
            available_diamonds=total_value,
        )
        remaining_diamonds = _apply_pending_wdp_legacy_settlement(
            account=account,
            available_diamonds=remaining_diamonds,
        )
        account.stock_diamond += remaining_diamonds

    else:
        remaining_diamonds, resolved_order_ids = await _apply_deficit_payment(
            session=session,
            account=account,
            available_diamonds=instant_diamonds,
        )
        account.stock_diamond += remaining_diamonds

        # Preserve the legacy WDP bookkeeping for compatibility.
        if sku_data["days"] > 0:
            account.pending_wdp += (sku_data["days"] * 100)

    # Mark as modified
    session.add(account)

    # Commit transaction (ACID compliant)
    await session.commit()
    await session.refresh(account)

    for resolved_order_id in sorted(resolved_order_ids):
        try:
            await evaluate_order_readiness(session, resolved_order_id)
        except Exception as exc:
            logger.error(
                "Failed to reconcile order readiness for %s after Digiflazz success: %s",
                resolved_order_id,
                exc,
            )

    if resolved_order_ids:
        await session.refresh(account)

    return account
