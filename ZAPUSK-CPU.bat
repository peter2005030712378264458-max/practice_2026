@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
set IT_STALKER_LLM_GPU=cpu
start "" "it-stalker-local.exe"

