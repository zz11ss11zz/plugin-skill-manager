import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {scanInventory} from '../src/inventory.mjs';
import {redundancyReport} from '../src/redundancy.mjs';
import {Presence} from '../src/presence.mjs';
import {inactivityReport,monthCutoff} from '../src/inactivity.mjs';

test('same-installation components are not mutual candidates, but remain comparable to external installations',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'components-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const root=path.join(dir,'skills'),suite=path.join(root,'suite');
  const doc='---\nname: review\ndescription: manuscript review evidence audit\n---\nreview instructions';
  for(const rel of ['SKILL.md','ars/review/WORKFLOW.md','skills/review-copy/SKILL.md','tests/fixture/SKILL.md']){
    const file=path.join(suite,rel);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,rel==='SKILL.md'?'---\nname: suite\ndescription: routes all scholarly work\n---\nrouter':doc);
  }
  const outside=path.join(dir,'outside');await mkdir(outside);await writeFile(path.join(outside,'SKILL.md'),doc);
  await symlink(outside,path.join(suite,'linked'),process.platform==='win32'?'junction':'dir');
  const inventory=await scanInventory({skills:root,cache:path.join(dir,'cache')});assert.equal(inventory.skills.length,1);
  let r=await redundancyReport(inventory);assert.equal(r.scope.components,2);assert.equal(r.skills.length,0);
  await mkdir(path.join(root,'external'));await writeFile(path.join(root,'external','SKILL.md'),doc);
  r=await redundancyReport(await scanInventory({skills:root,cache:path.join(dir,'cache')}));
  assert.equal(r.skills.length,1);assert.ok(r.skills[0].types.includes('documents'));
  const group=r.skills[0],byId=new Map(group.members.map(m=>[m.id,m]));
  assert.ok(group.relations.every(rel=>rel.ids.some(id=>!byId.get(id).parentSkillId)));
  assert.equal(group.members.filter(m=>m.parentSkillId).length,2);
});

test('curated third-party apps remain eligible while known official components stay protected',async()=>{
  const r=await redundancyReport({skills:[],pluginRegistry:{plugins:[
    {id:'app-calculator@openai-curated-remote',displayName:'2+2 Calculator',version:'1'},
    {id:'google-drive@openai-curated-remote',version:'1'},
    {id:'system-tool@openai-bundled',version:'1'}]}});
  assert.equal(r.scope.eligiblePlugins,1);assert.equal(r.inactivity.plugins[0].name,'2+2 Calculator');assert.equal(r.inactivity.plugins[0].state,'records-unavailable');
});

test('one calendar month is strict, clamps month ends, and does not invent age for zero records',()=>{
  const now=Date.parse('2026-11-02T12:00:00Z');assert.equal(monthCutoff(now),'2026-10-02T12:00:00.000Z');assert.equal(monthCutoff(Date.parse('2026-03-31T12:00:00Z')),'2026-02-28T12:00:00.000Z');
  const skill={id:'s',name:'sample',path:'/s/SKILL.md'};
  const summary={activity:{days:[]}};
  let r=inactivityReport([skill],[],{now,adoptions:summary});assert.equal(r.skills[0].state,'insufficient-history');
  r=inactivityReport([skill],[],{now,adoptions:summary,observations:{'skill:s':'2026-10-02T12:00:00Z'}});assert.equal(r.skills[0].state,'insufficient-history');
  r=inactivityReport([skill],[],{now,adoptions:summary,observations:{'skill:s':'2026-10-01T12:00:00Z'}});assert.equal(r.skills[0].state,'inactive');assert.equal(r.skills[0].coverageComplete,false);
  r=inactivityReport([skill],[],{now,adoptions:{activity:{days:[{date:'2026-10-02',entries:[{id:'s',adoptions:1}]}]}}});assert.equal(r.skills[0].state,'recent');
});

test('manual or automatic recent calls prevent inactivity and ambiguous aliases do not invent attribution',()=>{
  const now=Date.parse('2026-11-02T12:00:00Z'),plugin={id:'app-calc@openai-curated-remote',displayName:'2+2 Calculator'};
  const source={catalog:[{id:'2_2_calculator'}],activity:{days:[{date:'2026-10-01',entries:[{id:'2_2_calculator',calls:1}]}]}};
  let calls={sources:{'host-event':source,'assistant-report':{...source,activity:{days:[{date:'2026-11-01',entries:[{id:'2_2_calculator',calls:1}]}]}}}};
  let r=inactivityReport([],[plugin],{now,calls});assert.equal(r.plugins[0].state,'recent');assert.equal(r.plugins[0].lastRecorded,'2026-11-01');
  r=inactivityReport([],[plugin],{now,calls:source});assert.equal(r.plugins[0].state,'inactive');
  r=inactivityReport([],[plugin,{...plugin,id:'other'}],{now,calls:source});assert.ok(r.plugins.every(p=>p.state==='insufficient-history'&&p.lastRecorded===null));
});

test('first observation persists without replacing it with an earlier guessed installation date',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'presence-'));t.after(()=>rm(dir,{recursive:true,force:true}));const p=new Presence(path.join(dir,'presence.json'));
  const first=Date.parse('2026-10-01T00:00:00Z'),later=Date.parse('2026-11-02T00:00:00Z');
  assert.equal((await p.observe(['plugin:calc'],first))['plugin:calc'],new Date(first).toISOString());
  assert.equal((await p.observe(['plugin:calc'],later))['plugin:calc'],new Date(first).toISOString());
  await writeFile(p.file,'broken');await assert.rejects(p.observe(['plugin:calc'],later));
});
