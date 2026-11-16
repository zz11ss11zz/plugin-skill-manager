# Changelog

## 0.5.0 — 2026-11-09

- Integrates the local 0.4.20–0.4.21 activity panel changes. Plugin display names, icons and text fallbacks now appear in low-use lists. The bilingual panel keeps the detailed counting rules in its disclosure.

- Layered source tree: `src/backend` (inbound MCP router/controllers, application services, pure domain, ports, adapters) and `src/frontend` (MVVM). Frontend and backend share no code; they meet at generated, versioned JSON Schema contracts in `contracts/schema/v1`.
- Activity rankings, coverage and low-use observation are computed by the backend and served to the dashboard through the app-only tool `query_activity_views`.
- New tool `generate_redundancy_report`; `check_plugin_status` with `includeReport` is a deprecated alias. Tool names, inputs and messages are otherwise unchanged.
- TOML configuration (`config/`) with layered user/environment overrides and schema validation; thresholds, limits, protected plugins and the task vocabulary are no longer hard-coded.
- Host and platform adapters: Codex host; win32, darwin and linux platform adapters with capability flags. Fixed macOS data-directory checks rejecting the system `/var` link.
- Dependencies managed with pnpm: catalog versions, frozen lockfile, 7-day release age, trust-downgrade refusal and an install-script allowlist. CI runs on Windows, macOS and Linux.
- Added architecture rule checks, contract staleness checks and JSDoc type checking (`pnpm run verify`).

### Release notes

本版整合 GitLab !30 的架构重组与本地 v0.4.20、v0.4.21 的活动面板改动。

- 活动排名、统计覆盖和低频观察由后端计算，界面通过版本化契约取数。新增独立冗余报告工具，保留旧调用入口。
- 插件排名和无记录列表优先显示已安装插件的名称，缺失时回退到标识。统计仍使用原有插件 ID。无记录条目与排名共用图标、暗色图标和加载失败时的文字回退。
- 中英文低频观察区保留清单核对、搜索和可展开的计数说明，移除重复的状态与天数提示。
- 后端区分领域逻辑、存储和宿主适配器，平台及判断阈值采用分层 TOML 配置。开发构建采用固定 pnpm、锁文件和供应链检查。

## 0.4.21 — 2026-11-09

### Release notes

Show verified installed plugin display names instead of opaque app IDs. Simplify bilingual observation status and reuse plugin icons in no-record lists. Usage identities and counts are unchanged.

## 0.4.20 — 2026-11-09

### Release notes

Simplify bilingual observation status and show icons for no-record entries.

## 0.4.19 — 2026-11-02

- Unify local source, private plugin and GitHub distributions, including private 0.4.15–0.4.18 changes.
- Require same-task substitutability and comparable primary outputs in assessment principles; auxiliary-step overlap alone is insufficient.
- Preserve the distinction between packaged review instructions and automatic lexical candidate retrieval.

### Release notes — Unified redundancy assessment principles

Unifies the local source, private account plugin and GitHub distribution after private updates 0.4.15–0.4.18: protected official packages, verified installation units, one-calendar-month inactivity review, nested Skill components and capability-group presentation.

Functional redundancy requires evidence that entries can substitute for the same concrete task and produce substantially the same primary output. A shared topic or auxiliary step alone is insufficient. Manuscript writing, reference ingestion and local PDF organization are complementary stages.

This release packages that assessment principle for assistant review. Automatic functional-candidate retrieval remains lexical/task-vocabulary based and can still require manual rejection; the new document is not a semantic classifier. Existing records, settings, plugin identity and private audience are preserved. GitHub distributions remain independent of official directory approval.

## 0.4.18 — 2026-11-02

### Release notes — Installation identity and complementary roles

Package the redundancy assessment principles with the manager Skill. Separate document authorship, verified upstream collection, actual installation parent and individual capability. Do not compare internal siblings in one installed plugin/root Skill as mutual redundancy candidates; compare them with external installations. Shared author or repository does not exempt independent installations. Explicit task-routing descriptions provide complementary-role evidence, so broad plotting overlap alone no longer flags scientific-visualization and matplotlib. Preserve all usage, inactivity, capture and management data.

## 0.4.17 — 2026-11-02

