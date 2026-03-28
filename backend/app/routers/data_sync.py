"""Data export and import router for backup and data synchronization."""

import logging
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, delete

from app.core.database import get_session
from app.core.models import Account, Order
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


class ExportData(BaseModel):
    """Schema for exporting data."""

    timestamp: str
    data_type: str
    accounts: list[dict] = []
    orders: list[dict] = []


class ImportPreview(BaseModel):
    """Schema for import preview response."""

    data_type: str
    records_to_delete: int
    records_to_add: int
    affected_items: list[str]
    preview_sample: dict


class ImportConfirm(BaseModel):
    """Schema for confirming import."""

    data_type: str
    confirm: bool


@router.post("/export", response_model=dict)
async def export_data(
    export_type: Literal["inventory", "orders", "both"] = "both",
    session: AsyncSession = Depends(get_session),
) -> dict:
    """
    Export data as JSON file.

    Args:
        export_type: Type of export (inventory, orders, or both)
        session: Database session

    Returns:
        JSON data ready for download
    """

    logger.info(f"🔄 Exporting data: {export_type}")

    export_data = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data_type": export_type,
        "accounts": [],
        "orders": [],
    }

    # Export Inventory
    if export_type in ["inventory", "both"]:
        try:
            stmt = select(Account)
            result = await session.execute(stmt)
            accounts = result.scalars().all()

            export_data["accounts"] = [
                {
                    "id": acc.id,
                    "name": acc.name,
                    "game_id": acc.game_id,
                    "zone": acc.zone,
                    "server_id": acc.server_id,
                    "stock_diamond": acc.stock_diamond,
                    "pending_wdp": acc.pending_wdp,
                    "is_active": acc.is_active,
                }
                for acc in accounts
            ]

            logger.info(f"✅ Exported {len(accounts)} accounts")
        except Exception as e:
            logger.error(f"❌ Error exporting accounts: {e}")
            raise HTTPException(status_code=500, detail="Failed to export accounts")

    # Export Orders
    if export_type in ["orders", "both"]:
        try:
            stmt = select(Order)
            result = await session.execute(stmt)
            orders = result.scalars().all()

            export_data["orders"] = [
                {
                    "id": order.id,
                    "invoice_ref": order.invoice_ref,
                    "order_id": order.order_id,
                    "target_id": order.target_id,
                    "server_id": order.server_id,
                    "buyer_name": order.buyer_name,
                    "game_username": order.game_username,
                    "item_name": order.item_name,
                    "quantity": order.quantity,
                    "total_diamond": order.total_diamond,
                    "status": order.status,
                    "deduction_breakdown": order.deduction_breakdown,
                    "sending_accounts": order.sending_accounts,
                    "proof_video_link": order.proof_video_link,
                    "delivery_at": order.delivery_at.isoformat() if order.delivery_at else None,  # Receipt/Struk time
                    "actual_delivery_at": order.actual_delivery_at.isoformat() if order.actual_delivery_at else None,  # Order real time
                    "created_at": order.created_at.isoformat() if order.created_at else None,
                    "updated_at": order.updated_at.isoformat() if order.updated_at else None,
                }
                for order in orders
            ]

            logger.info(f"✅ Exported {len(orders)} orders")
        except Exception as e:
            logger.error(f"❌ Error exporting orders: {e}")
            raise HTTPException(status_code=500, detail="Failed to export orders")

    logger.info(f"✅ Data export complete: {export_type}")
    return export_data


@router.post("/import-preview", response_model=ImportPreview)
async def import_preview(
    file: UploadFile = File(...),
    import_type: Literal["inventory", "orders", "both"] = "both",
    session: AsyncSession = Depends(get_session),
) -> ImportPreview:
    """
    Preview what will be imported (without actually importing).

    Args:
        file: JSON file to import
        import_type: Type of import (inventory, orders, or both)
        session: Database session

    Returns:
        Preview of changes that will occur
    """

    import json

    try:
        contents = await file.read()
        import_data = json.loads(contents)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    # Validate file structure
    if not isinstance(import_data, dict):
        raise HTTPException(status_code=400, detail="JSON root must be object")

    preview = {
        "data_type": import_type,
        "records_to_delete": 0,
        "records_to_add": 0,
        "affected_items": [],
        "preview_sample": {},
    }

    # Preview Inventory Import
    if import_type in ["inventory", "both"]:
        if "accounts" not in import_data or not isinstance(import_data["accounts"], list):
            raise HTTPException(status_code=400, detail="Missing or invalid 'accounts' field")

        accounts_to_import = import_data["accounts"]

        # Count current accounts (will be deleted)
        stmt = select(Account)
        result = await session.execute(stmt)
        current_accounts = result.scalars().all()

        preview["records_to_delete"] += len(current_accounts)
        preview["records_to_add"] += len(accounts_to_import)

        # Collect affected names
        for account in current_accounts:
            preview["affected_items"].append(f"Account: {account.name} (DELETE)")

        for account_data in accounts_to_import:
            preview["affected_items"].append(f"Account: {account_data.get('name', 'Unknown')} (ADD)")

        # Sample of first account
        if accounts_to_import:
            preview["preview_sample"]["sample_account"] = accounts_to_import[0]

    # Preview Orders Import
    if import_type in ["orders", "both"]:
        if "orders" not in import_data or not isinstance(import_data["orders"], list):
            raise HTTPException(status_code=400, detail="Missing or invalid 'orders' field")

        orders_to_import = import_data["orders"]

        # Count current orders (will be deleted)
        stmt = select(Order)
        result = await session.execute(stmt)
        current_orders = result.scalars().all()

        preview["records_to_delete"] += len(current_orders)
        preview["records_to_add"] += len(orders_to_import)

        # Collect affected invoice refs
        for order in current_orders:
            preview["affected_items"].append(f"Order: {order.invoice_ref} (DELETE)")

        for order_data in orders_to_import:
            preview["affected_items"].append(f"Order: {order_data.get('invoice_ref', 'Unknown')} (ADD)")

        # Sample of first order
        if orders_to_import:
            preview["preview_sample"]["sample_order"] = orders_to_import[0]

    logger.info(
        f"📊 Import preview generated: {import_type}, "
        f"delete={preview['records_to_delete']}, add={preview['records_to_add']}"
    )

    return preview


