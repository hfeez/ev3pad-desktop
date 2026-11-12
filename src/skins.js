'use strict';
/* Gambar controller (DualShock 4, Xbox, Joy-Con). Port dari Skins.kt dan PadView.kt (Android). Butuh skin_paths.js. */

var CTYPES = ['DS4', 'XBOX', 'JOYCON'];
function ctypeTitle(t) { return t === 'DS4' ? 'DualShock 4' : t === 'XBOX' ? 'Xbox' : 'Joy-Con (L+R)'; }

// ---- bentuk: path SVG, lingkaran, persegi bersudut bulat
function shpPath(d) { return { kind: 0, path: new Path2D(d) }; }
function shpCircle(x, y, r) { var p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2); return { kind: 1, x: x, y: y, r: r, path: p }; }
function shpRect(x, y, w, h, r) { var p = new Path2D(); p.roundRect(x, y, w, h, r); return { kind: 2, x: x, y: y, w: w, h: h, r: r, path: p }; }
var SHP_NONE = { kind: 3 };

var hitCtx = (function () { var c = document.createElement('canvas'); c.width = c.height = 1; return c.getContext('2d'); })();
function shpContains(s, px, py) {
  var tol = 6;
  switch (s.kind) {
    case 0: return hitCtx.isPointInPath(s.path, px, py);
    case 1: return (px - s.x) * (px - s.x) + (py - s.y) * (py - s.y) <= (s.r + tol) * (s.r + tol);
    case 2: return px >= s.x - tol && px <= s.x + s.w + tol && py >= s.y - tol && py <= s.y + s.h + tol;
    default: return false;
  }
}

// ---- elemen gambar
function K(st, shp, pad, o) { o = o || {}; return { st: st, shp: shp, pad: pad, color: o.color || null, label: o.label || null, lx: o.lx || 0, ly: o.ly || 0, ls: o.ls || 44, cap: o.cap || null, sym: o.sym || null, symSt: o.symSt || 'ICON' }; }
function D(st, shp, o) { return K(st, shp, null, o); }

function makeSkin(vx, vy, vw, vh, items, travel, radius, centers) {
  return { vx: vx, vy: vy, vw: vw, vh: vh, items: items, travel: travel, radius: radius, centers: centers, keys: items.filter(function (i) { return i.pad; }).reverse() };
}

function mir(d, axis) { return d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, function (m, a, b) { return (axis - parseFloat(a)) + ' ' + b; }); }

var C_TRI = '#3DE0C0', C_SQR = '#D27AF2', C_CIR = '#FF6B7A', C_CRS = '#6A8FFF';

