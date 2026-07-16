/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const { pathToFileURL } = require('node:url');

let installed = false;
let active = false;
let disabledLogged = false;
const patchedWebContents = new WeakSet();
let ttsServerProcess = null;
let ttsServerReady = false;
let ttsServerNextId = 1;
const ttsServerPending = new Map();

function isEnabled() {
  return /^(1|true|yes|on)$/i.test(process.env.IT_STALKER_TTS_ENABLED || '');
}

function resourcePath(...parts) {
  return path.resolve(__dirname, '..', ...parts);
}

function defaultRunnerPath() {
  return resourcePath('tts', 'qwen3-tts-runner.ps1');
}

function defaultModelPath() {
  const candidates = [
    resourcePath('tts', 'models', 'Qwen3-TTS-12Hz-0.6B-CustomVoice'),
    resourcePath('tts', 'models', 'Qwen3-TTS-12Hz-1.7B-CustomVoice'),
    resourcePath('tts', 'models', 'Qwen3-TTS-12Hz-0.6B-Base'),
    resourcePath('tts', 'models', 'Qwen3-TTS'),
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) || candidates[0];
}

function getTtsAvailability() {
  const modelPath = process.env.IT_STALKER_TTS_MODEL || defaultModelPath();
  if (!fs.existsSync(modelPath)) {
    return { ok: false, error: `Модель озвучивания не найдена: ${modelPath}` };
  }
  if (!fs.existsSync(defaultPythonPath())) {
    return { ok: false, error: 'Озвучивание недоступно: не найдено Python-окружение Qwen3-TTS.' };
  }
  return { ok: true };
}

function extractAnswerText(rawText) {
  const source = String(rawText || '');
  const answerMatch = source.match(/(?:^|\n|\s)\*{0,2}Ответ\*{0,2}\s*[:：]\s*([\s\S]*?)(?=(?:\n|\s)\*{0,2}(?:Техника|ВОПРОС|Вопрос)\*{0,2}\s*[:：]|$)/i);
  return answerMatch?.[1] || source;
}

function truncateForSpeech(text) {
  const maxChars = Number(process.env.IT_STALKER_TTS_MAX_CHARS || 500);
  if (!Number.isFinite(maxChars) || maxChars <= 0 || text.length <= maxChars) return text;

  const sliced = text.slice(0, maxChars);
  const boundaries = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
  const boundary = Math.max(...boundaries.map(mark => sliced.lastIndexOf(mark)));
  if (boundary > maxChars * 0.45) return sliced.slice(0, boundary + 1).trim();

  return `${sliced.replace(/[,:;\-–—\s]+$/g, '').trim()}.`;
}

