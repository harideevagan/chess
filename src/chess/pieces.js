// Original vector chess pieces (drawn for this project). Colours come from CSS variables so that
// several piece styles can share the same shapes (see style.css: [data-pieces="..."]).

const BASE = '<path d="M11.5 39h22v-4h-22z"/>';

const SHAPES = {
  p: `<circle cx="22.5" cy="11.5" r="5"/>
      <path d="M22.5 17c-3 0-5 2-5 4.5 0 2 1 3.400 2.400 4.300-3 1.700-5.200 4.200-5.400 8.200h16c-.2-4-2.400-6.500-5.400-8.200 1.400-.9 2.400-2.300 2.400-4.300 0-2.500-2-4.500-5-4.500z"/>
      <path d="M12.500 39h20v-4.500h-20z"/>`,
  r: `<path d="M11.500 39h22v-4h-22z"/>
      <path d="M14.500 35l1.500-16h13l1.500 16z"/>
      <path d="M13 19V9h4.500v3.500h3V9h4v3.500h3V9H32v10z"/>
      <path class="d" d="M16 19h13M15.500 26h14"/>`,
  n: `<path d="M11.500 39h22v-4h-22z"/>
      <path d="M13 35c0-7 1.500-11.500 6.500-15.500 1.600-1.300.8-2.600-.6-2.300l-3.500 2-2.300-2.300 6.400-9.400 2.400-1.800.8 2.300c6.500.3 12 5.700 12.300 14.500.2 4.300-.3 8.800-.3 12.500z"/>
      <circle class="eye" cx="22.500" cy="14.300" r="1.300"/>
      <path class="d" d="M18.700 17.200l1.600 1.500"/>`,
  b: `<path d="M11.500 39h22v-4h-22z"/>
      <path d="M15 35c0-4.500 3-6.500 4-9.500-2.500-2-3.500-6-1-10 1.500-2.500 4.500-5.500 4.500-5.500s3 3 4.500 5.500c2.500 4 1.500 8-1 10 1 3 4 5 4 9.500z"/>
      <circle cx="22.500" cy="8.600" r="2.800"/>
      <path class="d" d="M20 18l5 5M18.500 28.500h8"/>`,
  q: `<path d="M11.500 39h22v-4h-22z"/>
      <path d="M10.500 14.500L14 29l3-16 3 14 2.500-16 2.500 16 3-14 3 16 3.500-14.500L32.500 35h-20z"/>
      <circle cx="10.500" cy="13" r="2.300"/><circle cx="17" cy="11.500" r="2.300"/>
      <circle cx="22.500" cy="9.500" r="2.300"/><circle cx="28" cy="11.500" r="2.300"/>
      <circle cx="34.500" cy="13" r="2.300"/>
      <path class="d" d="M14.500 31.500h16"/>`,
  k: `<path d="M11 39h23v-4H11z"/>
      <path d="M13.500 35c0-6 2.500-9 4.500-12-2-1.500-3-4-2-6.500 1-2.500 3.500-3 6.500-3s5.500.5 6.500 3c1 2.500 0 5-2 6.500 2 3 4.500 6 4.500 12z"/>
      <path class="cross" d="M22.500 3.500v9M18.800 7.300h7.400"/>
      <path class="d" d="M16.500 28.500h12"/>`,
};

/** @param {string} type p|n|b|r|q|k  @param {string} color w|b */
export function pieceSVG(type, color) {
  return `<svg class="pc ${color}" viewBox="0 0 45 45" aria-hidden="true" focusable="false">${SHAPES[type]}</svg>`;
}

export const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
