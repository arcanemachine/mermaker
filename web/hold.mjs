// Escape held: a press does Escape's first step as usual, and if Escape is still down a moment later, everything left
// is cleared at once (docs/ux.md). The key's own repeats while held are swallowed, so they do not step one by one.
// What the hold runs can leave a part for the key's release: the code panel's question, which would otherwise open
// with Escape still down, and the dialog would take the repeats as Cancel.

/** How long Escape is held before everything is cleared. */
export const HOLD_MS = 750;

/**
 * @param {object} deps
 * @param {(run: () => void, ms: number) => unknown} deps.setTimer
 * @param {(timer: unknown) => void} deps.clearTimer
 * @param {() => number} deps.questions how many questions (confirm dialogs) the page has asked so far
 * @param {() => (() => void) | void} deps.onHold clears everything; may return what to run on the key's release
 */
export function createHold({ setTimer, clearTimer, questions, onHold }) {
  /** @type {unknown} */
  let timer = null;
  /** @type {(() => void) | null} */
  let later = null;

  const drop = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
    later = null;
  };

  return {
    /**
     * Escape went down. A repeat returns true: it is swallowed, no step taken. A first press starts the hold, and goes
     * on to Escape's own steps; if those ask a question, the hold does nothing.
     */
    press(/** @type {boolean} */ repeat) {
      if (repeat) return true;
      drop();
      const asked = questions();
      timer = setTimer(() => {
        timer = null;
        if (questions() !== asked) return;
        later = onHold() || null;
      }, HOLD_MS);
      return false;
    },
    /** Escape came up: before the second, the hold is dropped; after it, what was left for the release runs. */
    release() {
      const run = later;
      drop();
      run?.();
    },
    /** Another key, a pointer press, or the page losing focus: nothing more of the hold runs. */
    cancel: drop,
  };
}
