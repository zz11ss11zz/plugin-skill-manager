// Management panel ViewModel: page/section/tab selection, filters, drafts, the pending operation
// plan and the automatic status check. Holds no translated text; errors keep the server message or
// a code the view localizes. Commands that change what is shown notify subscribers; typing into a
// search box updates state silently so the view can refresh just its list without losing focus.

const PERSONAL = ['用户技能', '用户 .agents 技能'];
const PLUGIN_SOURCES = ['插件技能', '插件缓存', '插件缓存技能'];

export const sourceGroup = skill => {
  if (PERSONAL.includes(skill.source)) return 'personal';
  if (skill.source === '系统技能') return 'system';
  if (skill.owner || PLUGIN_SOURCES.includes(skill.source)) return 'plugins';
  return 'other';
};
export const isPersonalSource = source => PERSONAL.includes(source);

const serverMessage = result => result?.content?.find(c => c.type === 'text')?.text || null;
const failure = (code, message = null) => Object.assign(new Error(message || code), { code, serverMessage: message });

/**
 * @param {object} deps
 * @param {(request: {name: string, arguments: object}) => Promise<any>} deps.callTool
 * @param {(result: any) => void} [deps.onInventory]   inventory results are shared with other panels
 * @param {() => number} [deps.now]
 * @param {number} [deps.cacheMs]                     automatic check reuse window
 */
