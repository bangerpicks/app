@echo off
echo Starting Footy Predictor Server...
echo.

REM Change to the directory where this batch file is located
cd /d "%~dp0"

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Failed to install dependencies!
        pause
        exit /b 1
    )
    echo Dependencies installed successfully!
    echo.
)

REM Start the server
echo Starting server on http://localhost:3000...
echo Press Ctrl+C to stop the server
echo.
npm start

REM If we get here, the server has stopped
echo.
echo Server stopped.
pause
