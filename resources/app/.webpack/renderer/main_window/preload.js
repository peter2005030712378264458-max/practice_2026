(() => {
  'use strict';
  const { contextBridge, ipcRenderer } = require('electron');

  contextBridge.exposeInMainWorld('ghostAPI', {
    getConfig: () => ipcRenderer.invoke('ghost:get-config'),
    setConfig: config => ipcRenderer.invoke('ghost:set-config', config),
    getStatus: () => ipcRenderer.invoke('ghost:get-status'),
    requestScreenPermission: () => ipcRenderer.invoke('ghost:request-screen-permission'),
    openScreenRecordingSettings: () => ipcRenderer.invoke('ghost:open-screen-settings'),
    sendMicPcmChunk: chunk => ipcRenderer.send('ghost:pcm-chunk-mic', chunk),
    sendSystemPcmChunk: chunk => ipcRenderer.send('ghost:pcm-chunk-system', chunk),
    setCaptureActive: active => ipcRenderer.send('ghost:capture-active', active),
    onTranscript: callback => listen('ghost:transcript', callback),
    onTranscribing: callback => listen('ghost:transcribing', callback),
    processTranscript: text => ipcRenderer.invoke('ghost:process-transcript', text),
    resetSession: () => ipcRenderer.invoke('ghost:reset-session'),
    processContext: input => ipcRenderer.invoke('ghost:process-context', input),
    cancelStream: () => ipcRenderer.invoke('ghost:cancel-stream'),
    summarizeConference: entries => ipcRenderer.invoke('ghost:summarize-conference', entries),
    exportConference: payload => ipcRenderer.invoke('ghost:export-conference', payload),
    getZoomStealthStatus: () => ipcRenderer.invoke('ghost:get-zoom-stealth-status'),
    openZoomApp: () => ipcRenderer.invoke('ghost:open-zoom-app'),
    openZoomShareSettingsHelp: () => ipcRenderer.invoke('ghost:open-zoom-share-help'),
    onInsightStream: callback => listen('ghost:insight-stream', callback),
    synthesizeTts: text => ipcRenderer.invoke('ghost:synthesize-tts', text),
    setIgnoreMouseEvents: (ignore, forward = true) => ipcRenderer.send('ghost:set-ignore-mouse-events', ignore, forward),
    minimizeWindow: () => ipcRenderer.send('ghost:minimize-window'),
    closeWindow: () => ipcRenderer.send('ghost:close-window'),
    setAlwaysOnTop: enabled => ipcRenderer.invoke('ghost:set-always-on-top', enabled),
    log: message => ipcRenderer.send('ghost:log', message),
  });

  function listen(channel, callback) {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }

  contextBridge.exposeInMainWorld('electronAPI', {
    enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
    disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio'),
    isMac: process.platform === 'darwin',
    isWin: process.platform === 'win32',
  });
})();
