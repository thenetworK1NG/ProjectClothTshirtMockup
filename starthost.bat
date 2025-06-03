@echo off
echo Starting local web server...

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Python HTTP server...
    cd /d "%~dp0"
    start "" cmd /c "python -m http.server 8000"
    timeout /t 2 /nobreak > nul
    start http://localhost:8000
    goto :eof
)

:: Check if Python3 is installed
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Python3 HTTP server...
    cd /d "%~dp0"
    start "" cmd /c "python3 -m http.server 8000"
    timeout /t 2 /nobreak > nul
    start http://localhost:8000
    goto :eof
)

echo Error: Python is not installed.
echo Please install Python from https://www.python.org/downloads/
pause