import { test } from 'node:test';
import assert from 'node:assert/strict';
import { move } from '../web/grid.mjs';

// A full grid of 10 in 5 columns:  0 1 2 3 4 / 5 6 7 8 9
test('arrows move one step inside the grid', () => {
  assert.equal(move(6, 'ArrowRight', 10, 5), 7);
  assert.equal(move(6, 'ArrowLeft', 10, 5), 5);
  assert.equal(move(1, 'ArrowDown', 10, 5), 6);
  assert.equal(move(6, 'ArrowUp', 10, 5), 1);
});

test('Right and Left wrap within their row, not into the next', () => {
  assert.equal(move(4, 'ArrowRight', 10, 5), 0);
  assert.equal(move(9, 'ArrowRight', 10, 5), 5);
  assert.equal(move(5, 'ArrowLeft', 10, 5), 9);
  assert.equal(move(0, 'ArrowLeft', 10, 5), 4);
});

test('Down and Up wrap within their column', () => {
  assert.equal(move(7, 'ArrowDown', 10, 5), 2);
  assert.equal(move(2, 'ArrowUp', 10, 5), 7);
});

// A short last row is drawn centered. 8 in 5 columns:  0 1 2 3 4 / _ 5 6 7 _
test('a short last row wraps at its own ends', () => {
  assert.equal(move(7, 'ArrowRight', 8, 5), 5);
  assert.equal(move(5, 'ArrowLeft', 8, 5), 7);
});

test('a centered short last row is reached from the columns over it, and Up goes back', () => {
  assert.equal(move(1, 'ArrowDown', 8, 5), 5);
  assert.equal(move(5, 'ArrowUp', 8, 5), 1);
  assert.equal(move(3, 'ArrowDown', 8, 5), 7);
  assert.equal(move(7, 'ArrowUp', 8, 5), 3);
  assert.equal(move(5, 'ArrowDown', 8, 5), 1);
  assert.equal(move(1, 'ArrowUp', 8, 5), 5);
});

test('a column the short last row lacks ends one row higher', () => {
  assert.equal(move(0, 'ArrowDown', 8, 5), 0);
  assert.equal(move(4, 'ArrowDown', 8, 5), 4);
  assert.equal(move(4, 'ArrowUp', 8, 5), 4);
});

// The arrow types: 22 in 10 columns, the last two under columns 4 and 5 (from 0); in 5 columns, under 1 and 2.
test('the arrow picker\'s last two sit under the middle columns', () => {
  assert.equal(move(14, 'ArrowDown', 22, 10), 20);
  assert.equal(move(20, 'ArrowUp', 22, 10), 14);
  assert.equal(move(21, 'ArrowUp', 22, 10), 15);
  assert.equal(move(4, 'ArrowUp', 22, 10), 20);
  assert.equal(move(20, 'ArrowDown', 22, 10), 4);
  assert.equal(move(13, 'ArrowDown', 22, 10), 3);
  assert.equal(move(16, 'ArrowDown', 22, 5), 20);
  assert.equal(move(20, 'ArrowUp', 22, 5), 16);
  assert.equal(move(19, 'ArrowDown', 22, 5), 4);
});

test('a full grid has no short row: the shape picker\'s 20 in 10 move as before', () => {
  assert.equal(move(14, 'ArrowDown', 20, 10), 4);
  assert.equal(move(4, 'ArrowUp', 20, 10), 14);
  assert.equal(move(19, 'ArrowRight', 20, 10), 10);
  assert.equal(move(10, 'ArrowLeft', 20, 10), 19);
});

test('one row: Up and Down stay put', () => {
  assert.equal(move(2, 'ArrowDown', 4, 5), 2);
  assert.equal(move(2, 'ArrowUp', 4, 5), 2);
  assert.equal(move(3, 'ArrowRight', 4, 5), 0);
});

test('a key that is not an arrow is not the grid\'s', () => {
  assert.equal(move(2, 'Enter', 10, 5), null);
  assert.equal(move(2, 'Escape', 10, 5), null);
});
