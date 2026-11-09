// Use cases behind the MCP tools other than inventory assembly. Each service depends only on ports
// and other services; the controllers in inbound/mcp turn their results into tool responses.
import { redundancyReport } from './redundancy.service.mjs';
import { activityViews } from '../domain/activity/views.mjs';

export function createPluginStatusService({ inventory, host, adoptions, pluginCalls, presence, fileTree, config }) {
  return {
    /**
     * @param {{ includeReport?: boolean, days?: number }} [options]
     * @returns {Promise<{inventory: any, status: any, fresh: boolean}>}
     */
    async check({ includeReport = false, days } = {}) {
      let status = null, fresh = true;
      try { status = await inventory.refreshPluginStatus(); }
      catch (error) { if (!includeReport) throw error; fresh = false; }
      const result = await inventory.build({ includeActivity: false, resolvePlugins: false });
      if (includeReport) {
        result.redundancy = await generateReport(result, days);
        result.redundancy.pluginStatusFresh = fresh;
      }
      return { inventory: result, status, fresh };
    },
  };
  async function generateReport(result, days) {
    const period = { timeZone: 'UTC' }; // Last-known usage must not disappear outside the display window.
    const records = await Promise.allSettled([adoptions.summary(period), pluginCalls.summary(period)]);
    return redundancyReport(result, {
      days, presence, fileTree, discoverComponents: host.discoverComponents, isProtected: host.isProtected,
      settings: config.redundancy, overlap: { tasks: config.redundancy.overlap.tasks, limits: config.redundancy.overlap }, componentLimits: config.components,
      guidance: config.redundancy.guidance,
      adoptions: records[0].status === 'fulfilled' ? records[0].value : null, calls: records[1].status === 'fulfilled' ? records[1].value : null,
    });
  }
}

export function createUsageService({ inventory, usageIndex, adoptions, pluginCalls }) {
  return {
    async importSignals() {
      const result = await inventory.build();
      const snapshot = await usageIndex.refresh(result.skills, inventory.usagePeriod);
      inventory.setUsageSnapshot(snapshot);
      result.usage = snapshot;
      return result;
    },
    async query(period) {
      const result = await inventory.build();
      const adoptionSummary = await adoptions.summary(period);
      const callSummary = await pluginCalls.summary(period);
      let snapshot = null;
      try { snapshot = await usageIndex.query(result.skills, period); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      inventory.setUsage(period, snapshot);
      result.usage = snapshot;
      adoptionSummary.coverage.complete = false;
      result.adoptions = adoptionSummary;
      result.pluginCalls = callSummary;
      return result;
    },
  };
}

export function createRecordingService({ host, adoptions, pluginCalls, capture }) {
  return {
    recordPluginCalls: calls => pluginCalls.record(calls),
    recordSkillUse: batch => adoptions.record(batch, async () => (await host.scanSkills()).skills),
    get captureAvailable() { return Boolean(capture); },
    configureCapture: settings => capture.configure(settings),
  };
}

export function createNotesService({ host, notes, inventory }) {
  return {
    async save(note) {
      const current = (await host.scanSkills()).skills.find(s => s.id === note.id);
      if (!current || current.fingerprint !== note.fingerprint) throw new Error('技能内容已变化或不存在，请重新扫描后编辑');
      await notes.save(note);
      return inventory.build();
    },
  };
}

export function createArchiveService({ archives, inventory }) {
  return {
    previewArchive: skillId => archives.previewArchive(skillId),
    previewRestore: archiveId => archives.previewRestore(archiveId),
    async execute(token) {
      const operation = await archives.execute(token);
      const result = await inventory.build();
      result.operation = operation;
      return result;
    },
    cancel: token => archives.cancel(token),
  };
}

export function createHealthService({ diagnose }) {
  let pending = null;
  return {
    // Concurrent requests share one diagnosis run.
    diagnose() { pending ??= diagnose().finally(() => { pending = null; }); return pending; },
  };
}

export function createActivityService({ inventory }) {
  return {
    /** Business computation for the dashboard's activity panel; the frontend only renders the result. */
    async views(requests) {
      const result = inventory.latest() ?? await inventory.build();
      return activityViews(result, requests);
    },
  };
}
