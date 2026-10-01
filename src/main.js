import './styles/style.css';
import { Chess, Game, START_FEN, validateFen } from './chess/game.js';
import { Board } from './chess/board.js';
import { Engine } from './chess/engine.js';
import { pieceSVG } from './chess/pieces.js';
import { PUZZLES } from './chess/puzzles-data.js';
import { Clock, fmtTime } from './ui/clock.js';
import { EvalBar, EvalGraph, formatScore, toWhite, graphValue } from './ui/evaluation.js';
import { $, $$, store, toast, modal, promotionChoice, copyText, download, renderSettings, esc } from './ui/controls.js';

/* ------------------------------------------------------------------ config */
const LEVELS = {
  beginner: { label: 'Beginner', elo: 1320, skill: 0, depth: 4, ms: 150 },
  easy: { label: 'Easy', elo: 1600, skill: 4, depth: 8, ms: 250 },
  medium: { label: 'Medium', elo: 1900, skill: 9, depth: 12, ms: 500 },
  hard: { label: 'Hard', elo: 2400, skill: 15, depth: 16, ms: 900 },
  expert: { label: 'Expert', elo: null, skill: 20, depth: 0, ms: 1500 },
};
const MODE_LABEL = { ai: 'Player vs AI', pvp: 'Player vs Player', aivai: 'AI vs AI' };
const PZ_LABEL = { mate1: 'Mate in 1', mate2: 'Mate in 2', mate3: 'Mate in 3', best: 'Best move', tactical: 'Tactical puzzle', custom: 'Custom puzzle' };
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1 };

const settings = Object.assign(
  { theme: 'auto', board: 'classic', pieces: 'classic', legal: true, coords: true, anim: true, autoQueen: false, evalBar: true, autoFlip: false, aiLevel: 'medium', aiTime: 'auto', aiDepth: 'auto' },
  store('settings') || {},
);

/* ------------------------------------------------------------------- state */
const S = {
  mode: 'ai', human: 'w', level: 'medium', tc: null, name: 'Player',
  game: new Game(), view: null, selected: null, targets: [], thinking: false, gen: 0,
  evals: [], paused: false, tab: 'play', pz: null, hintSq: null, engLine: 'AI: –',
  engineState: 'loading', overShown: false, mainOrient: 'w', lastFenShown: '', analysisTimer: 0,
};
const engine = new Engine();
const clock = new Clock({ onTick: updateClocks, onFlag: onFlag });
const board = new Board($('#board'), {
  canPick: (sq) => interactive() && cur().ownPiece(sq),
  onPick: (sq) => { S.selected = sq; S.targets = cur().targets(sq); S.hintSq = null; refresh(); },
  onTap: (sq) => {
    if (S.selected && S.targets.some((t) => t.sq === sq)) attemptMove(S.selected, sq);
    else if (interactive() && cur().ownPiece(sq)) { S.selected = sq; S.targets = cur().targets(sq); refresh(); }
    else clearSel();
  },
  onDrop: (from, to) => {
    if (interactive() && cur().targets(from).some((t) => t.sq === to)) attemptMove(from, to);
    else clearSel();
  },
  onDeselect: () => clearSel(),
});
const evalBar = new EvalBar($('#eval-bar'));
const graph = new EvalGraph($('#eval-graph'), (ply) => goTo(ply));

/* ---------------------------------------------------------------- helpers */
const cur = () => (puzzleActive() ? S.pz.game : S.game);
const puzzleActive = () => S.tab === 'puzzles' && !!S.pz;
const viewPly = () => (S.view === null || puzzleActive() ? cur().ply : S.view);
const other = (c) => (c === 'w' ? 'b' : 'w');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const colorName = (c) => (c === 'w' ? 'White' : 'Black');
function clearSel() { S.selected = null; S.targets = []; refresh(); }

function interactive() {
  const g = cur();
  if (S.view !== null && !puzzleActive()) return false;
  if (g.status().over) return false;
  if (puzzleActive()) return S.pz.state === 'playing' && !S.pz.busy && g.turn === S.pz.player;
  if (S.thinking) return false;
  if (S.mode === 'pvp') return true;
  if (S.mode === 'ai') return g.turn === S.human && S.engineState !== 'failed';
  return false;
}

function aiName(level = S.level) { return `Rookery AI (${LEVELS[level].label})`; }
function playerNames() {
  if (S.mode === 'ai') return S.human === 'w' ? { w: S.name, b: aiName() } : { w: aiName(), b: S.name };
  if (S.mode === 'aivai') return { w: aiName(), b: aiName() };
  return { w: S.name && S.name !== 'Player' ? S.name : 'White', b: 'Black' };
}

/* ------------------------------------------------------------ theme & UI */
function applySettings() {
  const root = document.documentElement;
  const dark = settings.theme === 'auto' ? matchMedia('(prefers-color-scheme: dark)').matches : settings.theme === 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.board = settings.board;
  root.dataset.pieces = settings.pieces;
  document.body.dataset.legal = settings.legal ? 'on' : 'off';
  document.body.dataset.coords = settings.coords ? 'on' : 'off';
  document.body.dataset.evalbar = settings.evalBar ? 'on' : 'off';
  $('#board').dataset.anim = settings.anim ? 'on' : 'off';
  $('meta[name="theme-color"]')?.setAttribute('content', dark ? '#12151c' : '#f2efe9');
  store('settings', settings);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (settings.theme === 'auto') applySettings(); });

/* ------------------------------------------------------------------ render */
function refresh(anim) {
  const g = cur();
  const ply = viewPly();
  const fen = g.fenAt(ply);
  const hist = g.history();
  const lm = ply > 0 ? hist[ply - 1] : null;
  const chess = new Chess(fen);
  const inCheck = chess.inCheck();
  const mated = chess.isCheckmate();
  const kSq = inCheck ? Game.kingSquare(fen, chess.turn()) : null;
  board.render({
    pieces: Game.pieces(fen),
    lastMove: lm ? [lm.from, lm.to] : null,
    check: inCheck && !mated ? kSq : null,
    mate: mated ? kSq : null,
    selected: S.selected,
    targets: S.targets,
    anim,
    hint: S.hintSq,
  }, !anim);
  renderPlayers(fen);
  renderMoves(g, ply);
  renderStatus(g, fen, ply);
  renderButtons(g);
  updateClocks();
  evalBar.el.classList.toggle('flipped', board.orientation === 'b');
  evalBar.set(puzzleActive() ? null : S.evals[ply] || null);
  document.body.dataset.puzzle = puzzleActive() ? 'on' : 'off';
  const fenInput = $('#io-fen');
  if (document.activeElement !== fenInput) fenInput.value = fen;
  if (S.tab === 'analysis') graph.set(S.evals.slice(0, g.ply + 1).map((s) => (s ? graphValue(s) : null)), ply);
  if (S.tab === 'analysis' && $('#an-live').checked && fen !== S.lastFenShown) scheduleLiveAnalysis();
  S.lastFenShown = fen;
}

