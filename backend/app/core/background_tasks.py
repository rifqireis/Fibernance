"""Background tasks for Fibernance application."""

import asyncio
import json
import logging

from sqlalchemy.ext.asyncio import AsyncEngine
from sqlmodel import select

from app.core.database import async_session
from app.core.models import Account, Order, TopupHistory
from app.services.digiflazz_service import DigiflazzService
from app.services.account_service import apply_digiflazz_success

logger = logging.getLogger(__name__)


async def pending_transaction_checker_loop(engine: AsyncEngine) -> None:
    """
    Background task that checks pending manual orders every 1 minute.

    Logic:
    1. Query all orders with status "PENDING" (internal manual orders from Kasir)
    2. Count pending orders
    3. Log total count - MANUAL PROCESSING REQUIRED (no API calls)

    NOTE: This is for INTERNAL MANUAL ORDERS from Cashier, NOT for Digiflazz.
    Manual orders require human verification and completion.

    Args:
        engine: SQLAlchemy async engine for database access

    Raises:
        None (loop continues even if errors occur)
    """

    logger.info("✅ Background pending order checker started (checks every 60 seconds)")

    while True:
        try:
            await asyncio.sleep(60)  # Check every 1 minute

            logger.debug("🔄 Checking pending orders...")

            # Create async session
            async with async_session() as session:
                # Query all pending orders
                stmt = select(Order).where(Order.status == "PENDING")
                result = await session.execute(stmt)
                pending_orders = result.scalars().all()

                if not pending_orders:
                    logger.debug("No pending orders to process")
                else:
                    logger.info(
                        f"⏳ Ada {len(pending_orders)} pesanan pending yang menunggu diselesaikan manual."
                    )

        except asyncio.CancelledError:
            logger.info("🛑 Background pending order checker stopped")
            break

        except Exception as e:
            logger.error(
                f"❌ Unexpected error in pending_transaction_checker_loop: {e}"
            )
            # Continue loop even if error occurs, don't crash entirely
            continue


# ============================================================================
# TOPUP HISTORY CHECKING (Restock/Kulakan)
# ============================================================================


