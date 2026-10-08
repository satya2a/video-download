@echo off
title URL Video Download Launcher
cd /d "%~dp0"

:menu
cls
echo ========================================================
echo       URL Video Download - Universal Downloader
echo   Instagram (Reels/Stories) ^| YouTube 4K ^| Facebook ^| More
echo ========================================================
echo.
echo Choose how you want to run the application:
echo.
echo  [1] Standard Mode  (Runs in this window with live logs)
echo  [2] Silent Background Mode (Runs quietly in background, no black window)
echo  [3] Stop Background Server
echo  [4] Open URL Video Download in Browser (http://localhost:8000)
echo  [5] Exit
echo.
set /p choice="Enter choice (1-5) [Default is 1]: "

if "%choice%"=="" set choice=1
if "%choice%"=="1" goto run_standard
if "%choice%"=="2" goto run_background
if "%choice%"=="3" goto stop_server
if "%choice%"=="4" goto open_browser
if "%choice%"=="5" goto exit_app

:run_standard
echo.
echo Starting server in Standard Mode...
python app.py
pause
goto menu

:run_background
echo.
echo Starting server silently in the background...
wscript.exe start_background.vbs
echo URL Video Download is now running in the background!
echo Opening browser...
timeout /t 2 >nul
start http://localhost:8000
echo.
echo [NOTE] You can close this window now. The app will keep running.
echo To stop it later, run choice 3 or stop_background.bat.
pause
goto menu

:stop_server
call stop_background.bat
goto menu

:open_browser
start http://localhost:8000
goto menu

:exit_app
exit
