# Identifier rename: plugin-skill-manager

The repository, package, plugin manifest, marketplace and MCP registration now use `plugin-skill-manager`. The product display name remains **Plugin & Skill Manager**.

Version 0.3.0 source and distribution are renamed; existing v0.2.0 and earlier release archives are unchanged and retain their old internal names and attachment filenames. Follow [the migration guidance](DISTRIBUTION.md#identifier-rename--标识更名) before changing installation identity.

Storage and existing CODEX_SKILL_MANAGER_* environment variables remain compatible. Standalone installs must preserve their original source and .local directories; modern packages continue using skill-manager/data-v1 and skill-manager-archive. New installers reject legacy MCP registrations or catalogs before creating a duplicate service.

Validation on Windows: 62 tests passed with SKILL_MANAGER_TEST_CODEX=1, including isolated install/check/uninstall and legacy-name collision checks. The tested local working tree includes earlier UI improvements; the GitHub rename commit changes identifiers and compatibility checks only. Existing native Codex sessions require a restart to discover the renamed registration.
