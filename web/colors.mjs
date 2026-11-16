// The colors a node or a subgraph can be given, in a fixed order: an entry's digit picks it, so the order never changes
// and new entries go at the end. 1 is None, which takes Mermaker's color off; each other is a preset (PRESETS,
// patch/flowchart.mjs), drawn as a swatch of its node fill and border.

import { icon } from './icons.mjs';
import { PRESETS } from './patch/flowchart.mjs';

/** A swatch in a 28 × 18 frame: a box filled `fill`, bordered `stroke`. */
const swatch = (/** @type {string} */ fill, /** @type {string} */ stroke) =>
  icon(28, 18, `<rect x="2" y="2" width="24" height="14" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);

const DIGITS = '1234567890';

/** @type {import('./picker.mjs').PickerEntry[]} */
export const COLORS = [
  { key: 'none', digit: '1', name: 'None', icon: icon(28, 18, '<rect x="2" y="2" width="24" height="14" rx="3" stroke-width="1.5"/><path d="M5 15 L23 3" stroke-width="1.5"/>') },
  ...Object.entries(PRESETS).map(([key, p], k) => ({
    key, digit: DIGITS[k + 1], name: key[0].toUpperCase() + key.slice(1), icon: swatch(p.node[0], p.node[1]),
  })),
];
