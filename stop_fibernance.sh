#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🛑 Mematikan semua proses Fibernance..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill uvicorn processes (Backend)
echo "🔪 Membunuh Backend processes (uvicorn)..."
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "python.*main.py" 2>/dev/null || true
pkill -f "python3.*uvicorn" 2>/dev/null || true

# Kill npm/vite processes (Frontend)
echo "🔪 Membunuh Frontend processes (npm/vite)..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true

# Kill any remaining node processes related to this project
echo "🔪 Membunuh process Node.js yang tersisa..."
pkill -f "fibernance" 2>/dev/null || true

# Give it a moment
sleep 1

# Verify processes are dead
echo ""
echo "🔍 Verifikasi proses yang masih berjalan..."

if pgrep -f "uvicorn" > /dev/null; then
    echo "⚠️  Masih ada uvicorn yang jalan, force kill..."
    pkill -9 -f "uvicorn" 2>/dev/null || true
else
    echo "✅ Backend (uvicorn) sudah mati"
fi

if pgrep -f "vite" > /dev/null || pgrep -f "npm run dev" > /dev/null; then
    echo "⚠️  Masih ada vite/npm yang jalan, force kill..."
    pkill -9 -f "vite" 2>/dev/null || true
    pkill -9 -f "npm run dev" 2>/dev/null || true
else
    echo "✅ Frontend (vite) sudah mati"
fi

sleep 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Semua proses Fibernance sudah berhenti!"
echo ""
echo "📍 Untuk menjalankan kembali, gunakan:"
echo "   bash start_fibernance.sh"
echo ""
