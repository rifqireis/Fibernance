# Fibernance - Finance Tracker & Smart Cashier

A modern, minimalist luxury web application for finance tracking, inventory management, and smart order processing for game top-up businesses.

## 🏗️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite with SQLModel ORM
- **Authentication**: JWT (ready)
- **Async**: AsyncIO with Uvicorn

### Frontend
- **Framework**: React 18 with TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand (client) + TanStack Query (server)
- **HTTP**: Axios with interceptors

## 🚀 Quick Start (One Command)

### Prerequisites
- **Python 3.9+** (for backend)
- **Node.js 16+** (for frontend)
- **npm or yarn**

### Run Everything with One Command

```bash
python run_all.py
```

This script will automatically:
1. ✅ Check and create Python virtual environment for backend
2. ✅ Install all backend dependencies (from `requirements.txt`)
3. ✅ Install all frontend dependencies (from `package.json`)
4. ✅ Start FastAPI backend on `http://localhost:8000`
5. ✅ Start React frontend on `http://localhost:5173`

**Press `Ctrl+C` to gracefully stop all servers.**

---

## 📁 Project Structure

```
fibernance/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── database.py       # SQLite + AsyncSession setup
│   │   │   ├── models.py         # SQLModel schemas
│   │   │   └── __init__.py
│   │   ├── services/
│   │   │   ├── account_service.py # Business logic (apply_topup_success)
│   │   │   ├── order_service.py  # Order creation (create_combo_order)
│   │   │   └── __init__.py
│   │   ├── routers/
│   │   │   ├── accounts.py       # CRUD endpoints (/api/accounts)
│   │   │   └── __init__.py
│   │   ├── main.py               # FastAPI app + lifespan
│   │   └── __init__.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts         # Axios instance with interceptors
│   │   │   ├── accounts.ts       # useAccounts hook (React Query)
│   │   │   └── index.ts
│   │   ├── pages/
│   │   │   ├── Inventory.tsx     # Account list page
│   │   │   └── Cashier.tsx       # Order combo form
│   │   ├── store/
│   │   │   ├── cashierStore.ts   # Zustand store for order state
│   │   │   └── index.ts
│   │   ├── index.css             # Global styles (Tailwind + customs)
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── package.json
│   ├── tailwind.config.js        # Tailwind config (luxury theme)
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── .env                      # API URL config
│   ├── .env.local
│   └── .gitignore
│
├── run_all.py                    # 🎯 One-command startup script
└── README.md
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

### Accounts
- `GET /api/accounts` - List all accounts
- `GET /api/accounts/{id}` - Get single account
- `POST /api/accounts` - Create account
- `PATCH /api/accounts/{id}` - Update account
- `DELETE /api/accounts/{id}` - Delete account

### Orders
- `POST /api/orders` - Create combo order (uses equal distribution)
- `GET /api/orders/{id}` - Get order details
- `GET /api/orders` - List all orders

---

## 🎨 Design Philosophy

**Theme**: High-End Fashion Magazine / Minimalist Luxury

- **Colors**: Pure monochromatic (True White #FFF, Pitch Black #000, Charcoal grays)
- **Typography**: Serif (Playfair Display) for headings/totals, Sans-serif (Inter) for body
- **Borders**: 1px hairlines, sharp corners (rounded-none)
- **Shadows**: Minimal, 1px depth only
- **Animation**: Slow fade-in & slide-up (0.4s ease-out)
- **Status Indicators**: Text + small dots (no colorful badges)

---

## 🔐 Core Business Logic

### Account Model
- **stock_diamond**: Current inventory
- **pending_wdp**: Weekly Diamond Pass debt
- **is_active**: Account status

### Topup Success (Debt-First)
Function: `apply_topup_success(account_id, received_diamonds, received_wdp_days)`
```
1. Check for pending WDP debt
2. Use incoming WDP to pay debt first
3. Remaining WDP converts to diamonds (1 WDP = 100 Diamond)
4. Add received_diamonds directly
5. Commit transaction (ACID)
```

### Combo Order (Equal Distribution)
Function: `create_combo_order(target_id, server_id, total_diamond, selected_account_ids[])`
```
1. Select multiple accounts
2. Verify total stock >= order amount
3. Divide equally: base = total / num_accounts, remainder = total % num_accounts
4. Distribute remainder across accounts (+1 each)
5. Record deduction_breakdown as JSON
6. Commit transaction (ACID)
```

---

## 🛠️ Development Notes

- All code uses **English** for variable/function/table names
- Focus on **O(1) or O(log N)** algorithm complexity
- SQLModel for type-safe ORM with async support
- React Query for server state (caching, mutations)
- Zustand for lightweight client state
- Tailwind CSS for utility-first, responsive design

---

## 📝 Environment Variables

### Backend (`.env`)
```
DATABASE_URL=sqlite+aiosqlite:///./fibernance.db
DEBUG=True
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:8000
```

---

## 🎯 Next Features (Roadmap)

- [ ] User authentication & JWT
- [ ] Transaction history
- [ ] Report generation
- [ ] Automated WDP reconciliation
- [ ] Real-time notifications
- [ ] Multi-user roles (Admin, Operator, Auditor)
- [ ] Docker containerization

---

## 📄 License

Private project for Tokoku Business

---

## 💬 Questions?

Refer to `run_all.py` for one-command setup.
API documentation available at `http://localhost:8000/docs` once running.
