# Changelog

## 0.4.6 — 2026-10-30

- Unify source, private plugin and public packages; include previously private service-icon fixes.
- Generate both manifests, bilingual package READMEs, MCP review cases and release notes from source.
- Check version and content consistency in package tests; remove stale version assertions.
- Retain the prominent bilingual product purpose and concise installation guidance.
- See [release notes](docs/releases/v0.4.6.md) for delivery and upgrade boundaries.

## 0.4.1 — 2026-10-29

- Show installed plugin display names and icons in Manage and both plugin-call ranking sources; load metadata on first open and match unique display names for opaque app IDs.
- Use a simplified monochrome plug-and-wrench app icon; retain the colored artwork for a future marketplace listing.
- Preserve letter fallback on missing/failed images, with bounded local reads and allowlisted remote image URLs.

- Use the official app-server `plugin/installed` endpoint for inventory refresh instead of waiting for marketplace discovery. Keep navigation and search available during refresh, skip unrelated activity scans, and suspend activity polling while Manage is open.
- Unify plugin and Skill inventory filter buttons and search layout in both languages.
- Preserve activity charts when an inventory-only response arrives. See [update and verification notes](docs/releases/v0.4.1.md).
- Separate host-event calls (default) from assistant-reported calls; never add the two views.
- Label Skill adoptions as assistant-reported. Show capture state, scan freshness, event bounds and read issues in both languages.
- Treat missing activity as unknown; recorded timestamps do not prove continuous coverage.
- Preserve legacy reports and exact-ID corroboration evidence. API default call summaries now select host events; see docs/DATA_ACCURACY.md.
- Official analytics reconciliation is not claimed.

## 0.4.0 — 2026-10-28

- Muted teal light/dark activity palette and neutral controls; only Activity/Manage navigation.
- Recorded 30-day summaries and daily bars linked to annual calendar selection.
- Named daily rankings, shared highlights, preserved keyboard focus and Back to all restoring period filters.
- Time-zone-aware windows, explicit missing coverage/zero/future states and separate plugin/Skill metrics.
- Bilingual browser regression and reproducible synthetic screenshots; capture/data storage semantics unchanged.
- [Release and upgrade notes](docs/releases/v0.4.0.md).

## 0.3.3 — 2026-10-28

- Optional cross-chat plugin/MCP host-event capture, persistent opt-in/disable and a configurable 5–3600 second interval. No model call is made by polling.
- Original call times, ID deduplication, bounded incremental reads and diagnostic coverage; Skill adoptions remain separate.
- Node 20/24 Windows test runner, Windows CI and a body-parser security update.
- See docs/AUTO_CAPTURE.md for setup, privacy and upgrade limits. Included in the v0.3.3 packages; existing v0.3.2 ZIPs remain unchanged.

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
