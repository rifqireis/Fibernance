"""Database models using SQLModel."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class Account(SQLModel, table=True):
    """Account model for tracking game server accounts and inventory."""

    __tablename__ = "accounts"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(
        index=True,
        unique=True,
        min_length=1,
        max_length=100,
        description="Account name (unique identifier)",
    )
    game_id: str = Field(
        default="",
        max_length=50,
        description="Game account ID (player ID)",
    )
    zone: str = Field(
        default="",
        max_length=50,
        description="Game zone identifier",
    )
    server_id: str = Field(
        min_length=1,
        max_length=50,
        description="Game server identifier",
    )
    stock_diamond: int = Field(
        default=0,
        ge=0,
        description="Current diamond stock inventory",
    )
    pending_wdp: int = Field(
        default=0,
        ge=0,
        description="Pending Weekly Diamond Pass hutang (debt)",
    )
    is_active: bool = Field(
        default=True,
        description="Account status (active or inactive)",
    )
    created_at: datetime = Field(
        default_factory=datetime.now,
        description="Account creation timestamp (WIB local time, not UTC)",
    )
    updated_at: datetime = Field(
        default_factory=datetime.now,
        description="Last update timestamp (WIB local time, not UTC)",
    )

    class Config:
        """SQLModel config."""

        json_schema_extra = {
            "example": {
                "name": "Account_001",
                "server_id": "server_asia_1",
                "stock_diamond": 5000,
                "pending_wdp": 500,
                "is_active": True,
            }
        }


class AccountCreate(SQLModel):
    """Schema for creating a new account."""

    name: str = Field(min_length=1, max_length=100)
    game_id: str = Field(default="", max_length=50)
    zone: str = Field(default="", max_length=50)
    server_id: str = Field(min_length=1, max_length=50)
    stock_diamond: int = Field(default=0, ge=0)
    pending_wdp: int = Field(default=0, ge=0)
    is_active: bool = Field(default=True)


class AccountUpdate(SQLModel):
    """Schema for updating an account."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    game_id: Optional[str] = Field(None, min_length=1, max_length=50)
    zone: Optional[str] = Field(None, min_length=1, max_length=50)
    server_id: Optional[str] = Field(None, min_length=1, max_length=50)
    stock_diamond: Optional[int] = Field(None, ge=0)
    pending_wdp: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class AccountResponse(SQLModel):
    """Schema for account API responses."""

    id: int
    name: str
    game_id: str
    zone: str
    server_id: str
    stock_diamond: int
    pending_wdp: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # Computed fields
    real_diamond: int
    potential_diamond: int
    wdp_potential_capped: int
    classification: str


class Order(SQLModel, table=True):
    """Order model for tracking combo orders and diamond deductions."""

    __tablename__ = "orders"

    id: Optional[str] = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        description="UUID for order",
    )
    invoice_ref: str = Field(
        index=True,
        unique=True,
        min_length=1,
        max_length=100,
        description="Invoice reference (unique identifier)",
    )
    order_id: str = Field(
        default="",
        max_length=100,
        description="Original Order ID from Itemku (e.g., OD000000154383657)",
    )
    target_id: str = Field(
        min_length=1,
        max_length=100,
        description="Target player ID or customer identifier",
    )
    server_id: str = Field(
        min_length=1,
        max_length=50,
        description="Game server identifier",
    )
    buyer_name: str = Field(
        min_length=1,
        max_length=200,
        description="Name of the buyer/customer",
    )
    game_username: str = Field(
        default="",
        max_length=100,
        description="Game account username (e.g., from Itemku order)",
    )
    item_name: str = Field(
        min_length=1,
        max_length=200,
        description="Name of the product/item (e.g., Starlight Card, Diamond Pack)",
    )
    quantity: int = Field(
        default=1,
        ge=1,
        description="Jumlah item yang dibeli",
    )
    total_diamond: int = Field(
        ge=0,
        description="Total diamonds ordered",
    )
    status: str = Field(
        default="PENDING",
        min_length=1,
        max_length=50,
        description="Order status (PENDING, DONE, CANCELLED, etc.)",
    )
    deduction_breakdown: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="JSON breakdown of diamond deductions per account",
    )
    sending_accounts: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="JSON list of sending accounts with their names and deductions",
    )
    proof_video_link: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Telegram URL link for proof video delivery",
    )
    delivery_at: Optional[datetime] = Field(
        default=None,
        description="RECEIPT delivery time (markup) - jam 15:00 WIB based on 15:00 WIB cutoff rule",
    )
    actual_delivery_at: Optional[datetime] = Field(
        default=None,
        description="ACTUAL delivery time (order data) - real +7 days from order creation (WIB)",
    )
    created_at: datetime = Field(
        default_factory=datetime.now,
        description="Order creation timestamp (WIB local time, not UTC)",
    )
    updated_at: datetime = Field(
        default_factory=datetime.now,
        description="Last update timestamp (WIB local time, not UTC)",
    )

    class Config:
        """SQLModel config."""

        json_schema_extra = {
            "example": {
                "invoice_ref": "INV-2025-001",
                "order_id": "OD000000154383657",
                "target_id": "PLAYER_123",
                "server_id": "server_asia_1",
                "buyer_name": "John Doe",
                "item_name": "Starlight Card",
                "total_diamond": 300,
                "status": "COMPLETED",
                "deduction_breakdown": {
                    "Account_001": 100,
                    "Account_002": 100,
                    "Account_003": 100,
                },
            }
        }


