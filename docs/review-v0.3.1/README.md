# v0.3.1 上传与原生验收准备

状态：材料已准备；未上传草稿、未完成原生宿主验收、未录制原生视频、未提交审核。

1. [上传字段与步骤](UPLOAD.md)：上传候选包与已发布 ZIP 的区别、准入条件和待填项。
2. [原生宿主测试](NATIVE-TEST.md)：干净安装、五正三负、语言、重启与 setup 的执行顺序。
3. [视频分镜与英文口播](VIDEO.md)：建议录制顺序、对应证据、中文操作提示。
4. `results-template.json`：实际结果填写模板；所有原生用例初始为 `not_run`。
5. `fixtures/chart-demo/SKILL.md`：仅用于隔离测试的 Skill，不应复制进个人生产配置。

可交付目录为工作区 `outputs/review-v0.3.1/`。其中 `plugin-skill-manager-0.3.1-desktop-draft.zip` 才是本次上传候选，ZIP 根目录含 plugin.json/mcp.json/server/skills/assets。不要将整个准备资料目录或安装分发 ZIP 上传为插件。

候选在已公开下载并核验的 v0.3.1 desktop-package 上只补 `author.name`。运行服务、UI、Skill 内容不变；独立哈希记录在交付目录，不覆盖 GitHub Release。对应打包脚本及回归断言已修正，但尚未提交 GitHub。

官方要求以 2026-10-26 检索为准：[本地 MCP 准入](https://developers.openai.com/plugins/deploy/desktop-only)、[提交与测试](https://developers.openai.com/plugins/deploy/submission)、[作者字段校验](https://developers.openai.com/plugins/deploy/submission-errors)。门户实际字段仍须现场核实。
