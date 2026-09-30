import { Chess, DEFAULT_POSITION, validateFen } from 'chess.js';

export const START_FEN = DEFAULT_POSITION;
export { Chess, validateFen };

const FILES = 'abcdefgh';

/** Wraps chess.js: all rules come from chess.js; this adds undo/redo, clock snapshots and PGN headers. */
export class Game {
  constructor(fen) { this.load(fen || START_FEN); }

  load(fen) {
    const c = new Chess(fen); // throws on invalid FEN
    this._set(c, c.fen());
  }

  loadPgn(pgn) {
    const c = new Chess();
    c.loadPgn(pgn); // throws on invalid PGN
    const h = c.getHeaders();
    this._set(c, h.FEN && h.SetUp !== '0' ? h.FEN : START_FEN);
  }

  _set(chess, startFen) {
    this.chess = chess;
    this.startFen = startFen;
    this.redoStack = [];
    this.snaps = [];
    this.startSnap = null;
    this.forced = null; // {result, reason, winner} for resignation / timeout / agreed draw
    this.headers = {};
  }

  get turn() { return this.chess.turn(); }
  get fen() { return this.chess.fen(); }
  history() { return this.chess.history({ verbose: true }); }
  get ply() { return this.chess.history().length; }

  fenAt(ply) {
    if (ply <= 0) return this.startFen;
    const h = this.history();
    return h[Math.min(ply, h.length) - 1].after;
  }

  /** Pieces on the board of a given FEN as Map<square,{type,color}> */
  static pieces(fen) {
    const m = new Map();
    const b = new Chess(fen).board();
    for (const row of b) for (const p of row) if (p) m.set(p.square, { type: p.type, color: p.color });
    return m;
  }

  static kingSquare(fen, color) {
    for (const row of new Chess(fen).board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
    return null;
  }

  targets(sq) {
    return this.chess.moves({ square: sq, verbose: true }).map((m) => ({ sq: m.to, capture: m.isCapture() || m.isEnPassant() }));
  }

  ownPiece(sq) {
    const p = this.chess.get(sq);
    return !!p && p.color === this.chess.turn();
  }

  needsPromotion(from, to) {
    return this.chess.moves({ square: from, verbose: true }).some((m) => m.to === to && m.promotion);
  }

  /** Try to play a move. Returns the chess.js Move or null when illegal. Clears redo stack. */
  move(from, to, promotion) {
    try {
      const m = this.chess.move({ from, to, promotion });
      this.redoStack = [];
      return m;
    } catch (e) {
      return null;
    }
  }

  moveUci(uci) {
    if (!uci || uci.length < 4) return null;
    return this.move(uci.slice(0, 2), uci.slice(2, 4), uci[4]);
  }

  undo() {
    const m = this.chess.undo();
    if (!m) return null;
    const snap = this.snaps.pop() || null;
    this.redoStack.push({ from: m.from, to: m.to, promotion: m.promotion, snap });
    this.forced = null;
    return m;
  }

  redo() {
    const r = this.redoStack.pop();
    if (!r) return null;
    const m = this.chess.move({ from: r.from, to: r.to, promotion: r.promotion });
    this.snaps.push(r.snap);
    return m;
  }

  clockBefore() { return this.snaps.length ? this.snaps[this.snaps.length - 1] : this.startSnap; }

  status() {
    if (this.forced) return { over: true, ...this.forced };
    const c = this.chess;
    if (c.isCheckmate()) {
      const winner = c.turn() === 'w' ? 'b' : 'w';
      return { over: true, result: winner === 'w' ? '1-0' : '0-1', reason: 'Checkmate', winner };
    }
    if (c.isStalemate()) return { over: true, result: '1/2-1/2', reason: 'Stalemate', winner: null };
    if (c.isInsufficientMaterial()) return { over: true, result: '1/2-1/2', reason: 'Insufficient material', winner: null };
    if (c.isThreefoldRepetition()) return { over: true, result: '1/2-1/2', reason: 'Threefold repetition', winner: null };
    if (c.isDrawByFiftyMoves()) return { over: true, result: '1/2-1/2', reason: 'Fifty-move rule', winner: null };
    if (c.isDraw()) return { over: true, result: '1/2-1/2', reason: 'Draw', winner: null };
    return { over: false, result: '*', reason: '', winner: null };
  }

  end(result, reason, winner) { this.forced = { result, reason, winner }; }

  /** Standard PGN with headers (Event, Site, Date, White, Black, Result, ...). */
  pgn(extra = {}) {
    const c = this.chess;
    const st = this.status();
    const d = new Date();
    const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    const base = { Event: 'Casual game', Site: 'Rookery Chess', Date: date, Round: '-', White: 'White', Black: 'Black' };
    const existing = c.getHeaders();
    const explicit = { ...this.headers, ...extra };
    for (const [k, v] of Object.entries({ ...base, ...explicit })) {
      // keep headers that came from an imported PGN unless we were told to override them
      if (explicit[k] === undefined && existing[k] !== undefined && existing[k] !== null && !String(existing[k]).includes('?')) continue;
      c.setHeader(k, String(v));
    }
    c.setHeader('Result', st.result);
    return c.pgn({ newline: '\n', maxWidth: 80 });
  }
}

export function squareColor(sq) {
  return (FILES.indexOf(sq[0]) + +sq[1]) % 2 === 0 ? 'dark' : 'light';
}
