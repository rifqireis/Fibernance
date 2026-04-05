"""Regression tests for legacy WDP bookkeeping and settlement flows."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.models import Account, TopupHistory  # noqa: E402
from app.core.database import get_session  # noqa: E402
from app.routers import digiflazz as digiflazz_router  # noqa: E402
from app.routers.digiflazz import TopupRequest, create_topup  # noqa: E402
from app.services.account_service import (  # noqa: E402
    apply_digiflazz_success,
    apply_topup_success,
    calculate_tracked_wdp_days_approx,
)


class WdpLegacyFlowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        db_path = Path(self.temp_dir.name) / "wdp-legacy-test.db"
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
        self.session_factory = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

        async with self.engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

        self.app = FastAPI()
        self.app.include_router(
            digiflazz_router.router,
            prefix="/api/digiflazz",
        )

        async def override_get_session():
            async with self.session_factory() as session:
                yield session

        self.app.dependency_overrides[get_session] = override_get_session
        self.client = AsyncClient(
            transport=ASGITransport(app=self.app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self) -> None:
        await self.client.aclose()
        await self.engine.dispose()
        self.temp_dir.cleanup()

    async def _create_account(self, **overrides: int | str | bool) -> Account:
        payload = {
            "name": "Account_Test",
            "game_id": "123456789",
            "zone": "2001",
            "server_id": "server_asia_1",
            "stock_diamond": 0,
            "deficit_diamond": 0,
            "pending_wdp": 0,
            "is_active": True,
        }
        payload.update(overrides)

        async with self.session_factory() as session:
            account = Account(**payload)
            session.add(account)
            await session.commit()
            await session.refresh(account)
            return account

    async def test_calculate_tracked_wdp_days_returns_fractional_estimate(self) -> None:
        account = Account(
            name="Estimate_Test",
            game_id="123456789",
            zone="2001",
            server_id="server_asia_1",
            pending_wdp=350,
        )

        self.assertEqual(calculate_tracked_wdp_days_approx(account), 3.5)

    async def test_apply_topup_success_converts_days_to_storage_units(self) -> None:
        account = await self._create_account(
            name="Apply_Topup_Success",
            pending_wdp=700,
        )

        async with self.session_factory() as session:
            updated = await apply_topup_success(
                session=session,
                account_id=account.id,
                received_wdp_days=3,
            )

        self.assertEqual(updated.pending_wdp, 400)
        self.assertEqual(updated.stock_diamond, 0)

    async def test_apply_digiflazz_regular_wdp_keeps_legacy_bookkeeping(self) -> None:
        account = await self._create_account(
            name="Regular_WDP",
            deficit_diamond=100,
        )

        async with self.session_factory() as session:
            updated = await apply_digiflazz_success(
                session=session,
                account_id=account.id,
                sku="WDP_BR",
                topup_type="REGULAR",
            )

        self.assertEqual(updated.deficit_diamond, 20)
        self.assertEqual(updated.stock_diamond, 0)
        self.assertEqual(updated.pending_wdp, 700)

    async def test_create_topup_rejects_lunasi_without_tracked_wdp(self) -> None:
        account = await self._create_account(name="Reject_Lunasi")

        async with self.session_factory() as session:
            with self.assertRaises(HTTPException) as exc_info:
                await create_topup(
                    TopupRequest(account_id=account.id, sku="WDP_BR", type="LUNASI"),
                    session=session,
                )

        self.assertEqual(exc_info.exception.status_code, 400)
        self.assertIn("no tracked legacy WDP", exc_info.exception.detail)

    async def test_create_topup_normalizes_request_type_to_uppercase(self) -> None:
        account = await self._create_account(
            name="Normalize_Lunasi",
            pending_wdp=700,
        )

        with patch.object(
            digiflazz_router.digiflazz_service,
            "create_transaction",
            return_value={"amount": "220", "status": "pending"},
        ):
            async with self.session_factory() as session:
                response = await create_topup(
                    TopupRequest(account_id=account.id, sku="WDP_BR", type="lunasi"),
                    session=session,
                )

            async with self.session_factory() as session:
                result = await session.execute(
                    select(TopupHistory).where(TopupHistory.id == response.id)
                )
                stored = result.scalars().first()

        self.assertIsNotNone(stored)
        self.assertEqual(response.type, "LUNASI")
        self.assertEqual(stored.type, "LUNASI")

    async def test_topup_route_rejects_lunasi_without_tracked_wdp(self) -> None:
        account = await self._create_account(name="HTTP_Reject_Lunasi")

        response = await self.client.post(
            "/api/digiflazz/topup",
            json={
                "account_id": account.id,
                "sku": "WDP_BR",
                "type": "LUNASI",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "no tracked legacy WDP",
            response.json()["detail"],
        )

    async def test_topup_route_accepts_regular_wdp_and_persists_history(self) -> None:
        account = await self._create_account(name="HTTP_Regular_WDP")

        with patch.object(
            digiflazz_router.digiflazz_service,
            "create_transaction",
            return_value={"amount": "220", "status": "pending"},
        ):
            response = await self.client.post(
                "/api/digiflazz/topup",
                json={
                    "account_id": account.id,
                    "sku": "WDP_BR",
                    "type": "regular",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["account_id"], account.id)
        self.assertEqual(payload["sku"], "WDP_BR")
        self.assertEqual(payload["type"], "REGULAR")
        self.assertEqual(payload["status"], "PENDING")
        self.assertEqual(payload["amount_diamond"], 220)

        async with self.session_factory() as session:
            result = await session.execute(
                select(TopupHistory).where(TopupHistory.id == payload["id"])
            )
            stored = result.scalars().first()

        self.assertIsNotNone(stored)
        self.assertEqual(stored.type, "REGULAR")
        self.assertEqual(stored.amount_diamond, 220)

    async def test_topup_route_accepts_lowercase_lunasi_for_tracked_legacy_wdp(self) -> None:
        account = await self._create_account(
            name="HTTP_Normalize_Lunasi",
            pending_wdp=700,
        )

        with patch.object(
            digiflazz_router.digiflazz_service,
            "create_transaction",
            return_value={"amount": "220", "status": "pending"},
        ):
            response = await self.client.post(
                "/api/digiflazz/topup",
                json={
                    "account_id": account.id,
                    "sku": "WDP_BR",
                    "type": "lunasi",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["type"], "LUNASI")


if __name__ == "__main__":
    unittest.main()