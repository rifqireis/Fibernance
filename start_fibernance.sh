#!/bin/bash

# Fungsi untuk mematikan semua proses saat kita tekan Ctrl+C
function cleanup {
    echo -e "\n\n🛑 Mematikan semua layanan..."
    kill $BACKEND_PID $FRONTEND_PID $TUNNEL_PID
    exit
}

# Tangkap sinyal interrupt (Ctrl+C)
trap cleanup SIGINT

echo "🚀 Menjalankan Fibernance Ecosystem..."

# ... bagian awal tetap sama ...

# 1. Jalankan Backend
echo "📡 Menyalakan Backend..."
cd /mnt/d/my-project/Tokoku/Fibernance/backend
source venv_linux/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
sleep 2 # Beri jeda 2 detik

# 2. Jalankan Frontend
echo "💻 Menyalakan Frontend..."
cd /mnt/d/my-project/Tokoku/Fibernance/frontend
npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 5 # Beri jeda 5 detik agar Vite benar-benar siap

# 3. Jalankan Tunnel
echo "☁️  Menghubungkan Tunnel..."
cloudflared tunnel run kasir-desktop > tunnel.log 2>&1 &
TUNNEL_PID=$!

# ... bagian akhir tetap sama ...

echo "✅ Semua layanan sedang berjalan di background!"
echo "📝 Log Backend: tail -f backend/backend.log"
echo "📝 Log Frontend: tail -f frontend/frontend.log"
echo "📝 Log Tunnel: tail -f tunnel.log"
echo "👉 Tekan CTRL+C untuk mematikan semuanya sekaligus."

# Menahan script agar tetap jalan
wait
