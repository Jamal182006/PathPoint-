@echo off
setlocal

cd /d "%~dp0"

REM Stop any running backend process for this project
for /f "tokens=2" %%p in ('tasklist /nh /fo csv /fi "IMAGENAME eq node.exe" ^| findstr /i "node.exe"') do (
    taskkill /PID %%p /F >nul 2>&1
)

REM Start backend with the project environment
cd backend
start "PathPoint Backend" cmd /k "npm start"

echo Backend restarted.
endlocal
