# Automatic local plugin-call capture / 本机跨会话自动采集

This feature is included in **v0.3.3 and later**. Existing v0.3.2 release ZIPs are unchanged and do not contain it. Use the v0.3.3 complete plugin package or its source release. Reopen Codex after upgrading; old processes do not hot-reload code.

本功能已包含在 v0.3.3 及之后的完整分发包中；v0.3.2 历史包保持不变。源码升级需保留旧目录及独立统计目录，移除确认过的旧 MCP 注册，从新目录执行 `npm ci --ignore-scripts`、`npm test`、`npm run setup:install`、`npm run setup:check`，然后重开 Codex。不要让旧版服务继续写入新版账本；新读取器兼容旧记录，旧读取器不支持新增的通用 MCP 名称。

## Enable, configure and stop / 启停与间隔

Automatic capture is **opt-in** because it reads local session logs. Installing or opening the manager alone does not enable it. After upgrading, ask the setup Skill to enable local cross-chat plugin capture, or call:

```json
{"tool":"configure_auto_capture","arguments":{"enabled":true,"intervalSeconds":10}}
```

无需逐次要求助手上报。配置保存于独立数据目录 `auto-capture-settings.json`，适用于这台电脑的所有新版服务实例，重启后保留。默认检查间隔 10 秒，可设为 5–3600 秒；改为 30 或 60 秒会减少检查频率，代价是更晚看到新记录。其他实例在下轮检查时读取共享配置。

To stop, call the same tool with `enabled:false`. Existing records and notes remain. A scan already in flight may finish. The diagnostic `check_recording_status` returns the effective setting, interval, last error and coverage. Invalid configuration or unreadable/corrupt ledgers are reported; files are never reset to zero.

For existing source installations, `CODEX_SKILL_MANAGER_AUTO_CAPTURE=1` and `CODEX_SKILL_MANAGER_CAPTURE_INTERVAL_SECONDS=10` remain supported as initial defaults. An explicitly saved settings file takes precedence, including an explicit disable. A standalone worker can run `node scripts/auto-capture.mjs`; it honors the same settings and only runs while its process is alive. `--once` explicitly imports one bounded pass even when background capture is disabled. No login task or OS service is installed.

## Evidence and coverage / 证据与覆盖

- Every enabled cycle scans `$CODEX_HOME/sessions` and `archived_sessions`, across local chats, including archived and subagent logs. It accepts host `event_msg/item_completed/McpToolCall` events only. Real nested MCP execution, including `functions.exec`, is counted when the host emits that event; planned code, prose and quoted tool output are never parsed as execution.
- Codex Apps calls retain their plugin namespace. Other MCP servers are shown by server name, which is not independent proof of plugin installation. Manager calls are excluded to avoid recursive collection.
- Failed completed calls count as attempts. In-flight calls are not counted until the completion event appears. Use the host start timestamp when present, otherwise the event timestamp. Preserve original call IDs so replay, archive moves and restarts deduplicate. Manual reports with different IDs can still duplicate the same call; avoid dual reporting when automatic capture is enabled.
- Skill adoption stays separate and caller-reported. A Skill file read or mention is not proof of adoption. `import_usage` still imports historical inferred Skill signals only when requested.
- Only locally available logs are covered. Cloud activity not written to this computer, unsupported event shapes and missing logs remain unknown. Diagnostics report malformed/oversized lines, pending bytes and failed reads. Zero pending bytes does not prove global completeness.

## Privacy, resources and tokens / 隐私、资源与 token

JSON lines are read locally; although each original line may contain arguments and results, only tool identifiers, event timestamps, receipt timestamps and source type enter the call ledger. The cursor file stores offsets, hashes, counters and coverage issues, not conversation text or tool payloads. No network or model call is made by the collector. Nothing is uploaded by this feature. As with existing tools, statistics explicitly returned to the host may enter host/model context.

默认每轮读取预算 32 MiB，单行上限 4 MiB；首次历史扫描可能需要多轮，之后增量读取。采集增加本机文件检查、CPU、磁盘和索引存储开销；后台轮询本身不消耗模型 token。面板可见且自动采集开启时每 10 秒直接刷新服务，未调用 `sendMessage` 或 `updateModelContext`；聊天中要求模型查询或解释统计则产生正常上下文与输出用量。检查间隔与面板刷新间隔是不同概念。

Writes use a shared lock and atomic replacement. Calls are committed before cursors; an interrupted pass safely retries IDs. Existing records survive log truncation or disappearance. The default call-ledger limit is 32 MiB and cursor limit is 64 MiB; capacity failures preserve prior data and appear in diagnostics. Stop all services before backups or migration. Do not overwrite active records with an older backup.

## Validation boundary

Synthetic tests cover real-event recognition, false-positive exclusion, retry after write failure, partial lines, truncation, archive moves, cross-session ID deduplication, persistent opt-in/disable and invalid settings. Protocol and packaged-service tests establish MCP behavior; they do not establish native desktop visual acceptance. Test data contains no private activity records.