function cleanForSpeech(text) {
  const answerText = extractAnswerText(text);
  const cleaned = String(answerText || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/[*_~#]+/g, '')
    .replace(/\r?\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();

  return truncateForSpeech(cleaned);
}
function getOutputDir() {
  return process.env.IT_STALKER_TTS_OUTPUT_DIR || resourcePath('tts', 'output');
}

function writeTempText(text) {
  const dir = getOutputDir();
  fs.mkdirSync(dir, { recursive: true });
  const stamp = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(16).slice(2)}`;
  const inputFile = path.join(dir, `${stamp}.txt`);
  const outputFile = path.join(dir, `${stamp}.wav`);
  fs.writeFileSync(inputFile, text, 'utf8');
  return { inputFile, outputFile };
}
function defaultServerPath() {
  return resourcePath('tts', 'qwen3-tts-server.py');
}

function defaultPythonPath() {
  return resourcePath('tts', 'venv', 'Scripts', 'python.exe');
}

function shouldUsePersistentServer() {
  return process.env.IT_STALKER_TTS_SERVER !== '0' && fs.existsSync(defaultServerPath()) && fs.existsSync(defaultPythonPath());
}

function startTtsServer(log) {
  if (!shouldUsePersistentServer()) return null;
  if (ttsServerProcess && !ttsServerProcess.killed) return ttsServerProcess;

  const python = defaultPythonPath();
  const server = defaultServerPath();
  const args = [
    server,
    '--model', process.env.IT_STALKER_TTS_MODEL || defaultModelPath(),
    '--speaker', process.env.IT_STALKER_TTS_SPEAKER || process.env.IT_STALKER_TTS_VOICE || 'Ryan',
    '--language', process.env.IT_STALKER_TTS_LANGUAGE || 'Russian',
    '--device', process.env.IT_STALKER_TTS_DEVICE || 'auto',
  ];

  ttsServerReady = false;
  ttsServerProcess = spawn(python, args, {
    windowsHide: true,
    env: { ...process.env, PYTHONUTF8: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  log(`TTS server: starting (${process.env.IT_STALKER_TTS_DEVICE || 'auto'})`);

  const stdout = readline.createInterface({ input: ttsServerProcess.stdout });
  stdout.on('line', line => {
    const trimmed = String(line || '').trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('{')) {
      log(`TTS server: ${trimmed.slice(0, 300)}`);
      return;
    }

    try {
      const message = JSON.parse(trimmed);
      if (message.type === 'ready') {
        ttsServerReady = true;
        log(`TTS server: ready (${message.device})`);
        return;
      }

      const pending = ttsServerPending.get(message.id);
      if (!pending) return;
      ttsServerPending.delete(message.id);
      clearTimeout(pending.timer);

      if (message.ok) {
        pending.resolve(message);
      } else {
        pending.reject(new Error(message.error || 'unknown TTS server error'));
      }
    } catch (error) {
      log(`TTS server: bad response (${error.message})`);
    }
  });

  ttsServerProcess.stderr.on('data', chunk => {
    const text = chunk.toString('utf8').trim();
    if (text) log(`TTS server stderr: ${text.slice(0, 500)}`);
  });

  ttsServerProcess.on('exit', code => {
    log(`TTS server: exited (${code})`);
    ttsServerProcess = null;
    ttsServerReady = false;
    for (const [id, pending] of ttsServerPending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(`TTS server exited before request ${id} completed`));
    }
    ttsServerPending.clear();
  });

  ttsServerProcess.on('error', error => {
    log(`TTS server: failed (${error.message})`);
  });

  return ttsServerProcess;
}

function runServerRequest(inputFile, outputFile, log) {
  const server = startTtsServer(log);
  if (!server?.stdin || server.stdin.destroyed) {
    return Promise.reject(new Error('TTS server is not available'));
  }

  return new Promise((resolve, reject) => {
    const id = ttsServerNextId++;
    const timeoutMs = Number(process.env.IT_STALKER_TTS_TIMEOUT_MS || 300000);
    const timer = setTimeout(() => {
      ttsServerPending.delete(id);
      reject(new Error(`server timeout after ${timeoutMs} ms`));
    }, timeoutMs);

    ttsServerPending.set(id, { resolve, reject, timer });
    server.stdin.write(`${JSON.stringify({
      id,
      input: inputFile,
      output: outputFile,
      speaker: process.env.IT_STALKER_TTS_SPEAKER || process.env.IT_STALKER_TTS_VOICE || 'Ryan',
      language: process.env.IT_STALKER_TTS_LANGUAGE || 'Russian',
      instruct: process.env.IT_STALKER_TTS_INSTRUCT || '',
    })}\n`, 'utf8', error => {
      if (error) {
        ttsServerPending.delete(id);
        clearTimeout(timer);
        reject(error);
      }
    });
  });
}


function buildCommand(runner, inputFile, outputFile) {
  const modelPath = process.env.IT_STALKER_TTS_MODEL || defaultModelPath();
  const voice = process.env.IT_STALKER_TTS_VOICE || '';
  const ext = path.extname(runner).toLowerCase();

  if (ext === '.ps1') {
    const args = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      runner,
      '-InputTextFile',
      inputFile,
      '-OutputAudioFile',
      outputFile,
      '-ModelPath',
      modelPath,
    ];
    if (voice) args.push('-Voice', voice);
    return { command: 'powershell.exe', args };
  }

  if (ext === '.bat' || ext === '.cmd') {
    return { command: 'cmd.exe', args: ['/d', '/s', '/c', runner, inputFile, outputFile, modelPath, voice] };
  }

  return { command: runner, args: [inputFile, outputFile, modelPath, voice].filter(Boolean) };
}

function runRunner(runner, inputFile, outputFile, log) {
  if (shouldUsePersistentServer()) {
    return runServerRequest(inputFile, outputFile, log);
  }

  return new Promise((resolve, reject) => {
    const { command, args } = buildCommand(runner, inputFile, outputFile);
    const timeoutMs = Number(process.env.IT_STALKER_TTS_TIMEOUT_MS || 300000);
    const child = spawn(command, args, {
      windowsHide: true,
      env: {
        ...process.env,
        IT_STALKER_TTS_INPUT_TEXT: inputFile,
        IT_STALKER_TTS_OUTPUT_AUDIO: outputFile,
      },
    });

    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timeout after ${timeoutMs} ms`));
    }, timeoutMs);

    child.stderr?.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('exit', code => {
      clearTimeout(timer);
      if (code === 0 && fs.existsSync(outputFile)) {
        resolve();
        return;
      }
      const details = stderr.trim() ? `: ${stderr.trim().slice(0, 500)}` : '';
      reject(new Error(`runner exited with code ${code}${details}`));
    });
  });
}

function quotePowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function playAudioWithWindows(audioFile, log) {
  if (process.platform !== 'win32') return;
  const command = `$player = New-Object System.Media.SoundPlayer ${quotePowerShellString(audioFile)}; $player.PlaySync()`;
  try {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      windowsHide: true,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    log('TTS: playback started');
  } catch (error) {
    log(`TTS: Windows playback failed (${error.message})`);
  }
}

function playAudio(webContents, audioFile, log) {
  playAudioWithWindows(audioFile, log);

  if (!webContents || webContents.isDestroyed?.()) return;
  const audioUrl = pathToFileURL(audioFile).href;
  const script = `(() => {\n` +
    `  const previous = window.__itStalkerTtsAudio;\n` +
    `  if (previous) { try { previous.pause(); } catch (_) {} }\n` +
    `  const audio = new Audio(${JSON.stringify(audioUrl)});\n` +
    `  window.__itStalkerTtsAudio = audio;\n` +
    `  audio.volume = 1;\n` +
    `  audio.play().catch(error => console.error('TTS playback failed', error));\n` +
    `})();`;

  webContents.executeJavaScript(script, true).catch(error => {
    log(`TTS: renderer playback failed (${error.message})`);
  });
}

async function synthesizeAndPlay(content, webContents, log, manual = false) {
  if (!manual && !isEnabled()) {
    if (!disabledLogged && process.env.IT_STALKER_TTS_LOG_DISABLED === '1') {
      disabledLogged = true;
      log('TTS: disabled');
    }
    return;
  }

  if (active) {
    log('TTS: previous synthesis is still running, skipping new answer');
    return { ok: false, error: 'Предыдущая генерация аудио ещё выполняется.' };
  }

  const availability = getTtsAvailability();
  if (!availability.ok) {
    log(`TTS: ${availability.error}`);
    return availability;
  }

  const runner = process.env.IT_STALKER_TTS_COMMAND || defaultRunnerPath();
  if (!fs.existsSync(runner)) {
    log(`TTS: runner not found: ${runner}`);
    return { ok: false, error: 'Не найден скрипт генерации аудио.' };
  }

  const text = cleanForSpeech(content);
  if (!text) return { ok: false, error: 'В ответе нет текста для озвучивания.' };

  active = true;
  const { inputFile, outputFile } = writeTempText(text);
  log(`TTS: synthesis started (${text.length} chars)`);

  try {
    await runRunner(runner, inputFile, outputFile, log);
    log(`TTS: audio ready (${outputFile})`);
    playAudio(webContents, outputFile, log);
    return { ok: true };
  } catch (error) {
    log(`TTS: synthesis failed (${error.message})`);
    return { ok: false, error: `Не удалось создать аудио: ${error.message}` };
  } finally {
    active = false;
    try { fs.unlinkSync(inputFile); } catch { /* ignore cleanup */ }
  }
}

