import packageInfo from '../package.json' with { type: 'json' };
import { resolveLocale, translator } from './i18n.mjs';
let locale = resolveLocale(undefined, navigator.language);
let t = translator(locale);
import { App } from '@modelcontextprotocol/ext-apps';
import { createActivityPanel } from './activity-ui.mjs';
import { createManagementPanel } from './management-ui.mjs';
const updateActivity = createActivityPanel(document.querySelector('#activity-panel'), locale, () => app.callServerTool({name:'check_plugin_status',arguments:{}}));
const status = document.querySelector('#status');
const app = new App({ name: 'plugin-skill-manager', version: packageInfo.version }, {});
const updateManagement = createManagementPanel(document.querySelector('#workspace-panel'), args => app.callServerTool(args), receive, locale);
let connected = false, hasData = false, lastRefresh = 0, pending = null;
function receive(result) {
  const data = result.structuredContent;
  if (result.isError || data?.mode !== 'inventory' || !Array.isArray(data.skills)) {
    status.hidden = false;
    status.textContent = t(statusKey = "统计数据暂不可读取，请重新打开Plugin & Skill Manager。");
    return;
  }
  updateActivity(data);
  updateManagement(data);
  hasData = true;
  lastRefresh = Date.now();
  status.hidden = true;
}
function setLocale(context = {}) {
  locale = resolveLocale(context.locale, locale);
  t = translator(locale);
  document.documentElement.lang = locale;
  document.title = t('Plugin & Skill Manager');
  document.querySelector('#app-version').textContent = t('版本 {0}', `v${packageInfo.version}`);
  document.querySelector('h1').textContent = t('Plugin & Skill Manager');
  document.querySelector('header p').textContent = t('查看本地技能文件与来源证据。');
  document.querySelector('#activity-panel').setAttribute('aria-label', t('使用活动热力图与排名'));
  updateActivity.setLocale(locale);
  updateManagement.setLocale(locale);
  if (!status.hidden) status.textContent = t(statusKey);
}
let statusKey = '正在读取统计…';
setLocale({locale});
app.onhostcontextchanged = setLocale;
app.ontoolresult = receive;
async function refresh() {
  if (!connected || pending || (hasData && Date.now() - lastRefresh < 1000)) return;
  pending = app.callServerTool({ name: 'open_skill_manager', arguments: {} });
  try { receive(await pending); }
  catch {
    status.hidden = false;
    status.textContent = t(statusKey = hasData ? "统计刷新失败，暂时保留上次结果；重新进入面板时会重试。" : "统计数据暂不可读取，请重新打开Plugin & Skill Manager。");
  } finally { pending = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
window.addEventListener('focus', () => { void refresh(); });
app.connect().then(() => {
  setLocale(app.getHostContext());
  connected = true;
  // A global panel may open without an initial tool result.
  if (!hasData) void refresh();
}).catch(() => {
  status.hidden = false;
  status.textContent = t(statusKey = "管理器连接未完成，请重新打开面板。");
});


