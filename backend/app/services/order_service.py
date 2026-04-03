"""Order service business logic."""

from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.models import Account, Order, RestockQueue


async def evaluate_order_readiness(session: AsyncSession, order_id: str) -> None:
    """Reconcile order status from active restock queues and the friend-delay time gate."""

    stmt = select(Order).where(Order.id == order_id)
    result = await session.execute(stmt)
    order = result.scalars().first()

    if not order or order.status in ["DONE", "CANCELLED"]:
        return

    queue_stmt = select(RestockQueue.id).where(
        RestockQueue.order_id == order_id,
        RestockQueue.status.in_(["OPEN", "IN_PROGRESS"]),
    )
    queue_result = await session.execute(queue_stmt)
    has_active_queue = queue_result.first() is not None

    if has_active_queue:
        target_status = "AWAITING_RESTOCK"
    else:
        now = datetime.now()
        delivery_gate = order.actual_delivery_at
        target_status = (
            "READY_TO_GIFT"
            if delivery_gate is not None and now >= delivery_gate
            else "FRIEND_DELAY_ACTIVE"
        )

    if order.status == target_status:
        return

    order.status = target_status
    order.updated_at = datetime.now()
    session.add(order)
    await session.commit()


def calculate_receipt_delivery_at(created_at: datetime) -> datetime:
    """
    Calculate delivery time for RECEIPT/STRUK printing (MARKUP TIME).
    
    Markup logic untuk prevent komplain pembeli:
    - Jika order < 15:00 WIB: delivery = +7 hari pada jam 15:00 WIB
    - Jika order >= 15:00 WIB: delivery = +8 hari pada jam 15:00 WIB
    
    Catatan: Input created_at SUDAH dalam format WIB dari client, TIDAK ADA KONVERSI
    
    Args:
        created_at: Order creation timestamp (WIB format, naive datetime dari client)
    
    Returns:
        datetime: Delivery timestamp with jam set to 15:00:00 WIB (receipt markup time)
        
    Example:
        - Order dibuat 14:00 WIB → Struk tunjukkan: +7 hari jam 15:00 WIB
        - Order dibuat 16:00 WIB → Struk tunjukkan: +8 hari jam 15:00 WIB
    """
    # Input SUDAH WIB, extract jam (0-23) langsung
    hour_wib = created_at.hour
    
    # Tentukan berapa hari ditambah
    if hour_wib < 15:
        # Sebelum cutoff 15:00 WIB: +7 hari
        days_to_add = 7
    else:
        # Sesudah cutoff 15:00 WIB: +8 hari
        days_to_add = 8
    
    # Hitung delivery: +7 atau +8 hari, JAM DI-SET KE 15:00:00 WIB
    delivery_wib = created_at + timedelta(days=days_to_add)
    # Replace jam menjadi 15:00:00 untuk markup struk
    delivery_wib = delivery_wib.replace(hour=15, minute=0, second=0, microsecond=0)
    
    return delivery_wib


def calculate_order_delivery_at(created_at: datetime) -> datetime:
    """
    Calculate delivery time for ORDER DATA (REAL DELIVERY TIME).
    
    Logika sederhana untuk data aktual pesanan:
    - Perhitungan: +7 hari dari waktu order
    - Preserve jam:menit:detik dari waktu order
    - Input SUDAH dalam format WIB dari client
    
    Args:
        created_at: Order creation timestamp (WIB format, naive datetime dari client)
    
    Returns:
        datetime: Delivery timestamp (+7 hari, jam:menit:detik sama dengan order creation)
        
    Example:
        - Order dibuat 14:30 WIB → Delivery: +7 hari jam 14:30 WIB
        - Order dibuat 16:45 WIB → Delivery: +7 hari jam 16:45 WIB
    """
    # Simple calculation: +7 hari, preserve jam:menit:detik
    delivery_wib = created_at + timedelta(days=7)
    
    return delivery_wib


def calculate_delivery_at(created_at: datetime) -> datetime:
    """
    DEPRECATED: Use calculate_receipt_delivery_at() or calculate_order_delivery_at() instead.
    
    Calculate expected delivery_at based on 15:00 WIB (08:00 UTC) cutoff.
    
    Logic:
    - If order created < 15:00 WIB (08:00 UTC): delivery = +7 days at SAME TIME as created
    - If order created >= 15:00 WIB (08:00 UTC): delivery = +8 days at SAME TIME as created
    
    Args:
        created_at: Order creation timestamp (in UTC)
    
    Returns:
        datetime: Expected delivery timestamp (in UTC) with same hour/minute preserved
    """
    # Ensure created_at is timezone-aware (UTC)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    
    # Convert to WIB (UTC+7)
    wib_tz = timezone(timedelta(hours=7))
    created_wib = created_at.astimezone(wib_tz)
    
    # Extract hour (0-23) in WIB
    hour_wib = created_wib.hour
    
    # Calculate days to add
    # Cutoff is 15:00 WIB
    if hour_wib < 15:
        # Order before cutoff: delivery in 7 days
        days_to_add = 7
    else:
        # Order after cutoff: delivery in 8 days
        days_to_add = 8
    
    # Calculate delivery date (7 or 8 days later, same hour:minute:second)
    delivery_utc = created_at + timedelta(days=days_to_add)
    # PRESERVE hour, minute, second from created_at (do not replace with 08:00)
    # This ensures delivery time matches order creation time
    
    # Ensure delivery_utc is timezone-aware (UTC) for proper JSON serialization
    if delivery_utc.tzinfo is None:
        delivery_utc = delivery_utc.replace(tzinfo=timezone.utc)
    
    return delivery_utc


