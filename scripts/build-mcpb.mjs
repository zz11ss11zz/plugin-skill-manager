// Stage an MCPB from a separately verified, prebuilt plugin. No personal state is copied.
import { readFile, writeFile, mkdir, copyFile, lstat, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const source = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw Error('Usage: node scripts/build-mcpb.mjs <built-plugin-directory> <new-output-directory>');
const input = path.resolve(inputArg), output = path.resolve(outputArg);
const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
const plugin = JSON.parse(await readFile(path.join(input, 'plugin.json'), 'utf8'));
assert.equal(plugin.name, pkg.name, 'Input identity differs');
assert.equal(plugin.version, pkg.version, 'Input version differs');
const files = ['server/src/server.mjs', 'server/src/assets/orbit-color.png',
  'server/src/assets/sidebar-wrench.png', 'assets/icon.png', 'LICENSE', 'NOTICE',
  'THIRD_PARTY_NOTICES.md', 'skills/setup/SKILL.md', 'skills/skill-manager/SKILL.md'];
for (const file of files) {
  let current = input;
  for (const part of file.split('/')) {
    current = path.join(current, part);
    assert.ok(!(await lstat(current)).isSymbolicLink(), `Symlink rejected: ${file}`);
  }
  assert.ok((await lstat(current)).isFile(), `Not a file: ${file}`);
}
await mkdir(output); // Never overwrite an existing bundle or mix in old files.
for (const file of files) {
  await mkdir(path.dirname(path.join(output, file)), { recursive: true });
  await copyFile(path.join(input, file), path.join(output, file));
}
await copyFile(path.join(source, 'docs/distribution/MCPB.md'), path.join(output, 'README.md'));
const fixture = await mkdtemp(path.join(os.tmpdir(), 'mcpb-manifest-'));
const client = new Client({ name: 'mcpb-manifest-builder', version: '1.0.0' });
try {
  await client.connect(new StdioClientTransport({ command: process.execPath,
    args: [path.join(output, 'server/src/server.mjs')], stderr: 'pipe',
    env: { ...process.env, USERPROFILE: fixture, HOME: fixture, CODEX_HOME: path.join(fixture, '.codex'),
      CODEX_SKILL_MANAGER_DATA_DIR: path.join(fixture, 'data') } }));
  assert.equal(client.getServerVersion().version, pkg.version);
  const tools = (await client.listTools()).tools.map(({ name, description }) => ({ name, description }));
  const manifest = {
    manifest_version: '0.3', name: pkg.name, display_name: 'Plugin & Skill Manager', version: pkg.version,
    description: 'Inspect local Codex plugins, Skills and recorded usage.',
    long_description: 'Local Codex inventory and activity management. Requires the Codex CLI and local Codex data on Windows. Skill adoptions and plugin call attempts are separate; missing records do not mean never used. Notes and eligible user-Skill archives remain user-directed. The dashboard requires MCP Apps support. Other hosts and platforms are not verified. Bundled Skills are reference instructions; MCPB installation does not automatically register them.',
    author: plugin.author, license: plugin.license,
    repository: { type: 'git', url: plugin.repository + '.git' }, homepage: plugin.repository,
    documentation: plugin.repository + '/blob/main/docs/DISTRIBUTION.md',
    support: plugin.repository + '/issues', icon: 'assets/icon.png',
    server: { type: 'node', entry_point: 'server/src/server.mjs', mcp_config: {
      command: 'node', args: ['${__dirname}/server/src/server.mjs'],
      env: { CODEX_HOME: '${user_config.codex_home}' } } },
    compatibility: { platforms: ['win32'], runtimes: { node: '>=20.18.0' } },
    user_config: { codex_home: { type: 'directory', title: 'Local Codex directory',
      description: 'Existing Codex configuration and records directory. Not the MCPB extraction folder. Reads local inventory; management actions can write notes and move eligible Skills after a preview.',
      required: true, default: '${HOME}/.codex' } },
    tools, keywords: ['codex', 'skills', 'plugin-management', 'local-first', 'usage-tracking'],
  };
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ output, version: pkg.version, tools: tools.length,
    runtimeSha256: createHash('sha256').update(await readFile(path.join(output, 'server/src/server.mjs'))).digest('hex') }));
} finally { await client.close(); await rm(fixture, { recursive: true, force: true }); }
