// Stockfish 19 (lite, single-threaded WASM) wrapper.
// The attached stockfish-19-lite-single.js is itself a Web Worker script: when loaded with
// `new Worker(url)` it fetches "<same name>.wasm" next to it and speaks plain UCI strings via
// postMessage / onmessage. So the worker is created directly from that file.

export const ENGINE_JS = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`;

/** Parse a UCI "info ..." line. Returns null if it carries no useful data. */
export function parseInfo(line) {
  if (!line.startsWith('info ') || line.includes('string ')) return null;
  const t = line.split(/\s+/);
  const out = { multipv: 1 };
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth': out.depth = +t[++i]; break;
      case 'seldepth': out.seldepth = +t[++i]; break;
      case 'multipv': out.multipv = +t[++i]; break;
      case 'nodes': out.nodes = +t[++i]; break;
      case 'nps': out.nps = +t[++i]; break;
      case 'time': out.time = +t[++i]; break;
      case 'score': {
        const kind = t[++i];
        const val = +t[++i];
        if (kind === 'cp') out.cp = val;
        else if (kind === 'mate') out.mate = val;
        if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') i++;
        break;
      }
      case 'pv': out.pv = t.slice(i + 1); i = t.length; break;
      default: break;
    }
  }
  return out.depth !== undefined && (out.cp !== undefined || out.mate !== undefined) ? out : null;
}

export class Engine {
  constructor() {
    this.worker = null;
    this.ready = null; // Promise that resolves when engine answered "uciok" + "readyok"
    this.job = null;
    this.seq = 0;
    this.applied = {}; // UCI options currently applied
    this.failed = false;
    this.onError = () => {};
    this.lastSearchStart = 0;
  }

  /** Start the worker (only once). Resolves when the engine is ready. */
  init() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      let settled = false;
      const fail = (err) => {
        if (settled) { this.onError(err); return; }
        settled = true;
        this.failed = true;
        this._kill();
        reject(err);
      };
      let w;
      try {
        if (typeof Worker === 'undefined' || typeof WebAssembly !== 'object') {
          throw new Error('unsupported');
        }
        w = new Worker(ENGINE_JS);
      } catch (e) {
        fail(Object.assign(new Error('Your browser does not support WebAssembly Web Workers.'), { code: 'unsupported' }));
        return;
      }
      this.worker = w;
      const timer = setTimeout(() => fail(Object.assign(new Error('Engine start timed out.'), { code: 'timeout' })), 25000);
      let phase = 'uci';
      w.onerror = (e) => {
        clearTimeout(timer);
        this.failed = true;
        fail(Object.assign(new Error('Engine worker error.'), { code: 'worker', detail: e && e.message }));
      };
      w.onmessageerror = w.onerror;
      w.onmessage = (ev) => {
        const line = typeof ev.data === 'string' ? ev.data : '';
        if (phase === 'uci' && line === 'uciok') {
          phase = 'ready';
          this._send('setoption name Hash value 32');
          this._send('isready');
        } else if (phase === 'ready' && line === 'readyok') {
          phase = 'run';
          clearTimeout(timer);
          settled = true;
          w.onmessage = (e) => this._onLine(e.data);
          resolve(true);
        }
      };
      this._send('uci');
    });
    // Avoid unhandled rejection noise; callers handle errors themselves.
    this.ready.catch(() => {});
    return this.ready;
  }

  _send(cmd) { if (this.worker) this.worker.postMessage(cmd); }

  _kill() {
    if (this.worker) { try { this.worker.terminate(); } catch (e) { /* ignore */ } }
    this.worker = null;
  }

  _onLine(line) {
    if (typeof line !== 'string') return;
    if (line.startsWith('info ')) {
      const job = this.job;
      if (!job || job.cancelled || !job.onInfo) return;
      const info = parseInfo(line);
      if (info) job.onInfo(info);
    } else if (line.startsWith('bestmove')) {
      const job = this.job;
      this.job = null;
      if (!job) return;
      clearTimeout(job.watchdog);
      const parts = line.split(/\s+/);
      const best = parts[1] && parts[1] !== '(none)' && parts[1] !== '0000' ? parts[1] : null;
      job.finish(job.cancelled ? null : { bestmove: best, ponder: parts[3] || null });
    }
  }

  /** Stop the running search (if any). Resolves after the engine reported its bestmove. */
  stop() {
    const job = this.job;
    if (!job) return Promise.resolve();
    job.cancelled = true;
    this._send('stop');
    return job.done;
  }

  async newGame() {
    await this.stop();
    if (!this.worker) return;
    this._send('ucinewgame');
    this._send('isready');
  }

  /** Apply skill/elo/multipv options, only sending what changed. */
  _configure({ elo = null, skill = 20, multipv = 1 }) {
    const want = {
      'UCI_LimitStrength': elo ? 'true' : 'false',
      'Skill Level': String(skill),
      'MultiPV': String(multipv),
    };
    if (elo) want['UCI_Elo'] = String(elo);
    for (const [k, v] of Object.entries(want)) {
      if (this.applied[k] !== v) {
        this._send(`setoption name ${k} value ${v}`);
        this.applied[k] = v;
      }
    }
  }

  /**
   * Search a position.
   * @param {{fen:string, go:string, elo?:number|null, skill?:number, multipv?:number,
   *          onInfo?:(i:object)=>void, timeoutMs?:number}} o
   * @returns {Promise<{bestmove:string|null, ponder:string|null}|null>} null when cancelled/superseded.
   */
  async search(o) {
    const id = ++this.seq;
    await this.ready; // throws if engine failed to load
    await this.stop();
    if (id !== this.seq) return null; // a newer request replaced this one
    if (!this.worker) throw Object.assign(new Error('Engine is not running.'), { code: 'worker' });
    this._configure(o);
    let finish;
    const done = new Promise((r) => { finish = r; });
    const result = new Promise((resolve, reject) => {
      const job = {
        cancelled: false,
        onInfo: o.onInfo,
        done,
        finish: (v) => { resolve(v); finish(); },
        watchdog: null,
      };
      job.watchdog = setTimeout(() => this._watchdog(job, reject), o.timeoutMs || 60000);
      this.job = job;
    });
    this._send(`position fen ${o.fen}`);
    this._send(`go ${o.go}`);
    return result;
  }

  _watchdog(job, reject) {
    if (this.job !== job) return;
    // Engine did not answer: ask it to stop, then give it 3s before we declare a crash.
    this._send('stop');
    job.watchdog = setTimeout(() => {
      if (this.job !== job) return;
      this.job = null;
      this._kill();
      this.ready = null;
      this.applied = {};
      job.finish(null);
      reject(Object.assign(new Error('Engine timeout'), { code: 'timeout' }));
    }, 3000);
  }

  /** Restart the worker after a crash. */
  async restart() {
    this._kill();
    this.ready = null;
    this.job = null;
    this.applied = {};
    this.failed = false;
    return this.init();
  }

  destroy() {
    if (this.worker) { this._send('quit'); this._kill(); }
  }
}
