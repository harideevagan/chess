// Inline SVG icons (24x24, stroke = currentColor). Every function returns an SVG string.
const svg = (body, cls = 'ic') =>
  `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

const BODY = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  puzzle: '<path d="M9 3h4v3a2 2 0 1 0 4 0V3h3v6h-3a2 2 0 1 0 0 4h3v8H4v-8h3a2 2 0 1 1 0-4H4V3z"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  first: '<path d="M6 5v14"/><path d="M19 5l-9 7 9 7z"/>',
  last: '<path d="M18 5v14"/><path d="M5 5l9 7-9 7z"/>',
  prev: '<path d="M15 5l-8 7 8 7"/>',
  next: '<path d="M9 5l8 7-8 7"/>',
  flip: '<path d="M7 4v16M7 4L4 7M7 4l3 3"/><path d="M17 20V4M17 20l-3-3M17 20l3-3"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  chevron: '<path d="M9 5l8 7-8 7"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8M10 18h4"/>',
  bot: '<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 8V4M9 13v1M15 13v1M9 17h6"/>',
  draw: '<path d="M5 9h14M5 15h14"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  restart: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};

export const icon = (name, cls) => svg(BODY[name] || '', cls);

export const iconHome = () => icon('home');
export const iconBoard = () => icon('board');
export const iconChart = () => icon('chart');
export const iconPuzzle = () => icon('puzzle');
export const iconDots = () => icon('dots');
export const iconFirst = () => icon('first');
export const iconLast = () => icon('last');
export const iconPrev = () => icon('prev');
export const iconNext = () => icon('next');
export const iconFlip = () => icon('flip');
export const iconUndo = () => icon('undo');
export const iconRedo = () => icon('redo');
export const iconFlag = () => icon('flag');
export const iconSettings = () => icon('settings');
export const iconFile = () => icon('file');
export const iconInfo = () => icon('info');
export const iconChevron = () => icon('chevron');
export const iconTrophy = () => icon('trophy');
export const iconBot = () => icon('bot');
export const iconDraw = () => icon('draw');
export const iconPause = () => icon('pause');
export const iconPlay = () => icon('play');
export const iconSun = () => icon('sun');
export const iconCheck = () => icon('check');
export const iconClose = () => icon('close');
export const iconRestart = () => icon('restart');
export const iconPlus = () => icon('plus');

/** Fill every <span data-icon="name"></span> placeholder in the page with its SVG. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    if (!el.firstElementChild) el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
  });
}
