#!/usr/bin/env node
// mermaker <file.mmd> [port]: open one diagram. mermaker serve [port] [host]: serve a live view of .mmd files. mermaker skill:
// print the agent skill. See README.md for the settings.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFiles, parsePathMap, parseRoots } from '../server/files.js';
import { createServer, LOOPBACK_HOSTS } from '../server/server.js';
import { stamped } from '../server/skill.js';

const USAGE = `Usage:
  mermaker <file.mmd> [port]        open that file (only that file is served); port: a free one
  mermaker serve [port] [host]      serve the .mmd files under MERMAKER_ROOTS (defaults 63762, 127.0.0.1)
  mermaker skill                    print an agent skill (SKILL.md) that teaches an agent to use Mermaker

Settings, from the environment:
  MERMAKER_ROOTS     for serve: folders whose .mmd files may be served, comma-separated (default /tmp/mermaid-diagrams/)
  MERMAKER_PATH_MAP  server=host path prefixes, comma-separated, to show a file's host path
  MERMAKER_IDLE      seconds with no requests before the server exits (unset or 0: it runs until stopped)
  MERMAKER_HOSTS     host names the page may be opened under besides localhost, 127.0.0.1 and [::1], comma-separated
  MERMAKER_MAX_EDGES the most edges a diagram may have (unset: Mermaid's 500)
  MERMAKER_MAX_TEXT  the most characters a diagram's code may have, comments and frontmatter aside (unset: Mermaid's 50000)
  MERMAKER_THEME     the page theme a browser starts with until it chooses one: light, dark or system (unset: light)
  MERMAKER_SCRIPT    a JavaScript module of your own that the page loads; Run script calls its exported functions
  BROWSER         for mermaker <file>: a command to open the page with, arguments allowed (unset: the address is printed)`;

const SCRATCH = '/tmp/mermaid-diagrams/scratch.mmd';
const SCRATCH_TEXT = 'flowchart TD\n  A["Edit /tmp/mermaid-diagrams/scratch.mmd"] --> B["This page updates on save"]\n';

const [command, ...args] = process.argv.slice(2);
if (command === 'serve') serve(args[0] ?? '63762', args[1] ?? '127.0.0.1');
else if (command === 'skill') skill();
else if (command?.endsWith('.mmd')) await open(resolve(command), args[0] ?? '0');
else {
  const help = command === undefined || command === '--help' || command === '-h';
  if (!help) console.log(`mermaker: opens .mmd files; got ${command}\n`);
  console.log(USAGE);
  process.exit(help ? 0 : 2);
}

// Printed to be saved as a skill; the hint goes to the terminal only, so a redirect saves the skill alone.
function skill() {
  process.stdout.write(stamped());
  if (process.stdout.isTTY) {
    console.error('\nSave the skill as mermaker/SKILL.md in the folder your agent reads skills from:\nmermaker skill > <skills folder>/mermaker/SKILL.md');
  }
}

function serve(/** @type {string} */ port, /** @type {string} */ host) {
  if (!existsSync(SCRATCH)) {
    mkdirSync(dirname(SCRATCH), { recursive: true });
    writeFileSync(SCRATCH, SCRATCH_TEXT);
  }
  start(parseRoots(process.env.MERMAKER_ROOTS || '/tmp/mermaid-diagrams/'), port, host,
    (/** @type {string} */ base) => console.log(`mermaker: serving .mmd files under ${process.env.MERMAKER_ROOTS || '/tmp/mermaid-diagrams/'} at ${base}/?f=<path>`));
}

/** Serve one file, or point at the Mermaker already serving it on `port`, and print the page's address. */
async function open(/** @type {string} */ file, /** @type {string} */ port) {
  if (!existsSync(file)) {
    console.error(`mermaker: no such file: ${file}`);
    process.exit(1);
  }
  const page = (/** @type {string} */ base) => `${base}/?f=${encodeURIComponent(realpathSync(file)).replaceAll('%2F', '/')}`;
  if (port !== '0') {
    const there = await mermakerAt(port, file);
    if (there === true) {
      show(page(`http://localhost:${port}`), 'already served');
      return;
    }
    // The port was a wish, the page is the aim: a Mermaker there that serves other files leaves us a free port.
    if (there) {
      console.log(`mermaker: the Mermaker on port ${port} does not serve this file (${there})`);
      port = '0';
    }
  }
  start([file], port, '127.0.0.1', (/** @type {string} */ base) => show(page(base), 'serving'));
}

