'use strict';
/* Model data, bahasa, dan penyimpanan. Port dari Models.kt, Strings.kt (Android). */

// ------------------------------------------------------------------ bahasa
var Lang = { code: (typeof navigator !== 'undefined' && /^(id|in)\b/i.test(navigator.language || '')) ? 'id' : 'en' };
function tr(id, en) { return Lang.code === 'en' ? en : id; }

// ------------------------------------------------------------------ perangkat EV3
var DEV = {
  LARGE:  { key: 'LARGE',  code: 7,  id: 'Motor besar',       en: 'Large motor' },
  MEDIUM: { key: 'MEDIUM', code: 8,  id: 'Motor sedang',      en: 'Medium motor' },
  TOUCH:  { key: 'TOUCH',  code: 16, id: 'Sensor sentuh',     en: 'Touch sensor' },
  COLOR:  { key: 'COLOR',  code: 29, id: 'Sensor warna',      en: 'Color sensor' },
  US:     { key: 'US',     code: 30, id: 'Sensor ultrasonik', en: 'Ultrasonic sensor' },
  GYRO:   { key: 'GYRO',   code: 32, id: 'Sensor gyro',       en: 'Gyro sensor' },
  IR:     { key: 'IR',     code: 33, id: 'Sensor IR',         en: 'IR sensor' },
  OTHER:  { key: 'OTHER',  code: -1, id: 'Perangkat',         en: 'Device' },
};
function devLabel(d) { return tr(d.id, d.en); }
function devOf(code) {
  if ([0, 125, 126, 127, 255].indexOf(code) >= 0) return null;
  return Object.keys(DEV).map(function (k) { return DEV[k]; }).find(function (d) { return d.code === code; }) || DEV.OTHER;
}

/** key = nama bidang (syarat sensor), mode = nomor mode EV3, type: 0 angka, 1 nama warna, 2 sentuh. */
function SMode(id, en, key, mode, unit, type, dec) { return { id: id, en: en, key: key, mode: mode, unit: unit, type: type, dec: dec }; }
function smLabel(m) { return tr(m.id, m.en); }

function modesOf(d) {
  switch (d && d.key) {
    case 'US': return [SMode('Jarak', 'Distance', 'dist', 0, 'cm', 0, 1), SMode('Jarak (inci)', 'Distance (inch)', 'dist_in', 1, 'in', 0, 1)];
    case 'COLOR': return [
      SMode('Warna', 'Color', 'color', 2, '', 1, 0),
      SMode('Cahaya pantul', 'Reflected light', 'refl', 0, '%', 0, 0),
      SMode('Cahaya sekitar', 'Ambient light', 'amb', 1, '%', 0, 0)];
    case 'TOUCH': return [SMode('Sentuhan', 'Touch', 'touch', 0, '', 2, 0)];
    case 'GYRO': return [SMode('Sudut', 'Angle', 'ang', 0, '°', 0, 0), SMode('Kecepatan sudut', 'Angular rate', 'rate', 1, '°/s', 0, 0)];
    case 'IR': return [SMode('Kedekatan', 'Proximity', 'prox', 0, '%', 0, 0)];
    default: return [];
  }
}

var COLORS_ID = ['–', 'Hitam', 'Biru', 'Hijau', 'Kuning', 'Merah', 'Putih', 'Coklat'];
var COLORS_EN = ['–', 'Black', 'Blue', 'Green', 'Yellow', 'Red', 'White', 'Brown'];
function colorName(i) { return (Lang.code === 'en' ? COLORS_EN : COLORS_ID)[Math.max(0, Math.min(7, Math.round(i)))]; }

function fmtSensor(m, v) {
  if (v === null || v === undefined || isNaN(v)) return '–';
  if (m.type === 1) return colorName(v);
  if (m.type === 2) return v > 0.5 ? tr('Ditekan', 'Pressed') : tr('Lepas', 'Released');
  return v.toFixed(m.dec) + (m.unit ? ' ' + m.unit : '');
}
function fmtNum(v) { return v % 1 === 0 ? String(Math.trunc(v)) : String(v); }

// ------------------------------------------------------------------ panggung virtual
var STAGE_H = 360;
var MIN_STAGE_W = 400;
var STAGE_W = 640; // lebar versi lama, hanya untuk migrasi layout lama

