// Management is a separate view; the activity homepage stays focused on counts.
export function createManagementPanel(root, callTool, onInventory, initialLocale = 'zh') {
  let locale = initialLocale, data = null, view = 'activity', busy = false, plan = null, recording = null;
  let search = '', source = '';
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
    if (busy) return;
    busy = true; feedback.textContent = text('正在处理…', 'Working…'); render();
    try {
      const result = await callTool({ name, arguments: args });
      if (result.isError) throw new Error(result.content?.find(c => c.type === 'text')?.text || text('操作失败', 'Operation failed'));
      const value = result.structuredContent;
      if (value?.mode === 'inventory') { data = value; onInventory(result); }
      if (value?.mode === 'management-plan') plan = value.plan;
      if (value?.mode === 'recording-status') recording = value;
      if (name === 'execute_skill_plan' || name === 'cancel_skill_plan') plan = null;
      feedback.textContent = text('已完成。', 'Done.');
      return result;
    } catch (error) { feedback.textContent = text('操作未完成：', 'Action not completed: ') + error.message; }
    finally { busy = false; render(); }
  }
  function renderNav() {
    nav.replaceChildren();
    for (const [id, label] of [['activity', text('活动', 'Activity')], ['manage', text('管理', 'Manage')], ['setup', text('接入', 'Setup')]]) {
      const tab = button(label, () => { view = id; render(); });
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
    const matches = (data?.skills || []).filter(s => (!source || s.source === source) && `${s.name} ${s.description} ${s.path} ${s.owner?.name || ''}`.toLowerCase().includes(search.toLowerCase()));
    count.textContent = text(`匹配 ${matches.length} 个文件实例`, `${matches.length} matching file instances`);
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
    const labels = { '用户技能': 'User skill', '用户 .agents 技能': 'User .agents skill', '系统技能': 'System skill', '插件技能': 'Plugin skill', '插件缓存': 'Plugin cache' };
    return locale === 'en' ? labels[value] || 'Plugin cache' : value;
  }
  function render() {
    renderNav(); body.replaceChildren(); if (view === 'activity') return;
    if (view === 'setup') {
      body.append(el('h2', text('记录接入', 'Recording setup')), el('p', text('只统计调用方主动报送的记录，不自动监听所有会话。空记录不代表没有活动。', 'Counts include caller-reported records only. Other chats are not monitored automatically; empty records do not mean no activity.')));
      body.append(button(text('检查记录状态', 'Check recording status'), () => invoke('check_recording_status')));
      if (recording) for (const [key, label] of [['adoptions', text('Skill 采用', 'Skill adoptions')], ['pluginCalls', text('插件调用尝试', 'Plugin call attempts')]]) {
        const r = recording[key];
        body.append(el('p', `${label}: ${r.state === 'unavailable' ? text('暂不可读取', 'Unavailable') : r.state === 'empty' ? text('尚未收到记录', 'No records received') : `${r.count} / ${text('最近接收', 'Latest received')}: ${r.latestReceivedAt}`}`));
      }
      body.append(el('p', text('请在聊天中运行本插件的 setup Skill，检查服务并为选定项目配置记录约定。仅安装插件不会自动修改你的个人规则。', 'Run this plugin’s setup Skill in chat to check the service and configure recording for your chosen project. Installing the plugin does not change your personal instructions.')));
      return;
    }
    body.append(el('h2', text('技能清单', 'Skill inventory')));
    body.append(button(text('刷新清单', 'Refresh inventory'), () => invoke('open_skill_manager')), button(text('核对插件状态', 'Check plugin status'), () => invoke('check_plugin_status')));
    renderPlan();
    const filters = el('div', '', 'manager-filters'), searchLabel = el('label', text('搜索名称、说明或路径', 'Search name, description or path')), input = el('input');
    input.type = 'search'; input.value = search; searchLabel.append(input);
    const sourceLabelNode = el('label', text('来源', 'Source')), select = el('select');
    select.setAttribute('aria-label', text('来源', 'Source'));
    for (const value of ['', ...new Set((data?.skills || []).map(s => s.source))]) { const option = el('option', value ? sourceLabel(value) : text('全部来源', 'All sources')); option.value = value; select.append(option); }
    select.value = source; sourceLabelNode.append(select); filters.append(searchLabel, sourceLabelNode);
    const count = el('p', '', 'manager-meta'), list = el('ul', '', 'manager-list');
    input.addEventListener('input', () => { search = input.value; renderList(list, count); });
    select.addEventListener('change', () => { source = select.value; renderList(list, count); });
    body.append(filters, count, list); renderList(list, count);
    body.append(el('h2', text('归档记录', 'Archives')));
    for (const archive of data?.archives || []) {
      const row = el('div', '', 'archive-row'); row.append(el('strong', archive.title), el('p', archive.original || archive.id), el('p', archive.status));
      if (archive.status === 'archived') row.append(button(text('预览恢复', 'Preview restore'), () => invoke('preview_skill_restore', { archiveId: archive.id }), Boolean(plan)));
      body.append(row);
    }
    if (!data?.archives?.length) body.append(el('p', text('尚无归档。', 'No archives yet.')));
    if (data?.issues?.length) { const issues = el('details'); issues.append(el('summary', text(`扫描问题：${data.issues.length}`, `Scan issues: ${data.issues.length}`))); for (const issue of data.issues) issues.append(el('p', `${issue.path}: ${issue.reason}`)); body.append(issues); }
  }
  const update = value => { data = value; render(); };
  update.setLocale = value => { locale = value; render(); };
  render(); return update;
}
