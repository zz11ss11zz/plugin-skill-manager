// Activity panel ViewModel. Holds UI-only state (tab, source, year, pinned date, date range) and the
// backend-computed panel models. It contains presentation logic only — selecting, joining and
// ordering values the backend already computed; every counting rule lives in the backend.
import { createStore } from '../state/store.mjs';

const fullYear = year => ({ from: `${year}-01-01`, to: `${year}-12-31` });
const viewKey = ({ kind, metric, source, year }) => `${kind}|${metric}|${metric === 'calls' ? source : '-'}|${year}`;
const rangeKey = (request, range) => `${viewKey(request)}|${range.from}|${range.to}`;
const order = (a, b) => b.total - a.total || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

/**
 * @param {object} deps
 * @param {(requests: object[]) => Promise<object[]>} deps.loadViews   backend: query_activity_views
 * @param {() => number} [deps.now]
 */
export function createActivityViewModel({ loadViews, now = () => Date.now() }) {
  const year = new Date(now()).getFullYear();
  const store = createStore({
    kind: 'plugins', metric: 'calls', source: 'host-event', year, pinnedDate: null, range: fullYear(year),
    inventory: null, panels: new Map(), ranges: new Map(), loading: false, error: null,
  });
  const state = () => store.get();
  const request = (s = state()) => ({ kind: s.kind, metric: s.metric, source: s.source, year: s.year });
  const isFullYear = (s = state()) => s.range.from === `${s.year}-01-01` && s.range.to === `${s.year}-12-31`;
  const rangeValid = range => Boolean(range.from && range.to && range.from <= range.to);

  // Every tab/source combination of a year in one backend call, so switching is instant.
  async function loadYear(targetYear) {
    const requests = [
      { kind: 'plugins', metric: 'calls', source: 'host-event', year: targetYear },
      { kind: 'plugins', metric: 'calls', source: 'assistant-report', year: targetYear },
      { kind: 'skills', metric: 'adoptions', year: targetYear },
    ];
    store.set({ loading: true, error: null });
    try {
      const views = await loadViews(requests);
      const panels = new Map(state().panels);
      views.forEach((view, index) => panels.set(viewKey({ ...requests[index], source: requests[index].source ?? 'host-event' }), view));
      store.set({ panels, loading: false });
    } catch (error) { store.set({ loading: false, error: error.message || 'unavailable' }); }
  }

  async function loadRange() {
    const s = state();
    if (isFullYear(s) || !rangeValid(s.range) || s.ranges.has(rangeKey(request(s), s.range))) return;
    try {
      const [view] = await loadViews([{ ...request(s), ...s.range }]);
      const ranges = new Map(state().ranges); ranges.set(rangeKey(request(s), s.range), view.range);
      store.set({ ranges });
    } catch (error) { store.set({ error: error.message || 'unavailable' }); }
  }

  return {
    subscribe: store.subscribe,
    get state() { return state(); },

    /** New inventory from the backend: cached views are stale. */
    async setInventory(inventory) {
      store.set({ inventory, panels: new Map(), ranges: new Map() });
      await loadYear(state().year);
      await loadRange();
    },
    selectKind(kind) { store.set({ kind, metric: kind === 'skills' ? 'adoptions' : 'calls', pinnedDate: null }); return loadRange(); },
    selectSource(source) { store.set({ source, pinnedDate: null }); return loadRange(); },
    async selectYear(nextYear) {
      store.set({ year: nextYear, pinnedDate: null, range: fullYear(nextYear) });
      if (!state().panels.has(viewKey(request()))) await loadYear(nextYear);
    },
    togglePin(date) { store.set(s => ({ pinnedDate: s.pinnedDate === date ? null : date })); },
    clearPin() { store.set({ pinnedDate: null }); },
    setRange(range) { store.set({ range }); return loadRange(); },

    // ---- selectors (presentation logic only) ----
    panel() { return state().panels.get(viewKey(request())) ?? null; },
    isRangeValid: () => rangeValid(state().range),
    /** Ranking for the selected date range; the full year uses the yearly view. */
    rankingView() {
      const panel = this.panel();
      if (!panel) return null;
      if (isFullYear()) return panel.yearView;
      return state().ranges.get(rangeKey(request(), state().range)) ?? panel.yearView;
    },
    /** Day ranking joined from backend per-day counts and the backend's day and entity status. */
    dayRanking(date) {
      const panel = this.panel();
      if (!panel) return { ready: false, all: [] };
      const counts = new Map(panel.dayEntries[date] || []);
      const covered = panel.dayStatus[date] === 'covered';
      const all = panel.yearView.all.map(entity => {
        const total = counts.get(entity.id) || 0;
        return { ...entity, total, unknown: !total && (!covered || entity.uncertain) };
      }).sort(order);
      return { ready: panel.yearView.ready, all };
    },
  };
}
