// Composition root: the only module that chooses concrete adapters. Everything else receives its
// dependencies. Overrides let tests, previews and demos substitute any adapter.
import { readFile } from 'node:fs/promises';
import { selectPlatform } from './adapters/platform/index.mjs';
import { createHost } from './adapters/hosts/index.mjs';
import { createJsonRepositories } from './adapters/storage/json-file/index.mjs';
import { CaptureController } from './adapters/storage/json-file/capture-settings.mjs';
import { ArchiveManager, treeSnapshot } from './adapters/skill-files/archive.mjs';
import { diagnoseEnvironment } from './adapters/diagnostics/environment.mjs';
import { loadConfig } from './config/loader.mjs';
import { CAPABILITIES } from './ports/platform.mjs';
import { discoverComponents } from './adapters/skill-files/components.mjs';
import { createProtection } from './domain/redundancy/protection.mjs';
import { redundancyReport } from './application/redundancy.service.mjs';
import { createInventoryService } from './application/inventory.service.mjs';
import { createPluginStatusService, createUsageService, createRecordingService, createNotesService, createArchiveService, createHealthService, createActivityService } from './application/catalog.services.mjs';

/**
 * @param {object} [options]
 * @param {object} [options.roots]               Skill roots override
 * @param {object} [options.config]              preloaded configuration
 * @param {object} [options.platform]
 * @param {Record<string,string|undefined>} [options.env]
 * @param {object} [options.overrides]           adapter overrides: queryPlugins, usageIndex, archiveManager,
 *   skillNotes, adoptions, pluginCalls, presence, captureController, diagnosticOptions, host
 */
export function createContainer({ roots, config, platform, env = process.env, overrides = {} } = {}) {
  platform ??= selectPlatform(process.platform, env);
  config ??= loadConfig({ platform, env });
  const host = overrides.host ?? createHost({ config, platform, env, roots });
  const capabilities = new Set([...host.capabilities, ...platform.capabilities].filter(capability => {
    const feature = { [CAPABILITIES.archive]: config.features.archive, [CAPABILITIES.toolEvents]: config.features.toolEvents, [CAPABILITIES.dashboard]: config.features.dashboard }[capability];
    return feature !== false;
  }));
  const repos = createJsonRepositories({ dataDir: host.dataDir, config, env });
  const adoptions = overrides.adoptions ?? repos.adoptions;
  const pluginCalls = overrides.pluginCalls ?? repos.pluginCalls;
  const notes = overrides.skillNotes ?? repos.notes;
  const presence = overrides.presence ?? repos.presence;
  const usageIndex = overrides.usageIndex ?? host.usageIndex;
  const archives = overrides.archiveManager ?? new ArchiveManager({ roots: host.roots, archiveRoot: host.archiveRoot, scan: host.scanSkills });
  const capture = overrides.captureController !== undefined ? overrides.captureController : null;
  const queryPlugins = overrides.queryPlugins ?? host.installedPlugins;
  const fileTree = { snapshot: (dir, includeEntries) => treeSnapshot(dir, includeEntries, { maxBytes: config.storage.limits.archive }), readFile: file => readFile(file) };
  return { config, platform, host, capabilities, repos, adoptions, pluginCalls, notes, presence, usageIndex, archives, capture, queryPlugins, fileTree,
    diagnosticOptions: overrides.diagnosticOptions ?? {} };
}

/** Builds the services for a container. `managerIcon` is the dashboard icon (inbound resource). */
export function createServices(c, { managerIcon }) {
  const inventory = createInventoryService({ host: c.host, platform: { capabilities: c.capabilities }, queryPlugins: c.queryPlugins, usageIndex: c.usageIndex,
    adoptions: c.adoptions, pluginCalls: c.pluginCalls, notes: c.notes, archives: c.archives, capture: c.capture, managerIcon });
  return {
    inventory,
    pluginStatus: createPluginStatusService({ inventory, host: c.host, adoptions: c.adoptions, pluginCalls: c.pluginCalls, presence: c.presence, fileTree: c.fileTree, config: c.config }),
    usage: createUsageService({ inventory, usageIndex: c.usageIndex, adoptions: c.adoptions, pluginCalls: c.pluginCalls }),
    recording: createRecordingService({ host: c.host, adoptions: c.adoptions, pluginCalls: c.pluginCalls, capture: c.capture }),
    notes: createNotesService({ host: c.host, notes: c.notes, inventory }),
    archive: createArchiveService({ archives: c.archives, inventory }),
    health: createHealthService({ diagnose: () => diagnoseEnvironment({ ...c.diagnosticOptions, roots: c.host.roots, stores: { adoptions: c.adoptions, pluginCalls: c.pluginCalls, skillNotes: c.notes, usageIndex: c.usageIndex }, captureController: c.capture }) }),
    activity: createActivityService({ inventory }),
  };
}

/** Tool-event capture for a production process (started by main.mjs). */
export function createCapture(c) {
  if (!c.capabilities.has(CAPABILITIES.toolEvents)) return null;
  return new CaptureController(c.host.createToolEventCapture(c.pluginCalls), c.repos.captureSettings);
}

/**
 * Redundancy report wired with the default adapters and shipped configuration — for scripts and
 * tests that start from an inventory object rather than a running server.
 */
export async function redundancyReportWithDefaults(inventory, options = {}) {
  const { config: given, snapshot, ...rest } = options;
  const platform = selectPlatform();
  const config = given ?? loadConfig({ platform });
  return redundancyReport(inventory, {
    fileTree: { snapshot: snapshot ?? ((dir, includeEntries) => treeSnapshot(dir, includeEntries, { maxBytes: config.storage.limits.archive })), readFile: file => readFile(file) },
    discoverComponents: (parents, limits = config.components) => discoverComponents(parents, limits),
    isProtected: createProtection(config.redundancy.protected),
    settings: config.redundancy, overlap: { tasks: config.redundancy.overlap.tasks, limits: config.redundancy.overlap }, componentLimits: config.components,
    ...rest,
  });
}