### Release notes — Function comparison cards

Present redundancy groups as function-labelled frames with visible side-by-side Skill cards. Each card shows purpose, parent/plugin, source type, document-declared author when available and an expandable local path. Place assessment evidence and contextual recommendations underneath; retain detailed directory comparisons and existing management actions in their disclosure. Wide layouts support three columns; narrow layouts stack without horizontal overflow. Preserve candidate rules, activity records and protected component handling.

## 0.4.16 — 2026-11-02

### Release notes — Inactivity review and bundled workflow comparison

Use a strict one-calendar-month threshold for inactivity review. Keep recent, no-record/short-history and unavailable-ledger states distinct; incomplete records never establish non-use. Store only hashed item identity and first-observation time locally; observation is not installation time or continuous monitoring.

Restore installed third-party apps from the curated marketplace while protecting known official components and bundled/runtime sources. Scan bounded internal SKILL.md and WORKFLOW.md components for report-only comparisons; show their parent, purpose and paths without allowing separate component archives. Use explicit bilingual task vocabulary as an additional overlap retrieval clue, not semantic equivalence or a deletion recommendation. Preserve all existing inventory, usage and capture settings.

## 0.4.15 — 2026-11-02

### Release notes — User-installed redundancy scope

Limit redundancy reports to standalone user Skills and confirmed installed non-OpenAI plugin families. Exclude system/OpenAI sources and unconfirmed plugin caches before comparison. Different Skills shipped in one plugin package no longer generate redundancy relations with each other. Show Skill and owning plugin names in candidate summaries. Preserve inventory, activity records, and protected archive behavior.

## 0.4.14 — 2026-11-02

- Remove the separate-counts hint beside the two activity-source buttons and the recent-activity subtitle in both languages.
- Remove the English README screenshot caption and synchronize source and the private installed plugin.

### Release notes — Concise activity controls

Remove the separate-counts hint after the two activity-source buttons and the recent-activity date/coverage subtitle. Remove the English README screenshot caption. Preserve source switching, independent counts, calendar labels and the expandable counting explanation.

## 0.4.13 — 2026-11-02

- Use Jan–Dec month headings and aligned Mon/Wed/Fri weekday labels in the English activity calendar, with Chinese equivalents and preserved Monday-first dates.
- Add an inline How we count activity disclosure beside the legend, explaining separate evidence sources and incomplete coverage.

### Release notes — Calendar labels and counting explanation

The activity calendar now uses short English month names and Mon/Wed/Fri labels aligned to the existing Monday-first grid. Chinese labels and language switching remain supported. Dates, activity totals and coverage semantics are unchanged.

How we count activity opens an inline explanation of failed call attempts, separate host and assistant sources, explicit Skill adoption reports and unknown coverage. The footer aligns the explanation with the color legend and wraps in narrow panels.

Eleven activity/UI tests and local Chromium rendering checks passed, including English labels, weekday/date alignment, disclosure interaction, unchanged aggregate totals and 390 px overflow. Installed-host verification is recorded in VALIDATION.md. Browser checks do not establish native sidebar visual acceptance.

## 0.4.12 — 2026-11-01

- Replace sidebar and plugin icons with the approved charcoal outline wrench, retaining the Plugin & Skill Manager name and existing data/configuration.

### Release notes — Refined outline wrench icon

Replaces the sidebar and plugin artwork with the user-approved third outline wrench: charcoal #303030, transparent background, a slender handle and restrained curves. Both MCP discovery and packaged icon references use the same PNG exported from the vector design.

The plugin remains Plugin & Skill Manager. This private account update preserves its identity, audience, MCP connection, Skills, prompts, statistics and capture preferences. Existing open sidebar connections may need a host reload to fetch the new icon. Actual native appearance and directory icon caching are separate from package and protocol verification.

## 0.4.11 — 2026-11-01

- Synchronize public source and complete installation packages with the installed 0.4.11 runtime. Includes the diagnostics, redundancy reports and account-version launcher developed since 0.4.6.

