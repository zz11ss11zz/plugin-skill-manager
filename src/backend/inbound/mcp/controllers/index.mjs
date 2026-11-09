// Controllers: translate validated tool arguments into service calls and service results into MCP
// tool results (text for the model + structuredContent per contract). No business rules here.

const text = value => ({ type: 'text', text: value });
const failure = message => ({ isError: true, content: [text(message)] });
// File-system errors carry a code; their messages may contain local paths, so they are replaced.
const managementError = error => failure(error.code ? '文件操作失败，请检查路径权限及操作记录；未确认成功。' : error.message);

export function createControllers(services) {
  const { inventory, pluginStatus, usage, recording, notes, archive, health, activity } = services;
  return {
    inventory: {
      async open() {
        const result = await inventory.build();
        return { content: [text(`发现 ${result.skills.length} 个技能文件实例；${result.issues.length} 个扫描问题。安装和使用信号按各自核对时间展示。`)], structuredContent: result };
      },
      async checkPlugins({ includeReport = false, days } = {}) {
        try {
          const { inventory: result, status, fresh } = await pluginStatus.check({ includeReport, days });
          return { content: [text(fresh ? `已读取 ${status.plugins.length} 条插件安装记录；未匹配缓存不等于未安装。` : '插件安装状态核验失败；已返回本地候选比较，旧状态可能过期。')], structuredContent: result };
        } catch {
          return failure('无法读取插件安装清单。请检查 Codex CLI 是否支持 plugin/installed 及本地安装状态；保留现有清单，不推断安装状态。');
        }
      },
    },
    redundancy: {
      async generate({ days } = {}) {
        try {
          const { inventory: result, fresh } = await pluginStatus.check({ includeReport: true, days });
          const report = result.redundancy;
          const summary = `${report.skills.length} 组 Skill 候选（其中 ${report.skills.filter(g => g.directoryEqual).length} 组目录完全相同），${report.plugins.length} 组插件版本候选；候选不授权删除。`;
          return { content: [text(fresh ? summary : `插件安装状态核验失败，旧状态可能过期。${summary}`)], structuredContent: result };
        } catch {
          return failure('无法生成冗余报告。请检查本地技能目录权限与 Codex CLI；原有数据未修改。');
        }
      },
    },
    usage: {
      async import() {
        try {
          const result = await usage.importSignals();
          return { content: [text(`已索引 ${result.usage.coverage.indexedFiles} 个日志文件；剩余 ${result.usage.coverage.pendingBytes} 字节尚未处理。信号不等于成功执行次数。`)], structuredContent: result };
        } catch {
          return failure('导入失败，保留之前的索引。请检查日志权限、本地索引格式或是否已有导入占用；恢复方法见仓库本地验证文档。');
        }
      },
      async query(period) {
        try {
          const result = await usage.query(period);
          return { content: [text('已按期间查询统计；启用时自动采集插件宿主事件。')], structuredContent: result };
        } catch { return failure('查询失败。请检查时间范围，并先导入一次使用信号更新索引；原结果保留。'); }
      },
    },
    recording: {
      async configureCapture(args) {
        if (!recording.captureAvailable) return failure('当前服务没有自动采集控制器，请重载新版服务。');
        try {
          const configuration = await recording.configureCapture(args);
          return { content: [text(args.enabled ? '本机自动采集已启用，后续无需逐次手动上报。' : '本机自动采集已停用，已有记录保留；已开始的一轮可能完成。')], structuredContent: { mode: 'capture-configuration', ...configuration } };
        } catch (error) { return failure(error.message); }
      },
      async pluginCalls({ calls }) {
        try { await recording.recordPluginCalls(calls); return { content: [text('OK')] }; }
        catch (error) { return managementError(error); }
      },
      async skillUse(batch) {
        try { await recording.recordSkillUse(batch); return { content: [text('OK')] }; }
        catch (error) { return managementError(error); }
      },
    },
    notes: {
      async save(note) {
        try { return { content: [text('本地备注已保存；技能内容和启停状态不变。')], structuredContent: await notes.save(note) }; }
        catch (error) { return managementError(error); }
      },
    },
    archive: {
      async previewArchive({ skillId }) {
        try { const plan = await archive.previewArchive(skillId); return { content: [text(`${plan.title}：${plan.files} 个文件，${plan.bytes} 字节。${plan.impact}`)], structuredContent: { mode: 'management-plan', plan } }; }
        catch (error) { return managementError(error); }
      },
      async previewRestore({ archiveId }) {
        try { const plan = await archive.previewRestore(archiveId); return { content: [text(`${plan.title}：${plan.impact}`)], structuredContent: { mode: 'management-plan', plan } }; }
        catch (error) { return managementError(error); }
      },
      async execute({ token }) {
        try {
          const result = await archive.execute(token);
          return { content: [text(result.operation.status === 'archived' ? '已归档，可从归档记录恢复。' : '已恢复至原位置。')], structuredContent: result };
        } catch (error) { return managementError(error); }
      },
      async cancel({ token }) {
        archive.cancel(token);
        return { content: [text('预览已取消。')], structuredContent: { mode: 'management-cancelled' } };
      },
    },
    health: {
      async status() {
        const status = await health.diagnose();
        const counts = status.health.summary;
        return { content: [text(`环境检查完成：${counts.error} 项错误，${counts.warning} 项提醒，${counts.unknown} 项未确认。逐项建议见诊断数据。`)], structuredContent: { mode: 'recording-status', ...status } };
      },
    },
    activity: {
      async views({ requests }) {
        try { return { content: [text('OK')], structuredContent: { mode: 'activity-views', views: await activity.views(requests) } }; }
        catch { return failure('活动统计暂不可读取，不将失败当作零。'); }
      },
    },
  };
}