function ds4() {
  var l2 = 'M345 392 C350 330 400 295 470 292 C530 292 575 320 590 385 Z';
  var l1 = 'M332 452 C332 408 365 384 420 382 L520 384 C575 386 600 408 602 452 Z';
  var gr = 'M66 1432 C130 1565 420 1628 500 1592';
  var a = 2256, l = [];
  l.push(K('KEY', shpPath(l2), 'L2', { label: 'L2', lx: 467, ly: 352, ls: 52 }));
  l.push(K('KEY', shpPath(mir(l2, a)), 'R2', { label: 'R2', lx: 1789, ly: 352, ls: 52 }));
  l.push(D('BODY', shpPath(SKIN_OUT.OUT_DS4)));
  l.push(D('LINE', shpPath(gr))); l.push(D('LINE', shpPath(mir(gr, a))));
  l.push(K('KEY', shpPath(l1), 'L1', { label: 'L1', lx: 467, ly: 425, ls: 46 }));
  l.push(K('KEY', shpPath(mir(l1, a)), 'R1', { label: 'R1', lx: 1789, ly: 425, ls: 46 }));
  l.push(D('REC', shpCircle(458, 797, 262))); l.push(D('REC', shpCircle(1798, 797, 262)));
  l.push(K('KEY', shpRect(780, 442, 700, 436, 44), 'TP'));
  l.push(D('DOTS', shpRect(815, 570, 630, 280, 0)));
  l.push(D('LABEL', SHP_NONE, { label: 'TOUCHPAD', lx: 1130, ly: 505, ls: 40 }));
  l.push(K('KEY', shpRect(659, 522, 66, 114, 33), 'SHARE'));
  l.push(K('KEY', shpRect(1531, 522, 66, 114, 33), 'OPT'));
  l.push(D('DEC', shpPath('M458 574 L486 614 H430 Z M458 1020 L486 980 H430 Z M240 797 L280 769 V825 Z M676 797 L636 769 V825 Z')));
  [['UP', 402, 622, 108, 150], ['DOWN', 402, 822, 108, 150], ['LEFT', 283, 742, 150, 112], ['RIGHT', 482, 742, 150, 112]].forEach(function (r) {
    l.push(K('KEY', shpRect(r[1], r[2], r[3], r[4], 30), r[0]));
  });
  [['TRI', 1798, 640, C_TRI], ['SQR', 1642, 798, C_SQR], ['CIR', 1954, 798, C_CIR], ['CRS', 1798, 958, C_CRS]].forEach(function (f) {
    var px = f[1], py = f[2], sym;
    if (f[0] === 'TRI') sym = shpPath('M' + px + ' ' + (py - 36) + ' L' + (px + 40) + ' ' + (py + 28) + ' H' + (px - 40) + ' Z');
    else if (f[0] === 'SQR') sym = shpRect(px - 32, py - 32, 64, 64, 0);
    else if (f[0] === 'CIR') sym = shpCircle(px, py, 35);
    else sym = shpPath('M' + (px - 30) + ' ' + (py - 30) + ' L' + (px + 30) + ' ' + (py + 30) + ' M' + (px + 30) + ' ' + (py - 30) + ' L' + (px - 30) + ' ' + (py + 30));
    l.push(K('FACE', shpCircle(px, py, 76), f[0], { color: f[3], sym: sym, symSt: 'FACE' }));
  });
  [['LS', 'L3', 788], ['RS', 'R3', 1482]].forEach(function (t) {
    l.push(K('RING', shpCircle(t[2], 1101, 198), t[0]));
    l.push(K('KEY', shpCircle(t[2], 1101, 136), t[1], { label: t[1], lx: t[2], ly: 1101, ls: 50, cap: t[0] }));
    l.push(D('LINE', shpCircle(t[2], 1101, 94), { cap: t[0] }));
  });
  l.push(K('KEY', shpCircle(1130, 1104, 62), 'PS', { label: 'PS', lx: 1130, ly: 1104, ls: 44 }));
  [[5, 941], [4, 970], [3, 999]].forEach(function (t) {
    for (var i = 0; i < t[0]; i++) l.push(D('REC', shpCircle(1130 + (i - (t[0] - 1) / 2) * 42, t[1], 11)));
  });
  return makeSkin(20, 280, 2230, 1490, l, 55, 110, { LS: { x: 788, y: 1101 }, RS: { x: 1482, y: 1101 } });
}

function xbox() {
  var lb = 'M418 378 C470 288 600 214 764 197 C805 197 830 225 862 247 C700 256 520 292 418 378 Z';
  var lt = 'M520 228 C570 140 690 108 792 126 C816 134 826 164 812 200 C720 190 600 200 520 228 Z';
  var gl = 'M363 1659 C500 1500 620 1360 700 1290';
  var a = 2400, l = [];
  l.push(K('KEY', shpPath(lt), 'L2', { label: 'LT', lx: 690, ly: 172, ls: 50 }));
  l.push(K('KEY', shpPath(mir(lt, a)), 'R2', { label: 'RT', lx: 1710, ly: 172, ls: 50 }));
  l.push(D('BODY', shpPath(SKIN_OUT.OUT_XBOX)));
  l.push(D('LINE', shpPath(gl))); l.push(D('LINE', shpPath(mir(gl, a))));
  l.push(D('LINE', shpPath('M470 292 C700 238 900 230 1200 230 C1500 230 1700 238 1930 292')));
  l.push(K('KEY', shpPath(lb), 'L1', { label: 'LB', lx: 650, ly: 256, ls: 44 }));
  l.push(K('KEY', shpPath(mir(lb, a)), 'R1', { label: 'RB', lx: 1750, ly: 256, ls: 44 }));
  l.push(D('REC2', shpCircle(624, 634, 200))); l.push(D('REC2', shpCircle(1486, 960, 195)));
  [['LS', 'L3', 631, 613], ['RS', 'R3', 1486, 941]].forEach(function (t) {
    l.push(K('RING', shpCircle(t[2], t[3], 138), t[0]));
    l.push(K('KEY', shpCircle(t[2], t[3], 102), t[1], { label: t[1], lx: t[2], ly: t[3], ls: 44, cap: t[0] }));
    l.push(D('LINE', shpCircle(t[2], t[3], 70), { cap: t[0] }));
  });
  l.push(D('REC', shpCircle(909, 965, 180))); l.push(D('DEC2', shpRect(857, 911, 108, 108, 0)));
  l.push(K('KEY', shpRect(857, 813, 108, 98, 18), 'UP')); l.push(K('KEY', shpRect(857, 1019, 108, 98, 18), 'DOWN'));
  l.push(K('KEY', shpRect(759, 911, 98, 108, 18), 'LEFT')); l.push(K('KEY', shpRect(965, 911, 98, 108, 18), 'RIGHT'));
  [['TRI', 1770, 472, '#5DE27A', 'Y'], ['CIR', 1920, 618, '#FF6B6B', 'B'], ['SQR', 1619, 618, '#5B8CFF', 'X'], ['CRS', 1770, 768, '#4DE8C0', 'A']].forEach(function (f) {
    l.push(K('FACE', shpCircle(f[1], f[2], 80), f[0], { label: f[4], lx: f[1], ly: f[2] + 4, ls: 84, color: f[3] }));
  });
  l.push(K('XB', shpCircle(1200, 396, 86), 'PS', { sym: shpPath('M1160 356 C1190 392 1212 402 1240 438 M1240 356 C1212 392 1190 402 1160 438'), symSt: 'MK' }));
  l.push(K('KEY', shpCircle(1037, 616, 52), 'SHARE', { sym: shpPath('M1018 600 h24 v20 h-24 Z M1032 612 h22 v22 h-22') }));
  l.push(K('KEY', shpCircle(1363, 616, 52), 'OPT', { sym: shpPath('M1340 600 h46 M1340 616 h46 M1340 632 h46') }));
  l.push(K('KEY', shpRect(1134, 699, 130, 76, 38), 'TP', { sym: shpPath('M1170 742 v14 h58 v-14 M1199 748 v-30 m-10 10 l10 -10 l10 10') }));
  return makeSkin(100, 90, 2200, 1620, l, 36, 90, { LS: { x: 631, y: 613 }, RS: { x: 1486, y: 941 } });
}