- Private 0.4.11 simplifies activity source labels to host auto-capture and assistant reports, with a short separate-counts hint; removes the redundant plugin status box and preserves independent counts.
- Add a stable account-plugin compatibility launcher that resolves the enabled installed version at startup and rejects stale-cache guesses. Diagnose hard-coded manual-entry conflicts separately from the verified launcher.
- Private runtime updates 0.4.7 through 0.4.10 retain the public-release boundary; directory icon metadata and native reload acceptance require separate verification.
- Refresh listing references to a dedicated wrench PNG and verify both references against the packaged MCP icon. Remote directory URLs still returned null after the 0.4.10 update; the directory fallback icon is not claimed fixed.

- Add a Manage → Inventory / Redundancy candidates view with separate plugin and Skill reports, bounded directory comparison, evidence excerpts, retention marks, session deferral and existing archive previews.
- Keep long-term inactivity unclassified until continuous coverage and first-seen evidence exist; preserve local comparisons when plugin-status verification fails.

- Unify runtime, installation, storage, recording and capture diagnostics in `check_recording_status`, retaining existing count fields and the 13-tool surface.
- Add a manual bilingual dashboard check and a standalone doctor that runs before data initialization and without npm dependencies.
- Isolate failed checks, bound CLI probes, preserve unknown states and original data, and share stored-index validation with runtime readers.

### Release notes — Concise activity source labels

The plugin activity buttons now read 宿主自动采集 / 助手主动上报 (Host auto-capture / Assistant reports), with the short hint 分开统计 (Counted separately). The redundant status box below the source buttons is removed from the plugin view. Source selection continues to show independent counts.

The dashboard, server and manifests use version 0.4.11. This private update preserves the existing plugin identity, audience, connection configuration, default prompts, bundled Skills, user records and capture preferences. No GitHub Release or public-directory submission is included.

Build, activity/localization tests and isolated packaged-runtime checks are recorded separately from installation and fresh-host verification in VALIDATION.md. Existing open panels may need to be reopened after the host reloads its MCP connection.

#### Public synchronization — 2026-11-01

The initial private update described above is now the baseline for the public source and 0.4.11 distribution packages. Changes since public 0.4.6 include bounded redundancy candidate reports, clearer diagnostics, the enabled-account-version compatibility launcher, listing icon references and concise activity source labels. Existing records and capture preferences are preserved; missing records still do not prove non-use.

Upgrade through the existing installation channel. The complete plugin ZIP includes the installer and local catalog; the desktop package has plugin.json at its root; the source ZIP is for development. SHA256SUMS identifies the archives. GitHub publication does not establish official directory acceptance, directory icon delivery or native visual acceptance.

中文：本次将公开源码及完整安装包同步至已安装的 0.4.11，包含自 0.4.6 以来的诊断、冗余候选报告、账号版本启动器和活动来源文案。沿用原安装渠道升级，保留统计与采集配置。原生界面及官方目录状态仍按实际验证记录说明。

## 0.4.10 — 2026-11-01

### Release notes — Refresh listing icon references

Both portable and compatibility manifests reference the verified wrench image at `./assets/plugin-skill-manager-wrench.png`. The private update includes that image explicitly so directory ingestion can establish a new asset reference. The older asset remains for compatibility.

Source, runtime, embedded dashboard and package versions remain synchronized. Packaging checks compare the bytes behind each listing reference with the MCP wrench icon. The installed-version launcher and all 13 tools retain their existing behavior.

The source package and remote directory are verified separately. A valid packaged image does not by itself demonstrate that the private directory generated a working icon URL or that a native host rendered it. See the repair evidence for the actual directory read-back result.

No user records, capture preferences, MCP configuration, default prompts, plugin identity or audience changes. This is a private update, not a GitHub Release or public-directory submission.

## 0.4.9 — 2026-11-01

### Release notes — Resolve the installed runtime at startup

Completes the runtime-selection repair after the private 0.4.8 update. Some tested hosts expose the installed private plugin's Skills without automatically starting its packaged local MCP server. Removing the old manual entry alone therefore does not restore a usable sidebar service.

The optional standalone scripts/launch-installed-plugin.mjs compatibility entry queries the official installed-plugin endpoint at each start, verifies the enabled account installation and matching cached manifest, and starts that exact runtime. It ignores higher cached versions and refuses missing, disabled, ambiguous or mismatched installations. It does not modify configuration or user records. Host reload is still required to replace an already running process.

