// A grid of choices (arrow types, shapes) under a text field, each drawn as a small icon with its digit in the corner.
// The line under it names the focused entry, else the current one. It reports a pick; what a pick does is up to its
// host (the label box keeps it until Enter). Keys while focus is in it: a digit picks, the arrow keys move, wrapping
// within their row or column (grid.mjs). Keys it does not use (Enter, Escape, the arrow off its edge toward its field:
// Up from the top row of one under the field, Down from the bottom row of one above it) go on to its host.
//
// Mouse and keyboard share one focus: the outline. Its buttons take real focus only when its host gives it (`focus`);
// once focus is in the grid, the pointer moving over an entry focuses it, as in a menu. While focus is in its field,
// the pointer moves only the outline, never the caret. Either way the pointer previews: when it leaves, the outline
// (and focus, in the grid) goes back to where it was, unless a key or a click on its entry made it stick. It acts on pointer moves, not on the pointer entering, since a
// picker opened under a resting pointer would otherwise take the entry under it. The host keeps a click from moving
// focus. It remembers where the arrows were when focus went back to its field, and `focus` returns there; a pick moves
// that place to the picked entry.
//
// A disabled picker (`disable`) is drawn grayed, its reason where the name goes, and takes no focus or pick.
//
// While Shift is held the root has `data-shift` (set by the editor), and the digits Shift picks show dark and the plain
// ones gray, the other way round when it is not (style.css).

import { move } from './grid.mjs';

/**
 * One choice. Lists of them (arrow-types.mjs, shapes.mjs) keep a fixed order, so a digit always picks the same one.
 * @typedef {object} PickerEntry
 * @property {string} key what a pick reports
 * @property {string} [digit] the key that picks it; entries past the twentieth have none
 * @property {boolean} [shift] the digit picks it with Shift held (the second ten)
 * @property {string} name
 * @property {string} [meaning] what it stands for, shown after its name: "Diamond (Decision)"
 * @property {() => string} icon an SVG drawing (icons.mjs)
 */

/** How an entry is named: in its accessible name, and below the grid. */
const label = (/** @type {PickerEntry} */ entry) => entry.name
  + (entry.meaning && entry.meaning !== entry.name ? ` (${entry.meaning})` : '');

/**
 * @param {object} options
 * @param {string} options.title the noun for what is picked ("Arrow type")
 * @param {PickerEntry[]} options.entries
 * @param {(key: string) => void} options.onPick
 * @param {number} [options.columns]
 * @param {string} [options.className] a class of its own, for CSS that is this picker's alone
 * @param {'up' | 'down'} [options.exit] the side its field is on, which the arrow that way leaves to
 */
