@echo off
title Stop URL Video Download Server
echo ========================================================
echo     Stopping URL Video Download Background Server
echo ========================================================
echo.
set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    set FOUND=1
    echo Terminating process with PID: %%a ...
    taskkill /F /PID %%a >nul 2>&1
)

if %FOUND%==1 (
    echo.
    echo [SUCCESS] URL Video Download background server has been stopped.
) else (
    echo.
    echo [INFO] No URL Video Download server was found running on port 8000.
)
echo.
timeout /t 3
