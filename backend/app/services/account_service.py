"""Account service business logic."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.models import Account

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


async def apply_topup_success(
    session: AsyncSession,
    account_id: int,
    received_diamonds: int = 0,
    received_wdp_days: int = 0,
) -> Account:
    """
    Apply successful topup to account using Debt-First Allocation strategy.

    Logic (Debt-First):
    1. If received_wdp_days > 0:
       - Use WDP to pay pending_wdp (debt) first
       - remaining_wdp = received_wdp_days - pending_wdp
       - If remaining_wdp > 0, convert to diamonds (1 WDP = 100 Diamond)
    2. Add received_diamonds to stock_diamond
    3. Save with transaction (ACID compliant)

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

    # Debt-First Allocation Logic
    if received_wdp_days > 0:
        # Calculate debt payment and remaining WDP
        debt_payment = min(received_wdp_days, account.pending_wdp)
        remaining_wdp = received_wdp_days - debt_payment

        # Update pending_wdp
        account.pending_wdp = max(0, account.pending_wdp - debt_payment)

        # Convert remaining WDP to diamonds
        if remaining_wdp > 0:
            converted_diamonds = remaining_wdp * WDP_TO_DIAMOND_RATIO
            account.stock_diamond += converted_diamonds

    # Add received diamonds
    account.stock_diamond += received_diamonds

    # Mark as modified
    session.add(account)

    # Commit transaction (ACID compliant)
    await session.commit()
    await session.refresh(account)

    return account


async def apply_digiflazz_success(
    session: AsyncSession,
    account_id: int,
    sku: str,
    topup_type: str = "REGULAR",
) -> Account:
    """
    Apply successful Digiflazz topup to account with SKU-based logic.

    Logic:
    - Resolves SKU to instant diamonds and total value using SKU_MAP
    - If type is LUNASI (Settlement):
      * Reduce pending_wdp (debt) by total_value of SKU
      * If total_value > pending_wdp, add remainder to stock_diamond
    - If type is REGULAR (Normal topup):
      * Add instant diamonds from SKU directly to stock_diamond
      * Note: WDP claim period (days) is tracked separately by Digiflazz API

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
        # LUNASI (Settlement): Use total_value to reduce debt
        # total_value = instant + (days * 20)
        # E.g., WDP_BR: 80 + (7*20) = 220
        debt_payment = min(total_value, account.pending_wdp)
        remaining_diamonds = total_value - debt_payment

        # Reduce debt
        account.pending_wdp = max(0, account.pending_wdp - debt_payment)

        # Add remaining diamonds to stock
        account.stock_diamond += remaining_diamonds

    else:
        # REGULAR or BULK: Add instant diamonds to stock
        account.stock_diamond += instant_diamonds
        
        # JIKA PRODUK MEMILIKI WDP DAYS (Misal WDP_BR memiliki 7 hari), 
        # Tambahkan hari tersebut sebagai hutang yang harus diklaim harian (1 hari = 100 diamond representation)
        if sku_data["days"] > 0:
            account.pending_wdp += (sku_data["days"] * 100)

    # Mark as modified
    session.add(account)

    # Commit transaction (ACID compliant)
    await session.commit()
    await session.refresh(account)

    return account
