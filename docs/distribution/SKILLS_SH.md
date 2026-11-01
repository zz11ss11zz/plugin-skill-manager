# skills.sh discovery and installation

Checked: 2026-10-30 (Asia/Shanghai). This is a discovery snapshot, not a claim of listing or ranking.

## What users should install

Plugin & Skill Manager inventories local Codex plugins and Skills, explains recorded usage, and supports notes and reversible archives of eligible user Skills. Missing records do not mean never used.

Most users should use the [complete plugin installation guide](../DISTRIBUTION.md). The complete plugin includes the local MCP service, dashboard and both companion Skills. Do not install duplicate companion Skills if the complete plugin is already installed.

For Codex users who already configured the local MCP service separately, the main companion Skill is `skill-manager`:

```powershell
npx skills@1.7.4 add zz11ss11zz/plugin-skill-manager --skill skill-manager --agent codex --copy
```

This pinned CLI requires Node.js 22.20 or newer. The command installs instructions into the current project, not the MCP service. The optional `setup` Skill is for first-use diagnostics. Full dependency and fallback instructions are in [companion installation](THIRD_PARTY_INSTALL.md).

**Remote installation remains unverified in this environment:** the latest isolated attempt failed with a GitHub clone connection reset. The documented local-source route is the fallback; do not advertise the remote command as a verified one-click installation.

## Search verification

The installed find-skills instructions use skills.sh and `skills find`. We verified the pinned CLI's search endpoint and successfully ran the CLI after resolving the local execution environment. Searching the public repository directly with `add --list` is a separate check from catalog search.

| Query / check | Observed result |
| --- | --- |
| `plugin-skill-manager` | Search API and CLI returned find-skills from vercel-labs/skills, not this project |
| `skill-manager` | First 10 API results did not include zz11ss11zz/plugin-skill-manager |
| `codex plugins` | First 10 API results did not include this project |
| `skill usage` | First 10 API results did not include this project |
| `manage skills` | First 10 API results did not include this project |
| `skill-manager --owner zz11ss11zz` equivalent API request | Valid JSON response with zero results |
| Expected skill detail page | HTTP 200, but rendered text says “404” and that skill-manager is not available in this repository |

The expected detail URL is https://skills.sh/zz11ss11zz/plugin-skill-manager/skill-manager. It is a **verification target**, not a working listing link at this snapshot. HTTP 200 alone does not prove inclusion.

Reproduce after a meaningful indexing or source change:

```powershell
npx skills@1.7.4 find plugin-skill-manager
npx skills@1.7.4 find skill-manager --owner zz11ss11zz
npx skills@1.7.4 find "codex plugins"
npx skills@1.7.4 find "skill usage"
```

## How listing progresses

The [official FAQ](https://www.skills.sh/docs/faq) describes leaderboard inclusion through actual CLI installations and their installation telemetry. It does not promise specific search placement or an indexing deadline. The [API reference](https://www.skills.sh/docs/api) documents catalog reads; no manual catalog-write submission procedure was found in those documents.

The main Skill retains its stable name, uses an accurate task-oriented description, and links to the complete installation guide even when installed outside this repository. These source improvements do not themselves establish catalog inclusion.

Next: users who genuinely need the standalone companion can install it through the supported CLI route and choose their telemetry settings. Verify the detail page and search results afterward. Do not generate repeated installs, synthetic adoption, or direct telemetry events to inflate discovery. Tests use `DISABLE_TELEMETRY=1`.

本轮已恢复搜索并确认：测试词和作者限定检索没有找到本项目，预期条目页正文显示不可用。安装验证仍受 GitHub 克隆连接重置影响。当前阶段是完成可检索描述与安装指引、记录真实基线；尚未完成 skills.sh 收录。真实安装、搜索可见、完整 MCP 可用必须分别验证。