Environment diagnostics distinguish this supported version-resolving entry from an obsolete hard-coded manual registration. Source, runtime, dashboard and package manifests are version 0.4.9. The redundancy report, unified diagnostics and Simplified-Chinese-only locale behavior are retained.

Known unresolved issue: the private directory returned empty logo/composer-icon metadata even after a complete 0.4.8 upload containing valid referenced PNGs. Package and MCP icons are verified wrench images; directory-level icon rendering is not claimed repaired by this release. The compatibility entry is installed separately only where fresh-host discovery demonstrates it is necessary.

No ledger schema, capture preference, sharing or cleanup permission changes. This is a private update, not a GitHub Release or public-directory submission.

## 0.4.8 — 2026-11-01

### Release notes — Installed entry and icon consistency

Retains the redundancy candidate report and unified environment diagnostics delivered in the private 0.4.7 update. Only explicit Simplified Chinese host locales select Chinese; other languages use English.

Installation diagnostics now distinguish an enabled manual MCP registration alongside an enabled account plugin. This combination can keep the sidebar on an older runtime after a successful plugin update. The diagnostic describes the targeted registration cleanup, data preservation and post-reload checks; it does not modify configuration automatically.

Source, runtime, dashboard and package manifests use package.json version 0.4.8. Account update packaging includes referenced icon files, and acceptance checks the directory's resolved image metadata as well as package bytes. Upgrade instructions require verification of the effective server entry and a freshly opened panel.

No ledger format, capture preference, cleanup authority or audience changes. This private update is separate from a GitHub Release or public-directory submission. Native host acceptance is recorded only when actually observed.

## 0.4.6 — 2026-10-30

- Unify source, private plugin and public packages; include previously private service-icon fixes.
- Generate both manifests, bilingual package READMEs, MCP review cases and release notes from source.
- Check version and content consistency in package tests; remove stale version assertions.
- Retain the prominent bilingual product purpose and concise installation guidance.
- See the release notes below for delivery and upgrade boundaries.

### Release notes — Consistent source and delivery packages

Unifies the public source, complete installation ZIP, standalone desktop ZIP and private account plugin at version 0.4.6. Includes the service icons previously delivered in the private 0.4.4 update and the bilingual product-purpose copy from 0.4.5.

Both plugin manifests, the MCP server, embedded dashboard and distribution integrity metadata derive their version from package.json. The build now includes the Chinese package README, generates the compatibility manifest and places review cases in the MCP configuration. Release notes come from this versioned file; future packages no longer need manual metadata overlays.

The English and Chinese source READMEs retain the prominent product purpose and concise installation links. Removed release-news paragraphs stay removed. Existing historical releases and release notes remain unchanged.

No ledger format, counting rules or cleanup permissions change. Missing records do not prove non-use. Upgrade through the same installation channel already in use; avoid a second registration. The complete ZIP includes an installer and local catalog; the desktop ZIP has plugin.json at its root. The source ZIP is for development. SHA256SUMS identifies the exact downloadable archives.

Validation results are recorded in docs/VALIDATION.md. Protocol, package and installation checks do not establish native desktop visual acceptance or official directory approval.

中文：统一公开源码、完整安装包、桌面根目录包和私有插件的版本及构建来源。补齐服务图标、双语说明和兼容配置，保留 README 前部的产品用途，旧版本历史不改写。升级沿用原安装渠道，不重复注册；数据格式、统计口径和清理权限不变。

## 0.4.3 — 2026-10-29

### Release notes — Consistent colored wrench icons

The plugin listing, MCP discovery/sidebar icon and embedded dashboard now use the same orange-gold double wrench. Version 0.4.3 aligns the GitHub distribution and private account plugin; the account update service requires an increased patch version. Previous 0.4.1 local installations could retain an older embedded image despite replacing external PNG files.

Includes the current English and Chinese README platform-support guidance: local Codex execution is required; this package does not provide a ChatGPT web deployment. No data format or counting behavior changes.

Upgrade using the complete package and the documented installer. Existing private account installations receive the updated private release; avoid adding a duplicate manual registration. Reload the plugin/application to replace already-running processes and cached presentation. Historical chat entries may retain their original icon.

