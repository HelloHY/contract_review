@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo   Contract Review Platform - One-click Start
echo ============================================================
echo.

REM ---------- 0. Check Docker ----------
where docker >nul 2>nul
if errorlevel 1 (
    echo [ERROR] docker not found. Please install and start Docker Desktop.
    echo.
    pause
    exit /b 1
)

REM ---------- 1. Infrastructure ----------
echo [1/5] Starting infrastructure: PostgreSQL / Milvus / RustFS / OnlyOffice ...
docker compose up -d
if errorlevel 1 (
    echo [ERROR] "docker compose up" failed. Make sure Docker Desktop is running.
    echo.
    pause
    exit /b 1
)

REM ---------- 2. Wait for PostgreSQL ----------
echo [2/5] Waiting for PostgreSQL to be ready ...
set /a _try=0
:waitpg
docker exec contract-review-postgres pg_isready -U contract_review -d contract_review >nul 2>nul
if not errorlevel 1 goto pgok
set /a _try+=1
if !_try! geq 30 (
    echo       [WARN] Timed out waiting for PostgreSQL, starting apps anyway.
    goto apps
)
timeout /t 2 /nobreak >nul
goto waitpg
:pgok
echo       PostgreSQL is ready.

:apps
REM ---------- Install dependencies if missing ----------
if not exist "%~dp0backend\node_modules" (
    echo [INFO] Installing backend dependencies ...
    pushd "%~dp0backend"
    call npm install
    popd
)
if not exist "%~dp0frontend\node_modules" (
    echo [INFO] Installing frontend dependencies ...
    pushd "%~dp0frontend"
    call npm install
    popd
)

REM ---------- 3. Backend ----------
echo [3/5] Starting backend in a new window (http://localhost:3000) ...
start "contract-review-backend" /D "%~dp0backend" cmd /k "npm run dev"

REM ---------- 4. Frontend ----------
echo [4/5] Starting frontend in a new window (http://localhost:8080, browser opens automatically) ...
start "contract-review-frontend" /D "%~dp0frontend" cmd /k "npm run dev"

echo [5/5] Done.
echo.
echo ============================================================
echo   Web UI : http://localhost:8080   (login: admin / admin123)
echo   API    : http://localhost:3000
echo ============================================================
echo.
echo Monitoring logs (backend, rotated daily) are under backend\logs\ :
echo   app-YYYY-MM-DD.log          normal runtime log
echo   error-YYYY-MM-DD.log        error log
echo   performance-YYYY-MM-DD.log  performance / timing log
echo.
echo Follow a log live (run in a new terminal):
echo   Get-Content backend\logs\app-*.log -Wait -Tail 50
echo   Get-Content backend\logs\error-*.log -Wait -Tail 50
echo   Get-Content backend\logs\performance-*.log -Wait -Tail 50
echo.
echo Docker service logs: docker compose logs -f postgres milvus
echo.
pause
