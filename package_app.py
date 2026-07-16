import os
import subprocess
import sys

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("=== Step 1: Making sure frontend assets are built and synced ===")
    subprocess.run([sys.executable, "build_assets.py"], cwd=root_dir, check=True)
    
    print("\n=== Step 2: Checking / Installing PyInstaller ===")
    try:
        import PyInstaller
        print("PyInstaller is already installed.")
    except ImportError:
        print("PyInstaller not found. Installing via pip...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)

    print("\n=== Step 3: Compiling App with PyInstaller ===")
    
    # We use --onedir (default) instead of --onefile for large scientific packages (numpy, pandas, sklearn, opencv)
    # to avoid extremely slow startup times (unpacking 200MB+ of DLLs on every launch).
    cmd = [
        "pyinstaller",
        "--name=BuildWise_AI",
        "--noconfirm",
        "--windowed",  # Hide terminal console
        f"--add-data=backend/app/static{os.pathsep}app/static",
        f"--add-data=backend/seed.py{os.pathsep}.",
        "--collect-all=uvicorn",
        "--collect-all=fastapi",
        "--collect-all=reportlab",
        "--collect-all=sklearn",
        "--hidden-import=passlib.handlers.bcrypt",
        "--hidden-import=uvicorn.protocols.http.h11_impl",
        "--hidden-import=uvicorn.protocols.websockets.websockets_impl",
        "--hidden-import=uvicorn.lifespan.on",
        "run_desktop.py"
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    subprocess.run(cmd, cwd=root_dir, check=True)
    
    print("\n=== Compilation complete! ===")
    print(f"You can find the desktop package in: {os.path.join(root_dir, 'dist', 'BuildWise_AI')}")
    print(f"To run it, double-click: {os.path.join(root_dir, 'dist', 'BuildWise_AI', 'BuildWise_AI.exe')}")

if __name__ == "__main__":
    main()
