// Status uses existing ledgers only. A readable ledger cannot prove host-wide capture.
export async function recordingStatus(adoptions, pluginCalls) {
  const inspect = async (store, entries, count) => {
    try {
      const state = await store.read(), rows = entries(state);
      return { state: rows.length ? 'recorded' : 'empty', count: count(rows), latestReceivedAt: rows.map(row => row.receivedAt || row.at).sort().at(-1) || null };
    } catch { return { state: 'unavailable', count: null, latestReceivedAt: null }; }
  };
  const result = {
    checkedAt: new Date().toISOString(),
    adoptions: await inspect(adoptions, state => Object.values(state.batches), rows => rows.reduce((total, row) => total + row.skills.length, 0)),
    pluginCalls: await inspect(pluginCalls, state => state.calls, rows => rows.length),
    capture: 'caller-reported', hostWideCoverage: 'unknown', automaticMonitoring: false,
  };
  try {
    const summary = await pluginCalls.summary();
    result.pluginCalls.sources = { hostEvents: summary.sources['host-event'].total, assistantReports: summary.sources['assistant-report'].total };
    result.pluginCalls.countMeaning = 'stored-records-not-deduplicated-across-different-source-ids';
  } catch { /* The original read status remains authoritative. */ }
  return result;
}
