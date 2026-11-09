// Route table: every MCP tool in one declarative list. The router registers these entries; it holds
// no tool-specific logic. Descriptions are written for the model and stay stable across releases
// because the companion Skills rely on them.
import { inputs } from '../../contracts/tools.mjs';
import { CAPABILITIES } from '../../ports/platform.mjs';

const ro = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const rw = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

/**
 * @typedef {object} Route
 * @property {string} name
 * @property {string} title
 * @property {string} description
 * @property {(config: object) => import('zod').ZodObject<any>} input
 * @property {object | ((ctx: {captureEnabled: boolean}) => object)} annotations
 * @property {string} handler                 controller method: '<controller>.<method>'
 * @property {'dashboard'|'app-only'} [ui]    dashboard = opens the UI; app-only = hidden from the model
 * @property {string[]} [requires]            capabilities that must all be available
 */

/** @type {Route[]} */
export const routes = [
  { name: 'open_skill_manager', title: 'Plugin & Skill Manager', handler: 'inventory.open', ui: 'dashboard',
    description: '扫描技能并打开管理器。启用自动采集时增量读取本机日志的宿主工具事件，只保存调用标识和时间，不保存正文。',
    input: inputs.open_skill_manager, annotations: ({ captureEnabled }) => ({ ...ro, readOnlyHint: !captureEnabled }) },
  { name: 'check_recording_status', title: '检查环境与记录状态', handler: 'health.status',
    description: '只读诊断运行依赖、Codex CLI、安装注册、数据目录权限、账本与采集状态，逐项返回状态和修复建议，同时保留记录总数与最近时间。CLI 查询超时后返回部分结果。不读取会话正文、不写测试记录、不修改配置；空账本不证明没有活动，也不证明原生界面已接入。',
    input: inputs.check_recording_status, annotations: ro },
  { name: 'configure_auto_capture', title: '配置本机全局插件调用采集', handler: 'recording.configureCapture', requires: [CAPABILITIES.toolEvents],
    description: '按用户要求启停跨会话本地日志采集并设置 5 至 3600 秒检查间隔。启用后读取 sessions 和 archived_sessions 的真实 MCP 调用事件；仅保存标识与时间。配置在本机持久化，不调用模型、不联网、不自动确认 Skill 采用。',
    input: inputs.configure_auto_capture, annotations: rw },
  { name: 'check_plugin_status', title: '核对插件安装状态', handler: 'inventory.checkPlugins',
    description: '通过官方 app-server plugin/installed 核对安装状态。includeReport=true 时比较用户技能及内部组件，读取已有使用记录，保存首次观察时间以评估超过一个月无记录的项目；days 为 30/60/90。不执行脚本、不拉取远程市场目录、不扫描活动日志。',
    input: inputs.check_plugin_status, annotations: { ...rw, openWorldHint: true } },
  { name: 'generate_redundancy_report', title: '生成冗余候选报告', handler: 'redundancy.generate',
    description: '核对插件安装状态后，比较用户技能及内部组件的重复文档、同名实例、用途重叠和插件多版本，并评估超过一个月无记录的项目；days 为 30/60/90。结果只是候选，不授权删除或停用。不执行脚本、不拉取远程市场目录、不扫描活动日志。',
    input: inputs.generate_redundancy_report, annotations: { ...rw, openWorldHint: true } },
  { name: 'import_usage', title: '增量导入本机使用信号', handler: 'usage.import',
    description: '读取本机 Codex sessions 和 archived_sessions 日志，增量提取显式标记与读取请求。只将信号、来源定位和读取位置写入独立持久数据目录中的 usage-index.json，不保存聊天正文，不联网。',
    input: inputs.import_usage, annotations: rw },
  { name: 'query_usage', title: '按期间查询使用信号', handler: 'usage.query',
    description: '查询已有 Skill 索引与插件账本；启用自动采集时先增量接收本机宿主调用事件。时间需带时区，包含起点、不包含终点。',
    input: inputs.query_usage, annotations: ({ captureEnabled }) => ({ ...ro, readOnlyHint: !captureEnabled }) },
  { name: 'record_plugin_calls', title: '记录插件工具调用', handler: 'recording.pluginCalls',
    description: '实际调用插件工具后就近合批记录，每项一次调用尝试（失败也计）；id 使用调用 ID 或事先生成的 UUID，记录重试沿用，新的实际调用使用新 ID。plugin 为工具所属插件命名空间，如 github；tool 为完整 mcp__codex_apps__github_get_repo 名称。仅记录已发生调用，不记录发现、计划或历史补记。不传参数或结果正文，与 Skill 采用分开。',
    input: inputs.record_plugin_calls, annotations: rw },
  { name: 'record_skill_use', title: '记录技能采用', handler: 'recording.skillUse',
    description: '采用技能时批量记录。id 为新批次唯一 ID（重试沿用）；skills 为技能名、插件名:技能名或准确路径，可重复，每项计一次。不用于历史补记或仅阅读审计。',
    input: inputs.record_skill_use, annotations: rw },
  { name: 'save_skill_note', title: '保存技能保留备注', handler: 'notes.save',
    description: '保存用户提供的本地备注和保留标记，不修改技能文件或启停状态。需基于当前文件指纹和备注版本，冲突时拒绝覆盖。',
    input: inputs.save_skill_note, annotations: rw },
  { name: 'preview_skill_archive', title: '预览用户技能归档', handler: 'archive.previewArchive',
    description: '只读预览用户技能目录的归档范围与影响，不执行移动。系统和插件内容不可归档。',
    input: inputs.preview_skill_archive, annotations: ro },
  { name: 'preview_skill_restore', title: '预览用户技能恢复', handler: 'archive.previewRestore',
    description: '只读核对已归档技能并生成恢复预览；原位置已有内容时拒绝覆盖。',
    input: inputs.preview_skill_restore, annotations: ro },
  { name: 'execute_skill_plan', title: '执行已预览的归档或恢复', handler: 'archive.execute',
    description: '仅在用户已针对该具体预览明确要求执行后调用。按一次性预览令牌移动用户技能目录，保留恢复记录；系统和插件只读。',
    input: inputs.execute_skill_plan, annotations: { ...rw, destructiveHint: true } },
  { name: 'cancel_skill_plan', title: '取消管理预览', handler: 'archive.cancel',
    description: '使尚未执行的归档或恢复预览失效，不修改技能文件。',
    input: inputs.cancel_skill_plan, annotations: rw },
  { name: 'query_activity_views', title: '活动面板视图', handler: 'activity.views', ui: 'app-only', requires: [CAPABILITIES.dashboard],
    description: '仅供管理面板调用：按类型、指标、年份和日期范围返回已计算的活动视图。',
    input: inputs.query_activity_views, annotations: ro },
];
