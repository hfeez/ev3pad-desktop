'use strict';
/* Logika aplikasi: state, kontrol motor, sensor, profil, controller fisik. Port dari MainVm.kt (Android). */

var S = {
  // konfigurasi
  map: {}, items: [], profiles: { ctl: {}, virt: {} }, active: { ctl: null, virt: null },
  // UI
  tab: 0, edit: true, fullscreen: false, error: null,
  // EV3
  ev3: 'OFF', ev3Name: '',
  motorPorts: [null, null, null, null], sensorPorts: [null, null, null, null],
  sensorModes: [0, 0, 0, 0], sensorData: [{}, {}, {}, {}], speeds: [0, 0, 0, 0], battery: null,
  // input
  padOn: false, ctype: 'DS4', ctypePref: 'auto', padId: '',
  padKeys: new Set(), padAx: { lx: 0, ly: 0, rx: 0, ry: 0, l2: 0, r2: 0 },
  testMode: false, vin: {}, vToggle: new Set(), stageW: STAGE_W,
};

var Bus = { fn: null };
function touch() { if (Bus.fn) Bus.fn(); }
function errMsg(id, en) { S.error = { id: id, en: en }; touch(); }

var native = (typeof window !== 'undefined' && window.native) || null;
function setNative(n) { native = n; }

// ------------------------------------------------------------------ inisialisasi
function initState() {
  S.map = Store.loadMap(); S.items = Store.loadItems();
  S.profiles = Store.loadProfiles(); S.active = Store.loadActive();
  ['ctl', 'virt'].forEach(function (k) { if (S.active[k] !== null && !(S.active[k] in S.profiles[k])) S.active[k] = null; });
  var l = Store.get('lang', null); if (l === 'id' || l === 'en') Lang.code = l;
  var c = Store.get('ctype', 'auto'); S.ctypePref = ['auto', 'ds4', 'xbox', 'joycon'].indexOf(c) >= 0 ? c : 'auto';
}
function setLang(c) { Lang.code = c; Store.set('lang', c); touch(); }

// ------------------------------------------------------------------ navigasi
function clearInputs() { S.vin = {}; S.vToggle = new Set(); }
function selectTab(t) { S.tab = t; clearInputs(); touch(); }
function changeEdit(e) { S.edit = e; clearInputs(); touch(); }
function setVin(id, v) { S.vin = Object.assign({}, S.vin); S.vin[id] = v; touch(); }
function setFullscreen(on) {
  S.fullscreen = on;
  if (native) native.setFullscreen(on);
  touch();
}

// ------------------------------------------------------------------ mode controller
function saveKey(p, cfg) {
  var m = Object.assign({}, S.map);
  if (!cfg || cfg.motors.length === 0) delete m[p]; else m[p] = cfg;
  S.map = m; Store.saveMap(S.map); touch();
}

// ------------------------------------------------------------------ mode virtual
function saveItems() { Store.saveItems(S.items); }
function maxZero(v) { return Math.max(0, v); }

function addItem(t) {
  var ws = S.stageW;
  var id = S.items.reduce(function (m, i) { return Math.max(m, i.id); }, 0) + 1;
  var n = S.items.length;
  var sz = t === 'BTN' ? [90, 90] : t === 'SLIDER' ? [240, 64] : [150, 150];
  var base = t === 'BTN' ? tr('Tombol', 'Button') : t === 'SLIDER' ? 'Slider' : 'Analog';
  var off = 24 + 16 * (n % 6);
  var cfg = newCfg({ motors: [newMotor({ speed: t === 'BTN' ? 'FIXED' : 'PROP' })] });
  S.items = S.items.concat([{
    id: id, type: t, name: base + ' ' + (n + 1), x: Math.min(off, maxZero(ws - sz[0])), y: Math.min(off, STAGE_H - sz[1]),
    w: sz[0], h: sz[1], cfg: cfg, ar: false,
  }]);
  saveItems(); touch();
  return id;
}

function moveItem(id, dx, dy) {
  var ws = S.stageW;
  S.items = S.items.map(function (it) {
    if (it.id !== id) return it;
    return Object.assign({}, it, {
      x: Math.min(Math.max(it.x + (it.ar ? -dx : dx), 0), maxZero(ws - it.w)),
      y: Math.min(Math.max(it.y + dy, 0), maxZero(STAGE_H - it.h)),
    });
  });
  touch();
}

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

