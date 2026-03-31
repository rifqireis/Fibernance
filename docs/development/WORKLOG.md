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