class OrderCreate(SQLModel):
    """Schema for creating a new order."""

    invoice_ref: str = Field(min_length=1, max_length=100)
    order_id: str = Field(default="", max_length=100)
    target_id: str = Field(min_length=1, max_length=100)
    server_id: str = Field(min_length=1, max_length=50)
    buyer_name: str = Field(min_length=1, max_length=100)
    game_username: str = Field(default="", max_length=100)
    item_name: str = Field(min_length=1, max_length=100)
    quantity: int = Field(default=1, ge=1)
    total_diamond: int = Field(ge=0)
    status: str = Field(default="PENDING", min_length=1, max_length=50)


class OrderUpdate(SQLModel):
    """Schema for updating an order."""

    invoice_ref: Optional[str] = Field(None, min_length=1, max_length=100)
    order_id: Optional[str] = Field(None, max_length=100)
    target_id: Optional[str] = Field(None, min_length=1, max_length=100)
    server_id: Optional[str] = Field(None, min_length=1, max_length=50)
    buyer_name: Optional[str] = Field(None, min_length=1, max_length=100)
    game_username: Optional[str] = Field(None, max_length=100)
    item_name: Optional[str] = Field(None, min_length=1, max_length=100)
    quantity: Optional[int] = Field(None, ge=1)
    total_diamond: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, min_length=1, max_length=50)


class OrderResponse(SQLModel):
    """Schema for order API responses."""

    id: str
    invoice_ref: str
    order_id: str
    target_id: str
    server_id: str
    buyer_name: str
    game_username: str
    item_name: str
    quantity: int
    total_diamond: int
    status: str
    deduction_breakdown: dict
    sending_accounts: dict
    proof_video_link: Optional[str]
    delivery_at: Optional[datetime]
    actual_delivery_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class TopupHistory(SQLModel, table=True):
    """TopupHistory model for tracking Digiflazz restock transactions."""

    __tablename__ = "topup_history"

    id: Optional[str] = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        description="UUID for topup transaction",
    )
    account_id: int = Field(
        foreign_key="accounts.id",
        description="Account ID being topped up",
    )
    ref_id: str = Field(
        index=True,
        unique=True,
        min_length=1,
        max_length=100,
        description="Unique reference ID (ORD-xxx from Digiflazz or system)",
    )
    sku: str = Field(
        min_length=1,
        max_length=100,
        description="Digiflazz product SKU",
    )
    amount_diamond: int = Field(
        ge=0,
        description="Amount of diamonds topped up",
    )
    status: str = Field(
        default="PENDING",
        min_length=1,
        max_length=50,
        description="Topup status (PENDING, SUCCESS, FAILED)",
    )
    type: str = Field(
        min_length=1,
        max_length=50,
        description="Topup type (REGULAR, LUNASI, BULK)",
    )
    is_processed: bool = Field(
        default=False,
        description="Flag to prevent duplicate processing (idempotency)",
    )
    response_payload: Optional[str] = Field(
        default=None,
        description="JSON string of Digiflazz response",
    )
    created_at: datetime = Field(
        default_factory=datetime.now,
        description="Transaction creation timestamp (WIB local time, not UTC)",
    )
    updated_at: datetime = Field(
        default_factory=datetime.now,
        description="Last update timestamp (WIB local time, not UTC)",
    )

    class Config:
        """SQLModel config."""

        json_schema_extra = {
            "example": {
                "account_id": 1,
                "ref_id": "ORD-abc123",
                "sku": "PB_IGG_4000",
                "amount_diamond": 4000,
                "status": "SUCCESS",
                "type": "REGULAR",
                "is_processed": True,
                "response_payload": '{"status": "sukses", "order_id": "123456"}',
            }
        }


class TopupHistoryCreate(SQLModel):
    """Schema for creating a new topup history record."""

    account_id: int
    ref_id: str = Field(min_length=1, max_length=100)
    sku: str = Field(min_length=1, max_length=100)
    amount_diamond: int = Field(ge=0)
    status: str = Field(default="PENDING", min_length=1, max_length=50)
    type: str = Field(min_length=1, max_length=50)
    is_processed: bool = Field(default=False)
    response_payload: Optional[str] = Field(default=None)


class TopupHistoryUpdate(SQLModel):
    """Schema for updating a topup history record."""

    status: Optional[str] = Field(None, min_length=1, max_length=50)
    is_processed: Optional[bool] = None
    response_payload: Optional[str] = None


class TopupHistoryResponse(SQLModel):
    """Schema for topup history API responses."""

    id: str
    account_id: int
    ref_id: str
    sku: str
    amount_diamond: int
    status: str
    type: str
    is_processed: bool
    response_payload: Optional[str]
    created_at: datetime
    updated_at: datetime


class CostPrice(SQLModel, table=True):
    """Store cost prices for different product types (e.g., WDP_BR, WDP_TR).
    
    Used to track our internal pricing for margin calculation against market prices.
    Allows dynamic updates without redeploying.
    """

    __tablename__ = "cost_prices"

    id: Optional[int] = Field(default=None, primary_key=True)
    type: str = Field(
        index=True,
        unique=True,
        max_length=50,
        description="Product type identifier (e.g., WDP_BR, WDP_TR, ML_86)",
    )
    cost_price: int = Field(
        default=0,
        ge=0,
        description="Our internal cost price in IDR",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Cost price creation timestamp",
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last update timestamp",
    )

    class Config:
        """SQLModel config."""

        json_schema_extra = {
            "example": {
                "type": "WDP_BR",
                "cost_price": 85000,
            }
        }


class CostPriceUpdate(SQLModel):
    """Schema for updating a cost price."""

    cost_price: int = Field(ge=0)


class CostPriceResponse(SQLModel):
    """Schema for cost price API responses."""

    type: str
    cost_price: int
    created_at: datetime
    updated_at: datetime
