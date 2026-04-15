@echo off
setlocal enabledelayedexpansion

:: =====================================================================
:: WAREHOUSE INVENTORY — INTEGRATED STARTUP SCRIPT
:: =====================================================================
:: Menjalankan seluruh ekosistem: DB Sync, Backend, Frontend, & Studio.
:: =====================================================================

title WAREHOUSE SYSTEM — INITIALIZING...
color 0b
cls

echo.
echo  =============================================================
echo    WAREHOUSE INVENTORY SYSTEM — STARTUP SEQUENCE
echo  =============================================================
echo.

:: [0/4] Menjalankan PostgreSQL Database
echo [0/4] Starting PostgreSQL Database...

:: Check if postgres is already running
"C:\pgsql\bin\pg_ctl.exe" -D "C:\pgsql\data" status >nul 2>&1
if %errorlevel% neq 0 (
    echo - Stale PID detection...
    if exist "C:\pgsql\data\postmaster.pid" (
        echo [WARNING] Stale postmaster.pid found. Cleaning up...
        del /f /q "C:\pgsql\data\postmaster.pid"
    )
    echo - Launching PostgreSQL...
    "C:\pgsql\bin\pg_ctl.exe" -D "C:\pgsql\data" start 2>nul
    
    :: Wait for DB to be ready (up to 10 seconds)
    echo - Waiting for database to initialize...
    ping -n 6 127.0.0.1 >nul
) else (
    echo - PostgreSQL is already running.
)
echo OK.
echo.

:: [1/4] Mencari file .env dan Konfigurasi
echo [1/4] Checking Environment Configuration...
cd /d "D:\Coding\Wherehouse Inventory"
if not exist ".env" (
    echo [ERROR] Root .env file not found!
    pause
    exit /b
)
echo OK.
echo.

:: [2/4] Sinkronisasi Schema Database (Running from Root)
echo [2/4] Synchronizing Database Schema ^(Prisma^)...

echo - Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma Generate failed!
    pause
    exit /b
)

:: We only push without --accept-data-loss for daily starts.
echo - Checking Schema Sync...
call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    echo [WARNING] Schema change detected or Sync failed.
    echo Pelaksanaan pemulihan...
)

:: Automate Seeding if database is new/empty
echo - Populating Default Data (if empty)...
cd /d "D:\Coding\Wherehouse Inventory\backend"
node -e "import prisma from './src/lib/prisma.js'; async function main(){ const count = await prisma.floor.count(); if(count === 0) { console.log('DB Empty. Seeding starting...'); } else { process.exit(0); } } main().catch(() => process.exit(1));" >nul 2>&1
if %errorlevel% equ 0 (
    echo - Re-seeding Warehouse Layout...
    node src/seeds/seed-modern.js
)
echo OK.
echo.

:: [3/4] Menjalankan Backend API
echo [3/4] Starting Backend API (port 3001)...
start "WAREHOUSE-BACKEND" /d "D:\Coding\Wherehouse Inventory\backend" cmd /c "npm run dev"
ping -n 4 127.0.0.1 >nul
echo OK.
echo.

:: [4/4] Menjalankan Frontend
echo [4/4] Starting Frontend (port 5173)...
start "WAREHOUSE-FRONTEND" /d "D:\Coding\Wherehouse Inventory\frontend" cmd /c "npm run dev"
ping -n 4 127.0.0.1 >nul
echo OK.
echo.

:: [Bonus] Menjalankan Layanan Tambahan (Background)
echo [Bonus] Starting Prisma Studio (port 49152)...
start "WAREHOUSE-STUDIO" /d "D:\Coding\Wherehouse Inventory" cmd /c "npx prisma studio --port 49152 --browser none"
ping -n 2 127.0.0.1 >nul

echo [Bonus] Starting Localtunnel for Mobile Camera...
start "WAREHOUSE-TUNNEL" /d "D:\Coding\Wherehouse Inventory\backend" cmd /c "npx lt --port 3001 --subdomain warehouse-api-192"
ping -n 2 127.0.0.1 >nul

echo.
echo =============================================================
echo   SYSTEM LAUNCHED SUCCESSFULLY!
echo =============================================================
echo   Frontend  : http://127.0.0.1:5173
echo   Backend   : http://127.0.0.1:3001
echo   Database  : http://127.0.0.1:49152 (Studio)
echo =============================================================
echo.
echo Anda dapat menutup jendela ini. Layanan tetap berjalan di background.
echo.
pause
