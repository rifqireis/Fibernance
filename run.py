import subprocess
import sys
import os
import platform
import time

def main():
    # 1. Deteksi Sistem Operasi (Windows vs Linux/Termux)
    os_name = platform.system()
    is_windows = os_name == 'Windows'

    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, 'backend')
    frontend_dir = os.path.join(base_dir, 'frontend')

    # 2. Atur Path Python Virtual Environment sesuai OS
    if is_windows:
        python_exec = os.path.join(backend_dir, 'venv', 'Scripts', 'python.exe')
        npm_exec = "npm.cmd"
    else:
        # Konfigurasi untuk Termux / Linux
        python_exec = os.path.join(backend_dir, 'venv', 'bin', 'python')
        npm_exec = "npm"

    # Verifikasi apakah venv ada
    if not os.path.exists(python_exec):
        print(f"❌ Error: Python executable tidak ditemukan di {python_exec}")
        print("Pastikan kamu sudah membuat virtual environment (venv) di dalam folder backend.")
        sys.exit(1)

        # 3. Siapkan Perintah Terminal
    backend_cmd = [python_exec, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    
    if is_windows:
        frontend_cmd = [npm_exec, "run", "dev", "--", "--host"]
    else:
        # ANTI-GAGAL: Panggil 'node' secara langsung menembak file 'vite.js'
        # DITAMBAHKAN --host 0.0.0.0 AGAR VITE MAU MENERIMA CLOUDFLARE
        vite_js = os.path.join(frontend_dir, "node_modules", "vite", "bin", "vite.js")
        frontend_cmd = ["node", vite_js, "--host", "0.0.0.0"]

    print("🚀 Memulai Fibernance (Backend + Frontend)...")
    print("👉 Tekan Ctrl+C untuk mematikan kedua server.\n")

    backend_process = None
    frontend_process = None

    try:
        # Jalankan Backend
        print("⏳ Menyalakan Backend...")
        backend_process = subprocess.Popen(backend_cmd, cwd=backend_dir)
        
        # Beri jeda 2 detik agar backend siap menerima koneksi
        time.sleep(2)
        
        # Jalankan Frontend
        print("⏳ Menyalakan Frontend...")
        frontend_process = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

        # Biarkan script berjalan sampai dihentikan manual
        backend_process.wait()
        frontend_process.wait()

    except KeyboardInterrupt:
        # Tangani saat user menekan Ctrl+C
        print("\n🛑 Mematikan server...")
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        print("✅ Fibernance berhasil dimatikan.")

if __name__ == '__main__':
    main()
