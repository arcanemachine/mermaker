// Where an arrow key moves focus in a picker's grid. Moves wrap within their row or column, never into the next one:
// Right at a row's end goes to its start, Down at the bottom to the top of the same column. A short last row is drawn
// centered, so it starts at column floor((columns − its length) / 2): Down from a column over one of its entries goes
// to that entry, and from any other column wraps to the top, since that column ends one row higher.

/**
 * @param {number} index the focused entry
 * @param {string} key KeyboardEvent.key
 * @param {number} count how many entries
 * @param {number} columns as drawn
 * @returns {number | null} the entry to focus, or null for a key that is not an arrow
 */
export function move(index, key, count, columns) {
  const rows = Math.ceil(count / columns);
  const last = rows - 1;
  const lastLength = count - last * columns;
  const shift = Math.floor((columns - lastLength) / 2);
  /** The entry at row `r`, column `c`, or -1 where there is none. */
  const at = (/** @type {number} */ r, /** @type {number} */ c) => {
    if (r < last) return r * columns + c;
    return c >= shift && c < shift + lastLength ? last * columns + c - shift : -1;
  };
  const row = Math.floor(index / columns);
  const col = row < last ? index % columns : index - last * columns + shift;
  const first = row < last ? 0 : shift, end = row < last ? columns - 1 : shift + lastLength - 1;
  // The lowest row that has this column.
  const bottom = at(last, col) >= 0 ? last : last - 1;
  if (key === 'ArrowRight') return at(row, col < end ? col + 1 : first);
  if (key === 'ArrowLeft') return at(row, col > first ? col - 1 : end);
  if (key === 'ArrowDown') return at(row < bottom ? row + 1 : 0, col);
  if (key === 'ArrowUp') return at(row > 0 ? row - 1 : bottom, col);
  return null;
}
