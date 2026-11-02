import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {scanInventory} from '../src/inventory.mjs';
import {redundancyReport} from '../src/redundancy.mjs';

async function fixture(t, count=2) {
  const root=await mkdtemp(path.join(os.tmpdir(),'redundancy-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const roots={skills:path.join(root,'skills'),cache:path.join(root,'cache')};
  const dirs=[];
  for(let i=0;i<count;i++){
    const dir=path.join(roots.skills,String(i));dirs.push(dir);
    await mkdir(path.join(dir,'scripts'),{recursive:true});
    await writeFile(path.join(dir,'SKILL.md'),'---\nname: same\ndescription: shared comparison skill\n---\nUse mcp__sample__read and [guide](references/guide.md).\n');
    await writeFile(path.join(dir,'scripts/run.mjs'),'throw new Error("Must never execute");');
  }
  return {roots,dirs,inventory:await scanInventory(roots)};
}

test('identical documents with different scripts remain a review candidate, with exact file evidence',async t=>{
  const f=await fixture(t);
  await writeFile(path.join(f.dirs[1],'scripts/run.mjs'),'different script');
  const report=await redundancyReport(f.inventory);
  assert.equal(report.skills.length,1);
  const g=report.skills[0];assert.equal(g.complete,true);assert.equal(g.directoryEqual,false);
  assert.deepEqual(g.types,['documents']);assert.equal(g.differenceCount,1);
  assert.equal(g.differences[0].path,'scripts/run.mjs');
  assert.notEqual(g.differences[0].instances[0].hash,g.differences[0].instances[1].hash);
  assert.deepEqual(g.members[0].dependencyHints,['mcp__sample__read']);
  assert.deepEqual(g.members[0].references,['references/guide.md']);
  assert.equal(report.coverage.qualified,false);
});

test('directory equality preserves contextual uncertainty and retained marks',async t=>{
  const f=await fixture(t);f.inventory.skills[0].annotation={retain:true};
  const report=await redundancyReport(f.inventory);const g=report.skills[0];
  assert.equal(g.directoryEqual,true);assert.equal(g.recommendation,'review-context');
  assert.deepEqual(g.retained,[f.inventory.skills[0].id]);assert.deepEqual(g.differences,[]);
});

test('unreadable or changed directories are unknown rather than missing or equal',async t=>{
  const f=await fixture(t);
  await rm(f.dirs[1],{recursive:true,force:true});
  let g=(await redundancyReport(f.inventory)).skills[0];
  assert.equal(g.complete,false);assert.equal(g.directoryEqual,false);
  assert.ok(g.differences.every(d=>d.instances.find(v=>v.id===f.inventory.skills[1].id).state==='unknown'));
  await writeFile(path.join(f.dirs[0],'SKILL.md'),'changed since inventory');
  g=(await redundancyReport(f.inventory)).skills[0];
  assert.ok(g.members.every(m=>!m.tree.complete));
});

test('same-name and identical-document components are deduplicated and document excerpts remain plain text',async t=>{
  const f=await fixture(t,3);
  await writeFile(path.join(f.dirs[2],'SKILL.md'),'---\nname: same\ndescription: shared comparison skill\n---\n<script>untrusted content</script>\n');
  const report=await redundancyReport(await scanInventory(f.roots));
  assert.equal(report.skills.length,1);const g=report.skills[0];
  assert.deepEqual(g.types.sort(),['documents','names']);assert.equal(g.members.length,3);
  assert.ok(g.documentDifference.some(d=>d.excerpt.includes('<script>')));
});

test('plugin candidates compare source/version independently of shared Skill documents',async t=>{
  const f=await fixture(t);
  f.inventory.skills.forEach((s,i)=>{s.source='插件缓存技能';s.owner={directory:i?'second':'first',name:i?'second':'first',marketplace:'market',version:'1'};s.pluginStatus={installedVersions:['2']};});
  let report=await redundancyReport(f.inventory);assert.equal(report.plugins.length,0);
  f.inventory.pluginRegistry={plugins:[{id:'first@market',version:'2',enabled:true},{id:'first@market',version:'2',enabled:false}]};
  report=await redundancyReport(f.inventory);
  assert.equal(report.plugins.length,1);const g=report.plugins[0];
  assert.equal(g.capabilitiesComplete,false);assert.equal(g.members.length,2);
  assert.equal(g.members.find(m=>m.version==='1').installed,false);
  assert.equal(g.members.find(m=>m.version==='2').enabled,null);
  assert.equal(g.members.find(m=>m.version==='2').installRecords,2);
});

test('official/system sources and uninstalled caches never enter reports or directory comparisons',async t=>{
  const f=await fixture(t,8);
  const [user,agents,system,officialMarket,officialName,officialSkill,cache,unknown]=f.inventory.skills;
  agents.source='用户 .agents 技能';system.source='系统技能';
  for (const s of [officialMarket,officialName,cache]) s.source='插件缓存技能';
  officialMarket.owner={directory:'openai-templates',marketplace:'openai-curated-remote',version:'1'};
  officialName.owner={directory:'OpenAI-demo',marketplace:'custom',version:'1'};
  officialSkill.name='openai-local-copy';cache.owner={directory:'cache-only',marketplace:'custom',version:'1'};
  unknown.source='未知';
  f.inventory.pluginRegistry={plugins:[
    {id:'openai-templates@openai-curated-remote',version:'1'},{id:'openai-templates@openai-curated-remote',version:'2'},
    {id:'OpenAI-demo@custom',version:'1'},{id:'OpenAI-demo@custom',version:'2'}]};
  const report=await redundancyReport(f.inventory);
  assert.deepEqual(new Set(report.skills[0].members.map(m=>m.id)),new Set([user.id,agents.id]));
  assert.equal(report.scope.excludedSkills,6);assert.equal(report.limits.directoriesScanned,2);
  assert.equal(report.plugins.length,0);
  assert.equal(report.limits.overlap.eligibleInstances,2);
});

test('Skills within one installed plugin package do not create candidates, while other versions remain comparable',async t=>{
  const f=await fixture(t,3);
  f.inventory.skills.forEach(s=>{s.source='插件缓存技能';s.owner={name:'custom',directory:'custom',marketplace:'personal',version:'1'};});
  f.inventory.pluginRegistry={plugins:[{id:'custom@personal',version:'1',enabled:true}]};
  let report=await redundancyReport(f.inventory);
  assert.equal(report.skills.length,0);assert.equal(report.plugins.length,0);assert.equal(report.limits.directoriesScanned,0);
  // Distinct descriptions in the same package must also be excluded before the overlap pair limit.
  f.inventory.skills.forEach((s,i)=>{s.name=`template-${i}`;s.fingerprint=String(i);s.description='create template retained reference spreadsheet reporting dashboard';});
  report=await redundancyReport(f.inventory);assert.equal(report.skills.length,0);assert.equal(report.limits.overlap.totalPairs,0);
  f.inventory.skills[2].owner.version='2';
  report=await redundancyReport(f.inventory);
  assert.equal(report.skills.length,1);assert.equal(report.plugins.length,1);
  assert.ok(report.skills[0].relations.every(r=>r.ids.includes(f.inventory.skills[2].id)));
});

test('activity is instance-scoped and neither record spans nor complete flags prove continuous coverage',async t=>{
  const f=await fixture(t), now=Date.parse('2026-10-30T12:00:00Z');
  const adoptions={coverage:{complete:true,from:'2020-01-01',to:'2026-10-30'},activity:{days:[{date:'2026-10-29',entries:[{id:f.inventory.skills[0].id,adoptions:3}]},{date:'2020-01-01',entries:[{id:f.inventory.skills[0].id,adoptions:100}]}]}};
  const report=await redundancyReport(f.inventory,{adoptions,now,days:30});
  assert.equal(report.skills[0].members.find(m=>m.id===f.inventory.skills[0].id).activity.count,3);assert.equal(report.skills[0].members.find(m=>m.id===f.inventory.skills[1].id).activity.count,0);
  assert.equal(report.coverage.qualified,false);
  const later=await redundancyReport(f.inventory,{now,days:30});assert.equal(later.skills[0].members[0].activity.count,null);
});

test('large groups expose truncation instead of asserting complete equality',async t=>{
  const f=await fixture(t,21);const report=await redundancyReport(f.inventory);
  assert.equal(report.skills[0].totalMembers,21);assert.equal(report.skills[0].members.length,20);
  assert.equal(report.skills[0].complete,false);assert.equal(report.skills[0].directoryEqual,false);
});
