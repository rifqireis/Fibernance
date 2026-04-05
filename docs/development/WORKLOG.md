# Fibernance Worklog

## 2026-03-31

### Minimalist Luxury Refactor

Scope started:
- established documentation structure under `docs/`
- wrote design system rules for the Minimalist Luxury UI
- wrote architectural rules for frontend consistency and documentation flow
- began frontend cleanup to remove gradients, rounded corners, shadows, emoji UI, and mixed-language copy

Target files:
- `frontend/src/index.css`
- `frontend/src/App.tsx`
- `frontend/src/pages/Inventory.tsx`
- `frontend/src/pages/Cashier.tsx`
- `frontend/src/pages/Orders.tsx`
- `frontend/src/pages/Digiflazz.tsx`
- `frontend/src/pages/DataSync.tsx`

Intent:
- enforce a single editorial-brutalist design system
- standardize English UI copy
- reduce page-level styling drift by aligning shared primitives first

### Completed in this session

- refactored `frontend/src/index.css` to enforce sharp corners and shared monochrome primitives
- normalized `frontend/src/App.tsx` mobile navigation control to sharp-corner styling
- rewrote `frontend/src/pages/Digiflazz.tsx` into monochrome editorial panels with English copy
- rewrote `frontend/src/pages/DataSync.tsx` into a consistent export/import workflow with sharp modal shells
- refactored `frontend/src/pages/Orders.tsx` to use elegant status badges, monochrome actions, English UI chrome, and shadow-free modals
- cleaned `frontend/src/pages/Inventory.tsx` status copy and classification badge tones
- cleaned `frontend/src/pages/Cashier.tsx` parser copy, category labels, and color drift in account cards

### Validation

- frontend build completed successfully with `npx vite build`
- grep audit removed decorative gradients, rounded variants, decorative shadows, emoji UI, and blue/yellow drift from page components

### Primitive component foundation

- created `frontend/src/components/ui/` as the base design system library
- added sharp-corner primitives for `Button`, `Badge`, `Card`, `Input`, and `Modal`
- added a lightweight `cn()` helper and barrel export for consistent reuse without adding dependencies
- extended the design guidelines to explicitly allow a pale warning badge treatment for caution states

### Primitive rollout

- refactored `frontend/src/pages/Orders.tsx` to consume shared `Button`, `Badge`, `Card`, `Input`, and `Modal` primitives for search, actions, mobile cards, and modal shells
- refactored `frontend/src/pages/Digiflazz.tsx` to consume shared `Button`, `Badge`, `Card`, and `Input` primitives for market panels, balance states, tab controls, and submit actions
- exported the shared `cn()` helper from the UI barrel so page-level refactors can compose stateful class variants consistently

### Primitive rollout continuation

- added a reusable `Textarea` primitive under `frontend/src/components/ui/` to support multiline operational forms without reintroducing local style drift
- refactored `frontend/src/pages/DataSync.tsx` to consume shared `Card`, `Button`, `Badge`, and `Modal` primitives while preserving export, preview, backup, and import-confirm behavior
- refactored `frontend/src/pages/Cashier.tsx` to consume shared `Card`, `Button`, `Badge`, `Input`, `Textarea`, and `cn()` utilities for parser controls, underline fields, process actions, and account cards without changing parser or order-processing logic

### Primitive rollout completion pass

- added a reusable `Select` primitive under `frontend/src/components/ui/` and replaced remaining local select styling in `Orders.tsx` and `Digiflazz.tsx`
- refactored `frontend/src/pages/Inventory.tsx` to use shared `Button`, `Badge`, `Card`, `Input`, `Modal`, and `cn()` primitives for table shells, account cards, and account maintenance modals without changing account mutation flows
- refactored `frontend/src/App.tsx` navigation styling to use shared class composition and the shared mobile menu button primitive so the shell matches the rest of the design system

### Specialized form primitives

- added reusable `RadioCardGroup` and `FileTrigger` primitives under `frontend/src/components/ui/` for operational choice grids and file upload triggers
- refactored `frontend/src/pages/DataSync.tsx` export/import scope selectors and JSON file picker to use the shared primitives without changing backup, preview, or confirm-import behavior
- refactored the video upload picker in `frontend/src/pages/Orders.tsx` to use the shared file trigger primitive while preserving upload validation and Telegram delivery flow

