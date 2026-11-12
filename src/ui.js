'use strict';
/* Antarmuka. Port dari Ui.kt, Virtual.kt, Sheets.kt, About.kt, Common.kt, Theme.kt (Android). */

// ------------------------------------------------------------------ tema (Theme.kt)
var DarkPal = { bg: '#070D14', bg2: '#0C1622', card: '#0E1822', ink: '#EAF2F8', mute: '#7F93A6', line: '#1F2B38', body: '#14202D', key: '#243446', ok: '#3DDC97', bad: '#FF6B6B', acc: '#19D3C5', acc2: '#8B7CFF', onAcc: '#04201E', bdf: '#273444', olc: '#4F6A93', rec: '#03060B', keyf: '#354151', mapf: '#1D5A62' };
var LightPal = { bg: '#EEF3F7', bg2: '#E6EDF3', card: '#FFFFFF', ink: '#0B1822', mute: '#5A6D7E', line: '#D0D9E1', body: '#DBE4EC', key: '#C5D2DE', ok: '#1F9D57', bad: '#D93A30', acc: '#0AA89C', acc2: '#6A5BE0', onAcc: '#FFFFFF', bdf: '#DFE7EE', olc: '#8FA4BB', rec: '#B4C1CE', keyf: '#C3CFDB', mapf: '#9DDCD6' };
var pal = DarkPal;
var darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  pal = darkMQ.matches ? DarkPal : LightPal;
  var st = document.documentElement.style;
  st.setProperty('--bg', pal.bg); st.setProperty('--bg2', pal.bg2); st.setProperty('--card', pal.card); st.setProperty('--ink', pal.ink);
  st.setProperty('--mute', pal.mute); st.setProperty('--line', pal.line); st.setProperty('--body', pal.body); st.setProperty('--key', pal.key);
  st.setProperty('--ok', pal.ok); st.setProperty('--bad', pal.bad); st.setProperty('--acc', pal.acc); st.setProperty('--acc2', pal.acc2); st.setProperty('--onacc', pal.onAcc);
  document.documentElement.style.colorScheme = darkMQ.matches ? 'dark' : 'light';
}
darkMQ.addEventListener('change', function () { applyTheme(); schedule(); });

// ------------------------------------------------------------------ helper
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function setHTML(el, html) { if (el._h !== html) { el._h = html; el.innerHTML = html; } }
function show(el, on, disp) { el.style.display = on ? (disp || '') : 'none'; }
var NBSP = '&nbsp;';

function seg(act, opts, sel, o) {
  o = o || {};
  return '<div class="seg' + (o.cls ? ' ' + o.cls : '') + '">' + opts.map(function (p) {
    var a = String(p[0]) === String(sel);
    return '<div class="' + (a ? 'sel' : '') + (o.dim && o.dim(p[0]) ? ' dim' : '') + '" data-act="' + act + '"' +
      (o.idx !== undefined ? ' data-i="' + o.idx + '"' : '') + ' data-v="' + esc(p[0]) + '">' + esc(p[1]) + '</div>';
  }).join('') + '</div>';
}
function dotHTML(color, size) { return '<i class="dot" style="background:' + color + (size ? ';width:' + size + 'px;height:' + size + 'px' : '') + '"></i>'; }

function batteryHTML(pct) {
  var c = pct <= 15 ? pal.bad : pct <= 40 ? '#FFC53D' : pal.ok;
  var bw = 19.8, inset = 2.4, fw = (bw - 2 * inset) * Math.max(0, Math.min(100, pct)) / 100;
  return '<svg width="22" height="12" viewBox="0 0 22 12" style="flex:none"><rect x="0.8" y="0.8" width="' + (bw - 1.6) + '" height="10.4" rx="3" fill="none" stroke="' + pal.mute + '" stroke-width="1.6"/>' +
    '<rect x="' + inset + '" y="' + inset + '" width="' + fw.toFixed(2) + '" height="' + (12 - 2 * inset) + '" rx="1.4" fill="' + c + '"/>' +
    '<rect x="' + (bw + 0.5) + '" y="3.6" width="1.7" height="4.8" rx="1" fill="' + pal.mute + '"/></svg>';
}

// ------------------------------------------------------------------ overlay: dialog, sheet, menu
var overlayStack = [];
function pushOverlay(el, onClose) {
  $('overlay').appendChild(el);
  var o = { el: el, onClose: onClose };
  overlayStack.push(o);
  return function close() {
    var i = overlayStack.indexOf(o); if (i < 0) return;
    overlayStack.splice(i, 1); el.remove();
    if (o.onClose) o.onClose();
  };
}
function closeTopOverlay() {
  var menu = document.querySelector('.menu'); if (menu) { menu.remove(); return true; }
  var o = overlayStack[overlayStack.length - 1]; if (!o) return false;
  o.el._close && o.el._close(); return true;
}

/** Dialog bergaya AlertDialog. build(box) mengisi isi; mengembalikan {close, box}. */
function openDialog(opts) {
  var scrim = document.createElement('div'); scrim.className = 'scrim center';
  var box = document.createElement('div'); box.className = opts.cls || 'dlg';
  scrim.appendChild(box);
  var close = pushOverlay(scrim, opts.onClose);
  scrim._close = close;
  scrim.addEventListener('mousedown', function (e) { if (e.target === scrim) close(); });
  box.addEventListener('click', function (e) { if (opts.onClick) opts.onClick(e, close); });
  var d = { close: close, box: box, render: function () { opts.render(box, close); } };
  d.render();
  return d;
}

function alertDialog(title, bodyHTML, buttons, onDismiss) {
  return openDialog({
    onClose: onDismiss,
    render: function (box) {
      box.innerHTML = '<h2>' + esc(title) + '</h2><div class="body">' + bodyHTML + '</div><div class="acts">' +
        buttons.map(function (b, i) { return '<button class="tbtn' + (b.bad ? ' bad' : '') + '" data-b="' + i + '"' + (b.disabled ? ' disabled' : '') + '>' + esc(b.text) + '</button>'; }).join('') + '</div>';
    },
    onClick: function (e, close) {
      var b = e.target.closest('[data-b]'); if (!b) return;
      var def = buttons[Number(b.dataset.b)]; if (def.onClick) def.onClick(close);
    },
  });
}

function openSheetShell() {
  var scrim = document.createElement('div'); scrim.className = 'scrim bottom';
  var sh = document.createElement('div'); sh.className = 'sheet'; scrim.appendChild(sh);
  var close = pushOverlay(scrim);
  scrim._close = close;
  scrim.addEventListener('mousedown', function (e) { if (e.target === scrim) close(); });
  return { sh: sh, close: close };
}

/** Menu dropdown kecil (DropdownMenu). */
function openMenu(anchor, opts, sel, onPick) {
  var old = document.querySelector('.menu'); if (old) old.remove();
  var m = document.createElement('div'); m.className = 'menu';
  m.innerHTML = opts.map(function (o, i) { return '<div data-i="' + i + '">' + esc(o[1]) + '</div>'; }).join('');
  document.body.appendChild(m);
  var r = anchor.getBoundingClientRect();
  var top = r.bottom + 2; if (top + m.offsetHeight > innerHeight - 8) top = Math.max(8, r.top - m.offsetHeight - 2);
  m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 8) + 'px'; m.style.top = top + 'px';
  function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', off, true); } }
  setTimeout(function () { document.addEventListener('mousedown', off, true); }, 0);
  m.addEventListener('click', function (e) {
    var it = e.target.closest('[data-i]'); if (!it) return;
    m.remove(); document.removeEventListener('mousedown', off, true); onPick(opts[Number(it.dataset.i)][0]);
  });
}

