// Screenshots and a demo GIF of examples/index.html into docs/img (the README gallery): node scripts/screenshots.mjs
// Needs ffmpeg for the GIF. The Vault look is the default; the other presets are shown for comparison.
import { start, sleep } from '../tests/_harness.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const OUT = new URL('../docs/img/', import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const png = (p, name) => p.screenshot({ path: OUT + name + '.png' });
const reply = async p => { await p.locator('jade-chat').getByRole('button', { name: 'Show me what you can do' }).click(); await p.waitForFunction(() => !document.getElementById('chat').busy, null, { timeout: 20000 }); await sleep(300); };
for (const [name, vp] of [['desk', { width: 1280, height: 860 }], ['mob', { width: 390, height: 800 }]]) {
  const t = await start({ viewport: vp, colorScheme: 'dark' }); const p = t.page;
  await p.goto('https://ui.test/examples/index.html'); await p.waitForFunction(() => customElements.get('jade-chat'));
  await png(p, name + '-empty');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-')); let n = 0;
  const frame = async () => p.screenshot({ path: `${tmp}/f${String(n++).padStart(3, '0')}.png` });
  const click = p.locator('jade-chat').getByRole('button', { name: 'Show me what you can do' }).click();
  for (let i = 0; i < 16; i++) { await sleep(130); await frame(); }
  await click; await p.waitForFunction(() => !document.getElementById('chat').busy, null, { timeout: 20000 }); await sleep(300);
  await png(p, name + '-reply');
  await p.evaluate(() => document.getElementById('chat').send('Make me a sign-up form')); await sleep(300); await png(p, name + '-form');
  await p.evaluate(() => { window.P = document.getElementById('chat').send('Run a shell command'); });
  await p.waitForFunction(() => document.getElementById('chat').messages.at(-1).shadowRoot.querySelector('jade-tool-call')?.getAttribute('status') === 'waiting', null, { timeout: 20000 });
  await sleep(300); await png(p, name + '-approve');
  if (name === 'desk') {
    for (let i = 0; i < 8; i++) { await sleep(130); await frame(); }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '8', '-i', `${tmp}/f%03d.png`, '-vf', 'scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', OUT + 'chat-demo.gif']);
  }
  console.log(name, 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth), 'errors', t.fail.join('; ') || 'none');
  await t.browser.close();
}
// the presets side by side
for (const [preset, mode] of [['jade', 'dark'], ['classic', 'dark'], ['midnight', 'dark'], ['paper', 'light'], ['contrast', 'dark']]) {
  const t = await start({ viewport: { width: 900, height: 640 }, colorScheme: mode }); const p = t.page;
  await p.goto('https://ui.test/examples/index.html'); await p.waitForFunction(() => customElements.get('jade-chat'));
  await p.evaluate(async ([preset, mode]) => { const m = await import('/dist/jade-ui.js'); await m.setTheme({ preset, mode, backdrop: preset === 'jade' }); }, [preset, mode]);
  await reply(p); await png(p, 'theme-' + preset); await t.browser.close();
}
