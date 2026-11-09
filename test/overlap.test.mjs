import test from 'node:test';
import assert from 'node:assert/strict';
import { descriptionOverlap } from '../src/backend/domain/redundancy/overlap.mjs';
import { testConfig } from './helpers/config.mjs';
const tasks = testConfig().redundancy.overlap.tasks;
const skill = (id, description) => ({ id, name: id, fingerprint: id, description });
test('description candidates expose common terms, preserve differences and exclude unrelated or generic text', () => {
  const input = [skill('a', 'Create scientific charts and compare experimental data'), skill('b', 'Compare scientific charts with experimental data'), skill('c', 'Manage calendar meetings and email invitations'), skill('d', 'Use this skill when the user needs a tool')];
  const result = descriptionOverlap(input);
  assert.equal(result.totalPairs, 1);
  assert.deepEqual(result.pairs[0].ids, ['a', 'b']);
  assert.ok(result.pairs[0].sharedTerms.includes('scientific'));
  assert.ok(result.pairs[0].ratio > 0.3);
  assert.deepEqual(descriptionOverlap([...input].reverse()), result);
  assert.equal(descriptionOverlap([input[0], { ...input[1], fingerprint: 'a' }]).totalPairs, 0);
  assert.equal(descriptionOverlap([input[0], { ...input[1], name: 'a' }]).totalPairs, 0);
});
test('Chinese descriptions and bounded candidate output retain explicit coverage', () => {
  const result = descriptionOverlap([skill('a', '科学 数据 图表 绘制 分析'), skill('b', '科学 数据 图表 绘制 导出')]);
  assert.equal(result.totalPairs, 1);
  assert.ok(result.pairs[0].sharedTerms.includes('图表'));
  const many = descriptionOverlap(Array.from({ length: 501 }, (_, i) => skill(String(i).padStart(3, '0'), 'scientific charts experimental data')));
  assert.equal(many.comparedInstances, 500);
  assert.equal(many.eligibleInstances, 501);
  assert.equal(many.pairs.length, 50);
  assert.equal(many.totalPairs, 500 * 499 / 2);
});

test('opt-in bilingual task hints identify differently named functions without claiming equivalence',()=>{
  const input=[skill('a','对学术参考文献逐条执行多源交叉验证，输出结构化报告'),skill('b','Verify references and citations before submitting a manuscript'),skill('c','Manage calendar meetings; not citation verification')];
  const r=descriptionOverlap(input,{capabilityHints:true,tasks});
  assert.equal(r.totalPairs,1);assert.equal(r.pairs[0].method,'task-vocabulary');assert.deepEqual(r.pairs[0].sharedTerms,['reference-verification']);
});

test('explicit task routing is complementary, while same-author independent Skills remain comparable',()=>{
  const plotting={...skill('matplotlib','Creates scientific plots with Matplotlib. For publication-ready multi-panel figures, use scientific-visualization.'),declaredAuthor:'same author'};
  const design={...skill('scientific-visualization','Creates and audits scientific figures with Matplotlib, Seaborn, or Plotly.'),declaredAuthor:'same author'};
  assert.equal(descriptionOverlap([plotting,design],{capabilityHints:true,tasks}).totalPairs,0);
  const duplicate={...plotting,id:'other',name:'other-plotter',fingerprint:'other-document',description:'Creates scientific plots with Matplotlib for scientific figure export.'};
  assert.equal(descriptionOverlap([plotting,duplicate],{capabilityHints:true,tasks}).totalPairs,1);
});