// ------------------------------------------------------------------ penjadwal render
var rafPending = false;
function schedule() { if (rafPending) return; rafPending = true; requestAnimationFrame(function () { rafPending = false; renderAll(); }); }
Bus.fn = schedule;

// ------------------------------------------------------------------ header & monitor (Ui.kt)
function headerHTML() {
  var c = S.ev3 === 'ON' ? 'var(--ok)' : S.ev3 === 'WAIT' ? 'var(--acc)' : 'var(--bad)';
  var txt = S.ev3 === 'ON' ? tr('Terhubung ke ', 'Connected to ') + S.ev3Name : S.ev3 === 'WAIT' ? tr('Menghubungkan…', 'Connecting…') : tr('Belum terhubung', 'Not connected');
  var bat = S.ev3 === 'ON' && S.battery !== null ? '<span class="bat">' + batteryHTML(S.battery) + '<span>' + S.battery + '%</span></span>' : '';
  return '<div class="hdr"><div class="t"><div class="title">EV3 <i>Direct Control</i></div>' +
    '<div class="status">' + dotHTML(c) + '<span class="txt">' + esc(txt) + '</span>' + bat + '</div></div>' +
    '<button class="obtn icon" data-act="settings" title="' + esc(tr('Pengaturan', 'Settings')) + '">⚙</button>' +
    (S.ev3 === 'ON'
      ? '<button class="obtn" data-act="disconnect">' + esc(tr('Putuskan', 'Disconnect')) + '</button>'
      : '<button class="btn" data-act="connect"' + (S.ev3 !== 'OFF' ? ' disabled' : '') + '>' + esc(tr('Hubungkan EV3', 'Connect EV3')) + '</button>') + '</div>';
}

function chipHTML(name, line1, line2, has, clickIdx, bar) {
  var barH = '';
  if (bar !== null && bar !== undefined) {
    var v = bar / 100;
    barH = '<div class="bar">' + (v >= 0
      ? '<b style="left:50%;width:' + (50 * v) + '%;background:var(--acc)"></b>'
      : '<b style="left:' + (50 + 50 * v) + '%;width:' + (-50 * v) + '%;background:var(--acc2)"></b>') + '</div>';
  }
  return '<div class="chip' + (has ? ' has' : '') + (clickIdx !== null ? ' click' : '') + '"' + (clickIdx !== null ? ' data-act="cycle" data-i="' + clickIdx + '"' : '') + '>' +
    '<div class="n"><i></i><span>' + esc(name) + '</span></div>' +
    '<div class="l1' + (line2 ? ' b' : '') + '">' + esc(line1) + '</div>' +
    '<div class="l2">' + (line2 ? esc(line2) : NBSP) + '</div>' + barH + '</div>';
}

function monitorHTML() {
  var on = S.ev3 === 'ON', h = '<div class="mono-lbl">Monitor EV3</div><div class="lbl">' + esc(tr('Port motor', 'Motor ports')) + '</div><div class="row4">';
  for (var i = 0; i < 4; i++) {
    var d = on ? S.motorPorts[i] : null, sp = S.speeds[i];
    h += chipHTML('ABCD'[i], !on ? '–' : d ? (sp > 0 ? '+' : '') + sp + '%' : tr('kosong', 'empty'), d ? devLabel(d) : null, !!d, null, d ? sp : null);
  }
  h += '</div><div class="lbl">' + esc(tr('Port sensor', 'Sensor ports')) + '</div><div class="row4">';
  var anyCycle = false;
  for (var j = 0; j < 4; j++) {
    var dv = on ? S.sensorPorts[j] : null, m = on ? sensorMode(j) : null;
    var l1 = !on ? '–' : !dv ? tr('kosong', 'empty') : m ? fmtSensor(m, sensorValue(j)) : devLabel(dv);
    var canCycle = !!dv && modesOf(dv).length > 1;
    h += chipHTML(String(j + 1), l1, m ? smLabel(m) : null, !!dv, canCycle ? j : null, null);
  }
  h += '</div>';
  if (on && S.sensorPorts.some(function (d) { return d && modesOf(d).length > 1; })) anyCycle = true;
  if (anyCycle) h += '<div class="lbl">' + esc(tr('Ketuk port sensor untuk mengganti jenis pengukuran', 'Tap a sensor port to change what it measures')) + '</div>';
  return h;
}

// ------------------------------------------------------------------ kartu mode
function modeTabsHTML() { return seg('tab', [[0, 'Controller'], [1, 'Virtual']], S.tab); }

function profRowHTML() {
  var kind = S.tab === 0 ? 'ctl' : 'virt', a = S.active[kind], dr = dirty(kind);
  var txt = a !== null ? tr('Profil: ', 'Profile: ') + a + (dr ? tr(' (belum disimpan)', ' (unsaved)') : '') : tr('Belum ada profil aktif', 'No active profile');
  return '<div class="bar-row"><div class="grow" title="' + esc(txt) + '">' + esc(txt) + '</div>' +
    (dr && a !== null ? '<button class="obtn sm" data-act="saveprof">' + esc(tr('Simpan perubahan', 'Save changes')) + '</button>' : '') +
    '<button class="obtn sm" data-act="profiles">' + esc(tr('Profil', 'Profiles')) + '</button>' +
    (S.tab === 1 ? '<button class="obtn sm" data-act="fullscreen">' + esc(tr('⛶ Layar penuh', '⛶ Fullscreen')) + '</button>' : '') + '</div>';
}

function padBarHTML() {
  return '<div class="bar-row g8"><div class="w190">' + seg('test', [[false, tr('Atur', 'Configure')], [true, tr('Uji input', 'Test input')]], S.testMode) + '</div>' +
    '<div class="pill">' + dotHTML(S.padOn ? 'var(--ok)' : 'var(--bad)', 7) + '<span>' + esc(S.padOn ? ctypeTitle(S.ctype) : '–') + '</span></div>' +
    '<div class="hint">' + esc(S.testMode ? tr('Tahan tombol atau geser stik untuk mencoba', 'Hold a button or drag a stick to try') : tr('Ketuk tombol untuk membuka pengaturan', 'Tap a button to open its settings')) + '</div></div>';
}
function padCountText() {
  var n = Object.keys(S.map).filter(function (k) { return S.map[k].motors.length > 0; }).length;
  return S.padOn ? (n > 0 ? n + ' ' + tr('tombol sudah diatur', 'buttons configured') : tr('Ketuk tombol untuk mengatur', 'Tap a button to configure')) : tr('Hubungkan controller melalui Bluetooth atau USB', 'Connect the controller via Bluetooth or USB');
}
function noPadHTML() {
  return '<svg width="90" height="90" viewBox="0 0 90 90" fill="none" stroke="' + pal.bad + '" stroke-width="18" stroke-linecap="round"><path d="M8 8 L82 82 M82 8 L8 82"/></svg>' +
    '<div class="lab">' + esc(tr('Controller belum terhubung', 'Controller not connected')) + '</div>';
}

