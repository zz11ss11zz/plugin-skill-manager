// View: renders the collection ViewModel (src/frontend/viewmodels/collection.vm.mjs).
// Localized wording lives here; reading, grouping, attribution and counting live in the ViewModel.
import * as model from '../viewmodels/collection.vm.mjs';

// Re-exported so the management view keeps a single `collection` import (tests inject it by that name).
export const readCollection = model.readCollection;

/** Localized label for adoption evidence; coverage limits are stated once per panel, not per row. */
export function adoptionLabel(evidence, text) {
  if (evidence.status === 'unavailable') return text('采用账本不可用', 'Adoption ledger unavailable');
  if (evidence.status === 'recorded') return text(`已记录采用：${evidence.count} · 最近 ${evidence.last}`, `Recorded adoptions: ${evidence.count} · Latest ${evidence.last}`);
  if (evidence.status === 'unrecorded') return text('本账本未记录', 'Not recorded in this ledger');
  // Say "this period" only when the summary was actually limited to one; otherwise it covers all records.
  return evidence.bounded ? text('所选时段无采用记录', 'No adoption records in this period') : text('暂无采用记录', 'No adoption records');
}

/** Kept for the management view: evidence for the given ids with its localized label. */
export function adoptionEvidence(ids, ledger, text) {
  const evidence = model.adoptionEvidence(ids, ledger);
  return { ...evidence, label: adoptionLabel(evidence, text) };
}

export const coverageNote = (ledger, text) => model.partialCoverage(ledger)
  ? text('采用记录由助手上报，覆盖可能不完整。', 'Adoptions are assistant-reported; coverage may be incomplete.') : null;

export function renderCollection(snapshot, data, el, text) {
  const view = model.collectionModel(snapshot, data);
  const panel = el('section');
  panel.append(el('p', text(`公开 Skill 入口组：${view.groups.length} · 发现路径：${view.total}`, `Public Skill entry groups: ${view.groups.length} · Discovered paths: ${view.total}`)));
  for (const group of view.groups) {
    const details = el('details');
    const label = group.match === 'ambiguous' ? text('多个本机实例，归属待核对', 'Multiple local matches; attribution unresolved') :
      group.match === 'confirmed' ? adoptionLabel(group.evidence, text) : text('未找到已确认的本机入口匹配', 'No confirmed local entry match');
    details.append(el('summary', group.name + ' · ' + label));
    for (const path of group.paths) details.append(el('p', path));
    panel.append(details);
  }
  // The total sums attributed instances only; ambiguous and unmatched groups are left out.
  if (view.attributed && view.aggregate.count !== null) panel.append(el('p', text(`可归属实例已记录采用合计：${view.aggregate.count}`, `Recorded adoptions across attributable instances: ${view.aggregate.count}`)));
  if (view.oversized.length) {
    const details = el('details');
    details.append(el('summary', text(`超过 1 MiB 未读取：${view.oversized.length}`, `Skipped (over 1 MiB): ${view.oversized.length}`)));
    for (const path of view.oversized) details.append(el('p', path));
    panel.append(details);
  }
  if (view.other.length) {
    const details = el('details');
    details.append(el('summary', text('其他路径（含归档、维护和未确认入口）', 'Other paths (archived, maintenance or unconfirmed)')));
    for (const path of view.other) details.append(el('p', path));
    panel.append(details);
  }
  const note = coverageNote(data?.adoptions, text);
  if (note) panel.append(el('p', note));
  panel.append(el('p', text('分组依据是同名目录和入口内容；依赖及来源可能不同。采用仅计本账本已记录的事件。', 'Groups match directory names and entry documents; dependencies and origins can differ. Counts cover only reported adoptions.')));
  return panel;
}