Validation is recorded in docs/VALIDATION.md. Native sidebar rendering after reload is not claimed by archive and protocol checks alone.

## 0.4.1 — 2026-10-29

- Show installed plugin display names and icons in Manage and both plugin-call ranking sources; load metadata on first open and match unique display names for opaque app IDs.
- Use a simplified monochrome plug-and-wrench app icon; retain the colored artwork for a future marketplace listing.
- Preserve letter fallback on missing/failed images, with bounded local reads and allowlisted remote image URLs.

- Use the official app-server `plugin/installed` endpoint for inventory refresh instead of waiting for marketplace discovery. Keep navigation and search available during refresh, skip unrelated activity scans, and suspend activity polling while Manage is open.
- Unify plugin and Skill inventory filter buttons and search layout in both languages.
- Preserve activity charts when an inventory-only response arrives. See the release notes below for update and verification details.
- Separate host-event calls (default) from assistant-reported calls; never add the two views.
- Label Skill adoptions as assistant-reported. Show capture state, scan freshness, event bounds and read issues in both languages.
- Treat missing activity as unknown; recorded timestamps do not prove continuous coverage.
- Preserve legacy reports and exact-ID corroboration evidence. API default call summaries now select host events; see docs/DATA_ACCURACY.md.
- Official analytics reconciliation is not claimed.

### Release notes — Plugin icons and reliable inventory / 插件图标与清单读取

#### Changes

- Plugin names and icons appear in Manage and in both Host events and Assistant reports rankings. First open loads installed metadata; unique display-name matching supports opaque app IDs such as Sider Scholar. Icon matching does not merge or alter recorded call counts.
- A monochrome plug-and-wrench glyph replaces the previous app icon. Colored artwork is retained for a future marketplace listing, not an official submission.
- Inventory refresh uses `plugin/installed`, keeps navigation/search usable, and does not rescan unrelated activity. Inventory-only responses preserve existing charts.
- Host-event calls and assistant-reported calls have independent totals, calendars and rankings. Skill adoptions remain assistant-reported; missing coverage is not zero use.
- Local image reads stay within the plugin source directory and have a 2 MiB limit. Remote images are restricted to HTTPS files.openai.com; failures retain a letter fallback.

#### 更新内容

管理页以及“宿主事件”“助手上报”排行榜显示插件名称与图标；首次打开自动读取已安装清单，补齐 Sider Scholar 等名称匹配。采用单色插头与扳手图标，保留彩色市场展示素材。统计来源分开，清单刷新保持导航可用，不改写历史记录。

#### Downloads and upgrade

Use `plugin-skill-manager-0.4.1-plugin.zip` for the complete installer; verify it against `SHA256SUMS-0.4.1.txt`. Extract to a permanent folder and run `node install.mjs install --replace-source` for an existing full-plugin installation, then `node install.mjs check`. New installations omit `--replace-source`. Keep the independent data directory and avoid duplicate standalone MCP registrations. Reload the service/application to load the new UI.

`desktop-package.zip` contains a plugin root, not the manual installer. `source.zip` contains public source, tests and documentation. This GitHub release does not constitute official Codex marketplace approval.

#### Verification

79 tests passed with SKILL_MANAGER_TEST_CODEX=1 on Windows / Node 20.18.1; zero failures/skips. Includes initial metadata loading, namespace/display-name icon resolution, inventory-only response preservation, activity source separation and MCP lifecycle checks. Native sidebar visual rendering after reload, remote-image delivery inside the host, and reconciliation with official analytics are not claimed.

#### Sidebar icon refresh — 2026-10-29

The v0.4.1 release was refreshed to use the selected transparent double open-ended wrench for MCP sidebar discovery. Dashboard/listing and future marketplace artwork remain unchanged. The source tag and all downloadable ZIPs/checksums are updated together; users who downloaded an earlier v0.4.1 package should download the refreshed assets to get the new sidebar icon. No ledger format or recorded data changes are involved.

## 0.4.0 — 2026-10-28

- Muted teal light/dark activity palette and neutral controls; only Activity/Manage navigation.
- Recorded 30-day summaries and daily bars linked to annual calendar selection.
- Named daily rankings, shared highlights, preserved keyboard focus and Back to all restoring period filters.
- Time-zone-aware windows, explicit missing coverage/zero/future states and separate plugin/Skill metrics.
- Bilingual browser regression and reproducible synthetic screenshots; capture/data storage semantics unchanged.

