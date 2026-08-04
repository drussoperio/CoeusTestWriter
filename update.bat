@echo off
REM Pulls the latest version of Coeus Test Writer from GitHub (main branch).
REM Double-click this file instead of running the git command by hand.
cd /d "%~dp0"
echo Updating Coeus Test Writer...
git pull origin main
echo.
echo Done. Press any key to close this window.
pause >nul
