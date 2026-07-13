@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
set IT_STALKER_LLM_MODEL=Qwen3.5-9B-Q4_K_M.gguf
set IT_STALKER_LLM_GPU=cpu
set IT_STALKER_WHISPER_MODEL=ggml-medium.bin
set IT_STALKER_WHISPER_GPU=0
if not exist "%~dp0Qwen3.5-9B-Q4_K_M.gguf" if not exist "%~dp0resources\llm\Qwen3.5-9B-Q4_K_M.gguf" (
  echo Model file not found:
  echo   %~dp0Qwen3.5-9B-Q4_K_M.gguf
  echo   %~dp0resources\llm\Qwen3.5-9B-Q4_K_M.gguf
  echo Put the GGUF file into this folder or resources\llm and run this BAT again.
  pause
  exit /b 1
)
start "" "it-stalker-local.exe"