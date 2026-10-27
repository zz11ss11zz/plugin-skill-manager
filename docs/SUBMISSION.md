# Official submission preparation / 官方提交准备

Prepared 2026-10-27 for 0.3.2. **This version has not been uploaded, submitted, approved or listed.** This file distinguishes materials ready in the repository from external conditions that remain open.

## v0.3.2 package selection

Upload **plugin-skill-manager-0.3.2-desktop-package.zip** from the v0.3.2 release. It has `plugin.json`, `mcp.json`, two Skills, assets and the bundled runtime at the ZIP root. The author is Zishen Wang, matching the listing developer name. The build includes the two-view UI, source categories/search, automatic cached checks and violet heatmaps. Keep the local MCP configuration intact.

The separate `plugin-skill-manager-0.3.2-plugin.zip` is for manual installation, not portal upload. The source ZIP is for development. Verify the selected file with `SHA256SUMS-0.3.2.txt`.

The earlier 0.3.1 portal draft was uploaded but not submitted, approved or published; the portal reported that it was not accepting more skills-only submissions. The previous attempt notes below are historical. Uploading this new version does not resolve local-MCP eligibility or missing native review evidence. Current official desktop-only guidance was rechecked on 2026-10-27 and still requires organization allowlisting.

## Package and listing

- The public `plugin.zip` is a complete **installation distribution**: catalog, installer and `plugins/plugin-skill-manager/`. Extract it before registering its local catalog.
- The separate `desktop-package.zip` has `plugin.json`, `mcp.json`, `skills/`, assets and the bundled server **at its root**. It is the package shape prepared for desktop-only review, not a claim of submission readiness. Node.js 20.18+ must be available on PATH; JavaScript dependencies and dashboard are bundled.
- `packaging/interface.json` holds the base English listing, capability labels, public HTTPS information pages and icon paths. The maintainer name follows the repository NOTICE; a directory publisher name must ultimately match the selected verified identity.
- `packaging/review-cases.json` supplies exactly five positive and three negative scenarios. They are scenarios for reviewers, not fabricated records of human review. No credentials are required by this local service; test only synthetic Skills and records in an isolated environment.
- `skills/setup/SKILL.md` is referenced by the manifest's onboarding field. It checks received records without writing a dummy event or editing global instructions automatically.
- The color icon is in `src/assets/orbit-color.png`; the package includes it as both composer icon and logo. It is distinct from OpenAI branding.
- Public support, privacy and project terms are [SUPPORT.md](SUPPORT.md), [PRIVACY.md](PRIVACY.md) and [TERMS.md](TERMS.md). These describe the existing implementation and Apache-2.0 license. Portal acceptance of the GitHub-hosted pages has not been tested.

## Evidence already produced

The validation log records Windows regression tests, installed-cache MCP startup, app-server Skill discovery, 0.1.1 → 0.2.0 relocation, data retention and browser note/archive/restore interactions. Browser screenshots and WebM state sequences use synthetic data with a `C:\demo\skill-manager` path alias. They demonstrate product behavior and explicitly retain the synthetic/browser label.

The WebM is a sequence of real browser UI states, not a native desktop screen recording and not proof that a language model followed all eight review prompts. The prepared positive/negative cases must still be exercised in the target native host before submission. Do not describe unit tests or browser controls as that conversational review.

## Remaining external conditions

1. Confirm developer/business identity and submission access for the actual publishing organization.
2. Obtain confirmation from OpenAI that the organization is allowlisted for **local MCP submissions**. No organization ID has been sent by this project, and no partner eligibility is assumed.
3. Run a clean native desktop installation: global entry, panel rendering, language changes, restart, notes/archive/restore, setup in a fresh chat and setup after installation in an existing chat. The browser controller has native app APIs disabled. The separate Windows Computer Use provider identified the running host as ChatGPT, which its guidance explicitly excludes from UI automation. No host-window action was taken; these workflows remain unverified.
4. Record a reviewer-accessible native walkthrough covering the review cases, then supply `review.demo_recording_url`. The browser demonstration is supporting material, not a substitute for missing native evidence.
5. Check imported portal metadata, target availability and any actual required fields. The publisher must make the policy attestations based on verified facts. Submit and publish only after prerequisites and review are satisfied.

For v0.3.2, no upload, submission, organization message, policy attestation or directory publication has been performed.

## Official references

Checked 2026-10-26: [desktop-only submissions](https://developers.openai.com/plugins/deploy/desktop-only), [package structure and onboarding](https://developers.openai.com/plugins/build/plugins), [metadata and review requirements](https://developers.openai.com/plugins/deploy/submission). Local stdio follows the desktop-only route. Do not replace it with a fictitious hosted endpoint or omit the MCP server to bypass eligibility.

## 2026-10-26 portal attempt

Attempted to inspect the existing Chrome tab at `https://platform.openai.com/plugins`; browser acquisition and page observation timed out. A fallback in-app browser attempt also timed out. No form was read and no ZIP was uploaded or submitted. Account permissions, identity verification and local-MCP allowlisting remain unknown. The prepared 0.3.0 desktop package is available for a later portal retry; native review evidence remains outstanding.
