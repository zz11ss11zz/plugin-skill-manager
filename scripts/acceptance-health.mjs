// Actual health component and styles with synthetic responses, never a native host.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error('Set CHROME_PATH to a local Chromium executable');
const output = path.resolve(process.argv[2] || 'work/health-ui');
await mkdir(output, { recursive: true });
const template = await readFile(new URL('../src/dashboard.html', import.meta.url), 'utf8');
const modulePath = fileURLToPath(new URL('../src/health-ui.mjs', import.meta.url));
const report = { version: 1, status: 'unknown', checkedAt: '2026-10-30T12:00:00.000Z', checks: [
  { status: 'ok', title: { zh: 'Node.js 运行环境', en: 'Node.js runtime' }, message: { zh: '要求 Node.js 20.18 或更高版本。', en: 'Node.js 20.18 or newer is required.' } },
  { status: 'info', title: { zh: '自动采集设置', en: 'Automatic capture settings' }, message: { zh: '自动采集已关闭，已有记录仍保留。', en: 'Automatic capture is off; existing records are preserved.' } },
  { status: 'unknown', title: { zh: '插件安装清单', en: 'Installed plugins' }, message: { zh: '本机 CLI 查询超时，已结束本次查询。', en: 'The local CLI query timed out and was stopped.' }, action: { zh: '检查 CLI 路径、当前权限和 Codex 环境后重试；原配置保持不变。', en: 'Check the CLI path, permissions and Codex environment, then retry. Existing configuration is preserved.' } },
] };
const results = [];
for (const [locale, width, dark] of [['zh', 1100, false], ['en', 1100, true], ['zh', 380, false]]) {
  const name = `${locale}-${width}-${dark ? 'dark' : 'light'}`;
  const source = `import {createHealthPanel} from ${JSON.stringify(modulePath)};
    const report=${JSON.stringify(report)}; let calls=0;
    const root=document.querySelector('#environment-health');
    const panel=createHealthPanel(root,${JSON.stringify(locale)},async()=>{calls++; if(calls>1)throw new Error('synthetic failure');return {structuredContent:{health:report}};});
    if(calls!==0)throw new Error('Unexpected automatic probe');
    document.querySelector('details').open=true;root.querySelector('button').click();
    setTimeout(()=>{root.querySelector('button').click();setTimeout(()=>{
      const pass=calls===2 && root.querySelectorAll('li').length===3 && !root.querySelector('button').disabled && document.documentElement.scrollWidth<=window.innerWidth;
      document.body.dataset.healthUi=pass?'pass':'fail';
      parent.postMessage({type:'health-verified',pass},'*');
    },0);},0);`;
  const bundle = await build({ stdin: { contents: source, resolveDir: path.dirname(modulePath), loader: 'js' }, bundle: true, format: 'iife', write: false });
  const html = template.replace('<!-- APP_VERSION -->', 'Development · Synthetic diagnostic').replace('<p>查看本地技能文件与来源证据。</p>', '<p>DEMO · Synthetic responses · Browser component verification</p>').replace('/* APP_BUNDLE */', bundle.outputFiles[0].text).replace('<p id="status" role="status">正在读取统计…</p>', '');
  const file = path.join(output, `${name}.html`), screenshot = path.join(output, `${name}.png`);
  // Chromium's outer window has a minimum width on Windows. An iframe creates
  // the actual narrow viewport, instead of cropping a wider page screenshot.
  const escaped = html.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  await writeFile(file, `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><iframe id="preview" style="display:block;border:0;width:${width}px;height:1000px" srcdoc="${escaped}"></iframe><script>window.addEventListener('message',event=>{if(event.source===document.querySelector('#preview').contentWindow&&event.data?.type==='health-verified')document.body.dataset.healthUi=event.data.pass?'pass':'fail';});</script></body></html>`);
  const args = ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${path.join(output, `profile-${name}`)}`, `--window-size=${width},1000`, '--virtual-time-budget=1500', '--hide-scrollbars', `--screenshot=${screenshot}`, '--dump-dom', ...(dark ? ['--force-dark-mode'] : []), pathToFileURL(file).href];
  const { stdout } = await promisify(execFile)(chrome, args, { windowsHide: true, timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  assert.match(stdout, /data-health-ui="pass"/);
  assert.ok((await stat(screenshot)).size > 1000);
  results.push({ name, passed: true });
}
await writeFile(path.join(output, 'verification.json'), JSON.stringify({ scope: 'synthetic-browser-component', results }, null, 2));
console.log(JSON.stringify(results));
