// Verify the extracted final archive, using an isolated home and no personal activity.
import { readFile, writeFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const [bundleArg, pluginArg, reportArg] = process.argv.slice(2);
if (!bundleArg || !pluginArg || !reportArg) throw Error('Usage: node scripts/verify-mcpb.mjs <extracted-mcpb> <verified-plugin> <report.json>');
const root = path.resolve(bundleArg), plugin = path.resolve(pluginArg);
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const base = JSON.parse(await readFile(path.join(plugin, 'plugin.json'), 'utf8'));
assert.equal(manifest.name, base.name); assert.equal(manifest.version, base.version);
assert.equal(manifest.manifest_version, '0.3');
assert.deepEqual(manifest.compatibility.platforms, ['win32']);
assert.equal(manifest.server.mcp_config.command, 'node');
assert.deepEqual(manifest.server.mcp_config.env, { CODEX_HOME: '${user_config.codex_home}' });
assert.deepEqual(manifest.server.mcp_config.args, ['${__dirname}/server/src/server.mjs']);
const expected = ['LICENSE', 'NOTICE', 'README.md', 'THIRD_PARTY_NOTICES.md', 'assets/icon.png',
  'manifest.json', 'server/src/assets/orbit-color.png', 'server/src/assets/sidebar-wrench.png',
  'server/src/server.mjs', 'skills/setup/SKILL.md', 'skills/skill-manager/SKILL.md'].sort();
const actual = [];
async function walk(dir, prefix = '') {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    assert.ok(!e.isSymbolicLink(), 'No symlinks');
    if (e.isDirectory()) await walk(path.join(dir, e.name), prefix + e.name + '/');
    else actual.push(prefix + e.name);
  }
}
await walk(root); assert.deepEqual(actual.sort(), expected);
for (const file of expected.filter(f => !['README.md', 'manifest.json'].includes(f))) {
  assert.deepEqual(await readFile(path.join(root, file)), await readFile(path.join(plugin, file)), file);
}
const fixture = await mkdtemp(path.join(os.tmpdir(), 'mcpb-check-'));
const codexHome = path.join(fixture, '.codex');
const env = { ...process.env, USERPROFILE: fixture, HOME: fixture, CODEX_HOME: codexHome,
  CODEX_SKILL_MANAGER_DATA_DIR: path.join(fixture, 'data') };
const rounds = [];
try {
  for (let round = 0; round < 2; round++) {
    const client = new Client({ name: 'mcpb-delivery-check', version: '1.0.0' });
    try {
      const args = manifest.server.mcp_config.args.map(a => a.replaceAll('${__dirname}', root));
      await client.connect(new StdioClientTransport({ command: process.execPath, args, cwd: fixture, env, stderr: 'pipe' }));
      assert.equal(client.getServerVersion().version, manifest.version);
      const tools = (await client.listTools()).tools;
      assert.equal(tools.length, 13);
      assert.deepEqual(tools.map(({ name, description }) => ({ name, description })), manifest.tools);
      if (round === 0) {
        // Smithery needs full MCP input schemas, unlike the minimal MCPB tool declarations.
        const serverCard = { serverInfo: client.getServerVersion(), tools: tools.map(t => ({
          name: t.name, description: t.description, inputSchema: t.inputSchema,
          ...(t.annotations ? { annotations: t.annotations } : {}),
          ...(t.outputSchema ? { outputSchema: t.outputSchema } : {}),
        })) };
        await writeFile(path.join(path.dirname(path.resolve(reportArg)), 'server-card.json'), JSON.stringify(serverCard, null, 2) + '\n');
      }
      const uri = tools.find(t => t.name === 'open_skill_manager')._meta.ui.resourceUri;
      const page = (await client.readResource({ uri })).contents[0].text;
      assert.ok(page.includes('版本 / Version v' + manifest.version + '</span>'));
      const result = await client.callTool({ name: 'check_recording_status', arguments: {} });
      assert.ok(!result.isError);
      const status = result.structuredContent;
      assert.equal(status.adoptions.count, 0); assert.equal(status.pluginCalls.count, 0);
      assert.equal(status.automaticMonitoring, false);
      rounds.push({ restart: round === 1, version: manifest.version, toolCount: tools.length,
        dashboardResource: uri, diagnostics: 'passed', automaticMonitoring: false, recordedEvents: 0 });
    } finally { await client.close(); }
  }
  const report = { version: manifest.version, files: actual, sourceFilesByteIdentical: true,
    runtimeSha256: createHash('sha256').update(await readFile(path.join(root, 'server/src/server.mjs'))).digest('hex'),
    rounds, isolation: 'Temporary home, Codex directory and data directory; no personal logs used',
    nativeMcpbClientInstallation: 'not verified', nativeDashboardRendering: 'not verified' };
  await writeFile(path.resolve(reportArg), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await rm(fixture, { recursive: true, force: true }); }
