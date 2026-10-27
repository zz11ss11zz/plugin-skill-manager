# Demo assets

## Current main demo — 2026-10-27

Both READMEs use `main-20261027/<en|zh>/demo.gif`, captured from source commit `1e81af2a0d18e0b80ee3a943753abd722d095b51`. The package badge still reads v0.3.1; the demonstrated changes are included in v0.3.2, but not in the v0.3.1 ZIPs.

The six states show plugin-call heatmaps, Skill-adoption heatmaps, Manage with all source totals, the personal-Skill category, a search for `report-demo`, and expanded source/notes. There are only Activity and Manage views. All inventory, activity and displayed paths are synthetic. Original descriptions retain their source language.

Each GIF contains six 1280 × 720 browser screenshots at five seconds per frame (30 seconds total, infinite loop). Pillow encodes a 192-color palette without dithering, disposal 2. No UI text or numbers are painted onto screenshots; the visible DEMO banner is retained. These are screenshot walkthroughs, not native Codex recordings or official review evidence. `main-20261027/capture.json` records source revision, duration, dimensions and asset hashes.

To reproduce, run `npm ci`, `npm run build`, then `node scripts/demo.mjs --lang=en` or `node scripts/demo.mjs --lang=zh`. Open the printed local URL, capture the default plugin view, select Skill, then Manage, Personal skills, search `report-demo`, and expand Source and notes. Wait for each updated view to paint before capture. Type `q` in the demo terminal to stop it. Coverage dates depend on capture date.

## Historical release demo: v0.3.1

Current main has since removed the Setup page and added clickable source totals, automatic installation checks and violet heatmaps. The v0.3.1 captures below are retained as release history and do not depict the latest main UI.

Captured 2026-10-27 from the actual v0.3.1 UI with the local synthetic AppBridge harness. Earlier READMEs used `v031/<en|zh>/demo.gif`: six unaltered 1280 × 720 browser screenshots, five seconds each, looping for 30 seconds. The visible synthetic-browser label is retained. These assets are not native desktop recordings, real user activity, or official submission evidence.

| Frame | Demonstrated state |
| --- | --- |
| 01-plugins | Separate plugin tool-call attempts, version 0.3.1 |
| 02-daily-pinned | June 3 pinned; daily item detail distinct from period ranking |
| 03-observation | Skill rankings and compact low-use observation; small inventory action |
| 04-counting-details | Expanded observation rules and coverage limitations |
| 05-manage | Filtered synthetic user Skill, saved note and retain flag |
| 06-setup | Read-only check of received adoption and plugin-call records |

The UI was operated through the browser controller. The PNGs are raw screenshots; Pillow 12.3.0 encoded them with a 192-color palette, no dithering, 5000 ms per frame, infinite loop and disposal 2. Encoding changes colors only; no UI text or counts were painted onto images. The initial English fixture exposed a host-locale issue; the harness now supplies its explicit HTML language as the initial AppBridge host context. This only changes the synthetic preview host, not the installed plugin.

Reproduce the interface with `npm ci`, `npm run build`, and `node scripts/demo.mjs --lang=en` (English), or `node scripts/demo.mjs` (Chinese). Open the printed loopback URL. Use the six interactions above and retain the demonstration label. The fixture writes only synthetic temporary files; type `q` in its terminal to close it. Displayed paths use `C:\demo\skill-manager`. Coverage end dates depend on the capture date. `v031/capture.json` records payload hashes and verification scope.

## Historical assets (not used by current README)


These captures show the v0.1.0 dashboard with the post-release Chinese heading correction to “Skill 采用次数” (the published tag is unchanged) with generated synthetic records, using a local browser AppBridge host. They are **not native Codex screenshots**, real usage statistics, or evidence of official directory publication.

- `demo.gif`: six actual UI states, five seconds each; 30-second looping walkthrough.
- `dashboard-plugins.png`: separate plugin call-attempt statistics.
- `dashboard-skills.png`: Skill adoption statistics.
- `dashboard-filtered.png`: June date filter applied.
- `dashboard-detail.png`: item hover details.
- `dashboard-narrow.png`: 360-pixel panel in the browser host.
- `dashboard-return.png`: return to plugin statistics.

Reproduce the interactive source with `npm ci --ignore-scripts`, `npm run build`, then `node scripts/demo.mjs`. Open the printed loopback URL. The fixture uses generated 2026 records in an isolated temporary directory. The 0.2 script additionally permits status, notes and archive/restore operations bound only to its synthetic fixture. Type `q` in its terminal to close it and remove its own temporary fixture.

Capture with a 1100 × 1100 browser viewport and Chinese locale. GIF frames retain the visible synthetic-data label; do not crop that label out. Recording counts are examples, not performance claims. The coverage endpoint uses the runtime date, so future reruns may show a different coverage end date.

## Language-specific captures

Earlier English README versions used `en/demo.gif` and `en/dashboard-skills.png`. Earlier Chinese README versions used the original Chinese assets in this directory. Both sets contain the same six demonstration steps using synthetic records.

For English capture, run `node scripts/demo.mjs --lang=en` and use browser locale `en-US`; for Chinese, run without the flag and use `zh-CN`. English captures include post-v0.1.0 localization fixes for the version label and built-in source labels. The 2026-10-26 capture checked every frame for untranslated Chinese text and reported no page errors. The published v0.1.0 tag remains unchanged.

## 0.2 management and setup

`v020/en` and `v020/zh` contain language-matched screenshots and `walkthrough.webm`: a four-second-per-state sequence of six actual browser UI screenshots. It is a demonstration video, not native desktop capture or conversational review evidence. `capture.json` records the stages and browser errors. Paths displayed by the synthetic harness use `C:\demo\skill-manager`; actual fixture operations remain isolated in a temporary directory.

Reproduce with `scripts/capture-walkthrough.mjs <demo-url> <output-directory>` (add `--zh` for Chinese), using Playwright and Chrome. If Playwright is not installed in the project, set `PLAYWRIGHT_MODULE` to its absolute `index.mjs`; `CHROME_PATH` selects the browser executable. `scripts/acceptance-ui.mjs <demo-url> <output-directory>` separately checks actual note, archive, restore and narrow-panel behavior. Neither requires a private account or real activity data.