### Supply chain architecture standard

- added `docs/architecture/SUPPLY_CHAIN_WORKFLOW.md` to define Inventory as the strict Single Source of Truth between Sales and Digiflazz
- documented the Manual WDP Boost or Temporary Minus workaround as technical debt and formalized its replacement with explicit deficit tracking and a restock queue
- defined the target order-state refinement for supply-aware delivery readiness: `WAITING_FRIEND_ADD`, `FRIEND_DELAY_ACTIVE`, `AWAITING_RESTOCK`, and `READY_TO_GIFT`

### Phase 1 backend model update

- added `deficit_diamond` to the account model and account schemas to represent explicit inventory shortage without corrupting real stock
- introduced the `RestockQueue` model as the additive linkage between order deficits and future supplier action
- updated order status documentation in the model layer to support the phased transition toward the new pre-delivery state machine while keeping `PENDING` as the default for rollout safety

### Phase 2 backend logic update

- updated `backend/app/services/order_service.py` so combo orders reserve only real stock, record any shortfall into `deficit_diamond`, and create `RestockQueue` rows instead of allowing negative inventory
- updated `backend/app/services/account_service.py` so successful supplier value clears explicit deficits and resolves the oldest open queue entries before any remainder reaches stock
- preserved legacy `pending_wdp` bookkeeping for rollout compatibility while shifting operational priority to explicit deficit and queue handling
- updated `backend/app/routers/orders.py` cancellation flow so order refunds also reverse linked open restock queue deficits and mark those queue entries as cancelled within the same transaction

### Phase 3 cashier SSOT update

- updated `frontend/src/api/accounts.ts` and `frontend/src/pages/Cashier.tsx` so the Cashier workflow reads real stock and explicit deficits instead of fake WDP forecasting
- replaced the old potential-based account grouping with `Sufficient Stock` and `Requires Restock`, and surfaced projected deficit plus current deficit directly in account cards
- kept order processing available for restock-required selections so the backend can create `RestockQueue` entries under the new SSOT workflow

### Phase 4 Digiflazz queue visibility

- added an active purchase queue endpoint in `backend/app/routers/digiflazz.py` so Digiflazz can read open or in-progress restock demand together with account names
- added `frontend/src/api/digiflazz.ts` and a `Purchase Queue` tab in `frontend/src/pages/Digiflazz.tsx` to surface live restock deficits emitted by Cashier
- completed the visibility bridge between Cashier deficit creation and Digiflazz supply monitoring without adding any new operator actions yet

### Automatic readiness reconciliation

- added a backend reconciliation loop so successful queue resolution now reevaluates affected orders and promotes them from `AWAITING_RESTOCK` to `FRIEND_DELAY_ACTIVE` or `READY_TO_GIFT` automatically when supplier deficits clear

- created `docs/development/SUPPLY_CHAIN_IMPLEMENTATION_V1.md` to document the low-level mechanics of the five-phase supply chain refactor separately from the high-level architecture standard

- fixed the backend accounts response mapping in `backend/app/routers/accounts.py` so Inventory and Cashier can fetch account data correctly after the `deficit_diamond` schema addition

- added a lightweight startup schema sync in `backend/app/core/database.py` so existing SQLite databases automatically receive additive columns required by the new account-fetch flow

- hardened the startup schema sync into an additive patch registry and documented the rollout rule in `docs/development/SUPPLY_CHAIN_IMPLEMENTATION_V1.md` so future additive columns can be introduced without repeating the same runtime break

- smoke-checked Inventory and Cashier account fetching end to end: backend `GET /api/accounts` returned `200 OK`, and both UI routes triggered successful account-fetch requests after the schema-sync fix

- compacted the mobile expanded detail panel in `frontend/src/pages/Orders.tsx` into a denser grid layout and simplified sender rows after confirming the previous block consumed too much vertical space for routine order review

- compacted the mobile order card header in `frontend/src/pages/Orders.tsx`, unified metadata typography, and remapped Orders status badges plus `Active/History` filters so `WAITING_FRIEND_ADD`, `FRIEND_DELAY_ACTIVE`, `AWAITING_RESTOCK`, and `READY_TO_GIFT` now render in the correct operational group instead of collapsing into legacy `PENDING`

