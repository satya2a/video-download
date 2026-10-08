@echo off
title Create Desktop Shortcut
cd /d "%~dp0"
echo Creating Desktop Shortcut for URL Video Download...
python create_shortcut.py
echo.
pause
