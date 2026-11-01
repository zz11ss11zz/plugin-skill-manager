# 原生演示录制脚本

本文件是脚本，不是录像。建议英文界面与英文字幕，中文操作提示供录制者参考。建议 6–9 分钟，这是项目建议，非官方时长要求。使用 Windows 上已有录屏工具；不需要为本任务安装录屏软件。

先完成 NATIVE-TEST.md 的隔离与安装核验。录下真实桌面应用窗口和侧栏，保留提示词、工具结果及关键确认过程。遮住私人账号、项目路径和其他窗口；不要录制登录或凭据。裁切和字幕可提高可读性，不拼接虚构通过状态。按实拍时间生成字幕，不预制含“通过”结论的字幕文件。

| 建议时间 | 操作与证据 | English narration (adapt to observed results) |
| --- | --- | --- |
| 00:00–00:35 | 展示宿主版本、候选版本/哈希和干净测试范围（H01） | “This is Plugin & Skill Manager version 0.3.1 running in [actual host and version]. This walkthrough uses an isolated test profile and a synthetic Skill.” |
| 00:35–01:10 | 展示 setup 新聊天流程，旧聊天流程可作附录（H02） | “Setup checks the recording status. The plugin relies on explicit reporting; it does not monitor every conversation automatically.” |
| 01:10–02:10 | P01/P02，原生侧栏、清单、来源与接入状态 | “Skill adoptions and plugin tool-call attempts are separate metrics. Missing records do not prove that an item was never used.” |
| 02:10–02:50 | P03/H03，明确时间区间，切换语言和统计说明 | “This query uses the displayed interval. The end boundary is exclusive. The observation details explain the limits of the available records.” |
| 02:50–03:40 | P04，合成 Skill 备注和保留标记 | “I am saving a local note for the synthetic user Skill. The Skill document itself should remain unchanged.” |
| 03:40–05:10 | P05a/b/c，预览取消、重新预览、明确执行及恢复 | “The preview shows the source and destination before a move. I explicitly request execution, then preview and execute restoration. Only the synthetic user Skill is involved.” |
| 05:10–06:30 | N01/N02/N03，各保留真实拒绝与实际工具响应 | “No records are not a reason to archive everything. System and plugin-owned Skills are protected. Historical tool calls must not be fabricated.” |
| 06:30–07:30 | H04，重启前后备注一致；展示 English/中文 | “After restarting the host, I check that the local note and retained records are still available.” |
| 附录 | H02 旧聊天、H05 卸载重装、窄面板及失败重试 | 给出对应测试 ID 和真实结果，不以剪辑隐藏未通过项。 |

## 录制后

1. 输出 MP4 或宿主支持的可播放视频，文件名包含版本、宿主和录制日期。保留原片。
2. 播放核验画面/字幕可读、无个人信息、八个案例及关键确认可定位；填写真实时间码。
3. 在已获授权的托管位置提供审核人员可访问的链接；未指定托管位置前不外传录像。不要使用本机路径或只有自己能访问的链接作为 demo URL。
4. 将实际 URL 填入门户或 `review.demo_recording_url`；若改包，重新计算 SHA256，保留测试包与提交包差异。

当前无原生录像文件，也无 demo URL。已有浏览器预览只可标为补充材料，不能改名为原生演示。
