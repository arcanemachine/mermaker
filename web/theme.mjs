// The page's theme, light or dark (docs/ux.md): the one chosen in this browser, else the server's default
// (MERMAKER_THEME, Light unless set); System follows the system's setting. With Dark, the diagram is drawn with
// Mermaid's dark themes unless its file sets one. No DOM.

/** Where the chosen theme is kept (localStorage); index.html reads it too, before the page paints. */
export const THEME_KEY = 'mermaker:theme';

/** The page theme choices, in the Page theme submenu's order: System follows the system's setting. */
export const THEMES = [
  { key: 'system', name: 'System' },
  { key: 'light', name: 'Light' },
  { key: 'dark', name: 'Dark' },
];

/** Whether `value` is one of the choices. */
const isChoice = (/** @type {string | null} */ value) => THEMES.some((t) => t.key === value);

/**
 * The choice in force: the one kept in this browser, else the server's default (`fallback`), each counted only when it
 * is a choice; else 'light'.
 */
export function themeChoice(/** @type {string | null} */ kept, /** @type {string | null} */ fallback) {
  return isChoice(kept) ? /** @type {string} */ (kept) : isChoice(fallback) ? /** @type {string} */ (fallback) : 'light';
}

/** The theme shown for choice `choice`: Light or Dark as chosen, System by the system's setting. */
export function shownTheme(/** @type {string} */ choice, /** @type {boolean} */ systemDark) {
  return choice === 'light' || choice === 'dark' ? choice : systemDark ? 'dark' : 'light';
}

/**
 * Whether the diagram's code sets a Mermaid theme of its own, in its frontmatter's config or an init directive: then
 * Mermaid draws it so whatever the page theme.
 */
export function fileTheme(/** @type {string} */ text) {
  const front = /^\s*---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';
  return /^\s+theme\s*:/m.test(front) || /%%\{[\s\S]*?\btheme\b[\s\S]*?\}%%/.test(text);
}

/** Each of Mermaid's light themes a diagram type defaults to, and its dark counterpart. */
const DARK = /** @type {Record<string, string>} */ ({ 'redux-color': 'redux-dark-color' });

/**
 * The themes a diagram is drawn with under the Dark page theme, as a Mermaid config: `dark`, and for each diagram type
 * that Mermaid's own defaults (`defaults`) give a theme of its own (a flowchart's redux-color), that theme's dark
 * counterpart, in the type's section, which wins there.
 * @param {Record<string, unknown>} defaults
 */
export function darkThemes(defaults) {
  /** @type {Record<string, string | { theme: string }>} */
  const config = { theme: 'dark' };
  for (const [type, section] of Object.entries(defaults)) {
    const own = /** @type {{ theme?: unknown } | null} */ (section)?.theme;
    if (typeof own === 'string' && DARK[own]) config[type] = { theme: DARK[own] };
  }
  return config;
}