function renderPlayers(fen) {
  const names = puzzleActive() ? { w: 'White', b: 'Black' } : playerNames();
  const pieces = Game.pieces(fen);
  const count = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const p of pieces.values()) if (p.type !== 'k') count[p.color][p.type]++;
  const mat = (c) => Object.entries(count[c]).reduce((s, [t, n]) => s + PIECE_VAL[t] * n, 0);
  const turn = new Chess(fen).turn();
  const over = cur().status().over;
  const top = board.orientation === 'w' ? 'b' : 'w';
  [['#bar-top', top], ['#bar-bottom', other(top)]].forEach(([sel, c]) => {
    const bar = $(sel);
    $('.pname', bar).textContent = names[c];
    // pieces this side captured = opponent's missing pieces
    const opp = other(c);
    let html = '';
    for (const t of ['q', 'r', 'b', 'n', 'p']) {
      const n = Math.max(0, START_COUNT[t] - count[opp][t]);
      for (let i = 0; i < n; i++) html += `<span class="cp${i === 0 ? ' sep' : ''}">${pieceSVG(t, opp)}</span>`;
    }
    const adv = mat(c) - mat(opp);
    if (adv > 0) html += `<span class="adv">+${adv}</span>`;
    $('.captured', bar).innerHTML = html;
    bar.classList.toggle('turn', !over && turn === c);
  });
}

function updateClocks() {
  const top = board.orientation === 'w' ? 'b' : 'w';
  [['#clock-top', top], ['#clock-bottom', other(top)]].forEach(([sel, c]) => {
    const el = $(sel);
    el.classList.toggle('off', !clock.enabled);
    if (!clock.enabled) return;
    const ms = clock.remaining(c);
    el.textContent = fmtTime(ms);
    el.classList.toggle('active', clock.running === c);
    el.classList.toggle('low', ms < 20000 || ms < clock.base * 0.1);
  });
}

function renderMoves(g, ply) {
  const box = $('#moves');
  const hist = g.history();
  if (!hist.length) { box.innerHTML = '<span class="muted">No moves yet.</span>'; box.style.display = 'block'; return; }
  box.style.display = '';
  const start = g.startFen.split(' ');
  let n = parseInt(start[5], 10) || 1;
  let html = '';
  let i = 0;
  const mv = (m, p) => `<button class="mv${p === ply ? ' cur' : ''}" data-ply="${p}" aria-label="Move ${p}: ${esc(m.san)}"${p === ply ? ' aria-current="true"' : ''}>${esc(m.san)}</button>`;
  if (start[1] === 'b') { html += `<span class="num">${n}.</span><span class="empty">…</span>${mv(hist[0], 1)}`; i = 1; n++; }
  for (; i < hist.length; i += 2, n++) {
    html += `<span class="num">${n}.</span>${mv(hist[i], i + 1)}${hist[i + 1] ? mv(hist[i + 1], i + 2) : '<span></span>'}`;
  }
  const st = g.status();
  if (st.over) html += `<div class="res">${st.result}</div>`;
  box.innerHTML = html;
  const c = box.querySelector('.cur');
  if (c) { const b = box.getBoundingClientRect(), r = c.getBoundingClientRect(); if (r.bottom > b.bottom || r.top < b.top) box.scrollTop += r.top - b.top - b.height / 2; }
  else if (ply === 0) box.scrollTop = 0;
}

function resultText(st) {
  if (!st.over) return '';
  if (st.winner) return `${st.reason} – ${colorName(st.winner)} wins`;
  return `Draw – ${st.reason}`;
}

function renderStatus(g, fen, ply) {
  const st = g.status();
  const el = $('#status');
  const turn = new Chess(fen).turn();
  const chk = new Chess(fen).inCheck();
  let html;
  if (puzzleActive()) html = `<span class="dot ${S.pz.player}"></span> ${colorName(S.pz.player)} to move – puzzle`;
  else if (st.over && S.view === null) html = `🏁 ${esc(resultText(st))}`;
  else if (S.view !== null) html = `👁 Viewing move ${ply} of ${g.ply} – press ⏭ to return`;
  else if (S.thinking) html = '<span class="spinner"></span> AI is thinking…';
  else if (S.mode !== 'pvp' && S.engineState === 'loading' && (S.mode === 'aivai' || turn !== S.human)) html = '<span class="spinner"></span> Loading AI…';
  else if (S.paused) html = '⏸ Paused';
  else html = `<span class="dot ${turn}"></span> ${colorName(turn)} to move${chk ? ' – check!' : ''}`;
  el.innerHTML = html;
  $('#thinking').hidden = !S.thinking || puzzleActive();
  $('#engine-line').textContent = S.engLine;
  const tcLabel = S.tc ? `${S.tc.base / 60}+${S.tc.inc}` : 'no clock';
  $('#game-info').textContent = puzzleActive() ? PZ_LABEL[S.pz.cat] : `${MODE_LABEL[S.mode]}${S.mode !== 'pvp' ? ' · ' + LEVELS[S.level].label : ''} · ${tcLabel}`;
}

function renderButtons(g) {
  const st = g.status();
  const live = S.view === null;
  const isAi = S.mode === 'aivai';
  $('#btn-undo').disabled = puzzleActive() || !g.ply;
  $('#btn-redo').disabled = puzzleActive() || !g.redoStack.length;
  $('#btn-resign').disabled = st.over || isAi || !live || puzzleActive();
  $('#btn-draw').disabled = st.over || isAi || !live || S.thinking || puzzleActive();
  $('#btn-restart').disabled = puzzleActive();
  $('#btn-pause').hidden = S.mode !== 'aivai';
  $('#btn-pause').textContent = S.paused ? 'Resume' : 'Pause';
  const pz = puzzleActive();
  $('#nav-first').disabled = $('#nav-prev').disabled = pz || viewPly() <= 0;
  $('#nav-next').disabled = $('#nav-last').disabled = pz || viewPly() >= g.ply;
}