@router.post("/import-confirm", response_model=dict)
async def import_confirm(
    file: UploadFile = File(...),
    import_type: Literal["inventory", "orders", "both"] = "both",
    session: AsyncSession = Depends(get_session),
) -> dict:
    """
    Actually import the data (replace existing data).

    Args:
        file: JSON file to import
        import_type: Type of import (inventory, orders, or both)
        session: Database session

    Returns:
        Summary of import results
    """

    import json
    from datetime import datetime as dt
    from datetime import timezone

    try:
        contents = await file.read()
        import_data = json.loads(contents)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    results = {
        "success": True,
        "message": "",
        "accounts_deleted": 0,
        "accounts_added": 0,
        "orders_deleted": 0,
        "orders_added": 0,
        "errors": [],
    }

    try:
        # Import Inventory
        if import_type in ["inventory", "both"]:
            # Count current accounts before deletion
            stmt = select(Account)
            result = await session.execute(stmt)
            current_accounts_count = len(result.scalars().all())
            
            # Delete all existing accounts
            stmt = delete(Account)
            await session.execute(stmt)
            results["accounts_deleted"] = current_accounts_count

            # Add new accounts
            accounts_to_import = import_data.get("accounts", [])
            for account_data in accounts_to_import:
                try:
                    new_account = Account(
                        id=account_data.get("id"),
                        name=account_data.get("name"),
                        game_id=account_data.get("game_id", ""),
                        zone=account_data.get("zone", ""),
                        server_id=account_data.get("server_id"),
                        stock_diamond=account_data.get("stock_diamond", 0),
                        pending_wdp=account_data.get("pending_wdp", 0),
                        is_active=account_data.get("is_active", True),
                    )
                    session.add(new_account)
                    results["accounts_added"] += 1
                except Exception as e:
                    results["errors"].append(f"Failed to import account {account_data.get('name')}: {str(e)}")

        # Import Orders
        if import_type in ["orders", "both"]:
            # Count current orders before deletion
            stmt = select(Order)
            result = await session.execute(stmt)
            current_orders_count = len(result.scalars().all())
            
            # Delete all existing orders
            stmt = delete(Order)
            await session.execute(stmt)
            results["orders_deleted"] = current_orders_count

            # Add new orders
            orders_to_import = import_data.get("orders", [])
            for order_data in orders_to_import:
                try:
                    # Helper to parse datetime strings
                    def _parse_dt(dt_str):
                        if not dt_str:
                            return None
                        try:
                            # Handle both naive and timezone-aware formats
                            clean_str = str(dt_str).rstrip('Z')
                            return dt.fromisoformat(clean_str)
                        except (ValueError, AttributeError, TypeError):
                            return None
                    
                    delivery_at = _parse_dt(order_data.get("delivery_at"))
                    actual_delivery_at = _parse_dt(order_data.get("actual_delivery_at"))
                    created_at = _parse_dt(order_data.get("created_at")) or dt.utcnow()
                    updated_at = _parse_dt(order_data.get("updated_at")) or dt.utcnow()

                    new_order = Order(
                        id=order_data.get("id"),
                        invoice_ref=order_data.get("invoice_ref"),
                        order_id=order_data.get("order_id", ""),
                        target_id=order_data.get("target_id"),
                        server_id=order_data.get("server_id"),
                        buyer_name=order_data.get("buyer_name"),
                        game_username=order_data.get("game_username", ""),
                        item_name=order_data.get("item_name"),
                        quantity=order_data.get("quantity", 1),
                        total_diamond=order_data.get("total_diamond"),
                        status=order_data.get("status", "PENDING"),
                        deduction_breakdown=order_data.get("deduction_breakdown", {}),
                        sending_accounts=order_data.get("sending_accounts", {}),
                        proof_video_link=order_data.get("proof_video_link"),
                        delivery_at=delivery_at,  # Receipt/Struk time
                        actual_delivery_at=actual_delivery_at,  # Order real time
                        created_at=created_at,
                        updated_at=updated_at,
                    )
                    session.add(new_order)
                    results["orders_added"] += 1
                except Exception as e:
                    results["errors"].append(f"Failed to import order {order_data.get('invoice_ref')}: {str(e)}")

        # Commit all changes
        await session.commit()

        results["message"] = (
            f"✅ Import completed successfully! "
            f"Accounts: {results['accounts_added']} added. "
            f"Orders: {results['orders_added']} added."
        )

        logger.info(
            f"✅ Data import complete: {import_type}, "
            f"accounts={results['accounts_added']}, orders={results['orders_added']}"
        )

    except Exception as e:
        await session.rollback()
        logger.error(f"❌ Import failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

    return results
