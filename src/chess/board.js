import { pieceSVG, PIECE_NAMES } from './pieces.js';

const FILES = 'abcdefgh';

/**
 * Board view. It knows nothing about chess rules: the controller passes in what to draw and gets
 * callbacks for user input (click / touch / drag).
 *
 * handlers: { canPick(sq)->bool, onPick(sq), onTap(sq), onDrop(from,to), onDeselect() }
 */
export class Board {
  constructor(root, handlers) {
    this.root = root;
    this.h = handlers;
    this.orientation = 'w';
    this.state = { pieces: new Map(), targets: [], selected: null };
    this.squares = new Map();
    this.root.classList.add('board');
    this.root.setAttribute('role', 'application');
    this.root.setAttribute('aria-label', 'Chess board. Use arrow keys to move focus, Enter to select.');
    this.drag = null;
    this.focusSq = 'e2';
    this._build();
    this._bind();
  }

  _build() {
    this.root.innerHTML = '';
    this.squares.clear();
    const order = [];
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const file = this.orientation === 'w' ? f : 7 - f;
      const rank = this.orientation === 'w' ? 8 - r : r + 1;
      order.push(FILES[file] + rank);
    }
    order.forEach((sq, i) => {
      const el = document.createElement('div');
      const file = FILES.indexOf(sq[0]);
      const rank = +sq[1];
      el.className = 'sq ' + ((file + rank) % 2 === 0 ? 'dark' : 'light');
      el.dataset.sq = sq;
      el.setAttribute('role', 'button');
      el.tabIndex = sq === this.focusSq ? 0 : -1;
      const col = i % 8, row = Math.floor(i / 8);
      if (col === 0) el.insertAdjacentHTML('beforeend', `<span class="coord rank">${rank}</span>`);
      if (row === 7) el.insertAdjacentHTML('beforeend', `<span class="coord file">${sq[0]}</span>`);
      this.root.appendChild(el);
      this.squares.set(sq, el);
    });
  }

  flip() { this.setOrientation(this.orientation === 'w' ? 'b' : 'w'); }

  setOrientation(o) {
    if (o === this.orientation) return;
    this.orientation = o;
    this._build();
    this.render(this.state, true);
  }

  squareAt(ev) {
    const r = this.root.getBoundingClientRect();
    let x = (ev.clientX - r.left) / r.width;
    let y = (ev.clientY - r.top) / r.height;
    if (x < 0 || x >= 1 || y < 0 || y >= 1) return null;
    let f = Math.floor(x * 8), rk = Math.floor(y * 8);
    if (this.orientation === 'w') return FILES[f] + (8 - rk);
    return FILES[7 - f] + (rk + 1);
  }

  /** state: {pieces:Map<sq,{type,color}>, lastMove:[a,b]|null, check, mate, selected, targets:[{sq,capture}], anim:[{from,to}], hint} */
  render(state, noAnim = false) {
    this.state = state;
    const targets = new Map((state.targets || []).map((t) => [t.sq, t]));
    for (const [sq, el] of this.squares) {
      const p = state.pieces.get(sq);
      const cls = ['sq', el.classList.contains('dark') ? 'dark' : 'light'];
      if (state.lastMove && state.lastMove.includes(sq)) cls.push('last');
      if (state.selected === sq) cls.push('selected');
      if (state.check === sq) cls.push('check');
      if (state.mate === sq) cls.push('mate');
      if (state.hint === sq) cls.push('hint');
      const t = targets.get(sq);
      if (t) cls.push(t.capture ? 'target-capture' : 'target');
      el.className = cls.join(' ');
      let pe = el.querySelector('.piece');
      if (p) {
        const key = p.color + p.type;
        if (!pe || pe.dataset.k !== key) {
          if (pe) pe.remove();
          pe = document.createElement('div');
          pe.className = 'piece';
          pe.dataset.k = key;
          pe.innerHTML = pieceSVG(p.type, p.color);
          el.appendChild(pe);
        }
        el.setAttribute('aria-label', `${sq}, ${p.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[p.type]}`);
      } else {
        if (pe) pe.remove();
        el.setAttribute('aria-label', sq);
      }
    }
    if (!noAnim && state.anim) for (const a of state.anim) this._animate(a.from, a.to);
  }

  _animate(from, to) {
    const a = this.squares.get(from), b = this.squares.get(to);
    const pe = b && b.querySelector('.piece');
    if (!a || !b || !pe || matchMedia('(prefers-reduced-motion: reduce)').matches || this.root.dataset.anim === 'off') return;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    pe.style.transition = 'none';
    pe.style.transform = `translate(${ra.left - rb.left}px, ${ra.top - rb.top}px)`;
    pe.style.zIndex = 5;
    void pe.offsetWidth;
    pe.style.transition = 'transform 180ms cubic-bezier(.2,.8,.2,1)';
    pe.style.transform = '';
    const clean = () => { pe.style.transition = ''; pe.style.zIndex = ''; };
    pe.addEventListener('transitionend', clean, { once: true });
    setTimeout(clean, 300);
  }

  _bind() {
    const root = this.root;
    root.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button > 0) return;
      const sq = this.squareAt(e);
      if (!sq) return;
      const s = this.state;
      const isTarget = (s.targets || []).some((t) => t.sq === sq);
      this.drag = { sq, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId, wasSelected: s.selected === sq, tapTarget: isTarget, ghost: null };
      if (!isTarget && this.h.canPick(sq)) {
        if (!this.drag.wasSelected) this.h.onPick(sq);
        this.drag.canDrag = true;
      }
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    });

    root.addEventListener('pointermove', (e) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId || !d.canDrag) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
        d.moved = true;
        const p = this.state.pieces.get(d.sq);
        if (!p) { d.canDrag = false; return; }
        const src = this.squares.get(d.sq);
        const size = src.getBoundingClientRect().width;
        const g = document.createElement('div');
        g.className = 'piece ghost';
        g.style.width = g.style.height = size + 'px';
        g.innerHTML = pieceSVG(p.type, p.color);
        document.body.appendChild(g);
        d.ghost = g;
        d.size = size;
        src.classList.add('dragging');
      }
      if (d.ghost) {
        d.ghost.style.transform = `translate(${e.clientX - d.size / 2}px, ${e.clientY - d.size / 2}px)`;
        this._hover(this.squareAt(e));
      }
    });

    const end = (e, cancelled) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      this.drag = null;
      this._hover(null);
      if (d.ghost) { d.ghost.remove(); this.squares.get(d.sq).classList.remove('dragging'); }
      if (cancelled) return;
      const sq = this.squareAt(e);
      if (d.moved) {
        if (sq && sq !== d.sq) this.h.onDrop(d.sq, sq);
        return;
      }
      if (!sq) return;
      // tap / click
      if (d.tapTarget) this.h.onTap(sq);
      else if (d.canDrag) { if (d.wasSelected) this.h.onDeselect(); }
      else this.h.onTap(sq);
    };
    root.addEventListener('pointerup', (e) => end(e, false));
    root.addEventListener('pointercancel', (e) => end(e, true));

    // Keyboard support: arrows move focus, Enter/Space acts like a tap.
    root.addEventListener('keydown', (e) => {
      const cur = e.target.closest && e.target.closest('.sq');
      if (!cur) return;
      const sq = cur.dataset.sq;
      let f = FILES.indexOf(sq[0]), r = +sq[1];
      const flip = this.orientation === 'b' ? -1 : 1;
      if (e.key === 'ArrowRight') f += flip;
      else if (e.key === 'ArrowLeft') f -= flip;
      else if (e.key === 'ArrowUp') r += flip;
      else if (e.key === 'ArrowDown') r -= flip;
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const s = this.state;
        const isTarget = (s.targets || []).some((t) => t.sq === sq);
        if (!isTarget && this.h.canPick(sq)) { if (s.selected === sq) this.h.onDeselect(); else this.h.onPick(sq); }
        else this.h.onTap(sq);
        return;
      } else return;
      e.preventDefault();
      if (f < 0 || f > 7 || r < 1 || r > 8) return;
      this.focusSquare(FILES[f] + r);
    });
  }

  focusSquare(sq) {
    for (const [s, el] of this.squares) el.tabIndex = s === sq ? 0 : -1;
    this.focusSq = sq;
    this.squares.get(sq).focus();
  }

  _hover(sq) {
    if (this._hov === sq) return;
    if (this._hov) this.squares.get(this._hov)?.classList.remove('hover');
    this._hov = sq;
    if (sq) this.squares.get(sq)?.classList.add('hover');
  }
}