/* ------------------------------------------------------------------- moves */
async function attemptMove(from, to) {
  const g = cur();
  let promo;
  if (g.needsPromotion(from, to)) {
    promo = settings.autoQueen ? 'q' : await promotionChoice(g.turn);
    if (!promo) { clearSel(); return; }
  }
  const m = g.move(from, to, promo);
  S.selected = null; S.targets = []; S.hintSq = null;
  if (!m) { toast('That move is not legal.', 'error'); refresh(); return; }
  if (puzzleActive()) { puzzleMove(m); return; }
  S.view = null;
  afterMove(m);
}

function animFor(m) {
  const a = [{ from: m.from, to: m.to }];
  if (m.isKingsideCastle()) { const r = m.color === 'w' ? '1' : '8'; a.push({ from: 'h' + r, to: 'f' + r }); }
  else if (m.isQueensideCastle()) { const r = m.color === 'w' ? '1' : '8'; a.push({ from: 'a' + r, to: 'd' + r }); }
  return a;
}

function afterMove(m, keepEval = false) {
  const g = S.game;
  S.overShown = false;
  // Clock: each side's first move is free; afterwards the clock runs with increment.
  if (clock.enabled) {
    if (g.ply === 2) clock.start(g.turn);
    else if (g.ply > 2) clock.switchFrom(m.color, true);
    g.snaps.push(clock.snapshot());
  } else g.snaps.push(null);
  S.evals.length = Math.min(S.evals.length, g.ply + (keepEval ? 1 : 0));
  if (S.mode === 'pvp' && settings.autoFlip) board.setOrientation(g.turn);
  refresh(animFor(m));
  checkEnd();
  maybeAI();
}

function checkEnd() {
  const g = S.game;
  const st = g.status();
  if (!st.over) return false;
  clock.stop();
  cancelAI();
  if (!S.overShown) { S.overShown = true; setTimeout(() => { if (S.game === g && g.status().over) showResult(g.status()); }, 700); }
  refresh();
  return true;
}

function onFlag(color) {
  const g = S.game;
  if (g.status().over) return;
  // FIDE: if the opponent cannot possibly mate, the game is a draw; approximated by bare king check.
  const opp = other(color);
  const ps = [...Game.pieces(g.fen).values()].filter((p) => p.color === opp && p.type !== 'k');
  if (!ps.length) g.end('1/2-1/2', 'Timeout vs insufficient material', null);
  else g.end(opp === 'w' ? '1-0' : '0-1', `${colorName(color)} ran out of time`, opp);
  S.selected = null; S.targets = [];
  checkEnd();
}

function showResult(st) {
  let head, icon;
  if (S.mode === 'ai' && st.winner) { head = st.winner === S.human ? 'You won!' : 'You lost'; icon = st.winner === S.human ? '🏆' : '🤖'; }
  else if (st.winner) { head = `${colorName(st.winner)} wins`; icon = '🏆'; }
  else { head = 'Draw'; icon = '🤝'; }
  const g = S.game;
  const names = playerNames();
  modal({
    title: 'Game over',
    className: 'result-modal',
    html: `<div class="result-big" aria-hidden="true">${icon}</div><div class="result-big result-head">${esc(head)}</div><div class="result-sub">${esc(st.reason)} · ${st.result}</div>
      <div class="result-meta">${esc(names.w)} vs ${esc(names.b)} · ${Math.ceil(g.ply / 2)} moves</div>`,
    actions: [{ label: 'Rematch', value: 'again', primary: true }, { label: 'Analyze', value: 'an' }, { label: 'Copy PGN', value: 'pgn' }, { label: 'New game', value: 'new' }, { label: 'Close', value: null }],
  }).then(async (v) => {
    if (S.game !== g) return;
    if (v === 'again') { startNewGame({ keepSetup: true }); go('game'); }
    else if (v === 'new') go('new');
    else if (v === 'pgn') { await copyText(g.pgn(pgnExtra())); toast('PGN copied'); }
    else if (v === 'an') { go('analysis'); analyzeGame(); }
  });
}

/* ---------------------------------------------------------------------- AI */
function cancelAI() {
  S.gen++;
  if (S.thinking) { S.thinking = false; }
  engine.stop();
}

async function maybeAI() {
  const g = S.game;
  if (g.status().over || S.paused) return;
  const side = g.turn;
  const isAi = S.mode === 'aivai' || (S.mode === 'ai' && side !== S.human);
  if (!isAi || S.engineState === 'failed') return;
  const gen = ++S.gen;
  stopAnalysis(true);
  S.thinking = S.engineState === 'ready';
  refresh();
  const t0 = performance.now();
  try {
    await engine.init();
    if (gen !== S.gen) return;
    S.thinking = true; S.engineState = 'ready'; refresh();
    const cfg = LEVELS[S.level];
    let ms = settings.aiTime !== 'auto' ? +settings.aiTime : cfg.ms;
    const depth = settings.aiDepth !== 'auto' ? +settings.aiDepth : cfg.depth;
    if (clock.enabled) ms = Math.max(40, Math.min(ms, clock.remaining(side) / 30));
    const go = `${depth ? `depth ${depth} ` : ''}movetime ${Math.round(ms)}`;
    const fen = g.fen;
    const ply = g.ply;
    const res = await engine.search({
      fen, go, elo: cfg.elo, skill: cfg.skill, timeoutMs: ms + 15000,
      onInfo: (i) => { if (gen === S.gen) showEngineInfo(i, side, ply); },
    });
    if (gen !== S.gen || !res) return;
    if (!res.bestmove) { S.thinking = false; refresh(); return; }
    const wait = 350 - (performance.now() - t0);
    if (wait > 0) await delay(wait);
    if (gen !== S.gen) return;
    S.thinking = false;
    const m = g.moveUci(res.bestmove);
    if (!m) throw Object.assign(new Error('illegal engine move'), { code: 'worker' });
    S.view = null;
    if (S.evals[ply]) S.evals[ply + 1] = S.evals[ply]; // same evaluation after the engine's best move
    afterMove(m, true);
  } catch (err) {
    if (gen !== S.gen) return;
    S.thinking = false;
    handleEngineError(err, () => maybeAI());
  }
}

