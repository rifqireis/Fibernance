# Supply Chain Workflow

## Purpose

This document defines the standard workflow between the Sales module, the Supply module, and the Inventory module.

The governing rule is simple:
- Inventory is the Single Source of Truth.
- Sales may read and reserve inventory.
- Supply may add inventory only after real supplier success.
- No module may simulate stock by writing fake operational data.

## 1. Background & Technical Debt

### Current Workaround: Manual WDP Boost

The current workaround is known internally as Manual WDP Boost or Temporary Minus.

In the current model, admins manually edit `pending_wdp` in Inventory to artificially increase `potential_diamond`. This makes the account appear forecast-safe to the Sales workflow and allows Cashier or Orders to proceed even when the account does not yet hold enough real diamonds.

This works because the current inventory logic treats `pending_wdp` as future WDP value and folds part of that value into `potential_diamond`.

In practice, this means a bookkeeping field is being used as a sales-enablement switch.

### Why This Is Fragile

Weekly Diamond Pass is not instant stock in full.

Operationally:
- 1 WDP gives 80 diamonds immediately.
- The remaining value arrives over 7 days at 20 diamonds per day.
- Multiple passes can be stacked, but they still represent a timed supply stream, not free inventory.

When admins manually increase `pending_wdp` before the WDP is actually purchased, the system is no longer describing reality.

### Risks

- It pollutes the Inventory database because fake demand and real supply are stored in the same field.
- It destroys field meaning because `pending_wdp` no longer represents only actual WDP state.
- It creates high human-error risk because an admin must remember to buy the missing WDP on Digiflazz before the 7-day Itemku delivery deadline.
- It increases operational penalty risk because a missed purchase can leave the order undeliverable when the gifting window opens.
- It weakens traceability because the reason for the stock gap is not recorded as an explicit restock obligation.

## 2. Core Architectural Principle: Strict Separation of Concerns

The system must isolate sales intent, supply execution, and inventory truth.

### Sales Module: Cashier and Orders

Responsibilities:
- Process Itemku-facing orders and cashier workflows.
- Manage the customer lifecycle, including the 7-day friend delay.
- Read inventory availability.
- Reserve inventory against an order decision.
- Emit a restock signal when a valid order creates a future supply need.

Constraints:
- Sales MUST NOT know where diamonds come from.
- Sales MUST NOT call Digiflazz purchase flows directly.
- Sales MUST NOT write fake stock, fake WDP, or synthetic inventory balances.

### Supply Module: Digiflazz

Responsibilities:
- Fetch real-time supplier prices.
- Execute top-up transactions through the Digiflazz API.
- Track pending, success, and failure responses from the supplier.
- Consume restock signals and expose an operational purchase queue.

Constraints:
- Supply MUST NOT know Itemku order details.
- Supply MUST NOT own customer-facing order timing rules.
- Supply MUST NOT change order state except through inventory truth becoming available.

### Inventory Module

Inventory is the Single Source of Truth.

Access rules:
- Digiflazz has Write/Add access only when supplier execution succeeds.
- Cashier has Read/Reserve access only for order matching and allocation.
- Manual administrative edits must never be used to fake future stock.

Operational meaning:
- `real_diamond` must always equal the real game account position.
- Any future shortage must be represented as shortage or queue data, not as fake stock.
- Inventory answers one question only: what is real, what is reserved, and what is still missing.

### Standard Interaction Boundary

```text
Sales (Cashier / Orders)
    -> reads Inventory
    -> reserves Inventory
    -> emits Restock Signal when deficit exists

Supply (Digiflazz)
    -> reads Restock Queue
    -> executes supplier purchase
    -> writes Inventory only after success

Inventory
    -> stores real stock, reservations, and explicit shortage state
```

## 3. The New Solution: System Decoupling & Queueing

The replacement for Manual WDP Boost is explicit shortage tracking plus an automated purchase queue.

### Inventory Model Changes

The current overload on `pending_wdp` must be removed.

New rule:
- `real_diamond` stays 100% accurate to the real game account.
- Future shortage is represented explicitly through a `deficit_diamond` or `queued_restock` concept.
- `pending_wdp` may remain only if it represents actual purchased WDP state. It must not be used as a manual forecast override.

Illustrative schema direction:

```python
class Account(SQLModel, table=True):
    id: int
    name: str
    stock_diamond: int          # Real stock only
    reserved_diamond: int       # Optional explicit reservation bucket
    deficit_diamond: int        # Explicit shortage, not stock
    pending_wdp: int            # Optional: actual purchased WDP state only
```

If queue entries need their own lifecycle, the preferred direction is a dedicated queue entity rather than another overloaded account field.

```python
class RestockQueue(SQLModel, table=True):
    id: str
    account_id: int
    deficit_diamond: int
    required_by: datetime
    suggested_sku: str
    suggested_quantity: int
    status: str  # OPEN, PROCESSING, FULFILLED, CANCELLED
```

This keeps inventory truth and restock operations separate while still allowing the account view to expose a clear deficit summary.

### Draft and Purchase Queue System

When Cashier creates an order that requires more diamonds than the assigned account currently holds, the order flow must not fake inventory.

Instead, Sales generates a Restock Signal.

Minimum payload:

```json
{
  "account_id": 12,
  "deficit_diamond": 140,
  "required_by": "2026-04-07T15:00:00+07:00",
  "suggested_sku": "WDP_BR",
  "suggested_quantity": 1,
  "status": "OPEN"
}
```

Operational rules:
- The restock signal is created immediately when the sales workflow detects a future shortage.
- The signal is operational, not customer-facing.
- The Digiflazz module reads open signals and renders an automated Purchase Queue.
- The Purchase Queue should describe actionable work, for example: `Account X needs 1x WDP in 4 days`.
- When Digiflazz succeeds, Inventory is updated with real stock and the queue entry is reduced or closed.
- When Digiflazz fails or remains pending, the queue entry stays open and operations can escalate before the deadline.

This design removes the need to inflate `potential_diamond` just to make order creation possible.

### Order State Machine Modification

The order model needs a more granular pre-delivery state machine.

Required pre-delivery states:

```python
ORDER_STATUS = [
    "WAITING_FRIEND_ADD",
    "FRIEND_DELAY_ACTIVE",
    "AWAITING_RESTOCK",
    "READY_TO_GIFT",
]
```

State meaning:
- `WAITING_FRIEND_ADD`: order exists, but the player relationship is not yet ready.
- `FRIEND_DELAY_ACTIVE`: the 7-day friend delay is running.
- `AWAITING_RESTOCK`: the time gate is no longer the blocker, but real stock is still insufficient.
- `READY_TO_GIFT`: the 7-day delay has passed and real inventory is now sufficient.

Transition rule:

```text
Order created
    -> WAITING_FRIEND_ADD
    -> FRIEND_DELAY_ACTIVE

If friend delay completes and stock is sufficient
    -> READY_TO_GIFT

If friend delay completes and stock is insufficient
    -> AWAITING_RESTOCK

If restock later succeeds
    -> READY_TO_GIFT
```

Important nuance:
- Restock signals can be created before the 7-day delay finishes.
- `AWAITING_RESTOCK` is the blocking state only when time is ready but inventory is not.
- `READY_TO_GIFT` must never be triggered by forecast data. It is unlocked only by real inventory sufficiency.

### Resulting Standard

After this change:
- Sales records demand and customer timing.
- Supply handles capital deployment and supplier execution.
- Inventory remains clean, auditable, and real.
- Future shortage becomes visible through queue data, not fake balance manipulation.

This is the required architecture standard for Fibernance going forward.