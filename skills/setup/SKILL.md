---
name: setup
description: Set up or diagnose recording for Plugin & Skill Manager after installation, explain its local data boundaries, and check whether records have arrived. Use for this plugin's first-use setup or missing-record questions.
---

# Set up Plugin & Skill Manager

Discover this plugin's actual tool namespace. Call `check_recording_status` and `open_skill_manager` to check service access and existing records. If the tools are absent, report that the current chat cannot access the MCP service; consult the installation guide or suggest reopening Codex after installation. Installing a Skill alone does not provide the service.

Explain the observed status in the user's language:

- `recorded`: records have arrived; report the latest received time and distinguish Skill adoptions from plugin call attempts. This does not prove other chats or clients are recording.
- `empty`: no records have arrived in that ledger. This is not proof of no activity. Do not write a test event into the user's ledger.
- `unavailable`: reading failed; preserve the file and report unknown counts. Do not reset it to zero.

The plugin stores identifiers, timestamps, local inventory metadata, user-requested notes and archive records locally. It does not automatically monitor every tool or Skill invocation. Importing historical signals is a separate user-requested operation that reads local Codex session logs; signals are not confirmed adoptions.

When the user wants ongoing recording, explain or provide this small instruction for their chosen project or personal instructions. Write it only if the user requested that configuration change, and preserve existing instructions:

> When `record_skill_use` is available, report actual Skill adoptions near use: one item per adoption, including repeated adoptions, with a unique batch ID of at least 16 characters. Reuse the same ID and items when retrying the record. Exclude audit-only reads and historical backfill; send only Skill identifiers. If plugin call recording is also requested, call `record_plugin_calls` for actual plugin tool attempts using their real namespace, full tool name and unique call ID; do not record the recording tools themselves. Recording failures must not block the task.

Do not claim this instruction has been applied until its target was actually changed. Verification should follow a real, independently useful Skill adoption or tool attempt already authorized by the task, then reread status. Never invent activity just to make setup look healthy. For advanced notes, archives or historical queries, use the companion `skill-manager` Skill.
