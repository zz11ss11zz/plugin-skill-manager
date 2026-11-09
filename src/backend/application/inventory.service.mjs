// Use case: assemble the inventory (Skill files + plugin evidence + usage ledgers + notes + archives).
// Holds the per-process snapshots that previously lived in the server closure.
import { CAPABILITIES } from '../ports/platform.mjs';

/**
 * @param {object} deps
 * @param {import('../ports/host.mjs').Host} deps.host
 * @param {import('../ports/platform.mjs').Platform} deps.platform
 * @param {() => Promise<object>} deps.queryPlugins
 * @param {object} deps.usageIndex
 * @param {object} deps.adoptions
 * @param {object} deps.pluginCalls
 * @param {object} deps.notes
 * @param {object} deps.archives
 * @param {object|null} deps.capture      tool-event capture controller (null when unavailable)
 * @param {string} deps.managerIcon
 */
export function createInventoryService({ host, platform, queryPlugins, usageIndex, adoptions, pluginCalls, notes, archives, capture, managerIcon }) {
  let pluginSnapshot = null, usageSnapshot = null, initialPluginRead, latestFull = null;
  let usagePeriod = { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };

  async function build({ includeActivity = true, resolvePlugins = true } = {}) {
    let inventory = await host.scanSkills();
    inventory.managerIcon = managerIcon;
    if (!pluginSnapshot && resolvePlugins) {
      initialPluginRead ||= queryPlugins().then(status => { pluginSnapshot = status; }).catch(() => {});
      await initialPluginRead;
    }
    if (includeActivity) {
      if (capture) {
        try {
          const coverage = await capture.refresh();
          if (coverage) inventory.capture = { ...coverage, intervalSeconds: capture.current.intervalSeconds };
        } catch { inventory.issues.push({ path: capture.collector.stateFile, reason: '自动采集失败，保留已有统计，请检查诊断状态' }); }
        try { inventory.captureStatus = await capture.info(); }
        catch { inventory.captureStatus = { enabled: null, lastError: '无法读取采集状态' }; }
      } else inventory.captureStatus = { enabled: false, coverage: null, lastError: null };
      // Restore persisted statistics after a service restart; never import chat logs on open.
      if (!usageSnapshot) {
        try { usageSnapshot = await usageIndex.query(inventory.skills, usagePeriod); }
        catch (error) {
          if (error.code !== 'ENOENT') inventory.issues.push({ path: usageIndex.options?.stateFile || '本地使用索引', reason: '已有使用统计无法读取；请检查索引，原文件未修改' });
        }
      }
      inventory.usage = usageSnapshot;
      try { inventory.pluginCalls = await pluginCalls.summary(usagePeriod); }
      catch { inventory.pluginCalls = null; inventory.issues.push({ path: pluginCalls.file, reason: '插件调用记录无法读取；未将失败当作零' }); }
      try { inventory.adoptions = await adoptions.summary(usagePeriod); inventory.adoptions.coverage.complete = false; }
      catch { inventory.adoptions = null; inventory.issues.push({ path: adoptions.file, reason: '采用记录无法读取；未将读取失败当作零使用' }); }
    } else { inventory.inventoryScope = 'management'; delete inventory.usage; }
    if (pluginSnapshot) inventory = host.applyPluginStatus(inventory, pluginSnapshot);
    inventory.managementSupported = platform.capabilities.has(CAPABILITIES.archive);
    try {
      const stored = await notes.read();
      inventory.notesAvailable = true;
      for (const skill of inventory.skills) {
        const entry = stored.entries[skill.id];
        if (entry) skill.annotation = { ...entry, contentChanged: entry.fingerprint !== skill.fingerprint };
      }
    } catch { inventory.notesAvailable = false; inventory.issues.push({ path: notes.file, reason: '本地备注无法读取，已保留原文件并禁用编辑' }); }
    try { inventory.archives = await archives.list(); }
    catch { inventory.archives = []; inventory.issues.push({ path: archives.archiveRoot, reason: '归档记录无法读取' }); }
    if (includeActivity) latestFull = inventory;
    return inventory;
  }

  return {
    build,
    /** The most recent full inventory, so dashboard views are computed from the data it displays. */
    latest: () => latestFull,
    /** Re-query installed plugins; failures propagate so callers decide how to degrade. */
    async refreshPluginStatus() { const status = await queryPlugins(); pluginSnapshot = status; return status; },
    get usagePeriod() { return usagePeriod; },
    setUsage(period, snapshot) { usagePeriod = period; usageSnapshot = snapshot; },
    setUsageSnapshot(snapshot) { usageSnapshot = snapshot; },
  };
}
