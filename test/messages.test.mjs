// Tests for what the page and the server say (docs/ux.md, Messages): a message names its subject, never "it" (the
// user). The words are string literals spread across modules, so the source itself is read, a line at a time: a
// template literal running over several lines is checked on its first line only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DIRS = ['web', 'web/patch', 'server', 'bin'];

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

test('no message says "it": each names its subject', () => {
  const bad = [];
  for (const dir of DIRS) {
    for (const f of readdirSync(join(ROOT, dir)).filter((n) => /\.(mjs|js)$/.test(n))) {
      for (const { line, text } of literals(readFileSync(join(ROOT, dir, f), 'utf8'))) {
        if (/\bit\b/i.test(text)) bad.push(`${dir}/${f}:${line} ${text}`);
      }
    }
  }
  const html = readFileSync(join(ROOT, 'web/index.html'), 'utf8')
    .replace(/<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1>/g, '');
  for (const m of html.matchAll(/>([^<]+)</g)) if (/\bit\b/i.test(m[1])) bad.push(`web/index.html ${m[1].trim()}`);
  for (const m of html.matchAll(/(?:title|aria-label)="([^"]*)"/g)) if (/\bit\b/i.test(m[1])) bad.push(`web/index.html ${m[1]}`);
  assert.deepEqual(bad, []);
});
