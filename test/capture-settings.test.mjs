import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CaptureSettings, CaptureController } from '../src/capture-settings.mjs';

test('capture is opt-in, persistent settings override environment and corrupt configuration is preserved', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'capture-config-'));
  try {
    const settings = new CaptureSettings(path.join(root, 'settings.json'), {});
    assert.equal((await settings.read()).enabled, false);
    await settings.save({ enabled: true, intervalSeconds: 30 });
    const restarted = new CaptureSettings(settings.file, { CODEX_SKILL_MANAGER_AUTO_CAPTURE: '0' });
    assert.equal((await restarted.read()).enabled, true);
    assert.equal((await restarted.read()).intervalSeconds, 30);
    await assert.rejects(settings.save({ enabled: true, intervalSeconds: 1 }));
    await writeFile(settings.file, 'broken');
    await assert.rejects(settings.save({ enabled: false }));
    assert.equal(await readFile(settings.file, 'utf8'), 'broken');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('controller consults shared settings, stops future reads on disable and reports failures without erasing records', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'capture-control-'));
  try {
    let reads = 0;
    const settings = new CaptureSettings(path.join(root, 'settings.json'), {});
    const collector = { refresh: async () => { reads++; return { pendingBytes: 0 }; }, status: async () => ({ coverage: { pendingBytes: 0 } }) };
    const controller = new CaptureController(collector, settings);
    assert.equal(await controller.refresh(), null); assert.equal(reads, 0);
    await controller.configure({ enabled: true, intervalSeconds: 10 });
    await controller.refresh(); assert.equal(reads, 1);
    await new CaptureSettings(settings.file, {}).save({ enabled: false, intervalSeconds: 60 });
    await controller.refresh(); assert.equal(reads, 1);
    assert.equal((await controller.info()).intervalSeconds, 60);
    collector.status = async () => { throw new Error('unreadable'); };
    assert.equal((await controller.info()).lastError, 'unreadable');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('panel refreshes and multiple instances honor the shared capture interval', async () => {
  let reads = 0, coverage = null;
  const settings = { read: async () => ({ enabled: true, intervalSeconds: 60 }) };
  const collector = { status: async () => ({ coverage }), refresh: async () => { reads++; coverage = { checkedAt: new Date().toISOString(), pendingBytes: 0 }; return coverage; } };
  const first = new CaptureController(collector, settings), second = new CaptureController(collector, settings);
  await first.refresh(); await first.refresh(); await second.refresh();
  assert.equal(reads, 1);
});
