@echo off
chcp 65001 >nul
echo ========================================
echo   AI Chat Agent - Windows Setup
echo ========================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Node.js is not installed!
    echo   Please download and install from: https://nodejs.org/
    pause
    exit /b 1
)
echo   [OK] Node.js found

echo.
echo [2/4] Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] npm is not found!
    echo   Please reinstall Node.js
    pause
    exit /b 1
)
echo   [OK] npm found

echo.
echo [3/4] Installing dependencies...
call npm install
if errorlevel 1 (
    echo   [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)
echo   [OK] Dependencies installed

echo.
echo [4/4] Setup completed!
echo ========================================
echo.
echo To start the application, run:
echo   npm start
echo.
echo Or use:
echo   npm run dev  (with auto-reload)
echo ========================================
echo.
pause
