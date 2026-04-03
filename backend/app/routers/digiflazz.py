"""Digiflazz router for handling restock topup transactions."""

import asyncio
import logging
import json
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.models import Account, TopupHistory, TopupHistoryResponse, CostPrice, CostPriceUpdate, CostPriceResponse, RestockQueue
from app.services.digiflazz_service import DigiflazzService
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize DigiflazzService as a module-level singleton (thread-safe)
digiflazz_service = DigiflazzService()


class TopupRequest(BaseModel):
    """Request schema for creating a topup transaction."""

    account_id: int = Field(
        description="Account ID to topup",
    )
    sku: str = Field(
        min_length=1,
        max_length=100,
        description="Digiflazz product SKU",
    )
    type: str = Field(
        min_length=1,
        max_length=50,
        description="Topup type (REGULAR, LUNASI, BULK)",
    )


class DigSaldoResponse(BaseModel):
    """Response schema for Digiflazz balance check."""

    status: str | None = None
    saldo: str | None = None
    saldo_formatted: str = ""
    timestamp: str = ""
    data: dict | None = None


class WDPCheapestResponse(BaseModel):
    """Response schema for cheapest WDP public prices."""

    brazil: int | None = None
    turkey: int | None = None
    min: int | None = None
    cached: bool = False
    cache_age: int = 0
    error: str | None = None


class WDPModalResponse(BaseModel):
    """Response schema for WDP modal (cost) prices from Digiflazz account."""

    wdp_br: int | None = None
    wdp_tr: int | None = None
    timestamp: str = ""
    from_cache: bool = False
    error: str | None = None


class PurchaseQueueResponse(BaseModel):
    """Response schema for active purchase queue entries."""

    id: str
    account_id: int
    account_name: str
    order_id: str
    deficit_diamond: int
    status: str
    created_at: datetime
    updated_at: datetime


@router.get("/wdp-cheapest", response_model=WDPCheapestResponse)
async def get_wdp_cheapest() -> WDPCheapestResponse:
    """
    Get cheapest WDP (Weekly Diamond Pass) prices from public market.
    
    This endpoint fetches current market prices for WDP Brazil and Turkey
    from the public Digiflazz API to help compare with internal cost prices.
    
    Uses 10-minute caching to prevent rate limiting and IP blocking.
    
    Returns:
        WDPCheapestResponse: Public market prices for WDP variants
        
    Example response:
        {
            "brazil": 23500,
            "turkey": 25000,
            "min": 23500,
            "cached": true,
            "cache_age": 120
        }
    """
    try:
        logger.info("Fetching cheapest WDP prices from public API...")
        
        # CRITICAL: Wrap synchronous call in executor to avoid blocking event loop
        loop = asyncio.get_event_loop()
        wdp_prices = await loop.run_in_executor(
            None,
            digiflazz_service.get_wdp_cheapest_public,
        )
        
        logger.info(f"✅ WDP prices fetched: {wdp_prices}")
        return wdp_prices
    
    except Exception as e:
        logger.error(f"❌ Error fetching WDP prices: {str(e)}")
        # Return error response instead of raising exception
        return {
            "brazil": None,
            "turkey": None,
            "min": None,
            "cached": False,
            "cache_age": 0,
            "error": str(e),
        }


