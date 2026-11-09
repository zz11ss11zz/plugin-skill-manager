const normalize = raw => raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trimEnd();
const digest = async raw => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalize(raw)))), byte => byte.toString(16).padStart(2, '0')).join('');

export async function readCollection(files) {
  const paths = new Map();
  for (const file of files) {
    const path = file.webkitRelativePath.split('/').slice(1).join('/');
    if (path && !path.split('/').some(part => ['.git', 'node_modules'].includes(part))) paths.set(path, file);
  }
  const groups = new Map(), other = [];
  let total = 0;
  for (const [path, file] of paths) {
    if (!/(^|\/)SKILL\.md$/.test(path)) continue;
    total++;
    const parts = path.split('/');
    const prefix = parts.slice(0, -3).join('/');
    const publicRoot = !prefix || paths.has(prefix + '/plugin.json') || paths.has(prefix + '/.codex-plugin/plugin.json');
    if (parts.at(-3) !== 'skills' || !publicRoot || parts.some(part => part.startsWith('.') || ['archive', 'archives', 'tests', 'fixtures', 'examples'].includes(part))) {
      other.push(path);
      continue;
    }
    if (file.size > 1024 * 1024) throw new Error('SKILL.md > 1 MiB: ' + path);
    const raw = await file.text();
    const fingerprint = await digest(raw);
    const name = parts.at(-2);
    const key = name + '/' + fingerprint;
    if (!groups.has(key)) groups.set(key, { name, fingerprint, paths: [] });
    groups.get(key).paths.push(path);
  }
  return { total, groups: [...groups.values()], other };
}

export function adoptionEvidence(ids, ledger, text) {
  if (!ledger?.activity || !Array.isArray(ledger.catalog)) return { label: text('采用账本不可用', 'Adoption ledger unavailable'), count: null };
  const unique = new Set(ids);
  let count = 0, last = '';
  for (const day of ledger.activity.days) {
    for (const row of day.entries) if (unique.has(row.id) && row.adoptions > 0) {
      count += row.adoptions;
      if (day.date > last) last = day.date;
    }
  }
  const coverageNote = ledger.coverage?.complete === false ? text('（覆盖不完整）', ' (partial coverage)') : '';
  if (count) return { count, label: text(`已记录采用：${count} · 最近 ${last}`, `Recorded adoptions: ${count} · Latest ${last}`) + coverageNote };
  const known = ledger.catalog.some(row => unique.has(row.id));
  return { count: 0, label: (known ? text('所选时段无采用记录', 'No adoption records in this period') : text('本账本未记录', 'Not recorded in this ledger')) + coverageNote };
}

export function renderCollection(snapshot, data, el, text) {
  const panel = el('section');
  const ids = new Set();
  panel.append(el('p', text(`公开 Skill 入口组：${snapshot.groups.length} · 发现路径：${snapshot.total}`, `Public Skill entry groups: ${snapshot.groups.length} · Discovered paths: ${snapshot.total}`)));
  for (const group of snapshot.groups) {
    const matches = (data?.skills || []).filter(s => s.entryFingerprint === group.fingerprint && (!s.owner || s.pluginStatus?.installedVersions?.includes(s.owner.version)));
    const details = el('details');
    const entryIds = matches.map(s => s.id);
    const evidence = adoptionEvidence(entryIds, data?.adoptions, text);
    const label = matches.length > 1 ? text('多个本机实例，归属待核对','Multiple local matches; attribution unresolved') :
      matches.length === 1 ? evidence.label : text('未找到已确认的本机入口匹配','No confirmed local entry match');
    if (matches.length === 1) ids.add(matches[0].id);
    details.append(el('summary', group.name + ' · ' + label));
    for (const path of group.paths) details.append(el('p', path));
    panel.append(details);
  }
  const aggregate = adoptionEvidence(ids, data?.adoptions, text);
  if (ids.size && aggregate.count !== null) panel.append(el('p', text(`可归属实例已记录采用合计：${aggregate.count}`, `Recorded adoptions across attributable instances: ${aggregate.count}`)));
  if (snapshot.other.length) {
    const details = el('details');
    details.append(el('summary', text('其他路径（含归档、维护和未确认入口）','Other paths (archived, maintenance or unconfirmed)')));
    for (const path of snapshot.other) details.append(el('p', path));
    panel.append(details);
  }
  panel.append(el('p', text('分组依据是同名目录和入口内容；依赖及来源可能不同。采用仅计本账本已记录的事件。','Groups match directory names and entry documents; dependencies and origins can differ. Counts cover only reported adoptions.')));
  return panel;
}
