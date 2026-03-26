#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"

# Fungsi untuk mematikan semua proses saat kita tekan Ctrl+C
function cleanup {
    echo -e "\n\n🛑 Mematikan semua layanan..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Tangkap sinyal interrupt (Ctrl+C)
trap cleanup SIGINT SIGTERM

# Verify venv exists
if [ ! -d "${BACKEND_DIR}/venv" ]; then
    echo "❌ Virtual environment tidak ditemukan di ${BACKEND_DIR}/venv"
    echo "Silakan jalankan: python3 run.py"
    exit 1
fi

# Verify npm packages are installed
if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
    echo "❌ Frontend dependencies tidak ditemukan"
    echo "Silakan jalankan: npm install (di folder frontend)"
    exit 1
fi

echo "🚀 Menjalankan Fibernance Ecosystem..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Backend:  http://localhost:8000"
echo "💻 Frontend: http://localhost:5173"
echo "📚 API Docs: http://localhost:8000/docs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Jalankan Backend
echo "⏳ Menyalakan Backend..."
cd "${BACKEND_DIR}" || exit 1
source venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!
sleep 3 # Beri jeda agar backend siap

# 2. Jalankan Frontend
echo "⏳ Menyalakan Frontend..."
cd "${FRONTEND_DIR}" || exit 1
npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3 # Beri jeda agar Vite benar-benar siap

echo "✅ Fibernance berhasil dijalankan di background!"
echo "📝 Log Backend:  tail -f ${BACKEND_DIR}/backend.log"
echo "📝 Log Frontend: tail -f ${FRONTEND_DIR}/frontend.log"
echo "👉 Tekan CTRL+C untuk mematikan kedua server sekaligus."
echo ""

# Menahan script agar tetap jalan
wait
