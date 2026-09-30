// Puzzles generated with the bundled Stockfish 19 (scripts/gen-puzzles.md explains how) and verified:
// mate puzzles have a unique forced mate; best-move/tactical puzzles have a unique winning move.
// Format: { fen, solution: [uci moves: solver first, then reply, ...], turn }
export const PUZZLES = {
 "mate1": [
  {
   "fen": "4rrk1/p1p3p1/2p3p1/Q2pq3/1P4bp/P1P1P3/3P4/1R2K3 b - - 0 27",
   "solution": [
    "e5g3"
   ],
   "turn": "b"
  },
  {
   "fen": "7r/ppp4k/2n4p/b1P2ppN/1P1p1P1N/PQ1P3b/7P/R1B1rBK1 w - - 2 25",
   "solution": [
    "b3f7"
   ],
   "turn": "w"
  },
  {
   "fen": "2N2kr1/6b1/p2pp2p/5p2/7Q/P3p3/1PrqBPPP/2R2RK1 w - - 0 29",
   "solution": [
    "h4e7"
   ],
   "turn": "w"
  },
  {
   "fen": "2b3r1/p3pk1p/p7/P2p4/7p/2P1PP1P/4RK2/1q6 b - - 2 32",
   "solution": [
    "b1g1"
   ],
   "turn": "b"
  },
  {
   "fen": "3rkbr1/1p2nn1p/2p5/1NB5/p3pP1P/P7/1PKR4/4R3 w - - 6 34",
   "solution": [
    "b5c7"
   ],
   "turn": "w"
  },
  {
   "fen": "1rb1Q3/p1p2R2/3k2qr/1p1p4/4p2P/2N5/PPP3B1/2KR4 w - - 3 24",
   "solution": [
    "d1d5"
   ],
   "turn": "w"
  },
  {
   "fen": "1rb5/p1p1QR2/2k3qr/1p1p4/4p2P/2N5/PPP3B1/2KR4 w - - 5 25",
   "solution": [
    "e7c7"
   ],
   "turn": "w"
  },
  {
   "fen": "q3k2r/2p3Q1/3R1P2/8/8/PP2PN1p/5PPP/2R3K1 w - - 3 28",
   "solution": [
    "g7e7"
   ],
   "turn": "w"
  }
 ],
 "mate2": [
  {
   "fen": "2b2kr1/6b1/pN1pp2p/5p2/4p2Q/P7/1PrqBPPP/2R2RK1 w - - 4 28",
   "solution": [
    "h4d8",
    "f8f7",
    "e2h5"
   ],
   "turn": "w"
  },
  {
   "fen": "1rb3Q1/p1p2R2/4k1qr/1p1p4/4p2P/2N5/PPP3B1/2KR4 w - - 1 23",
   "solution": [
    "g8e8",
    "e6d6",
    "d1d5"
   ],
   "turn": "w"
  },
  {
   "fen": "7r/p4k1p/3b3p/P2p1p1P/2bP1P2/1r6/2q3P1/R5K1 b - - 1 31",
   "solution": [
    "b3b2",
    "g2g4",
    "c2h2"
   ],
   "turn": "b"
  },
  {
   "fen": "1r1r2k1/ppp2ppR/8/2R1N1P1/1P1q4/P4P2/4Q1b1/4K3 b - - 0 33",
   "solution": [
    "d4g1",
    "e2f1",
    "g1f1"
   ],
   "turn": "b"
  },
  {
   "fen": "4k1n1/1p4B1/p4p2/3p1q1P/P2Pb1b1/1P4K1/3Q3P/8 b - - 6 30",
   "solution": [
    "f5f3",
    "g3h4",
    "f3h3"
   ],
   "turn": "b"
  },
  {
   "fen": "3r1k2/pp2bp1p/7P/2p5/3q4/1P1P2B1/PN2r3/3K4 b - - 3 35",
   "solution": [
    "d4b2",
    "d3d4",
    "d8d4"
   ],
   "turn": "b"
  },
  {
   "fen": "1r1k4/1bp1q3/2p5/3p1B1p/p2Q3N/P4NP1/1PP5/R1B2RK1 w - - 5 29",
   "solution": [
    "d4h8",
    "e7e8",
    "c1g5"
   ],
   "turn": "w"
  },
  {
   "fen": "5r2/1bp4k/p6p/1p4p1/3n4/P5P1/P1P2N1P/3n2K1 b - - 2 31",
   "solution": [
    "f8f2",
    "h2h4",
    "d4e2"
   ],
   "turn": "b"
  }
 ],
 "mate3": [
  {
   "fen": "r4rk1/p1p3p1/Q1p3p1/3p3q/1P4bp/P3P3/2PP4/1R2K3 b - - 0 25",
   "solution": [
    "h5e5",
    "d2d4",
    "e5e3",
    "a6e2",
    "e3e2"
   ],
   "turn": "b"
  },
  {
   "fen": "4rk2/p2n3p/1p1p1n1p/8/P1b2PP1/4b1K1/6BP/qNq5 b - - 0 26",
   "solution": [
    "e3f2",
    "g3h3",
    "c1f4",
    "g2f3",
    "f4f3"
   ],
   "turn": "b"
  },
  {
   "fen": "q3k2r/2pp4/3R1P2/5Q2/8/PP2PN1p/5PPP/2R3K1 w k - 0 26",
   "solution": [
    "f5d7",
    "e8f8",
    "d7e7",
    "f8g8",
    "e7g7"
   ],
   "turn": "w"
  },
  {
   "fen": "2b2rk1/8/7Q/p1P1qN2/4N3/P1r2P2/7P/4KR2 w - - 2 33",
   "solution": [
    "f1g1",
    "e5g3",
    "g1g3",
    "g8f7",
    "h6g6"
   ],
   "turn": "w"
  },
  {
   "fen": "r2q1b1r/pppk1Bp1/3p4/1P2p1QN/8/6P1/P2PN1KP/1bB2R2 w - - 1 21",
   "solution": [
    "g5g4",
    "b1f5",
    "g4f5",
    "d7e7",
    "f5e6"
   ],
   "turn": "w"
  },
  {
   "fen": "r6r/4p1k1/2pp2B1/4b3/2b5/6Pp/p6K/8 b - - 1 33",
   "solution": [
    "g7g6",
    "h2g1",
    "e5g3",
    "g1h1",
    "a2a1q"
   ],
   "turn": "b"
  },
  {
   "fen": "3r1k2/pp2bp1p/7P/2p5/3q4/1P1P2B1/PNK5/4r3 b - - 1 34",
   "solution": [
    "e1e2",
    "c2d1",
    "d4b2",
    "d3d4",
    "d8d4"
   ],
   "turn": "b"
  }
 ],
 "best": [
  {
   "fen": "1r2k1r1/pQ1n4/n3qp1p/2p2P2/8/P1p1P1PP/P2P1N2/2R1K2R w K - 0 25",
   "solution": [
    "b7b8"
   ],
   "turn": "w"
  },
  {
   "fen": "1n2k1r1/p7/n3Pp1p/2p5/8/P3P1PP/P2p1N2/2R1K2R w K - 0 27",
   "solution": [
    "e1d2"
   ],
   "turn": "w"
  },
  {
   "fen": "rnb1kb1r/p1p2ppp/1p3n2/3p4/1q1p4/5NP1/PPPBPPBP/RN1QK2R b KQkq - 3 8",
   "solution": [
    "b4b2"
   ],
   "turn": "b"
  },
  {
   "fen": "r4k1r/1q2b1p1/1n2b2p/p1p2p2/2P1NP1P/P2P1QP1/1P1B4/2KR1B1R w - - 0 19",
   "solution": [
    "e4g5"
   ],
   "turn": "w"
  },
  {
   "fen": "4rk2/6pr/7p/p1p2p2/2P2P1P/P1K2BP1/3B4/3R1b2 w - - 0 28",
   "solution": [
    "d1f1"
   ],
   "turn": "w"
  },
  {
   "fen": "5k2/8/6p1/2p1rp1p/p1P2P1P/P5P1/3K4/1rBB4 w - - 0 35",
   "solution": [
    "f4e5"
   ],
   "turn": "w"
  },
  {
   "fen": "r3k2r/pppb4/3p1QR1/n4p2/2qP1P1P/4P1KN/8/8 w - - 4 35",
   "solution": [
    "f6h8"
   ],
   "turn": "w"
  },
  {
   "fen": "3rk3/4pp2/n1p1b1p1/1p2P1Br/2pQP1pP/P7/6B1/R3K2R b - - 0 28",
   "solution": [
    "d8d4"
   ],
   "turn": "b"
  },
  {
   "fen": "B6r/p1pnkp1p/3b2p1/3p1n2/3P4/4P2P/PP1B1P1P/2R1K1R1 b - - 0 17",
   "solution": [
    "h8a8"
   ],
   "turn": "b"
  }
 ],
 "tactical": [
  {
   "fen": "r3k3/1pp1R1p1/p1n3qr/6p1/2b2bP1/5N2/2PNQP1P/4R1K1 b q - 0 24",
   "solution": [
    "e8f8",
    "d2c4",
    "c6e7"
   ],
   "turn": "b"
  },
  {
   "fen": "r4k2/1pp1R1p1/p1n3qr/6p1/2N2bP1/5N2/2P1QP1P/4R1K1 b - - 0 25",
   "solution": [
    "c6e7",
    "e2e7",
    "f8g8"
   ],
   "turn": "b"
  },
  {
   "fen": "1n2k1r1/p7/n3qp1p/2p2P2/8/P1p1P1PP/P2P1N2/2R1K2R w K - 0 26",
   "solution": [
    "f5e6",
    "c3d2",
    "e1d2"
   ],
   "turn": "w"
  },
  {
   "fen": "r2k3r/pppb1Q2/3p2R1/n4p2/2qP1P1P/4P1KN/8/8 w - - 2 34",
   "solution": [
    "f7f6",
    "d8e8",
    "f6h8"
   ],
   "turn": "w"
  },
  {
   "fen": "r1bqk2r/ppp2p1p/2n3p1/5n2/1bPpN3/3P4/PP2BPPP/RNBQ1RK1 w kq - 0 10",
   "solution": [
    "c4c5",
    "f5e3",
    "f2e3"
   ],
   "turn": "w"
  }
 ]
};
