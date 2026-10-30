# 第三方收录准备：验证记录

以下保留第一阶段实测快照。后续渠道尝试和阻塞见 [分发状态](THIRD_PARTY_STATUS.md)；快照中的“本地准备稿”不代表该文档在后续合入 main 后仍未发布。

日期：2026-10-30。基线：Plugin & Skill Manager v0.4.6。此阶段仅准备材料和验证安装，不提交第三方目录、不发布新版本、不改变账号共享权限。

## 已通过

- 中英文名称、简介、依赖提示、目标用户、建议标签、来源与支持链接集中整理到 `THIRD_PARTY_LISTING.md`；两个 README 加入入口。
- 两个 Skill 保持原名 `skill-manager` / `setup`。源码明确说明单独安装不提供 MCP 服务；不制造重复 Skill 或改写现有运行指令。
- Windows 隔离项目使用 Node.js **22.20.0**、`skills@1.7.4`，从本地源码实际安装两个配套 Skill。CLI 显示 `Found 2 skills` 和 `Installed 2 skills`。
- 公开仓库发现命令 `skills@1.7.4 add zz11ss11zz/plugin-skill-manager --list` 最终克隆成功，显示 `Repository cloned`、`Found 2 skills`，列出 `setup` 与 `skill-manager`。网络耗时较长，首次等待期间未误记为通过。
- 实际安装命令等价于：`npx skills@1.7.4 add <absolute-source-path> --skill skill-manager setup --agent codex --copy --yes`。临时 Node 版本通过 npm exec 准备，没有升级全局 Node。
- 安装目标为隔离项目 `.agents/skills/`，未使用 `--global`。安装前设置 `DISABLE_TELEMETRY=1`，避免测试计入排行榜安装统计；未启用项目活动采集。
- 安装后逐文件核对两个 `SKILL.md` 的 SHA256 与源码相同：

| Skill | SHA256 |
| --- | --- |
| setup | `36F57A446FB997B765C1946EADA6DA075E8B1C38E4E8363AD50479EE41124E87` |
| skill-manager | `241C4650121A7C1AC2897823E04A4640CBA7AE26CDA9F2937AEC077CE60B4431` |

- 已实际打开中英文 `docs/media/v040/activity-*.png`，确认合成数据标记和 v0.4.0 标识可见。未把它们称作 v0.4.6 或原生宿主截图。

## 未通过或未覆盖

- 远程发现与实际安装分开验收；本地源码安装通过不替代公开仓库实际安装。
- 随后的公开仓库实际安装在设置 `SKILLS_CLONE_TIMEOUT_MS=45000` 后报告 `Clone timed out after 45s` / `Installation failed`。因此远程实际安装未通过，不能宣称一键远程安装已验证。可使用已通过的本地源码路径；后续网络恢复时再测。外层 PowerShell 返回码不能代替 CLI 日志中的失败结果。
- 本次未重新执行原生宿主调用、MCP 生命周期或完整应用回归：本次只新增推广文档及 README 导航，没有改业务代码、Skills 或安装包。
- 新文档仍为本地准备稿；尚未推送、提交第三方目录、确认可搜索、认领开发者身份或取得排行榜位置。
- 现有截图可用于带版本标识的介绍。要求当前版本截图的目录需要后续重新采集；不编辑截图上的版本伪装更新。

## 复核入口与下一阶段

- [skills CLI](https://www.skills.sh/docs/cli)：本次可读取；确认安装方式与关闭安装统计的环境变量。
- [agentskill.sh 提交页](https://agentskill.sh/submit)：上一轮已确认仓库 / SKILL.md 导入入口；本次重取超时，实际提交时复核页面。
- 进入提交阶段前：按目标平台填写本材料；检查依赖提示在最终页面仍可见。发布/收录成功以平台实际返回和可访问页面为准。

本地原始日志保存在工作区 `.work/third-party-stage1/`：`local-install.log`、`remote-discovery.log`、`file-verification.json`。这些测试目录和日志不属于公共发布材料。
