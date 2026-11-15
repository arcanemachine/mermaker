import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLD_MS, createHold } from '../web/hold.mjs';

/** A hold on a mocked clock: `tick(ms)` runs the timers due. */
function rig({ leaves = null } = {}) {
  let now = 0;
  /** @type {{ at: number, run: () => void }[]} */
  let timers = [];
  let asked = 0;
  const log = [];
  const hold = createHold({
    setTimer: (run, ms) => { const t = { at: now + ms, run }; timers.push(t); return t; },
    clearTimer: (t) => { timers = timers.filter((x) => x !== t); },
    questions: () => asked,
    onHold: () => { log.push('hold'); return leaves ? () => log.push(leaves) : undefined; },
  });
  const tick = (/** @type {number} */ ms) => {
    now += ms;
    for (const t of timers.filter((x) => x.at <= now)) { timers = timers.filter((x) => x !== t); t.run(); }
  };
  return { hold, tick, log, ask: () => { asked++; } };
}

test('a press held for the hold time clears everything once', () => {
  const { hold, tick, log } = rig();
  assert.equal(hold.press(false), false);
  tick(HOLD_MS - 1);
  assert.deepEqual(log, []);
  tick(1);
  assert.deepEqual(log, ['hold']);
  tick(HOLD_MS * 3);
  hold.release();
  assert.deepEqual(log, ['hold']);
});

test('the key\'s repeats are swallowed and do not restart the hold', () => {
  const { hold, tick, log } = rig();
  hold.press(false);
  tick(HOLD_MS / 2);
  assert.equal(hold.press(true), true);
  tick(HOLD_MS / 2);
  assert.deepEqual(log, ['hold']);
});

test('the hold is dropped by the release before the second, another key, a pointer press or the page losing focus', () => {
  for (const end of ['release', 'cancel']) {
    const { hold, tick, log } = rig();
    hold.press(false);
    tick(HOLD_MS - 1);
    hold[end]();
    tick(HOLD_MS);
    assert.deepEqual(log, [], end);
  }
});

test('a question asked by the first press stops the hold', () => {
  const { hold, tick, log, ask } = rig();
  hold.press(false);
  ask();
  tick(HOLD_MS);
  assert.deepEqual(log, []);
});

test('what the hold leaves for the release runs on the release, and not after a cancel', () => {
  const r = rig({ leaves: 'question' });
  r.hold.press(false);
  r.tick(HOLD_MS);
  assert.deepEqual(r.log, ['hold']);
  r.hold.release();
  r.hold.release();
  assert.deepEqual(r.log, ['hold', 'question']);

  const c = rig({ leaves: 'question' });
  c.hold.press(false);
  c.tick(HOLD_MS);
  c.hold.cancel();
  c.hold.release();
  assert.deepEqual(c.log, ['hold']);
});
