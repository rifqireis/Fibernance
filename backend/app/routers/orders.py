"""Orders router for handling manual combo orders and stock management."""

import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.models import Account, Order, OrderResponse
from app.services.order_service import create_combo_order
from app.services.telegram_service import upload_video_to_telegram
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


class ComboOrderRequest(BaseModel):
    """Request schema for creating a combo order."""

    order_id: str = Field(
        default="",
        max_length=100,
        description="Order ID dari Itemku (Opsional)",
    )
    target_id: str = Field(
        min_length=1,
        max_length=100,
        description="Target player ID",
    )
    server_id: str = Field(
        min_length=1,
        max_length=50,
        description="Game server identifier",
    )
    total_diamond: int = Field(
        ge=1,
        description="Total diamonds to order",
    )
    selected_account_ids: list[int] = Field(
        min_items=1,
        description="List of account IDs to deduct from",
    )
    buyer_name: str = Field(
        min_length=1,
        max_length=200,
        description="Name of the buyer/customer",
    )
    game_username: str = Field(
        default="",
        max_length=100,
        description="Game account username (from Itemku order)",
    )
    item_name: str = Field(
        min_length=1,
        max_length=200,
        description="Name of the product/item (e.g., Starlight Card)",
    )
    quantity: int = Field(
        default=1,
        ge=1,
        description="Jumlah pesanan",
    )
    created_at: str = Field(
        default="",
        description="ISO 8601 timestamp saat order dibuat (dari client browser)",
    )


@router.post("/combo", response_model=OrderResponse)
async def create_combo_order_endpoint(
    request: ComboOrderRequest,
    session: AsyncSession = Depends(get_session),
) -> OrderResponse:
    """
    Create a combo order with equal distribution across selected accounts.
    
    This is for INTERNAL MANUAL GIFT orders - NOT connected to Digiflazz.
    Stock is reserved (deducted) immediately.

    Flow:
    1. Validate all selected accounts exist and are active
    2. Validate total stock is sufficient
    3. Deduct diamonds equally across accounts (distribute remainder)
    4. Calculate delivery_at based on 15:00 WIB cutoff
    5. Create Order with status="PENDING"
    6. Return order data

    Args:
        request: ComboOrderRequest with order details
        session: Database session

    Returns:
        OrderResponse: Created order data

    Raises:
        HTTPException: If order creation fails
    """

    invoice_ref = request.order_id.strip() if request.order_id.strip() else f"ORD-{str(uuid4())[:8]}"
    
    # Parse created_at from request (client timestamp), or fallback to server time
    from datetime import datetime
    if request.created_at.strip():
        try:
            created_at_dt = datetime.fromisoformat(request.created_at.replace('Z', '+00:00'))
            logger.info(f"📝 Parsed created_at from client: '{request.created_at}' → {created_at_dt} (tzinfo: {created_at_dt.tzinfo})")
        except (ValueError, AttributeError) as e:
            logger.warning(f"⚠️ Failed to parse created_at '{request.created_at}': {e}. Using server time.")
            created_at_dt = datetime.utcnow()
    else:
        created_at_dt = datetime.utcnow()
    
    logger.info(
        f"Creating combo order {invoice_ref} for {request.target_id} on {request.server_id} (created_at: {created_at_dt})"
    )

    try:
        # Create combo order (deduct diamonds from accounts, calculate delivery_at)
        order = await create_combo_order(
            session=session,
            target_id=request.target_id,
            server_id=request.server_id,
            total_diamond=request.total_diamond,
            selected_account_ids=request.selected_account_ids,
            invoice_ref=invoice_ref,
            buyer_name=request.buyer_name,
            item_name=request.item_name,
            quantity=request.quantity,
            created_at=created_at_dt,
        )

        logger.info(
            f"✅ Order {invoice_ref} created (PENDING, delivery: {order.delivery_at})"
        )
        return order

    except ValueError as e:
        logger.error(f"❌ Order validation failed {invoice_ref}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error creating order {invoice_ref}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create order")


