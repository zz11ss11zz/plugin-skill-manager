import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { translator } from '../src/i18n.mjs';

test('health panel is manual, prevents overlapping calls, preserves results on failure and changes language', async () => {
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; }
    setAttribute() {}
    addEventListener(name, fn) { this.listeners[name] = fn; }
  }
  const root = new Element('root'), all = (e = root) => [e, ...e.children.flatMap(c => all(c))];
  const source = (await readFile(new URL('../src/health-ui.mjs', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  const context = vm.createContext({ document: { createElement: tag => new Element(tag) }, translator });
  vm.runInContext(source + '\nglobalThis.createPanel=createHealthPanel;', context);
  let requests = 0, resolve, reject;
  const panel = context.createPanel(root, 'zh', args => { assert.equal(args.name, 'check_recording_status'); requests++; return new Promise((yes, no) => { resolve = yes; reject = no; }); });
  const button = () => all().find(e => e.tag === 'button');
  const flush = () => new Promise(yes => setImmediate(yes));
  assert.equal(requests, 0);
  button().listeners.click(); button().listeners.click();
  assert.equal(requests, 1); assert.equal(button().disabled, true);
  panel.setLocale('en'); assert.equal(button().textContent, 'Checking…');
  const report = { version: 1, checkedAt: '2026-10-30T00:00:00Z', status: 'ok', checks: [{ status: 'info', title: { zh: '采集设置', en: 'Capture settings' }, message: { zh: '已关闭', en: 'Off' } }] };
  resolve({ structuredContent: { health: report } }); await flush();
  assert.equal(button().disabled, false);
  assert.ok(all().some(e => e.textContent === 'Info · Capture settings'));
  panel.setLocale('zh'); assert.ok(all().some(e => e.textContent === '说明 · 采集设置'));
  button().listeners.click(); reject(new Error('PRIVATE ERROR')); await flush();
  assert.ok(all().some(e => e.textContent?.includes('已有结果保留')));
  assert.ok(all().some(e => e.textContent === '说明 · 采集设置'));
  assert.ok(all().every(e => !e.textContent?.includes('PRIVATE ERROR')));
  button().listeners.click(); resolve({ structuredContent: { health: { status: 'ok' } } }); await flush();
  assert.ok(all().some(e => e.textContent?.includes('已有结果保留')));
});
