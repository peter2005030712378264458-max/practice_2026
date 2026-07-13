@echo off
setlocal
set "APP_DIR=%~dp0..\.."
cd /d "%APP_DIR%"
set ELECTRON_RUN_AS_NODE=
set IT_STALKER_LLM_MODEL=Llama-3.2-3B-Instruct-Q4_K_M.gguf
set IT_STALKER_LLM_GPU=cpu
set IT_STALKER_WHISPER_MODEL=ggml-small.bin
set IT_STALKER_WHISPER_GPU=0

echo Starting IT Stalker Local
echo LLM: Llama 3.2 3B [cpu]
echo Whisper: Whisper small [cpu]
echo.

if not exist "%APP_DIR%\%IT_STALKER_LLM_MODEL%" if not exist "%APP_DIR%\resources\llm\%IT_STALKER_LLM_MODEL%" (
  echo LLM model file not found:
  echo   %APP_DIR%\%IT_STALKER_LLM_MODEL%
  echo   %APP_DIR%\resources\llm\%IT_STALKER_LLM_MODEL%
  pause
  exit /b 1
)

if not exist "%APP_DIR%\resources\whisper\%IT_STALKER_WHISPER_MODEL%" (
  echo Whisper model file not found:
  echo   %APP_DIR%\resources\whisper\%IT_STALKER_WHISPER_MODEL%
  pause
  exit /b 1
)

start "" "%APP_DIR%\it-stalker-local.exe"
endlocal