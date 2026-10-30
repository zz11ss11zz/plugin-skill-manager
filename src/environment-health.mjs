import { access, lstat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { dataDirectory } from './data-path.mjs';
import { Adoptions } from './adoptions.mjs';
import { PluginCalls } from './plugin-calls.mjs';
import { SkillNotes } from './skill-notes.mjs';
import { CaptureSettings } from './capture-settings.mjs';
import { recordingStatus } from './recording-status.mjs';
import { readStoredJson, readCaptureState, readUsageSnapshot } from './stored-state.mjs';
import { queryInstalledPlugins, parseInstalledPlugins } from './plugins.mjs';
import { bundledDashboard } from './bundled-dashboard.mjs';

const run = promisify(execFile);
const resolveDependency = createRequire(import.meta.url).resolve;
const text = (zh, en) => ({ zh, en });
const retry = text('检查 CLI 路径、当前权限和 Codex 环境后重试；原配置保持不变。', 'Check the CLI path, permissions and Codex environment, then retry. Existing configuration is preserved.');
const preserve = text('保留原文件，核对权限、格式或备份；不要清空账本或删除锁文件。', 'Preserve the file and inspect permissions, format or backups. Do not reset ledgers or delete locks.');
const unavailable = () => { throw new Error('Unavailable'); };
const check = (id, title, status, code, message, action = null, facts = {}) => ({ id, title, status, code, message, action, facts });
const errorCode = error => ['ENOENT', 'EACCES', 'EPERM', 'ETIMEDOUT', 'EOUTPUTLIMIT', 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', 'EINVAL', 'ELINK'].includes(error?.code) ? error.code : error?.killed ? 'ETIMEDOUT' : 'UNREADABLE';
const failureMessage = code => ({
  ENOENT: text('所需文件或程序不存在。', 'A required file or executable is missing.'),
  EACCES: text('当前进程没有访问权限。', 'The current process lacks access permission.'),
  EPERM: text('当前环境拒绝了此项访问。', 'The current environment denied access.'),
  ETIMEDOUT: text('本机 CLI 查询超时，已结束本次查询。', 'The local CLI query timed out and was stopped.'),
  ELINK: text('目录或父目录是链接，未继续读取其内容。', 'The directory or an ancestor is a link; its contents were not read.'),
  EINVAL: text('目录配置不是有效的绝对目录路径。', 'The directory configuration is not a valid absolute directory path.'),
}[code] || text('此项无法读取或格式不受支持；原数据保留。', 'This item is unreadable or has an unsupported format; original data is preserved.'));

// Inspect every ancestor; missing optional directories are expected. No write probe.
export async function inspectDirectory(directory, { stat = lstat, canAccess = access, writable = false } = {}) {
  if (!path.isAbsolute(directory)) throw Object.assign(new Error('Absolute path required'), { code: 'EINVAL' });
  let nearest = null, exists = false;
  for (let cursor = path.normalize(directory); ; cursor = path.dirname(cursor)) {
    try {
      const info = await stat(cursor);
      if (info.isSymbolicLink()) throw Object.assign(new Error('Linked directory'), { code: 'ELINK' });
      if (!info.isDirectory()) throw Object.assign(new Error('Not a directory'), { code: 'EINVAL' });
      if (!nearest) { nearest = cursor; exists = cursor === path.normalize(directory); }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (path.dirname(cursor) === cursor) break;
  }
  if (!nearest) throw Object.assign(new Error('No accessible ancestor'), { code: 'ENOENT' });
  await canAccess(nearest, constants.R_OK | (writable ? constants.W_OK : 0));
  return { exists };
}

export async function probeCli(kind, { env = process.env, timeoutMs = 3000 } = {}) {
  const cli = env.CODEX_SKILL_MANAGER_CLI || 'codex';
  if (kind === 'plugins') return parseInstalledPlugins(await queryInstalledPlugins({ cli, env, timeoutMs }));
  const args = kind === 'version' ? ['--version'] : ['mcp', 'list', '--json'];
  const { stdout } = await run(cli, args, { env, windowsHide: true, timeout: timeoutMs, maxBuffer: 1024 * 1024, encoding: 'utf8' });
  if (kind === 'version') {
    const version = /^codex(?:-cli)?\s+(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)\s*$/m.exec(stdout)?.[1];
    if (!version) throw new Error('Unrecognized CLI response');
    return version;
  }
  const registrations = JSON.parse(stdout);
  if (!Array.isArray(registrations) || registrations.some(item => typeof item?.name !== 'string')) throw new Error('Invalid registration response');
  return registrations;
}

export function registrationCheck(mcp, plugins, { entry = fileURLToPath(new URL('./server.mjs', import.meta.url)), executable = process.execPath, platform = process.platform } = {}) {
  const title = text('管理器安装与注册', 'Manager installation and registration');
  const list = mcp.status === 'fulfilled' ? mcp.value.filter(r => ['plugin-skill-manager', 'codex-skill-manager'].includes(r.name)) : [];
  const installed = plugins.status === 'fulfilled' ? plugins.value.filter(p => /^(plugin-skill-manager|codex-skill-manager)@/.test(p.id)) : [];
  const facts = { registrations: list.length, installedPlugins: installed.length, mcpChecked: mcp.status === 'fulfilled', pluginsChecked: plugins.status === 'fulfilled' };
  const action = text('核对当前来源和版本，保留需要的一份安装；仅在确认后调整注册。', 'Review the source and version, keep the intended installation, and change registration only after confirmation.');
  if (list.some(r => r.name === 'codex-skill-manager') || installed.some(p => p.id.startsWith('codex-skill-manager@'))) return check('registration', title, 'warning', 'legacy-registration', text('发现旧名称安装或注册。', 'A legacy installation or registration was found.'), action, facts);
  if (list.length + installed.length > 1) return check('registration', title, 'warning', 'multiple-installations', text('发现多个管理器来源，需要核对是否重复。', 'Multiple manager sources were found; check for duplication.'), action, facts);
  const normalize = value => platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
  const current = list[0];
  if (current) {
    const transport = current.transport;
    const matches = transport?.type === 'stdio' && typeof transport.command === 'string' && path.isAbsolute(transport.command) && normalize(transport.command) === normalize(executable) && Array.isArray(transport.args) && transport.args.length === 1 && typeof transport.args[0] === 'string' && path.isAbsolute(transport.args[0]) && normalize(transport.args[0]) === normalize(entry);
    if (!matches) return check('registration', title, 'warning', 'different-entry', text('同名注册使用其他启动入口，尚未确认与当前副本一致。', 'The named registration uses a different entry point; its match to this copy is unverified.'), action, facts);
  }
  const active = current || installed[0];
  if (active?.enabled === false) return check('registration', title, 'warning', 'disabled', text('管理器已安装，但当前记录显示未启用。', 'The manager is installed but is reported as disabled.'), action, facts);
  if (!facts.mcpChecked || !facts.pluginsChecked) return check('registration', title, 'unknown', 'incomplete-registry', text('安装状态检查不完整，无法排除另一个来源或重复注册。', 'Installation checks are incomplete; another source or duplicate registration cannot be ruled out.'), retry, facts);
  if (!active) return check('registration', title, 'warning', 'not-registered', text('当前 CLI 环境未找到管理器；其他宿主或环境的安装未核实。', 'This CLI environment has no manager registration; other hosts or environments are unverified.'), text('核对 Codex 数据目录与安装方式，按安装说明接入完整插件或本地 MCP。', 'Check the Codex home and installation method, then follow the full plugin or local MCP installation guide.'), facts);
  return check('registration', title, active.enabled === true ? 'ok' : 'unknown', active.enabled === true ? 'registered' : 'enabled-unknown', text(active.enabled === true ? '已找到启用的管理器。' : '已找到管理器，但启用状态未知。', active.enabled === true ? 'An enabled manager was found.' : 'The manager was found, but enablement is unknown.'), active.enabled === true ? null : retry, facts);
}

// No initializer, collector refresh, session contents, config edits or test events.
// Callers may pass their live stores so diagnostics follow the same data scope.
export async function diagnoseEnvironment({ env = process.env, home = os.homedir(), platform = process.platform, nodeVersion = process.versions.node, stores = {}, captureController = null, roots, cliProbe = probeCli, directoryProbe = inspectDirectory, dependencyResolver = resolveDependency, now = Date.now() } = {}) {
  const checks = [], jobs = [];
  const schedule = (id, title, task, failureStatus = 'error', action = preserve) => {
    const job = Promise.resolve().then(task).catch(error => check(id, title, failureStatus, errorCode(error), failureMessage(errorCode(error)), action));
    jobs.push(job); return job;
  };
  const [major, minor] = nodeVersion.split('.').map(Number), supported = major > 20 || major === 20 && minor >= 18;
  checks.push(check('node', text('Node.js 运行环境', 'Node.js runtime'), supported ? 'ok' : 'error', supported ? 'supported' : 'unsupported-node', text('要求 Node.js 20.18 或更高版本。', 'Node.js 20.18 or newer is required.'), supported ? null : text('升级本机 Node.js 后重试。', 'Update local Node.js and retry.'), { version: nodeVersion }));
  checks.push(check('platform', text('平台范围', 'Platform scope'), platform === 'win32' ? 'ok' : 'warning', platform === 'win32' ? 'windows' : 'limited-platform', text(platform === 'win32' ? '当前为项目已验证的 Windows 平台。' : '此平台未完成项目验收；归档管理不可用。', platform === 'win32' ? 'Running on the project-tested Windows platform.' : 'This platform has not passed project acceptance; archive management is unavailable.')));
  schedule('dependencies', text('服务依赖与界面', 'Server dependencies and dashboard'), async () => {
    if (!bundledDashboard) {
      for (const name of ['@modelcontextprotocol/sdk/server/mcp.js', '@modelcontextprotocol/ext-apps', 'zod', 'yaml', 'acorn']) dependencyResolver(name);
      const dashboard = fileURLToPath(new URL('../dist/dashboard.html', import.meta.url));
      const info = await lstat(dashboard);
      if (!info.isFile() || info.size === 0) throw new Error('Missing dashboard');
      await access(dashboard, constants.R_OK);
    }
    return check('dependencies', text('服务依赖与界面', 'Server dependencies and dashboard'), 'ok', 'available', text('启动依赖与已构建界面可定位；未启动服务进行自测。', 'Startup dependencies and the built dashboard are available; service startup was not exercised.'));
  }, 'error', text('源码安装请运行 npm ci 和 npm run build；完整包请核对解压内容。', 'For source installs run npm ci and npm run build; for a complete package verify extracted files.'));

  let data, codexHome;
  try {
    data = dataDirectory(env, home); codexHome = env.CODEX_HOME || path.join(home, '.codex');
    if (!path.isAbsolute(codexHome)) throw new Error('Invalid home');
  } catch {
    checks.push(check('paths', text('数据路径配置', 'Data path configuration'), 'error', 'invalid-path', text('CODEX_HOME 与数据目录覆盖值必须为绝对路径。', 'CODEX_HOME and the data directory override must be absolute paths.'), text('修正路径配置后重试，不迁移或清空现有数据。', 'Correct the configured paths and retry without moving or resetting existing data.')));
  }
  let settings = null, coverage = null;
  if (data) {
    schedule('storage', text('数据目录权限', 'Data directory permissions'), async () => {
      const info = await directoryProbe(data, { writable: true });
      return check('storage', text('数据目录权限', 'Data directory permissions'), info.exists ? 'ok' : 'info', info.exists ? 'accessible' : 'not-initialized', text(info.exists ? '目录权限预检通过；没有写入测试文件。' : '数据目录尚未初始化，最近已有父目录权限预检通过。', info.exists ? 'Directory permission preflight passed; no test file was written.' : 'Data is not initialized; the nearest existing parent passed permission preflight.'), null, { exists: info.exists, writeTested: false });
    });
    schedule('migration', text('数据初始化记录', 'Data initialization receipt'), async () => {
      // A failed permission preflight does not prevent independent readable-file checks.
      await directoryProbe(data);
      const legacy = env.CODEX_SKILL_MANAGER_LEGACY_DIR || fileURLToPath(new URL('../.local', import.meta.url));
      const legacyInfo = await directoryProbe(legacy);
      const normalize = value => platform === 'win32' ? path.normalize(value).toLowerCase() : path.normalize(value);
      const sourceKey = normalize(legacy), targetKey = normalize(data);
      if (sourceKey === targetKey || sourceKey.startsWith(targetKey + path.sep) || targetKey.startsWith(sourceKey + path.sep)) throw new Error('Overlapping migration paths');
      const exists = (await lstat(data).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) !== null;
      if (!exists) {
        if (env.CODEX_SKILL_MANAGER_LEGACY_DIR && !legacyInfo.exists) throw Object.assign(new Error('Missing legacy directory'), { code: 'ENOENT' });
        return check('migration', text('数据初始化记录', 'Data initialization receipt'), 'info', 'not-initialized', text('首次正常启动时初始化，诊断不会创建数据。', 'Normal first startup initializes data; diagnostics do not create it.'));
      }
      const receipt = await readStoredJson(path.join(data, 'migration.json'), 1024 * 1024);
      if (receipt?.version !== 1 || !Array.isArray(receipt.files)) throw new Error('Invalid receipt');
      if (env.CODEX_SKILL_MANAGER_LEGACY_DIR && normalize(receipt.source || '') !== sourceKey) throw new Error('Source mismatch');
      return check('migration', text('数据初始化记录', 'Data initialization receipt'), 'ok', 'valid', text('初始化记录可读取。', 'The initialization receipt is readable.'));
    });
    const file = (store, fallback) => store?.file || path.join(data, fallback);
    const definitions = [
      ['adoptions', text('Skill 采用账本', 'Skill adoption ledger'), stores.adoptions || new Adoptions(file(null, 'adoptions.json'))],
      ['pluginCalls', text('插件调用账本', 'Plugin call ledger'), stores.pluginCalls || new PluginCalls(file(null, 'plugin-calls.json'))],
      ['notes', text('技能备注', 'Skill notes'), stores.skillNotes || new SkillNotes(file(null, 'skill-notes.json'))],
      ['usage', text('历史使用索引', 'Historical usage index'), { file: stores.usageIndex?.options?.stateFile || file(null, 'usage-index.json'), read() { return readUsageSnapshot(this.file); } }],
      ['captureState', text('自动采集游标', 'Automatic capture state'), { file: captureController?.collector?.stateFile || file(null, 'auto-capture.json'), read() { return readCaptureState(this.file); } }],
    ];
    const snapshots = {};
    for (const [id, title, store] of definitions) schedule(id, title, async () => {
      await directoryProbe(path.dirname(store.file));
      let state;
      try { state = await store.read(); }
      catch (error) { if (error.code === 'ENOENT' && ['usage', 'captureState'].includes(id)) state = null; else throw error; }
      snapshots[id] = state;
      if (id === 'captureState') coverage = state?.coverage ?? null;
      const present = Boolean(await lstat(store.file).catch(error => { if (error.code === 'ENOENT') return null; throw error; }));
      return check(id, title, state && present ? 'ok' : 'info', state && present ? 'readable' : 'no-snapshot', text(state && present ? '已有文件可读取；空账本不证明没有实际活动。' : '尚无此类记录文件，可能尚未启用或产生记录。', state && present ? 'Stored data is readable; an empty ledger does not prove inactivity.' : 'No stored file of this kind yet; recording may not be enabled or may not have produced records.'));
    });
    schedule('settings', text('自动采集设置', 'Automatic capture settings'), async () => {
      const store = captureController?.settings || new CaptureSettings(file(null, 'auto-capture-settings.json'), env);
      await directoryProbe(path.dirname(store.file));
      settings = await store.read();
      return check('settings', text('自动采集设置', 'Automatic capture settings'), settings.enabled ? 'ok' : 'info', settings.enabled ? 'enabled' : 'disabled', text(settings.enabled ? '自动采集已启用。' : '自动采集未启用，这是有效设置；Skill 采用仍需主动上报。', settings.enabled ? 'Automatic capture is enabled.' : 'Automatic capture is off, which is valid; Skill adoptions still require reports.'));
    });
    schedule('locks', text('数据占用', 'Data locks'), async () => {
      await directoryProbe(data);
      const files = [`${data}.migration.lock`, ...definitions.map(([, , store]) => `${store.file}.lock`), `${file(captureController?.settings, 'auto-capture-settings.json')}.lock`];
      const results = await Promise.all(files.map(async name => { try { await lstat(name); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }));
      const count = results.filter(Boolean).length;
      return check('locks', text('数据占用', 'Data locks'), count ? 'warning' : 'ok', count ? 'locks-present' : 'clear', text(count ? '发现锁文件，可能有写入正在进行；未判定为死锁。' : '未发现已知数据锁。', count ? 'Lock files exist; a writer may be active. This is not a deadlock diagnosis.' : 'No known data locks were found.'), count ? text('稍后重新检查；若持续存在，确认占用进程后再处理。诊断不会删除锁。', 'Retry later; if persistent, identify the owning process before taking action. Diagnostics never remove locks.') : null, { count });
    });
    // Resolve the recording view from the same read snapshots, never read a ledger twice.
    stores = { snapshots };
  }
  if (codexHome) {
    const directories = roots || { skills: path.join(codexHome, 'skills'), agentSkills: path.join(home, '.agents', 'skills'), cache: path.join(codexHome, 'plugins', 'cache') };
    const names = { codexHome: text('Codex 本地目录', 'Local Codex directory'), skills: text('个人技能目录', 'Personal Skill directory'), agentSkills: text('共享个人技能目录', 'Shared personal Skill directory'), cache: text('插件缓存目录', 'Plugin cache directory'), sessions: text('会话日志目录', 'Session log directory'), archivedSessions: text('归档会话目录', 'Archived session directory') };
    for (const [id, directory] of Object.entries({ codexHome, ...directories, sessions: path.join(codexHome, 'sessions'), archivedSessions: path.join(codexHome, 'archived_sessions') })) {
      const title = names[id] || text('其他来源目录', 'Other source directory');
      schedule(`directory.${id}`, title, async () => {
        const { exists } = await directoryProbe(directory);
        return check(`directory.${id}`, title, exists ? 'ok' : id === 'codexHome' ? 'warning' : 'info', exists ? 'accessible' : 'absent', text(exists ? '目录权限预检通过，未读取会话内容。' : '目录不存在；可选来源尚未产生数据时属于正常情况。', exists ? 'Directory permission preflight passed; session contents were not read.' : 'Directory is absent; optional sources may not have produced data yet.'));
      });
    }
  }
  const cli = Promise.allSettled(['version', 'mcp', 'plugins'].map(kind => Promise.resolve().then(() => cliProbe(kind, { env, timeoutMs: 3000 }))));
  await Promise.all(jobs).then(results => checks.push(...results));
  const [version, mcp, plugins] = await cli;
  for (const [id, result, label] of [['cli', version, text('Codex CLI', 'Codex CLI')], ['mcp', mcp, text('MCP 注册清单', 'MCP registrations')], ['plugins', plugins, text('插件安装清单', 'Installed plugins')]]) {
    checks.push(result.status === 'fulfilled'
      ? check(id, label, 'ok', 'available', text('本机 CLI 查询成功。', 'Local CLI query succeeded.'), null, id === 'cli' ? { version: result.value } : {})
      : check(id, label, 'unknown', errorCode(result.reason), failureMessage(errorCode(result.reason)), retry));
  }
  checks.push(registrationCheck(mcp, plugins, { platform }));
  const captureTitle = text('采集运行情况', 'Capture activity');
  const captureAction = text('检查服务是否正在运行及日志目录权限，再检查一次；此诊断不会启动采集或导入历史。', 'Check that the service is running and can access log directories, then retry; diagnostics do not start capture or import history.');
  const checked = Date.parse(coverage?.checkedAt), age = now - checked;
  if (!settings) checks.push(check('capture', captureTitle, 'unknown', 'settings-unavailable', text('无法确定自动采集是否启用。', 'Automatic capture enablement is unknown.'), preserve));
  else if (!settings.enabled) checks.push(check('capture', captureTitle, 'info', 'disabled', text('自动采集已关闭，已有记录仍保留。', 'Automatic capture is off; existing records are preserved.')));
  else if (captureController?.lastError) checks.push(check('capture', captureTitle, 'error', 'collector-error', text('运行中的采集器报告失败，记录覆盖可能不完整。', 'The running collector reported an error; recorded coverage may be incomplete.'), captureAction));
  else if (!Number.isFinite(checked)) checks.push(check('capture', captureTitle, 'warning', 'no-scan', text('已启用，但尚无可用扫描时间。', 'Enabled, but no usable scan timestamp is available.'), captureAction));
  else if (age < -60000 || age > Math.max(60000, settings.intervalSeconds * 3000)) checks.push(check('capture', captureTitle, 'warning', age < 0 ? 'clock-skew' : 'stale-scan', text('最近扫描时间异常或已过期；单次快照不能证明服务持续运行。', 'The last scan time is inconsistent or stale; one snapshot does not prove continuous service activity.'), captureAction));
  else if (coverage.pendingBytes > 0 || coverage.issues?.length || coverage.malformedLines > 0 || coverage.oversizedLines > 0) checks.push(check('capture', captureTitle, 'warning', 'partial-coverage', text('最近扫描有积压或读取问题，覆盖不完整。', 'The recent scan has a backlog or read issues; coverage is incomplete.'), captureAction));
  else checks.push(check('capture', captureTitle, 'ok', 'recent-scan', text('有近期扫描快照，仍不能证明所有宿主活动都被记录。', 'A recent scan snapshot exists; this does not prove all host activity was recorded.')));
  const snapshots = stores.snapshots || {};
  const status = await recordingStatus({ read: async () => snapshots.adoptions || unavailable() }, { read: async () => snapshots.pluginCalls || unavailable() });
  if (snapshots.pluginCalls) {
    status.pluginCalls.sources = { hostEvents: snapshots.pluginCalls.calls.filter(c => c.source === 'host-event').length, assistantReports: snapshots.pluginCalls.calls.filter(c => c.source !== 'host-event').length };
    status.pluginCalls.countMeaning = 'stored-records-not-deduplicated-across-different-source-ids';
  }
  const safeCoverage = coverage ? Object.fromEntries(['checkedAt', 'discoveredFiles', 'pendingBytes', 'malformedLines', 'oversizedLines'].filter(key => Number.isFinite(coverage[key]) || key === 'checkedAt' && Number.isFinite(Date.parse(coverage[key]))).map(key => [key, key === 'checkedAt' ? new Date(coverage[key]).toISOString() : coverage[key]])) : null;
  if (safeCoverage) safeCoverage.issueCount = Array.isArray(coverage.issues) ? coverage.issues.length : 0;
  const summary = Object.fromEntries(['ok', 'info', 'warning', 'error', 'unknown'].map(level => [level, checks.filter(c => c.status === level).length]));
  return { ...status, checkedAt: new Date(now).toISOString(), automaticMonitoring: settings?.enabled ?? null, capture: settings ? settings.enabled ? 'local-host-events' : 'caller-reported' : 'unknown', configuration: settings ? { enabled: settings.enabled, intervalSeconds: settings.intervalSeconds, source: settings.source } : null, coverage: safeCoverage, lastError: checks.some(c => c.id === 'capture' && ['error', 'unknown'].includes(c.status)) ? 'Capture status unavailable; see health checks.' : null,
    health: { version: 1, status: summary.error ? 'error' : summary.unknown ? 'unknown' : summary.warning ? 'warning' : 'ok', checkedAt: new Date(now).toISOString(), summary, checks, scope: 'local-environment-preflight', nativeHostVerified: false } };
}

export async function runDoctor({ json = false, locale = 'en', ...options } = {}) {
  const result = await diagnoseEnvironment(options), report = result.health;
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Plugin & Skill Manager — ${report.status} (${report.checkedAt})`);
    for (const item of report.checks) {
      console.log(`[${item.status}] ${item.title[locale]}: ${item.message[locale]} (${item.code})`);
      if (item.action) console.log(`  ${item.action[locale]}`);
    }
  }
  return report.status === 'error' ? 1 : report.status === 'unknown' ? 2 : 0;
}