function virtBarHTML() {
  return '<div class="bar-row g8"><div class="w190">' + seg('edit', [[true, '✎ Edit'], [false, tr('▶ Kontrol', '▶ Control')]], S.edit) + '</div><div class="scroll">' +
    (S.edit ? '<button class="obtn sm" data-act="add" data-v="BTN">' + esc(tr('+ Tombol', '+ Button')) + '</button><button class="obtn sm" data-act="add" data-v="SLIDER">+ Slider</button><button class="obtn sm" data-act="add" data-v="ANALOG">+ Analog</button>' : '') + '</div></div>';
}
function virtHintText() {
  return S.edit ? tr('Seret untuk memindah, tarik titik di pojok untuk mengubah ukuran, klik untuk mengatur. Pakai ⛶ untuk mengedit di layar penuh.',
    'Drag to move, pull the corner dot to resize, click to configure. Use ⛶ to edit in fullscreen.')
    : tr('Mode kontrol: sentuh atau tahan elemen untuk menggerakkan motor. Elemen redup = terkunci oleh syarat sensor.',
      'Control mode: touch or hold elements to drive motors. A dimmed element is locked by a sensor condition.');
}

// ------------------------------------------------------------------ kanvas controller (PadView.kt)
var padCv = null, padSize = { w: 0, h: 0 };
function layoutPad() {
  var wrap = $('padwrap'), skin = skinFor(S.ctype);
  var aw = wrap.clientWidth, ah = wrap.clientHeight; if (!aw || !ah) return false;
  var w = Math.floor(Math.min(aw, ah * (skin.vw / skin.vh))), h = Math.floor(w * skin.vh / skin.vw);
  var dpr = window.devicePixelRatio || 1;
  if (padSize.w !== w || padSize.h !== h || padSize.dpr !== dpr) {
    padSize = { w: w, h: h, dpr: dpr };
    padCv.style.width = w + 'px'; padCv.style.height = h + 'px';
    padCv.width = Math.round(w * dpr); padCv.height = Math.round(h * dpr);
  }
  return true;
}
function drawPad() {
  if (!layoutPad()) return;
  var ctx = padCv.getContext('2d'), skin = skinFor(S.ctype), dpr = padSize.dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, padSize.w, padSize.h);
  drawSkin(ctx, padSize.w, skin, pal, S.padKeys, function (p) { return !!S.map[p] && S.map[p].motors.length > 0; }, S.padAx);
  padCv.style.opacity = S.padOn ? 1 : 0.35;
}

function initPadCanvas() {
  padCv = $('padcv');
  new ResizeObserver(function () { schedule(); }).observe($('padwrap'));
  padCv.addEventListener('pointerdown', function (e) {
    if (!S.padOn) return;
    var skin = skinFor(S.ctype), r = padCv.getBoundingClientRect(), sc = r.width / skin.vw;
    function toSkin(ev) { return { x: (ev.clientX - r.left) / sc + skin.vx, y: (ev.clientY - r.top) / sc + skin.vy }; }
    var p0 = toSkin(e), hit = hitItem(skin, p0.x, p0.y);
    if (!S.testMode) { if (hit && hit.pad) openPadSheet(hit.pad); return; }
    if (!hit || !hit.pad) return;
    e.preventDefault();
    var pad = hit.pad, stickPad = (pad === 'LS' || pad === 'L3') ? 'LS' : (pad === 'RS' || pad === 'R3') ? 'RS' : null;
    padCv.setPointerCapture(e.pointerId);
    var id = e.pointerId, capDown = false, move = null;
    if (stickPad) {
      var c = skin.centers[stickPad];
      capDown = pad === 'L3' || pad === 'R3';
      if (capDown) padKey(pad, true);
      var upd = function (ev) {
        var q = toSkin(ev), x = (q.x - c.x) / skin.radius, y = -(q.y - c.y) / skin.radius, l = Math.hypot(x, y);
        if (l > 1) { x /= l; y /= l; }
        testStick(stickPad, x, y);
        if (capDown && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 14) { padKey(pad, false); capDown = false; }
      };
      upd(e); move = upd;
    } else padKey(pad, true);
    function onMove(ev) { if (ev.pointerId === id && move) move(ev); }
    function onUp(ev) {
      if (ev.pointerId !== id) return;
      padCv.removeEventListener('pointermove', onMove); padCv.removeEventListener('pointerup', onUp); padCv.removeEventListener('pointercancel', onUp);
      if (stickPad) { testStick(stickPad, 0, 0); if (capDown) padKey(pad, false); } else padKey(pad, false);
    }
    padCv.addEventListener('pointermove', onMove); padCv.addEventListener('pointerup', onUp); padCv.addEventListener('pointercancel', onUp);
  });
}

// ------------------------------------------------------------------ panggung virtual (Virtual.kt)
function Stage(host, fill) {
  var self = this;
  this.host = host; this.fill = fill; this.scale = 1; this.ws = MIN_STAGE_W; this.els = {};
  this.box = document.createElement('div'); this.box.className = 'stage' + (fill ? ' fill' : '');
  host.appendChild(this.box);
  this.emptyEl = document.createElement('div'); this.emptyEl.className = 'empty'; this.box.appendChild(this.emptyEl);
  new ResizeObserver(function () { schedule(); }).observe(host);
  this.sync = function (active) {
    var aw = host.clientWidth, ah = host.clientHeight; if (!aw || !ah) return;
    self.scale = Math.max(0.1, Math.min(ah / STAGE_H, aw / MIN_STAGE_W)); self.ws = aw / self.scale;
    if (active) S.stageW = self.ws;
    var sc = self.scale, b = self.box;
    b.style.width = aw + 'px'; b.style.height = (STAGE_H * sc) + 'px';
    if (S.edit) {
      var st = 16 * sc;
      b.style.backgroundImage = 'radial-gradient(circle,' + pal.line + ' 1.2px,transparent 1.6px)';
      b.style.backgroundSize = st + 'px ' + st + 'px'; b.style.backgroundPosition = (st - 1) + 'px ' + (st - 1) + 'px';
    } else b.style.backgroundImage = 'none';
    setHTML(self.emptyEl, S.items.length ? '' : esc(tr('Belum ada elemen. Klik + Tombol, + Slider, atau + Analog.', 'No elements yet. Click + Button, + Slider, or + Analog.')));
    show(self.emptyEl, !S.items.length, 'flex');
    var seen = {};
    S.items.forEach(function (it) {
      seen[it.id] = true;
      var key = it.id + ':' + S.edit + ':' + it.type, rec = self.els[it.id];
      if (!rec || rec.key !== key) { if (rec) rec.el.remove(); rec = self.els[it.id] = self.make(it, key); }
      self.update(rec, it);
    });
    Object.keys(self.els).forEach(function (id) { if (!seen[id]) { self.els[id].el.remove(); delete self.els[id]; } });
  };
}