/**
 * What answers on `port`: true for a Mermaker that serves `file`, the first line of its refusal for a Mermaker that does
 * not, null for anything else (or nothing).
 */
async function mermakerAt(/** @type {string} */ port, /** @type {string} */ file) {
  const base = `http://localhost:${port}`;
  try {
    const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) });
    if (!(await health.text()).startsWith('ok pid=')) return null;
    const source = await fetch(`${base}/source?f=${encodeURIComponent(file)}`, { signal: AbortSignal.timeout(2000) });
    return source.ok || (await source.text()).split('\n')[0];
  } catch {
    return null;
  }
}

/** Print the page's address, and open it with $BROWSER (a command, with any arguments) when that is set. */
function show(/** @type {string} */ url, /** @type {string} */ what) {
  console.log(`mermaker: ${what} at\n  ${url}`);
  const [browser, ...options] = (process.env.BROWSER || '').split(/\s+/).filter(Boolean);
  if (!browser) return;
  spawn(browser, [...options, url], { detached: true, stdio: 'ignore' })
    .on('error', (e) => console.error(`mermaker: could not open the page with $BROWSER: ${e.message}`))
    .unref();
}

function start(/** @type {string[]} */ roots, /** @type {string} */ port, /** @type {string} */ host,
  /** @type {(base: string) => void} */ onListening) {
  const files = createFiles({ roots, pathMap: parsePathMap(process.env.MERMAKER_PATH_MAP || '') });
  // A server bound to one non-loopback address also answers to it; one bound to every address answers only to the
  // loopback names and MERMAKER_HOSTS, since nothing says which names reach it.
  const hosts = [...LOOPBACK_HOSTS, ...parseRoots(process.env.MERMAKER_HOSTS || '')];
  if (!['0.0.0.0', '::'].includes(host)) hosts.push(host.includes(':') ? `[${host}]` : host);
  const limits = {
    maxEdges: limit('MERMAKER_MAX_EDGES', 'a whole number of edges'),
    maxTextSize: limit('MERMAKER_MAX_TEXT', 'a whole number of characters'),
  };
  const theme = process.env.MERMAKER_THEME || 'light';
  if (!['light', 'dark', 'system'].includes(theme)) {
    console.error(`mermaker: MERMAKER_THEME must be light, dark or system, not ${theme}`);
    process.exit(2);
  }
  const userScript = process.env.MERMAKER_SCRIPT ? resolve(process.env.MERMAKER_SCRIPT) : undefined;
  if (userScript && !(existsSync(userScript) && statSync(userScript).isFile())) {
    console.error(`mermaker: MERMAKER_SCRIPT must name a file, not ${process.env.MERMAKER_SCRIPT}`);
    process.exit(2);
  }
  const server = createServer({ files, script: realpathSync(fileURLToPath(import.meta.url)), hosts, limits, theme, userScript });

  // Only with MERMAKER_IDLE does the server stop on its own, that many seconds after the last request. An open page polls
  // every second, but a browser may freeze or unload a tab left in the background, so the time is not a page count.
  const idle = Number(process.env.MERMAKER_IDLE || 0);
  if (!(idle >= 0)) {
    console.error(`mermaker: MERMAKER_IDLE must be a number of seconds, not ${process.env.MERMAKER_IDLE}`);
    process.exit(2);
  }
  if (idle > 0) {
    setInterval(() => {
      if (Date.now() - server.lastRequest >= idle * 1000) process.exit(0);
    }, Math.min(5000, idle * 1000)).unref();
  }

  server.on('error', (/** @type {NodeJS.ErrnoException} */ e) => {
    console.error(`mermaker: ${e.code === 'EADDRINUSE' ? `port ${port} is held by something else` : e.message}`);
    process.exit(1);
  });
  server.listen(Number(port), host, () => {
    const name = ['127.0.0.1', '0.0.0.0', '::'].includes(host) ? 'localhost' : host.includes(':') ? `[${host}]` : host;
    onListening(`http://${name}:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`);
  });
}

/** A size limit from the environment: a whole number above 0, or undefined when unset; Mermaker refuses anything else. */
function limit(/** @type {string} */ name, /** @type {string} */ what) {
  const value = process.env[name];
  if (!value) return undefined;
  if (!/^[1-9]\d*$/.test(value)) {
    console.error(`mermaker: ${name} must be ${what}, not ${value}`);
    process.exit(2);
  }
  return Number(value);
}
