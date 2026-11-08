// Instance comparison: identical documents, same-name conflicts and description overlap. Pure.
import { descriptionOverlap } from '../redundancy/overlap.mjs';

export function compareInstances(skills, overlapOptions) {
  const fingerprints = new Map(), names = new Map();
  for (const skill of skills) {
    for (const [map, key] of [[fingerprints, skill.fingerprint], [names, skill.name]]) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(skill);
    }
  }
  return {
    descriptionOverlap: descriptionOverlap(skills, overlapOptions),
    identicalDocuments: [...fingerprints.values()].filter(group => group.length > 1).map(group => ({ fingerprint: group[0].fingerprint, ids: group.map(s => s.id) })),
    nameConflicts: [...names.entries()].filter(([, group]) => new Set(group.map(s => s.fingerprint)).size > 1).map(([name, group]) => ({ name, ids: group.map(s => s.id) })),
  };
}
