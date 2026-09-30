// Chess clock with increment. Times are in milliseconds.

export function fmtTime(ms) {
  ms = Math.max(0, ms);
  if (ms < 10000) { // show tenths under 10s
    const s = Math.floor(ms / 1000), t = Math.floor((ms % 1000) / 100);
    return `0:${String(s).padStart(2, '0')}.${t}`;
  }
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export class Clock {
  /** @param {{onTick:()=>void,onFlag:(color:string)=>void}} cb */
  constructor(cb) {
    this.cb = cb;
    this.enabled = false;
    this.base = 0; this.inc = 0;
    this.t = { w: 0, b: 0 };
    this.running = null; // 'w' | 'b' | null
    this.last = 0;
    this.timer = null;
  }

  configure(tc) {
    this.stop();
    this.enabled = !!tc;
    this.base = tc ? tc.base * 1000 : 0;
    this.inc = tc ? tc.inc * 1000 : 0;
    this.t = { w: this.base, b: this.base };
    this.cb.onTick();
  }

  snapshot() { this._sync(); return { w: this.t.w, b: this.t.b }; }
  restore(s) { this.t = { w: s.w, b: s.b }; this.cb.onTick(); }

  _sync() {
    if (!this.running) return;
    const now = performance.now();
    this.t[this.running] -= now - this.last;
    this.last = now;
  }

  start(color) {
    if (!this.enabled) return;
    this._sync();
    this.running = color;
    this.last = performance.now();
    clearInterval(this.timer);
    this.timer = setInterval(() => this._tick(), 100);
    this._tick();
  }

  /** Called after `mover` completed a move: add increment, hand over to the other side. */
  switchFrom(mover, addIncrement = true) {
    if (!this.enabled) return;
    this._sync();
    if (addIncrement) this.t[mover] += this.inc;
    this.start(mover === 'w' ? 'b' : 'w');
  }

  stop() {
    this._sync();
    this.running = null;
    clearInterval(this.timer);
    this.timer = null;
  }

  _tick() {
    this._sync();
    if (this.running && this.t[this.running] <= 0) {
      const c = this.running;
      this.t[c] = 0;
      this.stop();
      this.cb.onTick();
      this.cb.onFlag(c);
      return;
    }
    this.cb.onTick();
  }

  remaining(color) { this._sync(); return this.t[color]; }
}