Stage.prototype.make = function (it, key) {
  var self = this, el = document.createElement('div'); el.className = 'vitem' + (S.edit ? ' edit' : '');
  var rec = { key: key, el: el, id: it.id };
  if (it.type === 'BTN') { rec.btn = document.createElement('div'); rec.btn.className = 'vbtn'; el.appendChild(rec.btn); }
  else { rec.cv = document.createElement('canvas'); el.appendChild(rec.cv); rec.lab = document.createElement('div'); rec.lab.className = 'vlab'; el.appendChild(rec.lab); }
  if (S.edit) {
    rec.dash = document.createElement('div'); rec.dash.className = 'vdash'; el.appendChild(rec.dash);
    rec.handle = document.createElement('div'); rec.handle.className = 'vhandle'; el.appendChild(rec.handle);
    this.bindEdit(rec);
  } else this.bindControl(rec);
  this.box.appendChild(el);
  return rec;
};
function curItem(id) { return S.items.find(function (i) { return i.id === id; }); }

Stage.prototype.bindEdit = function (rec) {
  var self = this, el = rec.el;
  el.addEventListener('pointerdown', function (e) {
    if (e.target === rec.handle || e.button > 0) return;
    e.preventDefault(); el.setPointerCapture(e.pointerId);
    var sx = e.clientX, sy = e.clientY, lx = sx, ly = sy, dragging = false, id = e.pointerId;
    function mv(ev) {
      if (ev.pointerId !== id) return;
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { dragging = true; lx = sx; ly = sy; }
      if (dragging) { moveItem(rec.id, (ev.clientX - lx) / self.scale, (ev.clientY - ly) / self.scale); lx = ev.clientX; ly = ev.clientY; }
    }
    function up(ev) {
      if (ev.pointerId !== id) return;
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if (dragging) snapItem(rec.id); else if (ev.type === 'pointerup') openItemSheet(rec.id);
    }
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
  rec.handle.addEventListener('pointerdown', function (e) {
    e.preventDefault(); e.stopPropagation(); rec.handle.setPointerCapture(e.pointerId);
    var lx = e.clientX, ly = e.clientY, id = e.pointerId;
    function mv(ev) { if (ev.pointerId !== id) return; resizeItem(rec.id, (ev.clientX - lx) / self.scale, (ev.clientY - ly) / self.scale); lx = ev.clientX; ly = ev.clientY; }
    function up(ev) {
      if (ev.pointerId !== id) return;
      rec.handle.removeEventListener('pointermove', mv); rec.handle.removeEventListener('pointerup', up); rec.handle.removeEventListener('pointercancel', up);
      snapItem(rec.id);
    }
    rec.handle.addEventListener('pointermove', mv); rec.handle.addEventListener('pointerup', up); rec.handle.addEventListener('pointercancel', up);
  });
};

/** Gestur mode kontrol: tiap elemen punya gestur sendiri, jadi multi-sentuh bekerja. */
Stage.prototype.bindControl = function (rec) {
  var el = rec.el;
  el.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    e.preventDefault(); el.setPointerCapture(e.pointerId);
    var id = e.pointerId, item = curItem(rec.id); if (!item) return;
    var r = el.getBoundingClientRect(), w = r.width, h = r.height, m = Math.min(w, h) / 2;
    function calc(ev) {
      var px = ev.clientX - r.left, py = ev.clientY - r.top;
      if (item.type === 'BTN') return { down: true, x: 0, y: 0 };
      if (item.type === 'SLIDER') return { down: true, y: 0, x: w >= h ? clamp((px - m) / (w - 2 * m) * 2 - 1, -1, 1) : clamp(1 - (py - m) / (h - 2 * m) * 2, -1, 1) };
      var rr = m * 0.72, x = (px - w / 2) / rr, y = -(py - h / 2) / rr, l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { down: true, x: x, y: y };
    }
    var last = calc(e); setVin(rec.id, last);
    function mv(ev) { if (ev.pointerId === id) { last = calc(ev); setVin(rec.id, last); } }
    function up(ev) {
      if (ev.pointerId !== id) return;
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      var cur = curItem(rec.id) || item;
      setVin(rec.id, item.type === 'SLIDER' ? (cur.cfg.spring ? { down: false, x: 0, y: 0 } : { down: false, x: last.x, y: 0 }) : { down: false, x: 0, y: 0 });
    }
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
};

Stage.prototype.update = function (rec, it) {
  var sc = this.scale, ws = this.ws, el = rec.el;
  var input = S.vin[it.id] || { down: false, x: 0, y: 0 };
  var left = clamp(it.ar ? ws - it.x - it.w : it.x, 0, Math.max(0, ws - it.w)), top = clamp(it.y, 0, Math.max(0, STAGE_H - it.h));
  var W = it.w * sc, H = it.h * sc;
  el.style.left = left * sc + 'px'; el.style.top = top * sc + 'px'; el.style.width = W + 'px'; el.style.height = H + 'px';
  el.style.opacity = (!passes(it.cfg) && !S.edit) ? 0.35 : 1;
  if (rec.dash) rec.dash.style.borderRadius = it.type === 'ANALOG' ? Math.min(W, H) + 'px' : '14px';
  if (it.type === 'BTN') {
    var on = it.cfg.toggle ? S.vToggle.has(it.id) : input.down, b = rec.btn;
    b.style.borderRadius = 18 * sc + 'px'; b.style.background = on ? 'var(--grad)' : 'var(--key)';
    b.style.color = on ? '#04121A' : 'var(--ink)'; b.style.fontSize = Math.max(9, 14 * sc) + 'px';
    if (b._t !== it.name) { b._t = it.name; b.textContent = it.name; }
    return;
  }
  var dpr = window.devicePixelRatio || 1, cw = Math.round(W * dpr), ch = Math.round(H * dpr);
  if (rec.cv.width !== cw || rec.cv.height !== ch) { rec.cv.width = cw; rec.cv.height = ch; }
  var ctx = rec.cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  var m = Math.min(W, H) / 2, g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, pal.acc); g.addColorStop(1, pal.acc2);
  if (it.type === 'ANALOG') {
    var r = m * 0.72;
    ctx.fillStyle = pal.key; ctx.beginPath(); ctx.arc(W / 2, H / 2, m, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2 + input.x * r, H / 2 - input.y * r, m * 0.28, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = pal.key; ctx.beginPath(); ctx.roundRect(0, 0, W, H, m); ctx.fill();
    var horiz = W >= H, knobR = m * 0.62, pos = (input.x + 1) / 2;
    ctx.strokeStyle = pal.line; ctx.lineCap = 'round';
    ctx.beginPath();
    if (horiz) { ctx.lineWidth = H * 0.1; ctx.moveTo(m, H / 2); ctx.lineTo(W - m, H / 2); } else { ctx.lineWidth = W * 0.1; ctx.moveTo(W / 2, m); ctx.lineTo(W / 2, H - m); }
    ctx.stroke(); ctx.fillStyle = g; ctx.beginPath();
    if (horiz) ctx.arc(m + pos * (W - 2 * m), H / 2, knobR, 0, Math.PI * 2); else ctx.arc(W / 2, H - m - pos * (H - 2 * m), knobR, 0, Math.PI * 2);
    ctx.fill();
  }
  var lab = rec.lab; if (lab._t !== it.name) { lab._t = it.name; lab.textContent = it.name; }
  lab.style.fontSize = Math.max(7, 10 * sc) + 'px';
  if (it.type === 'ANALOG') { lab.style.left = '0'; lab.style.right = '0'; lab.style.textAlign = 'center'; lab.style.bottom = 8 * sc + 'px'; lab.style.top = 'auto'; }
  else { lab.style.left = 12 * sc + 'px'; lab.style.right = 'auto'; lab.style.textAlign = 'left'; lab.style.top = 4 * sc + 'px'; lab.style.bottom = 'auto'; }
};

var stageMain = null, stageFull = null;

// ------------------------------------------------------------------ layar penuh
function fullTopHTML() {
  var on = S.ev3 === 'ON', h = '<div class="scroll">';
  if (S.edit) h += '<button class="obtn sm" data-act="add" data-v="BTN">' + esc(tr('+ Tombol', '+ Button')) + '</button><button class="obtn sm" data-act="add" data-v="SLIDER">+ Slider</button><button class="obtn sm" data-act="add" data-v="ANALOG">+ Analog</button>';
  h += '<div class="mini">' + dotHTML(on ? 'var(--ok)' : 'var(--bad)') + 'EV3</div>';
  if (on && S.battery !== null) h += '<div class="mini" style="border-color:color-mix(in srgb,var(--ok) 40%,transparent)">' + batteryHTML(S.battery) + '<b>' + S.battery + '%</b></div>';
  if (on && !S.edit) {
    for (var i = 0; i < 4; i++) if (S.motorPorts[i]) { var sp = S.speeds[i]; h += '<div class="mini' + (sp !== 0 ? ' hot' : '') + '">' + 'ABCD'[i] + '<b>' + (sp > 0 ? '+' : '') + sp + '%</b></div>'; }
    for (var j = 0; j < 4; j++) { var m = sensorMode(j); if (m) h += '<div class="mini sensor">' + (j + 1) + '<b>' + esc(fmtSensor(m, sensorValue(j))) + '</b></div>'; }
  }
  h += '</div><div class="w150">' + seg('edit', [[true, '✎ Edit'], [false, tr('▶ Kontrol', '▶ Control')]], S.edit) + '</div><div class="xbtn" data-act="exitfull">✕</div>';
  return h;
}

// ------------------------------------------------------------------ render semua
function renderAll() {
  document.body.classList.toggle('fs', S.fullscreen);
  if (S.fullscreen) {
    setHTML($('fulltop'), fullTopHTML());
    stageFull.sync(true);
  } else {
    setHTML($('hdr'), headerHTML());
    setHTML($('monitor'), monitorHTML());
    setHTML($('modetabs'), modeTabsHTML());
    setHTML($('profrow'), profRowHTML());
    var ctl = S.tab === 0;
    show($('padsec'), ctl, 'flex'); show($('virtsec'), !ctl, 'flex');
    if (ctl) {
      setHTML($('padbar'), padBarHTML());
      setHTML($('padcount'), esc(padCountText()));
      var np = $('nopad'); setHTML(np, noPadHTML()); show(np, !S.padOn, 'flex');
      drawPad();
    } else {
      setHTML($('virtbar'), virtBarHTML());
      setHTML($('virthint'), esc(virtHintText()));
      stageMain.sync(true);
    }
  }
  checkError();
}

// ------------------------------------------------------------------ sheet pengaturan satu tombol/elemen (Sheets.kt)
function switchRow(k, title, sub, on) {
  return '<div class="sw-row"><div class="tx"><div>' + esc(title) + '</div><div class="lbl">' + esc(sub) + '</div></div><div class="switch' + (on ? ' on' : '') + '" data-k="' + k + '"></div></div>';
}
function lbl(t) { return '<div class="lbl">' + esc(t) + '</div>'; }

function condDefaults(sensor, m, enable) {
  var v = { dist: 20, dist_in: 8, refl: 50, amb: 50, prox: 50, ang: 0, rate: 0 }[m.key];
  return newCond({ enable: enable, sensor: sensor, field: m.key, op: m.type === 0 ? 'GT' : 'EQ', value: v === undefined ? 1 : v });
}
function defaultCond(sensor, keep) {
  var d = S.sensorPorts[sensor], ms = d ? modesOf(d) : [];
  return ms.length ? condDefaults(sensor, ms[0], keep ? keep.enable : true) : newCond({ sensor: sensor });
}

function openKeySheet(o) {
  var kind = o.kind, init = o.initial;
  var st = {
    toggle: init ? init.toggle : false, spring: init ? init.spring : true, name: o.nameInit || '',
    motors: init ? init.motors.map(function (m) { return Object.assign({}, m); }) : [newMotor({ speed: kind === 'BTN' ? 'FIXED' : 'PROP' })],
    conds: init ? init.conds.map(function (c) { return Object.assign({}, c); }) : [],
  };
  var shell = openSheetShell(), sh = shell.sh, drops = {};

  function motorCard(m, i) {
    var an = kind !== 'BTN', ev3On = S.ev3 === 'ON';
    var h = '<div class="box"><div class="h"><span>Motor ' + (i + 1) + '</span>' + (st.motors.length > 1 ? '<button class="tbtn bad" data-k="mrm" data-i="' + i + '">' + esc(tr('Hapus', 'Remove')) + '</button>' : '') + '</div>';
    h += lbl(tr('Port motor', 'Motor port')) + seg('port', [[0, 'A'], [1, 'B'], [2, 'C'], [3, 'D']], m.port, { idx: i, dim: function (v) { return ev3On && !S.motorPorts[v]; } });
    if (kind === 'STICK' || kind === 'ANALOG') {
      h += lbl(tr('Digerakkan oleh sumbu', 'Driven by axis')) + seg('axis', [['H', tr('Horizontal (kiri-kanan)', 'Horizontal (left-right)')], ['V', tr('Vertikal (atas-bawah)', 'Vertical (up-down)')]], m.axis, { idx: i });
      h += lbl(tr('Tiap motor punya sumbu sendiri. Tambah motor lain untuk sumbu yang berbeda.', 'Each motor has its own axis. Add another motor for a different axis.'));
    }
    h += lbl(tr('Arah putaran', 'Rotation direction')) + seg('cw', [[true, tr('↻ Searah jarum jam', '↻ Clockwise')], [false, tr('↺ Berlawanan', '↺ Counterclockwise')]], m.cw, { idx: i });
    if (an && kind !== 'TRIG') h += lbl(tr('Berlaku saat bergerak ke kanan atau atas. Ke kiri atau bawah otomatis berlawanan.', 'Applies when moved right or up. Left or down reverses automatically.'));
    if (an) {
      h += lbl(tr('Mode kecepatan', 'Speed mode')) + seg('speed', [['FIXED', tr('Tetap', 'Fixed')], ['PROP', tr('Ikuti gerakan', 'Follow movement')]], m.speed, { idx: i });
      h += lbl(m.speed === 'PROP' ? tr('Makin jauh digerakkan, makin cepat. Power di bawah jadi batas maksimum.', 'The further it moves, the faster the motor. Power below becomes the maximum.')
        : tr('Begitu digerakkan, motor langsung berputar di power yang ditentukan.', 'As soon as it moves, the motor runs at the power you set.'));
    }
    h += '<div class="pw"><span class="lbl">' + esc(an && m.speed === 'PROP' ? tr('Power maksimum', 'Maximum power') : 'Power') + '</span><b data-pwl="' + i + '">' + m.power + '%</b></div>';
    h += '<input type="range" min="1" max="100" step="1" value="' + m.power + '" data-k="power" data-i="' + i + '">';
    h += lbl(tr('Saat dilepas', 'When released')) + seg('stop', [['HOLD', 'Hold'], ['BRAKE', 'Brake'], ['FLOAT', 'Float']], m.stop, { idx: i });
    return h + '</div>';
  }

  function dropEl(id, label, opts, sel, onSel) { drops[id] = { opts: opts, sel: sel, onSel: onSel }; return '<div class="drop" data-d="' + id + '">' + esc(label) + ' ▾</div>'; }
  function labelOf(opts, sel) { var f = opts.find(function (o) { return o[0] === sel; }); return f ? f[1] : '–'; }

  function condCard() {
    var sens = [0, 1, 2, 3].filter(function (i) { return S.sensorPorts[i] && modesOf(S.sensorPorts[i]).length; });
    if ((S.ev3 !== 'ON' || !sens.length) && !st.conds.length) return '';
    var kw = { BTN: tr('tombol', 'button'), SLIDER: 'slider', ANALOG: 'analog', TRIG: 'trigger', STICK: tr('stik', 'stick') }[kind];
    var h = '<div class="box"><div class="h">' + esc(tr('Syarat sensor', 'Sensor condition')) + '</div>' + lbl(tr('Kontrol hanya aktif atau nonaktif tergantung nilai sensor.', 'Control is enabled or disabled depending on a sensor value.'));
    st.conds.forEach(function (c, idx) {
      var dev = S.sensorPorts[c.sensor], ms = dev ? modesOf(dev) : [];
      var m = ms.find(function (x) { return x.key === c.field; }) || ms[0];
      h += '<div class="flex">';
      if (!dev || !m) h += '<span class="tx" style="color:var(--mute)">' + esc(tr('Sensor ' + (c.sensor + 1) + ' tidak terhubung', 'Sensor ' + (c.sensor + 1) + ' not connected')) + '</span>';
      else {
        var enOpts = [[true, tr('Aktifkan', 'Enable')], [false, tr('Nonaktifkan', 'Disable')]];
        h += dropEl('e' + idx, labelOf(enOpts, c.enable), enOpts, c.enable, function (v) { st.conds[idx] = Object.assign({}, c, { enable: v }); });
        h += '<span class="tx">' + esc(kw + ' ' + tr('jika sensor', 'if sensor')) + '</span>';
        var sOpts = sens.map(function (s) { return [s, (s + 1) + ' · ' + devLabel(S.sensorPorts[s])]; });
        h += dropEl('s' + idx, labelOf(sOpts, c.sensor), sOpts, c.sensor, function (s) { st.conds[idx] = defaultCond(s, c); });
        if (ms.length > 1) {
          var mOpts = ms.map(function (x) { return [x.key, smLabel(x)]; });
          h += dropEl('m' + idx, labelOf(mOpts, m.key), mOpts, m.key, function (k) { st.conds[idx] = condDefaults(c.sensor, ms.find(function (x) { return x.key === k; }), c.enable); });
        } else h += '<span class="tx">' + esc(smLabel(m)) + '</span>';
        var ops = (m.type === 0 ? ['GT', 'LT', 'EQ', 'LE', 'GE'] : ['EQ', 'NE']).map(function (x) { return [x, CMP_SYM[x]]; });
        h += dropEl('o' + idx, CMP_SYM[c.op] || '>', ops, c.op, function (v) { st.conds[idx] = Object.assign({}, c, { op: v }); });
        if (m.type === 0) {
          h += '<input class="num" inputmode="decimal" data-k="cval" data-i="' + idx + '" value="' + esc(fmtNum(c.value)) + '">';
          if (m.unit) h += '<span class="tx">' + esc(m.unit) + '</span>';
        } else if (m.type === 1) {
          var cOpts = [1, 2, 3, 4, 5, 6, 7].map(function (n) { return [n, colorName(n)]; });
          h += dropEl('v' + idx, labelOf(cOpts, c.value), cOpts, c.value, function (v) { st.conds[idx] = Object.assign({}, c, { value: v }); });
        } else {
          var tOpts = [[1, tr('ditekan', 'pressed')], [0, tr('dilepas', 'released')]];
          h += dropEl('v' + idx, labelOf(tOpts, c.value), tOpts, c.value, function (v) { st.conds[idx] = Object.assign({}, c, { value: v }); });
        }
      }
      h += '<button class="tbtn bad" data-k="crm" data-i="' + idx + '" style="font-size:18px;padding:0 10px">×</button></div>';
    });
    if (sens.length) h += '<div><button class="obtn" style="font-size:13px" data-k="cadd">' + esc(tr('+ Tambah syarat sensor', '+ Add sensor condition')) + '</button></div>';
    return h + '</div>';
  }

  function render() {
    var top = sh.scrollTop; drops = {};
    var kindTxt = { BTN: tr('Tombol digital', 'Digital button'), TRIG: tr('Trigger analog, kecepatan mengikuti tekanan', 'Analog trigger, speed follows how far it is pressed'),
      STICK: tr('Stik analog, kecepatan mengikuti sudut', 'Analog stick, speed follows how far it is tilted'), SLIDER: tr('Slider virtual', 'Virtual slider'), ANALOG: tr('Analog virtual', 'Virtual analog') }[kind];
    var h = '<div class="handle"></div>';
    h += o.nameInit !== null && o.nameInit !== undefined
      ? '<div class="tf" style="margin-top:8px"><label>' + esc(tr('Nama elemen', 'Element name')) + '</label><input data-k="name" value="' + esc(st.name) + '"></div>'
      : '<h3>' + esc(o.title) + '</h3>';
    h += lbl(kindTxt);
    if (kind === 'BTN') h += switchRow('toggle', tr('Mode toggle', 'Toggle mode'), tr('Tekan sekali untuk menyala, tekan lagi untuk berhenti', 'Press once to start, press again to stop'), st.toggle);
    if (kind === 'SLIDER') h += switchRow('spring', tr('Kembali ke tengah', 'Return to center'), tr('Slider kembali ke 0 saat dilepas', 'Slider returns to 0 when released'), st.spring);
    st.motors.forEach(function (m, i) { h += motorCard(m, i); });
    if (st.motors.length < 4) h += '<button class="obtn full" data-k="madd">' + esc(tr('+ Tambah motor', '+ Add motor')) + '</button>';
    h += condCard();
    h += '<div class="actrow"><button class="obtn" data-k="del">' + esc(o.deleteLabel) + '</button><button class="btn" data-k="save">' + esc(tr('Simpan', 'Save')) + '</button></div>';
    sh.innerHTML = h; sh.scrollTop = top;
  }

  sh.addEventListener('click', function (e) {
    var d = e.target.closest('[data-d]');
    if (d) { var def = drops[d.dataset.d]; openMenu(d, def.opts, def.sel, function (v) { def.onSel(v); render(); }); return; }
    var s = e.target.closest('[data-act]');
    if (s) {
      var i = Number(s.dataset.i), v = s.dataset.v, m = st.motors[i], a = s.dataset.act;
      if (a === 'port') m.port = Number(v); else if (a === 'axis') m.axis = v; else if (a === 'cw') m.cw = v === 'true';
      else if (a === 'speed') m.speed = v; else if (a === 'stop') m.stop = v;
      render(); return;
    }
    var k = e.target.closest('[data-k]'); if (!k) return;
    var key = k.dataset.k, idx = Number(k.dataset.i);
    if (key === 'toggle') { st.toggle = !st.toggle; render(); }
    else if (key === 'spring') { st.spring = !st.spring; render(); }
    else if (key === 'mrm') { st.motors.splice(idx, 1); render(); }
    else if (key === 'madd') {
      var used = st.motors.map(function (m) { return m.port; }), free = [0, 1, 2, 3].filter(function (p) { return used.indexOf(p) < 0; });
      var last = st.motors[st.motors.length - 1];
      var n = newMotor({ port: free.length ? free[0] : 0, speed: last.speed });
      if (kind === 'STICK' || kind === 'ANALOG') n.axis = last.axis === 'V' ? 'H' : 'V';
      st.motors.push(n); render();
    }
    else if (key === 'cadd') { var sens = [0, 1, 2, 3].filter(function (i2) { return S.sensorPorts[i2] && modesOf(S.sensorPorts[i2]).length; }); st.conds.push(defaultCond(sens[0])); render(); }
    else if (key === 'crm') { st.conds.splice(idx, 1); render(); }
    else if (key === 'del') { shell.close(); o.onDelete(); }
    else if (key === 'save') { shell.close(); o.onSave(newCfg({ toggle: st.toggle && kind === 'BTN', motors: st.motors.map(function (m) { return Object.assign({}, m); }), conds: st.conds.map(function (c) { return Object.assign({}, c); }), spring: st.spring }), st.name); }
  });
  sh.addEventListener('input', function (e) {
    var k = e.target.dataset.k, i = Number(e.target.dataset.i);
    if (k === 'power') { st.motors[i].power = Number(e.target.value); var l = sh.querySelector('[data-pwl="' + i + '"]'); if (l) l.textContent = e.target.value + '%'; }
    else if (k === 'name') st.name = e.target.value;
    else if (k === 'cval') { var f = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(f)) st.conds[i].value = f; }
  });
  render();
}

function openPadSheet(p) {
  openKeySheet({
    title: padLabelFor(p, S.ctype), kind: padKind(p), initial: S.map[p] || null, nameInit: null,
    deleteLabel: tr('Hapus pengaturan', 'Clear settings'),
    onSave: function (c) { saveKey(p, c); }, onDelete: function () { saveKey(p, null); },
  });
}
function openItemSheet(id) {
  var it = curItem(id); if (!it) return;
  openKeySheet({
    title: it.name, kind: it.type, initial: it.cfg, nameInit: it.name, deleteLabel: tr('Hapus elemen', 'Delete element'),
    onSave: function (c, n) { updateItem(id, n, c); }, onDelete: function () { removeItem(id); },
  });
}

// ------------------------------------------------------------------ profil
function openProfilesSheet(kind) {
  var shell = openSheetShell(), sh = shell.sh, virt = kind === 'virt';
  function render() {
    var list = S.profiles[kind] || {}, names = Object.keys(list), top = sh.scrollTop;
    var h = '<div class="handle"></div><h3>' + esc(virt ? tr('Profil virtual', 'Virtual profiles') : tr('Profil controller', 'Controller profiles')) + '</h3>';
    h += lbl(virt ? tr('Simpan layout dan setelan elemen dengan nama, lalu muat kembali kapan saja. Untuk mengedit: muat profil, ubah, lalu klik Simpan perubahan.', 'Save the layout and element settings under a name and load them any time. To edit: load a profile, change it, then click Save changes.')
      : tr('Simpan setelan tombol dengan nama, lalu muat kembali kapan saja. Untuk mengedit: muat profil, ubah tombolnya, lalu klik Simpan perubahan.', 'Save your button settings under a name and load them any time. To edit: load a profile, change the buttons, then click Save changes.'));
    h += '<button class="btn full" data-k="save">' + esc(tr('Simpan setelan saat ini', 'Save current settings')) + '</button>';
    if (!names.length) h += lbl(tr('Belum ada profil tersimpan.', 'No saved profiles yet.'));
    names.forEach(function (n) {
      var act = n === S.active[kind], cnt = countOf(kind, list[n]);
      h += '<div class="box' + (act ? ' act' : '') + '" style="gap:8px"><div class="h">' + esc(n) + '</div>' +
        lbl(cnt + ' ' + (virt ? tr('elemen', 'elements') : tr('tombol diatur', 'buttons configured')) + (act ? tr(' • aktif', ' • active') : '')) +
        '<div class="actrow" style="gap:6px"><button class="btn" data-k="load" data-n="' + esc(n) + '" style="padding:0 6px">' + esc(tr('Muat', 'Load')) + '</button>' +
        '<button class="obtn" data-k="ren" data-n="' + esc(n) + '" style="padding:0 6px;font-size:13px">' + esc(tr('Ganti nama', 'Rename')) + '</button>' +
        '<button class="obtn red" data-k="del" data-n="' + esc(n) + '" style="padding:0 6px;font-size:13px">' + esc(tr('Hapus', 'Delete')) + '</button></div></div>';
    });
    sh.innerHTML = h; sh.scrollTop = top;
  }
  function nameDialog(title, label, init, okText, onOk, existsCheck) {
    var val = init, err = false;
    var dlg = openDialog({
      render: function (box) {
        var ex = existsCheck ? existsCheck(val) : null;
        box.innerHTML = '<h2>' + esc(title) + '</h2><div class="body"><div class="tf" style="margin-top:6px"><label>' + esc(label) + '</label><input data-i="nm" value="' + esc(val) + '"></div>' +
          (ex ? '<div class="lbl">' + esc(ex) + '</div>' : '') + (err ? '<div style="font-size:12px;color:var(--bad)">' + esc(tr('Nama kosong atau sudah dipakai profil lain.', 'Name is empty or already used by another profile.')) + '</div>' : '') +
          '</div><div class="acts"><button class="tbtn" data-b="0">' + esc(tr('Batal', 'Cancel')) + '</button><button class="tbtn" data-b="1"' + (val.trim() ? '' : ' disabled') + '>' + esc(okText) + '</button></div>';
        var inp = box.querySelector('input'); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
        inp.addEventListener('input', function () { val = inp.value; err = false; var b = box.querySelector('[data-b="1"]'); b.disabled = !val.trim(); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && val.trim()) box.querySelector('[data-b="1"]').click(); });
      },
      onClick: function (e, close) {
        var b = e.target.closest('[data-b]'); if (!b) return;
        if (b.dataset.b === '0') close();
        else if (onOk(val, close) === false) { err = true; dlg.render(); }
      },
    });
  }
  sh.addEventListener('click', function (e) {
    var k = e.target.closest('[data-k]'); if (!k) return;
    var n = k.dataset.n, key = k.dataset.k;
    if (key === 'save') {
      nameDialog(tr('Simpan profil', 'Save profile'), tr('Nama profil', 'Profile name'), S.active[kind] || '', tr('Simpan', 'Save'),
        function (v, close) { saveProfile(kind, v); close(); render(); },
        function (v) { return v.trim() in S.profiles[kind] ? tr('Nama sudah ada, profil akan ditimpa.', 'Name already exists; the profile will be overwritten.') : null; });
    } else if (key === 'load') { loadProfile(kind, n); shell.close(); }
    else if (key === 'ren') {
      nameDialog(tr('Ganti nama profil', 'Rename profile'), tr('Nama baru', 'New name'), n, tr('Simpan', 'Save'),
        function (v, close) { if (renameProfile(kind, n, v)) { close(); render(); return true; } return false; });
    } else if (key === 'del') {
      alertDialog(tr('Hapus profil?', 'Delete profile?'), esc(tr('Profil "' + n + '" akan dihapus permanen.', 'Profile "' + n + '" will be deleted permanently.')), [
        { text: tr('Batal', 'Cancel'), onClick: function (c) { c(); } },
        { text: tr('Hapus', 'Delete'), bad: true, onClick: function (c) { deleteProfile(kind, n); c(); render(); } },
      ]);
    }
  });
  render();
}

