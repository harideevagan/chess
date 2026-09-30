# Rookery Chess

A complete browser chess game with **Stockfish 19** (WASM, Web Worker). Static site, no backend.
Vite + vanilla JS + chess.js.

## Features
Player vs AI / Player vs Player / AI vs AI, 5 difficulty levels (Stockfish Skill Level + UCI_Elo + time/depth),
chess clocks (bullet/blitz/rapid/custom, increment), undo/redo/restart/resign/draw offer, move list with
navigation, FEN load/copy/export, PGN import/export/copy/download, analysis (eval, best move, PV, depth,
multi-line, eval graph), puzzles (mate in 1/2/3, best move, tactics, custom FEN + solution), 6 board themes,
5 piece styles, light/dark theme, touch + drag + click + keyboard support.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
```
## Build
```bash
npm run build      # output in dist/
npm run preview    # test the production build on http://localhost:4173
```
## Deploy to Netlify
1. Push this folder to GitHub.
2. Netlify -> Add new site -> Import from Git -> pick the repo.
3. Settings are read from `netlify.toml` (build `npm run build`, publish `dist`). Click Deploy.
(Or drag the `dist/` folder onto Netlify Drop after `npm run build`.)

## How Stockfish is integrated
`public/stockfish/stockfish-19-lite-single.js` is itself a Web Worker script. It reads the WASM file name
from its own URL (same name, `.wasm`) so both files sit side by side, unrenamed, in `public/stockfish/`.
`src/chess/engine.js` creates `new Worker('/stockfish/stockfish-19-lite-single.js')` and talks UCI
(`uci`, `isready`, `ucinewgame`, `position fen`, `go depth|movetime|infinite`, `stop`, `quit`). It parses
`info` lines (depth, score cp/mate, nodes, nps, pv, multipv) and `bestmove`. One worker only; a new search
first stops the old one; a watchdog restarts the engine if it stops answering; load/worker errors show
friendly messages and the app falls back to Player vs Player.

## License
Stockfish.js 19 is GPLv3, so this project is distributed under **GPL-3.0-or-later**.
- `LICENSE` / `public/LICENSE.txt` - full GPLv3 text
- `NOTICE` / `public/NOTICE.txt` - Stockfish, chess.js attribution (also in the in-app "About & licenses")
- Copyright header kept inside `public/stockfish/stockfish-19-lite-single.js`
Keep your repository public (or provide source on request) when you deploy, to satisfy the GPL.

## Limitations
- Lite single-threaded engine: strong, but weaker than native Stockfish with big nets.
- Clocks run only while the page is open; no online multiplayer or accounts.
- Puzzle set is small (39, generated with Stockfish); add more in `src/chess/puzzles-data.js`.
- Needs a browser with WebAssembly and Web Workers (all current Chrome, Safari, Firefox, Edge).
