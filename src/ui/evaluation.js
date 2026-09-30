// Evaluation helpers, eval bar and eval graph.

/** Convert an engine score (side-to-move perspective) to White's perspective. */
export function toWhite(info, turn) {
  const s = turn === 'w' ? 1 : -1;
  return { cp: info.cp !== undefined ? info.cp * s : undefined, mate: info.mate !== undefined ? info.mate * s : undefined };
}

/** "+0.35", "-1.20", "M3", "-M5" (White's perspective). */
export function formatScore(sc) {
  if (!sc) return '–';
  if (sc.mate !== undefined) return sc.mate === 0 ? '#' : (sc.mate > 0 ? 'M' + sc.mate : '-M' + Math.abs(sc.mate));
  if (sc.cp === undefined) return '–';
  const v = sc.cp / 100;
  return (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(v).toFixed(2);
}

/** Centipawn value clamped for graphs; mates become +/-1000. */
export function graphValue(sc) {
  if (!sc) return 0;
  if (sc.mate !== undefined) return sc.mate === 0 ? 0 : (sc.mate > 0 ? 1000 : -1000);
  return Math.max(-1000, Math.min(1000, sc.cp || 0));
}

/** White's winning share in percent (0-100). */
export function whitePercent(sc) {
  if (!sc) return 50;
  if (sc.mate !== undefined) return sc.mate > 0 ? 100 : sc.mate < 0 ? 0 : 50;
  return 50 + 50 * (2 / (1 + Math.exp(-0.0040 * (sc.cp || 0))) - 1);
}

export class EvalBar {
  constructor(el) {
    this.el = el;
    this.el.innerHTML = '<div class="eval-fill"></div><span class="eval-text" aria-hidden="true">0.0</span>';
    this.fill = el.querySelector('.eval-fill');
    this.text = el.querySelector('.eval-text');
    this.set(null);
  }
  set(sc) {
    const pct = whitePercent(sc);
    this.fill.style.setProperty('--w', pct.toFixed(1) + '%');
    const t = sc ? formatScore(sc) : '0.0';
    this.text.textContent = t.replace('+', '');
    this.text.classList.toggle('dark-side', pct < 50);
    this.el.setAttribute('aria-label', sc ? `Evaluation ${t}` : 'Evaluation unavailable');
    this.el.title = sc ? `Evaluation ${t} (White's view)` : 'No evaluation yet';
  }
  reset() { this.set(null); }
}

export class EvalGraph {
  constructor(canvas, onPick) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.values = [];
    this.cur = 0;
    this.onPick = onPick;
    canvas.addEventListener('click', (e) => {
      if (this.values.length < 2) return;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      this.onPick(Math.max(0, Math.min(this.values.length - 1, Math.round(x * (this.values.length - 1)))));
    });
    new ResizeObserver(() => this.draw()).observe(canvas);
  }
  set(values, cur) { this.values = values; this.cur = cur; this.draw(); }
  draw() {
    const c = this.c, ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(c);
    const light = css.getPropertyValue('--graph-light').trim() || '#eee';
    const dark = css.getPropertyValue('--graph-dark').trim() || '#333';
    const accent = css.getPropertyValue('--accent').trim() || '#f90';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = dark; ctx.fillRect(0, 0, w, h);
    const v = this.values;
    if (v.length < 2) return;
    const x = (i) => (i / (v.length - 1)) * w;
    const y = (val) => h / 2 - (val / 1000) * (h / 2);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    v.forEach((val, i) => ctx.lineTo(x(i), y(val === null ? 0 : val)));
    ctx.lineTo(w, h / 2);
    ctx.closePath();
    ctx.fillStyle = light; ctx.fill();
    ctx.strokeStyle = 'rgba(128,128,128,.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x(this.cur), 0); ctx.lineTo(x(this.cur), h); ctx.stroke();
  }
}
