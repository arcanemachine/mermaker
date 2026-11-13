// Tests for the color presets in web/patch/flowchart.mjs: setColor, colorOf, colorRefusal, and the classDef a paste
// brings. Whether Mermaid draws the color is checked in the browser (checks/README.md, "Every edit parses").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESETS, setColor, colorOf, colorRefusal, withPresetDefs, copyNode, pasteNode, copySubgraph, pasteSubgraph,
} from '../web/patch/flowchart.mjs';
import { COLORS } from '../web/colors.mjs';

const BLUE = 'classDef merma-blue fill:#dbeafe,stroke:#2563eb,color:#1e3a8a';
const RED = 'classDef merma-red fill:#fee2e2,stroke:#dc2626,color:#7f1d1d';
const src = 'flowchart TD\n  pack[[Pack]] --> send>Send]\n';

test('a first color appends its class line and its classDef; the node\'s own line is untouched', () => {
  assert.equal(setColor(src, 'pack', 'blue', 'node').text, `${src}  class pack merma-blue\n  ${BLUE}\n`);
});

test('a second node in the same color reuses the classDef', () => {
  const one = setColor(src, 'pack', 'blue', 'node').text;
  assert.equal(setColor(one, 'send', 'blue', 'node').text, one + '  class send merma-blue\n');
});

test('another color changes merma\'s line in place, and the classDef nothing names goes', () => {
  const blue = setColor(src, 'pack', 'blue', 'node').text;
  assert.equal(setColor(blue, 'pack', 'red', 'node').text, `${src}  class pack merma-red\n  ${RED}\n`);
});

test('the same color again changes nothing', () => {
  const blue = setColor(src, 'pack', 'blue', 'node').text;
  assert.equal(setColor(blue, 'pack', 'blue', 'node').text, blue);
});

test('None takes the class line off, and the classDef once no node uses it: the file is as it was', () => {
  const both = setColor(setColor(src, 'pack', 'blue', 'node').text, 'send', 'blue', 'node').text;
  const one = setColor(both, 'pack', 'none', 'node').text;
  assert.equal(one, `${src}  ${BLUE}\n  class send merma-blue\n`);
  assert.equal(setColor(one, 'send', 'none', 'node').text, src);
});

test('None keeps a classDef changed by hand', () => {
  const hand = `${src}  class pack merma-blue\n  classDef merma-blue fill:#00f,stroke:#2563eb,color:#1e3a8a\n`;
  assert.equal(setColor(hand, 'pack', 'none', 'node').text, `${src}  classDef merma-blue fill:#00f,stroke:#2563eb,color:#1e3a8a\n`);
});

test('a file\'s own class after merma\'s line: the color moves to the end, so it is drawn', () => {
  const after = `${src}  class pack merma-blue\n  ${BLUE}\n  class pack hot\n  classDef hot fill:#fdd\n`;
  assert.deepEqual(colorOf(after, 'pack'), { key: null, other: 'hot' });
  assert.equal(setColor(after, 'pack', 'red', 'node').text,
    `${src}  class pack hot\n  classDef hot fill:#fdd\n  class pack merma-red\n  ${RED}\n`);
});

test('a node with a class of the file\'s own keeps it, with the color after', () => {
  const hot = 'flowchart TD\n  pack:::hot --> send\n  classDef hot fill:#fdd\n';
  assert.deepEqual(colorOf(hot, 'pack'), { key: null, other: 'hot' });
  const blue = setColor(hot, 'pack', 'blue', 'node').text;
  assert.equal(blue, `${hot}  class pack merma-blue\n  ${BLUE}\n`);
  assert.deepEqual(colorOf(blue, 'pack'), { key: 'blue', other: null });
  assert.deepEqual(colorOf(hot, 'send'), { key: 'none', other: null });
});

test('a class with hyphens after ::: is read whole: its color, a copy, and whether a preset is still named', () => {
  const own = 'flowchart TD\n  pack:::my-class --> send\n  classDef my-class fill:#fdd\n';
  assert.deepEqual(colorOf(own, 'pack'), { key: null, other: 'my-class' });
  assert.deepEqual(copyNode(own, 'pack').classes, ['my-class']);
  const both = `flowchart TD\n  pack --> send:::merma-blue\n  class pack merma-blue\n  ${BLUE}\n`;
  assert.equal(setColor(both, 'pack', 'none', 'node').text, `flowchart TD\n  pack --> send:::merma-blue\n  ${BLUE}\n`);
});

