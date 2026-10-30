import packageInfo from '../package.json' with { type: 'json' };
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { pathToFileURL } from 'node:url';
import { scanInventory } from './inventory.mjs';
import { loadPluginStatus, applyPluginStatus } from './plugins.mjs';
import { UsageIndex } from './usage-index.mjs';
import { ArchiveManager } from './archive.mjs';
import { z } from 'zod';
import { SkillNotes } from './skill-notes.mjs';
import { Adoptions } from './adoptions.mjs';
import { PluginCalls } from './plugin-calls.mjs';
import { registerDashboard } from './dashboard-resource.mjs';
import { initializeData } from './data-migration.mjs';
import { appIcon, sidebarIcon } from './app-icon.mjs';
import { diagnoseEnvironment, runDoctor } from './environment-health.mjs';
import { AutoCapture } from './auto-capture.mjs';
import { CaptureController } from './capture-settings.mjs';

export function createServer(roots, { queryPlugins = loadPluginStatus, usageIndex = new UsageIndex(), archiveManager = new ArchiveManager({ roots }), skillNotes = new SkillNotes(), adoptions = new Adoptions(), pluginCalls = new PluginCalls(), captureController = null, diagnosticOptions = {} } = {}) {
const autoCapture = captureController;
let pluginSnapshot = null, usageSnapshot = null;
let initialPluginRead;
let healthPending = null;
let usagePeriod = { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
async function inventoryWithArchives({ includeActivity = true } = {}) {
  let inventory = await scanInventory(roots);
  inventory.managerIcon = appIcon.src;
  if (!pluginSnapshot) {
    initialPluginRead ||= queryPlugins().then(status => { pluginSnapshot = status; }).catch(() => {});
    await initialPluginRead;
  }
  if (includeActivity) {
  if (autoCapture) {
    try {
      const coverage = await autoCapture.refresh();
      if (coverage) inventory.capture = { ...coverage, intervalSeconds: autoCapture.current.intervalSeconds };
    }
    catch { inventory.issues.push({ path: autoCapture.collector.stateFile, reason: '自动采集失败，保留已有统计，请检查诊断状态' }); }
    try { inventory.captureStatus = await autoCapture.info(); }
    catch { inventory.captureStatus = { enabled: null, lastError: '无法读取采集状态' }; }
  }
  else inventory.captureStatus = { enabled: false, coverage: null, lastError: null };
  // Restore persisted statistics after a service restart; never import chat logs on open.
  if (!usageSnapshot) {
    try { usageSnapshot = await usageIndex.query(inventory.skills, usagePeriod); }
    catch (error) {
      if (error.code !== 'ENOENT') inventory.issues.push({ path: usageIndex.options?.stateFile || '本地使用索引', reason: '已有使用统计无法读取；请检查索引，原文件未修改' });
    }
  }
  inventory.usage = usageSnapshot;
  try { inventory.pluginCalls = await pluginCalls.summary(usagePeriod); }
  catch { inventory.pluginCalls = null; inventory.issues.push({path:pluginCalls.file,reason:'插件调用记录无法读取；未将失败当作零'}); }
  try { inventory.adoptions = await adoptions.summary(usagePeriod); inventory.adoptions.coverage.complete = false; }
  catch { inventory.adoptions = null; inventory.issues.push({path:adoptions.file,reason:'采用记录无法读取；未将读取失败当作零使用'}); }
  } else { inventory.inventoryScope = 'management'; delete inventory.usage; }
  if (pluginSnapshot) inventory = applyPluginStatus(inventory, pluginSnapshot);
  inventory.managementSupported = process.platform === 'win32';
  try {
    const notes = await skillNotes.read();
    inventory.notesAvailable = true;
    for (const skill of inventory.skills) {
      const entry = notes.entries[skill.id];
      if (entry) skill.annotation = { ...entry, contentChanged: entry.fingerprint !== skill.fingerprint };
    }
  } catch { inventory.notesAvailable = false; inventory.issues.push({ path: skillNotes.file, reason: '本地备注无法读取，已保留原文件并禁用编辑' }); }
  try { inventory.archives = await archiveManager.list(); }
  catch { inventory.archives = []; inventory.issues.push({ path: archiveManager.archiveRoot, reason: '归档记录无法读取' }); }
  return inventory;
}
const server = new McpServer({ name: 'plugin-skill-manager', version: packageInfo.version, icons: [sidebarIcon] });
const uri = registerDashboard(server);
server.registerTool('open_skill_manager', {
  title: 'Plugin & Skill Manager',
  description: '扫描技能并打开管理器。启用自动采集时增量读取本机日志的宿主工具事件，只保存调用标识和时间，不保存正文。',
  inputSchema: {},
  annotations: { readOnlyHint: !autoCapture, destructiveHint: false, openWorldHint: false },
  _meta: { ui: { resourceUri: uri }, 'openai/ui': { entrypoints: [{ type: 'global' }] } },
}, async () => {
  const inventory = await inventoryWithArchives();
  return { content: [{ type: 'text', text: `发现 ${inventory.skills.length} 个技能文件实例；${inventory.issues.length} 个扫描问题。安装和使用信号按各自核对时间展示。` }], structuredContent: inventory };
});
server.registerTool('check_recording_status', {
  title: '检查环境与记录状态',
  description: '只读诊断运行依赖、Codex CLI、安装注册、数据目录权限、账本与采集状态，逐项返回状态和修复建议，同时保留记录总数与最近时间。CLI 查询超时后返回部分结果。不读取会话正文、不写测试记录、不修改配置；空账本不证明没有活动，也不证明原生界面已接入。',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async () => {
  healthPending ??= diagnoseEnvironment({ ...diagnosticOptions, roots, stores: { adoptions, pluginCalls, skillNotes, usageIndex }, captureController: autoCapture }).finally(() => { healthPending = null; });
  const status = await healthPending;
  const counts = status.health.summary;
  return { content: [{ type: 'text', text: `环境检查完成：${counts.error} 项错误，${counts.warning} 项提醒，${counts.unknown} 项未确认。逐项建议见诊断数据。` }], structuredContent: { mode: 'recording-status', ...status } };
});
server.registerTool('configure_auto_capture', {
  title: '配置本机全局插件调用采集',
  description: '按用户要求启停跨会话本地日志采集并设置 5 至 3600 秒检查间隔。启用后读取 sessions 和 archived_sessions 的真实 MCP 调用事件；仅保存标识与时间。配置在本机持久化，不调用模型、不联网、不自动确认 Skill 采用。',
  inputSchema: { enabled: z.boolean(), intervalSeconds: z.number().int().min(5).max(3600).default(10) },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async args => {
  if (!autoCapture) return { isError: true, content: [{ type: 'text', text: '当前服务没有自动采集控制器，请重载新版服务。' }] };
  try {
    const configuration = await autoCapture.configure(args);
    return { content: [{ type: 'text', text: args.enabled ? '本机自动采集已启用，后续无需逐次手动上报。' : '本机自动采集已停用，已有记录保留；已开始的一轮可能完成。' }], structuredContent: { mode: 'capture-configuration', ...configuration } };
  } catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
});
server.registerTool('check_plugin_status', {
  title: '核对插件安装状态',
  description: '通过官方 app-server plugin/installed 读取已安装插件版本和启用状态，不拉取远程市场目录，不扫描活动日志。',
  inputSchema: {},
  annotations: { readOnlyHint: !autoCapture, destructiveHint: false, openWorldHint: true },
}, async () => {
  try {
    const status = await queryPlugins();
    pluginSnapshot = status;
    const inventory = await inventoryWithArchives({ includeActivity: false });
    return { content: [{ type: 'text', text: `已读取 ${status.plugins.length} 条插件安装记录；未匹配缓存不等于未安装。` }], structuredContent: inventory };
  } catch {
    return { isError: true, content: [{ type: 'text', text: '无法读取插件安装清单。请检查 Codex CLI 是否支持 plugin/installed 及本地安装状态；保留现有清单，不推断安装状态。' }] };
  }
});
server.registerTool('import_usage', {
  title: '增量导入本机使用信号',
  description: '读取本机 Codex sessions 和 archived_sessions 日志，增量提取显式标记与读取请求。只将信号、来源定位和读取位置写入独立持久数据目录中的 usage-index.json，不保存聊天正文，不联网。',
  inputSchema: {},
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async () => {
  try {
    const inventory = await inventoryWithArchives();
    usageSnapshot = await usageIndex.refresh(inventory.skills, usagePeriod);
    inventory.usage = usageSnapshot;
    return { content: [{ type: 'text', text: `已索引 ${inventory.usage.coverage.indexedFiles} 个日志文件；剩余 ${inventory.usage.coverage.pendingBytes} 字节尚未处理。信号不等于成功执行次数。` }], structuredContent: inventory };
  } catch {
    return { isError: true, content: [{ type: 'text', text: '导入失败，保留之前的索引。请检查日志权限、本地索引格式或是否已有导入占用；恢复方法见仓库本地验证文档。' }] };
  }
});
server.registerTool('query_usage', {
  title: '按期间查询使用信号', description: '查询已有 Skill 索引与插件账本；启用自动采集时先增量接收本机宿主调用事件。时间需带时区，包含起点、不包含终点。',
  inputSchema: { from: z.string().datetime({ offset: true }).optional(), to: z.string().datetime({ offset: true }).optional(), timeZone: z.string().max(80).optional() },
  annotations: { readOnlyHint: !autoCapture, destructiveHint: false, openWorldHint: false },
}, async period => {
  try {
    const inventory = await inventoryWithArchives();
    const adoptionSummary = await adoptions.summary(period);
    const callSummary = await pluginCalls.summary(period);
    let result = null;
    try { result = await usageIndex.query(inventory.skills, period); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    usagePeriod = period; usageSnapshot = result; inventory.usage = result;
    adoptionSummary.coverage.complete = false;
    inventory.adoptions = adoptionSummary;
    inventory.pluginCalls = callSummary;
    return { content: [{ type: 'text', text: '已按期间查询统计；启用时自动采集插件宿主事件。' }], structuredContent: inventory };
  } catch { return { isError: true, content: [{ type: 'text', text: '查询失败。请检查时间范围，并先导入一次使用信号更新索引；原结果保留。' }] }; }
});
const managementError = error => ({ isError: true, content: [{ type: 'text', text: error.code ? '文件操作失败，请检查路径权限及操作记录；未确认成功。' : error.message }] });
server.registerTool('record_plugin_calls', {
  title:'记录插件工具调用',
  description:'实际调用插件工具后就近合批记录，每项一次调用尝试（失败也计）；id 使用调用 ID 或事先生成的 UUID，记录重试沿用，新的实际调用使用新 ID。plugin 为工具所属插件命名空间，如 github；tool 为完整 mcp__codex_apps__github_get_repo 名称。仅记录已发生调用，不记录发现、计划或历史补记。不传参数或结果正文，与 Skill 采用分开。',
  inputSchema:{calls:z.array(z.object({id:z.string().regex(/^[A-Za-z0-9_-]{16,160}$/),plugin:z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/),tool:z.string().max(240)}).strict()).min(1).max(32)},
  annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
},async ({calls})=>{try {await pluginCalls.record(calls); return {content:[{type:'text',text:'OK'}]};} catch(error){return managementError(error);} });
server.registerTool('record_skill_use', {
  title: '记录技能采用',
  description: '采用技能时批量记录。id 为新批次唯一 ID（重试沿用）；skills 为技能名、插件名:技能名或准确路径，可重复，每项计一次。不用于历史补记或仅阅读审计。',
  inputSchema: {id:z.string().regex(/^[A-Za-z0-9_-]{16,80}$/),skills:z.array(z.string().min(1).max(1024)).min(1).max(32)},
  annotations: {readOnlyHint:false,destructiveHint:false,openWorldHint:false},
}, async args => {
  try { await adoptions.record(args, async () => (await scanInventory(roots)).skills); return {content:[{type:'text',text:'OK'}]}; }
  catch (error) { return managementError(error); }
});
server.registerTool('save_skill_note', {
  title: '保存技能保留备注', description: '保存用户提供的本地备注和保留标记，不修改技能文件或启停状态。需基于当前文件指纹和备注版本，冲突时拒绝覆盖。',
  inputSchema: { id: z.string().regex(/^[a-f0-9]{64}$/), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), note: z.string().max(1000), retain: z.boolean(), expectedRevision: z.number().int().nonnegative() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async args => {
  try {
    const current = (await scanInventory(roots)).skills.find(s => s.id === args.id);
    if (!current || current.fingerprint !== args.fingerprint) throw new Error('技能内容已变化或不存在，请重新扫描后编辑');
    await skillNotes.save(args);
    return { content: [{ type: 'text', text: '本地备注已保存；技能内容和启停状态不变。' }], structuredContent: await inventoryWithArchives() };
  } catch (error) { return managementError(error); }
});
server.registerTool('preview_skill_archive', {
  title: '预览用户技能归档', description: '只读预览用户技能目录的归档范围与影响，不执行移动。系统和插件内容不可归档。',
  inputSchema: { skillId: z.string().regex(/^[0-9a-f]{64}$/) }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async ({ skillId }) => {
  try { const plan = await archiveManager.previewArchive(skillId); return { content: [{ type: 'text', text: `${plan.title}：${plan.files} 个文件，${plan.bytes} 字节。${plan.impact}` }], structuredContent: { mode: 'management-plan', plan } }; }
  catch (error) { return managementError(error); }
});
server.registerTool('preview_skill_restore', {
  title: '预览用户技能恢复', description: '只读核对已归档技能并生成恢复预览；原位置已有内容时拒绝覆盖。',
  inputSchema: { archiveId: z.string().uuid() }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async ({ archiveId }) => {
  try { const plan = await archiveManager.previewRestore(archiveId); return { content: [{ type: 'text', text: `${plan.title}：${plan.impact}` }], structuredContent: { mode: 'management-plan', plan } }; }
  catch (error) { return managementError(error); }
});
server.registerTool('execute_skill_plan', {
  title: '执行已预览的归档或恢复', description: '仅在用户已针对该具体预览明确要求执行后调用。按一次性预览令牌移动用户技能目录，保留恢复记录；系统和插件只读。',
  inputSchema: { token: z.string().uuid() }, annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
}, async ({ token }) => {
  try { const operation = await archiveManager.execute(token); const inventory = await inventoryWithArchives(); inventory.operation = operation; return { content: [{ type: 'text', text: operation.status === 'archived' ? '已归档，可从归档记录恢复。' : '已恢复至原位置。' }], structuredContent: inventory }; }
  catch (error) { return managementError(error); }
});
server.registerTool('cancel_skill_plan', {
  title: '取消管理预览', description: '使尚未执行的归档或恢复预览失效，不修改技能文件。',
  inputSchema: { token: z.string().uuid() }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async ({ token }) => { archiveManager.cancel(token); return { content: [{ type: 'text', text: '预览已取消。' }], structuredContent: { mode: 'management-cancelled' } }; });
return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--diagnose')) process.exitCode = await runDoctor({ json: process.argv.includes('--json'), locale: process.argv.includes('--zh') ? 'zh' : 'en' });
  else {
    const data = await initializeData();
    if (process.argv.includes('--initialize-data')) console.log(JSON.stringify(data, null, 2));
    else {
      const captureController = new CaptureController(new AutoCapture());
      const stop = captureController.start();
      const service = createServer(undefined, { captureController });
      service.server.onclose = stop;
      await service.connect(new StdioServerTransport());
    }
  }
}
