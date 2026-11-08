// Union-find grouping of related Skill instances. Pure: no IO.

/**
 * @param {Map<string, object>} byId
 * @param {(a: object, b: object) => boolean} excludePair
 */
export function createGrouping(byId, excludePair) {
  const parents = new Map(), edges = [];
  const find = id => { if (!parents.has(id)) parents.set(id, id); const p = parents.get(id); if (p !== id) parents.set(id, find(p)); return parents.get(id); };
  const link = (ids, type, evidence = {}) => {
    ids = ids.filter(id => byId.has(id));
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      if (excludePair(byId.get(ids[i]), byId.get(ids[j]))) continue;
      const pair = [ids[i], ids[j]], root = find(pair[0]);
      parents.set(find(pair[1]), root); edges.push({ ids: pair, type, ...evidence });
    }
  };
  const components = () => {
    const out = new Map();
    for (const id of parents.keys()) { const root = find(id); if (!out.has(root)) out.set(root, []); out.get(root).push(id); }
    return out;
  };
  return { link, components, edges };
}
