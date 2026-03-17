"""Digiflazz router for handling restock topup transactions."""

import asyncio
import logging
import json
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.models import Account, TopupHistory, TopupHistoryResponse
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

    status: str
    saldo: str
    saldo_formatted: str = ""  # Tambahkan baris ini
    timestamp: str = ""        # Tambahkan baris ini juga


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
        saldo = await loop.run_in_executor(None, digiflazz_service.cek_saldo)

        logger.info(f"✅ Digiflazz saldo: {saldo}")

        # LANGSUNG RETURN VARIABELNYA SAJA
        return saldo

    except Exception as e:
        logger.error(f"❌ Error checking balance: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to check balance: {str(e)}"
        )


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