### Release notes — Teal activity dashboard / 青绿活动面板

v0.3.3 first packaged the existing automatic-capture functionality. v0.4.0 builds on that release with a focused visual and interaction update; no Settings page has been added.

v0.3.3 先将现有自动采集能力正式发布；v0.4.0 在此基础上更新视觉与活动交互，不新增“设置”页。

#### New experience / 新体验

- Muted teal and neutral gray replace the violet heatmap palette; light and dark schemes use separate intensity scales.
- A 30-day recorded total, days with records and distinct recorded plugin/Skill count summarize the visible recent window. They are observed records, not complete host-wide usage or installation counts.
- Thin daily bars accompany the annual calendar. Hover or keyboard focus shows the date and recorded count; clicking either chart pins the same date in both views and shows named daily rankings, including all items with recorded activity.
- Hovering another date does not replace the pinned ranking. Clicking another date switches it; clicking the selected date again or **Back to all** clears it. Back to all restores the prior period filter.
- Plugin calls and Skill adoptions remain separate. Changing type or year clears the pin; data refresh and language changes preserve it. Historical years show their final 30 days; the current year ends at today in the ledger time zone, with January clipped to the selected year.
- No coverage, observed zero and future dates are distinct. Missing/unreadable recent data uses an em dash instead of claiming zero. Positive partial totals are labelled as recorded activity.
- Manage, source categories/search, notes, archive previews and low-use observation are retained. Only **Activity** and **Manage** appear in navigation.

- 灰调青绿取代紫色热力图，页面保持中性灰；浅色与深色主题分别设置色阶。
- 新增近 30 天已记录总次数、有记录天数及有活动的插件／Skill 数量；不将其说成完整使用量或安装数量。
- 每日细柱与年度格子联动：悬停或键盘聚焦显示当天统计，点击固定当天的名称与次数排名，两图同步高亮。
- 固定后悬停其他日期不会替换排名；点击其他日期切换，再点当前日期或“返回全部”解除，并恢复原区间筛选。
- 切换年份或统计类型解除固定，刷新及中英文切换保留固定。日期按账本时区计算；历史年份展示年末 30 天，当前年份截至今天，年初不跨入上一年。
- 区分未覆盖、覆盖期间零记录与未来日期；不可读取或无覆盖的近期摘要显示“—”。仍仅有活动／管理两页。

#### Upgrade / 升级

Download **plugin-skill-manager-0.4.0-plugin.zip** and verify **SHA256SUMS-0.4.0.txt**. Extract to a permanent folder. New installs use `node install.mjs install`; existing complete-plugin installs use `node install.mjs install --replace-source` from the new folder, followed by `node install.mjs check`. Preserve the independent data directory and stop old services before switching. Reopen Codex to load the new UI. Avoid duplicate standalone MCP/plugin registrations.

自动采集沿用 v0.3.3 的明确启用规则与持久配置；本版升级不会主动开启采集，也不重写调用、采用或备注账本。源码/MCP 用户按 docs/LOCAL_SETUP.md 更换已确认的入口，保留旧目录与数据。

#### Assets / 附件

- **plugin.zip**: complete manual installer, catalog, bundled server/UI and companion Skills.
- **desktop-package.zip**: plugin-root package for desktop submission workflows; not the manual installer and not an official approval.
- **source.zip**: public source, tests and documentation only; no personal logs, state, credentials, dependencies or generated bundles.
- **SHA256SUMS**: checksums for the three ZIPs.

#### Verification and boundaries / 验证与边界

See docs/VALIDATION.md for the exact test results. Browser captures use only synthetic fixtures. Native Codex sidebar rendering, external organization eligibility and official-directory publication are not claimed.

Reproduce browser checks: run `npm run build`, start `node scripts/demo.mjs` (or add `--lang=en`), then run `node scripts/acceptance-activity.mjs http://127.0.0.1:PORT OUTPUT` (add `--en` for English). The optional PLAYWRIGHT_MODULE and CHROME_PATH environment variables point to the local browser test dependencies. Checks include hover/pin/back, chart linkage, Skill separation, keyboard selection, both color schemes, 360px overflow and Manage navigation.

