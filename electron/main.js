'use strict';
const { app, BrowserWindow, ipcMain, shell, Menu, powerSaveBlocker, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { Ev3Link } = require('./ev3link');

// ---- Mode portable: simpan semua data (profil, setelan) di folder di samping .exe ----
(function setupPortableData() {
  try {
    const base = process.env.PORTABLE_EXECUTABLE_DIR || (app.isPackaged ? path.dirname(process.execPath) : null);
    if (!base) return;
    const dir = path.join(base, 'EV3-Direct-Control-Data');
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    app.setPath('userData', dir);
  } catch (e) { /* folder tidak bisa ditulis (mis. di Program Files): pakai lokasi bawaan */ }
})();

app.commandLine.appendSwitch('disable-renderer-backgrounding');
if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;
let link = null;
let blockerId = null;

function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1180, height: 760, minWidth: 420, minHeight: 520,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#070D14' : '#EEF3F7',
    title: 'EV3 Direct Control',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', async () => {
  if (link) { try { await link.close(); } catch (e) {} link = null; }
  app.quit();
});

// ---------------------------------------------------------------- daftar port Bluetooth
function runPs(script) {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 6000, windowsHide: true }, (err, out) => {
      resolve(err ? '' : String(out));
    });
  });
}

/** Windows: petakan alamat Bluetooth -> nama perangkat (mis. "EV3") agar port COM mudah dikenali. */
async function windowsBtNames() {
  const out = await runPs("Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Select-Object FriendlyName,InstanceId | ConvertTo-Json -Compress");
  const map = {};
  try {
    let arr = JSON.parse(out || '[]'); if (!Array.isArray(arr)) arr = [arr];
    for (const d of arr) {
      const m = /DEV_([0-9A-F]{12})/i.exec(d.InstanceId || '');
      if (m && d.FriendlyName) map[m[1].toUpperCase()] = d.FriendlyName;
    }
  } catch (e) { /* abaikan */ }
  return map;
}

async function listPorts() {
  const { SerialPort } = require('serialport');
  const all = await SerialPort.list();
  const names = process.platform === 'win32' ? await windowsBtNames() : {};
  const items = all.map((p) => {
    const pnp = p.pnpId || '';
    const addr = (/&([0-9A-F]{12})_C/i.exec(pnp) || [])[1];
    const btName = addr ? names[addr.toUpperCase()] : null;
    const bt = /BTHENUM|bluetooth/i.test(pnp + ' ' + (p.friendlyName || '') + ' ' + (p.manufacturer || '')) ||
      /rfcomm|bluetooth|ev3/i.test(p.path);
    const name = btName || p.friendlyName || p.path;
    const label = name === p.path ? name : `${name} (${p.path})`;
    return { path: p.path, name, label, bt, ev3: /ev3/i.test(label) };
  });
  const bts = items.filter((i) => i.bt);
  const list = bts.length ? bts : items;
  return list.sort((a, b) => Number(b.ev3) - Number(a.ev3) || a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------- IPC
const wrap = (fn) => async (_e, ...a) => {
  try { return { ok: true, v: await fn(...a) }; }
  catch (err) { return { ok: false, err: String((err && err.message) || err) }; }
};

ipcMain.handle('ev3:list', wrap(() => listPorts()));
ipcMain.handle('ev3:open', wrap(async (p) => {
  if (link) { try { await link.close(); } catch (e) {} link = null; }
  const l = new Ev3Link(() => { if (link === l) { link = null; if (win) win.webContents.send('ev3:lost'); } });
  await l.open(p);
  link = l;
}));
ipcMain.handle('ev3:close', wrap(async () => { const l = link; link = null; if (l) await l.close(); }));
ipcMain.handle('ev3:send', wrap((ops) => { if (!link) throw new Error('no link'); return link.send(ops); }));
ipcMain.handle('ev3:types', wrap(() => { if (!link) throw new Error('no link'); return link.readTypes(); }));
ipcMain.handle('ev3:sensors', wrap((req) => { if (!link) throw new Error('no link'); return link.readSensors(req); }));
ipcMain.handle('ev3:battery', wrap(() => { if (!link) throw new Error('no link'); return link.readBattery(); }));

ipcMain.handle('app:fullscreen', (_e, on) => {
  if (win) win.setFullScreen(!!on);
  if (on && blockerId === null) blockerId = powerSaveBlocker.start('prevent-display-sleep');
  if (!on && blockerId !== null) { powerSaveBlocker.stop(blockerId); blockerId = null; }
});
ipcMain.handle('app:openExternal', (_e, url) => { if (/^https:\/\//i.test(url)) shell.openExternal(url); });
ipcMain.handle('app:btSettings', () => {
  if (process.platform === 'win32') shell.openExternal('ms-settings:bluetooth');
  else if (process.platform === 'darwin') shell.openExternal('x-apple.systempreferences:com.apple.BluetoothSettings');
  return process.platform;
});
