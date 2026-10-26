import test from 'node:test';
import assert from 'node:assert/strict';
import { installWithRecovery, pluginId, manageDistribution, verifyDistribution } from '../scripts/plugin-install.mjs';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

test('activation recovery checks state and retries only a known transient denial', async () => {
  let adds = 0, checks = 0, waits = 0;
  const cli = async args => {
    if (args[1] === 'list') { checks++; return { installed: [] }; }
    if (++adds === 1) throw new Error('failed to activate plugin cache entry: Access denied (os error 5)');
    return { pluginId };
  };
  assert.deepEqual(await installWithRecovery(cli, { delay: async () => waits++ }), { pluginId });
  assert.equal(adds, 2); assert.equal(checks, 1); assert.equal(waits, 1);
});
test('activation recovery stops for ambiguous success and unrelated errors', async () => {
  let adds = 0;
  await assert.rejects(installWithRecovery(async args => {
    if (args[1] === 'list') return { installed: [{ pluginId, installed: true }] };
    adds++; throw new Error('failed to activate plugin cache entry (os error 5)');
  }), /installation exists/);
  assert.equal(adds, 1);
  adds = 0;
  await assert.rejects(installWithRecovery(async () => { adds++; throw new Error('network unavailable'); }), /network unavailable/);
  assert.equal(adds, 1);
});
test('activation recovery is bounded', async () => {
  let adds = 0;
  await assert.rejects(installWithRecovery(async args => {
    if (args[1] === 'list') return { installed: [] };
    adds++; throw new Error('failed to activate plugin cache entry (os error 5)');
  }, { delay: async () => {} }), /os error 5/);
  assert.equal(adds, 3);
});

test('complete distribution blocks duplicate MCP registration and altered package files before mutation', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'manager-distribution-'));
  const root = path.join(temporary, 'release');
  try {
    execFileSync(process.execPath, ['scripts/build-distribution.mjs', root], { cwd: fileURLToPath(new URL('..', import.meta.url)) });
    await verifyDistribution(root);
    const calls = [];
    const cli = async args => {
      calls.push(args);
      if (args[0] === 'mcp') return [{ name: 'plugin-skill-manager' }];
      return { marketplaces: [] };
    };
    await assert.rejects(manageDistribution({ root, action: 'install', cli }), /Standalone MCP/);
    assert.ok(calls.every(args => args.includes('list')));
    await assert.rejects(manageDistribution({root,action:'install',cli:async args => args[0]==='mcp' ? [{name:'codex-skill-manager'}] : {marketplaces:[]}}), /Standalone MCP/);
    await assert.rejects(manageDistribution({root,action:'install',cli:async () => ({marketplaces:[{name:'codex-skill-manager',root:'/old'}]})}), /Legacy/);
    const file = path.join(root, 'plugins/plugin-skill-manager/mcp.json');
    await writeFile(file, (await readFile(file, 'utf8')) + '\n');
    calls.length = 0;
    await assert.rejects(manageDistribution({ root, action: 'install', cli }), /Integrity mismatch/);
    assert.equal(calls.length, 0);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