##### Results / 本版结果

73 tests passed with zero failures/skips on Windows / Node 20.18.1. Seven isolated real-CLI lifecycle checks passed for 0.3.3 → 0.4.0. Chinese and English actual-browser checks passed for linked daily selection, hover, keyboard focus, both color schemes, 360px layout and Manage navigation; no page errors. Native Codex sidebar acceptance remains unverified.

73 项回归全部通过；7 项隔离安装升级检查通过；中英文浏览器实测通过，包含日期联动、键盘、深浅色及窄面板。原生 Codex 侧栏仍未验证。

## 0.3.3 — 2026-10-28

- Optional cross-chat plugin/MCP host-event capture, persistent opt-in/disable and a configurable 5–3600 second interval. No model call is made by polling.
- Original call times, ID deduplication, bounded incremental reads and diagnostic coverage; Skill adoptions remain separate.
- Node 20/24 Windows test runner, Windows CI and a body-parser security update.
- See docs/AUTO_CAPTURE.md for setup, privacy and upgrade limits. Included in the v0.3.3 packages; existing v0.3.2 ZIPs remain unchanged.

### Release notes — Optional automatic local capture / 可选本机自动采集

This release packages the existing main functionality at 82cc192. The Activity/Manage interface and violet heatmap remain unchanged; the visual redesign is reserved for v0.4.0.

本版将现有 main 的功能正式打包发布：保留活动／管理双页及紫色热力图；青绿视觉改版另在 v0.4.0 提供。

#### Changes / 更新

- Opt-in cross-chat collection of real local MCP host completion events, including failed attempts; no model or network calls are made by polling.
- Persisted enable/disable and a shared 5–3600 second interval (default 10 seconds). Panel refresh cannot bypass the configured scan interval.
- Original event timestamps, stable call-ID deduplication, bounded incremental reads and explicit coverage diagnostics. Skill adoption remains a separate caller-reported metric.
- Portable Node 20/24 Windows test runner, Windows CI, a dependency security update and bounded Windows migration-publication retries.

- 明确启用后，从本机跨聊天宿主完成事件采集插件／MCP 调用；失败调用也算尝试，后台轮询不调用模型、不发送网络请求。
- 启停与间隔持久保存；默认 10 秒，可设 5–3600 秒，多实例和面板刷新遵守共享间隔。
- 保留原始调用时间，按原调用 ID 去重；限制单轮读取量并报告覆盖边界。Skill 采用仍按独立口径记录。

#### Install and upgrade / 安装与升级

- Complete manual installation: download **plugin-skill-manager-0.3.3-plugin.zip**, verify **SHA256SUMS-0.3.3.txt**, extract to a permanent folder, then run `node install.mjs install` and `node install.mjs check`.
- For an existing complete plugin, stop old service instances, preserve the independent data directory, and run `node install.mjs install --replace-source` from the new folder. Do not run duplicate standalone MCP and plugin registrations.
- Source/MCP installations: preserve the old folder and data, remove only the confirmed old registration, then install from the new source. Reopen Codex to load the new service. Never restore an old ledger over newer records.
- 自动采集默认关闭。更新后明确要求启用，或调用 `configure_auto_capture`，参数 `{"enabled":true,"intervalSeconds":10}`。仅安装或打开面板不会开启日志采集。
- Manual reports with unrelated IDs can duplicate automatically captured calls; use one recording path for the same actual call.

#### Packages and limits / 包与边界

- **plugin.zip**: complete local installer, catalog, service, UI and companion Skills.
- **desktop-package.zip**: plugin manifest and runtime at ZIP root; separate from the manual installer. Not an approval or official-directory listing.
- **source.zip**: public source only, without dependencies, generated bundles or personal records.
- Only readable local logs are covered. Missing/cloud/unlogged events remain unknown. Native Codex sidebar acceptance and untested platforms are not claimed. See docs/AUTO_CAPTURE.md and docs/VALIDATION.md for evidence and limits.

#### Verification / 验证