// ------------------------------------------------------------------ dialog: pengaturan, about, pemilih EV3, error
function openSettings() {
  var dlg = openDialog({
    render: function (box) {
      box.innerHTML = '<h2>' + esc(tr('Pengaturan', 'Settings')) + '</h2><div class="body">' +
        lbl(tr('Bahasa', 'Language')) + seg('lang', [['id', 'Indonesia'], ['en', 'English']], Lang.code) +
        '<div style="height:2px"></div>' + lbl(tr('Jenis controller', 'Controller type')) +
        seg('ctype', [['auto', tr('Otomatis', 'Auto')], ['ds4', 'DualShock'], ['xbox', 'Xbox'], ['joycon', 'Joy-Con']], S.ctypePref) +
        '<div style="height:4px"></div><button class="obtn full" data-b="about">About this app</button></div>' +
        '<div class="acts"><button class="tbtn" data-b="close">' + esc(tr('Tutup', 'Close')) + '</button></div>';
    },
    onClick: function (e, close) {
      var s = e.target.closest('[data-act]');
      if (s) { if (s.dataset.act === 'lang') setLang(s.dataset.v); else chooseCtype(s.dataset.v); dlg.render(); return; }
      var b = e.target.closest('[data-b]'); if (!b) return;
      if (b.dataset.b === 'close') close(); else { close(); openAbout(); }
    },
  });
}

