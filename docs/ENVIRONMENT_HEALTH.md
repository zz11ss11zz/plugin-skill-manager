# Environment health / 统一环境诊断

Available in the current development source; the published **v0.4.6 archives do not include this enhancement**. Updating source or building a new package is separate from upgrading an existing installed copy.

当前开发源码已提供此功能；已发布的 **v0.4.6 ZIP 不包含本次增强**。更新源码或重新构建不等于当前安装已升级。

## Run a check / 如何使用

- In the updated dashboard, expand **Environment health → Check environment**. It runs only when requested; Activity and Manage remain usable while it waits.
- In chat, ask to check the manager environment. The existing `check_recording_status` tool now includes `health`, alongside the existing adoption and call counts. No extra MCP tool is added.
- In the source folder, use the standalone doctor even if MCP startup fails or npm dependencies are missing:

```powershell
node scripts/doctor.mjs --zh
node scripts/doctor.mjs --json
```

`npm run doctor -- --zh` is an equivalent source command. For packages **built from this source**, run `node server/src/server.mjs --diagnose --zh` from the plugin root, or add `--json` for structured output. This branch runs before data initialization or capture startup. The older published v0.4.6 bundle does not support this argument.

更新后的界面在顶部展开“环境诊断”，点击“检查环境”；也可在聊天里要求检查环境。服务无法启动时，在源码目录使用上方独立命令。诊断按需运行，不随界面刷新反复检查；关闭折叠区不会改变采集设置。

## What is checked / 检查范围

| Check | Purpose / 说明 |
| --- | --- |
| Runtime and dependencies | Node.js 20.18+; source dependency resolution and dashboard availability, or bundled assets / 运行环境、依赖与已构建界面 |
| CLI and installation | Bounded local version, MCP registration and `plugin/installed` queries; distinguish plugin installation from standalone MCP registration / 核对两种安装方式、旧名称、重复来源和不同启动入口 |
| Data and directories | Absolute paths, linked ancestors, permission preflight, migration receipt and known locks / 数据路径、链接、权限预检、初始化记录和占用 |
| Stored files | Validate adoption/call ledgers, notes, historical index and capture cursor using runtime readers / 复用实际读取器检查账本、备注和索引 |
| Capture | Effective persisted settings, unknown enablement, last runtime error, absent/stale/future scan timestamps, backlog and read issues / 设置、运行错误、扫描时间、积压与读取问题 |

Each CLI query is capped at 3 seconds; subprocesses are stopped after timeout and output is size-bounded. A failed query cannot become an empty installed list. Other checks still return. Concurrent diagnostic requests in the same MCP process share one in-flight check.

每项检查独立返回。配置损坏时采集状态为“未确认”，不会显示“已关闭”；账本读取失败时计数为 `null`，不会变成零。新安装尚无文件、可选目录缺失、主动关闭采集均有单独说明。

## Results / 结果含义

| Status | Meaning / 含义 |
| --- | --- |
| `ok` | Check passed / 此项预检通过 |
| `info` | Expected condition, such as capture being off / 正常说明，如采集关闭 |
| `warning` | Review needed, such as stale scans or multiple installations / 需要核对，如过期扫描或多个安装来源 |
| `error` | A local problem was found, such as corrupt files or denied access / 已发现本地问题，如文件损坏或权限不足 |
| `unknown` | Evidence could not be obtained / 未能取得判断所需证据 |

Doctor exit codes: `0` means no error or unknown checks (warnings may remain); `1` means at least one error; `2` means unresolved checks without a known error. Inspect the structured summary rather than treating exit code 0 as proof that every check is green.

报告包含逐项说明和处理建议。命令退出码：`0` 无错误或未确认项，但可能有提醒；`1` 有错误；`2` 无已知错误但仍有未确认项。修复后重新检查。

## Boundaries / 边界

The diagnostic does not import session contents, start capture, change configuration, migrate data, write test records, remove locks, reinstall or repair files. CLI processes may maintain their own operational logs. An already-enabled collector may continue its normal work independently.

Reports omit absolute user paths, raw CLI output, configuration environment values, notes, event identifiers and error payloads. Only stable error codes, counts and selected timestamps are returned. This is a local snapshot; permission checks do not perform a test write, dependency resolution does not launch the service, and neither recent scans nor passing checks prove native sidebar behavior or complete host-wide activity coverage. Run it in the same environment as the affected service: a cloud container inspects its own files, not the user's computer.

诊断只提供检查与建议，不自动修复或卸载。权限检查没有写入测试文件；依赖可定位不等于启动验收；近期扫描不等于完整覆盖；全部预检通过不等于原生侧栏验收。请在发生问题的服务环境中运行，云端容器无法借此读取用户本机数据。
