/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { app } = require('electron');

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

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('no-sandbox');
}

require('./.webpack/main/index.js');
