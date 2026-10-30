# Standalone desktop plugin package

**English** | [中文](README.zh-CN.md)

**See which plugins and Skills are installed and used, identify redundancy, and streamline your tool environment for more efficient, controllable work.**

1. **Inventory your tools in one place**  
   Inspect plugin and Skill sources, versions, installation and enablement status. Spot duplicate installations, outdated versions and stale entries to reduce lookup and maintenance effort.

2. **Track usage to inform decisions**  
   Use cross-session records, time-based statistics and traceable sources to understand which tools are used frequently and which have had no records for a long time.

3. **Identify redundancy and support safe cleanup**  
   Consider overlapping functionality, duplicate installations, usage and your needs to identify plugins or Skills that could be uninstalled. You decide what to remove, reducing tool-selection noise, maintenance effort and unnecessary permissions. When cleanup reduces service startup, tool definitions or loaded instructions, it can improve runtime efficiency and reduce token consumption.

Version: read plugin.json. The complete release provides a complete installation
distribution containing this standalone package, a local catalog and install.mjs.
Use the distribution's top-level installation guide for normal installation.
Requires Node.js 20.18+ on PATH. Runtime JavaScript dependencies are bundled;
do not run npm install inside this package.

Build from source with `npm ci` and `npm run build:plugin`. The output directory
is `dist/plugin-<version>`. An existing output is deliberately not overwritten:
move it aside before rebuilding, especially if it contains test data.

For a Windows protocol smoke check, run `node server/src/server.mjs` from this
directory. It waits for MCP messages on stdin; use Ctrl+C to stop. A quiet
process alone is not proof of a successful handshake.

In a Codex environment with local plugin loading, select this directory using
the supported local-plugin workflow. Confirm the global Plugin & Skill Manager entry
opens, the panel loads, and errors are understandable. If local loading is not
available, record that limitation. M3 provides a companion Skill and a buildable
development marketplace. The current package embeds the exact dashboard HTML
in its server bundle and includes readable THIRD_PARTY_NOTICES.md. This layout
passed Windows marketplace installation; 0.2 also passed the packaged installer's
seven lifecycle checks including a 0.1.1 upgrade. A known intermittent Windows
cache activation denial remains bounded by installer recovery, not claimed fixed. See
docs/MARKETPLACE.md in the source repository or the marketplace artifact's
top-level README. Installing the Skill alone does not install MCP.

M2 stores records outside the package under CODEX_HOME/skill-manager/data-v1
(default: ~/.codex/skill-manager/data-v1). CODEX_SKILL_MANAGER_DATA_DIR may
override this with an absolute path. Stop old services before migration;
CODEX_SKILL_MANAGER_LEGACY_DIR selects the old .local directory explicitly.
Set these variables in the service launch environment. Start with disposable
test data. See DATA_MIGRATION.md for backup, rollback and verification steps.

The project is licensed under Apache-2.0; see LICENSE and NOTICE in this package.
Third-party dependencies retain their own licenses in THIRD_PARTY_NOTICES.md.
