const stop = new Set('a an the this that these those and or for from with to of in on by as is are be when use used using users user skill skills tool tools can should only 使用 用于 用户 技能 工具 可以 进行 需要 一个 以及 如果'.split(' '));
const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
// Explicit bilingual task vocabulary is a retrieval clue, never semantic equivalence.
const tasks = [
  ['manuscript-writing',/manuscript.*(?:draft|writ)|(?:draft|writ).*manuscript|academic paper writing|论文写作|章节起草/i],
  ['peer-review',/peer.review|mock.review|manuscript review|模拟审稿|投稿前自审|论文审稿/i],
  ['literature-search',/literature (?:search|discovery)|search literature|systematic literature|文献检索|文献发现/i],
  ['reference-verification',/citation.check|verify.*(?:citation|reference)|(?:citation|reference).*verif|引文核对|参考文献.*(?:验证|校验)|逐条.*验证/i],
  ['paper-reading',/deep.reading|single.paper comprehension|paper.xray|论文精读|精读论文/i],
  ['translation',/translat|全文翻译|学术翻译|逐页翻译/i],
  ['statistical-review',/statistical (?:report|interpret|analysis)|统计审查|统计方法|统计分析/i],
  ['scientific-figures',/scientific (?:figure|plot)|manuscript.*figure|科研绘图|论文配图/i],
  ['review-response',/responses? to peer review|rebuttal|审稿意见回复|逐点回复/i],
];
function capabilities(skill){const positive=String(skill.description||'').slice(0,8000).split(/\bnot\b|不用于|不是|而非/i)[0];return tasks.filter(([,re])=>re.test(positive)).map(([name])=>name);}
function routesTo(a,b){
  const name=String(b.name||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(!name)return false;
  // A specific "for X, use Y" routing clause indicates distinct roles; mere mentions do not.
  return new RegExp(`(?:for[^.;\\n]{1,180}[,;]\\s*use|针对[^。；\\n]{1,100}[，,]\\s*(?:使用|调用))\\s+${name}(?=[\\s.;,。；，]|$)`,'i').test(String(a.description||''));
}
function terms(description) {
  const words = new Set();
  for (const part of segmenter.segment(description.slice(0, 8000).normalize('NFKC').toLowerCase())) {
    const word = part.segment;
    if (part.isWordLike && word.length >= 2 && /\p{L}/u.test(word) && !stop.has(word)) words.add(word);
    if (words.size >= 500) break;
  }
  return words;
}

// Local lexical retrieval only. The score is a term overlap ratio, not a probability.
export function descriptionOverlap(skills, { excludePair = () => false, capabilityHints = false } = {}) {
  const candidates = skills.filter(s => typeof s.description === 'string' && s.description !== '元数据无效，请查看扫描问题。');
  const scope = [...candidates].sort((a, b) => a.id.localeCompare(b.id)).slice(0, 500);
  const tokenSets = scope.map(s => terms(s.description)), taskSets=scope.map(capabilities), pairs = [];
  for (let i = 0; i < scope.length; i++) for (let j = i + 1; j < scope.length; j++) {
    if (excludePair(scope[i], scope[j])) continue;
    if (scope[i].fingerprint === scope[j].fingerprint || scope[i].name === scope[j].name) continue;
    if(capabilityHints&&(routesTo(scope[i],scope[j])||routesTo(scope[j],scope[i])))continue;
    const left = tokenSets[i], right = tokenSets[j];
    const shared = [...left].filter(word => right.has(word));
    const union = left.size + right.size - shared.length;
    const ratio = union ? shared.length / union : 0;
    const sharedTasks=capabilityHints?taskSets[i].filter(task=>taskSets[j].includes(task)):[];
    if ((shared.length < 3 || ratio < 0.3)&&!sharedTasks.length) continue;
    pairs.push({ ids: [scope[i].id, scope[j].id], ratio, sharedTerms: sharedTasks.length?sharedTasks:shared.sort().slice(0, 12), sharedCount: shared.length,...(capabilityHints?{method:sharedTasks.length?'task-vocabulary':'description-terms'}:{}) });
  }
  pairs.sort((a, b) => b.ratio - a.ratio || a.ids.join(':').localeCompare(b.ids.join(':')));
  return { pairs: pairs.slice(0, 50), totalPairs: pairs.length, comparedInstances: scope.length, eligibleInstances: candidates.length,
    limits: ['仅以描述词语交并比筛选用途重叠候选，不作语义等价判断；比例不是置信度。', '至少 3 个共同词，交并比至少 0.30；同名或相同文档由其他分组展示。', '最多比较按实例 ID 排序的 500 项，每份描述前 8000 字符、最多 500 个词；显示前 50 对。', '否定条件、依赖和适用范围仍需人工核对；无候选不表示不存在重叠，不支持自动删除。'] };
}
