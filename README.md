# Fibernance — Fiber Governance

**Fibernance** adalah sistem otomasi backend untuk memproses dan mengelola data pesanan dari platform **Tokoku** (Seller Panel dari [Itemku](https://itemku.com)). Sistem ini dirancang spesifik untuk mengeksekusi dan mencatat alur penjualan **Gift Item (7 hari)** pada kategori permainan **Mobile Legends**.

Implementasi logika database ini secara signifikan menyederhanakan manajemen antrean pesanan, melacak status pengiriman tertunda, dan meminimalisir kesalahan pencatatan manual.

Built with **FastAPI**, **React**, dan **SQLite**.

## ✨ Key Features

### 💎 Inventory Management (Cashier)
- **Account Management**: Create and manage multiple game accounts with diamond inventory
- **Equal Distribution Algorithm**: Automatically distribute diamond orders equally across multiple accounts
- **Real-time Stock Tracking**: Monitor diamond inventory across all accounts
- **Account Status**: Activate/deactivate accounts on demand

### 📦 Order Management
- **Combo Orders**: Create orders for multiple items with automatic diamond deduction
- **Order Tracking**: Track order status from PENDING → DONE → CANCELLED
- **Delivery Timeline**: Automatic 7-8 day delivery calculation based on 15:00 WIB cutoff
- **Proof Video Delivery**: Upload and store video proof of delivery via Telegram
- **Order History**: Complete order history with details and transaction breakdown

### 🔄 Digiflazz Integration
- **Real-time Price Comparison**: Get live pricing from Digiflazz API
- **Automatic Topup**: Apply topup results with debt-first payment strategy
- **WDP Management**: Weekly Diamond Pass debt tracking and conversion
- **Proxy Support**: Built-in proxy support for API calls

### 📊 Data Synchronization
- **Export Data**: Export inventory and orders as JSON files
- **Import Data**: Import previously exported data with preview
- **Auto-Backup**: Automatic backup creation before import operations
- **Data Validation**: Preview changes before applying imports

### 🎥 Proof Video Recording
- **Video Upload**: Upload video proof of order delivery (max 50MB)
- **Telegram Cloud Storage**: Store videos in Telegram channel for safe backup
- **Proof Links**: Generate shareable Telegram links for proof verification
- **Persistent Storage**: Video links stored with orders and included in exports

## 🏗️ Tech Stack

### Backend
- **Framework**: FastAPI 0.135.1 (Python async web framework)
- **Database**: SQLite with SQLModel ORM (type-safe async ORM)
- **Async Runtime**: Uvicorn 0.42.0 + AsyncIO
- **External APIs**: 
  - Digiflazz API (game top-up services)
  - Telegram Bot API (video storage)
- **File Handling**: python-multipart for file uploads
- **Configuration**: python-dotenv for environment variables

### Frontend
- **Framework**: React 18.2.0 with TypeScript 5.3.3
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.4.1 (utility-first)
- **State Management**: 
  - Zustand 4.4.1 (client state)
  - TanStack React Query 5.28.0 (server state & caching)
- **HTTP Client**: Axios 1.6.2 with interceptors
- **Routing**: React Router DOM 6.20.1
- **Icons**: Lucide React 0.294.0



## 🚀 Quick Start (One Command)

### Prerequisites
- **Python 3.10+** (backend)
- **Node.js 16+** (frontend)
- **npm or yarn** (frontend package manager)
- **Linux/macOS or WSL** (Windows users should use the provided `.sh` scripts via WSL)

### Fastest Setup

```bash
# From project root
bash start_fibernance.sh
```

This will:
1. Start FastAPI backend on `http://localhost:8000`
2. Start React frontend on `http://localhost:5173`
3. Auto-initialize SQLite database
4. Load environment variables from `.env`

**To stop**: Press `Ctrl+C` in the terminal

### Manual Setup (Alternative)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend** (in separate terminal):
```bash
cd frontend
npm install
npm run dev
```



## 📁 Project Structure

```
fibernance/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── database.py            # AsyncSession, engine initialization
│   │   │   ├── models.py              # SQLModel: Account, Order, TopupHistory
│   │   │   ├── background_tasks.py    # Background jobs (pending order checker, topup history)
│   │   │   ├── security.py            # Security utilities
│   │   │   └── __init__.py
│   │   ├── services/
│   │   │   ├── account_service.py     # apply_topup_success() business logic
│   │   │   ├── order_service.py       # create_combo_order() with equal distribution
│   │   │   ├── digiflazz_service.py   # Digiflazz API integration
│   │   │   ├── telegram_service.py    # upload_video_to_telegram() via Telegram Bot API
│   │   │   └── __init__.py
│   │   ├── routers/
│   │   │   ├── accounts.py            # CRUD: /api/accounts, /api/accounts/{id}
│   │   │   ├── orders.py              # /api/orders (create, list, finish, cancel)
│   │   │   ├── digiflazz.py           # /api/digiflazz (price check, topup)
│   │   │   ├── data_sync.py           # /api/data (export, import-preview, import-confirm)
│   │   │   └── __init__.py
│   │   ├── main.py                    # FastAPI app, lifespan, CORS middleware
│   │   └── __init__.py
│   ├── venv/                          # Python virtual environment
│   ├── requirements.txt               # Backend dependencies
│   ├── .env                           # Environment variables (API keys, DATABASE_URL)
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Cashier.tsx            # Create new combo order with diamond picker
│   │   │   ├── Inventory.tsx          # Account list with stock levels
│   │   │   ├── Orders.tsx             # Order history with finish/cancel actions + video upload
│   │   │   ├── Digiflazz.tsx          # Digiflazz topup management
│   │   │   └── DataSync.tsx           # Export/import data with backup & preview
│   │   ├── api/
│   │   │   ├── client.ts              # Axios instance with interceptors
│   │   │   ├── accounts.ts            # useAccounts, useCreateAccount hooks
│   │   │   ├── orders.ts              # useCreateComboOrder, useFinishOrder, useCancelOrder hooks
│   │   │   ├── data_sync.ts           # useExportData, useImportPreview, useConfirmImport hooks
│   │   │   └── index.ts               # API exports
│   │   ├── store/
│   │   │   ├── cashierStore.ts        # Zustand: selected accounts, diamond picking state
│   │   │   └── index.ts
│   │   ├── components/                # Reusable React components
│   │   ├── App.tsx                    # Main app with routing
│   │   ├── main.tsx                   # React root + React Query setup
│   │   ├── index.css                  # Global Tailwind styles + custom CSS
│   │   └── (other assets)
│   ├── public/                        # Static assets
│   ├── node_modules/                  # npm dependencies
│   ├── .env                           # Production API URL
│   ├── .env.local                     # Local dev API URL (http://localhost:8000)
│   ├── package.json                   # Frontend dependencies & scripts
│   ├── vite.config.ts                 # Vite config
│   ├── tsconfig.json                  # TypeScript config
│   ├── tailwind.config.js             # Tailwind CSS config
│   ├── postcss.config.js              # PostCSS config
│   └── .gitignore
│
├── start_fibernance.sh                # Start both services (backend + frontend)
├── stop_fibernance.sh                 # Stop both services
├── run.py                             # Python runner (alternative)
├── run_all.py                         # (Legacy - use start_fibernance.sh)
├── package.json                       # Root package (unused)
├── README.md                          # This file
└── .git/                              # Git repository
```

---

## 🔧 Manual Setup (If Needed)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend
python -m app.main
```

Backend runs on `http://localhost:8000`
- API Docs: `http://localhost:8000/docs` (Swagger UI)

### Frontend Setup

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Ensure required packages are installed
npm install axios zustand @tanstack/react-query react-router-dom lucide-react

# Run development server
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## 📚 API Endpoints

### Accounts Management
- `GET /api/accounts` - List all accounts with pagination
- `GET /api/accounts/{id}` - Get single account details
- `POST /api/accounts` - Create new account
- `PATCH /api/accounts/{id}` - Update account details
- `DELETE /api/accounts/{id}` - Delete account

### Orders Management
- `POST /api/orders/combo` - Create combo order (equal distribution)
- `GET /api/orders` - List all orders with pagination
- `GET /api/orders/{order_id}` - Get order details
- `POST /api/orders/{order_id}/finish` - Finish order (upload proof video)
- `POST /api/orders/{order_id}/cancel` - Cancel order (refund diamonds)

### Digiflazz Integration
- `POST /api/digiflazz/price-check` - Get live pricing from Digiflazz
- `POST /api/digiflazz/topup` - Execute topup transaction
- `GET /api/digiflazz/history` - Get topup history

### Data Synchronization
- `POST /api/data/export` - Export data (inventory/orders as JSON)
- `POST /api/data/import-preview` - Preview import changes
- `POST /api/data/import-confirm` - Execute import (with backup)

### Health Check
- `GET /health` - Backend health status
- `GET /` - API root with documentation links
- `GET /docs` - Swagger UI documentation
- `GET /openapi.json` - OpenAPI schema



## 🎨 Design Philosophy

**Theme**: High-End Fashion Magazine / Minimalist Luxury

- **Colors**: Pure monochromatic (White #FFF, Black #000, Charcoal grays #1F2937)
- **Typography**: Serif (Playfair Display) for headings, Sans-serif (Inter) for body
- **Borders**: 1px hairlines, sharp corners (rounded-none)
- **Shadows**: Minimal depth (1px only)
- **Animation**: Fade-in & slide-up (0.4s ease-out)
- **Layout**: Clean, spacious grid system with luxe whitespace
- **Icons**: Lucide React for consistency

## 🔐 Core Business Logic

### 1. Account Model
Each account represents a game server account with inventory:

```
Account:
  - id: int (primary key)
  - name: str (unique, e.g., "Account_001")
  - game_id: str (player ID)
  - zone: str (game zone)
  - server_id: str (server identifier)
  - stock_diamond: int (current inventory, default: 0)
  - pending_wdp: int (Weekly Diamond Pass debt, default: 0)
  - is_active: bool (status, default: true)
```

### 2. Order Model
Orders track gem deliveries to customers:

```
Order:
  - id: str (UUID)
  - invoice_ref: str (unique identifier)
  - order_id: str (from Itemku, optional)
  - target_id: str (customer's player ID)
  - server_id: str (target game server)
  - buyer_name: str (customer name)
  - item_name: str (product, e.g., "Starlight Card")
  - quantity: int (number of items)
  - total_diamond: int (gems to deliver)
  - status: str (PENDING | DONE | CANCELLED)
  - sending_accounts: json (accounts that processed order)
  - deduction_breakdown: json (gems deducted per account)
  - proof_video_link: str (Telegram URL for delivery proof)
  - delivery_at: datetime (expected delivery, UTC+7 aware)
  - created_at: datetime (order creation time)
  - updated_at: datetime (last update time)
```

### 3. Topup Success Flow (Debt-First Strategy)
Apply topup results with smart debt handling:

```
Function: apply_topup_success(account_id, received_diamonds, received_wdp_days)

1. Fetch account with pending_wdp debt
2. Use received_wdp_days to pay off debt first:
   - Pay debt: min(debt, received_wdp_days)
   - Remaining WDP: received_wdp_days - debt_paid
3. Convert remaining WDP to diamonds (1 WDP = 100 diamonds)
   - bonus_diamonds = remaining_wdp * 100
4. Add received_diamonds + bonus_diamonds to stock
5. Commit transaction (ACID)

Example:
  Received: 1000 diamonds + 5 WDP days
  Account debt: 3 WDP days
  
  Result:
    - Debt paid: 3 WDP days
    - Remaining WDP: 2 days
    - Bonus diamonds: 2 × 100 = 200
    - Total addition: 1000 + 200 = 1200 diamonds
```

### 4. Combo Order Flow (Equal Distribution)
Create orders distributing diamonds equally across multiple accounts:

```
Function: create_combo_order(target_id, server_id, total_diamond, account_ids[])

1. Fetch all selected accounts
2. Validate:
   - All accounts exist and are active
   - Total stock across accounts >= total_diamond
3. Calculate equal distribution:
   - base_deduction = total_diamond ÷ num_accounts
   - remainder = total_diamond % num_accounts
4. Apply deductions:
   - Each account gets: base_deduction
   - First 'remainder' accounts get: +1 extra
5. Record deduction_breakdown as JSON for audit trail
6. Calculate delivery_at:
   - If order.created before 15:00 WIB → deliver in 7 days
   - If order.created at/after 15:00 WIB → deliver in 8 days
7. Create Order with status="PENDING"
8. Commit transaction (ACID)

Example:
  Total: 1000 diamonds, 3 accounts
  
  Calculation:
    base = 1000 ÷ 3 = 333
    remainder = 1000 % 3 = 1
  
  Distribution:
    - Account A: 333 + 1 = 334
    - Account B: 333
    - Account C: 333
  
  Deduction breakdown: {"Account_A": 334, "Account_B": 333, "Account_C": 333}
```

### 5. Delivery Timeline (15:00 WIB Cutoff)
Orders are automatically scheduled based on creation time in WIB timezone:

```
Created before 15:00 WIB → Deliver same hour, 7 days later
Created at/after 15:00 WIB → Deliver same hour, 8 days later

Example:
  Order created: 2026-03-28 08:00 UTC
  = 2026-03-28 15:00 WIB (at cutoff)
  → Deliver: 2026-04-05 08:00 UTC (8 days later)
```

### 6. Proof Video Upload (Telegram Storage)
Finish orders with video proof of delivery:

```
Function: POST /api/orders/{order_id}/finish
  - Requires: video file (max 50MB, type: video/*)
  - Upload to Telegram Bot API
  - Extract message_id from response
  - Generate link: https://t.me/c/{channel_id}/{message_id}
  - Update order: status="DONE", proof_video_link=url
  - Return: updated Order with video link
```

### 7. Data Sync (Export/Import with Backup)
Backup and restore system with safeguards:

```
Export:
  - Snapshot all accounts and orders as JSON
  - Include proof_video_link for orders
  - Timestamp in ISO 8601 format
  
Preview Import:
  - Parse JSON file
  - Count existing vs new records
  - List affected items
  - Show sample data
  
Confirm Import (with auto-backup):
  - Create backup of current data (auto-download)
  - Delete all existing accounts & orders
  - Insert new data from JSON
  - Commit transaction (ACID)
```



## 🛠️ Configuration

### Backend Environment Variables (`.env`)

**Required:**
```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./fibernance.db

# Telegram Configuration (for proof video upload)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHANNEL_ID=-1003744041838

# Application
DEBUG=True
```

**Optional (Digiflazz integration):**
```env
# Digiflazz API (game topup provider)
DIGIFLAZZ_USERNAME=your_digiflazz_username
DIGIFLAZZ_API_KEY=your_digiflazz_api_key

# Proxy (for API calls)
PROXY_URL=http://user:pass@proxy:port
```

### Frontend Environment Variables

**Production** (`.env`):
```env
VITE_API_URL=https://your-domain.com
```

**Development** (`.env.local`):
```env
VITE_API_URL=http://localhost:8000
```

### Database
- **Type**: SQLite (file-based)
- **Location**: `fibernance.db` in backend root
- **Async Driver**: aiosqlite
- **ORM**: SQLModel (type-safe async ORM)
- **Auto-Migration**: SQLModel creates/updates tables on startup

To reset database: Remove `fibernance.db` file and restart backend



### Frontend Architecture
- **State Management**: 
  - Zustand for UI state (selected accounts, modal visibility)
  - TanStack React Query for server cache (accounts, orders, data)
- **HTTP**: Axios with interceptors for consistent error handling
- **Styling**: Tailwind CSS utility-first + custom CSS
- **Type Safety**: Full TypeScript coverage for frontend and backend

## 📖 Frontend Pages Guide

### 🏠 Inventory
- View all game accounts with stock levels
- Create new accounts
- Edit account details (game ID, zone, active status)
- Real-time stock updates
- Account status indicators

### 💎 Cashier
- Create combo orders by selecting accounts
- Diamond picker modal for amount
- Auto-calculate distribution across selected accounts
- Order receipt modal after creation
- Order confirmation dialog

### 📦 Orders
- View order history with pagination
- Filter by status (PENDING, DONE, CANCELLED)
- Search orders by invoice, player ID, buyer name, username
- Sort by date, item, or diamond amount
- **Finish Order**: Upload proof video (max 50MB)
- **Cancel Order**: Refund diamonds to source accounts
- View proof video links (clickable Telegram URLs)
- Print order receipts in Indonesian/English

### 🔄 Digiflazz
- Check live prices for game items
- Execute topup transactions
- View topup history with status
- Track pending topups
- View WDP (Weekly Diamond Pass) conversions

### 📊 DataSync
- **Export**: Download inventory + orders as JSON
- **Import**: Upload JSON file with live preview
- **Preview**: See what accounts/orders will be added/deleted
- **Auto-Backup**: Automatic backup before import
- Rollback support via backed-up exports

## 🔧 Development Guidelines

### Code Standards
- **Language**: English for all code (variables, functions, comments)
- **Type Safety**: Full TypeScript in frontend, type hints in backend
- **Async/Await**: All I/O operations use async patterns
- **Error Handling**: Try-catch with proper HTTP status codes
- **Database**: SQLModel with ACID transactions

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/feature-name

# Commit with descriptive messages
git commit -m "feat: add feature description"

# Push to remote
git push origin feature/feature-name

# Create PR for review
```

### Testing the App

**1. Create an Account**
- Navigate to Inventory page
- Click "Create Account"
- Fill in account details

**2. Create an Order**
- Go to Cashier page
- Select accounts to deduct from
- Enter diamond amount
- Confirm order

**3. Upload Proof Video**
- Go to Orders page
- Find PENDING order
- Click "Finish"
- Select video file (< 50MB)
- Upload - video stored in Telegram

**4. Export/Import Data**
- Go to DataSync page
- Click Export to download JSON
- Click Import to restore from JSON
- Preview shows changes before applying

### Performance Tips
- Database queries use pagination (default: 50 items)
- React Query caches data automatically
- Avoid re-queries by using invalidation on mutations
- Telegram uploads run asynchronously
- Background tasks check pending orders every 5 minutes

## 🐛 Troubleshooting

### Backend Issues

**Port 8000 already in use**
```bash
# Kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Or use different port
uvicorn app.main:app --port 8001
```

**Database "no such column" error**
```bash
# Delete old database to force migration
rm fibernance.db

# Restart backend to recreate schema
```

**Import preview shows "Network Error"**
- Check `.env` file exists with required variables
- Verify backend is running on port 8000
- Check VITE_API_URL in frontend/.env.local points to correct backend URL

### Frontend Issues

**Port 5173 already in use**
```bash
# Kill port or use different port
npm run dev -- --port 5174
```

**Blank page or 'Loading...'**
- Check browser console for errors (F12)
- Verify backend is running: `curl http://localhost:8000/health`
- Check frontend `.env.local` for correct API URL

**Export/Import Not Working**
- Ensure backend has proper permissions to create files
- Check `.env` file has DATABASE_URL configured
- Verify Telegram credentials for proof video storage

### API Issues

**500 "Internal Server Error"**
- Check backend logs for exception
- Verify database file exists with proper schema
- Ensure all required environment variables are set

**400 "Bad Request"**
- Validate request payload format
- Check TypeScript types match API schema
- Verify file uploads are multipart/form-data

## 📞 Debugging

### View Backend Logs
```bash
# Run with verbose logging
uvicorn app.main:app --log-level debug

# Check specific endpoint response
curl -X GET http://localhost:8000/api/orders -v
```

### View Frontend Requests
```bash
# Open browser DevTools (F12)
# Check Network tab for API calls
# Check Console for JavaScript errors
```

### Database Inspection
```bash
# Install sqlite3 CLI
# Open database
sqlite3 fibernance.db

# View schema
.schema

# Count records
SELECT COUNT(*) FROM accounts;
SELECT COUNT(*) FROM orders;
```

## 📚 Useful Resources

### Documentation
- **FastAPI Docs**: http://localhost:8000/docs (Swagger UI)
- **OpenAPI Schema**: http://localhost:8000/openapi.json
- **React Query Docs**: https://tanstack.com/query/latest
- **Tailwind CSS**: https://tailwindcss.com/docs

### External APIs
- **Digiflazz**: Game topup provider with item catalog
- **Telegram Bot API**: Video storage and file hosting
- **SQLModel**: Type-safe ORM - https://sqlmodel.tiangolo.com/

## 🚀 Deployment

### Recommended Stack
- **Backend**: Docker + Gunicorn + Uvicorn on Linux VPS
- **Frontend**: Static hosting (Vercel, Netlify, or nginx)
- **Database**: SQLite (local) or PostgreSQL (prod)
- **Reverse Proxy**: nginx for CORS and SSL

### Docker Example (Backend)
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:5432/fibernance
DEBUG=False
TELEGRAM_BOT_TOKEN=your_production_token
TELEGRAM_CHANNEL_ID=your_channel_id
DIGIFLAZZ_USERNAME=prod_username
DIGIFLAZZ_API_KEY=prod_key
```

## 📄 License

Private project for Tokoku Business. All rights reserved.

## 💬 Support

For issues or questions:
1. Check this README
2. Review API docs at `/docs` endpoint
3. Check browser console for errors (F12)
4. Review backend logs for exceptions

---

**Built with ❤️ using FastAPI + React + SQLite**  
**Last Updated**: March 28, 2026  
**Version**: 0.1.0