let restarts = 0;
async function handleEngineError(err, retry) {
  console.error('Engine error', err); // technical details stay in the console only
  if (err && err.code === 'timeout' && restarts < 2) {
    restarts++;
    toast('The AI stopped responding – restarting it…');
    try { await engine.restart(); setEngineChip('ok'); retry && retry(); return; } catch (e) { /* fall through */ }
  }
  S.engineState = 'failed';
  setEngineChip('err');
  showBanner(err && err.code === 'unsupported'
    ? 'Your browser does not support what the AI needs, so the AI is unavailable. You can still play Player vs Player.'
    : 'The AI could not be started. Player vs Player, puzzles and the FEN/PGN tools still work. Try reloading the page.');
  if (S.mode !== 'pvp') { S.mode = 'pvp'; refresh(); }
  refresh();
}

function showBanner(t) { const b = $('#banner'); b.textContent = t; b.hidden = false; }

function setEngineChip(state) {
  const c = $('#engine-chip');
  c.className = 'chip ' + (state === 'ok' ? 'ok' : state === 'err' ? 'err' : '');
  c.textContent = state === 'ok' ? 'AI ready' : state === 'err' ? 'AI unavailable' : 'AI loading…';
}

function showEngineInfo(i, turn, ply) {
  const sc = toWhite(i, turn);
  if (i.depth >= 5) {
    S.evals[ply] = sc;
    if (viewPly() === ply || (S.view === null && cur().ply === ply)) evalBar.set(sc);
  }
  const nps = i.nps ? ` · ${(i.nps / 1000).toFixed(0)}k nps` : '';
  S.engLine = `AI: depth ${i.depth} · ${formatScore(sc)}${nps}`;
  $('#engine-line').textContent = S.engLine;
}

/* ---------------------------------------------------------- new game etc. */
function readSetup() {
  S.mode = $('input[name="mode"]:checked').value;
  S.level = $('#sel-level').value;
  S.name = ($('#inp-name').value || 'Player').trim().slice(0, 24) || 'Player';
  const tc = $('#sel-tc').value;
  if (tc === 'none') S.tc = null;
  else if (tc === 'custom') {
    const min = Math.min(180, Math.max(0.5, parseFloat($('#tc-min').value) || 5));
    const inc = Math.min(60, Math.max(0, parseInt($('#tc-inc').value, 10) || 0));
    S.tc = { base: Math.round(min * 60), inc };
  } else { const [m, i] = tc.split('+').map(Number); S.tc = { base: m * 60, inc: i }; }
  const side = $('input[name="side"]:checked').value;
  S.human = side === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : side;
}

function startNewGame(opts = {}) {
  cancelAI(); stopAnalysis(true); clock.stop(); hideBanner();
  if (!opts.keepSetup) readSetup();
  if (S.mode !== 'pvp' && S.engineState === 'failed') { S.mode = 'pvp'; toast('AI unavailable – switched to Player vs Player.'); }
  try { S.game = opts.game || new Game(opts.fen); } catch (e) { toast('That position could not be loaded.', 'error'); return false; }
  S.view = null; S.selected = null; S.targets = []; S.evals = []; S.paused = false; S.overShown = false;
  S.engLine = 'AI: –';
  S.pz = null; S.hintSq = null;
  if (S.tab === 'puzzles') setTab('play', true);
  const g = S.game;
  clock.configure(opts.noClock ? null : S.tc);
  if (opts.noClock) S.tc = null;
  g.startSnap = clock.snapshot();
  g.headers = {
    White: playerNames().w, Black: playerNames().b, Variant: 'Standard',
    GameType: MODE_LABEL[S.mode] + (S.mode !== 'pvp' ? ` (${LEVELS[S.level].label})` : ''),
    ...(S.tc ? { TimeControl: S.tc.inc ? `${S.tc.base}+${S.tc.inc}` : `${S.tc.base}` } : {}),
    ...(opts.game ? opts.game.headers : {}),
  };
  board.setOrientation(S.mode === 'ai' ? S.human : 'w');
  S.mainOrient = board.orientation;
  engine.newGame();
  refresh();
  if (!checkEnd()) maybeAI();
  return true;
}
function hideBanner() { if (S.engineState !== 'failed') $('#banner').hidden = true; }
const pgnExtra = () => ({});

/* Undo / redo / restart */
function resumeClock() {
  const g = S.game;
  if (!clock.enabled) return;
  if (g.status().over || g.ply < 2) clock.stop(); else clock.start(g.turn);
}
function doUndo() {
  const g = S.game;
  if (!g.ply) return;
  cancelAI(); stopAnalysis(true);
  g.undo();
  if (S.mode === 'ai' && g.turn !== S.human && g.ply > 0) g.undo();
  if (S.mode === 'aivai') S.paused = true;
  afterTimeTravel();
}
function doRedo() {
  const g = S.game;
  if (!g.redoStack.length) return;
  cancelAI(); stopAnalysis(true);
  g.redo();
  if (S.mode === 'ai' && g.turn !== S.human && g.redoStack.length) g.redo();
  afterTimeTravel();
}
function afterTimeTravel() {
  const g = S.game;
  S.view = null; S.selected = null; S.targets = []; S.overShown = g.status().over; S.hintSq = null;
  if (clock.enabled) { const s = g.clockBefore(); if (s) clock.restore(s); }
  resumeClock();
  engine.newGame(); // reset engine state for the rewound position
  refresh();
  if (!g.status().over) maybeAI();
}
function doRestart() {
  const fen = S.game.startFen;
  startNewGame({ fen, keepSetup: true });
}

async function doResign() {
  const g = S.game;
  if (g.status().over) return;
  let who = S.human;
  if (S.mode === 'pvp') {
    who = await modal({ title: 'Resign', html: '<p>Who is resigning?</p>', actions: [{ label: 'White resigns', value: 'w' }, { label: 'Black resigns', value: 'b' }, { label: 'Cancel', value: null }] });
    if (!who) return;
  } else {
    const ok = await modal({ title: 'Resign?', html: '<p>Do you really want to resign this game?</p>', actions: [{ label: 'Resign', value: true, primary: true }, { label: 'Keep playing', value: false }] });
    if (!ok) return;
  }
  cancelAI();
  g.end(who === 'w' ? '0-1' : '1-0', `${colorName(who)} resigned`, other(who));
  S.selected = null; S.targets = [];
  checkEnd();
}