export function createPicker({ title, entries, onPick, columns = 5, className = '', exit = 'up' }) {
  const el = document.createElement('div');
  el.className = `picker ${className}`.trim();
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', title);
  const heading = document.createElement('div');
  heading.className = 'picker-title';
  heading.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'picker-grid';
  grid.style.setProperty('--columns', String(columns));
  const name = document.createElement('div');
  name.className = 'picker-name';
  el.append(heading, grid, name);

  const buttons = entries.map((entry) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.key = entry.key;
    // The digit shown is part of the name, so a voice user can say what they see (WCAG 2.5.3).
    b.setAttribute('aria-label', (entry.digit ? `${entry.shift ? 'Shift ' : ''}${entry.digit} ` : '') + label(entry));
    b.innerHTML = entry.icon() + (entry.digit
      ? `<span class="digit${entry.shift ? ' shift' : ''}">${entry.shift ? '<span class="shift-mark">⇧</span>' : ''}${entry.digit}</span>` : '');
    b.addEventListener('click', () => {
      // A click moves keyboard focus only when it is in the grid already: else its field keeps it.
      if (grid.contains(document.activeElement)) b.focus();
      onPick(entry.key);
    });
    b.addEventListener('pointermove', (e) => {
      // Touch has no hover: a tap names the current one (docs/ux.md).
      if (e.pointerType === 'touch' || disabled) return;
      const inGrid = grid.contains(document.activeElement);
      if (before === undefined) {
        before = inGrid ? /** @type {HTMLButtonElement} */ (document.activeElement) : buttons.find((x) => x.hasAttribute('data-start')) ?? null;
      }
      if (!inGrid) { markStart(b); showName(); return; }
      if (document.activeElement === b) return;
      pointerFocus = true;
      b.focus();
      pointerFocus = false;
    });
    // A focus from the keys (or the host) makes it stick; one the pointer made is still a preview.
    b.addEventListener('focus', () => { if (!pointerFocus) before = undefined; markStart(b); showName(); });
    b.tabIndex = -1;
    grid.append(b);
    return b;
  });
  // Every cell is as wide as the icons (one width per list), so a short last row can be centered under the rest.
  grid.style.setProperty('--icon', `${buttons[0]?.querySelector('svg')?.getAttribute('width') ?? 0}px`);

  /** @type {string | null} */
  let current = null;
  let other = '';
  /** @type {HTMLButtonElement | null | undefined} where the outline was before the pointer moved it, focus being in the
   * field; undefined while the pointer has not moved it */
  let before;
  let pointerFocus = false;
  /** @type {string | null} why it is disabled, or null */
  let disabled = null;
  // A pointer that only passed over changes nothing: the outline goes back, and focus with it when it is in the grid.
  grid.addEventListener('pointerleave', () => {
    if (before === undefined) return;
    const back = before;
    before = undefined;
    if (grid.contains(document.activeElement) && back) back.focus();
    else markStart(back);
    showName();
  });
  grid.addEventListener('focusout', (e) => showName(/** @type {Element | null} */ (e.relatedTarget)));

  /** Mark `start` as where the arrows start from (`focus`), outlined while focus is elsewhere; null marks none. */
  function markStart(/** @type {HTMLButtonElement | null | undefined} */ start) {
    for (const b of buttons) b.toggleAttribute('data-start', b === start);
  }

  /** Name the focused entry (`focused`, while focus moves; the outline the pointer moved), else the current one. */
  function showName(focused = document.activeElement) {
    const outlined = before === undefined ? -1 : buttons.findIndex((b) => b.hasAttribute('data-start'));
    const at = Math.max(buttons.findIndex((b) => b === focused), outlined);
    const entry = entries.find((e) => e.key === current);
    name.textContent = disabled ?? (at >= 0 ? label(entries[at]) : entry ? `Current: ${label(entry)}` : other ? `Current: ${other}` : '');
  }

  /**
   * Mark `key` as current; for one not in the list, `otherName` names it instead ("<--o").
   * @param {string | null} key
   * @param {string} [otherName]
   */
  function setCurrent(key, otherName = '') {
    current = entries.find((e) => e.key === key) ? key : null;
    other = otherName;
    before = undefined;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.key === current));
    markStart(buttons.find((b) => b.dataset.key === current));
    showName();
  }

  el.addEventListener('keydown', (e) => {
    // Any key on the entry the pointer is on makes it stick (Up and Escape back to the field too); Shift alone does not.
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) before = undefined;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const at = buttons.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
    // The columns as drawn: CSS may lay the grid out with fewer than it was made with (the shape picker on a narrow screen).
    const across = buttons.filter((b) => b.offsetTop === buttons[0].offsetTop).length;
    // By the key's place, not its character: on AZERTY the digit row types &é"' without Shift.
    // Shift picks from the second ten; the numpad gives a digit only with Num Lock on (else it is an arrow).
    const digit = entries.findIndex((entry) => entry.digit && Boolean(entry.shift) === e.shiftKey
      && (e.code === `Digit${entry.digit}` || (e.code === `Numpad${entry.digit}` && e.key === entry.digit)));
    if (digit >= 0) { e.preventDefault(); e.stopPropagation(); buttons[digit].focus(); onPick(entries[digit].key); return; }
    // The arrow off its edge toward its field is the way back to it.
    const last = buttons.filter((b) => b.offsetTop === buttons[buttons.length - 1].offsetTop).length;
    if (at < 0 || (exit === 'up' && e.key === 'ArrowUp' && at < across)
      || (exit === 'down' && e.key === 'ArrowDown' && at >= buttons.length - last)) return;
    const to = move(at, e.key, buttons.length, across);
    if (to === null) return;
    e.preventDefault();
    e.stopPropagation();
    buttons[to].focus();
  });

  return {
    el,
    current: setCurrent,
    /** Focus where the arrows start from, or the first entry. */
    focus: () => (buttons.find((b) => b.hasAttribute('data-start')) ?? buttons[0]).focus(),
    /** The current entry's key, or null. */
    value: () => current,
    /** Gray it out with `reason` shown in its place, or with null bring it back. */
    disable: (/** @type {string | null} */ reason) => {
      disabled = reason;
      el.toggleAttribute('aria-disabled', Boolean(reason));
      if (reason) el.setAttribute('aria-disabled', 'true');
      for (const b of buttons) b.disabled = Boolean(reason);
      showName();
    },
    /** Whether it is disabled. */
    disabled: () => disabled !== null,
  };
}
