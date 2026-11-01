// Management is a separate view; the activity homepage stays focused on counts.
export function createManagementPanel(root, callTool, onInventory, initialLocale = 'zh') {
  let locale = initialLocale, data = null, view = 'activity', busy = false, plan = null;
  let search = '', source = '', inventoryKind = 'plugins', pluginSearch = '', pluginFilter = '';
  let section = 'inventory', reportFilter = '', reportSearch = '', reportDays = 90;
  const deferred = new Set(), expanded = new Set();
  const checks = { manage: { at: 0, error: '', loading: false } };
  async function checkView(force = false) {
    const target = view, check = checks[target];
    if (!check || busy || check.loading || (!force && check.at && Date.now() - check.at < 60000)) return;
    check.loading = true; check.error = ''; render();
    const reportRequested = section === 'redundancy';
    try {
      const result = await callTool({ name: 'check_plugin_status', arguments: section === 'redundancy' ? {includeReport:true, days:reportDays} : {} });
      if (result.isError) throw new Error(result.content?.find(c => c.type === 'text')?.text || text('检查失败', 'Check failed'));
      const value = result.structuredContent;
      if (value?.mode !== 'inventory') throw new Error(text('清单暂不可读取', 'Inventory unavailable'));
      data = value.inventoryScope === 'management' ? { ...data, ...value, redundancy:value.redundancy } : value;
      onInventory(result);
    } catch (error) { check.error = error.message; }
    finally { check.at = Date.now(); check.loading = false; render(); if(view==='manage'&&section==='redundancy'&&!reportRequested&&!check.error&&!data?.redundancy)void checkView(true); }
  }
  function renderCheck() {
    const check = checks[view];
    if (check.loading) body.append(el('p', section==='redundancy'?text('正在核对清单并比较候选…','Checking inventory and comparing candidates…'):text('正在自动检查…', 'Checking automatically…'), 'manager-meta'));
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
  function renderReport() {
    const report = data?.redundancy;
    body.append(el('p', text('候选不是删除建议。相同文档不等于完整 Skill 相同；插件还可能提供独有工具。', 'Candidates are not removal recommendations. Identical documents do not imply identical Skills; plugins may provide unique tools.'), 'manager-meta'));
    if (!report) {
      body.append(el('p', text('尚未生成报告。只读比较文件，不执行技能脚本。', 'No report yet. Comparison reads files without executing Skill scripts.')),
        button(text('生成候选报告','Generate candidate report'), () => checkView(true),checks.manage.loading)); return;
    }
    const isSkill = inventoryKind === 'skills', groups = report[inventoryKind] || [];
    if(report.pluginStatusFresh===false)body.append(el('p',text('插件安装状态核验未完成。下方旧状态可能过期；本地文件比较仍可查看。','Plugin status verification failed. Previous states may be stale; local file comparisons remain available.'),'manager-meta'));
    body.append(el('p', text(`核验时间：${report.checkedAt} · 已比较 ${report.limits.directoriesScanned} 个技能目录`, `Checked: ${report.checkedAt} · ${report.limits.directoriesScanned} Skill directories compared`), 'manager-meta'));
    const types = isSkill ? [['documents',text('相同文档','Identical documents')],['names',text('同名差异','Same-name differences')],['overlap',text('功能重叠线索','Overlap clues')]] : [['versions',text('来源／版本候选','Source / version candidates')]];
    const filters=el('div','','manager-actions report-filters');
    for (const [id,label] of [['',text('全部','All')],...types,['inactive',text('长期无记录','Long-term inactivity')],['deferred',text('本次暂缓','Deferred this session')]]) {
      const count = id === 'inactive' ? '—' : groups.filter(g=>id==='deferred'?deferred.has(g.id):!deferred.has(g.id)&&(!id||g.types.includes(id))).length;
      const b=button(`${label} · ${count}`,()=>{reportFilter=id;render();}); b.setAttribute('aria-pressed',String(reportFilter===id));filters.append(b);
    }
    body.append(filters);
    if(reportFilter==='inactive') {
      const label=el('label',text('观察窗口','Observation window')), select=el('select');
      for(const n of [30,60,90]) {const option=el('option',text(`近 ${n} 天`,`Last ${n} days`));option.value=String(n);select.append(option);}select.value=String(reportDays);
      select.disabled=checks.manage.loading;select.addEventListener('change',()=>{reportDays=Number(select.value);void checkView(true);});label.append(select);body.append(label);
      body.append(el('p',text('覆盖待积累：当前没有连续监测区间和项目首次出现时间，不能确认哪些项目长期未用。记录起止时间不作为连续覆盖，零记录不列为清理候选。','Coverage needs evidence: continuous monitoring intervals and first-seen dates are unavailable. Record timestamps do not establish continuous coverage; zero records are not cleanup candidates.')));
      body.append(el('p',text('Skill 采用依赖主动报送；插件调用记录不能替代 Skill 使用证据。','Skill adoptions rely on explicit reporting; plugin calls do not establish Skill usage.'),'manager-meta'));return;
    }
    const searchLabel=el('label',text('搜索候选','Search candidates'),'inventory-search'), input=el('input');input.type='search';input.value=reportSearch;searchLabel.append(input);body.append(searchLabel);
    const list=el('div','','report-list');body.append(list);
    const populate=()=>{
      list.replaceChildren();
      const matches=groups.filter(g=>(reportFilter==='deferred'?deferred.has(g.id):!deferred.has(g.id)&&(!reportFilter||g.types.includes(reportFilter)))&&JSON.stringify(g.members.map(m=>[m.name,m.path,m.pluginId,m.owner])).toLowerCase().includes(reportSearch.toLowerCase()));
      if(!matches.length) list.append(el('p',text('当前筛选没有候选；不代表不存在重复或重叠。','No candidates match this filter; this does not establish that none exist.')));
      for(const g of matches){
        const card=el('article','','report-card');
        const title=[...new Set(g.members.map(m=>m.name))].slice(0,3).join(' / ');
        card.append(el('h3',title),el('p',`${g.members.length}${g.totalMembers>g.members.length?` / ${g.totalMembers}`:''} ${text('个实例','instances')}`,'manager-meta'));
        const tags=el('div','','report-tags');for(const type of g.types)tags.append(el('span',types.find(t=>t[0]===type)?.[1]||type,'report-tag'));
        if(isSkill) tags.append(el('span',!g.complete?text('比较不完整','Comparison incomplete'):g.directoryEqual?text('目录内容一致','Directory content matches'):text('目录存在差异','Directory differences'),'report-tag'));
        card.append(tags);
        const brief=el('div','','report-brief');
        g.members.forEach((m,i)=>brief.append(el('p',`${i+1}. ${isSkill?sourceLabel(m.source):m.pluginId} · ${isSkill?(m.owner?`${m.owner.version} · ${m.owner.marketplace}`:m.path.replaceAll('\\','/').split('/').slice(-2,-1)[0]):m.version}`)));
        card.append(brief);
        card.append(el('p',isSkill && g.retained?.length ? text('已有用户保留标记；不自动选择其他实例替代。','User retention marks exist; no replacement is selected automatically.') : isSkill&&g.directoryEqual ? text('目录内容一致：可选定常用来源标记保留，归档其他实例前仍需核对运行环境与依赖。','Directory contents match: mark your preferred source to retain; review runtime context and dependencies before archiving other instances.') : text('建议暂时保留，核对差异、运行环境和依赖后再决定。','Keep for now; review differences, runtime context and dependencies before deciding.')));
        const details=el('details');details.open=expanded.has(g.id);details.append(el('summary',text('展开对比','Compare instances')));details.addEventListener('toggle',()=>{if(details.open)expanded.add(g.id);else expanded.delete(g.id);});
        const grid=el('div','','report-grid');
        for(const m of g.members){
          const column=el('section','','report-instance');column.append(el('h4',`${g.members.indexOf(m)+1}. ${m.name}`));
          if(isSkill){
            column.append(el('p',sourceLabel(m.source)),el('p',m.owner?`${m.owner.name} · ${m.owner.version} · ${m.owner.marketplace}`:text('个人／系统独立目录','Standalone personal / system directory')));
            column.append(el('p',m.owner ? m.pluginStatus?.enabled===true?text('匹配版本已启用','Matching version enabled'):text('安装／启用状态待核对','Installation / enablement unconfirmed'):text('本地存在，是否加载未知','Present locally; loading unknown')));
            column.append(el('p',m.tree.complete?text(`${m.tree.files} 个文件 · ${m.tree.bytes} 字节`,`${m.tree.files} files · ${m.tree.bytes} bytes`):text('目录未完整读取；不可判断一致','Incomplete directory read; equality unknown')));
            column.append(el('p',m.activity.count===null?text('采用记录读取失败／不可用','Adoption records unavailable'):text(`近 ${report.days} 天已记录采用：${m.activity.count} · 最近记录：${m.activity.last||'无'}`,`Recorded adoptions in ${report.days} days: ${m.activity.count} · Latest record: ${m.activity.last||'none'}`)));
            column.append(el('p',text('依赖未完整核验。以下工具名仅为文档静态引用线索：','Dependencies are not fully verified. Tool names below are static document references only:')+' '+(m.dependencyHints.join(', ')||text('未提取到','none extracted'))));
            if(m.references?.length)column.append(el('p',text('文档文件引用（未跟随读取）：','Document file references (not followed): ')+m.references.join(', ')));
            const location=el('details');location.append(el('summary',text('来源路径','Source path')),el('p',m.path));column.append(location);
            if(m.annotation?.retain)column.append(el('strong',text('已标记保留','Marked to retain')));
            column.append(button(m.annotation?.retain?text('取消保留标记','Clear retention mark'):text('标记保留','Mark to retain'),async()=>{
              const result=await invoke('save_skill_note',{id:m.id,fingerprint:m.fingerprint,note:m.annotation?.note||'',retain:!m.annotation?.retain,expectedRevision:m.annotation?.revision||0});
              if(result)void checkView(true);
            },!data.notesAvailable||checks.manage.loading));
            const manageable=['用户技能','用户 .agents 技能'].includes(m.source)&&data.managementSupported;
            if(manageable)column.append(button(text('预览归档','Preview archive'),()=>invoke('preview_skill_archive',{skillId:m.id}),Boolean(plan)||Boolean(m.annotation?.retain)||checks.manage.loading));
            else column.append(el('p',text('系统和插件内 Skill 不在此直接归档。','System and plugin Skills cannot be archived here.')));
          }else{
            column.append(el('p',m.pluginId),el('p',m.version),el('p',m.installed?m.enabled===true?text('已安装 · 已启用','Installed · Enabled'):m.enabled===false?text('已安装 · 已停用','Installed · Disabled'):text('已安装 · 状态未知','Installed · Unknown'):text('仅缓存，不证明已安装','Cache only; installation unconfirmed')));
            if(m.installRecords>1)column.append(el('p',text(`同版本存在 ${m.installRecords} 条安装记录，需核对来源，不能直接认定重复安装。`,`${m.installRecords} installation records for this version; verify sources before treating them as duplicate installations.`)));
            column.append(el('p',text('扫描到的关联技能：','Scanned associated Skills: ')+(m.skills.map(s=>s.name).join(', ')||text('无；可能仅提供工具','none; may provide tools only'))));
            column.append(el('p',text('工具清单、外部依赖和独有能力未完整核验，不建议据此卸载。','Tools, external dependencies and unique capabilities are unverified; this is not an uninstall recommendation.')));
          }
          grid.append(column);
        }
        details.append(grid);
        if(isSkill){
          const evidence=el('details');evidence.append(el('summary',text('分组依据','Grouping evidence')),el('p',text('标签表示组内部分实例的关系，不表示所有实例彼此相同。','Tags describe relationships within this group, not equality between every instance.')));
          for(const relation of g.relations||[]){const positions=relation.ids.map(id=>g.members.findIndex(m=>m.id===id)+1).filter(Boolean);evidence.append(el('p',`${positions.join(', ')} · ${types.find(t=>t[0]===relation.type)?.[1]||relation.type}${relation.sharedTerms?' · '+relation.sharedTerms.join(', '):''}`));}details.append(evidence);
          if(g.documentDifference?.length){const docs=el('details');docs.append(el('summary',text('查看文档差异片段','View document difference excerpts')));for(const excerpt of g.documentDifference){const name=g.members.find(m=>m.id===excerpt.id)?.name;docs.append(el('h4',`${name} · ${text('行','Line')} ${excerpt.line}`),el('pre',excerpt.excerpt??text('不可读取','Unreadable')));}docs.append(el('p',text('从首个不同的行起，每项最多 25 行／4000 字符；片段不是完整差异。','Up to 25 lines / 4000 characters per instance from the first differing line; excerpts are not the full diff.')));details.append(docs);}
          const diff=el('details');diff.append(el('summary',text(`差异路径：${g.differenceCount}（最多显示 100 条）`,`Differing paths: ${g.differenceCount} (up to 100 shown)`)));
          for(const f of g.differences){const row=el('div','','report-difference');row.append(el('strong',f.path));f.instances.forEach((v,i)=>row.append(el('p',`${i+1}. ${g.members[i].name}: ${v.state==='unknown'?text('未知','Unknown'):v.state==='missing'?text('缺失','Missing'):text('存在','Present')}${v.hash?' · '+v.hash.slice(0,12):''}`)));diff.append(row);}details.append(diff);
          if(!g.complete)details.append(el('p',text('缺失的扫描结果不计为缺失文件；差异数量也可能不完整。','Unread instances are not missing files; difference counts may also be incomplete.')));
        }else {
          details.append(el('p',text('关联技能按名称比较，不证明内容或插件整体一致。','Associated Skill names do not establish matching content or equivalent plugins.')));
          for(const s of g.sharedSkills||[])details.append(el('p',`${s.name} · ${s.instances===1?text('仅在一个实例扫描到','Scanned in one instance only'):text(`在 ${s.instances} 个实例扫描到`,`Scanned in ${s.instances} instances`)}`));
        }
        card.append(details,button(deferred.has(g.id)?text('恢复本次显示','Show again'):text('本次暂缓','Defer this session'),()=>{if(deferred.has(g.id))deferred.delete(g.id);else deferred.add(g.id);render();},Boolean(plan)));
        list.append(card);
      }
    };input.addEventListener('input',()=>{reportSearch=input.value;populate();});populate();
    const scope=el('details');scope.append(el('summary',text('比较范围与判断依据','Comparison scope and evidence')),
      el('p',text(`最多显示 50 组、每组 20 个实例，比较 40 个目录。当前技能组 ${report.limits.shownSkillGroups}/${report.limits.skillGroups}；暂缓仅作用于当前面板，已核验内容变化后重新展示。`,`Up to 50 groups, 20 instances per group and 40 directories. Skill groups shown: ${report.limits.shownSkillGroups}/${report.limits.skillGroups}. Deferral lasts for this panel; changes in verified content restore visibility.`)),
      el('p',text('功能重叠仅按描述词语筛选，最多比较 500 个实例；不是语义等价判断。目录比较未完整读取的部分保持未知。','Overlap uses description terms from up to 500 instances, not semantic equivalence. Unread directory content remains unknown.')));body.append(scope);
  }
  function render() {
    renderNav(); body.replaceChildren(); if (view === 'activity') return;
    const toolbar = el('div', '', 'manager-toolbar'), actions = el('div', '', 'manager-actions');
    actions.append(button(checks.manage.loading ? text('刷新中…', 'Refreshing…') : section==='redundancy'?text('刷新报告','Refresh report'):text('刷新清单', 'Refresh inventory'), () => checkView(true), checks.manage.loading));
    const sections = el('div', '', 'manager-actions manager-sections');
    sections.setAttribute('aria-label', text('管理视图', 'Management view'));
    for (const [id, label] of [['inventory',text('清单','Inventory')],['redundancy',text('冗余候选','Redundancy candidates')]]) {
      const tab = button(label, () => { section=id; render(); if (id === 'redundancy' && !data?.redundancy) void checkView(true); });
      tab.setAttribute('aria-pressed', String(section===id)); sections.append(tab);
    }
    body.append(sections);
    const tabs = el('div', '', 'manager-actions');
    tabs.setAttribute('aria-label', text('清单类型', 'Inventory type'));
    for (const [kind, label] of [['plugins', text('插件', 'Plugins')], ['skills', text('技能', 'Skills')]]) {
      const action = button(label, () => { inventoryKind = kind; reportFilter=''; render(); });
      action.setAttribute('aria-pressed', String(inventoryKind === kind)); tabs.append(action);
    }
    body.append(tabs);
    toolbar.append(el('h2', section === 'redundancy' ? (inventoryKind === 'plugins' ? text('插件冗余候选','Plugin redundancy candidates') : text('技能冗余候选','Skill redundancy candidates')) : inventoryKind === 'plugins' ? text('插件清单', 'Plugin inventory') : text('技能清单', 'Skill inventory')), actions); body.append(toolbar);
    renderCheck();
    if (section === 'redundancy') { renderPlan(); renderReport(); return; }
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
    data = value.inventoryScope === 'management' ? { ...data, ...value, redundancy:value.redundancy } : value;
    if (!checks.manage.loading) render();
  };
  update.isManaging = () => view === 'manage';
  update.setLocale = value => { locale = value; render(); };
  render(); return update;
}