71 tests passed, zero failed/skipped on Windows / Node 20.18.1, including packaged automatic capture and persisted restart behavior. Seven isolated real-CLI lifecycle checks passed for 0.3.2 → 0.3.3, including retained records after upgrade, uninstall and reinstall. Native desktop UI acceptance was not performed.

71 项回归全部通过；7 项隔离安装升级检查通过，包含 0.3.2 → 0.3.3 与卸载／重装后的记录保留。未将协议、浏览器或隔离 CLI 检查声称为原生桌面验收。

## 0.3.2 — 2026-10-27

- Keep only Activity and Manage in both languages; retain the setup Skill and recording diagnostic tool without a separate Setup page.
- Add clickable source totals for personal, system and plugin-cache Skills, with category search and responsive neutral styling.
- Check plugin installation status automatically on entering Manage, cache results for one minute, and offer retry on failure.
- Use compact outlined actions and a violet heatmap color scale; preserve the gray/blue interface palette outside the heatmap.
- Localize navigation accessibility labels and singular file counts; update synthetic UI scripts for the new controls and isolate preview plugin-call records.
- Include the author name in generated plugin manifests and verify it against the declared developer name.

## 0.3.1 — 2026-10-26

- Simplify the low-use observation area in both English and Chinese; move detailed rules into a collapsed explanation.
- Replace the primary inventory button with a compact secondary action in the section header.
- Show observation targets only while gathering records; retain the same data and eligibility rules.
- Recording remains caller-reported. Existing records are preserved and missing historical activity is not fabricated.

## 0.3.0 — 2026-10-26

- Rename package, marketplace and MCP identity to `plugin-skill-manager`; preserve existing records, environment variables and legacy release assets.
- Add daily ranking grids on calendar hover/focus and a click-to-pin date.
- Add low-use observation with coverage thresholds, searchable zero-record items and installed-inventory checks. Missing records are not proof of non-use.
- Ship renamed installation and desktop-review ZIPs; official directory submission and native review evidence remain pending.

## 0.2.0 — 2026-10-26

- Ship a complete prebuilt plugin distribution with integrity checks and an installer for install, check, explicit source relocation and uninstall. Keep local records and archives on uninstall.
- Bound recovery of the known Windows cache activation denial after checking actual install state; stop on ambiguous outcomes and unrelated errors.
- Add a packaged setup Skill, read-only recording status and a separate Setup view. No fake test events or automatic personal-instruction changes.
- Add a separate Manage view with source/search filters, guarded notes, archive previews, cancellation and restoration; keep Activity as the homepage.
- Add the color orbital icon, listing metadata, privacy/data-flow and support documentation, and five positive/three negative review scenarios.
- Validate 60 regression tests, real CLI 0.1.1 → 0.2.0 package upgrades, and browser management interactions. Native desktop UI and official submission eligibility remain unverified.

## 0.1.1 — 2026-10-26

- Match README demonstrations to their English/Chinese language and complete fixed-label translations.
- Correct the Chinese Skill adoption heading without changing counting semantics.
- Document companion Skill installation separately from MCP registration, including verified local-source fallback.
- Correct stale ledger paths and derive the acceptance package path from the release version.
- Source distribution remains the supported public installation route; native-sidebar and remote-marketplace limits still apply.

## 0.1.0 — 2026-10-23

First non-prerelease source distribution. Requires Node.js 20.18+ and Codex CLI; Windows is the tested platform.

- Bilingual activity dashboard with calendar/item heatmaps, date filtering and rankings.
- Separate Skill adoption, plugin call and inferred historical signals; retry deduplication and explicit missing-data states.
- Persistent data outside source/plugin caches, guarded legacy migration, backups and recovery.
- Local inventory, notes, duplicate candidates and reversible Windows user-skill archives through backend tools.
- Local development plugin/marketplace builders and companion Skill; no published npm package or remote marketplace installer.
- Fixed rankings ignoring date filters and the observed Windows packaged cache activation failure.
- One version source for package, service, UI and generated manifest; Apache-2.0 license and notices.

Install from the versioned source ZIP and build locally. See [installation](docs/LOCAL_SETUP.md), [known limitations](docs/KNOWN_LIMITATIONS.md) and [validation](docs/VALIDATION.md).

## 0.0.1-alpha.1

Earlier public preview. Historical evidence remains in docs/VALIDATION.md.
