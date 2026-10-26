// Capture actual synthetic browser UI states; encode an explicitly labelled slideshow video.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const url = new URL(process.argv[2]);
if (url.hostname !== '127.0.0.1') throw new Error('Only a local synthetic demo is accepted');
const zh = process.argv.includes('--zh'), t = (en, cn) => zh ? cn : en;
const output = path.resolve(process.argv[3]); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 1100 }, locale: zh ? 'zh-CN' : 'en-US' });
  const page = await context.newPage(), encoder = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await encoder.setContent('<canvas width="1100" height="1100"></canvas>');
  await encoder.evaluate(() => {
    window.canvas = document.querySelector('canvas');
    window.chunks = [];
    window.recorder = new MediaRecorder(canvas.captureStream(10), { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 1400000 });
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.start();
  });
  await page.goto(url.href);
  const frame = page.frameLocator('#app');
  await frame.locator('.activity-ranking li').first().waitFor();
  const steps = [];
  async function shot(name, caption) {
    await page.locator('header strong').evaluate((node, caption) => node.textContent = caption, t('DEMO · Synthetic browser UI · ', '演示 · 合成数据 · 浏览器界面 · ') + caption);
    const bytes = await page.screenshot({ path: path.join(output, `${name}.png`) });
    await encoder.evaluate(async data => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      canvas.getContext('2d').drawImage(image, 0, 0);
    }, bytes.toString('base64'));
    await page.waitForTimeout(4000); steps.push({ name, caption });
  }
  await shot('activity', t('Separate plugin call attempts', '独立统计插件调用尝试'));
  await frame.getByRole('button', { name: 'Skill', exact: true }).click();
  await frame.getByLabel(t('Start date', '开始日期'), { exact: true }).fill('2026-06-01');
  await frame.getByLabel(t('End date', '结束日期'), { exact: true }).fill('2026-06-30');
  await shot('filtered', t('Filter Skill adoptions by date', '按日期筛选 Skill 采用'));
  await frame.getByRole('button', { name: t('Setup', '接入'), exact: true }).click();
  await frame.getByRole('button', { name: t('Check recording status', '检查记录状态'), exact: true }).click();
  await frame.getByText(zh ? /最近接收/ : /Latest received/).first().waitFor();
  await shot('setup', t('Read-only recording status', '只读检查记录接入'));
  await frame.getByRole('button', { name: t('Manage', '管理'), exact: true }).click();
  await frame.getByLabel(t('Search name, description or path', '搜索名称、说明或路径')).fill('chart-demo');
  await frame.getByLabel(t('Source', '来源'), { exact: true }).selectOption({ label: t('User skill', '用户技能') });
  await frame.getByText(t('Source and notes', '来源与备注'), { exact: true }).click();
  await frame.getByLabel(t('Local note', '本地备注'), { exact: true }).fill(t('Keep this example for review.', '保留此演示技能用于复核。'));
  await frame.getByRole('button', { name: t('Save note', '保存备注'), exact: true }).click();
  await frame.locator('.manager-feedback').filter({ hasText: t('Done.', '已完成。') }).waitFor();
  await frame.getByText(t('Source and notes', '来源与备注'), { exact: true }).click();
  await shot('manage', t('Search, inspect sources and save a note', '搜索、核对来源与保存备注'));
  await frame.getByRole('button', { name: t('Preview archive', '预览归档'), exact: true }).click();
  await frame.getByRole('button', { name: t('Confirm archive', '确认归档'), exact: true }).waitFor();
  await shot('preview', t('Review the exact folder move before execution', '执行前核对具体移动范围'));
  await frame.getByRole('button', { name: t('Cancel', '取消'), exact: true }).click();
  await frame.locator('.manager-feedback').filter({ hasText: t('Done.', '已完成。') }).waitFor();
  await page.getByRole('button', { name: t('Narrow panel', '窄面板'), exact: true }).click();
  await shot('narrow', t('Manage in a narrow panel', '窄面板管理'));
  const bytes = await encoder.evaluate(async () => {
    await new Promise(resolve => { recorder.onstop = resolve; recorder.stop(); });
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()));
  });
  await writeFile(path.join(output, 'walkthrough.webm'), Buffer.from(bytes));
  await writeFile(path.join(output, 'capture.json'), JSON.stringify({ steps, errors, format: 'Video sequence of actual browser UI screenshots, four seconds per state; not native Codex', data: 'synthetic, local paths shown with C:\\demo\\skill-manager alias' }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Captured ${steps.length} UI states and WebM video in ${output}`);
} finally { await browser.close(); }
