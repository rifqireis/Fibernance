"""Accounts router and endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.core.database import get_session
from app.core.models import Account, AccountCreate, AccountResponse, AccountUpdate
from app.services.account_service import (
    calculate_real_diamond,
    calculate_potential_diamond,
    calculate_tracked_wdp_days_approx,
    calculate_wdp_potential,
    classify_account,
)

router = APIRouter(tags=["accounts"])


def account_to_response(account: Account) -> AccountResponse:
    """Convert Account model to AccountResponse with computed fields."""
    return AccountResponse(
        id=account.id,
        name=account.name,
        game_id=account.game_id,
        zone=account.zone,
        server_id=account.server_id,
        stock_diamond=account.stock_diamond,
        deficit_diamond=account.deficit_diamond,
        pending_wdp=account.pending_wdp,
        is_active=account.is_active,
        created_at=account.created_at,
        updated_at=account.updated_at,
        real_diamond=calculate_real_diamond(account),
        potential_diamond=calculate_potential_diamond(account),
        wdp_potential_capped=calculate_wdp_potential(account),
        tracked_wdp_days_approx=calculate_tracked_wdp_days_approx(account),
        classification=classify_account(account),
    )


@router.get("", response_model=list[AccountResponse])
async def list_accounts(
    session: AsyncSession = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> list[AccountResponse]:
    """List all accounts with pagination."""
    stmt = select(Account).offset(skip).limit(limit)
    result = await session.execute(stmt)
    accounts = result.scalars().all()
    return [account_to_response(acc) for acc in accounts]


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: int,
    session: AsyncSession = Depends(get_session),
) -> AccountResponse:
    """Get a single account by ID."""
    stmt = select(Account).where(Account.id == account_id)
    result = await session.execute(stmt)
    account = result.scalars().first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return account_to_response(account)


@router.post("", response_model=AccountResponse)
async def create_account(
    account: AccountCreate,
    session: AsyncSession = Depends(get_session),
) -> AccountResponse:
    """Create a new account."""
    # Check if account name already exists
    stmt = select(Account).where(Account.name == account.name)
    result = await session.execute(stmt)
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail=f"Account with name '{account.name}' already exists",
        )

    # Create new account
    db_account = Account(**account.dict())
    session.add(db_account)
    await session.commit()
    await session.refresh(db_account)

    return account_to_response(db_account)


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: int,
    update_data: AccountUpdate,
    session: AsyncSession = Depends(get_session),
) -> AccountResponse:
    """Update an account."""
    stmt = select(Account).where(Account.id == account_id)
    result = await session.execute(stmt)
    account = result.scalars().first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Check if new name already exists (if name is being updated)
    if update_data.name and update_data.name != account.name:
        stmt = select(Account).where(Account.name == update_data.name)
        result = await session.execute(stmt)
        if result.scalars().first():
            raise HTTPException(
                status_code=400,
                detail=f"Account with name '{update_data.name}' already exists",
            )

    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(account, key, value)

    session.add(account)
    await session.commit()
    await session.refresh(account)

    return account_to_response(account)


@router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Delete an account."""
    stmt = select(Account).where(Account.id == account_id)
    result = await session.execute(stmt)
    account = result.scalars().first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    await session.delete(account)
    await session.commit()

    return {"message": f"Account '{account.name}' deleted successfully"}


@router.get("/count/total")
async def count_accounts(
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get total account count."""
    stmt = select(func.count(Account.id))
    result = await session.execute(stmt)
    count = result.scalar()

    return {"total_accounts": count}
