import subprocess
import sys
import os
import time
from pathlib import Path

# Konfigurasi Path
BASE_DIR = Path(__file__).parent
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_DIR = BASE_DIR / "frontend"

# FIX UNTUK WINDOWS: Gunakan npm.cmd jika berjalan di Windows
NPM_CMD = "npm.cmd" if os.name == "nt" else "npm"

def run_command(command, cwd, shell=False):
    return subprocess.Popen(command, cwd=cwd, shell=shell)

def setup_environment():
    print("--- [1/3] Setting up Backend ---")
    venv_path = BACKEND_DIR / "venv"
    if not venv_path.exists():
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], cwd=BACKEND_DIR)
    
    pip_path = venv_path / "Scripts" / "pip" if os.name == "nt" else venv_path / "bin" / "pip"
    print("Installing backend dependencies...")
    subprocess.run([str(pip_path), "install", "-r", "requirements.txt"], cwd=BACKEND_DIR)

    print("\n--- [2/3] Setting up Frontend ---")
    node_modules_path = FRONTEND_DIR / "node_modules"
    tailwindcss_path = node_modules_path / "tailwindcss"
    
    # Check if node_modules exists AND tailwindcss is installed
    # If either is missing, run npm install
    if not node_modules_path.exists() or not tailwindcss_path.exists():
        print("Installing frontend dependencies (this may take a moment)...")
        try:
            # Menggunakan NPM_CMD yang sudah disesuaikan untuk Windows
            result = subprocess.run([NPM_CMD, "install"], cwd=FRONTEND_DIR, check=True)
            if result.returncode == 0:
                print("✅ Frontend dependencies installed successfully")
        except FileNotFoundError:
            print("❌ npm not found. Please restart VS Code to refresh PATH.")
            sys.exit(1)
        except subprocess.CalledProcessError as e:
            print(f"❌ npm install failed with error code {e.returncode}")
            sys.exit(1)
    else:
        print("✅ Frontend dependencies already installed")

def start_services():
    print("\n--- [3/3] Starting Fibernance ---")
    
    venv_python = BACKEND_DIR / "venv" / "Scripts" / "python" if os.name == "nt" else BACKEND_DIR / "venv" / "bin" / "python"
    
    # FIX: Menggunakan Uvicorn agar struktur folder 'app' terbaca dengan benar
    backend_proc = run_command([str(venv_python), "-m", "uvicorn", "app.main:app", "--reload"], cwd=BACKEND_DIR)
    frontend_proc = run_command([NPM_CMD, "run", "dev"], cwd=FRONTEND_DIR)

    print("\n✅ Fibernance is running!")
    print(f"👉 Backend: http://localhost:8000")
    print(f"👉 Frontend: http://localhost:5173")
    print("\nPress Ctrl+C to stop all services.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Goodbye!")

if __name__ == "__main__":
    try:
        setup_environment()
        start_services()
    except Exception as e:
        print(f"❌ Error: {e}") 