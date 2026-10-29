import { translator } from './i18n.mjs';
import { activityIcon, safeActivityIcon } from './activity-icons.mjs';
import { activityView, calendarDays, activityToday, recentActivity } from './activity.mjs';
const node = (tag, value, className) => { const el = document.createElement(tag); if (value !== undefined) el.textContent = value; if (className) el.className = className; return el; };
export function createActivityPanel(root, locale = 'zh', checkInventory) {
  let t = translator(locale);
  let current, kind = 'plugins', year = new Date().getFullYear(), metric = 'calls';
  let pinnedDate = null;
  let callSource = 'host-event';
  const heading = node('div', undefined, 'activity-heading');
  const title = node('h2', t("插件工具调用"));
  const tabs = node('div', undefined, 'activity-tabs'); tabs.setAttribute('aria-label', t("活动类型"));
  const skillButton = node('button', 'Skill'), pluginButton = node('button', t("插件"));
  for (const button of [pluginButton, skillButton]) { button.type = 'button'; tabs.append(button); }
  skillButton.addEventListener('click', () => { pinnedDate = null; kind = 'skills'; metric = 'adoptions'; render(); });
  pluginButton.addEventListener('click', () => { pinnedDate = null; kind = 'plugins'; metric = 'calls'; render(); });
  const yearSelect = node('select'); yearSelect.setAttribute('aria-label', t("活动年份"));
  yearSelect.addEventListener('change', () => { pinnedDate = null; year = Number(yearSelect.value); dateFrom.value = `${year}-01-01`; dateTo.value = `${year}-12-31`; render(); });
  heading.append(title, tabs, yearSelect);
  const sourceTabs = node('div', undefined, 'activity-tabs source-tabs');
  sourceTabs.setAttribute('aria-label', t('记录来源'));
  const hostButton = node('button', t('宿主事件')), reportButton = node('button', t('助手上报'));
  for (const [button, source] of [[hostButton, 'host-event'], [reportButton, 'assistant-report']]) {
    button.type = 'button'; sourceTabs.append(button);
    button.addEventListener('click', () => { callSource = source; pinnedDate = null; render(); });
  }
  const quality = node('div', undefined, 'activity-quality'); quality.setAttribute('role', 'status');
  const caption = node('p', undefined, 'activity-caption'), scroll = node('div', undefined, 'calendar-scroll');
  const calendar = node('div', undefined, 'activity-calendar'); scroll.append(calendar);
  const tooltip = node('p', t("将鼠标移到日期上，或用键盘选择日期查看使用量。"), 'activity-tooltip'); tooltip.setAttribute('role', 'status');
  const dailyPanel = node('section', undefined, 'daily-ranking'); dailyPanel.hidden = true;
  const dailyHeading = node('div', undefined, 'daily-heading'), dailyTitle = node('h3');
  const clearDay = node('button', t("返回全部"), 'clear-day'); clearDay.type = 'button';
  clearDay.addEventListener('click', () => { pinnedDate = null; render(); });
  dailyHeading.append(dailyTitle, clearDay);
  const dailyList = node('ol', undefined, 'activity-ranking daily-list');
  const metrics = node('div', undefined, 'activity-metrics');
  const recent = node('section', undefined, 'recent-activity');
  const recentHeading = node('div', undefined, 'recent-heading'), recentTitle = node('h3'), recentScope = node('span', undefined, 'activity-caption');
  recentHeading.append(recentTitle, recentScope);
  const recentSummary = node('p', undefined, 'activity-caption');
  const recentChart = node('div', undefined, 'recent-chart');
  recent.append(recentHeading, recentSummary, recentChart);
  const yearHeading = node('h3', undefined, 'year-heading');
  const dailyGrid = node('div', undefined, 'entity-grid');
  const dailyTip = node('p', undefined, 'activity-tooltip'); dailyTip.setAttribute('role', 'status');
  dailyPanel.append(dailyHeading, dailyGrid, dailyTip, dailyList);
  const legend = node('div', undefined, 'activity-legend'); legend.append(node('span', t("少")));
  for (let i = 0; i < 5; i++) legend.append(node('span', undefined, `heat-swatch level-${i}`));
  legend.append(node('span', t("多")), node('span', t("斜线：无覆盖 / 未查询")));
  const rankings = node('div', undefined, 'activity-rankings');
  const entityPanel = node('section', undefined, 'entity-panel');
  const entityHeading = node('div', undefined, 'entity-heading'), entityTitle = node('h3');
  const datesControl = node('div', undefined, 'entity-dates');
  const dateFrom = node('input'), dateTo = node('input');
  for (const [input, text, suffix] of [[dateFrom, t("开始日期"), '01-01'], [dateTo, t("结束日期"), '12-31']]) {
    input.type = 'date'; input.value = `${year}-${suffix}`; input.setAttribute('aria-label', text);
    const label = node('label', text); label.append(input); datesControl.append(label);
    input.addEventListener('change', render);
  }
  entityHeading.append(entityTitle, datesControl);
  const entityCaption = node('p', undefined, 'activity-caption'), entityGrid = node('div', undefined, 'entity-grid');
  const entityTip = node('p', undefined, 'activity-tooltip'); entityTip.setAttribute('role', 'status');
  entityPanel.append(entityHeading, entityCaption, entityGrid, entityTip);
  const note = node('p', undefined, 'activity-note');
  root.append(heading, sourceTabs, quality, caption, metrics, recent, yearHeading, scroll, legend, tooltip, dailyPanel, entityPanel, rankings, note);
  function renderGrid(grid, tip, ranked, label) {
    grid.replaceChildren();
    tip.textContent = t("悬停或聚焦格子查看名称与次数。");
    const maxCount = Math.max(1, ...ranked.all.map(e => e.total));
    ranked.all.forEach((entry, index) => {
      const level = entry.total ? Math.min(4, Math.max(1, Math.ceil(4 * entry.total / maxCount))) : 0;
      const description = `${entry.name} · ${t(entry.detail)}：${entry.unknown ? t("无覆盖或归属不明，不能判断使用量") : t("{0} 次{1}{2}", entry.total, label, entry.total ? '' : t("（已覆盖期间无记录）"))}`;
      const cell = node('button', undefined, `heat-cell entity-cell ${entry.unknown ? 'heat-unknown' : `level-${level}`}`); cell.type = 'button';
      cell.title = description; cell.setAttribute('aria-label', t("第 {0} 名，{1}", index + 1, description));
      for (const event of ['mouseenter', 'focus', 'click']) cell.addEventListener(event, () => { tip.textContent = description; });
      grid.append(cell);
    });
    if (!ranked.all.length) tip.textContent = ranked.ready ? t("当前没有可展示的项目。") : t("尚无统计数据。");
    if (!ranked.ready) tip.textContent = t("统计暂不可读取，不将失败当作零。");
  }
  function render(focusAfter) {
    if (!current) return;
    skillButton.setAttribute('aria-pressed', String(kind === 'skills')); pluginButton.setAttribute('aria-pressed', String(kind === 'plugins'));
    const adopting = metric === 'adoptions', calling = metric === 'calls';
    title.textContent = calling ? t("插件工具调用") : t("助手报告的 Skill 采用");
    const usage = calling ? (current.pluginCalls?.sources?.[callSource] ?? current.pluginCalls) : adopting ? current.adoptions : current.usage;
    sourceTabs.hidden = !calling || !current.pluginCalls?.sources;
    sourceTabs.setAttribute('aria-label', t('记录来源'));
    hostButton.textContent = t('宿主事件'); reportButton.textContent = t('助手上报');
    hostButton.setAttribute('aria-pressed', String(callSource === 'host-event'));
    reportButton.setAttribute('aria-pressed', String(callSource === 'assistant-report'));
    const capture = current.captureStatus, coverage = capture?.coverage;
    quality.replaceChildren();
    quality.append(node('p', calling
      ? t('来源：{0}。两种来源分别统计，不相加；不同 ID 的同一次调用可能重复。', t(usage?.source === 'host-event' ? '宿主事件' : usage?.source === 'assistant-report' ? '助手上报' : '旧版记录，来源未确认'))
      : t('来源：助手主动上报。未接入宿主 Skill 调用事件，不等同官方调用次数。')));
    if (calling) {
      quality.append(node('p', t('自动采集：{0} · 最近扫描：{1}', t(capture?.enabled === true ? '已开启' : capture?.enabled === false ? '已关闭' : '未知'), coverage?.checkedAt || '—')));
      quality.append(node('p', t('已记录事件范围：{0} 至 {1}', usage?.coverage?.from || '—', usage?.coverage?.to || '—')));
      if (coverage) quality.append(node('p', t('待处理 {0} 字节 · 读取问题 {1} · 无效或超长行 {2}', coverage.pendingBytes ?? '—', coverage.issues?.length ?? 0, (coverage.malformedLines || 0) + (coverage.oversizedLines || 0))));
      if (capture?.lastError) quality.append(node('p', t('采集异常：{0}', capture.lastError)));
    }
    quality.append(node('p', t('仅反映已记录活动；空白不证明未使用，尚未与官方统计对账。')));
    const historical = (adopting ? usage?.catalog || [] : []).filter(s => !current.skills.some(p => p.id === s.id)).map(s => ({...s,historical:true,source:t("{0}（已不在当前清单）", s.source)}));
    const inventory = {...current,skills:[...current.skills,...historical],usage};
    const view = activityView(inventory, kind, year, metric);
    const recentView = recentActivity(inventory, kind, year, metric);
    const today = activityToday(usage);
    clearDay.textContent = t("返回全部");
    yearHeading.textContent = t("年度足迹");
    recentTitle.textContent = year === Number(today.slice(0,4)) ? t("近期活动") : t("年末活动");
    recentScope.textContent = t("最近 30 天");
    recentSummary.textContent = t("{0} 至 {1} · {2}", recentView.from, recentView.to, usage?.activity?.timeZone || 'UTC');
    metrics.replaceChildren();
    for (const [name, value] of [[calling ? t("近 30 天已记录调用") : t("近 30 天已记录采用"),recentView.total], [t("有记录天数"),recentView.activeDays], [calling ? t("有调用的插件") : t("有采用的 Skill"),recentView.usedItems]]) {
      const item = node('div', undefined, 'activity-metric');
      item.append(node('span', name), node('strong', recentView.ready && recentView.coverage.hasOverlap ? String(value) : '—'));
      metrics.append(item);
    }
    if (!recentView.ready || !recentView.coverage.hasOverlap) recentSummary.textContent += ' · ' + t("所选日期无统计覆盖");
    else if (recentView.coverage.partial || recentView.excluded) recentSummary.textContent += ' · ' + t("仅显示已记录活动，覆盖不完整");
    tooltip.textContent = t("将鼠标移到日期上，或用键盘选择日期查看使用量。");
    dailyPanel.hidden = true; dailyGrid.replaceChildren(); dailyTip.textContent = ''; dailyList.replaceChildren();
    const years = [...new Set([year, new Date().getFullYear(), ...(usage?.activity?.days || []).map(d => Number(d.date.slice(0, 4)))])].sort((a, b) => b - a);
    yearSelect.replaceChildren(...years.map(y => { const option = node('option', t("{0} 年", y)); option.value = String(y); return option; })); yearSelect.value = String(year);
    const label = calling ? t("工具调用尝试") : adopting ? t("采用") : metric === 'reads' ? t("读取请求") : t("显式标记");
    caption.hidden = view.ready;
    caption.textContent = view.ready ? '' : adopting ? t("采用记录暂不可读取，请重新打开管理器。") : t("插件调用记录暂不可读取。");
    calendar.replaceChildren();
    const dates = calendarDays(year), columns = dates.length / 7;
    calendar.style.setProperty('--weeks', columns);
    const months = node('div', undefined, 'calendar-months');
    let lastMonth = '';
    for (let col = 0; col < columns; col++) {
      const date = dates.slice(col * 7, col * 7 + 7).find(Boolean), month = date?.slice(5, 7);
      months.append(node('span', month !== lastMonth ? t("{0}月", Number(month)) : '')); lastMonth = month;
    }
    const cells = node('div', undefined, 'calendar-cells'); cells.setAttribute('aria-label', t("{0} 年每日{1}", year, label));
    const maximum = Math.max(1, ...view.days.values());
    const {start: lower, end: upper, incomplete} = view.coverage;
    const buttons = [], dateButtons = new Map(), barButtons = new Map(), datePreviews = new Map();
    let restorePinned;
    const markPinned = () => {
      for (const [date, button] of [...dateButtons, ...barButtons]) {
        button.setAttribute('aria-pressed', String(date === pinnedDate));
        button.style.boxShadow = date === pinnedDate ? '0 0 0 2px var(--focus)' : '';
      }
    };
    for (const date of dates) {
      if (!date) { cells.append(node('span', undefined, 'heat-empty')); continue; }
      const future = date > today;
      const count = future ? 0 : view.days.get(date) || 0;
      const unknown = !count && (incomplete || !lower || !upper || date < lower || date > upper);
      const level = count ? Math.min(4, Math.max(1, Math.ceil(4 * count / maximum))) : 0;
      const button = node('button', undefined, `heat-cell ${future ? 'heat-future' : unknown ? 'heat-unknown' : `level-${level}`}`); button.type = 'button'; button.tabIndex = buttons.length ? -1 : 0;
      const description = `${date}：${future ? t("未来日期") : unknown ? t("无覆盖或未查询，不能判断使用量") : t("{0} 次{1}", count, label)}`;
      button.title = description; button.setAttribute('aria-label', description);
      dateButtons.set(date, button);
      const show = () => {
        tooltip.textContent = `${description} · ${pinnedDate === date ? t("已固定；点击其他日期切换，再点当前日期解除固定。") : t("点击日期可固定查看当天排序。")}`;
        const ranked = activityView({...current, skills: [...current.skills, ...historical], usage}, kind, year, metric, {from: date, to: date});
        dailyGrid.setAttribute('aria-label', `${date} · ${t("{0}使用量排序", kind === 'plugins' ? t("插件") : 'Skill')}`);
        renderGrid(dailyGrid, dailyTip, ranked, label);
        dailyPanel.hidden = false;
        dailyTitle.textContent = t("{0} · 当天排名", date);
        clearDay.hidden = !pinnedDate;
        dailyGrid.hidden = Boolean(pinnedDate);
        dailyTip.hidden = Boolean(pinnedDate);
        dailyList.hidden = !pinnedDate;
        dailyList.replaceChildren();
        if (pinnedDate) {
          const entries = future ? [] : ranked.all.filter(e => e.total > 0);
          const max = Math.max(1, ...entries.map(e=>e.total));
          for (const [index, entry] of entries.entries()) {
            const row = node('li'), copy = node('div');
            copy.append(node('strong', entry.name), node('span', t(entry.detail), 'ranking-detail'));
            const track = node('span', undefined, 'ranking-track'), fill = node('span', undefined, 'ranking-fill');
            fill.style.width = (100 * entry.total / max) + '%'; track.append(fill); copy.append(track);
            row.append(node('span', String(index + 1), 'ranking-position'), copy, node('span', t("{0} 次",entry.total),'ranking-count')); dailyList.append(row);
          }
          if (!entries.length) dailyList.append(node('li', future ? t("未来日期") : unknown ? t("无覆盖或未查询，不能判断使用量") : t("已覆盖期间无记录"), 'daily-empty'));
        }
      };
      const preview = () => { tooltip.textContent = description; if (!pinnedDate) show(); };
      datePreviews.set(date, preview);
      button.addEventListener('mouseenter', preview); button.addEventListener('focus', preview);
      button.addEventListener('click', () => {
        pinnedDate = pinnedDate === date ? null : date;
        for (const other of buttons) other.tabIndex = other === button ? 0 : -1;
        markPinned(); render({date,chart:'calendar'});
      });
      if (pinnedDate === date) restorePinned = show;
      button.addEventListener('keydown', event => {
        const delta = { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1 }[event.key];
        if (delta === undefined) return;
        event.preventDefault(); const index = buttons.indexOf(button), next = buttons[Math.min(buttons.length - 1, Math.max(0, index + delta))];
        button.tabIndex = -1; next.tabIndex = 0; next.focus();
      });
      buttons.push(button); cells.append(button);
    }
    calendar.append(months, cells);
    recentChart.replaceChildren();
    recentChart.setAttribute('aria-label', t("每日活动柱图"));
    recentChart.style.setProperty('--days', Math.max(1,recentView.dates.length));
    const peak = Math.max(2,2*Math.ceil(Math.max(0,...recentView.days.values())/2));
    const yAxis = node('div', undefined, 'recent-yaxis');
    yAxis.append(node('span',String(peak)),node('span',String(Math.round(peak/2))),node('span','0'));
    const plot = node('div',undefined,'recent-plot'), xAxis = node('div',undefined,'recent-xaxis');
    const recentButtons = [];
    recentView.dates.forEach((date,index) => {
      const count = recentView.days.get(date) || 0;
      const unknown = !count && (incomplete || !lower || !upper || date < lower || date > upper);
      const button = node('button',undefined,'activity-bar'+(unknown?' bar-unknown':count?'':' bar-zero')); button.type='button';
      button.tabIndex = index ? -1 : 0;
      const description = dateButtons.get(date)?.title || date;
      button.title=description;button.setAttribute('aria-label',description);
      const fill=node('span',undefined,'bar-fill');
      fill.style.height=count?(100*count/peak)+'%':'3px'; button.append(fill);
      for (const event of ['mouseenter','focus']) button.addEventListener(event,()=>{ tooltip.textContent=description; if(!pinnedDate) datePreviews.get(date)?.(); });
      button.addEventListener('click',()=>{pinnedDate=pinnedDate===date?null:date;render({date,chart:'bar'});});
      button.addEventListener('keydown',event=>{
        const delta={ArrowRight:1,ArrowLeft:-1,ArrowUp:1,ArrowDown:-1}[event.key];if(delta===undefined)return;
        event.preventDefault();const next=recentButtons[Math.min(recentButtons.length-1,Math.max(0,index+delta))];button.tabIndex=-1;next.tabIndex=0;next.focus();
      });
      barButtons.set(date,button);recentButtons.push(button);plot.append(button);
      if(index===0 || index===recentView.dates.length-1 || (index%7===0 && index<recentView.dates.length-3)) {
        const tick=node('span',date.slice(5).replace('-','/'));tick.style.gridColumn=String(index+1);xAxis.append(tick);
      }
    });
    recentChart.append(yAxis,plot,xAxis);
    markPinned();
    if (restorePinned) restorePinned();
    entityTitle.textContent = t("{0}使用量排序", kind === 'plugins' ? t("插件") : 'Skill');
    for (const input of [dateFrom, dateTo]) { input.min = `${year}-01-01`; input.max = `${year}-12-31`; }
    const validRange = dateFrom.value && dateTo.value && dateFrom.value <= dateTo.value && dateFrom.checkValidity() && dateTo.checkValidity();
    let rankingView = view;
    rankings.hidden = !validRange || Boolean(pinnedDate);
    entityPanel.hidden = Boolean(pinnedDate);
    entityGrid.replaceChildren();
    entityTip.textContent = t("悬停或聚焦格子查看名称与次数。");
    if (!validRange) {
      entityCaption.textContent = t("请选择 {0} 年内有效的起止日期，开始日期不得晚于结束日期。", year);
    } else {
      const ranked = activityView({...current, skills: [...current.skills, ...historical], usage}, kind, year, metric, {from: dateFrom.value, to: dateTo.value});
      rankingView = ranked;
      const coverage = ranked.coverage;
      const scope = coverage.hasOverlap ? t("统计覆盖 {0} 至 {1}{2}", coverage.effectiveFrom, coverage.effectiveTo, coverage.incomplete ? t("（数据不完整）") : '') : t("所选日期无统计覆盖");
      entityCaption.textContent = t("{0} 至 {1} · {2} · 已记录 {3} 次{4} · 每格一项，从左到右、从上到下按次数降序 · 色阶表示次数，参见图例", dateFrom.value, dateTo.value, scope, ranked.total, label);
      if (!ranked.ready) entityCaption.textContent = t("统计暂不可读取，不将失败当作零。");
      renderGrid(entityGrid, entityTip, ranked, label);
    }
    rankings.replaceChildren();
    for (const [title, entries] of [[t("最常用{0} · 前 5", kind === 'plugins' ? t("插件") : ' Skill'), rankingView.top]]) {
      const section = node('section'); section.append(node('h3', title));
      const list = node('ol', undefined, 'activity-ranking');
      for (const entry of entries) {
        const item = node('li'), badge = node('span', entry.name.slice(0, 2).toUpperCase(), 'activity-avatar'), copy = node('div');
        if (kind === 'plugins') {
          const visual = activityIcon(entry, current.pluginRegistry?.plugins, current.managerIcon);
          if (safeActivityIcon(visual.icon)) {
            const fallback = node('span', badge.textContent);
            badge.textContent = ''; badge.append(fallback); badge.classList.add('plugin-icon');
            if (visual.openai) badge.setAttribute('data-openai-mark', 'true');
            const image = node('img'); image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
            image.addEventListener('load', () => { fallback.hidden = true; });
            image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; });
            image.src = visual.icon;
            if (safeActivityIcon(visual.iconDark)) {
              const picture = node('picture'), dark = node('source'); dark.media = '(prefers-color-scheme: dark)'; dark.srcset = visual.iconDark;
              picture.append(dark, image); badge.append(picture);
            } else badge.append(image);
          }
        }
        copy.append(node('strong', entry.name), node('span', t(entry.detail), 'ranking-detail'));
        item.append(badge, copy, node('span', t("{0} 次", entry.total), 'ranking-count')); list.append(item);
      }
      if (!entries.length) section.append(node('p', !view.ready ? t("统计暂不可读取，不将失败当作零。") : adopting && !usage?.coverage?.from ? t("尚未收到采用记录，暂不生成排名。") : calling && !usage?.coverage?.from ? t("尚未收到插件调用记录。") : view.ready ? t("当前范围没有符合条件的项目。") : t("尚无统计，不将未知当作零。"), 'activity-note')); else section.append(list);
      rankings.append(section);
    }
    const observation = rankingView.observation;
    const review = node('section', undefined, 'usage-observation');
    const reviewHeading = node('div', undefined, 'observation-heading');
    reviewHeading.append(node('h3', t("低频使用观察")));
    review.append(reviewHeading);
    const state = !rankingView.ready ? t("统计暂不可读取") : observation.incomplete ? t("待核验") : observation.mature ? t("低频候选") : t("观察中");
    const checkStatus = node('p', '', 'observation-feedback'); checkStatus.setAttribute('role','status');
    if (checkInventory) {
      const check = node('button', t("核对清单"), 'observation-check'); check.type = 'button';
      check.title = t("核对安装清单");
      check.addEventListener('click', async () => {
        check.disabled = true; check.textContent = t("核对中…"); checkStatus.textContent = '';
        try {
          const result = await checkInventory();
          if (result.isError || !Array.isArray(result.structuredContent?.skills) || !result.structuredContent?.pluginRegistry) throw new Error('Inventory unavailable');
          current = result.structuredContent.inventoryScope === 'management' ? { ...current, ...result.structuredContent } : result.structuredContent; render();
        } catch { checkStatus.textContent = t("核对失败，请重试。"); }
        finally { check.disabled = false; check.textContent = t("核对清单"); }
      });
      reviewHeading.append(check);
    }
    review.append(checkStatus, node('p', state, 'observation-state'));
    if (rankingView.ready) review.append(node('p', t(observation.mature ? "观察 {0} 天 · 活跃 {1} 天" : "观察 {0}/14 天 · 活跃 {1}/5 天", observation.observedDays, observation.activeDays), 'activity-caption'));
    const addList = (heading, entries, zero) => {
      const details = node('details'), summary = node('summary', heading);
      const search = node('input'); search.type = 'search'; search.placeholder = t("搜索名称或来源"); search.setAttribute('aria-label', heading + ' · ' + t("搜索名称或来源"));
      const list = node('ol', undefined, 'activity-ranking'); list.style.maxHeight = '320px'; list.style.overflowY = 'auto';
      const draw = () => {
        const query = (search.value || '').trim().toLocaleLowerCase();
        const matches = entries.filter(e => `${e.name} ${e.detail}`.toLocaleLowerCase().includes(query));
        list.replaceChildren();
        for (const entry of matches) {
          const item = node('li'), copy = node('div');
          copy.append(node('strong', entry.name), node('span', t(entry.detail), 'ranking-detail'));
          item.append(copy, node('span', zero ? t("所选范围无记录") : t("{0} 次 · {1} 天 · 最近 {2}",entry.total,entry.activeDays,entry.lastUsed), 'ranking-detail'));
          list.append(item);
        }
        if (!matches.length) list.append(node('li', t("没有匹配项目。")));
      };
      search.addEventListener('input',draw); draw();
      details.append(summary, search, list); review.append(details);
    };
    if (observation.mature) addList(t("低频 · {0} 项",observation.low.length),observation.low,false);
    if (rankingView.ready && rankingView.coverage.hasOverlap) addList(t("无记录 · {0} 项",observation.zero.length),observation.zero,true);
    else if (rankingView.ready) review.append(node('p',t("所选日期无统计覆盖"),'activity-note'));
    review.append(node('p', t("无记录不代表未使用。"), 'activity-note'));
    const rules = node('details', undefined, 'observation-rules');
    rules.append(node('summary', t("统计说明")));
    rules.append(node('p', t("所选范围内：观察跨度 {0}/14 天 · 有记录 {1}/5 天 · 已确认清单 {2} 项", observation.observedDays, observation.activeDays, observation.total), 'activity-caption'));
    if (observation.incomplete) rules.append(node('p', t("安装清单未核验或记录不完整，暂不生成低频候选；下方仅列已确认清单中的可查询项目。"), 'activity-note'));
    else if (!observation.mature) rules.append(node('p', t("观察跨度至少 14 天且至少 5 天有记录后，才展示低频候选。"), 'activity-note'));
    rules.append(node('p', t("按所选日期范围统计。候选仅在 1–2 天有记录，首次记录距范围末日不少于 14 天；按最近使用时间从早到晚排序。安装时间未知，近期首次记录的项目继续观察。无记录不等于闲置，记录不保证覆盖所有实际使用。"), 'activity-note'));
    review.append(rules);
    rankings.append(review);
    note.textContent = t("{0} {1}不代表成功执行次数。零值仅表示该年份与已查询期间交集内未观测到信号，不代表从未使用。{2}", kind === 'plugins' ? t("插件按所属 Skill 信号汇总，尚不包含插件工具调用；未核实安装的缓存不进入零使用列表。") : t("Skill 按文件实例统计；同名副本保留来源区别。"), label, view.excluded ? t(" {0} 条时间或归属不明的信号未进入热力图。", view.excluded) : '');
    if (adopting && !usage?.coverage?.from && view.ready) entityTip.textContent = t("尚未收到 record_skill_use 记录；启用工具不会自动回填历史使用量。");
    if (calling) { note.textContent = t("插件调用与 Skill 采用分开统计，失败调用也计数。启用本机自动采集后读取宿主 McpToolCall 事件，按原调用时间统计；仅覆盖可读日志，缺失记录不代表从未调用。"); if (!view.ready) caption.textContent = t("插件调用记录暂不可读取。"); else if (!usage.coverage.from) caption.textContent = t("尚未收到插件工具调用记录；请检查自动采集状态与日志覆盖。"); }
    if (adopting) note.textContent = t("{0} 数据由助手主动记录，不是宿主独立验证；未接入记录约定的客户端可能漏记。记录开始前不补造数据，旧推断数据不混入采用次数。", kind === 'plugins' ? t("插件汇总所属 Skill 的采用次数，不含插件工具调用。") : t("每次采用分别计数，同一对话重复采用不合并。"));
    if (focusAfter?.date) {
      const group=focusAfter.chart==='bar'?barButtons:dateButtons;
      for(const [date,button] of group)button.tabIndex=date===focusAfter.date?0:-1;
      group.get(focusAfter.date)?.focus?.({preventScroll:true});
    }
  }
  const update = inventory => { current = inventory; render(); };
  update.setLocale = next => {
    t = translator(next);
    pluginButton.textContent = t('插件');
    tabs.setAttribute('aria-label', t('活动类型'));
    yearSelect.setAttribute('aria-label', t('活动年份'));
    for (const [input, key] of [[dateFrom,'开始日期'],[dateTo,'结束日期']]) {
      input.setAttribute('aria-label', t(key));
      input.parentNode.firstChild.textContent = t(key);
    }
    legend.children[0].textContent = t('少');
    legend.children[6].textContent = t('多');
    legend.children[7].textContent = t('斜线：无覆盖 / 未查询');
    title.textContent = t(metric === 'calls' ? '插件工具调用' : 'Skill 采用次数');
    tooltip.textContent = t('将鼠标移到日期上，或用键盘选择日期查看使用量。');
    render();
  };
  return update;
}