var IG_URL = 'https://www.instagram.com/hfeez_ap', SAWERIA_URL = 'https://saweria.co/feexxyz', TRAKTEER_URL = 'https://trakteer.id/hfeez_ap';
function openAbout() {
  openDialog({
    cls: 'about',
    render: function (box) {
      box.innerHTML = '<img src="assets/about_icon.png" alt="">' +
        '<div class="ttl">EV3 <i>Direct Control</i></div><div class="mono-lbl">About this app</div>' +
        '<p>EV3 Direct Control is an open-source project created to bridge the gap between your favorite controller and the LEGO Mindstorms EV3.</p>' +
        '<div class="blk"><div class="mono-lbl">Developed by</div><div class="dev">Hafiz Ari Putra</div><p>Proudly made in 🇮🇩 Indonesia with passion for robotics and gaming.</p></div>' +
        '<p style="color:var(--mute)">If you find this app helpful for your projects, creations, or classrooms, please consider supporting its development!</p>' +
        '<div class="blk"><p style="font-weight:600;font-size:14px">💬 Let\'s Connect:</p><p style="color:var(--mute)">Follow me on Instagram for updates and more projects:</p><p>👉 <a data-url="' + IG_URL + '">@hfeez_ap</a></p></div>' +
        '<div class="blk"><p style="font-weight:600;font-size:14px">☕ Support My Work:</p><p style="color:var(--mute)">If you love this app and want to buy me a coffee, you can donate here:</p>' +
        '<p>👉 Donate via <a data-url="' + SAWERIA_URL + '">Saweria</a> <span style="color:var(--mute)">/</span> <a data-url="' + TRAKTEER_URL + '">Trakteer</a></p></div>' +
        '<p>Thank you for using the app, and happy building! 🤖🎮</p><button class="btn full" data-b="x">Close</button>';
    },
    onClick: function (e, close) {
      var a = e.target.closest('[data-url]'); if (a) { if (native) native.openExternal(a.dataset.url); return; }
      if (e.target.closest('[data-b]')) close();
    },
  });
}

