// Theming: design tokens as CSS custom properties (--jade-*). They cross shadow DOM, so every component reads them.
//   setTheme({ preset: 'midnight', mode: 'dark', density: 'compact', radius: 6, tokens: { accent: '#e11d48' } })
//   setTheme({ … , target: el })   theme one part of the page only
// The default preset ("jade") is built in: Jade's own look from Jade Vault (netrunner green on void black, cut corners,
// Rajdhani / Chakra Petch / JetBrains Mono, soft glows). The others download the first time they are used (themes/*.js);
// "classic" is the pre-1.3 jade palette.
//   setTheme({ backdrop: true })   adds Vault's grid + scanline backdrop behind the page (off by default for embeds)
//   setTheme({ fonts: false })     keeps system fonts (no font download; offline pages fall back to them anyway)
const KEYS = ['bg', 'surface', 'surface-2', 'fg', 'muted', 'border', 'accent', 'accent-fg', 'user', 'user-fg', 'code',
  'ok', 'warn', 'danger', 'syn-k', 'syn-s', 'syn-n', 'syn-c'];
export const TOKENS = [...KEYS, 'radius', 'space', 'font', 'mono', 'font-size', 'shadow', 'focus', 'display', 'cut', 'glow', 'accent-2'];
/** the built-in preset: [light, dark] */
const JADE = [
  ['#eef5f2', '#f8fcfa', '#e2ede8', '#06140f', '#4f665d', '#b9d3c8', '#0a8f63', '#ffffff', '#d7efe4', '#06140f', '#e6f0ec', '#0a8f63', '#a8650f', '#d22b3c', '#0b6e99', '#b0306a', '#6b49b0', '#5c7369'],
  ['#040807', '#09100e', '#0f1a17', '#e3f2ed', '#83998f', '#1a2d27', '#1fe5a5', '#00140c', '#0f2a20', '#e3f2ed', '#060c0a', '#b8ffdf', '#f2c14e', '#ff3d4f', '#7fd8ff', '#ffb8c6', '#c8a4f0', '#5f7a6e'],
];
/** Vault's type, corners and glow; light mode drops the glow */
const JADE_SHARED = [
  { radius: '2px', display: "'Rajdhani','Arial Narrow',system-ui,sans-serif", font: "'Chakra Petch',system-ui,-apple-system,'Segoe UI',sans-serif",
    mono: "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace", cut: '10px', glow: '0 0 0 1px rgb(10 143 99 / .25)', 'accent-2': '#d22b6a',
    shadow: '0 1px 2px rgb(0 0 0 / .08), 0 6px 18px rgb(6 20 15 / .08)' },
  { radius: '2px', display: "'Rajdhani','Arial Narrow',system-ui,sans-serif", font: "'Chakra Petch',system-ui,-apple-system,'Segoe UI',sans-serif",
    mono: "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace", cut: '10px', glow: '0 0 0 1px #1d6b52, 0 0 18px rgb(31 229 165 / .16)', 'accent-2': '#ffb8c6',
    shadow: '0 0 0 1px #1a2d27, 0 10px 30px rgb(0 0 0 / .45)' },
];
export const PRESETS = ['jade', 'classic', 'midnight', 'paper', 'contrast'];
const LOADERS = { classic: () => import('./themes/classic.js'), midnight: () => import('./themes/midnight.js'), paper: () => import('./themes/paper.js'), contrast: () => import('./themes/contrast.js') };
const FONT_CDN = 'https://cdn.jsdelivr.net/npm/@fontsource';
const FONTS = [['Rajdhani', 'rajdhani', [500, 600, 700]], ['Chakra Petch', 'chakra-petch', [400, 500, 600]], ['JetBrains Mono', 'jetbrains-mono', [400, 600]]];
let fontsLoaded = false;
function loadFonts() {
  if (fontsLoaded || typeof document === 'undefined') return; fontsLoaded = true;
  const el = document.createElement('style'); el.id = 'jade-fonts';
  el.textContent = FONTS.flatMap(([fam, pkg, ws]) => ws.map((w) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(${FONT_CDN}/${pkg}@5/files/${pkg}-latin-${w}-normal.woff2) format('woff2')}`)).join('');
  document.head.append(el);
}
const BACKDROP = `body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background:
  linear-gradient(transparent 0 calc(100% - 1px), rgb(31 229 165 / .035) 0) 0 0/100% 32px,
  linear-gradient(90deg, transparent 0 calc(100% - 1px), rgb(31 229 165 / .035) 0) 0 0/32px 100%,
  radial-gradient(1200px 600px at 85% -10%, rgb(31 229 165 / .10), transparent 60%),
  radial-gradient(900px 500px at -10% 110%, rgb(255 184 198 / .06), transparent 60%)}
body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:2147483000;background:repeating-linear-gradient(0deg, rgb(0 0 0 / .18) 0 1px, transparent 1px 3px);mix-blend-mode:multiply;opacity:.55}
body{background:var(--jade-bg);color:var(--jade-fg)}`;
const DENSITY = { compact: 6, cozy: 8, comfortable: 10 };
const state = new Map();   // target → current options
let uid = 0, applied = false;

const toVars = (arr) => Object.fromEntries(KEYS.map((k, i) => [k, arr[i]]));
function css(sel, light, dark, o) {
  const shared = { radius: '12px', space: (DENSITY[o.density] || DENSITY.cozy) + 'px',
    font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    'font-size': '15px', shadow: '0 1px 2px rgb(0 0 0 / .06), 0 4px 16px rgb(0 0 0 / .06)', focus: 'var(--jade-accent)', display: 'var(--jade-font)', cut: '0px', glow: 'none', 'accent-2': 'var(--jade-accent)' };
  const [sl, sd] = o.presetShared || [{}, {}];
  const fix = (x) => { const y = { ...x }; if (o.radius != null) y.radius = o.radius + 'px'; if (o.fonts === false) { delete y.font; delete y.display; delete y.mono; } return y; };
  const block = (vars, extra, scheme) => `${sel}{${Object.entries({ ...shared, ...fix(extra), ...vars, ...(o.shared || {}), ...(o.tokens || {}) }).map(([k, v]) => `--jade-${k}:${v};`).join('')}color-scheme:${scheme}}`;
  const bd = o.backdrop && sel === ':root' ? BACKDROP : '';
  if (o.mode === 'light') return block(light, sl, 'light') + bd;
  if (o.mode === 'dark') return block(dark, sd, 'dark') + bd;
  return block(light, sl, 'light') + `@media (prefers-color-scheme:dark){${block(dark, sd, 'dark')}}` + bd;
}
async function presetVars(name) {
  if (!name || name === 'jade') return { modes: JADE.map(toVars), shared: JADE_SHARED };
  if (!LOADERS[name]) throw new Error(`unknown theme preset "${name}". Presets: ${PRESETS.join(', ')}`);
  const d = (await LOADERS[name]()).default;   // [light, dark] or { modes: [light, dark], shared: [lightExtra, darkExtra] }
  return Array.isArray(d) ? { modes: d.map(toVars), shared: [{}, {}] } : { modes: d.modes.map(toVars), shared: d.shared || [{}, {}] };
}
/**
 * Apply a theme to the page (or to `target` and what is inside it). Options merge with the current ones.
 * @param {{ preset?: string, mode?: 'auto'|'light'|'dark', density?: 'compact'|'cozy'|'comfortable', radius?: number,
 *           tokens?: Record<string,string>, target?: Element }} o
 */
export async function setTheme(o = {}) {
  const target = o.target || document.documentElement; const prev = state.get(target) || { preset: 'jade', mode: 'auto' };
  const next = { ...prev, ...o, tokens: o.tokens === null ? undefined : { ...(prev.tokens || {}), ...(o.tokens || {}) } }; delete next.target;
  for (const k of Object.keys(next.tokens || {})) if (!TOKENS.includes(k)) throw new Error(`unknown token "${k}". Tokens: ${TOKENS.join(', ')}`);
  const pv = await presetVars(next.preset); const [light, dark] = pv.modes;
  if ((!next.preset || next.preset === 'jade') && next.fonts !== false) loadFonts();
  let sel = ':root';
  if (target !== document.documentElement) { target.dataset.jadeTheme ||= String(++uid); sel = `[data-jade-theme="${target.dataset.jadeTheme}"]`; }
  const id = 'jade-theme' + (sel === ':root' ? '' : '-' + target.dataset.jadeTheme);
  let el = document.getElementById(id); if (!el) { el = document.createElement('style'); el.id = id; document.head.prepend(el); }
  el.textContent = css(sel, light, dark, { ...next, presetShared: pv.shared }); state.set(target, next); applied = true;
  if (target === document.documentElement) document.documentElement.dataset.jadeMode = next.mode;
  document.dispatchEvent(new CustomEvent('jade-theme', { detail: { ...next, target } }));
  return next;
}
/** the current theme options (of the page, or of `target`) */
export const getTheme = (target = document.documentElement) => ({ ...(state.get(target) || { preset: 'jade', mode: 'auto' }) });
/** components call this: the default theme, unless the page already set one (or styles --jade-* itself) */
export function ensureTheme() {
  if (applied || typeof document === 'undefined') return; applied = true;
  if (getComputedStyle(document.documentElement).getPropertyValue('--jade-accent')) return;
  loadFonts();
  const el = document.createElement('style'); el.id = 'jade-theme'; el.textContent = css(':root', ...JADE.map(toVars), { presetShared: JADE_SHARED }); document.head.prepend(el);
}
