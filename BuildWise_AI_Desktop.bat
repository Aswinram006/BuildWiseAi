@echo off
title BuildWise AI Desktop App Launcher
color 0B
echo ==========================================================
echo     BUILDWISE AI - ENTERPRISE SITE INTELLIGENCE PORTAL
echo ==========================================================
echo.
echo [1/3] Checking environment & synchronizing frontend assets...
python build_assets.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to build frontend assets.
    echo Please make sure Node.js and NPM are installed.
    pause
    exit /b %errorlevel%
)
echo.
echo [2/3] Starting backend services...
echo.
echo [3/3] Opening desktop window. Close the window to exit the app.
echo.
python run_desktop.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Desktop App crashed or failed to run.
    pause
    exit /b %errorlevel%
)
echo.
echo Application shut down successfully.
echo ==========================================================
exit /b 0
