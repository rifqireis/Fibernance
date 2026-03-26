import subprocess
import sys
import os
import platform
import time
from pathlib import Path

def check_dependencies():
    """Verify that dependencies are installed, install if needed."""
    base_dir = Path(__file__).parent
    backend_dir = base_dir / "backend"
    frontend_dir = base_dir / "frontend"
    
    os_name = platform.system()
    is_windows = os_name == 'Windows'
    npm_cmd = "npm.cmd" if is_windows else "npm"
    
    # Check backend venv
    venv_path = backend_dir / "venv"
    if not venv_path.exists():
        print("❌ Error: Backend venv tidak ditemukan di", venv_path)
        print("Silakan jalankan setup manual di folder backend")
        sys.exit(1)
    
    # Ensure npm packages are installed
    node_modules = frontend_dir / "node_modules"
    if not node_modules.exists():
        print("📦 Installing frontend dependencies...")
        try:
            subprocess.run([npm_cmd, "install"], cwd=frontend_dir, check=True)
            print("✅ Frontend dependencies installed")
        except subprocess.CalledProcessError:
            print("❌ Failed to install frontend dependencies")
            sys.exit(1)

def main():
    # Deteksi Sistem Operasi
    os_name = platform.system()
    is_windows = os_name == 'Windows'
    
    base_dir = Path(__file__).parent
    backend_dir = base_dir / "backend"
    frontend_dir = base_dir / "frontend"
    
    # Setup paths
    if is_windows:
        python_exec = backend_dir / "venv" / "Scripts" / "python.exe"
        npm_exec = "npm.cmd"
    else:
        python_exec = backend_dir / "venv" / "bin" / "python"
        npm_exec = "npm"
    
    # Check dependencies
    check_dependencies()
    
    # Prepare backend command
    backend_cmd = [
        str(python_exec),
        "-m", "uvicorn",
        "app.main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload"
    ]
    
    # Prepare frontend command
    frontend_cmd = [npm_exec, "run", "dev", "--host", "0.0.0.0"]
    
    print("\n🚀 Memulai Fibernance (Backend + Frontend)...")
    print("━" * 50)
    print("📡 Backend:  http://localhost:8000")
    print("💻 Frontend: http://localhost:5173")
    print("📚 API Docs: http://localhost:8000/docs")
    print("━" * 50)
    print("👉 Tekan Ctrl+C untuk mematikan server\n")
    
    backend_process = None
    frontend_process = None
    
    try:
        # Start backend
        print("⏳ Menyalakan Backend...")
        backend_process = subprocess.Popen(backend_cmd, cwd=backend_dir)
        time.sleep(3)
        
        # Start frontend
        print("⏳ Menyalakan Frontend...")
        frontend_process = subprocess.Popen(frontend_cmd, cwd=frontend_dir)
        time.sleep(2)
        
        print("✅ Fibernance berhasil dijalankan!\n")
        
        # Keep running until interrupted
        while True:
            time.sleep(1)
    
    except KeyboardInterrupt:
        print("\n\n🛑 Mematikan server...")
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        
        # Give processes time to terminate gracefully
        time.sleep(1)
        
        # Force kill if still running
        if backend_process and backend_process.poll() is None:
            backend_process.kill()
        if frontend_process and frontend_process.poll() is None:
            frontend_process.kill()
        
        print("✅ Semua server berhasil dimatikan.")
        sys.exit(0)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        sys.exit(1)

if __name__ == '__main__':
    main()
