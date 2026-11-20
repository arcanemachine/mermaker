// Tests for what the page and the server say (docs/ux.md, Messages): a message never says "it" for something it has
// not named, and is made of complete sentences. Two shapes of the first are caught: a message that starts with "It",
// and "it" right after a verb in -ing ("Moving it there"), both read with nothing named before them. One of the
// second: a message opening "No <word> on|in|for|to" ("No link on this node."), a noun with no verb. The words are
// string literals spread across modules, so the source itself is read, a line at a time: a template literal running
// over several lines is checked on its first line only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DIRS = ['web', 'web/patch', 'server', 'bin'];
// A message that opens with "It", or "it" right after a verb in -ing.
const UNNAMED = /^['"`>\s]*It\b|\b\w+ing it\b/;
// A message opening "No <word>" and a place or purpose, with no verb.
const VERBLESS = /^['"`>\s]*No \w+ (on|in|for|to)\b/;

/** The string literals on each line of `source` that is not a comment, with their line numbers. */
function literals(/** @type {string} */ source) {
  const found = [];
  source.split('\n').forEach((raw, k) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(raw)) return;
    const line = raw.replace(/\s{2,}\/\/.*$/, '');   // a trailing comment, set off by spaces as the code writes them
    for (const m of line.matchAll(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g)) found.push({ line: k + 1, text: m[0] });
  });
  return found;
}

test('no message says "it" before naming what "it" is', () => {
  const bad = [];
  for (const dir of DIRS) {
    for (const f of readdirSync(join(ROOT, dir)).filter((n) => /\.(mjs|js)$/.test(n))) {
      for (const { line, text } of literals(readFileSync(join(ROOT, dir, f), 'utf8'))) {
        if (UNNAMED.test(text)) bad.push(`${dir}/${f}:${line} ${text}`);
      }
    }
  }
  const html = readFileSync(join(ROOT, 'web/index.html'), 'utf8')
    .replace(/<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1>/g, '');
  for (const m of html.matchAll(/>([^<]+)</g)) if (UNNAMED.test(m[1])) bad.push(`web/index.html ${m[1].trim()}`);
  for (const m of html.matchAll(/(?:title|aria-label)="([^"]*)"/g)) if (UNNAMED.test(m[1])) bad.push(`web/index.html ${m[1]}`);
  assert.deepEqual(bad, []);
});

test('no message opens "No <word> on|in|for|to", a fragment with no verb', () => {
  const bad = [];
  for (const dir of DIRS) {
    for (const f of readdirSync(join(ROOT, dir)).filter((n) => /\.(mjs|js)$/.test(n))) {
      for (const { line, text } of literals(readFileSync(join(ROOT, dir, f), 'utf8'))) {
        if (VERBLESS.test(text)) bad.push(`${dir}/${f}:${line} ${text}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});