@router.get("/wdp-modal", response_model=WDPModalResponse)
async def get_wdp_modal_prices() -> WDPModalResponse:
    """
    Get WDP_BR and WDP_TR modal (cost) prices from Digiflazz account product list.
    
    This endpoint fetches the actual product prices set on your Digiflazz account
    for WDP Brasil and WDP Turkey products. These are the prices to use for 
    calculating margins and profit.
    
    Sources prices from:
    - Digiflazz API /product endpoint
    - Uses 5-minute caching per Digiflazz rate limits
    
    Returns:
        WDPModalResponse: Modal prices for WDP_BR and WDP_TR from Digiflazz
        
    Example response:
        {
            "wdp_br": 85000,
            "wdp_tr": 92000,
            "timestamp": "2026-03-28T12:35:00",
            "from_cache": true,
            "error": null
        }
    """
    try:
        logger.info("Fetching WDP modal prices from Digiflazz product list...")
        
        # Wrap synchronous call in executor to avoid blocking event loop
        loop = asyncio.get_event_loop()
        modal_prices = await loop.run_in_executor(
            None,
            digiflazz_service.get_wdp_modal_prices,
        )
        
        logger.info(f"✅ WDP modal prices: WDP_BR={modal_prices.get('wdp_br')}, WDP_TR={modal_prices.get('wdp_tr')}")
        return modal_prices
    
    except Exception as e:
        logger.error(f"❌ Error fetching WDP modal prices: {str(e)}")
        return {
            "wdp_br": None,
            "wdp_tr": None,
            "timestamp": datetime.now().isoformat(),
            "from_cache": False,
            "error": str(e),
        }


@router.post("/topup", response_model=TopupHistoryResponse)
async def create_topup(
    request: TopupRequest,
    session: AsyncSession = Depends(get_session),
) -> TopupHistoryResponse:
    """
    Create a topup transaction with Digiflazz.

    Flow:
    1. Validate account exists
    2. Generate unique ref_id
    3. Call Digiflazz API to create transaction
    4. Save TopupHistory record with status PENDING
    5. Return topup data

    Args:
        request: TopupRequest with topup details
        session: Database session

    Returns:
        TopupHistoryResponse: Created topup data

    Raises:
        HTTPException: If account not found or topup creation fails
    """

    # Validate account exists
    stmt = select(Account).where(Account.id == request.account_id)
    result = await session.execute(stmt)
    account = result.scalars().first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Validate account is active
    if not account.is_active:
        raise HTTPException(
            status_code=400,
            detail=f"Account '{account.name}' is not active",
        )

    # Generate unique ref_id
    ref_id = f"TOP-{str(uuid4())[:8]}"
    logger.info(
        f"Creating topup {ref_id} for account {account.name} with SKU {request.sku}"
    )

    try:
        # Call Digiflazz API
        # CRITICAL: Wrap synchronous call in executor to avoid blocking event loop
        loop = asyncio.get_event_loop()
        logger.info(f"Calling Digiflazz API for topup {ref_id}...")
        digiflazz_response = await loop.run_in_executor(
            None,
            digiflazz_service.create_transaction,
            request.sku,
            account.game_id,
            account.zone,
            ref_id,
        )

        logger.debug(f"Digiflazz response: {digiflazz_response}")

        # Extract diamond amount from response
        # Note: You may need to adjust this based on actual Digiflazz response format
        amount_diamond = digiflazz_response.get("amount", 0)
        if isinstance(amount_diamond, str):
            # Try to extract number from string like "4000"
            try:
                amount_diamond = int(amount_diamond)
            except ValueError:
                amount_diamond = 0

        # Create TopupHistory record with PENDING status
        topup_history = TopupHistory(
            account_id=request.account_id,
            ref_id=ref_id,
            sku=request.sku,
            amount_diamond=amount_diamond,
            status="PENDING",
            type=request.type,
            is_processed=False,
            response_payload=json.dumps(digiflazz_response),
        )

        session.add(topup_history)
        await session.commit()
        await session.refresh(topup_history)

        logger.info(
            f"✅ Topup {ref_id} created (PENDING, {amount_diamond} DM)"
        )
        return topup_history

    except Exception as e:
        logger.error(f"❌ Error creating topup {ref_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create topup: {str(e)}"
        )


