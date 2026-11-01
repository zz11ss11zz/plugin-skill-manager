# 草稿上传清单

## 上传前

- 发布组织、项目、已验证的开发者身份：待实际选择，不预填组织 ID。
- 本地 stdio MCP allowlist：待 OpenAI 确认。普通创建按钮不证明本地 MCP 准入。
- 准入确认后，按 desktop-only 文档选择 Create plugin → Skills only → Upload ZIP，保留本地 MCP 配置。不是删掉 MCP 作为 skills-only 提交。
- 使用 `plugin-skill-manager-0.3.1-desktop-draft.zip`；作者为现有 NOTICE 中的 Zishen Wang，须与最终发布身份核对。

## 可填写内容

英文字段的机器可读副本：`listing-en.json`；不要把这个 JSON 当作插件 ZIP 上传。

| 字段 | 内容 |
| --- | --- |
| Name | Plugin & Skill Manager |
| Version | 0.3.1 |
| Developer | Zishen Wang（尚未核实门户验证身份） |
| Category | Productivity |
| Subtitle | Local skills and activity |
| Authentication | 插件本地服务无需账号或 API Key；宿主本身需正常登录。 |
| Release notes | Compact bilingual observation area and inventory action. Data and counting rules are unchanged. This upload candidate adds the required author metadata; native review remains pending. |
| Demo URL | 留空待真实录制并取得审核人员可访问的 URL，禁止占位网址。 |
| Review cases | `review-cases.json` 中五个正向、三个负向，须先实际运行。 |

中文目录说明草稿（是否及如何导入以门户为准）：

> 查看本机 Codex Skill 清单，分别查看主动报送的 Skill 采用记录和插件工具调用尝试。支持活动热力图、日期排序、来源核对、本地备注，以及 Windows 用户 Skill 的归档预览和恢复。记录依赖调用方主动报送，不会自动监控所有聊天；缺少记录不代表没有活动。需要 Node.js 20.18+ 和兼容的本地 Codex CLI。本项目为独立开源项目，原生桌面兼容性及官方审核仍待完成。

支持、隐私、条款和主页 URL 已在 listing-en.json 中。上传后核对图标、说明、setup 路径、stdio 命令、工具发现结果、全部案例及实际错误；记录 draft ID 和导入版本。草稿保存不等于已提交。

## 提交前仍需补齐

原生用例实际结果及证据、真实原生演示视频 URL、目标宿主范围、发布身份、组织准入，以及门户要求的政策声明。不得用单元测试、CLI 启动或浏览器视频代替原生验收。不要选择未经验证的平台或承诺完整自动监控。
