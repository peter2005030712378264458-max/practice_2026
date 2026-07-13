@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
set IT_STALKER_LLM_MODEL=Qwen3-4B-Instruct-2507-Q4_K_M.gguf
set IT_STALKER_LLM_GPU=cuda
set IT_STALKER_WHISPER_MODEL=ggml-small.bin
set IT_STALKER_WHISPER_GPU=0
if not exist "%~dp0Qwen3-4B-Instruct-2507-Q4_K_M.gguf" if not exist "%~dp0resources\llm\Qwen3-4B-Instruct-2507-Q4_K_M.gguf" (
  echo LLM model file not found:
  echo   %~dp0Qwen3-4B-Instruct-2507-Q4_K_M.gguf
  echo   %~dp0resources\llm\Qwen3-4B-Instruct-2507-Q4_K_M.gguf
  pause
  exit /b 1
)
if not exist "%~dp0resources\whisper\ggml-small.bin" (
  echo Whisper model file not found:
  echo   %~dp0resources\whisper\ggml-small.bin
  pause
  exit /b 1
)
start "" "it-stalker-local.exe"