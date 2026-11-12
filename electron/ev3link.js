'use strict';
/**
 * Komunikasi EV3 lewat Bluetooth klasik (RFCOMM/SPP) memakai "direct command" firmware LEGO asli.
 * Port langsung dari Ev3.kt versi Android. Di desktop, EV3 yang sudah dipasangkan (pair) muncul
 * sebagai port serial (COMx di Windows, /dev/rfcomm* di Linux, /dev/cu.* di macOS).
 */
const QUERY_TIMEOUT_MS = 3000;

class Ev3Link {
  constructor(onLost) {
    this.port = null;
    this.counter = 0;
    this.rx = Buffer.alloc(0);
    this.waiter = null;           // { resolve, reject, timer }
    this.chain = Promise.resolve(); // antrean agar permintaan tidak saling menimpa
    this.onLost = onLost || (() => {});
    this.closing = false;
  }

  open(path) {
    const { SerialPort } = require('serialport');
    return new Promise((resolve, reject) => {
      const p = new SerialPort({ path, baudRate: 115200, autoOpen: false });
      p.open((err) => {
        if (err) return reject(err);
        this.port = p; this.closing = false;
        p.on('data', (d) => this._onData(d));
        p.on('close', () => this._lost());
        p.on('error', () => this._lost());
        resolve();
      });
    });
  }

  _lost() {
    if (this.closing) return;
    this.closing = true;
    if (this.waiter) { clearTimeout(this.waiter.timer); this.waiter.reject(new Error('lost')); this.waiter = null; }
    this.onLost();
  }

  _onData(d) {
    this.rx = Buffer.concat([this.rx, d]);
    for (;;) {
      if (this.rx.length < 2) return;
      const len = this.rx[0] | (this.rx[1] << 8);
      if (this.rx.length < 2 + len) return;
      const body = this.rx.subarray(2, 2 + len);
      this.rx = this.rx.subarray(2 + len);
      if (this.waiter) {
        const w = this.waiter; this.waiter = null; clearTimeout(w.timer); w.resolve(Buffer.from(body));
      }
    }
  }

  _packet(ops, globals, reply) {
    this.counter = (this.counter + 1) & 0xFFFF;
    const body = Buffer.concat([
      Buffer.from([this.counter & 0xFF, this.counter >> 8, reply ? 0x00 : 0x80, globals & 0xFF, (globals >> 8) & 0x03]),
      Buffer.from(ops),
    ]);
    return Buffer.concat([Buffer.from([body.length & 0xFF, body.length >> 8]), body]);
  }

  _write(buf) {
    return new Promise((resolve, reject) => {
      if (!this.port || !this.port.isOpen) return reject(new Error('not open'));
      this.port.write(buf, (err) => (err ? reject(err) : this.port.drain((e2) => (e2 ? reject(e2) : resolve()))));
    });
  }

  _enqueue(fn) {
    const r = this.chain.then(fn, fn);
    this.chain = r.catch(() => {});
    return r;
  }

  send(ops) { return this._enqueue(() => this._write(this._packet(ops, 0, false))); }

  _query(ops, globals) {
    return this._enqueue(async () => {
      this.rx = Buffer.alloc(0);
      const reply = new Promise((resolve, reject) => {
        const timer = setTimeout(() => { this.waiter = null; reject(new Error('timeout')); }, QUERY_TIMEOUT_MS);
        this.waiter = { resolve, reject, timer };
      });
      await this._write(this._packet(ops, globals, true));
      return reply; // [counter(2), type(1), globals...]
    });
  }

  /** Kode tipe mentah 8 port: sensor 1..4 lalu motor A..D. */
  async readTypes() {
    const nums = [0, 1, 2, 3, 16, 17, 18, 19];
    const ops = [];
    nums.forEach((n, k) => ops.push(0x99, 0x05, 0x00, n, 0x60 | (2 * k), 0x60 | (2 * k + 1)));
    const d = await this._query(ops, 16);
    return nums.map((_, k) => (d.length > 3 + 2 * k ? d[3 + 2 * k] & 0xFF : 126));
  }

  /** req = [[port 0..3, mode], ...]. Hasil NaN (null) jika gagal. */
  async readSensors(req) {
    const ops = [];
    req.forEach(([port, mode], k) => ops.push(0x9D, 0x00, port, 0x00, mode, 0x60 | (4 * k)));
    const d = await this._query(ops, 4 * req.length);
    return req.map((_, k) => (d.length >= 3 + 4 * (k + 1) && d[2] === 2 ? d.readFloatLE(3 + 4 * k) : null));
  }

  /** Level baterai EV3 (persen) atau null. */
  async readBattery() {
    const d = await this._query([0x81, 0x12, 0x60], 1);
    return d.length > 3 && d[2] === 2 ? Math.max(0, Math.min(100, d[3] & 0xFF)) : null;
  }

  async close() {
    this.closing = true;
    try { await this._write(this._packet([0xA3, 0, 0x0F, 0], 0, false)); } catch (e) { /* abaikan */ }
    await new Promise((r) => { try { this.port ? this.port.close(() => r()) : r(); } catch (e) { r(); } });
    this.port = null;
  }

  static lc(v) { return v >= -32 && v <= 31 ? [v & 0x3F] : [0x81, v & 0xFF]; }

  /** Kecepatan terregulasi (-100..100) lalu start. */
  static opSpeed(port, speed) {
    const m = 1 << port;
    return [0xA5, 0, m, ...Ev3Link.lc(speed), 0xA6, 0, m];
  }

  /** brake: 1 = rem (tahan), 0 = float. */
  static opStop(port, brake) { return [0xA3, 0, 1 << port, brake]; }
}

module.exports = { Ev3Link };
