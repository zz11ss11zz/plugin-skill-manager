// Management is a separate view; the activity homepage stays focused on counts.
export function createManagementPanel(root, callTool, onInventory, initialLocale = 'zh') {
  let locale = initialLocale, data = null, view = 'activity', busy = false, plan = null;
  let search = '', source = '', inventoryKind = 'plugins', pluginSearch = '', pluginFilter = '';
  const checks = { manage: { at: 0, error: '', loading: false } };
  async function checkView(force = false) {
    const target = view, check = checks[target];
    if (!check || busy || check.loading || (!force && check.at && Date.now() - check.at < 60000)) return;
    check.loading = true; check.error = ''; render();
    try {
      const result = await callTool({ name: 'check_plugin_status', arguments: {} });
      if (result.isError) throw new Error(result.content?.find(c => c.type === 'text')?.text || text('检查失败', 'Check failed'));
      const value = result.structuredContent;
      if (value?.mode !== 'inventory') throw new Error(text('清单暂不可读取', 'Inventory unavailable'));
      data = value.inventoryScope === 'management' ? { ...data, ...value } : value;
      onInventory(result);
    } catch (error) { check.error = error.message; }
    finally { check.at = Date.now(); check.loading = false; render(); }
  }
  function renderCheck() {
    const check = checks[view];
    if (check.loading) body.append(el('p', text('正在自动检查…', 'Checking automatically…'), 'manager-meta'));
    else if (check.error) {
      const warning = el('div'); warning.setAttribute('role', 'status');
      warning.append(el('p', text('自动检查未完成：', 'Automatic check failed: ') + check.error), button(text('重试检查', 'Retry check'), () => checkView(true)));
      body.append(warning);
    }
  }
  const drafts = new Map();
  const text = (zh, en) => locale === 'en' ? en : zh;
  const el = (tag, content, cls) => { const node = document.createElement(tag); if (content) node.textContent = content; if (cls) node.className = cls; return node; };
  const nav = el('nav', '', 'manager-nav'), body = el('section', '', 'manager-body'), feedback = el('p', '', 'manager-feedback');
  nav.setAttribute('aria-label', text('管理器页面', 'Manager views')); feedback.setAttribute('role', 'status');
  root.append(nav, body, feedback);
  const activity = document.querySelector('#activity-panel');
  function button(label, action, disabled = false) {
    const node = el('button', label); node.type = 'button'; node.disabled = disabled || busy;
    node.addEventListener('click', action); return node;
  }
  async function invoke(name, args = {}) {
    if (busy || checks.manage.loading) return;
    busy = true; feedback.textContent = text('正在处理…', 'Working…'); render();
    try {
      const result = await callTool({ name, arguments: args });
      if (result.isError) throw new Error(result.content?.find(c => c.type === 'text')?.text || text('操作失败', 'Operation failed'));
      const value = result.structuredContent;
      if (value?.mode === 'inventory') { data = value; onInventory(result); }
      if (value?.mode === 'management-plan') plan = value.plan;

      if (name === 'execute_skill_plan' || name === 'cancel_skill_plan') plan = null;
      feedback.textContent = text('已完成。', 'Done.');
      return result;
    } catch (error) { feedback.textContent = text('操作未完成：', 'Action not completed: ') + error.message; }
    finally { busy = false; render(); }
  }
  function renderNav() {
    nav.setAttribute('aria-label', text('管理器页面', 'Manager views'));
    nav.replaceChildren();
    for (const [id, label] of [['activity', text('活动', 'Activity')], ['manage', text('管理', 'Manage')]]) {
      const tab = button(label, () => { view = id; render(); void checkView(); });
      tab.setAttribute('aria-pressed', String(view === id)); nav.append(tab);
    }
    activity.hidden = view !== 'activity'; body.hidden = view === 'activity';
  }
  function renderPlan() {
    if (!plan) return;
    const block = el('section', '', 'manager-plan'); block.setAttribute('aria-label', text('操作预览', 'Operation preview'));
    block.append(el('h3', `${text('操作预览', 'Operation preview')}: ${plan.title}`));
    const from = plan.action === 'archive' ? plan.original : plan.destination, to = plan.action === 'archive' ? plan.destination : plan.original;
    block.append(el('p', text('从：', 'From: ') + from), el('p', text('到：', 'To: ') + to));
    block.append(el('p', `${plan.files} ${text('个文件', 'files')}, ${plan.bytes} bytes`));
    block.append(el('p', plan.action === 'archive' ? text('整个技能目录将移出扫描位置，可恢复。已运行的会话可能仍持有旧内容。', 'The entire skill folder moves out of the scan location and can be restored. Running chats may retain its old contents.') : text('移回原位置；已有目录不会被覆盖。', 'Move back to its original location without overwriting an existing folder.')));
    block.append(button(plan.action === 'archive' ? text('确认归档', 'Confirm archive') : text('确认恢复', 'Confirm restore'), () => invoke('execute_skill_plan', { token: plan.token }), Date.now() >= plan.expiresAt));
    block.append(button(text('取消', 'Cancel'), () => invoke('cancel_skill_plan', { token: plan.token })));
    body.append(block);
  }
  function renderList(list, count) {
    list.replaceChildren();
    const category = (data?.skills || []).filter(s => !source || sourceGroup(s) === source);
    const matches = category.filter(s => `${s.name} ${s.description} ${s.path} ${s.owner?.name || ''}`.toLowerCase().includes(search.toLowerCase()));
    count.textContent = search ? text(`显示 ${matches.length} / ${category.length} 个 Skill 文件`, `Showing ${matches.length} of ${category.length} Skill ${category.length === 1 ? 'file' : 'files'}`) : text(`${matches.length} 个 Skill 文件`, `${matches.length} Skill ${matches.length === 1 ? 'file' : 'files'}`);
    for (const skill of matches) {
      const item = el('li'), heading = el('h3', skill.name), meta = el('p', sourceLabel(skill.source), 'manager-meta');
      item.append(heading, meta, el('p', skill.description));
      const details = el('details'); details.append(el('summary', text('来源与备注', 'Source and notes')), el('p', skill.path));
      if (skill.owner) details.append(el('p', `${skill.owner.name} / ${skill.owner.version} / ${skill.owner.marketplace}`));
      details.append(el('p', skill.owner ? skill.pluginStatus?.enabled === true ? text('同版本插件已安装并启用；当前会话是否加载未知。', 'Matching plugin installed and enabled; current-chat loading is unknown.') : text('插件缓存候选；安装或启用状态未确认。', 'Cached plugin candidate; installation or enablement is unconfirmed.') : text('本地文件存在；当前会话是否加载未知。', 'Local file exists; current-chat loading is unknown.')));
      const draft = drafts.get(skill.id) || { note: skill.annotation?.note || '', retain: Boolean(skill.annotation?.retain), expectedRevision: skill.annotation?.revision || 0, fingerprint: skill.fingerprint };
      const label = el('label', text('本地备注', 'Local note')), note = el('textarea'); note.value = draft.note; note.maxLength = 1000; note.disabled = busy || !data.notesAvailable;
      note.addEventListener('input', () => { draft.note = note.value; drafts.set(skill.id, draft); }); label.append(note);
      const retainLabel = el('label'), retain = el('input'); retain.type = 'checkbox'; retain.checked = draft.retain; retain.disabled = note.disabled;
      retain.addEventListener('change', () => { draft.retain = retain.checked; drafts.set(skill.id, draft); }); retainLabel.append(retain, document.createTextNode(text('标记保留', 'Mark to retain')));
      details.append(label, retainLabel, button(text('保存备注', 'Save note'), async () => {
        const result = await invoke('save_skill_note', { id: skill.id, ...draft });
        if (result) { drafts.delete(skill.id); render(); }
      }, !data.notesAvailable));
      if (drafts.has(skill.id)) details.append(button(text('放弃草稿并重新读取', 'Discard draft and reload'), async () => { drafts.delete(skill.id); await invoke('open_skill_manager'); }));
      if (skill.annotation?.contentChanged) details.append(el('p', text('技能内容已变化，请检查旧备注。', 'Skill content changed; review the saved note.')));
      const manageable = ['用户技能', '用户 .agents 技能'].includes(skill.source) && data.managementSupported;
      if (manageable) details.append(button(text('预览归档', 'Preview archive'), () => invoke('preview_skill_archive', { skillId: skill.id }), Boolean(plan)));
      else details.append(el('p', text('此来源或当前平台不支持归档。', 'Archiving is unavailable for this source or platform.')));
      item.append(details); list.append(item);
    }
    if (!matches.length) list.append(el('p', text('没有匹配项。可清空搜索或更换来源。', 'No matches. Clear the search or choose another source.')));
  }
  function sourceLabel(value) {
    const labels = { '用户技能': 'User skill', '用户 .agents 技能': 'User .agents skill', '系统技能': 'System skill', '插件技能': 'Plugin skill', '插件缓存': 'Plugin cache', '插件缓存技能': 'Plugin cache' };
    return locale === 'en' ? labels[value] || value : value;
  }
  function sourceGroup(skill) {
    if (['用户技能', '用户 .agents 技能'].includes(skill.source)) return 'personal';
    if (skill.source === '系统技能') return 'system';
    if (skill.owner || ['插件技能', '插件缓存', '插件缓存技能'].includes(skill.source)) return 'plugins';
    return 'other';
  }
  function groupLabel(group) {
    return ({personal:text('个人技能', 'Personal skills'),system:text('系统技能', 'System skills'),plugins:text('插件缓存中的技能', 'Skills in plugin cache'),other:text('其他来源', 'Other sources'),'':text('全部 Skill', 'All Skills')})[group];
  }
  function renderSources() {
    const skills = data?.skills || [], groups = ['personal', 'system', 'plugins'];
    if (skills.some(s => sourceGroup(s) === 'other')) groups.push('other');
    const summary = el('div', '', 'manager-actions inventory-filters');
    summary.setAttribute('aria-label', text('按来源查看 Skill', 'Browse Skills by source'));
    for (const group of [...groups, '']) {
      const total = group ? skills.filter(s => sourceGroup(s) === group).length : skills.length;
      const label = group ? groupLabel(group) : text('合计', 'Total');
      const action = button('', () => {
        source = group; search = ''; render();
        body.querySelector?.(`[data-source="${group}"]`)?.focus();
      });
      action.className = 'source-choice'; action.setAttribute('data-source', group);
      action.setAttribute('aria-pressed', String(source === group));
      action.setAttribute('aria-label', text(`${label}，${total} 个 Skill 文件`, `${label}, ${total} Skill ${total === 1 ? 'file' : 'files'}`));
      action.append(el('span', label), el('span', String(total), 'source-count'));
      summary.append(action);
    }
    body.append(summary);
    body.append(el('p', text('点击来源查看下方列表。缓存中的技能不代表插件当前已启用。', 'Choose a source to filter the list below. Cached Skills do not confirm that a plugin is enabled.'), 'manager-meta'));
  }
  function pluginEntries() {
    const entries = new Map();
    for (const record of data?.pluginRegistry?.plugins || []) {
      if (!entries.has(record.id)) entries.set(record.id, { id: record.id, records: [], skills: [] });
      entries.get(record.id).records.push(record);
    }
    for (const skill of data?.skills || []) {
      if (!skill.owner) continue;
      const id = `${skill.owner.directory || skill.owner.name}@${skill.owner.marketplace}`;
      if (!entries.has(id)) entries.set(id, { id, records: [], skills: [] });
      entries.get(id).skills.push(skill);
    }
    return [...entries.values()].map(entry => {
      const states = new Set(entry.records.map(r => r.enabled));
      const state = !entry.records.length ? 'cache' : states.size !== 1 ? 'unknown' : states.has(true) ? 'enabled' : states.has(false) ? 'disabled' : 'unknown';
      const displayName = entry.records.find(r => r.displayName)?.displayName || entry.skills.find(s => s.owner.name)?.owner.name || entry.id.split('@')[0];
      const icon = entry.id.split('@')[0] === 'plugin-skill-manager' && data?.managerIcon ? data.managerIcon : entry.records.find(r => r.icon)?.icon;
      const iconDark = entry.records.find(r => r.iconDark)?.iconDark;
      return { ...entry, state, displayName, icon, iconDark };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  function pluginStateLabel(state) {
    return {enabled:text('已启用', 'Enabled'),disabled:text('已停用', 'Disabled'),unknown:text('状态未知', 'Unknown'),cache:text('仅缓存候选', 'Cache candidates')}[state];
  }
  function renderPlugins() {
    const entries = pluginEntries(), verified = Boolean(data?.pluginRegistry);
    const summary = el('div', '', 'manager-actions inventory-filters');
    summary.setAttribute('aria-label', text('插件状态筛选', 'Filter plugin status'));
    for (const state of ['', 'enabled', 'disabled', 'unknown', 'cache']) {
      const count = entries.filter(p => state ? p.state === state : p.records.length).length;
      const label = state ? pluginStateLabel(state) : text('已安装', 'Installed');
      const action = button(`${label} · ${!verified && state !== 'cache' ? '—' : count}`, () => { pluginFilter = state; render(); });
      action.setAttribute('aria-pressed', String(pluginFilter === state));
      action.setAttribute('data-plugin-filter', state); summary.append(action);
    }
    body.append(summary);
    body.append(el('p', verified
      ? text(`最近核验：${data.pluginRegistry.checkedAt}。插件按唯一 ID 计数；已启用不代表当前会话已加载。`, `Last checked: ${data.pluginRegistry.checkedAt}. Plugins count unique IDs; enabled does not confirm loading in this chat.`)
      : text('安装清单尚未核验。缓存候选不代表已安装；未知数量不记为零。', 'Installation inventory is unverified. Cache candidates do not confirm installation; unknown counts are not zero.'), 'manager-meta'));
    if (checks.manage.error && verified) body.append(el('p', text('以下保留上次核验结果，可能已过期。', 'Showing the previous check; results may be stale.'), 'manager-meta'));
    const label = el('label', text('搜索插件', 'Search plugins'), 'inventory-search'), input = el('input');
    input.type = 'search'; input.value = pluginSearch; input.placeholder = text('名称、市场或版本', 'Name, marketplace or version'); label.append(input); body.append(label);
    const count = el('p', '', 'manager-meta'), list = el('ul', '', 'manager-list');
    count.setAttribute('aria-live', 'polite'); body.append(count, list);
    const populate = () => {
      list.replaceChildren();
      const category = entries.filter(p => pluginFilter ? p.state === pluginFilter : p.records.length);
      const matches = category.filter(p => `${p.displayName} ${p.id} ${p.records.map(r => r.version).join(' ')} ${p.skills.map(s => s.owner.version).join(' ')}`.toLowerCase().includes(pluginSearch.toLowerCase()));
      count.textContent = text(`显示 ${matches.length} / ${category.length} 个插件`, `Showing ${matches.length} of ${category.length} plugins`);
      for (const plugin of matches) {
        const item = el('li'), at = plugin.id.lastIndexOf('@');
        const heading = el('div', '', 'plugin-heading'), badge = el('span', '', 'plugin-icon');
        if (['codex-app-tools@openai-bundled', 'unified-computer-use@openai-bundled'].includes(plugin.id)) badge.setAttribute('data-openai-mark', 'true');
        badge.setAttribute('aria-hidden', 'true');
        const fallback = el('span', plugin.displayName.slice(0, 1).toUpperCase()); badge.append(fallback);
        if (typeof plugin.icon === 'string' && (/^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(plugin.icon) || /^https:\/\/files\.openai\.com\//.test(plugin.icon))) {
          const image = el('img'); image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
          image.addEventListener('load', () => { fallback.hidden = true; });
          image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; });
          image.src = plugin.icon;
          if (typeof plugin.iconDark === 'string' && (/^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(plugin.iconDark) || /^https:\/\/files\.openai\.com\//.test(plugin.iconDark))) {
            const picture = el('picture'), dark = el('source'); dark.media = '(prefers-color-scheme: dark)'; dark.srcset = plugin.iconDark; picture.append(dark, image); badge.append(picture);
          } else badge.append(image);
        }
        heading.append(badge, el('h3', plugin.displayName)); item.append(heading);
        item.append(el('p', `${at < 0 ? '—' : plugin.id.slice(at + 1)} · ${pluginStateLabel(plugin.state)}`, 'manager-meta'));
        const details = el('details'); details.append(el('summary', text('版本与关联技能', 'Versions and associated Skills')), el('p', plugin.id));
        for (const record of plugin.records) details.append(el('p', `${record.version} · ${pluginStateLabel(record.enabled === true ? 'enabled' : record.enabled === false ? 'disabled' : 'unknown')}`));
        const matching = plugin.skills.filter(s => plugin.records.some(r => r.version === s.owner.version));
        const cached = plugin.skills.filter(s => !plugin.records.some(r => r.version === s.owner.version));
        details.append(el('p', text(`匹配安装版本的 Skill 文件：${matching.length}`, `Skill files matching installed versions: ${matching.length}`)));
        if (!matching.length) details.append(el('p', text('未扫描到匹配的 Skill 文件；插件可能仅提供工具或其他能力。', 'No matching Skill files were scanned; this plugin may provide tools or other capabilities.')));
        for (const skill of matching) details.append(el('p', `${skill.name} · ${skill.owner.version} · ${skill.path}`));
        if (cached.length) {
          details.append(el('p', text(`未匹配安装版本的缓存 Skill 文件：${cached.length}`, `Cached Skill files without matching installed versions: ${cached.length}`)));
          for (const skill of cached) details.append(el('p', `${skill.name} · ${skill.owner.version} · ${skill.path}`));
        }
        item.append(details); list.append(item);
      }
      if (!matches.length) list.append(el('p', !verified && pluginFilter !== 'cache' ? text('等待安装状态核验。', 'Awaiting installation status verification.') : text('没有匹配的插件。', 'No matching plugins.')));
    };
    input.addEventListener('input', () => { pluginSearch = input.value; populate(); }); populate();
  }
  function render() {
    renderNav(); body.replaceChildren(); if (view === 'activity') return;
    const toolbar = el('div', '', 'manager-toolbar'), actions = el('div', '', 'manager-actions');
    actions.append(button(checks.manage.loading ? text('刷新中…', 'Refreshing…') : text('刷新清单', 'Refresh inventory'), () => checkView(true), checks.manage.loading));
    const tabs = el('div', '', 'manager-actions');
    tabs.setAttribute('aria-label', text('清单类型', 'Inventory type'));
    for (const [kind, label] of [['plugins', text('插件', 'Plugins')], ['skills', text('技能', 'Skills')]]) {
      const action = button(label, () => { inventoryKind = kind; render(); });
      action.setAttribute('aria-pressed', String(inventoryKind === kind)); tabs.append(action);
    }
    body.append(tabs);
    toolbar.append(el('h2', inventoryKind === 'plugins' ? text('插件清单', 'Plugin inventory') : text('技能清单', 'Skill inventory')), actions); body.append(toolbar);
    renderCheck();
    if (inventoryKind === 'plugins') { renderPlugins(); return; }
    renderPlan();
    renderSources();
    const searchLabel = el('label', text('搜索技能', 'Search skills'), 'inventory-search'), input = el('input');
    input.type = 'search'; input.value = search; searchLabel.append(input);
    input.placeholder = text('名称、说明或路径', 'Name, description or path');
    const count = el('p', '', 'manager-meta'), list = el('ul', '', 'manager-list');
    count.setAttribute('aria-live', 'polite');
    input.addEventListener('input', () => { search = input.value; renderList(list, count); });
    body.append(searchLabel, count, list); renderList(list, count);
    body.append(el('h2', text('归档记录', 'Archives')));
    for (const archive of data?.archives || []) {
      const row = el('div', '', 'archive-row'); row.append(el('strong', archive.title), el('p', archive.original || archive.id), el('p', archive.status));
      if (archive.status === 'archived') row.append(button(text('预览恢复', 'Preview restore'), () => invoke('preview_skill_restore', { archiveId: archive.id }), Boolean(plan)));
      body.append(row);
    }
    if (!data?.archives?.length) body.append(el('p', text('尚无归档。', 'No archives yet.')));
    if (data?.issues?.length) { const issues = el('details'); issues.append(el('summary', text(`扫描问题：${data.issues.length}`, `Scan issues: ${data.issues.length}`))); for (const issue of data.issues) issues.append(el('p', `${issue.path}: ${issue.reason}`)); body.append(issues); }
  }
  const update = value => {
    data = value.inventoryScope === 'management' ? { ...data, ...value } : value;
    if (!checks.manage.loading) render();
  };
  update.isManaging = () => view === 'manage';
  update.setLocale = value => { locale = value; render(); };
  render(); return update;
}

