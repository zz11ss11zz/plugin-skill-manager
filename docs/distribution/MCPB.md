# Plugin & Skill Manager — MCPB / Smithery

This package distributes the existing v0.4.6 local MCP service in MCPB format. It does not install a hosted service or upload local Codex records to Smithery. A prepared bundle is not proof of a published Smithery listing.

**2026-10-30 status:** Local packaging and extracted-runtime checks passed. Publication to the user-approved `wswzs001/plugin-skill-manager` is blocked by Smithery's server-creation API; no listing or release was created successfully. Authentication and namespace discovery succeeded.

## Requirements and configuration

- Windows; Node.js 20.18+; the Codex CLI available to the server process. Other operating systems and native MCPB client installation have not been verified.
- Select the existing Codex directory when asked (`${HOME}/.codex` by default). This is a data-source setting, not an access-control sandbox. The service also inspects the user's `.agents/skills` directory, as in the existing product.
- MCPB clients resolve `${__dirname}` to the extracted bundle and `${user_config.codex_home}` to the chosen directory. Do not run unresolved placeholders directly in a shell.
- The graphical dashboard needs an MCP Apps-capable host. MCP protocol compatibility alone does not guarantee dashboard rendering or management of other clients' tool environments.
- The included `skills/setup` and `skills/skill-manager` files are companion instructions. MCPB does not automatically register them as host Skills. Existing complete-plugin users already have these Skills; avoid duplicate installations.

## Local data and operations

Inventory and records remain local. Skill adoptions are assistant-reported. Plugin calls may be collected from local host events after explicit opt-in. Existing capture settings are retained when using an existing Codex directory; a fresh directory starts with capture disabled. Missing records do not mean never used. Tool responses sent to an AI client may enter that client's conversation context.

The service supports notes and previewed, reversible archives of eligible user Skills. It does not automatically uninstall redundant plugins. Run one manager instance against a given ledger at a time; use this bundle as an alternative distribution route to the complete plugin, not an additional collector. Uninstalling the bundle should leave the external Codex data directory intact.

## 中文说明

此包将 v0.4.6 本地服务转换为 MCPB 分发格式，不部署云端服务。需要 Windows、Node.js 20.18+ 和本地 Codex CLI。配置时选择已有 Codex 目录；服务也读取用户 `.agents/skills`，该配置不是文件访问沙箱。界面显示取决于宿主是否支持 MCP Apps；没有验证其他宿主的原生安装和界面。

完整插件已安装的用户无需再装一份相同服务。MCPB 内含配套 Skill 文件供参考，不表示宿主会自动安装这些 Skills。新数据目录默认关闭自动采集；连接已有目录会沿用用户保存的设置。无记录不等于未使用，清理操作需用户决定。安装包不包含个人日志或凭据。

## Reproduce the package

From the source repository, prepare a fresh normal plugin using its established build process, then stage MCPB into a new directory:

```text
node scripts/build-mcpb.mjs <prebuilt-plugin-directory> <new-staging-directory>
npx @anthropic-ai/mcpb@2.1.2 validate <new-staging-directory>/manifest.json
npx @anthropic-ai/mcpb@2.1.2 pack <new-staging-directory> <output-file.mcpb>
npx @anthropic-ai/mcpb@2.1.2 unpack <output-file.mcpb> <new-verification-directory>
node scripts/verify-mcpb.mjs <new-verification-directory> <prebuilt-plugin-directory> <result.json>
```

Only explicit runtime, icon, license and Skill files are copied. Runtime dependencies are already bundled in `server/src/server.mjs`; no npm install is needed inside the installed bundle. Use a new output directory to avoid including stale or personal files.

## Publishing

Authenticate locally with `npx smithery@1.2.0 auth login`, inspect your namespaces with `npx smithery@1.2.0 namespace list`, then publish using your confirmed namespace:

The command below is the documented platform route, **not a verified successful route for this package as of 2026-10-30**. CLI 1.2.0 copies MCPB's minimal `tools` entries into a server card, but the publishing API requires full `inputSchema` objects. `verify-mcpb.mjs` therefore writes a separate `server-card.json` containing the actual runtime schemas. Keep this full card separate from the schema-valid MCPB manifest rather than inventing unsupported manifest fields.

```text
npx smithery@1.2.0 mcp publish <output-file.mcpb> -n <your-namespace>/plugin-skill-manager
```

Do not copy credentials into the package or chat. Verify the returned release and downloadable artifact before claiming publication. The bundle has no publisher signing certificate; it is not claimed as signed or vendor-verified.

The API attempt with the full server card returned `404 Server not found`. Both the documented server creation route and the namespace-scoped route in the official SDK returned `403` with `Updating servers has been removed. Contact support@smithery.ai.` This is an unresolved platform workflow issue, not evidence of an invalid login. No support message has been sent. Resume only when an applicable creation/publishing route is available; preserve the local-execution model.

References checked 2026-10-30: https://smithery.ai/docs/build/publish ; https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md . Source and support: https://github.com/zz11ss11zz/plugin-skill-manager . Privacy: https://github.com/zz11ss11zz/plugin-skill-manager/blob/main/docs/PRIVACY.md . License: Apache-2.0.