async function doDraw() {
  const g = S.game;
  if (g.status().over) return;
  let accepted = false;
  if (S.mode === 'pvp') {
    accepted = await modal({ title: 'Draw offer', html: `<p>${colorName(g.turn === 'w' ? 'b' : 'w')} offers a draw. Does ${colorName(g.turn)} accept?</p>`, actions: [{ label: 'Accept', value: true, primary: true }, { label: 'Decline', value: false }] });
  } else {
    if (S.engineState === 'failed') { toast('The AI is not available.', 'error'); return; }
    toast('Waiting for the AI to answer…');
    try {
      let last = null;
      const side = other(S.human);
      const res = await engine.search({ fen: g.fen, go: 'movetime 500', skill: 20, onInfo: (i) => { last = i; } });
      if (!res) return;
      const cp = last ? (last.mate !== undefined ? last.mate * 10000 : last.cp) : 0;
      // the search is for the side to move; convert to the AI's point of view
      const aiCp = g.turn === side ? cp : -cp;
      accepted = aiCp <= 50;
    } catch (e) { toast('The AI did not answer.', 'error'); return; }
    if (!accepted) toast('The AI declines the draw offer.');
  }
  if (accepted) {
    cancelAI();
    g.end('1/2-1/2', 'Draw by agreement', null);
    checkEnd();
  } else if (S.mode === 'pvp') toast('Draw declined.');
}

function goTo(ply) {
  const g = S.game;
  if (puzzleActive()) return;
  ply = Math.max(0, Math.min(g.ply, ply));
  S.view = ply === g.ply ? null : ply;
  S.selected = null; S.targets = [];
  refresh();
}

/* ---------------------------------------------------------------- analysis */
const A = { seq: 0, lines: {}, fen: '', ply: 0, running: false, raf: 0, busyGame: false };

function analysisGo() {
  const v = $('#an-depth').value;
  if (v === 'infinite') return 'infinite';
  const d = v === 'custom' ? Math.min(40, Math.max(1, parseInt($('#an-custom-val').value, 10) || 18)) : +v;
  return `depth ${d}`;
}

function pvToSan(fen, pv, max = 12) {
  const c = new Chess(fen);
  let num = parseInt(fen.split(' ')[5], 10) || 1;
  const out = [];
  for (let i = 0; i < pv.length && i < max; i++) {
    try {
      const m = c.move({ from: pv[i].slice(0, 2), to: pv[i].slice(2, 4), promotion: pv[i][4] });
      if (m.color === 'w') out.push(`${num}. ${m.san}`);
      else { out.push(i === 0 ? `${num}… ${m.san}` : m.san); num++; }
    } catch (e) { break; }
  }
  return out.join(' ');
}

function setAnalysisUI(running) {
  A.running = running;
  $('#an-start').disabled = running || A.busyGame;
  $('#an-stop').disabled = !running && !A.busyGame;
  $('#an-game').disabled = running || A.busyGame;
}

function renderAnalysis() {
  A.raf = 0;
  const l1 = A.lines[1];
  const out = $('#an-out');
  if (!l1) return;
  const turn = new Chess(A.fen).turn();
  const sc = toWhite(l1, turn);
  S.evals[A.ply] = sc;
  if (viewPly() === A.ply) evalBar.set(sc);
  const best = l1.pv ? pvToSan(A.fen, l1.pv.slice(0, 1)).replace(/^\d+\.+\s*…?\s*/, '').replace(/^\d+…\s*/, '') : '–';
  const mate = sc.mate !== undefined ? ` (mate in ${Math.abs(sc.mate)})` : '';
  let html = `<div class="an-head"><b>${formatScore(sc)}</b><span>Depth ${l1.depth}${l1.seldepth ? '/' + l1.seldepth : ''}</span><span>Best: <strong>${esc(best)}</strong></span><span>${l1.nodes ? (l1.nodes / 1000).toFixed(0) + 'k nodes' : ''}${l1.nps ? ' · ' + (l1.nps / 1000).toFixed(0) + 'k nps' : ''}</span></div>`;
  if (mate) html += `<div class="muted">Forced mate${esc(mate)}</div>`;
  for (const k of Object.keys(A.lines).sort()) {
    const l = A.lines[k];
    html += `<div class="an-line"><span class="sc">${formatScore(toWhite(l, turn))}</span> ${esc(pvToSan(A.fen, l.pv || []))}</div>`;
  }
  out.innerHTML = html;
  S.engLine = `AI: depth ${l1.depth} · ${formatScore(sc)}`;
  $('#engine-line').textContent = S.engLine;
}

async function runAnalysis() {
  if (S.thinking) { toast('Wait for the AI to finish its move.'); return; }
  if (S.engineState === 'failed') { toast('The AI is not available.', 'error'); return; }
  const g = cur();
  const ply = viewPly();
  const fen = g.fenAt(ply);
  const c = new Chess(fen);
  const id = ++A.seq;
  A.lines = {}; A.fen = fen; A.ply = ply;
  if (c.isGameOver()) {
    const sc = c.isCheckmate() ? { mate: 0, cp: undefined } : { cp: 0 };
    $('#an-out').innerHTML = `<span class="muted">${c.isCheckmate() ? 'Checkmate.' : 'The game is over (draw).'}</span>`;
    S.evals[ply] = c.isCheckmate() ? { mate: 0 } : sc; return;
  }
  setAnalysisUI(true);
  $('#an-out').innerHTML = '<span class="spinner"></span> Analyzing…';
  try {
    const res = await engine.search({
      fen, go: analysisGo(), multipv: +$('#an-lines').value, skill: 20, timeoutMs: 10 * 60 * 1000,
      onInfo: (i) => { if (id !== A.seq) return; A.lines[i.multipv] = i; if (!A.raf) A.raf = requestAnimationFrame(renderAnalysis); },
    });
    if (id === A.seq) { renderAnalysis(); if (res && !res.bestmove) $('#an-out').innerHTML += '<div class="muted">No legal moves.</div>'; }
  } catch (err) {
    if (id === A.seq) handleEngineError(err);
  } finally {
    if (id === A.seq) setAnalysisUI(false);
  }
}

function stopAnalysis(silent) {
  A.seq++;
  A.busyGame = false;
  if (!S.thinking) engine.stop();
  setAnalysisUI(false);
  $('#an-progress').hidden = true;
  if (!silent && Object.keys(A.lines).length) renderAnalysis();
}

function scheduleLiveAnalysis() {
  clearTimeout(S.analysisTimer);
  S.analysisTimer = setTimeout(() => {
    if (S.tab === 'analysis' && $('#an-live').checked && !S.thinking && !A.busyGame && engine.ready) runAnalysis();
  }, 300);
}

