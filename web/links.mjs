// A node's link (`click A href "…"`), as Mermaid reads it: what Open link does with it, or why it does nothing. No DOM.

export const NO_LINK = 'No link on this node.';
/** A `javascript:` link, which Mermaid's sanitizer turns into about:blank. */
export const SCRIPT_LINK = 'This link runs a script. Mermaker does not run it.';
/** A callback (`click A charge`): a script for Run script, not a link. */
export const CALLBACK = 'This node has no link. Press Shift+X to run its script.';
/** Edit link on a callback, which a link would overwrite. */
export const CALLBACK_EDIT = 'This node has a script, not a link. Change it in the code.';
/** Run script on a node with no callback. */
export const NO_SCRIPT = 'This node has no script to run.';
/** Run script with no script file and nothing on the page handling `mermaker:run`, naming the call. */
export const noHandler = (/** @type {string} */ call) => `Nothing on this page ran ${call}. The guide (Scripts of your own) shows how to add a script.`;
export const NOT_MMD = 'Mermaker opens only .mmd files from a link to a path.';

/**
 * What a link leads to: a diagram file on this server, shown with its part (a subgraph id, as in the address) and the
 * node to select, a web address, an app's address (`vscode:`), which the system hands to the app, or why Mermaker does
 * not follow it.
 * @typedef {{ path: string, part: string | null, node: string | null } | { url: string, app: boolean } | { why: string }} LinkTarget
 */

/**
 * Which blue a link's label takes on a node filled `fill`, a computed CSS color (`rgb(…)`): 'dark' on a fill darker
 * than the luminance where black and white text contrast equally (WCAG's relative luminance), else 'light'. No fill,
 * or a transparent one, is 'light': the page behind it is white.
 * @returns {'light' | 'dark'}
 */
export function linkTone(/** @type {string} */ fill) {
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(fill);
  if (!m || Number.parseFloat(m[4] ?? '1') === 0) return 'light';
  const [r, g, b] = [m[1], m[2], m[3]].map((v) => {
    const c = Number(v) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.179 ? 'dark' : 'light';
}

/**
 * Where node's link `link` (from Mermaid's db; undefined for none) leads, from diagram `file` (an absolute path).
 * `click` says whether the text has a `click` line for the node: with no link, it is a callback.
 * @returns {LinkTarget}
 */
export function linkTarget(/** @type {string | undefined} */ link, /** @type {boolean} */ click, /** @type {string} */ file) {
  if (!link) return { why: click ? CALLBACK : NO_LINK };
  if (link === 'about:blank') return { why: SCRIPT_LINK };
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(link)?.[1].toLowerCase();
  if (scheme === 'http' || scheme === 'https') return { url: link, app: false };
  if (scheme === 'vscode') return { url: link, app: true };
  if (scheme) return { why: `Mermaker does not open ${scheme}: links.` };
  // A path, from the file's folder: `other.mmd?part=pay`, or `?node=charge` for this file.
  const url = new URL(link, new URL('file://' + file));
  const path = decodeURIComponent(url.pathname);
  if (!path.endsWith('.mmd')) return { why: NOT_MMD };
  return { path, part: url.searchParams.get('part'), node: url.searchParams.get('node') };
}

/**
 * The address of a node or a subgraph, for Copy link to this node or subgraph: page address `href` with `node` set
 * and `part` set or removed (null), and the file given by `hostFile`, its host path, when the server knows one.
 */
export function itemAddress(/** @type {string} */ href, /** @type {{ node: string | null, part: string | null, hostFile?: string }} */ to) {
  const url = new URL(href);
  if (to.hostFile) url.searchParams.set('f', to.hostFile);
  if (to.node === null) url.searchParams.delete('node'); else url.searchParams.set('node', to.node);
  if (to.part === null) url.searchParams.delete('part'); else url.searchParams.set('part', to.part);
  return url.href;
}

/**
 * What Edit link writes, from the link the file has now (null for none) and the prompt's answer (null: cancelled):
 * nothing (null), or the link to write, null removing it. An answer the same as the link is no edit.
 * @returns {{ link: string | null } | null}
 */
export function linkEdit(/** @type {string | null} */ now, /** @type {string | null} */ answer) {
  if (answer === null) return null;
  const link = answer.trim();
  if (link === (now ?? '')) return null;
  return { link: link || null };
}

/**
 * Run script through the user's script file: call function `name` of `loaded` (the imported module, the error it did not
 * load with, or null for no script file) with exactly `args`, awaiting it. Only a function the module exports itself is
 * called, never an inherited member (`toString`), since the diagram file gives the name.
 * @param {{ module: Record<string, unknown> } | { error: string } | null} loaded
 * @param {string} name
 * @param {string[]} args
 * @param {string} call the script as the file writes it, for the message
 * @returns {Promise<{ ran: true } | { none: true } | { why: string, kind: 'warning' | 'error' }>}
 */
export async function runExport(loaded, name, args, call) {
  if (!loaded) return { none: true };
  if ('error' in loaded) return { why: `The script file did not load: ${loaded.error}`, kind: 'error' };
  const fn = Object.hasOwn(loaded.module, name) ? loaded.module[name] : undefined;
  if (typeof fn !== 'function') return { why: `The script file has no function named ${name}.`, kind: 'warning' };
  try {
    await fn(...args);
    return { ran: true };
  } catch (e) {
    return { why: `${call} failed: ${e instanceof Error ? e.message : String(e)}`, kind: 'error' };
  }
}
