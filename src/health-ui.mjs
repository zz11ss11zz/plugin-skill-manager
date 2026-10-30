import { translator } from './i18n.mjs';

export function createHealthPanel(container, locale, invoke) {
  let t = translator(locale), report = null, pending = false, failed = false;
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const details = element('details', '', 'environment-health');
  const heading = element('summary'), body = element('div');
  details.append(heading, body); container.append(details);
  const labels = () => ({ ok: t('正常'), info: t('说明'), warning: t('需留意'), error: t('需处理'), unknown: t('未确认') });
  const local = value => value?.[locale] || value?.en || '';
  function render() {
    container.setAttribute('aria-label', t('环境诊断'));
    heading.textContent = t('环境诊断') + (report ? ` · ${labels()[report.status]}` : '');
    const explanation = element('p', t('检查依赖、安装、数据与采集状态，不修改设置或写入测试记录。'));
    const button = element('button', pending ? t('检查中…') : report || failed ? t('重新检查') : t('检查环境'));
    button.disabled = pending;
    button.addEventListener('click', async () => {
      if (pending) return;
      pending = true; failed = false; render();
      try { receive(await invoke({ name: 'check_recording_status', arguments: {} })); }
      catch { failed = true; }
      finally { pending = false; render(); }
    });
    const feedback = element('p', failed ? t('检查未完成；已有结果保留，可重试。服务无法启动时可使用独立诊断命令。') : pending ? t('正在检查，其他功能仍可使用。') : '', 'health-feedback');
    feedback.setAttribute('role', failed ? 'alert' : 'status');
    body.replaceChildren(explanation, button, feedback);
    if (!report) return;
    body.append(element('p', t('检查时间：{0}', report.checkedAt), 'health-time'));
    const count = state => report.checks.filter(item => item.status === state).length;
    body.append(element('p', t('需处理 {0} · 未确认 {1} · 需留意 {2}', count('error'), count('unknown'), count('warning'))));
    const list = element('ul', '', 'health-checks');
    const priority = { error: 0, unknown: 1, warning: 2, info: 3, ok: 4 };
    for (const item of [...report.checks].sort((a, b) => priority[a.status] - priority[b.status])) {
      const row = element('li');
      row.setAttribute('data-status', item.status);
      row.append(element('strong', `${labels()[item.status]} · ${local(item.title)}`), element('p', local(item.message)));
      if (item.action) row.append(element('p', local(item.action), 'health-action'));
      list.append(row);
    }
    body.append(list);
  }
  function receive(result) {
    const next = result?.structuredContent?.health;
    if (result?.isError || !next || next.version !== 1 || !labels()[next.status] || !Array.isArray(next.checks) || next.checks.some(c => !c || !labels()[c.status] || typeof c.title?.en !== 'string' || typeof c.message?.en !== 'string')) throw new Error('Incomplete diagnostic response');
    report = next; failed = false; render();
  }
  render();
  return { receive, setLocale(value) { locale = value; t = translator(locale); render(); } };
}
