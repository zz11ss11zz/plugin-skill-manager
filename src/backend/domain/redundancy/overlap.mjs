const stop = new Set('a an the this that these those and or for from with to of in on by as is are be when use used using users user skill skills tool tools can should only 使用 用于 用户 技能 工具 可以 进行 需要 一个 以及 如果'.split(' '));
const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
// Explicit bilingual task vocabulary is a retrieval clue, never semantic equivalence.
// The vocabulary is configuration (config/redundancy/task-vocabulary.toml); none is built in.
export const OVERLAP_DEFAULTS = Object.freeze({ minSharedTerms: 3, minJaccard: 0.3, maxCompared: 500, maxDescriptionChars: 8000, maxTerms: 500, maxSharedTermsShown: 12, maxPairsShown: 50 });
const compileTasks = tasks => tasks.map(({ id, pattern }) => [id, new RegExp(pattern, 'i')]);
function capabilities(skill,tasks,limits){const positive=String(skill.description||'').slice(0,limits.maxDescriptionChars).split(/\bnot\b|不用于|不是|而非/i)[0];return tasks.filter(([,re])=>re.test(positive)).map(([name])=>name);}
function routesTo(a,b){
  const name=String(b.name||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(!name)return false;
  // A specific "for X, use Y" routing clause indicates distinct roles; mere mentions do not.
  return new RegExp(`(?:for[^.;\\n]{1,180}[,;]\\s*use|针对[^。；\\n]{1,100}[，,]\\s*(?:使用|调用))\\s+${name}(?=[\\s.;,。；，]|$)`,'i').test(String(a.description||''));
}
function terms(description, limits) {
  const words = new Set();
  for (const part of segmenter.segment(description.slice(0, limits.maxDescriptionChars).normalize('NFKC').toLowerCase())) {
    const word = part.segment;
    if (part.isWordLike && word.length >= 2 && /\p{L}/u.test(word) && !stop.has(word)) words.add(word);
    if (words.size >= limits.maxTerms) break;
  }
  return words;
}

// Local lexical retrieval only. The score is a term overlap ratio, not a probability.
/**
 * @param {object[]} skills
 * @param {{ excludePair?: (a: any, b: any) => boolean, capabilityHints?: boolean, tasks?: Array<{id: string, pattern: string}>, limits?: Partial<typeof OVERLAP_DEFAULTS> }} [options]
 */
export function descriptionOverlap(skills, { excludePair = () => false, capabilityHints = false, tasks = [], limits: given = {} } = {}) {
  const limits = { ...OVERLAP_DEFAULTS, ...given }, vocabulary = compileTasks(tasks);
  const candidates = skills.filter(s => typeof s.description === 'string' && s.description !== '元数据无效，请查看扫描问题。');
  const scope = [...candidates].sort((a, b) => a.id.localeCompare(b.id)).slice(0, limits.maxCompared);
  const tokenSets = scope.map(s => terms(s.description, limits)), taskSets=scope.map(s => capabilities(s, vocabulary, limits)), pairs = [];
  for (let i = 0; i < scope.length; i++) for (let j = i + 1; j < scope.length; j++) {
    if (excludePair(scope[i], scope[j])) continue;
    if (scope[i].fingerprint === scope[j].fingerprint || scope[i].name === scope[j].name) continue;
    if(capabilityHints&&(routesTo(scope[i],scope[j])||routesTo(scope[j],scope[i])))continue;
    const left = tokenSets[i], right = tokenSets[j];
    const shared = [...left].filter(word => right.has(word));
    const union = left.size + right.size - shared.length;
    const ratio = union ? shared.length / union : 0;
    const sharedTasks=capabilityHints?taskSets[i].filter(task=>taskSets[j].includes(task)):[];
    if ((shared.length < limits.minSharedTerms || ratio < limits.minJaccard)&&!sharedTasks.length) continue;
    pairs.push({ ids: [scope[i].id, scope[j].id], ratio, sharedTerms: sharedTasks.length?sharedTasks:shared.sort().slice(0, limits.maxSharedTermsShown), sharedCount: shared.length,...(capabilityHints?{method:sharedTasks.length?'task-vocabulary':'description-terms'}:{}) });
  }
  pairs.sort((a, b) => b.ratio - a.ratio || a.ids.join(':').localeCompare(b.ids.join(':')));
  return { pairs: pairs.slice(0, limits.maxPairsShown), totalPairs: pairs.length, comparedInstances: scope.length, eligibleInstances: candidates.length,
    limits: ['仅以描述词语交并比筛选用途重叠候选，不作语义等价判断；比例不是置信度。', `至少 ${limits.minSharedTerms} 个共同词，交并比至少 ${limits.minJaccard.toFixed(2)}；同名或相同文档由其他分组展示。`, `最多比较按实例 ID 排序的 ${limits.maxCompared} 项，每份描述前 ${limits.maxDescriptionChars} 字符、最多 ${limits.maxTerms} 个词；显示前 ${limits.maxPairsShown} 对。`, '否定条件、依赖和适用范围仍需人工核对；无候选不表示不存在重叠，不支持自动删除。'] };
}
