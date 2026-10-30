import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, mkdir, appendFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { scanInventory } from '../src/inventory.mjs';

test('standalone package builds and serves MCP resources outside the source tree', { timeout: 30000 }, async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'skill-plugin-'));
  const root = path.join(temporary, 'plugin with spaces');
  const codexHome = path.join(temporary, 'codex');
  await mkdir(path.join(codexHome, 'sessions'), {recursive:true});
  await mkdir(path.join(codexHome, 'archived_sessions'));
  const persistentData = path.join(temporary, 'persistent data');
  const diagnosticEnv = { CODEX_HOME: codexHome, CODEX_SKILL_MANAGER_DATA_DIR: persistentData, USERPROFILE: temporary, HOME: temporary, CODEX_SKILL_MANAGER_CLI: path.join(temporary, 'missing-cli') };
  const source = fileURLToPath(new URL('..', import.meta.url));
  const client = new Client({ name: 'package-test', version: '1' });
  let transport;
  try {
    execFileSync(process.execPath, ['scripts/build-plugin.mjs', root], { cwd: source });
    const pkg = JSON.parse(await readFile(path.join(source, 'package.json')));
    const manifest = JSON.parse(await readFile(path.join(root, 'plugin.json')));
    assert.equal(manifest.version, pkg.version);
    assert.equal(manifest.name, pkg.name);
    assert.equal(manifest.author.name, manifest.extensions['com.openai'].interface.developerName);
    assert.equal(await readFile(path.join(root, 'LICENSE'), 'utf8'), await readFile(path.join(source, 'LICENSE'), 'utf8'));
    assert.deepEqual((await readdir(root)).sort(), ['.codex-plugin', 'DATA_MIGRATION.md', 'LICENSE', 'NOTICE', 'README.md', 'README.zh-CN.md', 'THIRD_PARTY_NOTICES.md', 'assets', 'mcp.json', 'plugin.json', 'server', 'skills']);
    const legacy = JSON.parse(await readFile(path.join(root, '.codex-plugin/plugin.json')));
    for (const key of ['name', 'version', 'description', 'author', 'license', 'repository']) assert.deepEqual(legacy[key], manifest[key]);
    assert.equal(manifest.description, pkg.description);
    assert.deepEqual(legacy.interface, manifest.extensions['com.openai'].interface);
    assert.deepEqual(legacy.extensions['com.openai'].publication, manifest.extensions['com.openai'].publication);
    assert.equal(manifest.extensions['com.openai'].publication.release_notes, (await readFile(path.join(source, `docs/releases/v${pkg.version}.md`), 'utf8')).trim());
    for (const [output, input] of [['README.md', 'PLUGIN_TESTING.md'], ['README.zh-CN.md', 'PLUGIN_TESTING.zh-CN.md']]) {
      assert.equal(await readFile(path.join(root, output), 'utf8'), await readFile(path.join(source, 'docs', input), 'utf8'));
    }
    const inventory = await scanInventory({ skills: path.join(root, 'skills'), agentSkills: path.join(temporary, 'absent-agent-skills'), cache: path.join(temporary, 'absent-cache') });
    assert.deepEqual(inventory.skills.map(s => s.name).sort(), ['setup', 'skill-manager']);
    assert.ok(await readFile(path.join(root, manifest.extensions['com.openai'].onboardingSkill)));
    const listing = manifest.extensions['com.openai'].interface;
    assert.ok(listing.displayName.length <= 30 && listing.shortDescription.length <= 30);
    assert.ok(listing.longDescription.length <= 4000);
    assert.ok(await readFile(path.join(root, listing.logo)));
    assert.ok((await readFile(path.join(root, manifest.extensions['com.openai'].interface.composerIcon))).length > 0);
    const mcp = JSON.parse(await readFile(path.join(root, 'mcp.json')));
    assert.equal(mcp.$schema, 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
    const config = mcp.mcpServers[pkg.name];
    const review = config.extensions['com.openai'].review;
    const cases = JSON.parse(await readFile(path.join(source, 'packaging/review-cases.json')));
    assert.equal(review.testCases.length, 5);
    assert.equal(review.negativeTestCases.length, 3);
    for (const [items, original] of [[review.testCases, cases.positive], [review.negativeTestCases, cases.negative]]) {
      items.forEach((item, index) => {
        assert.equal(item.userPrompt, original[index].prompt);
        assert.equal(item.expectedOutput, original[index].expected_behavior);
        assert.equal(item.toolsTriggered, original[index].tools_triggered);
      });
    }
    assert.equal(config.command, 'node');
    assert.equal(config.type, 'stdio');
    const substitute = value => value.replaceAll('${PLUGIN_ROOT}', root);
    let doctor;
    try { execFileSync(process.execPath, [...config.args.map(substitute), '--diagnose', '--json'], { cwd: substitute(config.cwd), env: { ...process.env, ...diagnosticEnv }, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (error) { assert.equal(error.status, 2); doctor = JSON.parse(error.stdout); }
    assert.equal(doctor.health.checks.find(c => c.id === 'dependencies').status, 'ok');
    assert.equal(doctor.adoptions.state, 'empty');
    await assert.rejects(readdir(persistentData), { code: 'ENOENT' });
    transport = new StdioClientTransport({ command: process.execPath, args: config.args.map(substitute), cwd: substitute(config.cwd), stderr: 'pipe', env: diagnosticEnv });
    await client.connect(transport);
    assert.equal(client.getServerVersion().version, pkg.version);
    const { tools } = await client.listTools();
    assert.equal(tools.length, 13);
    const uri = tools[0]._meta.ui.resourceUri;
    const { contents } = await client.readResource({ uri });
    assert.match(contents[0].text, /id="activity-panel"/);
    assert.ok(contents[0].text.includes(pkg.version));
    assert.ok(contents[0].text.includes(`版本 / Version v${pkg.version}</span>`));
    assert.equal(await readFile(path.join(source, 'dist/dashboard.html'), 'utf8'), contents[0].text);
    assert.ok(!(await readdir(path.join(root, 'server'))).includes('dist'));
    await assert.rejects(client.readResource({ uri: 'ui://plugin-skill-manager/dashboard-0000000000000000.html' }));
    const bundle = await readFile(path.join(root, 'server/src/server.mjs'), 'utf8');
    assert.ok(!bundle.includes(source));
    assert.match(await readFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8'), /@modelcontextprotocol\/sdk/);
    const call = { id: 'packaged_restart_call_001', plugin: 'demo', tool: 'mcp__codex_apps__demo_read' };
    assert.ok(!(await client.callTool({ name: 'record_plugin_calls', arguments: { calls: [call] } })).isError);
    const enabled = await client.callTool({name:'configure_auto_capture',arguments:{enabled:true,intervalSeconds:5}});
    assert.ok(!enabled.isError);
    const hostEvent = {type:'event_msg',timestamp:'2026-01-02T00:00:01Z',payload:{type:'item_completed',started_at_ms:Date.parse('2026-01-02T00:00:00Z'),item:{type:'McpToolCall',id:'packaged-auto-call-00001',server:'codex_apps',tool:'github.fetch_file',status:'failed',arguments:{secret:'DO_NOT_PERSIST'}}}};
    await appendFile(path.join(codexHome,'sessions','synthetic.jsonl'),JSON.stringify(hostEvent)+'\n');
    // No query/open tool is called while waiting: this verifies background polling.
    const deadline=Date.now()+13000;
    let captured;
    while(Date.now()<deadline){
      const saved=JSON.parse(await readFile(path.join(persistentData,'plugin-calls.json')));
      captured=saved.calls.find(c=>c.id==='packaged-auto-call-00001');
      if(captured) break;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.equal(captured?.at,'2026-01-02T00:00:00.000Z');
    assert.equal(captured?.source,'host-event');
    assert.doesNotMatch(await readFile(path.join(persistentData,'plugin-calls.json'),'utf8'),/DO_NOT_PERSIST/);
    await client.callTool({name:'configure_auto_capture',arguments:{enabled:false,intervalSeconds:60}});
    await client.close(); await transport.close();
    const restarted = new Client({ name: 'restart-test', version: '1' });
    transport = new StdioClientTransport({ command: process.execPath, args: config.args.map(substitute), cwd: substitute(config.cwd), stderr: 'pipe', env: diagnosticEnv });
    try {
      await restarted.connect(transport);
      assert.ok(!(await restarted.callTool({ name: 'record_plugin_calls', arguments: { calls: [call] } })).isError);
      const records = JSON.parse(await readFile(path.join(temporary, 'persistent data', 'plugin-calls.json')));
      assert.equal(records.calls.length, 2);
      assert.equal(records.calls[0].id, call.id);
      const state=(await restarted.callTool({name:'check_recording_status',arguments:{}})).structuredContent;
      assert.equal(state.automaticMonitoring,false);
      assert.equal(state.configuration.intervalSeconds,60);
      assert.ok(!(await readdir(path.join(root, 'server'))).includes('.local'));
    } finally { await restarted.close(); }
  } finally {
    await client.close();
    if (transport) await transport.close();
    await rm(temporary, { recursive: true, force: true });
  }
});
