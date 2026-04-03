# Supply Chain Implementation V1

## Purpose

This document records the concrete implementation details of the first supply-chain refactor pass.

It complements `docs/architecture/SUPPLY_CHAIN_WORKFLOW.md`.

Use this file for low-level engineering behavior, field semantics, and runtime data flow.

## 1. Database Schema

### Account

The `Account` model in `backend/app/core/models.py` now includes:

- `stock_diamond`: real inventory only
- `deficit_diamond`: explicit shortage that still requires supplier action
- `pending_wdp`: legacy compatibility field for existing WDP debt bookkeeping

Operational meaning:

- `stock_diamond` is the only field that represents real, usable diamonds.
- `deficit_diamond` is not stock. It represents a shortfall created by sales demand that could not be covered at order creation time.
- `pending_wdp` remains present for backward compatibility, but it is no longer the primary mechanism for operational shortage handling.

### RestockQueue

The refactor added a new `RestockQueue` table in `backend/app/core/models.py`.

Core fields:

- `id`: UUID primary key
- `account_id`: foreign key to `accounts.id`
- `order_id`: foreign key to `orders.id`
- `deficit_diamond`: remaining amount still required for this queue row
- `status`: `OPEN`, `IN_PROGRESS`, `RESOLVED`, or `CANCELLED`
- `created_at`, `updated_at`: local-time operational timestamps

Relationship meaning:

- `account_id` tells supply which game account needs inventory.
- `order_id` tells the system which sales order created the shortage.
- `status` tracks whether the shortage is still actionable, already satisfied, or no longer relevant.

This table is the explicit bridge between Sales demand and Supply execution.

### Startup Schema Compatibility

The SQLite startup path in `backend/app/core/database.py` now includes a lightweight additive schema sync.

Purpose:

- protect existing local databases when a new non-destructive column is added to an existing table
- prevent runtime fetch failures during rollout when model code is newer than the active SQLite file

Current behavior:

- `SQLModel.metadata.create_all()` still creates missing tables such as `RestockQueue`
- a startup patch registry then applies known additive column migrations for existing tables
- the first registered patch covers `accounts.deficit_diamond`

Engineering rule:

- future additive columns on existing tables must be registered in the startup patch registry until a full migration system is introduced

This avoids another `no such column` failure on account-fetch flows during iterative schema evolution.

## 2. Sales Flow (Cashier & Orders)

### Cashier evaluation

The Cashier frontend in `frontend/src/pages/Cashier.tsx` now evaluates account availability strictly from `real_diamond`.

Current grouping:

- `Sufficient Stock`: `account.real_diamond >= totalDiamond`
- `Requires Restock`: `account.real_diamond < totalDiamond`

The old `potential_diamond` grouping is no longer used by the Cashier workflow.

The UI now shows:

- projected deficit for the current order when the selected account lacks enough real stock
- current deficit when `account.deficit_diamond > 0`

This allows order creation to proceed without faking inventory.

### Order creation behavior

Order creation is handled in `backend/app/services/order_service.py` by `create_combo_order`.

At creation time:

1. The system distributes the requested deduction across the selected accounts.
2. Each account only reserves real stock from `stock_diamond`.
3. Stock is never allowed to go below zero.
4. Any uncovered amount is written into `account.deficit_diamond`.
5. For each uncovered amount, a new `RestockQueue` row is created with status `OPEN`.

Order status behavior:

- If no deficit is created, the order starts in `WAITING_FRIEND_ADD`.
- If any deficit is created, the order starts in `AWAITING_RESTOCK`.

This means Sales can capture real demand immediately, while supplier work is tracked as explicit queue state instead of fake inventory mutation.

## 3. Supply Flow (Digiflazz)

### Purchase Queue visibility

The Digiflazz router exposes `GET /api/digiflazz/queue` from `backend/app/routers/digiflazz.py`.

This endpoint returns active queue rows with:

- account name
- order id
- deficit amount
- queue status
- created and updated timestamps

The Digiflazz frontend in `frontend/src/pages/Digiflazz.tsx` consumes that endpoint and renders a read-only `Purchase Queue` tab.

This tab gives operations a clean list of current supply obligations without exposing customer-facing Itemku workflow logic.

### Deficit-first supplier application

Supplier success is processed in `backend/app/services/account_service.py`.

Both `apply_topup_success` and `apply_digiflazz_success` now follow the same operational priority:

1. apply incoming value to `deficit_diamond` first
2. resolve oldest `OPEN` or `IN_PROGRESS` queue entries first
3. mark fully covered queue rows as `RESOLVED`
4. only after shortage is cleared, move any remainder into `stock_diamond`

Implementation details:

- `_apply_deficit_payment()` reduces `account.deficit_diamond`
- the same helper walks queue rows oldest-first by `created_at`
- queue rows are decremented in place
- fully paid rows are promoted to `RESOLVED`
- partially paid rows remain active with a smaller `deficit_diamond`

Legacy compatibility:

- `pending_wdp` is still updated in the existing legacy flow where required
- explicit deficit handling now has higher operational priority than WDP bookkeeping

This keeps supplier value aligned to real shortages first.

## 4. The Reconciliation Loop

The reconciliation hook lives in `backend/app/services/order_service.py` as `evaluate_order_readiness(session, order_id)`.

Its purpose is to translate backend truth into the correct order state after queue changes.

Behavior:

1. Fetch the order.
2. Ignore it if the order is already `DONE` or `CANCELLED`.
3. Check whether any linked `RestockQueue` rows are still `OPEN` or `IN_PROGRESS`.
4. If active queues still exist, force `AWAITING_RESTOCK`.
5. If no active queues remain, evaluate the time gate using `order.actual_delivery_at`.
6. If the 7-day gate has not passed, set `FRIEND_DELAY_ACTIVE`.
7. If the 7-day gate has passed, set `READY_TO_GIFT`.

Trigger path:

- queue resolution in `account_service.py` returns the affected `order_id` values
- after supplier success is committed, each affected order is reevaluated automatically

Operational result:

- shortages clear immediately when supply succeeds
- order promotion does not rely on manual operator edits
- `READY_TO_GIFT` is only reached when both supply and time conditions are satisfied

## 5. Safe Cancellation

Order cancellation is handled in `backend/app/routers/orders.py`.

The refund helper now performs two rollback paths inside the same session:

### Real stock refund

- read `deduction_breakdown`
- return the actually reserved diamonds to each account's `stock_diamond`

### Queue and deficit reversal

- find linked `RestockQueue` rows for the same order with status `OPEN` or `IN_PROGRESS`
- subtract each remaining queue deficit from the corresponding account's `deficit_diamond`
- floor the result at zero
- mark each affected queue row as `CANCELLED`

This keeps cancellation transaction-safe and prevents abandoned orders from leaving stale shortages behind.

## Summary

Implementation V1 establishes a strict runtime rule set:

- Sales may create demand and explicit shortages.
- Supply resolves shortages through queue-driven restocking.
- Inventory remains the only source of real stock truth.
- Order status promotion is reconciled automatically from queue state and the delivery time gate.