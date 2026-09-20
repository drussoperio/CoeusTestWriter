@echo off
REM Pulls the latest version of Coeus Test Writer from GitHub (main branch).
REM Double-click this file instead of running the git command by hand.
cd /d "%~dp0"

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo This folder isn't a git repository, so it can't be updated with "git pull".
    echo This usually happens when the app was downloaded as a ZIP file instead of
    echo cloned with git. To fix it, delete this folder and re-download the app with:
    echo.
    echo     git clone https://github.com/drussoperio/CoeusTestWriter.git
    echo.
    pause >nul
    exit /b 1
)

echo Updating Coeus Test Writer...
git pull origin main
echo.
echo Done. Press any key to close this window.
pause >nul
