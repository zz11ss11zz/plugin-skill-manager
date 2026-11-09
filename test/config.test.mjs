import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, ConfigError } from '../src/backend/config/loader.mjs';
import { selectPlatform } from '../src/backend/adapters/platform/index.mjs';
import { OVERLAP_DEFAULTS } from '../src/backend/domain/redundancy/overlap.mjs';
import { COMPONENT_DEFAULTS } from '../src/backend/adapters/skill-files/components.mjs';
import { REDUNDANCY_DEFAULTS } from '../src/backend/application/redundancy.service.mjs';
import { testConfig } from './helpers/config.mjs';

const platform = selectPlatform();

test('library fallbacks equal the shipped TOML defaults, so TOML stays the single source of truth', () => {
  const config = testConfig();
  for (const [key, value] of Object.entries(OVERLAP_DEFAULTS)) assert.equal(config.redundancy.overlap[key], value, `overlap.${key}`);
  for (const [key, value] of Object.entries(REDUNDANCY_DEFAULTS)) assert.equal(config.redundancy[key], value, `redundancy.${key}`);
  for (const [key, value] of Object.entries(COMPONENT_DEFAULTS)) assert.deepEqual(config.components[key], value, `components.${key}`);
});

test('layers merge in order: defaults < host < user file < legacy env < PSM env < overrides', () => {
  const dir = os.tmpdir();
  const config = loadConfig({ platform, userFile: null, env: { CODEX_SKILL_MANAGER_CLI: '/legacy/codex', PSM__HOST_CLI__TIMEOUT_MS: '2500', PSM__REDUNDANCY__ALLOWED_DAYS: '[7, 90]' }, overrides: { capture: { intervalSeconds: 20 } } });
  assert.equal(config.app.host, 'codex');
  assert.equal(config.host.id, 'codex');
  assert.equal(config.hostCli.command, '/legacy/codex');
  assert.equal(config.hostCli.timeoutMs, 2500);
  assert.deepEqual(config.redundancy.allowedDays, [7, 90]);
  assert.equal(config.capture.intervalSeconds, 20);
  assert.ok(Object.isFrozen(config.capture));
  assert.ok(dir);
});

test('user configuration file overrides shipped defaults and invalid values name the key', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'psm-config-'));
  try {
    const file = path.join(dir, 'config.toml');
    await writeFile(file, '[capture]\ninterval_seconds = 45\n[redundancy.overlap]\nmin_jaccard = 0.5\n');
    const config = loadConfig({ platform, env: {}, userFile: file });
    assert.equal(config.capture.intervalSeconds, 45);
    assert.equal(config.redundancy.overlap.minJaccard, 0.5);
    await writeFile(file, '[capture]\ninterval_seconds = 1\n');
    assert.throws(() => loadConfig({ platform, env: {}, userFile: file }), error => error instanceof ConfigError && /capture/.test(error.message));
    await writeFile(file, '[capture\n');
    assert.throws(() => loadConfig({ platform, env: {}, userFile: file }), error => error instanceof ConfigError && error.layer === file);
    await writeFile(file, '[unknown]\nvalue = 1\n');
    assert.throws(() => loadConfig({ platform, env: {}, userFile: file }), /invalid configuration/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('unknown hosts and invalid task patterns are rejected before startup', () => {
  assert.throws(() => loadConfig({ platform, env: {}, userFile: null, host: 'nope' }), /missing shipped configuration hosts\/nope\.toml/);
  assert.throws(() => loadConfig({ platform, env: {}, userFile: null, host: '../x' }), /invalid host id/);
  const readShipped = rel => rel === 'redundancy/task-vocabulary.toml' ? '[[task]]\nid = "bad"\npattern = "("\n' : loadShipped(rel);
  assert.throws(() => loadConfig({ platform, env: {}, userFile: null, readShipped }), /invalid task pattern "bad"/);
});
import { readShippedConfig as loadShipped } from '../src/backend/config/files.mjs';