@router.get("/balance", response_model=DigSaldoResponse)
async def get_balance() -> DigSaldoResponse:
    """
    Check Digiflazz account balance (saldo pusat).

    Used for displaying available balance in Dashboard.

    Returns:
        DigSaldoResponse: Digiflazz saldo information

    Raises:
        HTTPException: If balance check fails
    """

    try:
        logger.info("Checking Digiflazz balance...")

        # CRITICAL: Wrap synchronous call in executor to avoid blocking event loop
        loop = asyncio.get_event_loop()
        saldo_response = await loop.run_in_executor(None, digiflazz_service.cek_saldo)

        logger.info(f"✅ Digiflazz saldo: {saldo_response}")

        # Format saldo if available from data.deposit
        saldo_value = None
        if isinstance(saldo_response, dict):
            # Check if saldo field exists or try to extract from data
            saldo_value = saldo_response.get("saldo")
            if not saldo_value and "data" in saldo_response and isinstance(saldo_response["data"], dict):
                deposit = saldo_response["data"].get("deposit")
                if deposit is not None:
                    saldo_value = str(deposit)

        # Format currency
        saldo_formatted = ""
        if saldo_value:
            try:
                saldo_int = int(str(saldo_value).replace(".", "").replace(",", ""))
                saldo_formatted = f"Rp {saldo_int:,}".replace(",", ".")
            except (ValueError, TypeError):
                saldo_formatted = f"Rp {saldo_value}"

        return {
            "status": saldo_response.get("status") if isinstance(saldo_response, dict) else None,
            "saldo": saldo_value,
            "saldo_formatted": saldo_formatted,
            "timestamp": saldo_response.get("timestamp", ""),
            "data": saldo_response.get("data") if isinstance(saldo_response, dict) else None,
        }

    except Exception as e:
        logger.error(f"❌ Error checking balance: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to check balance: {str(e)}"
        )


@router.get("/queue", response_model=list[PurchaseQueueResponse])
async def get_purchase_queue(
    session: AsyncSession = Depends(get_session),
) -> list[PurchaseQueueResponse]:
    """Return active purchase queue entries for inventory deficits requiring supply action."""

    try:
        stmt = (
            select(RestockQueue, Account.name)
            .join(Account, RestockQueue.account_id == Account.id)
            .where(RestockQueue.status.in_(["OPEN", "IN_PROGRESS"]))
            .order_by(RestockQueue.created_at.asc(), RestockQueue.id.asc())
        )
        result = await session.execute(stmt)
        rows = result.all()

        queue_entries = [
            PurchaseQueueResponse(
                id=queue.id,
                account_id=queue.account_id,
                account_name=account_name,
                order_id=queue.order_id,
                deficit_diamond=queue.deficit_diamond,
                status=queue.status,
                created_at=queue.created_at,
                updated_at=queue.updated_at,
            )
            for queue, account_name in rows
        ]

        logger.info(f"✅ Retrieved {len(queue_entries)} active purchase queue entries")
        return queue_entries

    except Exception as e:
        logger.error(f"❌ Error retrieving purchase queue: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve purchase queue: {str(e)}")


@router.get("/history")
async def get_topup_history(
    session: AsyncSession = Depends(get_session),
    skip: int = 0,
    limit: int = 50,
) -> list[TopupHistoryResponse]:
    """
    Get topup transaction history.

    Args:
        session: Database session
        skip: Number of records to skip
        limit: Number of records to return

    Returns:
        list[TopupHistoryResponse]: List of topup transactions
    """

    stmt = (
        select(TopupHistory)
        .offset(skip)
        .limit(limit)
        .order_by(TopupHistory.created_at.desc())
    )
    result = await session.execute(stmt)
    topup_history = result.scalars().all()

    return topup_history