const manualTtsScript = `(() => {
  if (window.__itStalkerTtsButtonsInstalled) return;
  window.__itStalkerTtsButtonsInstalled = true;
  const addButtons = () => document.querySelectorAll('.insight-card:not(.streaming)').forEach(card => {
    if (card.querySelector('.tts-answer-btn')) return;
    const answer = card.querySelector('.insight-summary, .insight-deep')?.innerText.trim();
    if (!answer) return;
    card.style.position = 'relative';
    const button = document.createElement('button');
    button.className = 'tts-answer-btn';
    button.type = 'button';
    button.title = 'Озвучить этот ответ';
    button.setAttribute('aria-label', 'Озвучить этот ответ');
    button.textContent = '🔊';
    Object.assign(button.style, {
      position: 'absolute', top: '10px', right: '10px', border: '0', borderRadius: '7px',
      padding: '5px 7px', cursor: 'pointer', background: 'rgba(255,255,255,.1)', color: '#e8eaed'
    });
    button.addEventListener('click', async () => {
      const text = card.querySelector('.insight-summary, .insight-deep')?.innerText.trim();
      if (!text) return;
      button.disabled = true;
      button.textContent = '…';
      const result = await window.ghostAPI.synthesizeTts(text);
      button.disabled = false;
      button.textContent = '🔊';
      if (!result?.ok) window.alert(result?.error || 'Не удалось создать аудио.');
    });
    card.append(button);
  });
  new MutationObserver(addButtons).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  addButtons();
})();`;

function patchWebContents(webContents, log) {
  if (!webContents || patchedWebContents.has(webContents)) return;

  const originalSend = webContents.send.bind(webContents);
  patchedWebContents.add(webContents);
  webContents.send = function patchedSend(channel, payload, ...rest) {
    try {
      if (channel === 'ghost:insight-stream' && payload?.type === 'end' && payload?.content) {
        synthesizeAndPlay(payload.content, webContents, log);
      }
    } catch (error) {
      log(`TTS: hook failed (${error.message})`);
    }
    return originalSend(channel, payload, ...rest);
  };
  webContents.on('did-finish-load', () => {
    webContents.executeJavaScript(manualTtsScript, true).catch(error => log(`TTS: button install failed (${error.message})`));
  });
  log('TTS: webContents patched');
}

function patchWindow(window, log) {
  patchWebContents(window?.webContents, log);
}

function install(electron, log = () => {}) {
  if (installed) return;
  installed = true;

  electron.ipcMain.handle('ghost:synthesize-tts', async (event, content) =>
    synthesizeAndPlay(content, event.sender, log, true));

  const OriginalBrowserWindow = electron.BrowserWindow;
  if (!OriginalBrowserWindow) {
    log('TTS: BrowserWindow is not available');
    return;
  }

  try {
    electron.app?.on?.('browser-window-created', (_event, window) => patchWindow(window, log));
    electron.app?.on?.('web-contents-created', (_event, webContents) => patchWebContents(webContents, log));
  } catch (error) {
    log(`TTS: app event hook failed (${error.message})`);
  }

  function TtsBrowserWindow(options) {
    const window = new OriginalBrowserWindow(options);
    try {
      patchWindow(window, log);
    } catch (error) {
      log(`TTS: window patch failed (${error.message})`);
    }
    return window;
  }

  Object.setPrototypeOf(TtsBrowserWindow, OriginalBrowserWindow);
  TtsBrowserWindow.prototype = OriginalBrowserWindow.prototype;

  try {
    electron.BrowserWindow = TtsBrowserWindow;
    log('TTS: bridge installed');
  } catch (error) {
    log(`TTS: bridge install failed (${error.message})`);
  }
}
module.exports = { install };