async def check_pending_topups_loop(engine: AsyncEngine) -> None:
    """
    Background task that checks pending Digiflazz topup transactions every 60 seconds.

    Logic:
    1. Query all TopupHistory records with status "PENDING"
    2. For each pending topup:
       a. Fetch Account data to get game_id and zone
       b. Call DigiflazzService.cek_status() with correct parameters
       c. If Digiflazz returns "Sukses" (Success):
          - Check if is_processed is False (CRITICAL for idempotency)
          - If False: Call apply_digiflazz_success() to add diamonds to account
          - Set is_processed = True
          - Set status = "SUCCESS"
          - Save response_payload from Digiflazz
       d. If Digiflazz returns "Gagal" (Failed):
          - Set status = "FAILED"
    3. Error handling: Log errors and continue, don't crash the loop

    Args:
        engine: SQLAlchemy async engine for database access

    Raises:
        None (loop continues even if errors occur)
    """

    # Initialize Digiflazz service
    try:
        digiflazz_service = DigiflazzService()
    except ValueError as e:
        logger.error(f"❌ Failed to initialize DigiflazzService: {e}")
        logger.error(
            "Topup history checker cannot start without Digiflazz credentials."
        )
        return

    logger.info("✅ Background topup history checker started (checks every 60 seconds)")

    while True:
        try:
            await asyncio.sleep(60)  # Check every 1 minute

            logger.debug("🔄 Checking pending topup transactions...")

            # Create async session
            async with async_session() as session:
                # Query all pending topup history records
                stmt = select(TopupHistory).where(TopupHistory.status == "PENDING")
                result = await session.execute(stmt)
                pending_topups = result.scalars().all()

                if not pending_topups:
                    logger.debug("No pending topup transactions to check")
                else:
                    logger.info(f"Found {len(pending_topups)} pending topup transactions")

                for topup in pending_topups:
                    try:
                        logger.debug(
                            f"Checking status for topup {topup.ref_id} (account_id={topup.account_id})..."
                        )

                        # CRITICAL: Fetch Account to get game_id and zone
                        stmt = select(Account).where(Account.id == topup.account_id)
                        result = await session.execute(stmt)
                        account = result.scalars().first()

                        if not account:
                            logger.error(
                                f"❌ Account with ID {topup.account_id} not found for topup {topup.ref_id}"
                            )
                            topup.status = "FAILED"
                            session.add(topup)
                            continue

                        # Call Digiflazz to check transaction status with correct parameters
                        # CRITICAL: Wrap synchronous call in executor to avoid blocking event loop
                        loop = asyncio.get_event_loop()
                        digiflazz_response = await loop.run_in_executor(
                            None,
                            digiflazz_service.cek_status,
                            topup.sku,
                            account.game_id,
                            account.zone,
                            topup.ref_id,
                        )

                        # Extract status from response
                        status_from_api = (
                            digiflazz_response.get("status", "unknown")
                            .lower()
                            .strip()
                        )

                        logger.debug(
                            f"Digiflazz response for {topup.ref_id}: {status_from_api}"
                        )

                        # Check if transaction succeeded
                        if status_from_api in ["sukses", "success"]:
                            logger.info(
                                f"✅ Topup {topup.ref_id} marked SUCCESS by Digiflazz"
                            )

                            # IDEMPOTENCY CHECK: Only process if not already processed
                            if not topup.is_processed:
                                logger.info(
                                    f"💎 Processing diamond allocation for {topup.ref_id}..."
                                )

                                try:
                                    # Apply diamonds to account based on topup type
                                    updated_account = (
                                        await apply_digiflazz_success(
                                            session=session,
                                            account_id=topup.account_id,
                                            sku=topup.sku,
                                            topup_type=topup.type,
                                        )
                                    )

                                    logger.info(
                                        f"✅ Account {updated_account.name}: "
                                        f"+{topup.amount_diamond} diamonds "
                                        f"({topup.type})"
                                    )

                                    # Mark as processed
                                    topup.is_processed = True
                                    topup.status = "SUCCESS"

                                    # Save response payload
                                    topup.response_payload = json.dumps(
                                        digiflazz_response
                                    )

                                    session.add(topup)

                                except Exception as e:
                                    logger.error(
                                        f"❌ Failed to apply diamonds for {topup.ref_id}: {e}"
                                    )
                                    # Don't set is_processed=True if diamond application failed
                                    # This allows retry on next check
                                    topup.status = "FAILED"
                                    session.add(topup)

                            else:
                                logger.info(
                                    f"⏭️  Topup {topup.ref_id} already processed, skipping diamond allocation"
                                )
                                # Just ensure status is SUCCESS if already processed
                                if topup.status != "SUCCESS":
                                    topup.status = "SUCCESS"
                                    session.add(topup)

                        # Check if transaction failed
                        elif status_from_api in ["gagal", "failed"]:
                            logger.warn(f"⚠️  Topup {topup.ref_id} FAILED by Digiflazz")
                            topup.status = "FAILED"
                            topup.response_payload = json.dumps(digiflazz_response)
                            session.add(topup)

                        else:
                            logger.debug(
                                f"Unknown status '{status_from_api}' for {topup.ref_id}. Skipping."
                            )
                            # Don't update if status is unknown (might be processing)
                            continue

                    except Exception as e:
                        logger.error(
                            f"Error checking status for topup {topup.ref_id}: {e}"
                        )
                        # Continue to next topup, don't crash the loop
                        continue

                # Commit all changes
                try:
                    await session.commit()
                    logger.info("✅ Topup history updates committed")
                except Exception as e:
                    await session.rollback()
                    logger.error(f"❌ Failed to commit topup history updates: {e}")

        except asyncio.CancelledError:
            logger.info("🛑 Background topup history checker stopped")
            break

        except Exception as e:
            logger.error(
                f"❌ Unexpected error in check_pending_topups_loop: {e}"
            )
            # Continue loop even if error occurs, don't crash entirely
            continue