async function openDevicePicker() {
  var r = native ? await native.listPorts() : { ok: true, v: [] };
  var devs = r.ok ? r.v : [];
  var plat = 'other';
  alertDialog(tr('Pilih EV3', 'Select EV3'),
    devs.length ? '<div style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto">' + devs.map(function (d, i) { return '<button class="obtn acc" style="width:100%;justify-content:flex-start" data-dev="' + i + '">' + esc(d.label) + '</button>'; }).join('') + '</div>'
      : esc(tr('Belum ada port Bluetooth dari perangkat yang dipasangkan. Pasangkan EV3 dulu di Pengaturan Bluetooth komputer (PIN default 1234), lalu buka lagi daftar ini.',
        'No Bluetooth serial ports from paired devices yet. Pair the EV3 in your computer\'s Bluetooth settings first (default PIN 1234), then reopen this list.')),
    [
      { text: tr('Pengaturan Bluetooth', 'Bluetooth settings'), onClick: function () { if (native) native.btSettings(); } },
      { text: tr('Batal', 'Cancel'), onClick: function (c) { c(); } },
    ]).box.addEventListener('click', function (e) {
    var b = e.target.closest('[data-dev]'); if (!b) return;
    var d = devs[Number(b.dataset.dev)];
    closeTopOverlay(); connect(d.path, d.name);
  });
}

