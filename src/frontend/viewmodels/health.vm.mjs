// Health panel ViewModel: one manual diagnosis at a time; a failed run keeps the previous report.
// Holds no translated text — the view localizes report fields and states.

const STATES = new Set(['ok', 'info', 'warning', 'error', 'unknown']);
const PRIORITY = { error: 0, unknown: 1, warning: 2, info: 3, ok: 4 };

/** Rejects partial or unexpected diagnosis payloads before they replace a good report. */
export function parseHealthReport(result) {
  const next = result?.structuredContent?.health;
  const valid = !result?.isError && next && next.version === 1 && STATES.has(next.status) && Array.isArray(next.checks)
    && next.checks.every(c => c && STATES.has(c.status) && typeof c.title?.en === 'string' && typeof c.message?.en === 'string');
  if (!valid) throw new Error('Incomplete diagnostic response');
  return next;
}

/** @param {{ diagnose: () => Promise<any> }} deps  backend: check_recording_status */
export function createHealthViewModel({ diagnose }) {
  const state = { report: null, pending: false, failed: false };
  const listeners = new Set();
  const emit = () => { for (const listener of [...listeners]) listener(state); };

  return {
    get state() { return state; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },

    /** Accepts a diagnosis result from any source (button or a pushed tool result). */
    receive(result) {
      state.report = parseHealthReport(result);
      state.failed = false;
      emit();
    },
    async run() {
      if (state.pending) return;
      state.pending = true; state.failed = false; emit();
      try { this.receive(await diagnose()); }
      catch { state.failed = true; }
      finally { state.pending = false; emit(); }
    },

    // ---- selectors ----
    counts() {
      const checks = state.report?.checks || [];
      const count = status => checks.filter(item => item.status === status).length;
      return { error: count('error'), unknown: count('unknown'), warning: count('warning') };
    },
    /** Unresolved checks first, healthy ones last. */
    orderedChecks() { return [...(state.report?.checks || [])].sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status]); },
  };
}
