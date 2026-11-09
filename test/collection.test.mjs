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
  const ledger={catalog:[{id:'known'}],activity:{days:[]}, coverage:{complete:false}};
  assert.match(adoptionEvidence(['missing'],ledger,zh).label,/本账本未记录/);
  assert.match(adoptionEvidence(['known'],ledger,zh).label,/所选时段无采用记录/);
  assert.equal(adoptionEvidence(['known'],null,zh).count,null);
});
