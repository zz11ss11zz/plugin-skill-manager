import { translator } from '../i18n/i18n.mjs';

// View: renders the health ViewModel (src/frontend/viewmodels/health.vm.mjs) and forwards clicks.
export function createHealthPanel(container, locale, vm) {
  let t = translator(locale);
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
    const { report, pending, failed } = vm.state;
    container.setAttribute('aria-label', t('环境诊断'));
    heading.textContent = t('环境诊断') + (report ? ` · ${labels()[report.status]}` : '');
    const explanation = element('p', t('检查依赖、安装、数据与采集状态，不修改设置或写入测试记录。'));
    const button = element('button', pending ? t('检查中…') : report || failed ? t('重新检查') : t('检查环境'));
    button.disabled = pending;
    button.addEventListener('click', () => vm.run());
    const feedback = element('p', failed ? t('检查未完成；已有结果保留，可重试。服务无法启动时可使用独立诊断命令。') : pending ? t('正在检查，其他功能仍可使用。') : '', 'health-feedback');
    feedback.setAttribute('role', failed ? 'alert' : 'status');
    body.replaceChildren(explanation, button, feedback);
    if (!report) return;
    body.append(element('p', t('检查时间：{0}', report.checkedAt), 'health-time'));
    const counts = vm.counts();
    body.append(element('p', t('需处理 {0} · 未确认 {1} · 需留意 {2}', counts.error, counts.unknown, counts.warning)));
    const list = element('ul', '', 'health-checks');
    for (const item of vm.orderedChecks()) {
      const row = element('li');
      row.setAttribute('data-status', item.status);
      row.append(element('strong', `${labels()[item.status]} · ${local(item.title)}`), element('p', local(item.message)));
      if (item.action) row.append(element('p', local(item.action), 'health-action'));
      list.append(row);
    }
    body.append(list);
  }
  vm.subscribe(render);
  render();
  return { receive: result => vm.receive(result), setLocale(value) { locale = value; t = translator(locale); render(); } };
}
