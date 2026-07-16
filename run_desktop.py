import os
import sys
import socket
import time
import subprocess
import threading
import webbrowser

def find_free_port(start_port=8000, max_port=8100):
    for port in range(start_port, max_port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("Could not find a free port between 8000 and 8100.")

def wait_for_server(port, timeout=10):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                s.connect(("127.0.0.1", port))
                return True
        except (OSError, ConnectionRefusedError):
            time.sleep(0.1)
    return False

def launch_browser(url):
    print(f"Launching desktop window at {url}...")
    
    # Common installation paths for Microsoft Edge on Windows
    edge_paths = [
        "msedge",  # If in PATH
        os.path.join(os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"), "Microsoft\\Edge\\Application\\msedge.exe"),
        os.path.join(os.environ.get("ProgramFiles", "C:\\Program Files"), "Microsoft\\Edge\\Application\\msedge.exe"),
        os.path.expandvars("%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe")
    ]
    
    launched = False
    for path in edge_paths:
        try:
            # --app flag opens Edge in a clean, chromeless application window (no tabs, address bar)
            process = subprocess.Popen([path, f"--app={url}"])
            print(f"Successfully launched Edge app window using: {path}")
            return process
        except Exception:
            continue
            
    if not launched:
        print("Microsoft Edge app mode not available. Falling back to system default browser...")
        # Fallback to standard web browser
        webbrowser.open(url)
        # Return a mock process that sleeps to keep launcher alive
        class MockProcess:
            def wait(self):
                try:
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    pass
        return MockProcess()

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check if running in development mode (backend directory exists) or compiled mode
    if os.path.exists(os.path.join(root_dir, "backend")):
        # Development mode
        backend_dir = os.path.join(root_dir, "backend")
        sys.path.insert(0, backend_dir)
        os.chdir(backend_dir)
    else:
        # Compiled mode
        sys.path.insert(0, root_dir)
        os.chdir(root_dir)
    
    # Set environment variables for backend configuration
    os.environ["DATABASE_URL"] = "sqlite:///./buildwise.db"
    
    # 1. Initialize and Seed DB if it doesn't exist
    if not os.path.exists("buildwise.db"):
        print("Database 'buildwise.db' not found. Seeding initial data...")
        try:
            import importlib
            seed = importlib.import_module("seed")
            seed.seed_db()
        except Exception as e:
            print(f"Error seeding database: {e}")
    else:
        print("Database 'buildwise.db' detected.")

    # 2. Find a free port
    port = find_free_port()
    print(f"Starting Backend Server on port: {port}")

    # Import uvicorn locally to run in thread
    import uvicorn

    def start_server():
        # Run uvicorn server in background
        uvicorn.run("app.main:app", host="127.0.0.1", port=port, log_level="warning")

    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # 4. Wait for server to start accepting connections
    if not wait_for_server(port):
        print("Error: FastAPI backend server failed to start.")
        sys.exit(1)
    
    print("Backend server is running.")

    # 5. Launch the desktop browser window
    url = f"http://127.0.0.1:{port}"
    browser_process = launch_browser(url)

    # 6. Keep main thread alive until browser closes
    try:
        browser_process.wait()
    except KeyboardInterrupt:
        print("\nShutting down BuildWise AI application...")
    finally:
        print("Application closed. Goodbye!")

if __name__ == "__main__":
    main()
