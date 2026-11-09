// Activity panel view model. All counting rules (coverage, unknown vs zero, eligibility, low-use
// observation) run here; the dashboard only selects and renders. Output is plain JSON (no Maps).
import { activityView, recentActivity, calendarDays, activityToday } from './activity.mjs';

const KINDS = new Set(['plugins', 'skills']);
const METRICS = new Set(['calls', 'adoptions', 'reads', 'explicit']);

// Which ledger a metric/source reads, and the historical catalog entries that join the inventory.
function scope(inventory, { kind, metric, source }) {
  const calling = metric === 'calls', adopting = metric === 'adoptions';
  const usage = calling ? (inventory.pluginCalls?.sources?.[source] ?? inventory.pluginCalls) : adopting ? inventory.adoptions : inventory.usage;
  const historical = (adopting ? usage?.catalog || [] : []).filter(s => !inventory.skills.some(p => p.id === s.id)).map(s => ({ ...s, historical: true }));
  return { usage, scoped: { ...inventory, skills: [...inventory.skills, ...historical], usage }, kind };
}

const entry = e => ({ id: e.id, name: e.name, detail: e.detail, total: e.total, unknown: Boolean(e.unknown), uncertain: Boolean(e.uncertain), historical: Boolean(e.historical),
  activeDays: e.activeDays ?? 0, firstUsed: e.firstUsed ?? null, lastUsed: e.lastUsed ?? null, icon: e.icon, iconDark: e.iconDark });

function serialize(view) {
  return {
    ready: view.ready, coverage: view.coverage, total: view.total, excluded: view.excluded,
    days: [...view.days], all: view.all.map(entry), top: view.top.map(entry), unused: view.unused.map(entry),
    observation: { ...view.observation, zero: view.observation.zero.map(entry), low: view.observation.low.map(entry) },
  };
}

/** One panel model per request; requests are { kind, metric, year, source?, from?, to? }. */
export function activityViews(inventory, requests, now = Date.now()) {
  return requests.map(request => {
    const kind = KINDS.has(request.kind) ? request.kind : 'plugins';
    const metric = METRICS.has(request.metric) ? request.metric : 'calls';
    const year = Number.isInteger(request.year) ? request.year : new Date(now).getUTCFullYear();
    const source = request.source || 'host-event';
    const { usage, scoped } = scope(inventory, { kind, metric, source });
    const view = activityView(scoped, kind, year, metric);
    const recent = recentActivity(scoped, kind, year, metric, now);
    const today = activityToday(usage, now);
    const { start, end, incomplete } = view.coverage;
    const dayStatus = {}, dayEntries = {};
    for (const date of calendarDays(year)) {
      if (!date) continue;
      const count = view.days.get(date) || 0;
      dayStatus[date] = date > today ? 'future' : (!count && (incomplete || !start || !end || date < start || date > end)) ? 'unknown' : 'covered';
    }
    // Per-day non-zero counts per entity, using the same attribution as the yearly view.
    for (const [date, count] of view.days) {
      if (!count || date > today) continue;
      const day = activityView(scoped, kind, year, metric, { from: date, to: date });
      dayEntries[date] = day.all.filter(e => e.total > 0).map(e => [e.id, e.total]);
    }
    const range = request.from && request.to && request.from <= request.to ? serialize(activityView(scoped, kind, year, metric, { from: request.from, to: request.to })) : null;
    const years = [...new Set([year, new Date(now).getFullYear(), ...(usage?.activity?.days || []).map(d => Number(d.date.slice(0, 4)))])].sort((a, b) => b - a);
    return {
      request: { kind, metric, year, source, from: request.from ?? null, to: request.to ?? null },
      today, years, hasCoverage: Boolean(usage?.coverage?.from), sourcesAvailable: Boolean(inventory.pluginCalls?.sources),
      yearView: serialize(view), dayStatus, dayEntries, range,
      recent: { ...serialize(recent), from: recent.from, to: recent.to, dates: recent.dates, activeDays: recent.activeDays, usedItems: recent.usedItems },
    };
  });
}
