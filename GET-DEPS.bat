@echo off
chcp 65001 >nul
setlocal

set "APP_DIR=%~dp0"
set "APP_NODE_DIR=%APP_DIR%resources\app"
set "NODE_MODULES=%APP_NODE_DIR%\node_modules"

if exist "%NODE_MODULES%\whisper-cpp-node" if exist "%NODE_MODULES%\node-llama-cpp" (
  echo Runtime dependencies already exist.
  pause
  exit /b 0
)

if not exist "%APP_NODE_DIR%\package.json" (
  echo package.json was not found:
  echo %APP_NODE_DIR%\package.json
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not installed.
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

echo Installing runtime Node.js dependencies...
echo Folder: %APP_NODE_DIR%
echo.

pushd "%APP_NODE_DIR%"
if exist package-lock.json (
  call npm ci --omit=dev --no-audit
) else (
  call npm install --omit=dev --no-audit
)
set "NPM_EXIT=%ERRORLEVEL%"
popd

if not "%NPM_EXIT%"=="0" (
  echo.
  echo npm dependency restore failed.
  echo If native modules fail to build, install Visual Studio Build Tools and try again.
  pause
  exit /b %NPM_EXIT%
)

if exist "%NODE_MODULES%\whisper-cpp-node" if exist "%NODE_MODULES%\node-llama-cpp" (
  echo.
  echo Done. Runtime dependencies are ready.
  pause
  exit /b 0
)

echo.
echo Dependencies were installed, but required modules were not found.
echo Expected:
echo %NODE_MODULES%\whisper-cpp-node
echo %NODE_MODULES%\node-llama-cpp
pause
exit /b 1