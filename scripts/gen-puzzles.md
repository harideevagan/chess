# Puzzle generator
`gen-puzzles.html` (a Vite page, import paths assume it sits in the project root) plays weak
Stockfish-vs-Stockfish games and keeps positions where Stockfish (depth 12, MultiPV 2) finds a unique
forced mate in 1-3 or a unique winning move. Its output was pasted into `src/chess/puzzles-data.js`.
You can also add your own puzzles in the app (Puzzles tab -> "My puzzle") or in that data file.
