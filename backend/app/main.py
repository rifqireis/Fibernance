"""FastAPI main application entry point."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db, close_db, engine
from app.core.background_tasks import (
    pending_transaction_checker_loop,
    check_pending_topups_loop,
)
from app.routers import accounts, orders, digiflazz

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("🚀 Starting Fibernance Backend...")
    await init_db()
    logger.info("✅ Database initialized")

    # Start background task for checking pending orders
    transaction_checker_task = asyncio.create_task(
        pending_transaction_checker_loop(engine)
    )
    logger.info("✅ Background order transaction checker started")

    # Start background task for checking pending topups (Digiflazz)
    topup_checker_task = asyncio.create_task(
        check_pending_topups_loop(engine)
    )
    logger.info("✅ Background topup history checker started")

    try:
        yield
    finally:
        # Shutdown
        logger.info("🛑 Shutting down Fibernance Backend...")

        # Cancel background tasks gracefully
        for task_name, task in [
            ("order_checker", transaction_checker_task),
            ("topup_checker", topup_checker_task),
        ]:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    logger.info(f"✅ {task_name} task cancelled")

        await close_db()
        logger.info("✅ Database connection closed")


# Initialize FastAPI app
app = FastAPI(
    title="Fibernance API",
    description="Finance tracker, inventory management, and smart cashier for game top-up business",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
# Di main.py, bagian CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Izinkan semua dulu untuk memastikan 502 hilang
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Include routers
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(digiflazz.router, prefix="/api/digiflazz", tags=["Digiflazz"])


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "fibernance-backend",
        "version": "0.1.0",
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Fibernance API",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
