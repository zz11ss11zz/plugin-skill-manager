import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePluginList, parseInstalledPlugins, applyPluginStatus, localPluginIcon } from '../src/plugins.mjs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('installed metadata preserves human names and allows only official HTTPS image URLs', () => {
  const make = icon => ({ marketplaces: [{ plugins: [{ id:'app-123@curated', installed:true, version:'1', name:'app-123', interface:{displayName:'Readable App',logoUrl:icon} }] }] });
  const [p] = parseInstalledPlugins(make('https://files.openai.com/logo.png'));
  assert.equal(p.displayName,'Readable App'); assert.equal(p.icon,'https://files.openai.com/logo.png');
  const listing=make('https://files.openai.com/listing.png'); listing.marketplaces[0].plugins[0].interface.composerIconUrl='https://files.openai.com/composer.png'; listing.marketplaces[0].plugins[0].interface.logoUrlDark='https://files.openai.com/dark.png';
  assert.equal(parseInstalledPlugins(listing)[0].icon,'https://files.openai.com/listing.png');
  assert.equal(parseInstalledPlugins(listing)[0].iconDark,'https://files.openai.com/dark.png');
  for (const icon of ['javascript:alert(1)','file:///private.png','https://evil.example/icon.png']) assert.equal(parseInstalledPlugins(make(icon))[0].icon,undefined);
});

test('local icons stay within the plugin source and missing or oversized images are optional', async () => {
  const tmp=await mkdtemp(path.join(os.tmpdir(),'plugin-icons-'));
  try {
    const root=path.join(tmp,'plugin'); await mkdir(root); await writeFile(path.join(root,'icon.png'),Buffer.from([137,80,78,71]));
    const plugin={source:{type:'local',path:root},interface:{composerIcon:'icon.png'}};
    assert.match(await localPluginIcon(plugin),/^data:image\/png;base64,/);
    await writeFile(path.join(tmp,'outside.png'),'outside'); plugin.interface.composerIcon='../outside.png'; assert.equal(await localPluginIcon(plugin),undefined);
    plugin.interface.composerIcon='missing.png'; assert.equal(await localPluginIcon(plugin),undefined);
    await writeFile(path.join(root,'medium.png'),Buffer.alloc(923463)); plugin.interface.composerIcon='medium.png'; assert.match(await localPluginIcon(plugin),/^data:image\/png;base64,/);
    await writeFile(path.join(root,'big.png'),Buffer.alloc(2*1024*1024+1)); plugin.interface.composerIcon='big.png'; assert.equal(await localPluginIcon(plugin),undefined);
  } finally { await rm(tmp,{recursive:true,force:true}); }
});

test('installed endpoint includes remote installs, prefers local versions and rejects incomplete discovery', () => {
  const data = { marketplaces: [{ plugins: [
    { id: 'local@bundled', installed: true, enabled: false, localVersion: '1', version: '2' },
    { id: 'remote@curated', installed: true, enabled: true, localVersion: null, version: '3' },
    { id: 'suggestion@curated', installed: false, version: '9' },
  ] }], marketplaceLoadErrors: [] };
  assert.deepEqual(parseInstalledPlugins(data), [
    { id: 'local@bundled', version: '1', enabled: false },
    { id: 'remote@curated', version: '3', enabled: true },
  ]);
  assert.throws(() => parseInstalledPlugins({ ...data, marketplaceLoadErrors: [{}] }));
  assert.throws(() => parseInstalledPlugins({ marketplaces: [{}] }));
});

test('plugin list retains only required fields and rejects partial or malformed records', () => {
  const mark = id => parsePluginList(JSON.stringify({installed:[{pluginId:id,version:'1',installed:true}]}))[0].icon;
  assert.match(mark('codex-app-tools@openai-bundled'),/^data:image\/svg\+xml;base64,/);
  assert.equal(mark('codex-app-tools@other-market'),undefined);
  assert.deepEqual(parsePluginList(JSON.stringify({ installed: [{ pluginId: 'demo@market', version: '2', installed: true, enabled: false, source: { path: 'private' } }] })), [{ id: 'demo@market', version: '2', enabled: false }]);
  assert.throws(() => parsePluginList('{}'));
  assert.throws(() => parsePluginList('{'));
  assert.throws(() => parsePluginList('{"installed":[{"pluginId":"demo","installed":true}]}'));
});

test('join uses marketplace, directory identity and version; absence is not uninstall evidence', () => {
  const make = (version, marketplace = 'market') => ({ owner: { name: 'Display Name', directory: 'demo', marketplace, version }, state: 'candidate' });
  const inventory = { skills: [make('2'), make('1'), make('2', 'other'), { state: 'local' }] };
  const status = { checkedAt: '2026-01-01T00:00:00Z', evidence: 'synthetic', plugins: [{ id: 'demo@market', version: '2', enabled: false }] };
  const result = applyPluginStatus(inventory, status);
  assert.match(result.skills[0].state, /插件已停用/);
  assert.match(result.skills[1].state, /其他版本/);
  assert.match(result.skills[2].state, /未匹配/);
  assert.equal(result.skills[3].state, 'local');
  assert.equal(inventory.skills[0].state, 'candidate');
  assert.match(applyPluginStatus(inventory, { ...status, plugins: [] }).skills[0].state, /未匹配/);
});
