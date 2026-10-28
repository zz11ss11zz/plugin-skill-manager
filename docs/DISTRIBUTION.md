# Install the prebuilt plugin / 安装预构建插件

Download the **plugin ZIP**, verify its SHA-256 against the release checksums, and extract it to a permanent folder. It contains the bundled MCP server, dashboard and companion skills. Node.js 20.18+ and Codex CLI with `plugin marketplace` support must be available on PATH. No npm install or build is needed. The checksums detect changes; they are not a publisher signature.

下载 Release 中的 **plugin ZIP**，核对 SHA-256 后解压到固定目录。包内已有服务、界面与配套 Skill；需要 PATH 中可用的 Node.js 20.18+ 和支持插件市场命令的 Codex CLI，无需运行 npm。不要把 ZIP 下载地址当作 marketplace URL。

Run from the extracted directory / 在解压目录运行：

```powershell
node install.mjs check
node install.mjs install
```

Restart Codex or start a new chat to discover the plugin. Ask it to open Plugin & Skill Manager. CLI installation does not establish native desktop UI compatibility.

重启 Codex 或新建聊天以发现插件，请它打开Plugin & Skill Manager。CLI 安装通过不等于已完成原生桌面界面验收。

## Upgrade / 升级

Extract the new release into a new permanent folder, then run there:

```powershell
node install.mjs install --replace-source
node install.mjs check
```

The explicit flag permits replacing the registered source path. Preserve the old folder until the new version has been verified. Existing standalone MCP registrations must first be removed with `codex mcp remove plugin-skill-manager` to avoid duplicate services. This does not delete data.

将新版本解压到新的固定目录后执行上述命令；验证成功前保留旧目录。若已有同名独立 MCP 注册，先移除注册以避免两个服务并行，数据不删除。

## Uninstall / 卸载

```powershell
node install.mjs uninstall
```

Only this plugin and its dedicated catalog registration are removed. Activity and notes remain at `$CODEX_HOME/skill-manager/data-v1` (normally `~/.codex/skill-manager/data-v1`), or at your explicit `CODEX_SKILL_MANAGER_DATA_DIR`. Archives remain separately at `$CODEX_HOME/skill-manager-archive`. Back up both while the service is stopped. Reinstalling reads the retained records.

仅移除本插件及专属目录注册；采用记录、插件调用记录、备注和归档保留在独立数据目录。服务停止时可备份，重装后继续读取。

## Troubleshooting / 排错

The installer validates the extracted files and reports actual CLI state. For Windows cache activation `os error 5`, it checks whether installation succeeded before at most two retries. If an installation exists or another error occurs, it stops. It never changes ACLs, deletes caches or disables security software. Preserve the full error and run `check`; a CLI error is not a successful install.

Windows 缓存激活出现 `os error 5` 时，仅在核实没有成功安装后最多重试两次；仍失败会停止并保留错误，不更改权限或删除缓存。`check` 只读查询包与 CLI 状态；它不能证明所有聊天都已采用记录约定。

## Identifier rename / 标识更名

Version 0.3.0 uses `plugin-skill-manager` for the package, plugin, marketplace and MCP registration. The display name is Plugin & Skill Manager. Existing v0.2.0 and earlier Release ZIPs retain their original filenames and internal identifiers; they have not been replaced by renamed builds.

当前源码的包、插件、市场和 MCP 注册名统一为 `plugin-skill-manager`。已有 v0.2.0 及更早 Release 附件保留旧文件名与内部标识，v0.3.0 分发包使用新标识。

Before installing the renamed v0.3.0 package, inspect the old registration. For a standalone MCP install, retain the original source/data folders and remove only the `codex-skill-manager` registration, then register the renamed entry. For a full plugin install, run `node install.mjs uninstall` from the old package before installing the renamed package. Do not install both identities at once. The installer rejects an existing legacy registration/catalog rather than silently running duplicate services.

升级前先核对旧入口：源码 MCP 安装保留原代码和数据目录，仅移除 `codex-skill-manager` 注册后再注册新入口；完整插件安装先从旧包执行 `node install.mjs uninstall`，再安装新包。安装器会阻止新旧身份并存。保留旧 `CODEX_SKILL_MANAGER_*` 环境变量兼容性、`skill-manager/data-v1` 持久目录和 `skill-manager-archive`；旧源码版的 `.local` 目录也不得因改名移动或删除。

## Automatic capture since v0.3.3 / v0.3.3 自动采集

[启停、间隔、源码升级、隐私与 token 开销](AUTO_CAPTURE.md)。已有 v0.3.2 ZIP 不含此功能。升级至 v0.3.3 或之后版本并重载服务，通过 configure_auto_capture 明确启用；设置保留在独立数据目录，安装和普通打开不会自动授权日志读取。