// ------------------------------------------------------------------ tombol controller
var PAD_LIST = ['L2', 'R2', 'L1', 'R1', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'TRI', 'CRS', 'SQR', 'CIR', 'LS', 'RS', 'L3', 'R3', 'SHARE', 'OPT', 'PS', 'TP'];
var PAD_INFO = {
  L2: ['L2 (trigger kiri)', 'L2 (left trigger)', 'TRIG'], R2: ['R2 (trigger kanan)', 'R2 (right trigger)', 'TRIG'],
  L1: ['L1', 'L1', 'BTN'], R1: ['R1', 'R1', 'BTN'],
  UP: ['D-pad atas', 'D-pad up', 'BTN'], DOWN: ['D-pad bawah', 'D-pad down', 'BTN'],
  LEFT: ['D-pad kiri', 'D-pad left', 'BTN'], RIGHT: ['D-pad kanan', 'D-pad right', 'BTN'],
  TRI: ['Segitiga', 'Triangle', 'BTN'], CRS: ['Silang', 'Cross', 'BTN'], SQR: ['Kotak', 'Square', 'BTN'], CIR: ['Lingkaran', 'Circle', 'BTN'],
  LS: ['Stik analog kiri', 'Left analog stick', 'STICK'], RS: ['Stik analog kanan', 'Right analog stick', 'STICK'],
  L3: ['L3 (tekan stik kiri)', 'L3 (press left stick)', 'BTN'], R3: ['R3 (tekan stik kanan)', 'R3 (press right stick)', 'BTN'],
  SHARE: ['Share', 'Share', 'BTN'], OPT: ['Options', 'Options', 'BTN'], PS: ['Tombol PS', 'PS button', 'BTN'],
  TP: ['Touchpad (tekan)', 'Touchpad (press)', 'BTN'],
};
function padKind(p) { return PAD_INFO[p][2]; }
function padLabel(p) { return tr(PAD_INFO[p][0], PAD_INFO[p][1]); }

/** Nama tombol sesuai jenis controller (posisi sama, nama berbeda). */
function padLabelFor(p, t) {
  var X = {
    L2: 'LT', R2: 'RT', L1: 'LB', R1: 'RB', TRI: 'Y', CRS: 'A', SQR: 'X', CIR: 'B',
    SHARE: 'View', OPT: 'Menu', PS: tr('Tombol Xbox', 'Xbox button'), TP: 'Share',
  };
  var J = {
    L2: 'ZL', R2: 'ZR', L1: 'L', R1: 'R', TRI: 'X', CRS: 'B', SQR: 'Y', CIR: 'A',
    SHARE: 'Minus (−)', OPT: 'Plus (+)', PS: 'Home', TP: 'Capture',
  };
  if (t === 'XBOX' && X[p] !== undefined) return X[p];
  if (t === 'JOYCON' && J[p] !== undefined) return J[p];
  return padLabel(p);
}

var CMP_SYM = { GT: '>', LT: '<', EQ: '=', LE: '≤', GE: '≥', NE: '≠' };

// ------------------------------------------------------------------ konfigurasi
function newMotor(o) { return Object.assign({ port: 0, cw: true, power: 70, stop: 'BRAKE', axis: 'V', speed: 'FIXED' }, o || {}); }
function newCond(o) { return Object.assign({ enable: true, sensor: 0, field: 'dist', op: 'GT', value: 20 }, o || {}); }
function newCfg(o) { return Object.assign({ toggle: false, motors: [newMotor()], conds: [], spring: true }, o || {}); }