async function analyzeGame() {
  if (S.thinking) { toast('Wait for the AI to finish its move.'); return; }
  if (S.engineState === 'failed') { toast('The AI is not available.', 'error'); return; }
  const g = S.game;
  const id = ++A.seq;
  A.busyGame = true; setAnalysisUI(false);
  const prog = $('#an-progress'); prog.hidden = false;
  $('#an-out').innerHTML = '<span class="spinner"></span> Analyzing the whole game…';
  const n = g.ply;
  try {
    for (let ply = 0; ply <= n; ply++) {
      if (id !== A.seq) return;
      const fen = g.fenAt(ply);
      const c = new Chess(fen);
      if (c.isGameOver()) S.evals[ply] = c.isCheckmate() ? { mate: 0, cp: undefined, loser: c.turn() } : { cp: 0 };
      if (c.isCheckmate()) S.evals[ply] = { mate: c.turn() === 'w' ? -1 : 1 };
      else if (c.isGameOver()) S.evals[ply] = { cp: 0 };
      else {
        let last = null;
        const res = await engine.search({ fen, go: 'movetime 250', skill: 20, onInfo: (i) => { last = i; } });
        if (id !== A.seq || !res) return;
        if (last) S.evals[ply] = toWhite(last, c.turn());
      }
      prog.firstElementChild.style.width = `${((ply + 1) / (n + 1)) * 100}%`;
      graph.set(S.evals.slice(0, n + 1).map((s) => (s ? graphValue(s) : null)), viewPly());
    }
    $('#an-out').innerHTML = '<span class="muted">Game analysis complete. Click the graph to jump to a move.</span>';
  } catch (err) {
    handleEngineError(err);
  } finally {
    if (id === A.seq) { A.busyGame = false; prog.hidden = true; setAnalysisUI(false); refresh(); }
  }
}

/* ----------------------------------------------------------------- puzzles */
function pzList() { const c = $('#pz-cat').value; return c === 'custom' ? (S.customPz ? [S.customPz] : []) : (PUZZLES[c] || []); }

function fillPzPick() {
  const list = pzList();
  const sel = $('#pz-pick');
  sel.innerHTML = list.length ? list.map((p, i) => `<option value="${i}">#${i + 1}${p.turn ? ' – ' + colorName(p.turn) + ' to move' : ''}</option>`).join('') : '<option value="">(none)</option>';
  $('#pz-custom').hidden = $('#pz-cat').value !== 'custom';
  $('#pz-start').disabled = !list.length;
}

function startPuzzle(i) {
  const list = pzList();
  const p = list[i];
  if (!p) return;
  const cat = $('#pz-cat').value;
  let game;
  try { game = new Game(p.fen); } catch (e) { toast('Invalid puzzle position.', 'error'); return; }
  if (!puzzleActive()) S.mainOrient = board.orientation;
  const mateN = cat.startsWith('mate') ? +cat[4] : 0;
  S.pz = { cat, i, p, sol: [...p.solution], game, step: 0, attempts: 0, state: 'playing', busy: false, player: game.turn, mateLeft: mateN };
  S.selected = null; S.targets = []; S.hintSq = null; S.view = null;
  $('#pz-pick').value = String(i);
  const what = { mate1: 'Find mate in 1.', mate2: 'Find mate in 2.', mate3: 'Find mate in 3.', best: 'Find the best move.', tactical: 'Find the winning tactic.', custom: 'Find the solution.' }[cat];
  $('#pz-prompt').textContent = `${colorName(game.turn)} to move. ${what}`;
  setFeedback('');
  board.setOrientation(game.turn);
  updatePzButtons();
  document.body.dataset.puzzle = 'on';
  refresh();
}

function setFeedback(t, cls = '') { const f = $('#pz-feedback'); f.textContent = t; f.className = 'pz-feedback ' + cls; }

function updatePzButtons() {
  const pz = S.pz;
  $('#pz-hint').disabled = !pz || pz.state !== 'playing';
  $('#pz-solution').disabled = !pz || pz.state !== 'playing' || pz.attempts < 2;
  $('#pz-next').disabled = !pz || pz.cat === 'custom' && pzList().length < 2;
}

function pzSolved(text = 'Correct! Puzzle solved. 🎉') {
  S.pz.state = 'solved';
  setFeedback(text, 'good');
  updatePzButtons();
  refresh();
}

async function puzzleMove(m) {
  const pz = S.pz, g = pz.game;
  const uci = m.from + m.to + (m.promotion || '');
  const mate = g.chess.isCheckmate();
  if (uci === pz.sol[pz.step]) return pzCorrect(m);
  if (pz.cat.startsWith('mate') && mate) return pzSolved();
  // Mate puzzles: accept another move if it still forces mate in time (checked by the engine).
  if (pz.cat.startsWith('mate') && pz.mateLeft > 1 && S.engineState !== 'failed') {
    pz.busy = true; refresh(animFor(m));
    setFeedback('Checking your move…');
    try {
      let last = null;
      const res = await engine.search({ fen: g.fen, go: 'depth 12', skill: 20, onInfo: (i) => { if (i.multipv === 1) last = i; } });
      if (res && last && last.mate !== undefined && last.mate < 0 && Math.abs(last.mate) <= pz.mateLeft - 1) {
        pz.sol = pz.sol.slice(0, pz.step).concat([uci], last.pv || []);
        pz.busy = false;
        return pzCorrect(m);
      }
    } catch (e) { /* treat as wrong */ }
    pz.busy = false;
  }
  g.undo();
  pz.attempts++;
  setFeedback(pz.attempts >= 2 ? 'Incorrect – try again. (You can now reveal the solution.)' : 'Incorrect – try again.', 'bad');
  updatePzButtons();
  refresh();
}

async function pzCorrect(m) {
  const pz = S.pz, g = pz.game;
  pz.step++;
  if (pz.mateLeft) pz.mateLeft--;
  const done = pz.cat.startsWith('mate') ? g.chess.isCheckmate() : pz.step >= pz.sol.length;
  if (done) { refresh(animFor(m)); pzSolved(); return; }
  pz.busy = true;
  setFeedback('Correct! Keep going…', 'good');
  refresh(animFor(m));
  await delay(550);
  if (S.pz !== pz) return;
  const reply = g.moveUci(pz.sol[pz.step]);
  pz.step++;
  pz.busy = false;
  if (!reply) { pzSolved(); return; }
  refresh(animFor(reply));
  if (g.status().over && !g.chess.isCheckmate()) pzSolved();
}

