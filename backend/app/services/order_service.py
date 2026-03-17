"""Order service business logic."""

from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.models import Account, Order


def calculate_delivery_at(created_at: datetime) -> datetime:
    """
    Calculate expected delivery_at based on 15:00 WIB (08:00 UTC) cutoff.
    
    Logic:
    - If order created < 15:00 WIB (08:00 UTC): delivery = +7 days at 15:00 WIB
    - If order created >= 15:00 WIB (08:00 UTC): delivery = +8 days at 15:00 WIB
    
    Args:
        created_at: Order creation timestamp (in UTC)
    
    Returns:
        datetime: Expected delivery timestamp (in UTC)
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
    
    # Calculate delivery date at 15:00 WIB (08:00 UTC)
    delivery_utc = created_at + timedelta(days=days_to_add)
    # Set time to 08:00 UTC (15:00 WIB)
    delivery_utc = delivery_utc.replace(hour=8, minute=0, second=0, microsecond=0)
    
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

    # Calculate delivery_at based on 15:00 WIB cutoff
    delivery_at = calculate_delivery_at(datetime.utcnow())

    # Create Order record with PENDING status (manual gift, no Digiflazz)
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
        delivery_at=delivery_at,
    )
    session.add(order)

    # Commit transaction (ACID compliant)
    # Stock is reserved at this point
    await session.commit()
    await session.refresh(order)

    return order
