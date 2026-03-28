"""Order service business logic."""

from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.models import Account, Order


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
    
    This is for INTERNAL MANUAL GIFT orders - NOT connected to Digiflazz.
    Stock is reserved (deducted) immediately upon order creation.

    Logic (Equal Distribution):
    1. Fetch accounts by selected_account_ids
    2. Check total stock_diamond >= total_diamond (raise ValueError if not)
    3. base_deduction = total_diamond // number_of_accounts
    4. remainder = total_diamond % number_of_accounts
    5. Iterate: deduct base_deduction from each account, distribute remainder +1 per account
    6. Record deduction_breakdown as JSON
    7. Calculate delivery_at based on 15:00 WIB cutoff
    8. Create Order with status="PENDING" and commit (ACID)

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
        ValueError: If accounts not found or insufficient stock
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

    # Prepare deduction breakdown
    deduction_breakdown: dict[str, int] = {}
    accounts_to_deduct = list(accounts)  # Make a copy for iteration

    # Apply base deduction to all accounts
    for account in accounts_to_deduct:
        deduction_breakdown[account.name] = base_deduction
        account.stock_diamond -= base_deduction

    # Distribute remainder (+1 per account until remainder is 0)
    remainder_index = 0
    while remainder > 0:
        if remainder_index >= len(accounts_to_deduct):
            remainder_index = 0

        account = accounts_to_deduct[remainder_index]
        deduction_breakdown[account.name] += 1
        account.stock_diamond -= 1
        remainder -= 1
        remainder_index += 1

    # Add updated accounts to session (stock reservation)
    for account in accounts_to_deduct:
        session.add(account)

    # Prepare sending_accounts with account details
    sending_accounts: dict[str, dict] = {}
    for account in accounts_to_deduct:
        sending_accounts[str(account.id)] = {
            "name": account.name,
            "deduction": deduction_breakdown[account.name],
        }

    # Calculate delivery_at for RECEIPT/STRUK (markup time dengan jam 15:00 WIB)
    # Fungsi ini untuk catatan pembeli dan prevent komplain
    delivery_at = calculate_receipt_delivery_at(created_at)
    
    # Calculate actual_delivery_at for ORDER DATA (real +7 days from order creation)
    # This is the actual delivery time shown on Orders page
    actual_delivery_at = calculate_order_delivery_at(created_at)
    
    # NOTE: 
    # - delivery_at = Receipt/Struk time (markup dengan jam 15:00)
    # - actual_delivery_at = Order real time (+7 hari dari order creation)

    # Create Order record with PENDING status (manual gift, no Digiflazz)
    # IMPORTANT: Set created_at explicitly to preserve WIB time (not use default utcnow)
    order = Order(
        invoice_ref=invoice_ref,
        target_id=target_id,
        server_id=server_id,
        total_diamond=total_diamond,
        buyer_name=buyer_name,
        item_name=item_name,
        quantity=quantity,
        status="PENDING",
        deduction_breakdown=deduction_breakdown,
        sending_accounts=sending_accounts,
        delivery_at=delivery_at,  # Receipt/Struk time (jam 15:00)
        actual_delivery_at=actual_delivery_at,  # Order real time (+7 hari)
        created_at=created_at,  # Explicitly set to when order was created (WIB)
        updated_at=created_at,  # Same as created_at at order creation time
    )
    session.add(order)

    # Commit transaction (ACID compliant)
    # Stock is reserved at this point
    await session.commit()
    await session.refresh(order)

    return order
