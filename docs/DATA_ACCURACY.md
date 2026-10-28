# Activity evidence and reconciliation

Version 0.4.1 separates evidence sources. It is a local activity record, not a replica of OpenAI Analytics or a billing ledger.

## Customer-facing definitions

- **Host events (default):** locally readable completed MCP call events. Failures count as attempts; in-flight calls are not yet counted. Original call IDs deduplicate repeated scans. Namespace attribution is not proof of plugin installation or an exact official display-name mapping.
- **Assistant reports:** explicitly reported attempts. Legacy records without a source field belong here. Their timestamp is receipt time. Reports are not added to host events. Different IDs may still represent the same underlying call across the two views.
- **Assistant-reported Skill adoptions:** a separate ledger. Reading a Skill file or mentioning its name is not converted into an invocation. Host Skill invocation collection is not implemented.
- **Recorded event range:** the first and last recorded timestamps, not a guarantee of continuous collection. An empty interval is unknown rather than proof of non-use. Low-use recommendations require coverage and therefore are withheld for these incomplete sources.

An exact matching call ID, plugin and tool can corroborate an earlier report: preserve its receipt time as `reportedAt`, use the observed timestamp, and classify that record as a host event. No fuzzy time/name merging or historical deletion is performed.

The API's `pluginCalls.total`, catalog and activity now describe host events only. `pluginCalls.sources['assistant-report']` exposes reported records separately. Consumers relying on the former mixed total must select an explicit source. Diagnostic `count` remains stored row count, with a `countMeaning` and per-source counts; it is not a unique cross-source activity total.

## Coverage and privacy

The panel shows the capture switch, latest scan, pending bytes, read problems and malformed/oversized line count. Zero pending bytes only means the discovered readable files were processed; it does not prove complete account coverage. Unsupported event shapes, missing logs, other machines and cloud-only activity are not reconstructed. Automatic capture excludes the manager's own tools. Only call identifiers, tool identity, event/receipt times and status are stored, not arguments/results/chat bodies.

## Reconciliation acceptance

Compare the same account, time interval (start inclusive/end exclusive), time zone, product scope and refresh cutoff. Preserve source labels. Test ordinary calls, failures/retries, nested calls, repeated scans, explicit/implicit Skill invocations and repeated invocations in one turn. An official result is an independent oracle; tests of our parser alone cannot establish agreement.

Current status: source separation and local parser behavior are tested. Official dashboard reconciliation and native sidebar rendering remain unverified. No percentage accuracy or official equivalence is claimed. Skill events must first be validated against the actual client/version before implementation.

Official reference: https://help.openai.com/en/articles/20001478-reviewing-work-and-codex-usage-and-using-personal-analytics-in-chatgpt-desktop

## 中文交付口径

本插件提供本机可读取日志中的 MCP 调用记录及助手主动上报的记录。两种来源分开展示，不相加。Skill 当前为助手报告的采用次数。覆盖范围与异常随数据展示；未覆盖不视为零。尚未与官方面板完成同口径对账，不用于核对账单。
