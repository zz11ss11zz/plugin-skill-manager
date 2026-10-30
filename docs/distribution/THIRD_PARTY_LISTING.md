# 第三方 Skill 目录收录材料 / Third-party listing kit

准备日期：2026-10-30。产品基线：v0.4.6。状态：收录材料随源码维护；未向第三方提交、未确认收录。渠道进展见 [分发状态](THIRD_PARTY_STATUS.md)。本页不改变已发布的安装包。

## 统一身份

| 字段 | 内容 |
| --- | --- |
| 产品 / Product | Plugin & Skill Manager |
| 开发者 / Developer | Zishen Wang |
| 许可证 / License | Apache-2.0 |
| 仓库 / Repository | https://github.com/zz11ss11zz/plugin-skill-manager |
| 发布 / Release | https://github.com/zz11ss11zz/plugin-skill-manager/releases/tag/v0.4.6 |
| 主 Skill / Primary skill | `skill-manager` |
| 辅助 Skill / Companion | `setup` |
| 面向用户 / Audience | Local Codex users managing plugins and Skills |
| 建议分类 / Suggested category | Developer Tools / Productivity（以目标目录实际分类为准） |
| 建议标签 / Suggested tags | `codex`, `agent-skills`, `mcp`, `plugin-management`, `skill-management`, `usage-tracking`, `local-first` |

保留现有 Skill 标识，不为收录另建同功能副本。以上标签是待填写材料，尚未修改 GitHub Topics。不要添加未经验证的 Claude Code / Cursor 兼容标签。

## 可直接填写的简介

**中文短简介**：盘点 Codex 插件与 Skills，查看使用记录，为精简工具环境提供依据。

**English short description**: Inventory Codex plugins and Skills, inspect recorded usage, and inform cleanup decisions.

**中文详细简介**：Plugin & Skill Manager 是面向本地 Codex 的工具环境管理项目。它集中查看插件与 Skill 的来源、版本和状态，并分别展示 Skill 采用记录及插件调用尝试，帮助用户判断哪些工具值得保留、哪些需要进一步检查。支持备注和符合条件的用户 Skill 可逆归档。清理由用户决定；没有记录不代表从未使用。完整产品包含本地 MCP 服务、活动界面及配套 Skills；仅安装 Skill 不会安装服务。不直接支持 ChatGPT 网页版，也未验证其他宿主的工具环境管理能力。

**English long description**: Plugin & Skill Manager helps local Codex users inspect their tool environment. It brings together plugin and Skill sources, versions and status, with separate records for Skill adoptions and plugin call attempts. Use this evidence to decide what to retain or investigate, add notes, and preview reversible archives of eligible user Skills. Cleanup remains user-directed; missing records do not mean a tool was never used. The complete product includes a local MCP service, an activity UI and companion Skills. Installing a Skill alone does not install the service. ChatGPT web is not supported, and management of other hosts' tool environments has not been verified.

**依赖提示 / Dependency notice**：Requires the Plugin & Skill Manager local MCP service and a local Codex environment. The complete plugin already bundles both Skills; do not install duplicate copies.

不宣传自动卸载所有冗余、完整监听所有使用、跨宿主通用或确定的 token 节省比例。

## 提交对象与链接

- 主 Skill：https://github.com/zz11ss11zz/plugin-skill-manager/blob/main/skills/skill-manager/SKILL.md
- 辅助 Skill：https://github.com/zz11ss11zz/plugin-skill-manager/blob/main/skills/setup/SKILL.md
- 支持：https://github.com/zz11ss11zz/plugin-skill-manager/issues
- 隐私：https://github.com/zz11ss11zz/plugin-skill-manager/blob/main/docs/PRIVACY.md
- 条款：https://github.com/zz11ss11zz/plugin-skill-manager/blob/main/docs/TERMS.md
- 安装指南：[第三方安装说明](THIRD_PARTY_INSTALL.md)；验证结果：[验证记录](THIRD_PARTY_VALIDATION.md)。

## 截图与图标

复用仓库已有公开素材，不使用个人活动、路径或聊天内容。以下为 **v0.4.0 浏览器实际渲染、合成数据**，不是 v0.4.6 原生宿主截图。适合作为带版本说明的初步介绍；若目录要求当前版本截图，提交前重新采集。

![English activity preview — v0.4.0 browser render with synthetic data](../media/v040/activity-en.png)

中文图：[activity-zh.png](../media/v040/activity-zh.png)。说明与复现：[素材记录](../media/README.md)。图标沿用产品现有橙金双扳手，使用 [packaging/interface.json](../../packaging/interface.json) 中的 logo 引用，不另造品牌。

中文图注：v0.4.0 活动界面浏览器演示，使用合成数据；展示分别统计的插件调用与 Skill 采用，不代表真实用户记录或原生桌面验收。

English caption: v0.4.0 activity dashboard rendered in a browser with synthetic data. Plugin calls and Skill adoptions are separate metrics. This is not personal usage data or a native desktop acceptance capture.

## 第一批渠道

| 渠道 | 准备方式 | 当前状态 |
| --- | --- | --- |
| [agentskill.sh](https://agentskill.sh/submit) | 可填写公开仓库或具体 SKILL.md 链接；优先主 Skill，保留依赖提示 | 未提交；前次已核对入口，本次页面抓取超时 |
| [skills.sh](https://www.skills.sh/docs/faq) | 真实用户通过 CLI 安装后自动统计并进入榜单；没有单独的人工提交流程 | 仓库发现通过；未确认收录，不以测试安装宣称排名 |
| [SkillsMP](https://skillsmp.com/agent-skills) | 待核对当前收录入口 | 备选；不沿用过时的自动收录承诺 |

MCPB / Smithery、npm / MCP Registry 属于后续服务分发阶段，不包含在本阶段。