test('a color on a shared line of merma\'s is split, so the other node keeps it', () => {
  const shared = `${src}  class pack,send merma-blue\n  ${BLUE}\n`;
  assert.equal(setColor(shared, 'pack', 'red', 'node').text,
    `${src}  class send merma-blue\n  ${BLUE}\n  class pack merma-red\n  ${RED}\n`);
});

test('a style line setting a fill, a border or a text color refuses a color; other style lines do not', () => {
  for (const style of ['fill:#eef', 'stroke:#000', 'color:#111,stroke-width:2px']) {
    assert.match(colorRefusal(`${src}  style pack ${style}\n`, 'pack', 'node') ?? '', /own style line/, style);
  }
  assert.equal(colorRefusal(`${src}  style pack stroke-width:2px\n`, 'pack', 'node'), null);
  assert.equal(colorRefusal(`${src}  style send fill:#eef\n`, 'pack', 'node'), null);
});

test('a subgraph takes the lighter box preset', () => {
  const sg = 'flowchart TD\n  subgraph pay [Payment]\n    charge --> ok\n  end\n';
  const out = setColor(sg, 'pay', 'blue', 'subgraph');
  assert.equal(out.text, `${sg}  class pay merma-blue-box\n  classDef merma-blue-box fill:#eff6ff,stroke:#60a5fa,color:#1e3a8a\n`);
  assert.deepEqual(colorOf(out.text, 'pay'), { key: 'blue', other: null });
});

test('a subgraph with no id is given one first', () => {
  const sg = 'flowchart TD\n  subgraph "Order records"\n    mail --- note\n  end\n';
  const out = setColor(sg, 'subGraph0', 'green', 'subgraph');
  assert.equal(out.id, 's1');
  assert.match(out.text, /subgraph s1 \["Order records"\]\n[\s\S]*class s1 merma-green-box\n/);
});

test('a paste into another file brings the classDef with the class', () => {
  const blue = setColor(src, 'pack', 'blue', 'node').text;
  const other = 'flowchart LR\n  a --> b\n';
  const out = pasteNode(other, copyNode(blue, 'pack'), null, false).text;
  assert.equal(out, `${other}  n1[[Pack]]\n  class n1 merma-blue\n  ${BLUE}\n`);
  const sg = setColor('flowchart TD\n  subgraph pay [Payment]\n    charge\n  end\n', 'pay', 'teal', 'subgraph').text;
  assert.match(pasteSubgraph(other, copySubgraph(sg, 'pay'), null).text, /class s1 merma-teal-box\n[\s\S]*classDef merma-teal-box /);
});

test('withPresetDefs leaves a file\'s own class and a defined preset alone', () => {
  const t = `${src}  class pack hot\n  class send merma-blue\n  ${BLUE}\n`;
  assert.equal(withPresetDefs(t), t);
});

test('the picker lists None, then every preset once, each with its own digit', () => {
  assert.deepEqual(COLORS.map((c) => c.key), ['none', ...Object.keys(PRESETS)]);
  assert.equal(new Set(COLORS.map((c) => c.digit)).size, COLORS.length);
  for (const [key, p] of Object.entries(PRESETS)) {
    for (const set of [p.node, p.box]) for (const c of set) assert.match(c, /^#[0-9a-f]{6}$/, key);
  }
});

test('on every node and subgraph of every fixture, a color and then None give back the file as it was', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const F = join(import.meta.dirname, 'fixtures');
  const nodeIds = JSON.parse(readFileSync(join(F, 'node-ids.json'), 'utf8'));
  const subgraphIds = JSON.parse(readFileSync(join(F, 'subgraph-ids.json'), 'utf8'));
  for (const [name, list] of Object.entries(nodeIds)) {
    const text = readFileSync(join(F, name), 'utf8');
    const items = [...list.map((id) => [id, 'node']), ...(subgraphIds[name] ?? []).map((id) => [id, 'subgraph'])];
    for (const [id, kind] of items) {
      if (colorRefusal(text, id, kind) || (kind === 'subgraph' && /^subGraph\d+$/.test(id))) continue;
      const blue = setColor(text, id, 'blue', kind).text;
      assert.equal(setColor(blue, id, 'none', kind).text, text, `${name} ${id}`);
    }
  }
});