// ------------------------------------------------------------------ JSON (skema sama dengan aplikasi Android)
var Store = (function () {
  function motorJson(x) { return { p: x.port, cw: x.cw, pw: x.power, st: x.stop, ax: x.axis, sp: x.speed }; }
  function motorFrom(x) {
    if (!(x.st in { HOLD: 1, BRAKE: 1, FLOAT: 1 }) || !(x.ax in { H: 1, V: 1 }) || !(x.sp in { FIXED: 1, PROP: 1 })) throw new Error('bad motor');
    return { port: x.p | 0, cw: !!x.cw, power: x.pw | 0, stop: x.st, axis: x.ax, speed: x.sp };
  }
  function cfgJson(k) {
    return {
      t: k.toggle, sp: k.spring, m: k.motors.map(motorJson),
      c: k.conds.map(function (c) { return { e: c.enable, s: c.sensor, f: c.field, o: c.op, v: c.value }; }),
    };
  }
  function cfgFrom(j) {
    return {
      toggle: !!j.t, motors: j.m.map(motorFrom),
      conds: (j.c || []).map(function (o) {
        if (!(o.o in CMP_SYM)) throw new Error('bad cmp');
        return { enable: !!o.e, sensor: o.s | 0, field: String(o.f), op: o.o, value: Number(o.v) };
      }),
      spring: j.sp === undefined ? true : !!j.sp,
    };
  }
  function mapToJson(m) { var o = {}; Object.keys(m).forEach(function (k) { o[k] = cfgJson(m[k]); }); return o; }
  function mapFromJson(o) {
    var r = {};
    Object.keys(o || {}).forEach(function (k) { if (PAD_INFO[k]) { try { r[k] = cfgFrom(o[k]); } catch (e) { /* lewati */ } } });
    return r;
  }
  function itemsToJson(l) {
    return l.map(function (it) { return { i: it.id, t: it.type, n: it.name, x: it.x, y: it.y, w: it.w, h: it.h, c: cfgJson(it.cfg), a: it.ar }; });
  }
  function itemsFromJson(a) {
    var r = [];
    (a || []).forEach(function (o) {
      try {
        if (['BTN', 'SLIDER', 'ANALOG'].indexOf(o.t) < 0) throw new Error('bad type');
        var w = Number(o.w), h = Number(o.h);
        if (o.t === 'ANALOG') { var s = Math.min(w, h); w = s; h = s; }
        var x = Number(o.x), ar = o.a === undefined ? false : !!o.a;
        if (o.a === undefined && x + w / 2 > STAGE_W / 2) { ar = true; x = STAGE_W - x - w; }
        r.push({ id: Number(o.i), type: o.t, name: String(o.n), x: x, y: Number(o.y), w: w, h: h, cfg: cfgFrom(o.c), ar: ar });
      } catch (e) { /* lewati elemen rusak */ }
    });
    return r;
  }

  var KEY = 'ev3pad:';
  function get(k, def) { try { var v = localStorage.getItem(KEY + k); return v === null ? def : v; } catch (e) { return def; } }
  function set(k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) { /* abaikan */ } }
  function parse(k, def) { try { return JSON.parse(get(k, null)); } catch (e) { return def; } }

  function loadProfiles() {
    var r = { ctl: {}, virt: {} };
    var o = parse('profiles2', null);
    if (o && typeof o === 'object') {
      ['ctl', 'virt'].forEach(function (k) {
        (o[k] || []).forEach(function (e) {
          var j = e.j;
          if (k === 'virt') { try { j = JSON.stringify(itemsToJson(itemsFromJson(JSON.parse(j)))); } catch (x) { /* biarkan */ } }
          r[k][e.n] = j;
        });
      });
    }
    return r;
  }
  function saveProfiles(pr, act) {
    var o = {};
    Object.keys(pr).forEach(function (k) { o[k] = Object.keys(pr[k]).map(function (n) { return { n: n, j: pr[k][n] }; }); });
    var ao = {}; Object.keys(act).forEach(function (k) { if (act[k] !== null && act[k] !== undefined) ao[k] = act[k]; });
    set('profiles2', JSON.stringify(o)); set('active2', JSON.stringify(ao));
  }
  function loadActive() { var o = parse('active2', {}) || {}; return { ctl: o.ctl === undefined ? null : o.ctl, virt: o.virt === undefined ? null : o.virt }; }

  return {
    mapToJson: mapToJson, mapFromJson: mapFromJson, itemsToJson: itemsToJson, itemsFromJson: itemsFromJson,
    get: get, set: set,
    saveMap: function (m) { set('map', JSON.stringify(mapToJson(m))); },
    loadMap: function () { return mapFromJson(parse('map', {})); },
    saveItems: function (l) { set('items', JSON.stringify(itemsToJson(l))); },
    loadItems: function () { return itemsFromJson(parse('items', [])); },
    loadProfiles: loadProfiles, saveProfiles: saveProfiles, loadActive: loadActive,
  };
})();