@router.get("/history/{topup_id}", response_model=TopupHistoryResponse)
async def get_topup_by_id(
    topup_id: str,
    session: AsyncSession = Depends(get_session),
) -> TopupHistoryResponse:
    """
    Get a single topup transaction by ID.

    Args:
        topup_id: Topup ID (UUID)
        session: Database session

    Returns:
        TopupHistoryResponse: Topup data

    Raises:
        HTTPException: If topup not found
    """

    stmt = select(TopupHistory).where(TopupHistory.id == topup_id)
    result = await session.execute(stmt)
    topup = result.scalars().first()

    if not topup:
        raise HTTPException(status_code=404, detail="Topup not found")

    return topup


# ====== COST PRICE ENDPOINTS ======


@router.get("/cost-prices", response_model=list[CostPriceResponse])
async def get_cost_prices(
    session: AsyncSession = Depends(get_session),
) -> list[CostPriceResponse]:
    """
    Get all cost prices for different product types.

    Returns:
        list[CostPriceResponse]: List of cost prices (WDP_BR, WDP_TR, etc.)

    Example response:
        [
            {"type": "WDP_BR", "cost_price": 85000, "created_at": "...", "updated_at": "..."},
            {"type": "WDP_TR", "cost_price": 90000, "created_at": "...", "updated_at": "..."}
        ]
    """

    try:
        stmt = select(CostPrice).order_by(CostPrice.type)
        result = await session.execute(stmt)
        cost_prices = result.scalars().all()

        logger.info(f"✅ Retrieved {len(cost_prices)} cost prices")
        return cost_prices

    except Exception as e:
        logger.error(f"❌ Error retrieving cost prices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve cost prices: {str(e)}")


@router.get("/cost-prices/{price_type}", response_model=CostPriceResponse)
async def get_cost_price(
    price_type: str,
    session: AsyncSession = Depends(get_session),
) -> CostPriceResponse:
    """
    Get cost price for a specific product type.

    Args:
        price_type: Product type (e.g., WDP_BR, WDP_TR)
        session: Database session

    Returns:
        CostPriceResponse: Cost price data

    Raises:
        HTTPException: If cost price not found
    """

    try:
        stmt = select(CostPrice).where(CostPrice.type == price_type)
        result = await session.execute(stmt)
        cost_price = result.scalars().first()

        if not cost_price:
            logger.warning(f"⚠️  Cost price not found for type: {price_type}")
            raise HTTPException(status_code=404, detail=f"Cost price not found for type: {price_type}")

        logger.info(f"✅ Retrieved cost price for {price_type}: Rp {cost_price.cost_price}")
        return cost_price

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error retrieving cost price {price_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve cost price: {str(e)}")


@router.put("/cost-prices/{price_type}", response_model=CostPriceResponse)
async def update_cost_price(
    price_type: str,
    request: CostPriceUpdate,
    session: AsyncSession = Depends(get_session),
) -> CostPriceResponse:
    """
    Update cost price for a product type.
    If type doesn't exist, create it.

    Args:
        price_type: Product type (e.g., WDP_BR, WDP_TR)
        request: CostPriceUpdate with new cost_price value
        session: Database session

    Returns:
        CostPriceResponse: Updated cost price data

    Raises:
        HTTPException: If update fails
    """

    try:
        # Try to find existing cost price
        stmt = select(CostPrice).where(CostPrice.type == price_type)
        result = await session.execute(stmt)
        cost_price = result.scalars().first()

        if cost_price:
            # Update existing
            cost_price.cost_price = request.cost_price
            cost_price.updated_at = datetime.utcnow()
            session.add(cost_price)
            await session.commit()
            await session.refresh(cost_price)
            logger.info(f"✅ Updated cost price for {price_type}: Rp {cost_price.cost_price}")
        else:
            # Create new
            cost_price = CostPrice(
                type=price_type,
                cost_price=request.cost_price,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(cost_price)
            await session.commit()
            await session.refresh(cost_price)
            logger.info(f"✅ Created new cost price for {price_type}: Rp {cost_price.cost_price}")

        return cost_price

    except Exception as e:
        logger.error(f"❌ Error updating cost price {price_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update cost price: {str(e)}")
