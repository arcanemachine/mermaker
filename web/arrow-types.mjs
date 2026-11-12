// The arrow types an edge can be given, in a fixed order: an entry's digit picks it (the second ten with Shift), so the
// order never changes and new entries go at the end. Within each three, the columns are normal, dotted and thick, and
// Shift swaps the end for a circle or a cross. `key` is the arrow's shortest Mermaid syntax, as in ARROWS
// (patch/flowchart.mjs); names follow Mermaid's docs ("open link" is a line: no head).

import { icon } from './icons.mjs';

/** @type {Record<string, (x: number, dir: number) => string>} each end's drawing at `x`, pointing `dir` (1 right, -1 left) */
const HEADS = {
  none: () => '',
  point: (x, dir) => `<path d="M${x} 6 l${-6 * dir} -4 v8 z" fill="currentColor" stroke="none"/>`,
  circle: (x, dir) => `<circle cx="${x - 3 * dir}" cy="6" r="3" stroke-width="1.5"/>`,
  cross: (x, dir) => `<path d="M${x - 6 * dir} 2 l${6 * dir} 8 m0 -8 l${-6 * dir} 8" stroke-width="1.5"/>`,
};
/** @type {Record<string, string>} */
const STROKES = {
  normal: 'stroke-width="1.5"',
  dotted: 'stroke-width="1.5" stroke-dasharray="2 2"',
  thick: 'stroke-width="3.5"',
  invisible: 'stroke-width="1.5" stroke-dasharray="1 3" opacity="0.35"',
};

/** @type {Record<string, number>} how far in from the frame's edge the line stops at each end: under an arrowhead, but
 * short of a circle or a cross, which a thick line would fill or blot */
const INSET = { none: 2, point: 6, circle: 8, cross: 8 };

/**
 * A small drawing of an edge: its line and its ends.
 * @param {string} stroke a key of STROKES
 * @param {string} end a key of HEADS, as `start`
 * @param {string} [start]
 */
function arrow(stroke, end, start = 'none') {
  return icon(40, 12, `<path d="M${INSET[start]} 6 H${40 - INSET[end]}" ${STROKES[stroke]}/>`
    + HEADS[end](38, 1) + (start === 'none' ? '' : HEADS[start](2, -1)));
}

/** @type {import('./picker.mjs').PickerEntry[]} */
export const ARROW_TYPES = [
  { key: '-->', digit: '1', name: 'Arrow', icon: arrow('normal', 'point') },
  { key: '-.->', digit: '2', name: 'Dotted arrow', icon: arrow('dotted', 'point') },
  { key: '==>', digit: '3', name: 'Thick arrow', icon: arrow('thick', 'point') },
  { key: '---', digit: '4', name: 'Line', icon: arrow('normal', 'none') },
  { key: '-.-', digit: '5', name: 'Dotted line', icon: arrow('dotted', 'none') },
  { key: '===', digit: '6', name: 'Thick line', icon: arrow('thick', 'none') },
  { key: '<-->', digit: '7', name: 'Two-way arrow', icon: arrow('normal', 'point', 'point') },
  { key: '<-.->', digit: '8', name: 'Dotted two-way arrow', icon: arrow('dotted', 'point', 'point') },
  { key: '<==>', digit: '9', name: 'Thick two-way arrow', icon: arrow('thick', 'point', 'point') },
  { key: '~~~', digit: '0', name: 'Invisible', icon: arrow('invisible', 'none') },
  { key: '--o', digit: '1', shift: true, name: 'Circle', icon: arrow('normal', 'circle') },
  { key: '-.-o', digit: '2', shift: true, name: 'Dotted circle', icon: arrow('dotted', 'circle') },
  { key: '==o', digit: '3', shift: true, name: 'Thick circle', icon: arrow('thick', 'circle') },
  { key: '--x', digit: '4', shift: true, name: 'Cross', icon: arrow('normal', 'cross') },
  { key: '-.-x', digit: '5', shift: true, name: 'Dotted cross', icon: arrow('dotted', 'cross') },
  { key: '==x', digit: '6', shift: true, name: 'Thick cross', icon: arrow('thick', 'cross') },
  { key: 'o--o', digit: '7', shift: true, name: 'Two-way circle', icon: arrow('normal', 'circle', 'circle') },
  { key: 'o-.-o', digit: '8', shift: true, name: 'Dotted two-way circle', icon: arrow('dotted', 'circle', 'circle') },
  { key: 'o==o', digit: '9', shift: true, name: 'Thick two-way circle', icon: arrow('thick', 'circle', 'circle') },
  { key: 'x--x', digit: '0', shift: true, name: 'Two-way cross', icon: arrow('normal', 'cross', 'cross') },
  { key: 'x-.-x', name: 'Dotted two-way cross', icon: arrow('dotted', 'cross', 'cross') },
  { key: 'x==x', name: 'Thick two-way cross', icon: arrow('thick', 'cross', 'cross') },
];