var errDlg = null, errShown = null;
function checkError() {
  if (S.error && errShown !== S.error) {
    errShown = S.error; var msg = S.error;
    errDlg = alertDialog(tr('Perhatian', 'Notice'), esc(tr(msg.id, msg.en)), [{ text: 'OK', onClick: function (c) { c(); } }], function () { S.error = null; errShown = null; });
  }
}

// ------------------------------------------------------------------ penghubung event
var ACTIONS = {
  settings: function () { openSettings(); },
  connect: function () { openDevicePicker(); },
  disconnect: function () { disconnect(); },
  cycle: function (v, el) { cycleSensor(Number(el.dataset.i)); },
  tab: function (v) { selectTab(Number(v)); },
  test: function (v) { changeTestMode(v === 'true'); },
  edit: function (v) { changeEdit(v === 'true'); },
  add: function (v) { addItem(v); },
  saveprof: function () { var k = S.tab === 0 ? 'ctl' : 'virt'; if (S.active[k] !== null) saveProfile(k, S.active[k]); },
  profiles: function () { openProfilesSheet(S.tab === 0 ? 'ctl' : 'virt'); },
  fullscreen: function () { setFullscreen(true); },
  exitfull: function () { setFullscreen(false); },
};

document.addEventListener('click', function (e) {
  if (e.target.closest('#overlay')) return; // dialog/sheet menangani klik sendiri
  var el = e.target.closest('[data-act]'); if (!el) return;
  var f = ACTIONS[el.dataset.act]; if (f) f(el.dataset.v, el);
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { if (!closeTopOverlay() && S.fullscreen) setFullscreen(false); }
  else if (e.key === 'F11') { e.preventDefault(); if (S.tab === 1) setFullscreen(!S.fullscreen); }
});
document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

// ------------------------------------------------------------------ mulai
function boot() {
  applyTheme();
  initState();
  stageMain = new Stage($('stagemain'), false);
  stageFull = new Stage($('stagefull'), true);
  initPadCanvas();
  if (native) native.onLost(onLinkLost);
  startGamepad();
  window.addEventListener('resize', schedule);
  renderAll();
  openAbout(); // tampil saat aplikasi dibuka
}
boot();