function resizeItem(id, dw, dh) {
  var ws = S.stageW;
  S.items = S.items.map(function (it) {
    if (it.id !== id) return it;
    var left = it.ar ? ws - it.x - it.w : it.x;
    var maxW = Math.max(56, ws - left), maxH = Math.max(56, STAGE_H - it.y);
    if (it.type === 'ANALOG') { // analog dipertahankan lingkaran
      var s = clamp(it.w + (dw + dh) / 2, 72, Math.max(72, Math.min(maxW, maxH)));
      return Object.assign({}, it, { w: s, h: s, x: it.ar ? ws - left - s : it.x });
    }
    var w = clamp(it.w + dw, 56, maxW), h = clamp(it.h + dh, 56, maxH);
    return Object.assign({}, it, { w: w, h: h, x: it.ar ? ws - left - w : it.x });
  });
  touch();
}

/** Rapikan ke grid 8 satuan setelah geser/resize, pilih jangkar kiri/kanan terdekat, lalu simpan. */
function snapItem(id) {
  var ws = S.stageW;
  function g(v) { return Math.round(v / 8) * 8; }
  S.items = S.items.map(function (it) {
    if (it.id !== id) return it;
    var w = Math.max(g(it.w), it.type === 'ANALOG' ? 72 : 56);
    var h = it.type === 'ANALOG' ? w : Math.max(g(it.h), 56);
    var left0 = it.ar ? ws - it.x - it.w : it.x;
    var left = clamp(g(left0), 0, maxZero(ws - w)), top = clamp(g(it.y), 0, maxZero(STAGE_H - h));
    var ar = left + w / 2 > ws / 2;
    return Object.assign({}, it, { w: w, h: h, y: top, ar: ar, x: ar ? ws - left - w : left });
  });
  saveItems(); touch();
}

function updateItem(id, name, cfg) {
  S.items = S.items.map(function (it) { return it.id === id ? Object.assign({}, it, { name: (name || '').trim() ? name : it.name, cfg: cfg }) : it; });
  saveItems(); touch();
}
function removeItem(id) { S.items = S.items.filter(function (it) { return it.id !== id; }); saveItems(); touch(); }

// ------------------------------------------------------------------ profil
function snapOf(kind) { return JSON.stringify(kind === 'ctl' ? Store.mapToJson(S.map) : Store.itemsToJson(S.items)); }
function dirty(kind) { var a = S.active[kind]; if (a === null || a === undefined) return false; return S.profiles[kind][a] !== snapOf(kind); }
function countOf(kind, json) { try { var o = JSON.parse(json); return kind === 'ctl' ? Object.keys(o).length : o.length; } catch (e) { return 0; } }
function persistProfiles() { Store.saveProfiles(S.profiles, S.active); }

function saveProfile(kind, name) {
  var n = (name || '').trim(); if (!n) return;
  var m = Object.assign({}, S.profiles[kind]); m[n] = snapOf(kind);
  S.profiles = Object.assign({}, S.profiles); S.profiles[kind] = m;
  S.active = Object.assign({}, S.active); S.active[kind] = n;
  persistProfiles(); touch();
}
function loadProfile(kind, name) {
  var j = S.profiles[kind][name]; if (j === undefined) return;
  try {
    if (kind === 'ctl') { S.map = Store.mapFromJson(JSON.parse(j)); Store.saveMap(S.map); }
    else { S.items = Store.itemsFromJson(JSON.parse(j)); saveItems(); clearInputs(); }
    S.active = Object.assign({}, S.active); S.active[kind] = name;
    persistProfiles(); touch();
  } catch (e) { /* abaikan */ }
}
function renameProfile(kind, old, nw) {
  var n = (nw || '').trim(), cur = S.profiles[kind];
  if (!n || (n !== old && n in cur)) return false;
  var r = {}; Object.keys(cur).forEach(function (k) { r[k === old ? n : k] = cur[k]; });
  S.profiles = Object.assign({}, S.profiles); S.profiles[kind] = r;
  if (S.active[kind] === old) { S.active = Object.assign({}, S.active); S.active[kind] = n; }
  persistProfiles(); touch(); return true;
}
function deleteProfile(kind, name) {
  var r = Object.assign({}, S.profiles[kind]); delete r[name];
  S.profiles = Object.assign({}, S.profiles); S.profiles[kind] = r;
  if (S.active[kind] === name) { S.active = Object.assign({}, S.active); S.active[kind] = null; }
  persistProfiles(); touch();
}

