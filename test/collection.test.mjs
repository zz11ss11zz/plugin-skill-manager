import test from 'node:test';
import assert from 'node:assert/strict';
import { readCollection, adoptionEvidence, renderCollection } from '../src/frontend/views/collection.mjs';

const zh = (a, b) => a;
const node = (tag, content) => ({tag, content, children: [], append(...items) { this.children.push(...items); }});
const file = (path, raw = 'dataviz') => ({webkitRelativePath: 'repo/' + path, size: raw.length, text: async () => raw});

test('collection folds matching public copies, retains other paths and counts one adoption once', async () => {
  const snapshot = await readCollection([
    file('skills/dataviz/SKILL.md'), file('plugins/motion/plugin.json', '{}'),
    file('plugins/motion/skills/dataviz/SKILL.md'), file('plugins/motion/skills/motion/SKILL.md','motion'),
    file('archive/dataviz/SKILL.md'), file('.claude/skills/release/SKILL.md'),
  ]);
  assert.equal(snapshot.total, 5);
  assert.equal(snapshot.groups.length, 2);
  assert.equal(snapshot.groups[0].paths.length, 2);
  assert.equal(snapshot.other.length, 2);
  const data = {skills: [{id:'A', entryFingerprint:snapshot.groups[0].fingerprint}],
    adoptions:{catalog:[{id:'A'}],activity:{days:[{date:'2026-11-09', entries:[{id:'A', adoptions:1}]}]}}};
  const panel = renderCollection(snapshot, data, node, zh);
  assert.match(panel.children[1].children[0].content,/已记录采用：1/);
  assert.ok(panel.children.some(item=>item.content==='可归属实例已记录采用合计：1'));
});

test('ledger evidence distinguishes missing entry, outside period and unavailable', () => {
  const ledger={catalog:[{id:'known'}],activity:{days:[]}, period:{from:'2026-11-01',to:null}, coverage:{complete:false}};
  assert.equal(adoptionEvidence(['missing'],ledger,zh).label,'本账本未记录');
  assert.equal(adoptionEvidence(['known'],ledger,zh).label,'所选时段无采用记录');
  assert.equal(adoptionEvidence(['known'],{...ledger,period:{from:null,to:null}},zh).label,'暂无采用记录');
  assert.equal(adoptionEvidence(['known'],null,zh).count,null);
});

// The backend always reports partial coverage; the note must not be repeated on every row.
test('rows carry no per-row coverage suffix; the panel states partial coverage once', async () => {
  const snapshot = await readCollection([file('skills/a/SKILL.md','a'), file('skills/b/SKILL.md','b')]);
  const adoptions = {catalog:[{id:'A'},{id:'B'}], period:{from:null,to:null}, coverage:{complete:false},
    activity:{days:[{date:'2026-11-08', entries:[{id:'A', adoptions:2},{id:'B', adoptions:1}]},{date:'2026-11-09', entries:[{id:'A', adoptions:1}]}]}};
  const data = {skills: snapshot.groups.map((g, i) => ({id: 'AB'[i], entryFingerprint: g.fingerprint})), adoptions};
  const panel = renderCollection(snapshot, data, node, zh);
  const summaries = panel.children.filter(c => c.tag === 'details').map(d => d.children[0].content);
  assert.ok(summaries.every(label => !label.includes('覆盖不完整')));
  assert.ok(summaries.includes('a · 已记录采用：3 · 最近 2026-11-09'));
  assert.equal(panel.children.filter(c => /覆盖可能不完整/.test(c.content || '')).length, 1);
  // Duplicate ids are counted once (A: 3, B: 1).
  assert.equal(adoptionEvidence(['A','B','A'], adoptions, zh).count, 4);
});

// An oversized public entry is skipped by size alone; its content is never read.
test('an oversized entry is listed separately without failing the scan', async () => {
  const big = {webkitRelativePath: 'repo/skills/big/SKILL.md', size: 1024 * 1024 + 1, text: async () => { throw new Error('should not read'); }};
  const snapshot = await readCollection([file('skills/dataviz/SKILL.md'), big]);
  assert.equal(snapshot.total, 2);
  assert.equal(snapshot.groups.length, 1);
  assert.deepEqual(snapshot.oversized, ['skills/big/SKILL.md']);
  const panel = renderCollection(snapshot, {}, node, zh);
  assert.ok(panel.children.some(c => c.tag === 'details' && c.children[0].content === '超过 1 MiB 未读取：1'));
});