async function showPzSolution() {
  const pz = S.pz;
  if (!pz || pz.state !== 'playing') return;
  pz.busy = true; pz.state = 'revealed';
  updatePzButtons();
  setFeedback('Solution:', '');
  const san = [];
  while (pz.step < pz.sol.length) {
    const m = pz.game.moveUci(pz.sol[pz.step]);
    if (!m) break;
    san.push(m.san);
    pz.step++;
    refresh(animFor(m));
    await delay(700);
    if (S.pz !== pz) return;
  }
  pz.busy = false;
  setFeedback('Solution: ' + san.join(' '), '');
  refresh();
}

function showPzHint() {
  const pz = S.pz;
  if (!pz || pz.state !== 'playing') return;
  const mv = pz.sol[pz.step];
  if (!mv) return;
  S.hintSq = mv.slice(0, 2);
  setFeedback('Hint: look at the highlighted piece.');
  refresh();
}

function loadCustomPuzzle() {
  const fen = $('#pz-fen').value.trim();
  const sol = $('#pz-sol').value.trim().split(/[\s,]+/).filter(Boolean);
  const v = validateFen(fen);
  if (!v.ok) { setFeedback('Invalid FEN: ' + v.error, 'bad'); return; }
  if (!sol.length) { setFeedback('Enter at least one solution move.', 'bad'); return; }
  const c = new Chess(fen);
  const uci = [];
  for (const s of sol) {
    let m = null;
    try {
      if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(s)) m = c.move({ from: s.slice(0, 2), to: s.slice(2, 4), promotion: s[4] });
      else m = c.move(s);
    } catch (e) { m = null; }
    if (!m) { setFeedback(`Move "${s}" is not legal in that position.`, 'bad'); return; }
    uci.push(m.from + m.to + (m.promotion || ''));
  }
  S.customPz = { fen, solution: uci, turn: new Chess(fen).turn() };
  fillPzPick();
  startPuzzle(0);
}

/* ------------------------------------------------------------- FEN / PGN */
function ioMsg(t, kind) { const m = $('#io-msg'); m.textContent = t; m.className = 'io-msg ' + (kind || ''); }

function loadFen() {
  const fen = $('#io-fen').value.trim();
  const v = validateFen(fen);
  if (!v.ok) { ioMsg('Invalid FEN: ' + v.error, 'err'); return; }
  try { new Chess(fen); } catch (e) { ioMsg('That FEN is not a valid chess position.', 'err'); return; }
  if (startNewGame({ fen })) { ioMsg('Position loaded. Good luck!', 'ok'); toast('Position loaded'); go('game'); }
}

function importPgn() {
  const text = $('#io-pgn').value.trim();
  if (!text) { ioMsg('Paste a PGN first.', 'err'); return; }
  let g;
  try { g = new Game(); g.loadPgn(text); } catch (e) { ioMsg('Invalid PGN – could not read the game. Check the move text and headers.', 'err'); return; }
  const h = g.chess.getHeaders();
  S.mode = 'pvp';
  $('input[name="mode"][value="pvp"]').checked = true;
  syncSetup();
  if (startNewGame({ game: g, keepSetup: true, noClock: true })) {
    S.game.headers = { ...S.game.headers, White: h.White || 'White', Black: h.Black || 'Black' };
    goTo(0);
    ioMsg(`Imported ${g.ply} moves.`, 'ok');
    toast(`Imported ${g.ply} moves. Use the arrows to replay.`);
    go('game');
  }
}

function exportPgn() { const p = S.game.pgn(pgnExtra()); $('#io-pgn').value = p; return p; }

/* ------------------------------------------------------------------ tabs */
function setTab(name, silent) {
  if (name === 'puzzles' && !S.pz) fillPzPick();
  const was = S.tab;
  S.tab = name;
  if (was === 'puzzles' && name !== 'puzzles') { board.setOrientation(S.mainOrient); }
  if (name === 'puzzles' && S.pz && was !== 'puzzles') { S.mainOrient = board.orientation; board.setOrientation(S.pz.player); }
  if (was === 'analysis' && name !== 'analysis' && !A.busyGame) stopAnalysis(true);
  S.selected = null; S.targets = [];
  if (!silent) refresh();
}

/* -------------------------------------------------------------- navigation */
const VIEW_TAB = { game: 'play', analysis: 'analysis', puzzles: 'puzzles' };
const NAV_OF = { home: 'home', game: 'game', new: 'game', analysis: 'analysis', puzzles: 'puzzles', more: 'more', settings: 'more', io: 'more', about: 'more' };

