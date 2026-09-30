// Small UI helpers: storage, toast, modal dialogs, clipboard, download, settings dialog.
import { pieceSVG } from '../chess/pieces.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function store(key, value) {
  try {
    if (value === undefined) { const v = localStorage.getItem('rookery.' + key); return v ? JSON.parse(v) : null; }
    localStorage.setItem('rookery.' + key, JSON.stringify(value));
  } catch (e) { /* storage may be unavailable (private mode) */ }
  return null;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
export function toast(msg, kind = 'info') {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

let openDialog = null;

/**
 * Show a modal dialog.
 * @param {{title:string, html?:string, node?:Node, actions?:{label:string,value:any,primary?:boolean}[], className?:string}} o
 * @returns {Promise<any>} resolves with the clicked action value (or null if dismissed)
 */
export function modal(o) {
  if (openDialog) { try { openDialog.close(); } catch (e) { /* ignore */ } }
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'modal ' + (o.className || '');
    d.setAttribute('aria-label', o.title);
    const actions = o.actions || [{ label: 'Close', value: true, primary: true }];
    d.innerHTML = `<form method="dialog"><h2>${esc(o.title)}</h2><div class="modal-body"></div><div class="modal-actions"></div></form>`;
    const body = $('.modal-body', d);
    if (o.html) body.innerHTML = o.html; else if (o.node) body.appendChild(o.node);
    const act = $('.modal-actions', d);
    let result = null;
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn' + (a.primary ? ' primary' : '');
      b.textContent = a.label;
      b.addEventListener('click', () => { result = a.value; d.close(); });
      act.appendChild(b);
    }
    d.addEventListener('close', () => { d.remove(); if (openDialog === d) openDialog = null; resolve(result); });
    const openedAt = performance.now();
    // Click on the backdrop closes the dialog. Ignore the tail end of the click/tap that opened it.
    d.addEventListener('click', (e) => { if (e.target === d && performance.now() - openedAt > 500) d.close(); });
    document.body.appendChild(d);
    openDialog = d;
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    (act.querySelector('.primary') || act.firstChild)?.focus();
    if (o.onOpen) o.onOpen(d, (v) => { result = v; d.close(); });
  });
}

export function promotionChoice(color) {
  const html = `<div class="promo">${['q', 'r', 'b', 'n'].map((t) =>
    `<button type="button" class="promo-btn" data-p="${t}" aria-label="${{ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[t]}">${pieceSVG(t, color)}</button>`).join('')}</div>`;
  return modal({
    title: 'Promote pawn to…', html, actions: [{ label: 'Cancel', value: null }],
    className: 'promo-modal',
    onOpen: (d, close) => $$('.promo-btn', d).forEach((b) => b.addEventListener('click', () => close(b.dataset.p))),
  });
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) { return false; }
}

export function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const BOARD_THEMES = { classic: 'Classic', wood: 'Wood', modern: 'Modern', dark: 'Dark', blue: 'Blue', green: 'Green' };
export const PIECE_STYLES = { classic: 'Classic', flat: 'Flat', gold: 'Gold & ebony', neon: 'Neon', ink: 'Ink' };

export function openSettings(settings, onChange) {
  const opt = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${v}</option>`).join('');
  const chk = (k, label) => `<label class="check"><input type="checkbox" data-k="${k}"${settings[k] ? ' checked' : ''}/> ${label}</label>`;
  const html = `
    <div class="settings-grid">
      <label class="field">Theme<select data-k="theme">${opt({ auto: 'Match device', light: 'Light', dark: 'Dark' }, settings.theme)}</select></label>
      <label class="field">Board colours<select data-k="board">${opt(BOARD_THEMES, settings.board)}</select></label>
      <label class="field">Piece style<select data-k="pieces">${opt(PIECE_STYLES, settings.pieces)}</select></label>
    </div>
    ${chk('legal', 'Show legal moves')}
    ${chk('coords', 'Show board coordinates')}
    ${chk('anim', 'Animate piece movement')}
    ${chk('autoQueen', 'Always promote to a queen')}
    ${chk('evalBar', 'Show evaluation bar')}
    ${chk('autoFlip', 'Flip board every move (Player vs Player)')}`;
  return modal({
    title: 'Settings', html, actions: [{ label: 'Done', value: true, primary: true }],
    onOpen: (d) => {
      $$('[data-k]', d).forEach((el) => el.addEventListener('change', () => {
        settings[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
        onChange(el.dataset.k);
      }));
    },
  });
}

export function openAbout() {
  return modal({
    title: 'About Rookery Chess',
    html: `<p>Rookery Chess is a free chess game that runs entirely in your browser. No positions are sent to any server.</p>
    <ul class="about-list">
      <li><strong>Engine:</strong> Stockfish.js 19 (lite, single-threaded WebAssembly), © 2026 Chess.com, LLC, based on Stockfish © T. Romstad, M. Costalba, J. Kiiski, G. Linscott and other contributors. Neural network by Chris Bao (sscg13). Licensed under the <strong>GNU GPL v3</strong>. Source: <a href="https://github.com/nmrugg/stockfish.js" target="_blank" rel="noopener">github.com/nmrugg/stockfish.js</a> and <a href="https://github.com/official-stockfish/Stockfish" target="_blank" rel="noopener">github.com/official-stockfish/Stockfish</a>.</li>
      <li><strong>Rules:</strong> chess.js (BSD-2-Clause) © Jeff Hlywa.</li>
      <li><strong>This application</strong> is distributed under the GPL v3 or later. Its complete source code is provided with this site's repository.</li>
    </ul>
    <p><a href="NOTICE.txt" target="_blank" rel="noopener">NOTICE</a> · <a href="LICENSE.txt" target="_blank" rel="noopener">Full GPL v3 text</a></p>`,
  });
}
