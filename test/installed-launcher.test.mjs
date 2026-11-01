import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {resolveInstalledRuntime} from '../scripts/launch-installed-plugin.mjs';

async function fixture(t){
  const root=await mkdtemp(path.join(os.tmpdir(),'installed-launcher-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const make=async version=>{
    const dir=path.join(root,'plugins/cache/created-by-me-remote/plugin-skill-manager',version);
    await mkdir(path.join(dir,'server/src'),{recursive:true});
    await writeFile(path.join(dir,'plugin.json'),JSON.stringify({name:'plugin-skill-manager',version}));
    await writeFile(path.join(dir,'server/src/server.mjs'),'// synthetic runtime\n');return dir;
  };
  let selected={id:'plugin-skill-manager@created-by-me-remote',localVersion:'1.0.0',installed:true,enabled:true};
  const query=async()=>({marketplaces:[{plugins:[selected]}]});
  return {make,selected,options:{env:{CODEX_HOME:root},query}};
}

test('stable launcher follows installed version changes and ignores a higher cached version',async t=>{
  const f=await fixture(t);await f.make('1.0.0');await f.make('1.1.0');await f.make('9.0.0');
  assert.equal((await resolveInstalledRuntime(f.options)).version,'1.0.0');
  f.selected.localVersion='1.1.0';
  const result=await resolveInstalledRuntime(f.options);assert.equal(result.version,'1.1.0');
  assert.ok(result.entry.endsWith(path.join('1.1.0','server/src/server.mjs')));
  f.selected.version='1.0.0';f.selected.localVersion=null;
  assert.equal((await resolveInstalledRuntime(f.options)).version,'1.0.0','installed-only endpoint returns version when localVersion is null');
});
test('stable launcher refuses disabled, missing and ambiguous installed state',async t=>{
  const f=await fixture(t);await f.make('1.0.0');
  f.selected.enabled=false;await assert.rejects(resolveInstalledRuntime(f.options),/enabled account installation/);
  f.selected.enabled=true;f.selected.installed=false;await assert.rejects(resolveInstalledRuntime(f.options),/enabled account installation/);
  await assert.rejects(resolveInstalledRuntime({...f.options,query:async()=>({marketplaces:[{plugins:[{...f.selected,installed:true},{...f.selected,installed:true}]}]})}),/one enabled/);
  await assert.rejects(resolveInstalledRuntime({...f.options,query:async()=>({marketplaces:[],marketplaceLoadErrors:['unavailable']})}),/incomplete/);
});
test('stable launcher rejects registry/manifest mismatch and unsafe version paths',async t=>{
  const f=await fixture(t),dir=await f.make('1.0.0');
  await writeFile(path.join(dir,'plugin.json'),JSON.stringify({name:'plugin-skill-manager',version:'0.9.0'}));
  await assert.rejects(resolveInstalledRuntime(f.options),/does not match/);
  f.selected.localVersion='../1.0.0';await assert.rejects(resolveInstalledRuntime(f.options),/version is invalid/);
});
