// Guidance attached to redundancy groups: localized names for shared tasks, named-Skill purposes
// and recommendations from config/redundancy/guidance.toml. Pure; advice never changes candidates.

/**
 * @typedef {{ zh: string, en: string }} Localized
 * @typedef {{ id: string, pattern: string, label?: Localized }} Task
 * @typedef {{ purposes: Array<{name: string} & Localized>, rules: Array<{id: string, names: string[], task?: string, overridesSuite: boolean} & Localized> }} GuidanceSettings
 */

/**
 * @param {Task[]} tasks
 * @param {GuidanceSettings} guidance
 */
export function createGuidance(tasks, guidance) {
  const labels = new Map(tasks.filter(t => t.label).map(t => [t.id, t.label]));
  const purposes = new Map(guidance.purposes.map(p => [p.name, { zh: p.zh, en: p.en }]));

  /** @returns {{ tasks: Array<{id: string, label: Localized}>, advice: ({id: string, overridesSuite: boolean} & Localized) | null }} */
  function forGroup(group) {
    const terms = [...new Set((group.relations || []).flatMap(r => r.sharedTerms || []))];
    const taskIds = terms.filter(term => labels.has(term));
    const names = new Set(group.members.map(m => m.name));
    const rule = guidance.rules.find(r => r.names.every(name => names.has(name))) ?? null;
    // A rule may name the shared function when the description clues found none.
    if (!taskIds.length && rule?.task && labels.has(rule.task)) taskIds.push(rule.task);
    return {
      tasks: taskIds.map(id => ({ id, label: labels.get(id) })),
      advice: rule ? { id: rule.id, overridesSuite: rule.overridesSuite, zh: rule.zh, en: rule.en } : null,
    };
  }

  /** @returns {Localized | null} */
  const purpose = member => purposes.get(member.name) ?? null;

  return { forGroup, purpose };
}

export const NO_GUIDANCE = Object.freeze({ purposes: [], rules: [] });
