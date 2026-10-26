@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is required. Install Node.js, then run this launcher again.
    pause
    exit /b 1
)
pushd "%~dp0"
echo Starting Police N Thief Web...
echo Keep this window open while you play. Close it to stop the web server.
echo For a phone, use the Wi-Fi address printed below on the same network.
node tools/psx-serve.mjs --lan --open
if errorlevel 1 pause
popd
