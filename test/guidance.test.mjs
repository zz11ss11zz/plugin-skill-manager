import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuidance } from '../src/backend/domain/redundancy/guidance.mjs';
import { testConfig } from './helpers/config.mjs';

const config = testConfig();
const advise = createGuidance(config.redundancy.overlap.tasks, config.redundancy.guidance);
const member = name => ({ id: name, name });

test('shared task clues are named from the configured vocabulary labels', () => {
  const g = advise.forGroup({ members: [member('a'), member('b')], relations: [{ sharedTerms: ['reference-verification', 'citations'] }] });
  assert.deepEqual(g.tasks, [{ id: 'reference-verification', label: { zh: '引用核验', en: 'Reference verification' } }]);
  assert.equal(g.advice, null, 'unnamed Skills receive no specific advice');
});

test('named rules supply advice and, when no clue matched, the shared task', () => {
  const plotting = advise.forGroup({ members: [member('scientific-visualization'), member('matplotlib')], relations: [{ sharedTerms: ['plots'] }] });
  assert.deepEqual(plotting.tasks.map(t => t.id), ['scientific-figures']);
  assert.equal(plotting.advice.id, 'plotting-roles');
  assert.equal(plotting.advice.overridesSuite, true);
  assert.match(plotting.advice.en, /Keep both with distinct roles/);
  const stages = advise.forGroup({ members: [member('academic-paper'), member('ingest-literature'), member('other')], relations: [] });
  assert.equal(stages.advice.id, 'paper-stages');
  assert.equal(stages.advice.overridesSuite, false);
  assert.deepEqual(stages.tasks, []);
  assert.equal(advise.forGroup({ members: [member('matplotlib')], relations: [] }).advice, null, 'a rule needs every named Skill');
});

test('purposes come from configuration and unknown Skills fall back to their own description', () => {
  assert.match(advise.purpose(member('ingest-literature')).en, /Verify references/);
  assert.equal(advise.purpose(member('unknown')), null);
  const custom = createGuidance([], { purposes: [{ name: 'x', zh: '甲', en: 'X' }], rules: [] });
  assert.deepEqual(custom.purpose(member('x')), { zh: '甲', en: 'X' });
});
