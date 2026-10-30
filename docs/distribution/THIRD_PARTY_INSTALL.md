# 配套 Skill 安装 / Companion Skill installation

## 先选择安装方式 / Choose your route

**一般用户优先安装完整插件。** 它包含本地 MCP 服务、界面及 `skill-manager` / `setup` 两个 Skills，无需再从第三方目录重复安装。按 [完整安装指南](../DISTRIBUTION.md) 使用 v0.4.6 完整插件包。

**Most users should install the complete plugin.** It includes the local MCP service, UI and both Skills. Do not additionally install duplicate companion Skills from a directory. Follow the [complete installation guide](../DISTRIBUTION.md).

以下仅适用于已通过源码方式配置本地 MCP 服务、需要独立安装配套指令的 Codex 用户。第三方 Skill 安装器不负责安装或连接本项目 MCP 服务。

The commands below are for local Codex users who configured the MCP service separately and need its companion instructions. The Skill installer does not install or connect this project's MCP service.

## 发现与安装 / Discover and install

**验证边界：本地源码安装已通过；GitHub 直接安装尚未验证成功。** 以下远程命令用于诊断与复现，不应宣传为已验证的一键安装。需要可靠路径时优先下载完整插件，或将仓库参数替换为已下载源码目录。

**Verification: installation from local source passed; direct GitHub installation has not passed.** The remote commands below are diagnostic/reproduction instructions, not a verified one-command installation claim.

在目标项目目录运行，使用 Node.js **22.20+**（`skills@1.7.4` 的要求；管理器本身要求 Node.js 20.18+）。固定 CLI 版本方便复现，不表示它永远是最新版本。

Run in the target project with Node.js **22.20+**, required by the pinned installer. The manager itself requires Node.js 20.18+.

```powershell
# Optional: disable skills CLI installation telemetry.
$env:DISABLE_TELEMETRY='1'

# Inspect available Skills before installing.
npx skills@1.7.4 add zz11ss11zz/plugin-skill-manager --list

# Install only the main companion Skill into this project.
npx skills@1.7.4 add zz11ss11zz/plugin-skill-manager --skill skill-manager --agent codex --copy
```

如需要初次接入诊断，单独选择 `--skill setup`。不要使用全量安装去收取仓库中的测试或审核示例 Skill。没有使用 `--global`；安装范围为当前项目。网络不可用时可从已下载源码安装，将仓库参数替换为该源码目录的绝对路径。

Choose `--skill setup` separately for recording diagnostics. Avoid installing every discovered Skill: the repository also includes test/review fixtures. Without `--global`, installation targets the current project. If GitHub cloning fails, use the absolute path of downloaded source instead of the repository argument.

## 安装后的检查 / After installation

1. 在新聊天中确认配套 Skill 可用 / Start a new chat and confirm the companion Skill is available.
2. 请求：“打开 Plugin & Skill Manager，解释 Skill 采用和插件调用的区别。” / Ask: “Open Plugin & Skill Manager and explain adoption versus call counts.”
3. 若找不到 MCP 工具，按 [本地配置](../LOCAL_SETUP.md) 检查服务；不要用虚构统计代替。 / If MCP tools are missing, check the [local setup](../LOCAL_SETUP.md); do not invent activity.
4. 无记录时显示未知或尚无记录；安装不会补造历史，也不会自动授权后台采集。 / Missing records are unknown history. Installation does not fabricate past activity or authorize background collection.

CLI 文件安装通过不代表已在原生宿主验收，也不代表目录收录。具体实测范围见 [验证记录](THIRD_PARTY_VALIDATION.md)。

References checked 2026-10-30: [skills CLI](https://www.skills.sh/docs/cli), [skills directory](https://www.skills.sh/docs).