async def create_combo_order(
    session: AsyncSession,
    target_id: str,
    server_id: str,
    total_diamond: int,
    selected_account_ids: list[int],
    invoice_ref: str,
    buyer_name: str,
    item_name: str,
    quantity: int = 1,
    created_at: datetime = None,
) -> Order:
    """
    Create a combo order with Equal Distribution algorithm.

    This is for internal manual gift orders and does not call Digiflazz.
    Real stock is reserved immediately. Any shortfall is recorded as account
    deficit and linked to new restock queue entries.

    Args:
        session: AsyncSession for database operations
        target_id: Target player ID or customer identifier
        server_id: Game server identifier
        total_diamond: Total diamonds to deduct
        selected_account_ids: List of account IDs to distribute deduction
        invoice_ref: Unique invoice reference
        buyer_name: Name of the buyer/customer
        item_name: Name of the product/item (e.g., Starlight Card)

    Returns:
        Created Order object with delivery_at calculated

    Raises:
        ValueError: If accounts are not found or inactive
    """

    # Use provided created_at (from client) or fallback to server time
    if created_at is None:
        created_at = datetime.now()  # Changed: datetime.utcnow() → datetime.now() (WIB from client)
    elif created_at.tzinfo is not None:
        # If timezone-aware, make it naive (treat as WIB)
        created_at = created_at.replace(tzinfo=None)
    
    # Validate input
    if total_diamond <= 0:
        raise ValueError("total_diamond must be greater than 0")

    if not selected_account_ids:
        raise ValueError("At least one account must be selected")

    # Fetch all selected accounts
    stmt = select(Account).where(Account.id.in_(selected_account_ids))
    result = await session.execute(stmt)
    accounts = result.scalars().all()

    if len(accounts) != len(selected_account_ids):
        raise ValueError("One or more selected accounts not found")

    # Check if all accounts are active
    for account in accounts:
        if not account.is_active:
            raise ValueError(f"Account '{account.name}' is not active")

    # Equal Distribution Algorithm
    num_accounts = len(accounts)
    base_deduction = total_diamond // num_accounts
    remainder = total_diamond % num_accounts

    # Track real reservations separately from supplier-backed deficits.
    deduction_breakdown: dict[str, int] = {}
    sending_accounts: dict[str, dict] = {}
    restock_requirements: list[tuple[int, int]] = []

    for index, account in enumerate(accounts):
        required_deduction = base_deduction + (1 if index < remainder else 0)
        reserved_deduction = min(account.stock_diamond, required_deduction)
        deficit_deduction = required_deduction - reserved_deduction

        if reserved_deduction > 0:
            account.stock_diamond -= reserved_deduction

        if deficit_deduction > 0:
            account.deficit_diamond += deficit_deduction
            restock_requirements.append((account.id, deficit_deduction))

        deduction_breakdown[account.name] = reserved_deduction
        sending_accounts[str(account.id)] = {
            "name": account.name,
            "game_id": account.game_id,
            "zone": account.zone,
            "deduction": required_deduction,
            "reserved_deduction": reserved_deduction,
            "deficit_deduction": deficit_deduction,
        }

        session.add(account)

    # Calculate delivery timestamps.
    delivery_at = calculate_receipt_delivery_at(created_at)
    actual_delivery_at = calculate_order_delivery_at(created_at)

    order_status = (
        "AWAITING_RESTOCK" if restock_requirements else "WAITING_FRIEND_ADD"
    )

    # Create the order first so deficit queues can link to the new order ID.
    order = Order(
        invoice_ref=invoice_ref,
        target_id=target_id,
        server_id=server_id,
        total_diamond=total_diamond,
        buyer_name=buyer_name,
        item_name=item_name,
        quantity=quantity,
        status=order_status,
        deduction_breakdown=deduction_breakdown,
        sending_accounts=sending_accounts,
        delivery_at=delivery_at,
        actual_delivery_at=actual_delivery_at,
        created_at=created_at,
        updated_at=created_at,
    )
    session.add(order)
    await session.flush()

    for account_id, deficit_amount in restock_requirements:
        session.add(
            RestockQueue(
                account_id=account_id,
                order_id=order.id,
                deficit_diamond=deficit_amount,
                status="OPEN",
                created_at=created_at,
                updated_at=created_at,
            )
        )

    # Commit transaction (ACID compliant)
    await session.commit()
    await session.refresh(order)

    return order