export function createManagementViewModel({ callTool, onInventory = () => {}, now = () => Date.now(), cacheMs = 60000 }) {
  const state = {
    data: null, view: 'activity', section: 'inventory', inventoryKind: 'plugins',
    source: '', search: '', pluginFilter: '', pluginSearch: '', reportFilter: '', reportSearch: '', reportDays: 90,
    busy: false, plan: null, feedback: null,
    check: { at: 0, loading: false, error: null },
    deferred: new Set(), expanded: new Set(), drafts: new Map(),
  };
  const listeners = new Set();
  const emit = () => { for (const listener of [...listeners]) listener(state); };
  const set = (patch, notify = true) => { Object.assign(state, patch); if (notify) emit(); };
  const merge = value => value.inventoryScope === 'management' ? { ...state.data, ...value, redundancy: value.redundancy } : value;

  /** Automatic status check for the Manage page (inventory status, or the redundancy report). */
  async function check(force = false) {
    const c = state.check;
    if (state.view !== 'manage' || state.busy || c.loading || (!force && c.at && now() - c.at < cacheMs)) return;
    c.loading = true; c.error = null; emit();
    const reportRequested = state.section === 'redundancy';
    try {
      const result = await callTool(reportRequested ? { name: 'generate_redundancy_report', arguments: { days: state.reportDays } } : { name: 'check_plugin_status', arguments: {} });
      if (result.isError) throw failure('check-failed', serverMessage(result));
      const value = result.structuredContent;
      if (value?.mode !== 'inventory') throw failure('inventory-unavailable');
      state.data = merge(value);
      onInventory(result);
    } catch (error) { c.error = { code: error.code || 'check-failed', message: error.serverMessage ?? null }; }
    finally {
      c.at = now(); c.loading = false; emit();
      // Entering the report while an inventory check ran: fetch the report once that check succeeds.
      if (state.view === 'manage' && state.section === 'redundancy' && !reportRequested && !c.error && !state.data?.redundancy) void check(true);
    }
  }

  /** Runs one user action at a time; returns the tool result, or undefined when it did not complete. */
  async function run(name, args = {}) {
    if (state.busy || state.check.loading) return;
    set({ busy: true, feedback: { kind: 'working' } });
    try {
      const result = await callTool({ name, arguments: args });
      if (result.isError) throw failure('action-failed', serverMessage(result));
      const value = result.structuredContent;
      if (value?.mode === 'inventory') { state.data = value; onInventory(result); }
      if (value?.mode === 'management-plan') state.plan = value.plan;
      if (name === 'execute_skill_plan' || name === 'cancel_skill_plan') state.plan = null;
      state.feedback = { kind: 'done' };
      return result;
    } catch (error) { state.feedback = { kind: 'failed', code: error.code || 'action-failed', message: error.code ? error.serverMessage : error.message }; }
    finally { set({ busy: false }); }
  }

  return {
    get state() { return state; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },

    /** Inventory pushed from elsewhere; a running check redraws when it finishes. */
    receiveInventory(value) { set({ data: merge(value) }, !state.check.loading); },
    check,

    // ---- navigation ----
    showPage(view) { set({ view }); void check(); },
    showSection(section) { set({ section }); if (section === 'redundancy' && !state.data?.redundancy) void check(true); },
    showKind(inventoryKind) { set({ inventoryKind, reportFilter: '' }); },

    // ---- filters (search boxes update silently) ----
    selectSource(source) { set({ source, search: '' }); },
    setSearch(search) { set({ search }, false); },
    selectPluginFilter(pluginFilter) { set({ pluginFilter }); },
    setPluginSearch(pluginSearch) { set({ pluginSearch }, false); },
    selectReportFilter(reportFilter) { set({ reportFilter }); },
    setReportSearch(reportSearch) { set({ reportSearch }, false); },
    toggleDeferred(id) { if (state.deferred.has(id)) state.deferred.delete(id); else state.deferred.add(id); emit(); },
    setExpanded(id, open) { if (open) state.expanded.add(id); else state.expanded.delete(id); },

    // ---- notes ----
    draftFor(skill) {
      return state.drafts.get(skill.id) || { note: skill.annotation?.note || '', retain: Boolean(skill.annotation?.retain), expectedRevision: skill.annotation?.revision || 0, fingerprint: skill.fingerprint };
    },
    keepDraft(id, draft) { state.drafts.set(id, draft); },
    hasDraft: id => state.drafts.has(id),
    async saveNote(skill) {
      const result = await run('save_skill_note', { id: skill.id, ...this.draftFor(skill) });
      if (result) { state.drafts.delete(skill.id); emit(); }
    },
    async discardDraft(skill) { state.drafts.delete(skill.id); await run('open_skill_manager'); },
    async toggleRetain(member) {
      const result = await run('save_skill_note', { id: member.id, fingerprint: member.fingerprint, note: member.annotation?.note || '', retain: !member.annotation?.retain, expectedRevision: member.annotation?.revision || 0 });
      if (result) void check(true);
    },

    // ---- archive plan ----
    previewArchive: skillId => run('preview_skill_archive', { skillId }),
    previewRestore: archiveId => run('preview_skill_restore', { archiveId }),
    confirmPlan() { return run('execute_skill_plan', { token: state.plan.token }); },
    cancelPlan() { return run('cancel_skill_plan', { token: state.plan.token }); },
    planExpired: () => Boolean(state.plan) && now() >= state.plan.expiresAt,

    // ---- selectors (presentation logic only) ----
    isPersonalSource,
    sourceGroups() {
      const skills = state.data?.skills || [], groups = ['personal', 'system', 'plugins'];
      if (skills.some(s => sourceGroup(s) === 'other')) groups.push('other');
      return [...groups, ''].map(group => ({ group, total: group ? skills.filter(s => sourceGroup(s) === group).length : skills.length }));
    },
    skillMatches() {
      const category = (state.data?.skills || []).filter(s => !state.source || sourceGroup(s) === state.source);
      const query = state.search.toLowerCase();
      return { category, matches: category.filter(s => `${s.name} ${s.description} ${s.path} ${s.owner?.name || ''}`.toLowerCase().includes(query)) };
    },
    pluginEntries() {
      const entries = new Map();
      for (const record of state.data?.pluginRegistry?.plugins || []) {
        if (!entries.has(record.id)) entries.set(record.id, { id: record.id, records: [], skills: [] });
        entries.get(record.id).records.push(record);
      }
      for (const skill of state.data?.skills || []) {
        if (!skill.owner) continue;
        const id = `${skill.owner.directory || skill.owner.name}@${skill.owner.marketplace}`;
        if (!entries.has(id)) entries.set(id, { id, records: [], skills: [] });
        entries.get(id).skills.push(skill);
      }
      return [...entries.values()].map(entry => {
        const states = new Set(entry.records.map(r => r.enabled));
        const pluginState = !entry.records.length ? 'cache' : states.size !== 1 ? 'unknown' : states.has(true) ? 'enabled' : states.has(false) ? 'disabled' : 'unknown';
        const displayName = entry.records.find(r => r.displayName)?.displayName || entry.skills.find(s => s.owner.name)?.owner.name || entry.id.split('@')[0];
        const icon = entry.id.split('@')[0] === 'plugin-skill-manager' && state.data?.managerIcon ? state.data.managerIcon : entry.records.find(r => r.icon)?.icon;
        const iconDark = entry.records.find(r => r.iconDark)?.iconDark;
        return { ...entry, state: pluginState, displayName, icon, iconDark };
      }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    },
    pluginMatches(entries) {
      const category = entries.filter(p => state.pluginFilter ? p.state === state.pluginFilter : p.records.length);
      const query = state.pluginSearch.toLowerCase();
      return { category, matches: category.filter(p => `${p.displayName} ${p.id} ${p.records.map(r => r.version).join(' ')} ${p.skills.map(s => s.owner.version).join(' ')}`.toLowerCase().includes(query)) };
    },
    /** Report groups and inactivity lists for the selected inventory kind and filter. */
    reportView() {
      const report = state.data?.redundancy;
      if (!report) return null;
      const kind = state.inventoryKind, groups = report[kind] || [];
      const idle = report.inactivity?.[kind] || [];
      const inactive = idle.filter(m => m.state === 'inactive');
      const pending = idle.filter(m => ['insufficient-history', 'records-unavailable'].includes(m.state));
      const visible = (g, filter) => filter === 'deferred' ? state.deferred.has(g.id) : !state.deferred.has(g.id) && (!filter || g.types.includes(filter));
      const count = id => id === 'inactive' ? inactive.length : id === 'insufficient' ? pending.length : groups.filter(g => visible(g, id)).length + (!id ? inactive.length : 0);
      const query = state.reportSearch.toLowerCase();
      const matches = () => groups.filter(g => visible(g, state.reportFilter) && JSON.stringify(g.members.map(m => [m.name, m.path, m.pluginId, m.owner])).toLowerCase().includes(query));
      return { report, isSkill: kind === 'skills', groups, inactive, pending, count, matches };
    },
  };
}
