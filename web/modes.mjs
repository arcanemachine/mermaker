// The modes strip: what the page shows differently from the file and keeps doing until you undo it, one row each,
// saying how to leave it or write it to the file. Today that is the page's own rotate and flip (turn.mjs). No DOM.

/**
 * The strip's rows: the whole diagram's turn, then each subgraph's own, by its title. Keys are named for `os`, as Help
 * names them.
 * @param {{ rotate: boolean, flip: boolean }} whole
 * @param {{ title: string, rotate: boolean, flip: boolean }[]} subs
 * @param {string} os 'mac' or 'pc'
 * @returns {string[]}
 */
export function modeRows(whole, subs, os) {
  const alt = os === 'mac' ? 'Option' : 'Alt';
  /** @type {string[]} */
  const rows = [];
  const say = (/** @type {string} */ what, /** @type {string} */ when, /** @type {{ rotate: boolean, flip: boolean }} */ t) => {
    if (t.rotate) rows.push(`${what} is rotated in this page only. ${when}, R rotates it back, and ${alt}+R writes the rotation to the file.`);
    if (t.flip) rows.push(`${what} is flipped in this page only. ${when}, Shift+R flips it back, and ${alt}+Shift+R writes the flip to the file.`);
  };
  say('The diagram', 'With nothing selected', whole);
  for (const s of subs) say(`The "${s.title}" subgraph`, 'With it selected', s);
  return rows;
}