@router.post("/{order_id}/finish", response_model=OrderResponse)
async def finish_order(
    order_id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> OrderResponse:
    """
    Mark an order as finished (status = DONE) with proof video.
    
    Uploads proof video to Telegram and stores the link.
    Stock was already reserved at order creation, so no further changes needed.

    Args:
        order_id: Order ID (UUID)
        file: Proof video file (UploadFile)
        session: Database session

    Returns:
        OrderResponse: Updated order data with proof_video_link

    Raises:
        HTTPException: If order not found, already completed, or video upload fails
    """
    # Fetch order
    stmt = select(Order).where(Order.id == order_id)
    result = await session.execute(stmt)
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status in ["DONE", "CANCELLED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot finish order in {order.status} status",
        )

    # Read file bytes from memory
    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error(f"❌ Error reading file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    # Validate file size (50MB max)
    MAX_FILE_SIZE = 50 * 1024 * 1024
    if len(file_bytes) > MAX_FILE_SIZE:
        file_size_mb = len(file_bytes) / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {file_size_mb:.2f}MB (max 50MB)",
        )

    # Upload to Telegram
    try:
        caption = f"Bukti Order {order.invoice_ref}"
        proof_video_link = upload_video_to_telegram(
            file_bytes=file_bytes,
            filename=file.filename or "proof_video.mp4",
            caption=caption,
        )
    except ValueError as e:
        logger.error(f"❌ Telegram upload failed for order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Video upload failed: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Unexpected error uploading video for order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload proof video")

    # Update order with proof link and mark as DONE
    try:
        order.proof_video_link = proof_video_link
        order.status = "DONE"
        session.add(order)
        await session.commit()
        await session.refresh(order)

        logger.info(f"✅ Order {order.invoice_ref} marked as DONE with proof: {proof_video_link}")
        return order

    except Exception as e:
        await session.rollback()
        logger.error(f"❌ Error updating order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update order")


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: str,
    session: AsyncSession = Depends(get_session),
) -> OrderResponse:
    """
    Cancel an order and refund diamonds back to source accounts.
    
    Reads deduction_breakdown and returns diamonds to each account.

    Args:
        order_id: Order ID (UUID)
        session: Database session

    Returns:
        OrderResponse: Updated order data

    Raises:
        HTTPException: If order not found or already completed
    """
    stmt = select(Order).where(Order.id == order_id)
    result = await session.execute(stmt)
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status in ["DONE", "CANCELLED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel order in {order.status} status",
        )

    # Process refund
    try:
        await _process_refund(session, order)

        # Update status to CANCELLED
        order.status = "CANCELLED"
        session.add(order)
        await session.commit()
        await session.refresh(order)

        logger.info(f"✅ Order {order.invoice_ref} cancelled and refunded")
        return order

    except Exception as e:
        await session.rollback()
        logger.error(f"❌ Error cancelling order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel order")


@router.get("")
@router.get("/")
async def list_orders(
    session: AsyncSession = Depends(get_session),
    skip: int = 0,
    limit: int = 50,
) -> list[OrderResponse]:
    """
    List all orders with pagination.

    Args:
        session: Database session
        skip: Number of records to skip
        limit: Number of records to return

    Returns:
        list[OrderResponse]: List of orders
    """
    stmt = select(Order).offset(skip).limit(limit)
    result = await session.execute(stmt)
    orders = result.scalars().all()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    session: AsyncSession = Depends(get_session),
) -> OrderResponse:
    """
    Get a single order by ID.

    Args:
        order_id: Order ID (UUID)
        session: Database session

    Returns:
        OrderResponse: Order data

    Raises:
        HTTPException: If order not found
    """
    stmt = select(Order).where(Order.id == order_id)
    result = await session.execute(stmt)
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return order


async def _process_refund(session: AsyncSession, order: Order) -> None:
    """
    Process refund for a cancelled order.

    Reads deduction_breakdown and adds back diamonds to source accounts.

    Args:
        session: AsyncSession for database access
        order: Order object with deduction_breakdown

    Raises:
        Exception: If refund processing fails
    """
    try:
        deduction_breakdown: dict = order.deduction_breakdown

        for account_name, deduction_amount in deduction_breakdown.items():
            # Query account by name
            stmt = select(Account).where(Account.name == account_name)
            result = await session.execute(stmt)
            account = result.scalars().first()

            if not account:
                logger.warn(
                    f"⚠️  Account '{account_name}' not found for refund (order {order.invoice_ref})"
                )
                continue

            # Add back diamonds
            account.stock_diamond += deduction_amount
            session.add(account)

            logger.info(
                f"💰 Refund: +{deduction_amount} diamonds to '{account_name}' (order {order.invoice_ref})"
            )

        logger.info(f"✅ Refund completed for order {order.invoice_ref}")

    except Exception as e:
        logger.error(f"❌ Error processing refund: {str(e)}")
        raise
