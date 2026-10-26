# Demo assets

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

The English README uses `en/demo.gif` and `en/dashboard-skills.png`. The Chinese README keeps the original Chinese assets in this directory. Both sets contain the same six demonstration steps using synthetic records.

For English capture, run `node scripts/demo.mjs --lang=en` and use browser locale `en-US`; for Chinese, run without the flag and use `zh-CN`. English captures include post-v0.1.0 localization fixes for the version label and built-in source labels. The 2026-10-26 capture checked every frame for untranslated Chinese text and reported no page errors. The published v0.1.0 tag remains unchanged.

## 0.2 management and setup

`v020/en` and `v020/zh` contain language-matched screenshots and `walkthrough.webm`: a four-second-per-state sequence of six actual browser UI screenshots. It is a demonstration video, not native desktop capture or conversational review evidence. `capture.json` records the stages and browser errors. Paths displayed by the synthetic harness use `C:\demo\skill-manager`; actual fixture operations remain isolated in a temporary directory.

Reproduce with `scripts/capture-walkthrough.mjs <demo-url> <output-directory>` (add `--zh` for Chinese), using Playwright and Chrome. If Playwright is not installed in the project, set `PLAYWRIGHT_MODULE` to its absolute `index.mjs`; `CHROME_PATH` selects the browser executable. `scripts/acceptance-ui.mjs <demo-url> <output-directory>` separately checks actual note, archive, restore and narrow-panel behavior. Neither requires a private account or real activity data.