// ------------------------------------------------------------------ syarat sensor
function condOk(c) {
  if (S.ev3 !== 'ON') return true;
  var d = S.sensorPorts[c.sensor]; if (!d) return true;
  if (!modesOf(d).some(function (m) { return m.key === c.field; })) return true;
  var v = (S.sensorData[c.sensor] || {})[c.field];
  if (v === undefined) return false; // belum terbaca: aman = tidak aktif
  var r;
  switch (c.op) {
    case 'GT': r = v > c.value; break; case 'LT': r = v < c.value; break;
    case 'EQ': r = Math.abs(v - c.value) < 0.5; break; case 'LE': r = v <= c.value; break;
    case 'GE': r = v >= c.value; break; default: r = Math.abs(v - c.value) >= 0.5;
  }
  return c.enable ? r : !r;
}
function passes(cfg) { return cfg.conds.every(condOk); }

function sensorMode(i) {
  var d = S.sensorPorts[i]; if (!d) return null;
  var ms = modesOf(d); return ms.length ? ms[S.sensorModes[i] % ms.length] : null;
}
function sensorValue(i) { var m = sensorMode(i); if (!m) return null; var v = S.sensorData[i][m.key]; return v === undefined ? null : v; }
function cycleSensor(i) {
  var d = S.sensorPorts[i]; if (!d) return;
  var n = modesOf(d).length; if (n < 2) return;
  S.sensorModes = S.sensorModes.slice(); S.sensorModes[i] = (S.sensorModes[i] + 1) % n; touch();
}

// ------------------------------------------------------------------ controller fisik
var snap = { keys: new Set(), lx: 0, ly: 0, rx: 0, ry: 0, l2: 0, r2: 0 };
function pressedOf() { return snap.keys; }
function sameSet(a, b) { if (a.size !== b.size) return false; var ok = true; a.forEach(function (x) { if (!b.has(x)) ok = false; }); return ok; }

function pushPad() {
  var changed = false;
  if (!sameSet(S.padKeys, snap.keys)) { S.padKeys = new Set(snap.keys); changed = true; }
  var a = S.padAx;
  if (a.lx !== snap.lx || a.ly !== snap.ly || a.rx !== snap.rx || a.ry !== snap.ry || a.l2 !== snap.l2 || a.r2 !== snap.r2) {
    S.padAx = { lx: snap.lx, ly: snap.ly, rx: snap.rx, ry: snap.ry, l2: snap.l2, r2: snap.r2 }; changed = true;
  }
  if (changed) touch();
}

function ctypeOfId(id) {
  var n = (id || '').toLowerCase();
  if (/vendor:\s*045e/.test(n) || /xbox|microsoft|xinput/.test(n)) return 'XBOX';
  if (/vendor:\s*057e/.test(n) || /joy-?con|nintendo|pro controller/.test(n)) return 'JOYCON';
  return 'DS4'; // Sony (054c), "Wireless Controller", dan controller lain
}
var detected = 'DS4';
function applyType() { S.ctype = S.ctypePref === 'ds4' ? 'DS4' : S.ctypePref === 'xbox' ? 'XBOX' : S.ctypePref === 'joycon' ? 'JOYCON' : detected; }
function chooseCtype(p) { S.ctypePref = p; Store.set('ctype', p); applyType(); touch(); }

function setPad(on, id) {
  S.padOn = on;
  if (!on) { snap = { keys: new Set(), lx: 0, ly: 0, rx: 0, ry: 0, l2: 0, r2: 0 }; pushPad(); S.testMode = false; S.padId = ''; lastPhys = null; }
  else if (id !== undefined) { S.padId = id; detected = ctypeOfId(id); applyType(); }
  touch();
}
function changeTestMode(b) { S.testMode = b; if (!b) { snap = { keys: new Set(), lx: 0, ly: 0, rx: 0, ry: 0, l2: 0, r2: 0 }; pushPad(); } touch(); }
/** Posisi stik dari mode uji (sentuhan pada gambar). */
function testStick(pad, x, y) { if (pad === 'LS') { snap.lx = x; snap.ly = y; } else { snap.rx = x; snap.ry = y; } pushPad(); }
function padKey(p, down) { if (down) snap.keys.add(p); else snap.keys.delete(p); pushPad(); }

