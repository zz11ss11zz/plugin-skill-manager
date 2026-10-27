# Privacy and local data / 隐私与本地数据

Updated for the main branch, 2026-10-27. Maintainer: Zishen Wang. This page describes the open-source plugin's actual data flow; host applications and distribution services have their own policies.

The plugin scans configured local Skill directories and plugin caches. Its inventory includes names, descriptions, file paths, content fingerprints and plugin ownership metadata. It stores caller-reported Skill identifiers and adoption timestamps, plugin/tool identifiers and call-attempt timestamps, user-entered notes, and archive recovery records. Recording tools do not request task text, tool arguments, results or credentials.

When explicitly asked to import historical usage signals, the plugin reads local Codex `sessions` and `archived_sessions` files. The resulting index stores extracted signals and source references rather than full transcripts. Opening the panel or checking recording status does not import new chat logs.

The plugin does not run its own telemetry, advertising, remote model service or upload endpoint. **Tool results are returned to the host application through MCP** and may be included in the host's model context or handled under the host provider's data policies. “Local storage” does not mean the host can never transmit tool results. Installation checks (including automatic checks on entering Manage) and installer commands invoke the Codex CLI, which may contact configured marketplaces. GitHub hosts downloads, documentation and public issue reports under its own policies.

Activity and note data default to `$CODEX_HOME/skill-manager/data-v1` or `~/.codex/skill-manager/data-v1`; an explicit absolute `CODEX_SKILL_MANAGER_DATA_DIR` overrides this. Archives are separately stored at `$CODEX_HOME/skill-manager-archive` by default. The plugin has no automatic retention expiry. Uninstall preserves these files so a reinstall can recover them. Users control backups and removal on their own machine; stop the service first and inspect archive contents before deleting anything.

Do not include credentials, private chat logs or personal indexes in public issues. See [support](SUPPORT.md) for reporting guidance. The maintainer does not receive local runtime records unless a user separately shares them.

本插件扫描本地技能文件和插件缓存，保存主动报送的采用/调用标识与时间、用户备注及归档恢复信息。仅在用户要求导入历史信号时读取本机会话日志，打开页面不会自动导入。插件自身没有遥测或上传接口，但 MCP 工具结果会交给宿主，宿主可能按其自身政策将结果用于模型上下文。卸载保留本地数据和归档；停止服务后由用户自行管理备份与删除。不要在公开反馈中附带私密日志或凭据。

进入管理页会自动核对插件安装状态，结果缓存一分钟，失败时可重试。此操作调用 Codex CLI，可能访问已配置的插件市场，不会自动导入聊天日志。

