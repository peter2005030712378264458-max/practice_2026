const assert = require('node:assert/strict');
const { install } = require('./tts-bridge');

const handlers = new Map();
const listeners = new Map();

install({
  ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
  app: { on: (event, handler) => listeners.set(event, handler) },
  BrowserWindow: class BrowserWindow {},
});

assert.equal(typeof handlers.get('ghost:synthesize-tts'), 'function');
assert.equal(typeof listeners.get('web-contents-created'), 'function');
console.log('TTS bridge manual endpoint is installed.');