// Pemetaan Gamepad API (standard mapping) -> tombol. Sama dengan keyPad() di MainActivity.kt.
var GP_BUTTONS = ['CRS', 'CIR', 'SQR', 'TRI', 'L1', 'R1', 'L2', 'R2', 'SHARE', 'OPT', 'L3', 'R3', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'PS', 'TP'];
var lastPhys = null;

function pollGamepad() {
  var pads = (navigator.getGamepads && navigator.getGamepads()) || [];
  var gp = null;
  for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { gp = pads[i]; break; }
  if (!gp) { if (S.padOn) setPad(false); return; }
  if (!S.padOn || S.padId !== gp.id) setPad(true, gp.id);

  // Status fisik saat ini
  var keys = new Set();
  GP_BUTTONS.forEach(function (name, idx) { var b = gp.buttons[idx]; if (b && (b.pressed || b.value > 0.5)) keys.add(name); });
  var ax = gp.axes || [];
  var phys = {
    keys: keys, lx: ax[0] || 0, ly: -(ax[1] || 0), rx: ax[2] || 0, ry: -(ax[3] || 0),
    l2: Math.max(0, Math.min(1, (gp.buttons[6] && gp.buttons[6].value) || 0)),
    r2: Math.max(0, Math.min(1, (gp.buttons[7] && gp.buttons[7].value) || 0)),
  };
  // Seperti event Android: hanya perubahan dari controller fisik yang ditulis, supaya mode uji (sentuhan) tidak tertimpa.
  if (!lastPhys) lastPhys = { keys: new Set(), lx: 0, ly: 0, rx: 0, ry: 0, l2: 0, r2: 0 };
  var ch = false;
  GP_BUTTONS.forEach(function (name) {
    var now = phys.keys.has(name), was = lastPhys.keys.has(name);
    if (now !== was) { if (now) snap.keys.add(name); else snap.keys.delete(name); ch = true; }
  });
  if (phys.lx !== lastPhys.lx || phys.ly !== lastPhys.ly || phys.rx !== lastPhys.rx || phys.ry !== lastPhys.ry || phys.l2 !== lastPhys.l2 || phys.r2 !== lastPhys.r2) {
    snap.lx = phys.lx; snap.ly = phys.ly; snap.rx = phys.rx; snap.ry = phys.ry; snap.l2 = phys.l2; snap.r2 = phys.r2; ch = true;
  }
  lastPhys = phys;
  if (ch) pushPad();
}
function startGamepad() { setInterval(pollGamepad, 8); }

// ------------------------------------------------------------------ koneksi EV3
var loopToken = 0;
function ok(r) { if (!r || !r.ok) throw new Error(r && r.err || 'ipc'); return r.v; }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function connect(path, name) {
  if (S.ev3 !== 'OFF') return;
  S.ev3 = 'WAIT'; touch();
  try {
    ok(await native.open(path));
    S.ev3Name = name;
    try { applyTypes(ok(await native.readTypes())); }
    catch (e) { try { await native.close(); } catch (x) { /* abaikan */ } throw e; }
    S.ev3 = 'ON'; touch();
    startLoop();
  } catch (e) {
    S.ev3 = 'OFF';
    errMsg('Gagal terhubung ke EV3. Pastikan EV3 menyala, Bluetooth EV3 aktif, dan sudah dipasangkan.',
      'Could not connect to EV3. Make sure the EV3 is on, its Bluetooth is enabled, and it is paired.');
  }
}

function resetPorts() {
  S.motorPorts = [null, null, null, null]; S.sensorPorts = [null, null, null, null];
  S.sensorData = [{}, {}, {}, {}]; S.speeds = [0, 0, 0, 0]; S.battery = null;
}

async function disconnect() {
  loopToken++;
  S.ev3 = 'OFF'; resetPorts(); touch();
  try { await native.close(); } catch (e) { /* abaikan */ }
}

function fail(id, en) {
  loopToken++;
  try { native.close(); } catch (e) { /* abaikan */ }
  S.ev3 = 'OFF'; resetPorts(); errMsg(id, en);
}
function onLinkLost() { if (S.ev3 !== 'OFF') fail('Koneksi EV3 terputus.', 'EV3 connection lost.'); }

