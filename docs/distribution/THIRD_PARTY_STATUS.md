# Third-party distribution status / 第三方分发状态

Checked: 2026-10-30. Product: v0.4.6. This document tracks actual distribution evidence, not promised listings. Documentation updates do not replace the published v0.4.6 archives.

| Channel | Observed status | Next step |
| --- | --- | --- |
| Public GitHub source | Bilingual listing kit, dependency-aware guide and validation record prepared for publication with this change | Read the files on main after merge |
| skills.sh | Official FAQ says entries appear through real user CLI installations. No separate manual submission flow was found. Repository discovery passed; directory listing/ranking not confirmed | Share the documented install route with actual users; verify the resulting public entry before claiming inclusion |
| agentskill.sh | Submit page previously showed repository/SKILL.md import. Current fetch timed out. Browser automation stopped because it could not confidently determine the current URL | Resume through a functioning browser and verify the import result; no form was submitted |
| SkillsMP | Current active submission route not confirmed | Secondary channel; verify before submission |

## Installation evidence

- Local-source installation using Node 22.20.0 / skills 1.7.4 passed in an isolated project. Both installed Skill files match source hashes.
- Public GitHub discovery succeeded and listed exactly `setup` and `skill-manager`.
- Actual remote installation failed once at a 45-second clone limit. A second attempt with a 300-second limit failed with `Recv failure: Connection was reset`, CLI exit 1. A longer timeout alone did not resolve this environment's connection issue.
- Use the complete v0.4.6 release for the full product, or the verified local-source route for companion instructions. Skill installation does not install MCP, confer other-host compatibility, or enable automatic recording.
- Test installations set `DISABLE_TELEMETRY=1`; they are not evidence of adoption or leaderboard placement.

## 中文进展

材料、依赖说明和可复现安装方式已整理；GitHub 发现与本地源码安装分别验证通过。远程实际安装仍受连接重置影响。agentskill.sh 本次没有成功提交，skills.sh 没有确认出现公开条目。不要将公开源码、可安装、平台收录和榜单排名合并成同一个完成状态。

下一步是恢复网页提交能力，向 agentskill.sh 导入公开仓库并核对结果；skills.sh 则通过真实用户安装积累自然收录。主 Skill 链接和中英文文案见 [listing kit](THIRD_PARTY_LISTING.md)。

Sources: [skills.sh FAQ](https://www.skills.sh/docs/faq), [CLI and telemetry](https://www.skills.sh/docs/cli), [agentskill.sh submit](https://agentskill.sh/submit). The last link was verified in the earlier preparation pass; the current fetch timed out.
