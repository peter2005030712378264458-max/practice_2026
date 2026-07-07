@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
set IT_STALKER_LLM_GPU=cuda
set PATH=%~dp0resources\app\node_modules\@node-llama-cpp\win-x64-cuda\bins\win-x64-cuda;%~dp0resources\app\node_modules\@node-llama-cpp\win-x64-cuda-ext\bins\win-x64-cuda\fallback;%PATH%
start "" "it-stalker-local.exe"

