'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');

// ---- muat model.js + core.js di konteks terpisah dengan localStorage palsu
const store = {};
const ctx = vm.createContext({
  module: { exports: {} }, console, setInterval, setTimeout, Date, Math,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  navigator: { language: 'id', getGamepads: () => [] },
});
['model.js', 'core.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f }));
const C = ctx.module.exports, S = C.S;
const plain = (x) => JSON.parse(JSON.stringify(x));
const run = (st) => plain(C.computeTargets(st));
let n = 0;
function t(name, fn) { fn(); n++; console.log('  ok  ' + name); }
const motor = (o) => Object.assign({ port: 0, cw: true, power: 70, stop: 'BRAKE', axis: 'V', speed: 'FIXED' }, o);
const cfg = (o) => Object.assign({ toggle: false, motors: [motor()], conds: [], spring: true }, o);
function reset() { S.padOn = true; S.map = {}; S.items = []; S.tab = 0; S.edit = true; S.ev3 = 'OFF'; S.vin = {}; S.vToggle = new Set(); const s = C.getSnap(); s.keys.clear(); s.lx = s.ly = s.rx = s.ry = s.l2 = s.r2 = 0; }

console.log('Protokol EV3');
t('opSpeed meniru Ev3.kt', () => {
  assert.deepStrictEqual(plain(C.opSpeed(0, 70)), [0xA5, 0, 1, 0x81, 70, 0xA6, 0, 1]);
  assert.deepStrictEqual(plain(C.opSpeed(1, -20)), [0xA5, 0, 2, 0x2C, 0xA6, 0, 2]);
  assert.deepStrictEqual(plain(C.opSpeed(3, -100)), [0xA5, 0, 8, 0x81, 0x9C, 0xA6, 0, 8]);
  assert.deepStrictEqual(plain(C.opStop(2, 1)), [0xA3, 0, 4, 1]);
});
const { Ev3Link } = require(path.join(root, 'electron', 'ev3link.js'));
t('paket direct command', () => {
  const l = new Ev3Link();
  assert.deepStrictEqual([...l._packet([0x81, 0x12, 0x60], 1, true)], [8, 0, 1, 0, 0x00, 1, 0, 0x81, 0x12, 0x60]);
  assert.deepStrictEqual([...l._packet([0xA3, 0, 0x0F, 0], 0, false)], [9, 0, 2, 0, 0x80, 0, 0, 0xA3, 0, 0x0F, 0]);
});
t('readTypes / readSensors / readBattery mem-parse balasan', async () => {});
(async () => {
  const l = new Ev3Link();
  let sent;
  l._query = async (ops, g) => { sent = { ops: [...ops], g }; return Buffer.from([1, 0, 2, 16, 0, 29, 0, 126, 0, 127, 0, 7, 0, 8, 0, 126, 0, 126, 0]); };
  const types = await l.readTypes();
  assert.deepStrictEqual(types, [16, 29, 126, 127, 7, 8, 126, 126]);
  assert.strictEqual(sent.g, 16);
  assert.deepStrictEqual(sent.ops.slice(0, 6), [0x99, 0x05, 0x00, 0, 0x60, 0x61]);
  const fb = Buffer.alloc(3 + 8); fb[2] = 2; fb.writeFloatLE(12.5, 3); fb.writeFloatLE(3, 7);
  l._query = async () => fb;
  assert.deepStrictEqual(await l.readSensors([[0, 0], [1, 2]]), [12.5, 3]);
  l._query = async () => Buffer.from([1, 0, 2, 87]);
  assert.strictEqual(await l.readBattery(), 87);
  l._query = async () => Buffer.from([1, 0, 4]);
  assert.strictEqual(await l.readBattery(), null);
  console.log('  ok  readTypes/readSensors/readBattery'); n++;
  console.log('\n' + n + ' tes lulus');
})().catch((e) => { console.error(e); process.exit(1); });

console.log('Kontrol motor');
t('shape: deadzone + mode kecepatan', () => {
  assert.strictEqual(C.shape(0.05, 0.1, 'FIXED'), 0);
  assert.strictEqual(C.shape(-1, 0.15, 'FIXED'), -1);
  assert.ok(Math.abs(C.shape(0.55, 0.1, 'PROP') - 0.5) < 1e-9);
});
t('tombol digital -> motor, arah putaran', () => {
  reset(); S.map = { CRS: cfg() }; C.getSnap().keys.add('CRS');
  const st = C.newLoopState();
  assert.deepStrictEqual(run(st), [70, 0, 0, 0]);
  S.map.CRS = cfg({ motors: [motor({ cw: false })] });
  assert.deepStrictEqual(run(st), [-70, 0, 0, 0]);
});
t('dua tombol ke motor sama dijumlah lalu dibatasi -100..100', () => {
  reset(); S.map = { CRS: cfg({ motors: [motor({ power: 80 })] }), CIR: cfg({ motors: [motor({ power: 80 })] }) };
  C.getSnap().keys.add('CRS'); C.getSnap().keys.add('CIR');
  assert.deepStrictEqual(run(C.newLoopState()), [100, 0, 0, 0]);
});
t('mode toggle', () => {
  reset(); S.map = { SQR: cfg({ toggle: true }) };
  const st = C.newLoopState(), k = C.getSnap().keys;
  k.add('SQR'); assert.strictEqual(run(st)[0], 70);
  k.delete('SQR'); assert.strictEqual(run(st)[0], 70);
  k.add('SQR'); assert.strictEqual(run(st)[0], 0);
});
t('stik analog proporsional dan trigger', () => {
  reset(); S.map = { LS: cfg({ motors: [motor({ axis: 'V', speed: 'PROP', power: 100 })] }), R2: cfg({ motors: [motor({ port: 1, speed: 'PROP', power: 100 })] }) };
  const s = C.getSnap(); s.ly = 0.575; s.r2 = 0.55;
  const r = run(C.newLoopState());
  assert.strictEqual(r[0], 50); assert.strictEqual(r[1], 50);
});
t('tidak ada gerak jika controller tidak terhubung', () => {
  reset(); S.padOn = false; S.map = { CRS: cfg() }; C.getSnap().keys.add('CRS');
  assert.deepStrictEqual(run(C.newLoopState()), [0, 0, 0, 0]);
});
t('elemen virtual hanya aktif di mode Kontrol', () => {
  reset(); S.tab = 1; S.edit = true;
  S.items = [{ id: 1, type: 'BTN', name: 'a', x: 0, y: 0, w: 90, h: 90, cfg: cfg(), ar: false }];
  S.vin = { 1: { down: true, x: 0, y: 0 } };
  assert.deepStrictEqual(run(C.newLoopState()), [0, 0, 0, 0]);
  S.edit = false; assert.deepStrictEqual(run(C.newLoopState()), [70, 0, 0, 0]);
});
t('slider tetap menggerakkan motor jika tidak kembali ke tengah', () => {
  reset(); S.tab = 1; S.edit = false;
  S.items = [{ id: 2, type: 'SLIDER', name: 's', x: 0, y: 0, w: 240, h: 64, cfg: cfg({ spring: false, motors: [motor({ speed: 'PROP', power: 100 })] }), ar: false }];
  S.vin = { 2: { down: false, x: 0.56, y: 0 } };
  assert.strictEqual(run(C.newLoopState())[0], 50);
});
t('ev3Ops hanya mengirim port yang berubah', () => {
  const st = C.newLoopState();
  assert.deepStrictEqual(plain(C.ev3Ops(st, [70, 0, 0, 0])), plain(C.opSpeed(0, 70)));
  assert.deepStrictEqual(plain(C.ev3Ops(st, [70, 0, 0, 0])), []);
  assert.deepStrictEqual(plain(C.ev3Ops(st, [0, 0, 0, 0])), plain(C.opStop(0, 1)));
});

console.log('Syarat sensor');
t('condOk: aktifkan / nonaktifkan / belum terbaca', () => {
  reset(); S.ev3 = 'ON'; S.sensorPorts = [ctx.DEV.US, null, null, null]; S.sensorData = [{ dist: 10 }, {}, {}, {}];
  const c = (o) => Object.assign({ enable: true, sensor: 0, field: 'dist', op: 'GT', value: 20 }, o);
  assert.strictEqual(C.condOk(c()), false);
  assert.strictEqual(C.condOk(c({ op: 'LT' })), true);
  assert.strictEqual(C.condOk(c({ enable: false })), true);
  S.sensorData = [{}, {}, {}, {}]; assert.strictEqual(C.condOk(c()), false);
  S.sensorPorts = [null, null, null, null]; assert.strictEqual(C.condOk(c()), true);
  S.ev3 = 'OFF'; assert.strictEqual(C.condOk(c()), true);
});

console.log('Layout & profil');
t('addItem / move / snap ke grid 8', () => {
  reset(); S.stageW = 640;
  const id = C.addItem('BTN'); assert.strictEqual(S.items.length, 1);
  C.moveItem(id, 13, 5); C.snapItem(id);
  const it = S.items[0]; assert.strictEqual(it.x % 8, 0); assert.strictEqual(it.y % 8, 0);
});
t('profil: simpan, dirty, muat, ganti nama, hapus', () => {
  reset(); S.map = { CRS: cfg() };
  C.saveProfile('ctl', 'Robot A'); assert.strictEqual(S.active.ctl, 'Robot A'); assert.strictEqual(C.dirty('ctl'), false);
  S.map = Object.assign({}, S.map, { CIR: cfg() }); assert.strictEqual(C.dirty('ctl'), true);
  C.loadProfile('ctl', 'Robot A'); assert.deepStrictEqual(plain(Object.keys(S.map)), ['CRS']);
  assert.strictEqual(C.renameProfile('ctl', 'Robot A', 'Robot B'), true); assert.strictEqual(S.active.ctl, 'Robot B');
  C.saveProfile('ctl', 'X'); assert.strictEqual(C.renameProfile('ctl', 'X', 'Robot B'), false);
  C.deleteProfile('ctl', 'Robot B'); assert.ok(!('Robot B' in S.profiles.ctl));
});
t('JSON kompatibel dengan skema Android', () => {
  reset(); S.map = { LS: cfg({ motors: [motor({ axis: 'H', speed: 'PROP' })], conds: [{ enable: true, sensor: 0, field: 'dist', op: 'GT', value: 20 }] }) };
  const j = ctx.Store.mapToJson(S.map);
  assert.deepStrictEqual(plain(Object.keys(j.LS)), ['t', 'sp', 'm', 'c']);
  assert.deepStrictEqual(plain(Object.keys(j.LS.m[0])), ['p', 'cw', 'pw', 'st', 'ax', 'sp']);
  assert.deepStrictEqual(plain(ctx.Store.mapFromJson(j)), plain(S.map));
});
t('deteksi jenis controller', () => {
  assert.strictEqual(C.ctypeOfId('Xbox 360 Controller (XInput STANDARD GAMEPAD)'), 'XBOX');
  assert.strictEqual(C.ctypeOfId('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)'), 'DS4');
  assert.strictEqual(C.ctypeOfId('Joy-Con (L/R) (Vendor: 057e Product: 200e)'), 'JOYCON');
});
