import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { treeSnapshot } from './archive.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
// A bounded, read-only comparison. No execution, external fetches or dependency inference.
export async function redundancyReport(inventory, { adoptions = null, calls = null, days = 90, now = Date.now(), snapshot = treeSnapshot } = {}) {
  const skills = inventory.skills || [], byId = new Map(skills.map(s => [s.id, s]));
  const groups = [], parents = new Map(), edges = [];
  const find = id => { if (!parents.has(id)) parents.set(id, id); const p = parents.get(id); if (p !== id) parents.set(id, find(p)); return parents.get(id); };
  const link = (ids, type, evidence = {}) => { ids = ids.filter(id => byId.has(id)); if (ids.length < 2) return; const root = find(ids[0]); for (const id of ids) parents.set(find(id), root); edges.push({ids, type, ...evidence}); };
  for (const g of inventory.comparisons?.identicalDocuments || []) link(g.ids, 'documents');
  for (const g of inventory.comparisons?.nameConflicts || []) link(g.ids, 'names');
  for (const g of inventory.comparisons?.descriptionOverlap?.pairs || []) link(g.ids, 'overlap', {sharedTerms:g.sharedTerms, ratio:g.ratio});
  const components = new Map();
  for (const id of parents.keys()) { const root = find(id); if (!components.has(root)) components.set(root, []); components.get(root).push(id); }
  const trees = new Map(); let scanned = 0;
  const since = new Date(now - days * 86400000).toISOString();
  function activity(summary, id, field) {
    if (!summary?.activity?.days) return { count: null, last: null };
    let count = 0, last = null;
    for (const day of summary.activity.days) {
      if (day.date < since.slice(0, 10) || day.date > new Date(now).toISOString().slice(0, 10)) continue;
      for (const e of day.entries) if (e.id === id) { count += e[field] || 0; if (e[field] > 0) last = day.date; }
    }
    return {count, last};
  }
  async function member(skill) {
    if (!trees.has(skill.id)) {
      let tree = {complete:false, reason:'limit'};
      if (scanned++ < 40) {
        try {
          const result = await snapshot(path.dirname(skill.path), true);
          const raw = await readFile(skill.path);
          if (hash(raw) !== skill.fingerprint || result.entries.find(e => e.path === 'SKILL.md')?.hash !== hash(raw)) throw new Error('changed');
          const document = raw.toString('utf8');
          const tools = [...new Set(document.match(/mcp__[A-Za-z0-9_]+/g) || [])].slice(0, 20);
          const references = [...new Set([...document.matchAll(/\]\(([^\s)]+)\)/g)].map(m=>m[1]).filter(v=>!/^https?:|^#/i.test(v)))].slice(0,20);
          tree = {...result, complete:true, tools, references, document};
        } catch { tree = {complete:false, reason:'unreadable'}; }
      }
      trees.set(skill.id, tree);
    }
    const tree = trees.get(skill.id);
    return {id:skill.id, name:skill.name, source:skill.source, path:skill.path, owner:skill.owner, pluginStatus:skill.pluginStatus, fingerprint:skill.fingerprint, annotation:skill.annotation,
      tree:{complete:tree.complete, fingerprint:tree.fingerprint, files:tree.files, bytes:tree.bytes, reason:tree.reason}, dependencyHints:tree.tools || [], references:tree.references || [], activity:activity(adoptions, skill.id, 'adoptions')};
  }
  for (const ids of [...components.values()].slice(0, 50)) {
    ids.sort(); const members = [];
    for (const id of ids.slice(0, 20)) members.push(await member(byId.get(id)));
    const complete = ids.length === members.length && members.every(m => m.tree.complete);
    const directoryEqual = complete && new Set(members.map(m => m.tree.fingerprint)).size === 1;
    const files = new Map();
    for (const m of members) for (const e of trees.get(m.id)?.entries || []) {
      if (!files.has(e.path)) files.set(e.path, new Map()); files.get(e.path).set(m.id, e.hash || 'directory');
    }
    const differences = [...files].filter(([, values]) => values.size !== members.length || new Set(values.values()).size > 1)
      .map(([file, values]) => ({path:file, instances:members.map(m => ({id:m.id, state:!m.tree.complete ? 'unknown' : values.has(m.id) ? 'present' : 'missing', hash:values.get(m.id)}))}));
    const relations = edges.filter(e => e.ids.some(id => ids.includes(id)));
    const types = [...new Set(relations.map(e => e.type))];
    const documents = members.map(m => trees.get(m.id)?.document?.split(/\r?\n/));
    let commonPrefix=0;
    if(documents.every(Boolean)) while(commonPrefix<Math.min(...documents.map(d=>d.length))&&documents.every(d=>d[commonPrefix]===documents[0][commonPrefix]))commonPrefix++;
    const documentDifference = new Set(members.map(m=>m.fingerprint)).size>1 ? members.map((m,i)=>({id:m.id,line:commonPrefix+1,excerpt:documents[i]?.slice(commonPrefix,commonPrefix+25).join('\n').slice(0,4000) ?? null})) : [];
    groups.push({id:hash(ids.join('|') + members.map(m => m.tree.fingerprint || m.fingerprint).join('|')), types, members, totalMembers:ids.length,
      complete, directoryEqual, differences:differences.slice(0, 100), differenceCount:differences.length, documentDifference, relations:relations.slice(0,50),
      retained:members.filter(m => m.annotation?.retain).map(m => m.id), recommendation:directoryEqual ? 'review-context' : 'keep-until-reviewed'});
  }
  const plugins = new Map();
  function plugin(id, version) { const key = `${id}:${version}`; if (!plugins.has(key)) plugins.set(key,{id:key,pluginId:id,version,name:id.split('@')[0],installed:false,installRecords:0,enabled:null,skills:[]}); return plugins.get(key); }
  for (const r of inventory.pluginRegistry?.plugins || []) { const p = plugin(r.id,r.version); p.enabled=p.installRecords && p.enabled!==r.enabled ? null : r.enabled; p.installed=true; p.installRecords++; }
  for (const s of skills) if (s.owner) plugin(`${s.owner.directory || s.owner.name}@${s.owner.marketplace}`,s.owner.version).skills.push({id:s.id,name:s.name,fingerprint:s.fingerprint});
  const families = new Map();
  for (const p of plugins.values()) { if (!families.has(p.name)) families.set(p.name,[]); families.get(p.name).push(p); }
  const pluginCandidates = [...families.values()].filter(g => g.length > 1 || g.some(m=>m.installRecords>1));
  const pluginGroups = pluginCandidates.slice(0,50).map(members => ({id:hash(JSON.stringify(members)),types:['versions'],members,
    sharedSkills:[...new Set(members.flatMap(m => m.skills.map(s => s.name)))].map(name => ({name,instances:members.filter(m => m.skills.some(s => s.name === name)).length})),
    capabilitiesComplete:false,recommendation:'review-context'}));
  return {version:1,checkedAt:new Date(now).toISOString(),days,since,skills:groups,plugins:pluginGroups,
    coverage:{qualified:false,reason:'continuous-coverage-unavailable',skillRecordsAvailable:Boolean(adoptions),pluginRecordsAvailable:Boolean(calls)},
    limits:{skillGroups:components.size,shownSkillGroups:groups.length,directoriesScanned:Math.min(scanned,40),maxDirectories:40,maxMembers:20,maxDifferences:100,
      pluginGroups:pluginCandidates.length,overlap:inventory.comparisons?.descriptionOverlap},
  };
}
