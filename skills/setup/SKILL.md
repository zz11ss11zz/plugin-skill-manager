---
name: setup
description: Set up or diagnose recording for Plugin & Skill Manager after installation, explain its local data boundaries, and check whether records have arrived. Use for this plugin's first-use setup or missing-record questions.
---

# Set up Plugin & Skill Manager

Discover this plugin's actual tool namespace. Start with `check_recording_status` to inspect environment health and existing records. Use `open_skill_manager` when the user wants the panel; if capture is already enabled, opening it may perform the normal capture refresh. If the tools are absent, report that the current chat cannot access the MCP service; consult the installation guide or suggest reopening Codex after installation. Installing a Skill alone does not provide the service.

When a `health` report is returned, explain failed and unknown checks first, using the user's language. It covers runtime/dependencies, local CLI and installation, directory permissions, stored ledgers, settings and capture freshness. `info` includes valid conditions such as capture being off or optional files not yet existing. `warning` needs review; `error` identifies a local problem; `unknown` means evidence is unavailable. One failed check does not invalidate the others. An unreadable configuration leaves `automaticMonitoring: null`, never false. Passing preflight does not prove native sidebar behavior or complete host coverage.

If startup fails and the user has current development source, run `node scripts/doctor.mjs --json` from that source directory in the affected environment. The doctor runs independently of MCP initialization and npm dependencies. Newly built bundles also support `node server/src/server.mjs --diagnose --json` from the plugin root. The published v0.4.6 archives do not include this enhancement; verify available source/version before suggesting commands. No test events, automatic repair, reinstall, lock deletion or capture enablement follow from a diagnostic result.

Explain the observed status in the user's language:

- `recorded`: records have arrived; report the latest received time and distinguish Skill adoptions from plugin call attempts. This does not prove other chats or clients are recording.
- `empty`: no records have arrived in that ledger. This is not proof of no activity. Do not write a test event into the user's ledger.
- `unavailable`: reading failed; preserve the file and report unknown counts. Do not reset it to zero.

The plugin stores identifiers, timestamps, local inventory metadata, user-requested notes and archive records locally. Optional automatic plugin capture covers readable local host MCP events after explicit enablement; it does not confirm Skill adoptions or cover unlogged remote activity. Importing historical signals is a separate user-requested operation that reads local Codex session logs; signals are not confirmed adoptions.

When the user requests ongoing plugin capture, call configure_auto_capture with enabled:true and their chosen intervalSeconds (default 10). This reads local logs across chats and archives; explain the local scope and no-model polling. Do not enable it from a mere read-only status question. Inspect check_recording_status for configuration, coverage and errors. For a disable request, set enabled:false and preserve records. Do not manually double-report automatically captured calls.

For Skill adoptions, or plugin calls on clients without host-event logs, explain or provide this small instruction for their chosen project or personal instructions. Write it only if the user requested that configuration change, and preserve existing instructions:

> When `record_skill_use` is available, report actual Skill adoptions near use: one item per adoption, including repeated adoptions, with a unique batch ID of at least 16 characters. Reuse the same ID and items when retrying the record. Exclude audit-only reads and historical backfill; send only Skill identifiers. If plugin call recording is also requested, call `record_plugin_calls` for actual plugin tool attempts using their real namespace, full tool name and unique call ID; do not record the recording tools themselves. Recording failures must not block the task.

Do not claim this instruction has been applied until its target was actually changed. Verification should follow a real, independently useful Skill adoption or tool attempt already authorized by the task, then reread status. Never invent activity just to make setup look healthy. For advanced notes, archives or historical queries, use the companion `skill-manager` Skill.
