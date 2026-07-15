@echo off
setlocal
set "APP_DIR=%~dp0..\.."
cd /d "%APP_DIR%"
set ELECTRON_RUN_AS_NODE=
set IT_STALKER_MODEL_PRESET=gpu-small
set IT_STALKER_LLM_MODEL=Qwen3-4B-Instruct-2507-Q4_K_M.gguf
set IT_STALKER_LLM_GPU=cuda
set IT_STALKER_WHISPER_MODEL=ggml-small.bin
set IT_STALKER_WHISPER_GPU=0
set IT_STALKER_TTS_ENABLED=1
set IT_STALKER_TTS_MODEL=%APP_DIR%\resources\tts\models\Qwen3-TTS-12Hz-0.6B-CustomVoice
set IT_STALKER_TTS_SPEAKER=Ryan
set IT_STALKER_TTS_LANGUAGE=Russian
set IT_STALKER_TTS_TIMEOUT_MS=300000
set IT_STALKER_TTS_MAX_CHARS=500
set IT_STALKER_TTS_DEVICE=cuda:0
set IT_STALKER_TTS_SERVER=1


echo Starting IT Stalker Local with Qwen3-TTS
echo LLM: Qwen3 4B Instruct [cuda]
echo Whisper: Whisper small [cpu]
echo TTS: Qwen3-TTS 0.6B CustomVoice [auto]
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

if not exist "%APP_DIR%\resources\tts\venv\Scripts\python.exe" (
  echo Qwen3-TTS Python venv not found:
  echo   %APP_DIR%\resources\tts\venv\Scripts\python.exe
  pause
  exit /b 1
)

if not exist "%IT_STALKER_TTS_MODEL%\model.safetensors" (
  echo Qwen3-TTS model not found:
  echo   %IT_STALKER_TTS_MODEL%
  pause
  exit /b 1
)

start "" "%APP_DIR%\it-stalker-local.exe"
endlocal