function go(view, push = true) {
  if (!NAV_OF[view]) view = 'home';
  closeSheet();
  const tab = VIEW_TAB[view] || 'play';
  if (tab !== S.tab) setTab(tab, true);
  document.body.dataset.view = view;
  $$('[data-v]').forEach((el) => { el.hidden = !el.dataset.v.split(' ').includes(view); });
  $$('.bottom-nav button').forEach((b) => { if (b.dataset.go === NAV_OF[view]) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (view === 'home') renderHome();
  if (view === 'settings') renderSettings($('#settings-body'), settings, onSettingChange);
  if (push && history.state?.v !== view) history.pushState({ v: view }, '');
  refresh();
  window.scrollTo(0, 0);
}

function onSettingChange(k) {
  applySettings();
  if (k === 'aiLevel') $('#sel-level').value = settings.aiLevel;
  if (k === 'legal' || k === 'coords') refresh();
}

function renderHome() {
  const g = S.game;
  const resume = $('#home-resume');
  const live = g.ply > 0 && !g.status().over;
  resume.hidden = !live;
  if (live) {
    const n = playerNames();
    $('#home-resume-sub').textContent = `${n.w} vs ${n.b} · ${g.ply} ${g.ply === 1 ? 'move' : 'moves'} · ${colorName(g.turn)} to move`;
  }
}

function openSheet() {
  const w = $('#sheet-game');
  w.hidden = false;
  $('.sheet .btn:not(:disabled)', w)?.focus();
}
function closeSheet() { $('#sheet-game').hidden = true; }

function syncSetup() {
  const mode = $('input[name="mode"]:checked').value;
  $('#f-side').hidden = mode !== 'ai';
  $('#f-level').hidden = mode === 'pvp';
  $('#custom-tc').hidden = $('#sel-tc').value !== 'custom';
}

/* ------------------------------------------------------------------ wiring */
function wire() {
  $('#btn-theme').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    settings.theme = dark ? 'light' : 'dark';
    applySettings();
  });
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
  $('#brand-home').addEventListener('click', () => go('home'));
  window.addEventListener('popstate', (e) => go(e.state?.v || 'home', false));
  $('#home-quick').addEventListener('click', () => {
    $('input[name="mode"][value="ai"]').checked = true; syncSetup();
    startNewGame(); go('game');
  });
  $('#home-new').addEventListener('click', () => go('new'));
  $('#home-resume').addEventListener('click', () => go('game'));
  $('#btn-menu').addEventListener('click', openSheet);
  $('#sheet-game').addEventListener('click', (e) => { if (e.target.closest('[data-close], .sheet-list .btn')) closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  $('#btn-sheet-io').addEventListener('click', () => go('io'));
  $('#btn-sheet-settings').addEventListener('click', () => go('settings'));
  $('#btn-flip').addEventListener('click', () => { board.flip(); if (!puzzleActive()) S.mainOrient = board.orientation; refresh(); });
  $('#nav-first').addEventListener('click', () => goTo(0));
  $('#nav-prev').addEventListener('click', () => goTo(viewPly() - 1));
  $('#nav-next').addEventListener('click', () => goTo(viewPly() + 1));
  $('#nav-last').addEventListener('click', () => goTo(S.game.ply));
  $('#moves').addEventListener('click', (e) => { const b = e.target.closest('.mv'); if (b) goTo(+b.dataset.ply); });
  $('#btn-new').addEventListener('click', () => go('new'));
  $('#btn-start').addEventListener('click', () => { startNewGame(); go('game'); });
  $('#btn-restart').addEventListener('click', () => { doRestart(); go('game'); });
  $('#btn-undo').addEventListener('click', doUndo);
  $('#btn-redo').addEventListener('click', doRedo);
  $('#btn-resign').addEventListener('click', doResign);
  $('#btn-draw').addEventListener('click', doDraw);
  $('#btn-pause').addEventListener('click', () => {
    S.paused = !S.paused;
    if (S.paused) { cancelAI(); clock.stop(); } else { resumeClock(); maybeAI(); }
    refresh();
  });
  $$('input[name="mode"], #sel-tc').forEach((el) => el.addEventListener('change', syncSetup));
  // analysis
  $('#an-depth').addEventListener('change', () => { $('#an-custom').hidden = $('#an-depth').value !== 'custom'; });
  $('#an-start').addEventListener('click', runAnalysis);
  $('#an-stop').addEventListener('click', () => stopAnalysis());
  $('#an-game').addEventListener('click', analyzeGame);
  $('#an-live').addEventListener('change', () => { if ($('#an-live').checked) scheduleLiveAnalysis(); else stopAnalysis(); });
  // puzzles
  $('#pz-cat').addEventListener('change', fillPzPick);
  $('#pz-start').addEventListener('click', () => startPuzzle(+($('#pz-pick').value || 0)));
  $('#pz-pick').addEventListener('change', () => startPuzzle(+$('#pz-pick').value));
  $('#pz-hint').addEventListener('click', showPzHint);
  $('#pz-solution').addEventListener('click', showPzSolution);
  $('#pz-next').addEventListener('click', () => { const l = pzList(); if (l.length) startPuzzle(((S.pz ? S.pz.i : -1) + 1) % l.length); });
  $('#pz-load').addEventListener('click', loadCustomPuzzle);
  // io
  $('#fen-load').addEventListener('click', loadFen);
  $('#io-fen').addEventListener('keydown', (e) => { if (e.key === 'Enter') loadFen(); });
  $('#fen-copy').addEventListener('click', async () => { const ok = await copyText($('#io-fen').value); ioMsg(ok ? 'FEN copied to clipboard.' : 'Could not copy – select the text and copy manually.', ok ? 'ok' : 'err'); });
  $('#fen-export').addEventListener('click', () => { download('position.fen', $('#io-fen').value + '\n'); ioMsg('FEN file downloaded.', 'ok'); });
  $('#pgn-import').addEventListener('click', importPgn);
  $('#pgn-export').addEventListener('click', () => { exportPgn(); ioMsg('PGN generated.', 'ok'); });
  $('#pgn-copy').addEventListener('click', async () => { const ok = await copyText(exportPgn()); ioMsg(ok ? 'PGN copied to clipboard.' : 'Could not copy – select the text and copy manually.', ok ? 'ok' : 'err'); });
  $('#pgn-download').addEventListener('click', () => { const p = exportPgn(); download(`rookery-${new Date().toISOString().slice(0, 10)}.pgn`, p + '\n', 'application/x-chess-pgn'); ioMsg('PGN file downloaded.', 'ok'); });
  // keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t.closest && (t.closest('input, textarea, select, dialog, #board'))) return;
    if (!VIEW_TAB[document.body.dataset.view]) return;
    if (e.key === 'ArrowLeft') { goTo(viewPly() - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { goTo(viewPly() + 1); e.preventDefault(); }
    else if (e.key === 'Home') { goTo(0); e.preventDefault(); }
    else if (e.key === 'End') { goTo(S.game.ply); e.preventDefault(); }
    else if (e.key === 'f' || e.key === 'F') $('#btn-flip').click();
  });
  window.addEventListener('error', (e) => { console.error(e.error || e.message); });
  window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); });
  window.addEventListener('beforeunload', () => engine.destroy());
  // engine
  engine.onError = (err) => handleEngineError(err);
}

function boot() {
  applySettings();
  $('#sel-level').value = settings.aiLevel;
  wire();
  syncSetup();
  fillPzPick();
  const sup = typeof Worker !== 'undefined' && typeof WebAssembly === 'object';
  if (!sup) { S.engineState = 'failed'; setEngineChip('err'); showBanner('Your browser does not support what the AI needs, so the AI is unavailable. Player vs Player still works.'); $('input[name="mode"][value="pvp"]').checked = true; S.mode = 'pvp'; syncSetup(); }
  startNewGame();
  history.replaceState({ v: 'home' }, '');
  go('home', false);
  if (sup) {
    engine.init().then(() => { S.engineState = 'ready'; setEngineChip('ok'); refresh(); })
      .catch((err) => handleEngineError(err));
  }
  window.__rookery = { S, engine, board, clock }; // handy for debugging in the console
}
boot();