function joycon() {
  var sh = 'M404 410 C412 305 520 208 690 198 L792 198 L792 224 C650 226 530 262 462 384 Z';
  var zl = 'M606 198 L628 146 L784 146 L792 198 Z';
  var a = 2402, l = [];
  l.push(K('KEY', shpPath(zl), 'L2', { label: 'ZL', lx: 703, ly: 174, ls: 40 }));
  l.push(K('KEY', shpPath(mir(zl, a)), 'R2', { label: 'ZR', lx: 1699, ly: 174, ls: 40 }));
  l.push(D('BODY', shpPath(SKIN_OUT.OUT_JL))); l.push(D('BODY', shpPath(SKIN_OUT.OUT_JR)));
  l.push(K('KEY', shpPath(sh), 'L1', { label: 'L', lx: 700, ly: 214, ls: 36 }));
  l.push(K('KEY', shpPath(mir(sh, a)), 'R1', { label: 'R', lx: 1702, ly: 214, ls: 36 }));
  [['LS', 'L3', 656, 582], ['RS', 'R3', 1746, 1003]].forEach(function (t) {
    l.push(K('RING', shpCircle(t[2], t[3], 122), t[0]));
    l.push(K('KEY', shpCircle(t[2], t[3], 88), t[1], { label: t[1], lx: t[2], ly: t[3], ls: 40, cap: t[0] }));
    l.push(D('LINE', shpCircle(t[2], t[3], 60), { cap: t[0] }));
  });
  [['UP', 657, 881, '▲'], ['LEFT', 539, 996, '◀'], ['RIGHT', 775, 996, '▶'], ['DOWN', 657, 1112, '▼']].forEach(function (r) {
    l.push(K('KEY', shpCircle(r[1], r[2], 60), r[0], { label: r[3], lx: r[1], ly: r[2] + 2, ls: 40 }));
  });
  l.push(K('KEY', shpRect(766, 345, 82, 27, 13), 'SHARE'));
  l.push(K('KEY', shpRect(694, 1231, 97, 94, 16), 'TP'));
  l.push(D('LINE', shpCircle(742, 1278, 24)));
  [['TRI', 1746, 477, '#5EE8FF', 'X'], ['SQR', 1625, 593, '#6EF0B0', 'Y'], ['CIR', 1865, 593, '#FF6B7A', 'A'], ['CRS', 1746, 708, '#8E96FF', 'B']].forEach(function (f) {
    l.push(K('FACE', shpCircle(f[1], f[2], 62), f[0], { label: f[4], lx: f[1], ly: f[2] + 3, ls: 66, color: f[3] }));
  });
  l.push(K('KEY', shpRect(1548, 312, 92, 92, 20), 'OPT', { sym: shpPath('M1594 334 v48 M1570 358 h48') }));
  l.push(K('KEY', shpCircle(1659, 1280, 62), 'PS', { sym: shpPath('M1635 1282 L1659 1260 L1683 1282 M1642 1278 v24 h34 v-24'), symSt: 'ICONI' }));
  return makeSkin(370, 120, 1670, 1590, l, 30, 80, { LS: { x: 656, y: 582 }, RS: { x: 1746, y: 1003 } });
}

var skinCache = {};
function skinFor(t) { return skinCache[t] || (skinCache[t] = t === 'XBOX' ? xbox() : t === 'JOYCON' ? joycon() : ds4()); }