function applyTypes(raw) {
  var newS = raw.slice(0, 4).map(devOf);
  var modes = S.sensorModes.slice(), data = S.sensorData.slice();
  for (var i = 0; i < 4; i++) if (newS[i] !== S.sensorPorts[i]) { modes[i] = 0; data[i] = {}; }
  S.sensorModes = modes; S.sensorData = data; S.sensorPorts = newS;
  S.motorPorts = raw.slice(4, 8).map(devOf);
}

// ------------------------------------------------------------------ pembacaan sensor
var sIdx = [0, 0, 0, 0], sDwell = [0, 0, 0, 0];

/** Mode yang perlu dibaca di satu port: mode tampilan + mode yang dipakai syarat sensor. */
function neededModes(i) {
  var d = S.sensorPorts[i]; if (!d) return [];
  var ms = modesOf(d); if (!ms.length) return [];
  var set = {}, order = [];
  function add(m) { if (!(m.key in set)) { set[m.key] = m; order.push(m.key); } }
  add(ms[S.sensorModes[i] % ms.length]);
  function scan(c) { c.conds.forEach(function (cd) { if (cd.sensor === i) { var m = ms.find(function (x) { return x.key === cd.field; }); if (m) add(m); } }); }
  Object.keys(S.map).forEach(function (k) { scan(S.map[k]); });
  S.items.forEach(function (it) { scan(it.cfg); });
  return order.map(function (k) { return set[k]; });
}

async function readSens() {
  var req = [];
  for (var i = 0; i < 4; i++) {
    var ms = neededModes(i); if (!ms.length) continue;
    if (ms.length > 1) { if (sDwell[i] >= 3) { sIdx[i] = (sIdx[i] + 1) % ms.length; sDwell[i] = 0; } } else sIdx[i] = 0;
    var m = ms[sIdx[i] % ms.length];
    req.push({ port: i, mode: m, use: sDwell[i] >= 1 || ms.length === 1 }); // sampel pertama setelah ganti mode dibuang
  }
  if (!req.length) return;
  var v = ok(await native.readSensors(req.map(function (r) { return [r.port, r.mode.mode]; })));
  var d = S.sensorData.map(function (o) { return Object.assign({}, o); });
  req.forEach(function (r, k) {
    if (r.use && v[k] !== null && v[k] !== undefined && !isNaN(v[k])) d[r.port][r.mode.key] = v[k];
    sDwell[r.port]++;
  });
  S.sensorData = d;
}

// ------------------------------------------------------------------ loop kontrol
/** deadzone + mode kecepatan (tetap / ikuti gerakan). */
function shape(v, dz, sp) {
  var a = Math.abs(v); if (a < dz) return 0;
  var o = sp === 'PROP' ? Math.min((a - dz) / (1 - dz), 1) : 1;
  return o * Math.sign(v);
}

/** Hasil -1..1 untuk satu motor dari satu tombol/stik/trigger controller. */
function frac(pad, k, m, s, pressed, tg) {
  var kind = padKind(pad);
  if (kind === 'TRIG') {
    var axis = pad === 'L2' ? s.l2 : s.r2;
    return shape(Math.max(axis, s.keys.has(pad) ? 1 : 0), 0.1, m.speed);
  }
  if (kind === 'STICK') {
    var v = pad === 'LS' && m.axis === 'H' ? s.lx : pad === 'LS' ? s.ly : m.axis === 'H' ? s.rx : s.ry;
    return shape(v, 0.15, m.speed);
  }
  return (k.toggle ? tg[pad] === true : pressed.has(pad)) ? 1 : 0;
}

function vfrac(it, m, vi) {
  var i = vi[it.id] || { down: false, x: 0, y: 0 };
  if (it.type === 'BTN') return (it.cfg.toggle ? S.vToggle.has(it.id) : i.down) ? 1 : 0;
  if (it.type === 'SLIDER') return shape(i.x, 0.12, m.speed);
  return shape(m.axis === 'H' ? i.x : i.y, 0.12, m.speed);
}

