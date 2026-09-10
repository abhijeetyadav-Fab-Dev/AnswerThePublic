@echo off
title AnswerThePublic Enterprise Suite
cd /d "%~dp0"
echo ===================================================================
echo   AnswerThePublic Enterprise Suite & Keyword Intelligence Engine
echo ===================================================================
echo Starting local server on http://localhost:3500 ...
echo Press Ctrl+C to stop the server at any time.
echo.

if not exist node_modules (
    echo [INFO] Installing required dependencies...
    call npm install
)

start "" "http://localhost:3500"
node server.js
pause
