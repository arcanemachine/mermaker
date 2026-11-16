import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALLBACK, itemAddress, runExport, linkEdit, linkTarget, linkTone, NO_LINK, NOT_MMD, SCRIPT_LINK } from '../web/links.mjs';

const FILE = '/diagrams/flows/order.mmd';

test('a path leads to a .mmd file from the folder of the file shown, with its part as in the address', () => {
  assert.deepEqual(linkTarget('payment.mmd', true, FILE), { path: '/diagrams/flows/payment.mmd', part: null, node: null });
  assert.deepEqual(linkTarget('../shared/log.mmd?part=pay', true, FILE), { path: '/diagrams/shared/log.mmd', part: 'pay', node: null });
  assert.deepEqual(linkTarget('/elsewhere/a.mmd', true, FILE), { path: '/elsewhere/a.mmd', part: null, node: null });
  assert.deepEqual(linkTarget('my%20flow.mmd', true, FILE), { path: '/diagrams/flows/my flow.mmd', part: null, node: null });
});

test('a link with only a part leads to the file shown', () => {
  assert.deepEqual(linkTarget('?part=pay', true, FILE), { path: FILE, part: 'pay', node: null });
});

test('a link can name the node to select, with or without a part', () => {
  assert.deepEqual(linkTarget('?node=charge', true, FILE), { path: FILE, part: null, node: 'charge' });
  assert.deepEqual(linkTarget('log.mmd?part=pay&node=charge', true, FILE), { path: '/diagrams/flows/log.mmd', part: 'pay', node: 'charge' });
});

test("an item's address is the page's, with the node and part set, and the file's host path when it has one", () => {
  const page = 'http://localhost:63762/?f=%2Fsrv%2Fd%2Forder.mmd&part=ship';
  const at = (href, to) => Object.fromEntries(new URL(itemAddress(href, to)).searchParams);
  assert.deepEqual(at(page, { node: 'charge', part: 'ship' }), { f: '/srv/d/order.mmd', part: 'ship', node: 'charge' });
  assert.deepEqual(at(page, { node: 'charge', part: null }), { f: '/srv/d/order.mmd', node: 'charge' });
  assert.deepEqual(at(page + '&node=old', { node: null, part: 'pay' }), { f: '/srv/d/order.mmd', part: 'pay' });
  assert.deepEqual(at(page, { node: 'charge', part: null, hostFile: '/home/u/d/order.mmd' }), { f: '/home/u/d/order.mmd', node: 'charge' });
  // The scratch diagram's page has no f=, and its link loads it the same way.
  assert.deepEqual(at('http://localhost:63762/', { node: 'A', part: null }), { node: 'A' });
});

test('a path to anything but a .mmd file is not followed', () => {
  assert.deepEqual(linkTarget('notes.md', true, FILE), { why: NOT_MMD });
});

test('web addresses open as they are; a vscode: address is an app link', () => {
  assert.deepEqual(linkTarget('https://example.com/', true, FILE), { url: 'https://example.com/', app: false });
  assert.deepEqual(linkTarget('HTTP://example.com/', true, FILE), { url: 'HTTP://example.com/', app: false });
  assert.deepEqual(linkTarget('vscode://file/src/a.js:4', true, FILE), { url: 'vscode://file/src/a.js:4', app: true });
});

test('any other scheme is refused, naming it', () => {
  assert.deepEqual(linkTarget('mailto:someone@example.com', true, FILE), { why: 'Mermaker does not open mailto: links.' });
});

test('no link is a callback when the node has a click line, and about:blank is a script link', () => {
  assert.deepEqual(linkTarget(undefined, false, FILE), { why: NO_LINK });
  assert.deepEqual(linkTarget(undefined, true, FILE), { why: CALLBACK });
  assert.deepEqual(linkTarget('about:blank', true, FILE), { why: SCRIPT_LINK });
});

test("a link's blue goes by the node's fill: dark on a dark fill, light on a light, missing or clear one", () => {
  assert.equal(linkTone('rgb(31, 32, 32)'), 'dark');     // Mermaid's dark theme
  assert.equal(linkTone('rgb(236, 236, 255)'), 'light'); // Mermaid's default theme
  assert.equal(linkTone('rgb(255, 221, 221)'), 'light');
  assert.equal(linkTone('rgb(90, 90, 90)'), 'dark');
  assert.equal(linkTone('rgb(140, 140, 140)'), 'light');
  assert.equal(linkTone('rgba(0, 0, 0, 0)'), 'light');
  assert.equal(linkTone('none'), 'light');
  assert.equal(linkTone(''), 'light');
});

test('Edit link writes the answer trimmed, removes the link when emptied, and does nothing when cancelled or unchanged', () => {
  assert.deepEqual(linkEdit(null, ' other.mmd '), { link: 'other.mmd' });
  assert.deepEqual(linkEdit('a.mmd', 'b.mmd'), { link: 'b.mmd' });
  assert.deepEqual(linkEdit('a.mmd', '  '), { link: null });
  assert.equal(linkEdit('a.mmd', null), null);
  assert.equal(linkEdit('a.mmd', 'a.mmd '), null);
  assert.equal(linkEdit(null, ''), null);
});

test("Run script calls only a function the script file exports itself, with exactly the call's arguments", async () => {
  const called = [];
  const module = { charge: (...a) => { called.push(a); }, other: 1 };
  assert.deepEqual(await runExport({ module }, 'charge', ['eu', '3'], 'charge("eu", 3)'), { ran: true });
  assert.deepEqual(called, [['eu', '3']]);
  const none = { why: 'The script file has no function named toString.', kind: 'warning' };
  assert.deepEqual(await runExport({ module }, 'toString', [], 'toString'), none);
  assert.deepEqual(await runExport({ module }, 'other', [], 'other'), { ...none, why: 'The script file has no function named other.' });
  assert.deepEqual(await runExport(null, 'charge', [], 'charge'), { none: true });
  assert.deepEqual(await runExport({ error: 'Unexpected token' }, 'charge', [], 'charge'),
    { why: 'The script file did not load: Unexpected token', kind: 'error' });
});

test('a script that throws or rejects is reported as failed, with its message', async () => {
  const module = { thrown: () => { throw new Error('declined'); }, rejected: async () => { throw new Error('timed out'); } };
  assert.deepEqual(await runExport({ module }, 'thrown', [], 'thrown()'), { why: 'thrown() failed: declined', kind: 'error' });
  assert.deepEqual(await runExport({ module }, 'rejected', [], 'rejected()'), { why: 'rejected() failed: timed out', kind: 'error' });
});
