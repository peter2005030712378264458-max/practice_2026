/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const electron = require('electron');
const { app } = electron;
const ttsBridge = require('./tts-bridge');

const MODEL_PRESETS = {
  'cpu-medium': ['Qwen2.5-3B-Instruct-Q4_K_M.gguf', 'cpu', 'ggml-medium.bin'],
  'cpu-small': ['Qwen2.5-3B-Instruct-Q4_K_M.gguf', 'cpu', 'ggml-small.bin'],
  'gpu-medium': ['Qwen3-4B-Instruct-2507-Q4_K_M.gguf', 'cuda', 'ggml-medium.bin'],
  'gpu-small': ['Qwen3-4B-Instruct-2507-Q4_K_M.gguf', 'cuda', 'ggml-small.bin'],
};

function bootLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  for (const logFile of [
    path.join(os.homedir(), 'it-stalker-debug.log'),
    path.join(path.dirname(process.execPath), 'it-stalker-debug.log'),
  ]) {
    try {
      fs.appendFileSync(logFile, line, 'utf8');
    } catch {
      // ignore logging failures
    }
  }
}

bootLog('electron-main: starting');
ttsBridge.install(electron, bootLog);

function applyModelPreset() {
  const fallback = `${process.env.IT_STALKER_LLM_GPU?.toLowerCase() === 'cuda' ? 'gpu' : 'cpu'}-${process.env.IT_STALKER_WHISPER_MODEL === 'ggml-small.bin' ? 'small' : 'medium'}`;
  const forcedPreset = process.env.IT_STALKER_MODEL_PRESET;
  const launcherProvidedModel = Boolean(
    process.env.IT_STALKER_LLM_MODEL ||
    process.env.IT_STALKER_LLM_GPU ||
    process.env.IT_STALKER_WHISPER_MODEL
  );

  if (MODEL_PRESETS[forcedPreset]) {
    const preset = MODEL_PRESETS[forcedPreset];
    process.env.IT_STALKER_MODEL_PRESET = forcedPreset;
    process.env.IT_STALKER_LLM_MODEL = preset[0];
    process.env.IT_STALKER_LLM_GPU = preset[1];
    process.env.IT_STALKER_WHISPER_MODEL = preset[2];
    process.env.IT_STALKER_WHISPER_GPU = '0';
    bootLog(`Model preset: ${process.env.IT_STALKER_MODEL_PRESET}`);
    return;
  }

  if (launcherProvidedModel) {
    process.env.IT_STALKER_MODEL_PRESET = fallback;
    process.env.IT_STALKER_LLM_GPU = process.env.IT_STALKER_LLM_GPU || (fallback.startsWith('gpu') ? 'cuda' : 'cpu');
    process.env.IT_STALKER_WHISPER_MODEL = process.env.IT_STALKER_WHISPER_MODEL || (fallback.endsWith('small') ? 'ggml-small.bin' : 'ggml-medium.bin');
    process.env.IT_STALKER_WHISPER_GPU = process.env.IT_STALKER_WHISPER_GPU || '0';
    bootLog(`Model preset: ${process.env.IT_STALKER_MODEL_PRESET} (launcher env)`);
    bootLog(`Launcher LLM: ${process.env.IT_STALKER_LLM_MODEL || '<not set>'} (${process.env.IT_STALKER_LLM_GPU})`);
    bootLog(`Launcher Whisper: ${process.env.IT_STALKER_WHISPER_MODEL}`);
    return;
  }

  let selected = fallback;
  try {
    selected = JSON.parse(
      fs.readFileSync(path.join(app.getPath('userData'), 'config.json'), 'utf8'),
    ).modelPreset || fallback;
  } catch {
    // First launch: use CPU medium when there is no BAT-selected environment.
  }

  const preset = MODEL_PRESETS[selected] || MODEL_PRESETS[fallback];
  process.env.IT_STALKER_MODEL_PRESET = MODEL_PRESETS[selected] ? selected : fallback;
  process.env.IT_STALKER_LLM_MODEL = preset[0];
  process.env.IT_STALKER_LLM_GPU = preset[1];
  process.env.IT_STALKER_WHISPER_MODEL = preset[2];
  process.env.IT_STALKER_WHISPER_GPU = '0';
  bootLog(`Model preset: ${process.env.IT_STALKER_MODEL_PRESET}`);
}
applyModelPreset();

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('no-sandbox');
}

require('./.webpack/main/index.js');