## 2026-04-04

### Inventory WDP semantics alignment

- updated `frontend/src/pages/Inventory.tsx` so Weekly Diamond Pass data is displayed as read-only tracked bookkeeping instead of a manually editable forecasting control
- removed manual `WDP Days` entry and `+ 1 WDP` / `- 1 WDP` shortcuts from Inventory account modals to align with the architectural rule that `pending_wdp` must not be used as a manual override
- surfaced `deficit_diamond` directly in Inventory account state so operators can see the active shortage signal that now drives the supply workflow
- relabeled the forecast presentation so `potential_diamond` is clearly informational and tied to tracked WDP forecast contribution rather than real stock
- cleaned `frontend/src/api/accounts.ts` by removing the duplicate payload interface and clarifying WDP-related field comments
- updated `docs/development/SUPPLY_CHAIN_IMPLEMENTATION_V1.md` to record the new Inventory semantics and to clarify that `pending_wdp` day conversions are approximate only

### Digiflazz legacy settlement activation

- added `createDigiflazzTopup()` and typed Digiflazz top-up request/response contracts in `frontend/src/api/digiflazz.ts`
- wired the `Regular Top-up` form in `frontend/src/pages/Digiflazz.tsx` to the backend `POST /api/digiflazz/topup` endpoint instead of leaving it as an alert-only placeholder
- converted `Debt Settlement` into `Legacy WDP Settlement`, kept it on the `LUNASI` top-up type, and updated the UI copy so operators understand that it is a compatibility workflow rather than the primary shortage path
- replaced the old exact-looking debt-day label in the Digiflazz settlement picker with tracked WDP storage units plus an approximate day equivalent
- documented the Digiflazz action-surface split in `docs/development/SUPPLY_CHAIN_IMPLEMENTATION_V1.md` so the legacy settlement tab cannot be mistaken for a replacement of the purchase queue

### Backend WDP guardrails

- added backend validation in `backend/app/routers/digiflazz.py` so `LUNASI` requests are rejected when an account has no tracked legacy `pending_wdp`
- normalized top-up request type handling in `backend/app/routers/digiflazz.py` so stored topup history uses canonical uppercase workflow labels
- added explicit WDP conversion helpers in `backend/app/services/account_service.py` so inbound WDP day counts are converted into legacy storage units before settlement math is applied
- fixed `apply_topup_success()` to operate on storage units internally instead of mixing day counts directly with `pending_wdp`

### Backend account response WDP estimate

- added a computed account response field for approximate tracked WDP days so frontend pages consume a single backend-defined conversion instead of recalculating from storage units locally
- updated Inventory and Digiflazz WDP labels to use the backend-provided estimate while keeping stored `pending_wdp` units visible for legacy bookkeeping clarity

### WDP backend regression coverage

- added `backend/tests/test_wdp_legacy_flow.py` with async regression coverage for legacy WDP settlement guards, WDP day-to-storage conversion, regular WDP bookkeeping, and topup type normalization
- extended `backend/tests/test_wdp_legacy_flow.py` with HTTP-level coverage for `POST /api/digiflazz/topup`, including `REGULAR` success, lowercase type normalization, and `LUNASI` rejection when no tracked legacy WDP exists
- added `httpx` to `backend/requirements.txt` so in-process ASGI route tests can be executed inside the backend test environment

### Frontend TypeScript build repair

- removed the circular project-reference relationship between `frontend/tsconfig.json` and `frontend/tsconfig.app.json` so frontend build validation can run again
- aligned `frontend/tsconfig.app.json` to extend the root TypeScript config instead of recursively referencing it
- added `frontend/src/vite-env.d.ts` so Vite environment variables such as `import.meta.env.VITE_API_URL` type-check correctly during build
- removed stale unused imports, hooks, and helper functions in `frontend/src/api/data_sync.ts`, `frontend/src/api/orders.ts`, and `frontend/src/pages/Orders.tsx` that were blocking TypeScript compilation
- exported the `CashierStore` interface from `frontend/src/store/cashierStore.ts` so the store barrel can type-check cleanly
- verified the frontend build end to end with `npm run build` after the WDP, Inventory, and Digiflazz changes