/** Satu putaran perhitungan target kecepatan tiap port. Dipisah supaya bisa diuji. */
function computeTargets(st) {
  var s = snap, cfg = S.map, pressed = pressedOf();
  var virt = S.tab === 1 && !S.edit;
  var vi = S.vin, list = S.items;

  if (!S.padOn) st.toggles = {};
  pressed.forEach(function (p) { if (!st.prev.has(p) && cfg[p] && cfg[p].toggle === true) st.toggles[p] = !(st.toggles[p] || false); });
  st.prev = new Set(pressed);

  var downNow = new Set();
  if (virt) Object.keys(vi).forEach(function (id) { if (vi[id].down) downNow.add(Number(id)); });
  if (virt) {
    downNow.forEach(function (id) {
      if (st.prevV.has(id)) return;
      var vit = list.find(function (x) { return x.id === id; });
      if (vit && vit.type === 'BTN' && vit.cfg.toggle) { var n = new Set(S.vToggle); if (n.has(id)) n.delete(id); else n.add(id); S.vToggle = n; touch(); }
    });
  } else if (S.vToggle.size) { S.vToggle = new Set(); touch(); }
  st.prevV = downNow;

  var target = [0, 0, 0, 0];
  Object.keys(cfg).forEach(function (pad) {
    var k = cfg[pad];
    k.motors.forEach(function (m) {
      st.stopB[m.port] = m.stop === 'FLOAT' ? 0 : 1; // firmware EV3: Hold ikut brake
      if (S.padOn && passes(k)) target[m.port] += Math.round(frac(pad, k, m, s, pressed, st.toggles) * m.power * (m.cw ? 1 : -1));
    });
  });
  list.forEach(function (vit) {
    vit.cfg.motors.forEach(function (m) {
      st.stopB[m.port] = m.stop === 'FLOAT' ? 0 : 1;
      if (virt && passes(vit.cfg)) target[m.port] += Math.round(vfrac(vit, m, vi) * m.power * (m.cw ? 1 : -1));
    });
  });
  return target.map(function (t) { return Math.max(-100, Math.min(100, t)); });
}

function newLoopState() { return { sent: [0, 0, 0, 0], stopB: [1, 1, 1, 1], toggles: {}, prev: new Set(), prevV: new Set() }; }

function ev3Ops(st, clamped) {
  var ops = [];
  for (var p = 0; p < 4; p++) {
    var t = clamped[p];
    if (t !== st.sent[p]) { ops = ops.concat(t === 0 ? opStop(p, st.stopB[p]) : opSpeed(p, t)); st.sent[p] = t; }
  }
  return ops;
}
function lc(v) { return v >= -32 && v <= 31 ? [v & 0x3F] : [0x81, v & 0xFF]; }
function opSpeed(port, speed) { var m = 1 << port; return [0xA5, 0, m].concat(lc(speed), [0xA6, 0, m]); }
function opStop(port, brake) { return [0xA3, 0, 1 << port, brake]; }

async function startLoop() {
  var token = ++loopToken, st = newLoopState();
  var lastPorts = Date.now(), lastSens = 0, lastBatt = 0;
  try {
    while (loopToken === token) {
      var clamped = computeTargets(st);
      var ops = ev3Ops(st, clamped);
      if (ops.length) { ok(await native.send(ops)); S.speeds = clamped.slice(); touch(); }

      var now = Date.now();
      if (now - lastPorts > 3000) { applyTypes(ok(await native.readTypes())); lastPorts = now; touch(); }
      if (now - lastSens > 250) { await readSens(); lastSens = now; touch(); }
      if (now - lastBatt > 10000) { S.battery = ok(await native.readBattery()); lastBatt = now; touch(); }
      await sleep(40);
    }
  } catch (e) {
    if (loopToken === token) fail('Koneksi EV3 terputus.', 'EV3 connection lost.');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { S: S, shape: shape, frac: frac, computeTargets: computeTargets, newLoopState: newLoopState, ev3Ops: ev3Ops, opSpeed: opSpeed, opStop: opStop,
    condOk: condOk, passes: passes, addItem: addItem, moveItem: moveItem, resizeItem: resizeItem, snapItem: snapItem, setNative: setNative, getSnap: function () { return snap; },
    saveProfile: saveProfile, dirty: dirty, loadProfile: loadProfile, renameProfile: renameProfile, deleteProfile: deleteProfile, applyTypes: applyTypes, ctypeOfId: ctypeOfId, snapOf: snapOf };
}
