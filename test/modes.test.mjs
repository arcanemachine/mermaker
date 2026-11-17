import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeRows } from '../web/modes.mjs';

const OFF = { rotate: false, flip: false };

test('no turn, no rows: the strip is hidden', () => {
  assert.deepEqual(modeRows(OFF, [], 'pc'), []);
});

test("each turn of the page is a row saying how to undo it and how to write it, the diagram's first", () => {
  assert.deepEqual(modeRows({ rotate: true, flip: true }, [{ title: 'Payment', rotate: false, flip: true }], 'pc'), [
    'The diagram is rotated in this page only. With nothing selected, R rotates it back, and Alt+R writes the rotation to the file.',
    'The diagram is flipped in this page only. With nothing selected, Shift+R flips it back, and Alt+Shift+R writes the flip to the file.',
    'The "Payment" subgraph is flipped in this page only. With it selected, Shift+R flips it back, and Alt+Shift+R writes the flip to the file.',
  ]);
});

test('on a Mac the keys say Option', () => {
  assert.deepEqual(modeRows({ rotate: true, flip: false }, [], 'mac'),
    ['The diagram is rotated in this page only. With nothing selected, R rotates it back, and Option+R writes the rotation to the file.']);
});
