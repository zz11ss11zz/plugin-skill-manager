// Codex host adapter: implements the Host port (src/backend/ports/host.mjs).
import path from 'node:path';
import { codexLayout } from './paths.mjs';
import { codexUi } from './ui.mjs';
import { scanInventory } from './skill-source.mjs';
import { loadPluginStatus, applyPluginStatus } from './plugin-registry.mjs';
import { UsageIndex } from './usage-index.mjs';
import { AutoCapture } from './auto-capture.mjs';
import { discoverComponents } from '../../skill-files/components.mjs';
import { createProtection } from '../../../domain/redundancy/protection.mjs';
import { CAPABILITIES } from '../../../ports/platform.mjs';

/**
 * @param {object} options
 * @param {import('../../../config/schema.mjs').Config} options.config
 * @param {import('../../../ports/platform.mjs').Platform} options.platform
 * @param {Record<string,string|undefined>} [options.env]
 * @param {object} [options.roots]   override Skill roots (tests, previews)
 * @returns {import('../../../ports/host.mjs').Host}
 */
export function createCodexHost({ config, platform, env = process.env, roots }) {
  const layout = codexLayout(config, env);
  const skillRoots = roots ?? layout.roots;
  const cli = { cli: config.hostCli.command || 'codex', env, timeoutMs: config.hostCli.timeoutMs, maxOutputBytes: config.hostCli.maxOutputBytes, spawnOptions: platform.spawnOptions };
  return {
    id: 'codex',
    capabilities: new Set([CAPABILITIES.toolEvents, CAPABILITIES.dashboard]),
    roots: skillRoots,
    dataDir: layout.dataDir,
    archiveRoot: layout.archiveRoot,
    scanSkills: () => scanInventory(skillRoots),
    discoverComponents: (parents, limits = config.components) => discoverComponents(parents, limits),
    installedPlugins: () => loadPluginStatus(cli),
    applyPluginStatus,
    isProtected: createProtection(config.redundancy.protected),
    ui: codexUi,
    usageIndex: new UsageIndex({ roots: layout.sessionRoots, stateFile: path.join(layout.dataDir, 'usage-index.json') }),
    createToolEventCapture: calls => new AutoCapture({ roots: layout.sessionRoots, stateFile: path.join(layout.dataDir, 'auto-capture.json'), calls }),
  };
}
