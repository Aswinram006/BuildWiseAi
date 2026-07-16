import os
import shutil
import subprocess
import sys

def run_command(command, cwd):
    print(f"Running command: {command} in {cwd}")
    # Run with shell=True on Windows to support npm/npx commands
    result = subprocess.run(command, cwd=cwd, shell=True)
    if result.returncode != 0:
        print(f"Error running command: {command}")
        sys.exit(result.returncode)

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    backend_static_dir = os.path.join(root_dir, "backend", "app", "static")
    backend_assets_dir = os.path.join(backend_static_dir, "assets")

    print("=== STEP 1: Installing frontend dependencies ===")
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        run_command("npm install", frontend_dir)
    else:
        print("node_modules already exists. Skipping npm install.")

    print("\n=== STEP 2: Building frontend React app ===")
    run_command("npm run build", frontend_dir)

    print("\n=== STEP 3: Syncing assets to backend static folder ===")
    # Ensure static directory exists
    os.makedirs(backend_static_dir, exist_ok=True)
    
    # Remove old assets
    if os.path.exists(backend_assets_dir):
        print(f"Cleaning old assets: {backend_assets_dir}")
        shutil.rmtree(backend_assets_dir)
    os.makedirs(backend_assets_dir, exist_ok=True)

    dist_dir = os.path.join(frontend_dir, "dist")
    dist_assets_dir = os.path.join(dist_dir, "assets")

    # Copy assets
    if os.path.exists(dist_assets_dir):
        print(f"Copying assets from {dist_assets_dir} to {backend_assets_dir}")
        for item in os.listdir(dist_assets_dir):
            s = os.path.join(dist_assets_dir, item)
            d = os.path.join(backend_assets_dir, item)
            if os.path.isdir(s):
                shutil.copytree(s, d)
            else:
                shutil.copy2(s, d)

    # Copy index.html
    src_index = os.path.join(dist_dir, "index.html")
    dest_index = os.path.join(backend_static_dir, "index.html")
    print(f"Copying index.html from {src_index} to {dest_index}")
    shutil.copy2(src_index, dest_index)

    print("\n=== Frontend assets synchronized successfully! ===")

if __name__ == "__main__":
    main()
