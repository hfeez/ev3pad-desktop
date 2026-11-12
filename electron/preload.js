'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('native', {
  listPorts: call('ev3:list'),
  open: call('ev3:open'),
  close: call('ev3:close'),
  send: call('ev3:send'),
  readTypes: call('ev3:types'),
  readSensors: call('ev3:sensors'),
  readBattery: call('ev3:battery'),
  setFullscreen: call('app:fullscreen'),
  openExternal: call('app:openExternal'),
  btSettings: call('app:btSettings'),
  onLost: (cb) => ipcRenderer.on('ev3:lost', () => cb()),
});
