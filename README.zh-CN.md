[English](README.md) | **中文**

# Plugin & Skill Manager

当前源码标识已改为 `plugin-skill-manager`；已有 v0.2.0 下载包仍保留旧标识，见[更名与升级说明](docs/IDENTIFIER_RENAME.md)。

**给已记录的 Skill 采用和插件调用，一张看得懂的活动面板。**

查看日期热力图、按时间筛选排名，分别理解 Skill 采用与插件调用尝试。记录保存在本机。

[下载安装](docs/DISTRIBUTION.md) · [v0.2.0](https://github.com/zz11ss11zz/plugin-skill-manager/releases/tag/v0.2.0) · [Apache-2.0](LICENSE) · [反馈问题](https://github.com/zz11ss11zz/plugin-skill-manager/issues)

![30 秒演示：切换类型、筛选日期和查看排名；使用合成记录](docs/media/demo.gif)

演示使用真实界面与合成记录，运行在浏览器演示宿主中，不是 Codex 原生侧栏录屏，也不是真实用户统计。中文标题包含 v0.1.0 发布后的一处口径文字修正。[静态图](docs/media/dashboard-skills.png) · [素材说明与复现](docs/media/README.md)。

v0.2 新增管理与接入页面：[中文演示视频](docs/media/v020/zh/walkthrough.webm) · [管理页截图](docs/media/v020/zh/manage.png)。视频由真实浏览器界面状态组成，数据和显示路径均为示例。

## 能帮你做什么

- 查看一年中已记录的活动，检查单日数量。
- 在插件调用与 Skill 采用之间切换，避免混算。
- 按日期筛选排名，区分没有覆盖和已记录为零。
- 在独立“管理”页搜索本机清单、核对来源、保存备注，预览并执行 Windows 用户技能的可逆归档与恢复。
- 在“接入”页查看最近收到的记录，不写入假测试事件，也不自动改写个人规则。

完整产品由 **本地 MCP 服务＋活动界面＋配套 Skill** 组成。单独安装 Skill 不会安装服务；采用记录需要助手按约定主动写入，插件调用也需要调用方记录。它不会自动监听所有操作，不会补造历史。

## 安装完整管理器

已验证环境为 Windows，需要 Node.js 20.18+ 和 PATH 中可用的 Codex CLI。本项目为独立开源项目，不是 OpenAI 官方产品，尚未上架官方插件目录。

下载 [v0.2.0 完整插件 ZIP](https://github.com/zz11ss11zz/plugin-skill-manager/releases/download/v0.2.0/codex-skill-manager-0.2.0-plugin.zip)，核对 Release 中的校验值，解压到固定目录。在含 install.mjs 的目录打开 PowerShell：

```powershell
node install.mjs install
node install.mjs check
```

检查结果应显示已安装并启用的 0.2.0 插件，且注册来源匹配。重开 Codex，再让助手打开Plugin & Skill Manager或运行本插件的 setup Skill。包内已经包含服务、界面与两个配套 Skill，无需 npm 安装或构建；保留解压目录。

60 项回归与 7 项隔离插件生命周期检查通过，包括 0.1.1 → 0.2.0 换路径升级。浏览器管理交互通过；最新版桌面原生侧栏仍未验证。详见 [升级与卸载](docs/DISTRIBUTION.md)、[验收记录](docs/VALIDATION.md) 和 [已知限制](docs/KNOWN_LIMITATIONS.md)。开发者仍可选择[源码安装](docs/LOCAL_SETUP.md)。

## 安装配套 Skill（可选）

完整插件已包含配套 Skill，无需重复安装。本节仅适用于源码/MCP 安装路径；配套 Skill 提供查询和解释记录的操作约定，不会自动开启后台采集。

固定版本的 skills CLI 需要 **Node.js 22.20+**，高于管理器自身要求。进入希望使用该 Skill 的项目目录，替换下方路径为实际解压的源码目录：

```powershell
npx skills@1.7.4 add "C:\tools\plugin-skill-manager" --skill skill-manager --agent codex --copy
```

本地源码安装路径已在隔离项目中实际通过。远程 GitHub 命令本次在克隆阶段连接重置，没有记为通过。[完整步骤与远程可选方式](docs/LOCAL_SETUP.md#配套-skill可选)。

安装后可对助手说：“打开Plugin & Skill Manager，解释采用次数和插件调用次数有什么区别。”要记录后续活动，按 [采用记录说明](docs/ADOPTION_RECORDING.md) 或 [插件调用接入](docs/PLUGIN_CALLS.md) 配置明确约定。

## 怎样理解数字

| 记录 | 表示什么 |
| --- | --- |
| Skill 采用 | 助手显式调用 record_skill_use 写入；重复采用分别计数 |
| 插件调用 | 调用方记录的尝试次数，失败尝试也计入 |
| 历史读取或提及 | 独立参考信号，不能直接当作实际采用 |
| 未记录／无覆盖 | 历史未知，不等于从未使用 |

Skill 按文件实例统计，同名副本保留身份。相同批次或调用 ID 重试去重；不同采用不按对话合并。日常刷新只读取现有统计，显式执行 import_usage 才导入历史日志。

## 本地数据与卸载

记录与备注默认位于 CODEX_HOME 下的 skill-manager/data-v1，归档另存于 skill-manager-archive。应用自身没有遥测或上传接口，但 MCP 工具结果会交给宿主，可能按宿主政策用于模型上下文。显式核对插件状态可能访问配置的市场。详见[隐私与数据流](docs/PRIVACY.md)、[项目使用说明](docs/TERMS.md)和[支持](docs/SUPPORT.md)。

```powershell
node install.mjs uninstall
```

完整包卸载脚本只移除本插件及专属市场注册，保留本地数据和归档。[升级、备份与恢复](docs/DATA_MIGRATION.md)。源码安装则仍用 `npm.cmd run setup:uninstall` 移除独立 MCP 注册。

## 演示、反馈和开发

[中文发布文案与字幕](docs/LAUNCH.zh-CN.md) · [复现演示](docs/media/README.md) · [开发路线](docs/ROADMAP.md) · [完整验收记录](docs/VALIDATION.md)

欢迎在 Issues 提供脱敏错误、复现步骤与统计口径建议。不要上传真实聊天、凭据或未脱敏的本机路径。

`npm test` 构建 UI 并运行合成数据测试；`npm run build:marketplace` 生成本地开发市场包，不代表远程市场或官方目录已经上架。[市场开发说明](docs/MARKETPLACE.zh-CN.md)。

Copyright 2026 Zishen Wang。采用 [Apache-2.0](LICENSE)，见 [NOTICE](NOTICE)；依赖保留各自许可证。
