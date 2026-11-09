# Repository development instructions

2026-11-02 冗余判定原则：以 `skills/skill-manager/references/redundancy-principles.md` 为本插件的规则入口。文档署名、来源技能集合/仓库、实际安装父项与技能入口必须分开；同一已安装插件/父 Skill 内部组件默认不互列冗余，与外部安装项比较时展开能力。独立安装项不因作者或仓库相同而豁免。主题相近不等于功能重复或运行冲突，已明确分工的互补能力不得只凭宽泛任务标签列为冗余。

2026-10-30 非 OpenAI 官方渠道的知名度与推广工作，先读 docs/PROJECT_MEMORY.md 的四周规划及 docs/distribution/THIRD_PARTY_STATUS.md 的实际状态；后续从规划表下一未完成项接续。agentskill.sh 保持用户指定的暂停，发布与外联依相应授权执行，不把规划记成已执行。

v0.5.0 之后的开发以 docs/ROADMAP.md 为当前规划入口，完成情况写入 docs/VALIDATION.md。docs/PUBLIC_RELEASE_PLAN.md 和 docs/V0.1.0_PLAN.md 保留早期里程碑和发布记录。

2026-10-23 用户补充授权：由 Agent 完成测试，测试通过即接受，无需再要求用户亲自操作或重复确认。后续节点由 Agent 尽可能执行验收并记录方式、结果和边界；无法执行或失败的项目如实保留，不能用本授权把它们改记为通过。

除非用户提前声明例外，每次合并后确认来源分支全部纳入 main，再删除远程及对应本地来源分支，最终只保留 main；有未合并内容不得丢弃。保留版本标签。

保持本地数据边界。发布和分发规则在执行前重新核验；不得把 Skill 安装、MCP 注册、自建市场分发和官方公共目录上架混为一谈。

2026-10-23 正式发布覆盖：用户取消 alpha/beta，按 docs/V0.1.0_PLAN.md 直接发布 v0.1.0；选择 Apache-2.0。保留真实验证边界，不再要求预发布节点审批。
