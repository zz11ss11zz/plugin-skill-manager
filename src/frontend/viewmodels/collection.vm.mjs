// Collection ViewModel: reads a picked local Skill collection, groups public entries and attributes
// recorded adoptions to confirmed local instances. Holds no translated text; the view
// (src/frontend/views/collection.mjs) localizes every status it returns.
//
// Entry normalization must match `entryFingerprint` in src/backend/adapters/hosts/codex/skill-source.mjs
// (documented in the inventory output contract); frontend and backend share no code.

const MAX_ENTRY_BYTES = 1024 * 1024;
const IGNORED_DIRS = ['.git', 'node_modules'];
const NON_PUBLIC_DIRS = ['archive', 'archives', 'tests', 'fixtures', 'examples'];

const normalize = raw => raw.replace(/^﻿/, '').replace(/\r\n/g, '\n').trimEnd();
const digest = async raw => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalize(raw)))), byte => byte.toString(16).padStart(2, '0')).join('');

/**
 * Classifies every SKILL.md under the picked directory (see docs/COLLECTION_COUNTS.en.md):
 * - public entry: `<root>/skills/<name>/SKILL.md`, where <root> is the collection root or a plugin
 *   root (has plugin.json or .codex-plugin/plugin.json), and no path part is hidden or non-public;
 * - other: everything else (archives, maintenance, hidden or unconfirmed entries);
 * - oversized: public entries over 1 MiB, listed by path without reading their content.
 * Public entries with the same directory name and entry digest fold into one group.
 * `total` counts every discovered SKILL.md path, whichever list it lands in.
 * @param {Iterable<{webkitRelativePath: string, size: number, text: () => Promise<string>}>} files
 * @returns {Promise<{total: number, groups: {name: string, fingerprint: string, paths: string[]}[], other: string[], oversized: string[]}>}
 */
export async function readCollection(files) {
  const paths = new Map();
  for (const file of files) {
    // webkitRelativePath starts with the picked folder's own name; drop it so paths are collection-relative.
    const path = file.webkitRelativePath.split('/').slice(1).join('/');
    if (path && !path.split('/').some(part => IGNORED_DIRS.includes(part))) paths.set(path, file);
  }
  const groups = new Map(), other = [], oversized = [];
  let total = 0;
  for (const [path, file] of paths) {
    if (!/(^|\/)SKILL\.md$/.test(path)) continue;
    total++;
    const parts = path.split('/');
    const prefix = parts.slice(0, -3).join('/');
    const publicRoot = !prefix || paths.has(prefix + '/plugin.json') || paths.has(prefix + '/.codex-plugin/plugin.json');
    if (parts.at(-3) !== 'skills' || !publicRoot || parts.some(part => part.startsWith('.') || NON_PUBLIC_DIRS.includes(part))) {
      other.push(path);
      continue;
    }
    // One oversized entry is reported on its own instead of failing the whole collection.
    if (file.size > MAX_ENTRY_BYTES) { oversized.push(path); continue; }
    const fingerprint = await digest(await file.text());
    const name = parts.at(-2);
    const key = name + '/' + fingerprint;
    if (!groups.has(key)) groups.set(key, { name, fingerprint, paths: [] });
    groups.get(key).paths.push(path);
  }
  return { total, groups: [...groups.values()], other, oversized };
}

// Per-ledger totals, built once per adoptions object so rendering many rows stays linear.
// Keyed weakly by the summary object: a new inventory brings a new object (and a fresh index),
// and the old index is released with it. The summary is treated as immutable once received.
const indexes = new WeakMap();
function adoptionIndex(ledger) {
  let index = indexes.get(ledger);
  if (index) return index;
  const totals = new Map();
  for (const day of ledger.activity.days) {
    for (const row of day.entries) if (row.adoptions > 0) {
      const entry = totals.get(row.id) || { count: 0, last: '' };
      entry.count += row.adoptions;
      if (day.date > entry.last) entry.last = day.date;
      totals.set(row.id, entry);
    }
  }
  index = { totals, catalog: new Set(ledger.catalog.map(row => row.id)) };
  indexes.set(ledger, index);
  return index;
}

/**
 * @typedef {object} AdoptionEvidence
 * @property {'unavailable'|'recorded'|'none'|'unrecorded'} status
 *   unavailable — no ledger in the current data (not loaded or unreadable); never shown as zero;
 *   recorded    — at least one adoption recorded for these ids;
 *   none        — ids are in the ledger catalog but have no adoptions in the summarized range;
 *   unrecorded  — the ledger has never seen these ids.
 * @property {number|null} count
 * @property {string} last      latest date with a recorded adoption, '' when none
 * @property {boolean} bounded  true when the ledger summary covers a chosen period rather than all records
 */

/**
 * @param {Iterable<string>} ids
 * @param {any} ledger  the `adoptions` summary from a full inventory, or null/undefined
 * @returns {AdoptionEvidence}
 */
export function adoptionEvidence(ids, ledger) {
  if (!ledger?.activity || !Array.isArray(ledger.catalog)) return { status: 'unavailable', count: null, last: '', bounded: false };
  const index = adoptionIndex(ledger);
  // Dedupe so one instance reached through several paths is counted once.
  const unique = new Set(ids);
  const bounded = Boolean(ledger.period?.from || ledger.period?.to);
  let count = 0, last = '';
  for (const id of unique) {
    const entry = index.totals.get(id);
    if (!entry) continue;
    count += entry.count;
    if (entry.last > last) last = entry.last;
  }
  if (count) return { status: 'recorded', count, last, bounded };
  return { status: [...unique].some(id => index.catalog.has(id)) ? 'none' : 'unrecorded', count: 0, last: '', bounded };
}

/**
 * True when the ledger exists but does not claim complete coverage; shown once, not per row.
 * The backend currently always reports `complete: false` because adoptions are assistant-reported
 * (inventory.service.mjs, catalog.services.mjs), so a per-row suffix would only repeat itself.
 */
export const partialCoverage = ledger => Boolean(ledger?.activity) && ledger.coverage?.complete === false;

/**
 * Matches collection groups to confirmed local instances and attaches adoption evidence.
 * @param {Awaited<ReturnType<typeof readCollection>>} snapshot
 * @param {any} data  the current inventory (skills, adoptions)
 */
export function collectionModel(snapshot, data) {
  const attributed = new Set();
  const groups = snapshot.groups.map(group => {
    // A local instance matches when its entry digest is equal and, for plugin Skills, the cached copy
    // belongs to an installed plugin version. Only a single match is attributed; several stay unresolved.
    const matches = (data?.skills || []).filter(skill => skill.entryFingerprint === group.fingerprint && (!skill.owner || skill.pluginStatus?.installedVersions?.includes(skill.owner.version)));
    if (matches.length === 1) attributed.add(matches[0].id);
    return { ...group, match: matches.length > 1 ? 'ambiguous' : matches.length === 1 ? 'confirmed' : 'none', evidence: adoptionEvidence(matches.map(skill => skill.id), data?.adoptions) };
  });
  return {
    total: snapshot.total, groups, other: snapshot.other, oversized: snapshot.oversized || [],
    attributed: attributed.size, aggregate: adoptionEvidence(attributed, data?.adoptions), partial: partialCoverage(data?.adoptions),
  };
}
