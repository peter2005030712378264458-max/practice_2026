@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
set IT_STALKER_LLM_MODEL=Qwen2.5-3B-Instruct-Q4_K_M.gguf
set IT_STALKER_LLM_GPU=cpu
set IT_STALKER_WHISPER_MODEL=ggml-medium.bin
set IT_STALKER_WHISPER_GPU=0
if not exist "%~dp0Qwen2.5-3B-Instruct-Q4_K_M.gguf" if not exist "%~dp0resources\llm\Qwen2.5-3B-Instruct-Q4_K_M.gguf" (
  echo LLM model file not found:
  echo   %~dp0Qwen2.5-3B-Instruct-Q4_K_M.gguf
  echo   %~dp0resources\llm\Qwen2.5-3B-Instruct-Q4_K_M.gguf
  pause
  exit /b 1
)
if not exist "%~dp0resources\whisper\ggml-medium.bin" (
  echo Whisper model file not found:
  echo   %~dp0resources\whisper\ggml-medium.bin
  pause
  exit /b 1
)
start "" "it-stalker-local.exe"