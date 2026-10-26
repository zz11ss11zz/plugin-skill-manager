// Real CLI lifecycle using only synthetic data and an isolated Codex home.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { listHostSkills } from './host-skills.mjs';
import { pluginId } from './plugin-install.mjs';

const run = promisify(execFile);
const source = path.resolve(process.argv[2]);
const previous = process.argv[3] ? path.resolve(process.argv[3]) : source;
await mkdir('work', { recursive: true });
const root = await mkdtemp(path.resolve('work/distribution-'));
const first = path.join(root, 'first package'), next = path.join(root, 'next package');
const home = path.join(root, 'profile/.codex');
await mkdir(home, { recursive: true });
await cp(previous, first, { recursive: true });
await cp(source, next, { recursive: true });
const env = { ...process.env, HOME: path.dirname(home), USERPROFILE: path.dirname(home), CODEX_HOME: home };
delete env.CODEX_SKILL_MANAGER_DATA_DIR; delete env.CODEX_SKILL_MANAGER_LEGACY_DIR;
const cli = async args => {
  const result = await run(process.env.CODEX_SKILL_MANAGER_CLI || 'codex', args, { cwd: root, env, windowsHide: true, timeout: 60000 });
  return args.includes('--json') ? JSON.parse(result.stdout) : result.stdout;
};
const checks = [];
const manage = async (folder, action, replaceSource = false) => {
  const args = [path.join(folder, 'install.mjs'), action, ...(replaceSource ? ['--replace-source'] : [])];
  const result = await run(process.execPath, args, { cwd: folder, env, windowsHide: true, timeout: 120000 });
  if (result.stderr.trim()) console.log(result.stderr.trim());
  return JSON.parse(result.stdout);
};
console.log(`ACCEPTANCE_ROOT ${root}`);
const installed = await manage(first, 'install');
checks.push('install from extracted complete distribution');
const discovered = await listHostSkills({ cwd: root, env, cli: process.env.CODEX_SKILL_MANAGER_CLI || 'codex' });
assert.ok(discovered.data.flatMap(d => d.skills).some(s => s.pluginId === pluginId && s.enabled));
checks.push('real app-server discovers companion skill');
let activeVersion = installed.version;
async function query(record = false) {
  const packagePath = path.join(home, 'plugins/cache/plugin-skill-manager/plugin-skill-manager', activeVersion);
  const client = new Client({ name: 'distribution-acceptance', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(packagePath, 'server/src/server.mjs')], env, stderr: 'pipe' });
  try {
    await client.connect(transport);
    if (record) {
      const result = await client.callTool({ name: 'record_plugin_calls', arguments: { calls: [{ id: 'distribution_synthetic_001', plugin: 'example', tool: 'mcp__codex_apps__example_read' }] } });
      assert.ok(!result.isError);
    }
    const opened = await client.callTool({ name: 'open_skill_manager', arguments: {} });
    assert.equal(opened.structuredContent.pluginCalls.total, 1);
    const entry = (await client.listTools()).tools.find(t => t.name === 'open_skill_manager');
    assert.match((await client.readResource({ uri: entry._meta.ui.resourceUri })).contents[0].text, /activity-panel/);
  } finally { await client.close(); await transport.close(); }
}
await query(true); await query();
checks.push('installed cache starts, serves UI and retains records across restart');
await assert.rejects(manage(next, 'install'), /another path/);
checks.push('changed source requires explicit replacement');
const upgraded = await manage(next, 'install', true); activeVersion = upgraded.version; await query();
checks.push(`explicit relocated source replacement ${installed.version} to ${upgraded.version} retains records`);
const ledger = path.join(home, 'skill-manager/data-v1/plugin-calls.json');
const before = await readFile(ledger, 'utf8');
await manage(next, 'uninstall');
assert.equal(await readFile(ledger, 'utf8'), before);
checks.push('uninstall preserves data');
await manage(next, 'install'); await query();
checks.push('reinstall reads retained data');
await manage(next, 'uninstall');
const report = { version: upgraded.version, previousVersion: installed.version, cli: await cli(['--version']), checks, nativeDesktopUI: 'not exercised', data: 'synthetic isolated fixture' };
await writeFile(path.join(root, 'result.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
