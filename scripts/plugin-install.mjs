// Copied into the release distribution as install.mjs; built-in modules only.
import { readFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const marketplace = 'plugin-skill-manager';
export const pluginId = `plugin-skill-manager@${marketplace}`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const equalPath = (a, b) => process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);
export async function verifyDistribution(root) {
  const integrity = JSON.parse(await readFile(path.join(root, 'integrity.json'), 'utf8'));
  if (integrity.format !== 1 || !integrity.files || typeof integrity.files !== 'object') throw new Error('Invalid integrity manifest');
  const actualFiles = await manifestFiles(root);
  if (JSON.stringify(Object.keys(actualFiles).sort()) !== JSON.stringify(Object.keys(integrity.files).sort())) throw new Error('Distribution has missing or unexpected files');
  for (const [relative, expected] of Object.entries(integrity.files)) {
    const file = path.resolve(root, relative);
    if (!file.startsWith(path.resolve(root) + path.sep) || !/^[a-f0-9]{64}$/.test(expected)) throw new Error('Invalid integrity entry');
    if ((await lstat(file)).isSymbolicLink() || hash(await readFile(file)) !== expected) throw new Error(`Integrity mismatch: ${relative}`);
  }
  const catalog = JSON.parse(await readFile(path.join(root, '.agents/plugins/marketplace.json'), 'utf8'));
  if (catalog.name !== marketplace || catalog.plugins.length !== 1 || catalog.plugins[0].source.path !== './plugins/plugin-skill-manager') throw new Error('Unexpected release catalog');
  const manifest = JSON.parse(await readFile(path.join(root, 'plugins/plugin-skill-manager/plugin.json'), 'utf8'));
  if (manifest.name !== marketplace || manifest.version !== integrity.version) throw new Error('Release version mismatch');
  return integrity;
}

// Retry only this known Windows activation error, after proving no install succeeded.
export async function installWithRecovery(cli, { delay = ms => new Promise(resolve => setTimeout(resolve, ms)), report = () => {} } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await cli(['plugin', 'add', pluginId, '--json']); }
    catch (error) {
      const known = /failed to activate plugin cache entry/i.test(`${error.message} ${error.stderr || ''}`) && /os error 5/i.test(`${error.message} ${error.stderr || ''}`);
      if (!known || attempt === 3) throw error;
      const state = await cli(['plugin', 'list', '--json']);
      if (state.installed.some(p => p.pluginId === pluginId && p.installed)) throw new Error('Activation returned an error but an installation exists; run check before changing it.', { cause: error });
      report(`Cache activation was denied; no installation exists. Retrying ${attempt}/2.`);
      await delay(attempt * 750);
    }
  }
}

export async function manageDistribution({ root, action, replaceSource = false, cli, report = () => {} }) {
  if (!['install', 'check', 'uninstall'].includes(action)) throw new Error('Use: node install.mjs install|check|uninstall [--replace-source]');
  const release = await verifyDistribution(root);
  const catalogState = await cli(['plugin', 'marketplace', 'list', '--json']);
  const existing = catalogState.marketplaces.find(m => m.name === marketplace);
  const different = existing && !equalPath(existing.root, root);
  if (different && action !== 'check' && !(action === 'install' && replaceSource)) throw new Error('This catalog is registered at another path. Use that package to uninstall, or install --replace-source to move it.');
  if (action === 'install') {
    if (catalogState.marketplaces.some(m => m.name === 'codex-skill-manager')) throw new Error('Legacy codex-skill-manager marketplace exists. Uninstall using the old package first; preserve data and archives.');
    const servers = await cli(['mcp', 'list', '--json']);
    if (servers.some(s => [marketplace, 'codex-skill-manager'].includes(s.name))) throw new Error('Standalone MCP registration already exists. Inspect and remove the plugin-skill-manager or legacy codex-skill-manager registration before installing the plugin; data is retained.');
    if (different) {
      await cli(['plugin', 'marketplace', 'remove', marketplace, '--json']);
      try { await cli(['plugin', 'marketplace', 'add', root, '--json']); }
      catch (error) {
        try { await cli(['plugin', 'marketplace', 'add', existing.root, '--json']); }
        catch (rollback) { throw new Error(`Source replacement failed and old registration could not be restored: ${rollback.message}`, { cause: error }); }
        throw error;
      }
    } else if (!existing) await cli(['plugin', 'marketplace', 'add', root, '--json']);
    await installWithRecovery(cli, { report });
  } else if (action === 'uninstall') {
    const before = await cli(['plugin', 'list', '--json']);
    if (before.installed.some(p => p.pluginId === pluginId && p.installed)) await cli(['plugin', 'remove', pluginId, '--json']);
    if (existing) await cli(['plugin', 'marketplace', 'remove', marketplace]);
  }
  const after = await cli(['plugin', 'list', '--json']);
  const installed = after.installed.find(p => p.pluginId === pluginId && p.installed) || null;
  if (action === 'install' && (!installed || !installed.enabled || installed.version !== release.version)) throw new Error('Installed plugin is missing, disabled, or at a different version; run check.');
  if (action === 'uninstall' && installed) throw new Error('Uninstall could not be verified');
  return { action, version: release.version, source: root, registeredSource: action === 'install' ? root : action === 'uninstall' ? null : existing?.root || null, sourceMatches: action === 'install' || Boolean(existing && !different), installed, data: 'Preserved; this installer does not read or delete activity, notes or archives.' };
}

export async function manifestFiles(root, relative = '') {
  const output = {};
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Distribution must not contain symbolic links');
    if (entry.isDirectory()) Object.assign(output, await manifestFiles(root, name));
    else if (entry.isFile() && name !== 'integrity.json') output[name] = hash(await readFile(path.join(root, name)));
  }
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [major, minor] = process.versions.node.split('.').map(Number);
    if (major < 20 || (major === 20 && minor < 18)) throw new Error('Node.js 20.18 or later is required on PATH.');
    const root = path.dirname(fileURLToPath(import.meta.url));
    const run = promisify(execFile);
    const cli = async args => {
      const { stdout } = await run(process.env.CODEX_SKILL_MANAGER_CLI || 'codex', args, { windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
      return args.includes('--json') ? JSON.parse(stdout) : stdout.trim();
    };
    const version = await cli(['--version']);
    const result = await manageDistribution({ root, action: process.argv[2] || 'check', replaceSource: process.argv.includes('--replace-source'), cli, report: message => console.error(message) });
    console.log(JSON.stringify({ cli: version, ...result }, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