// ---- warna
function rgba(hex, a) {
  var n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function mixHex(h1, h2, t) {
  var a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16), o = [];
  [16, 8, 0].forEach(function (s) { var x = (a >> s) & 255, y = (b >> s) & 255; o.push(Math.round(x + (y - x) * t)); });
  return 'rgb(' + o.join(',') + ')';
}

// ---- menggambar: tombol yang ditekan menyala, tutup stik bergeser mengikuti sumbu
function fillS(ctx, s, c) { if (s.kind === 3) return; ctx.fillStyle = c; ctx.fill(s.path); }
function strokeS(ctx, s, c, w) { if (s.kind === 3) return; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(s.path); }

function drawSkin(ctx, cssW, skin, pal, pressed, mapped, ax) {
  var sc = cssW / skin.vw;
  ctx.save();
  ctx.scale(sc, sc); ctx.translate(-skin.vx, -skin.vy);
  skin.items.forEach(function (it) {
    if (it.cap) {
      var ox = it.cap === 'LS' ? ax.lx : ax.rx, oy = it.cap === 'LS' ? ax.ly : ax.ry;
      ctx.save(); ctx.translate(ox * skin.travel, -oy * skin.travel);
      drawItem(ctx, it, pal, pressed, mapped, ax); ctx.restore();
    } else drawItem(ctx, it, pal, pressed, mapped, ax);
  });
  ctx.restore();
}

function drawItem(ctx, it, pal, pressed, mapped, ax) {
  var s = it.shp, pad = it.pad;
  var on = !!pad && (pressed.has(pad) ||
    (pad === 'LS' && Math.hypot(ax.lx, ax.ly) > 0.15) || (pad === 'RS' && Math.hypot(ax.rx, ax.ry) > 0.15));
  var map = !!pad && mapped(pad);
  switch (it.st) {
    case 'BODY': fillS(ctx, s, pal.bdf); strokeS(ctx, s, pal.olc, 12); break;
    case 'REC': fillS(ctx, s, pal.rec); break;
    case 'REC2': fillS(ctx, s, mixHex(pal.rec, pal.bdf, 0.55)); break;
    case 'LINE': strokeS(ctx, s, rgba(pal.rec, 0.7), 8); break;
    case 'DEC': fillS(ctx, s, rgba(pal.keyf, 0.85)); break;
    case 'DEC2': fillS(ctx, s, rgba(pal.keyf, 0.55)); break;
    case 'DOTS':
      ctx.fillStyle = rgba(pal.olc, 0.55);
      for (var y = s.y + 10; y < s.y + s.h; y += 20) for (var x = s.x + 10; x < s.x + s.w; x += 20) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 'LABEL': break;
    default: { // KEY, RING, FACE, XB: bisa menyala / ditandai terpasang
      var base = it.st === 'RING' ? pal.bdf : it.st === 'FACE' ? rgba(pal.ink, 0.10) : it.st === 'XB' ? rgba(pal.ink, 0.90) : pal.keyf;
      var face = it.st === 'FACE' && !!it.color;
      if (on) {
        var gc = face ? it.color : pal.acc;
        strokeS(ctx, s, rgba(gc, 0.35), 46); // cahaya
        if (it.st === 'RING') { fillS(ctx, s, pal.bdf); strokeS(ctx, s, pal.acc, 18); }
        else { fillS(ctx, s, face ? rgba(it.color, 0.55) : pal.acc); strokeS(ctx, s, gc, 9); }
      } else if (map) {
        fillS(ctx, s, face ? base : pal.mapf); strokeS(ctx, s, pal.acc, 14);
      } else {
        fillS(ctx, s, base); strokeS(ctx, s, pal.rec, it.st === 'RING' ? 12 : 9);
      }
    }
  }
  if (it.sym) {
    var col = it.symSt === 'FACE' ? (on ? '#FFFFFF' : (it.color || pal.mute)) : it.symSt === 'ICONI' ? pal.ink : it.symSt === 'MK' ? (on ? pal.onAcc : pal.rec) : pal.mute;
    strokeS(ctx, it.sym, col, it.symSt === 'FACE' ? 13 : it.symSt === 'MK' ? 16 : 8);
  }
  if (it.label) {
    var tc = it.st === 'LABEL' ? pal.mute : (it.st === 'FACE' && it.color) ? (on ? '#FFFFFF' : it.color) : on ? pal.onAcc : pal.ink;
    ctx.fillStyle = tc; ctx.font = 'bold ' + it.ls + 'px Roboto, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(it.label, it.lx, it.ly);
  }
}

function hitItem(skin, x, y) {
  for (var i = 0; i < skin.keys.length; i++) if (shpContains(skin.keys[i].shp, x, y)) return skin.keys[i];
  return null;
}
