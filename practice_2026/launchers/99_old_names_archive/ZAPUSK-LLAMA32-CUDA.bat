@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
set IT_STALKER_LLM_MODEL=Llama-3.2-3B-Instruct-Q4_K_M.gguf
set IT_STALKER_LLM_GPU=cuda
set IT_STALKER_WHISPER_MODEL=ggml-medium.bin
set IT_STALKER_WHISPER_GPU=0
if not exist "%~dp0Llama-3.2-3B-Instruct-Q4_K_M.gguf" if not exist "%~dp0resources\llm\Llama-3.2-3B-Instruct-Q4_K_M.gguf" (
  echo Model file not found:
  echo   %~dp0Llama-3.2-3B-Instruct-Q4_K_M.gguf
  echo   %~dp0resources\llm\Llama-3.2-3B-Instruct-Q4_K_M.gguf
  echo Put the GGUF file into this folder or resources\llm and run this BAT again.
  pause
  exit /b 1
)
start "" "it-stalker-local.exe"