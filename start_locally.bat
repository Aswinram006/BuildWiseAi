@echo off
title BuildWise AI - Local Services Manager
echo =======================================================
echo     BUILDWISE AI - ENTERPRISE SITE INTELLIGENCE
echo =======================================================
echo.
echo [1/3] Installing Python backend packages...
pip install fastapi uvicorn sqlalchemy passlib python-jose python-multipart scikit-learn pandas numpy opencv-python-headless reportlab
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python packages failed to install. Make sure Python is added to your environment variables.
    pause
    exit /b %errorlevel%
)
echo.
echo [2/3] Initializing and Seeding local SQLite database...
cd backend
python seed.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Seeding script failed to execute.
    pause
    exit /b %errorlevel%
)
echo.
echo [3/3] Launching BuildWise AI Web App...
echo.
echo === Connect to: http://127.0.0.1:8000 ===
echo.
python -m uvicorn app.main:app --port 8000
pause
