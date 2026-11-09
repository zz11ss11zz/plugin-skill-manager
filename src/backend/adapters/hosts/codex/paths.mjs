// Codex directory layout, derived from configuration (config/hosts/codex.toml) and the environment.
import path from 'node:path';
import os from 'node:os';

const expand = (value, home) => value === '~' ? home : value.startsWith('~/') ? path.join(home, value.slice(2)) : value;

/** @param {import('../../../config/schema.mjs').Config} config */
export function codexLayout(config, env = process.env, userHome = os.homedir()) {
  const configured = config.host.homeEnv ? env[config.host.homeEnv] : '';
  const home = configured || expand(config.host.homeDefault, userHome);
  if (!path.isAbsolute(home)) throw new Error(`${config.host.homeEnv || 'Codex home'} 必须是绝对路径`);
  const dataDir = config.paths.dataDir || path.join(home, config.host.dataSubdir);
  if (!path.isAbsolute(dataDir)) throw new Error('数据目录必须是绝对路径');
  return {
    home,
    roots: { skills: path.join(home, 'skills'), agentSkills: path.join(userHome, '.agents', 'skills'), cache: path.join(home, 'plugins', 'cache') },
    sessionRoots: [path.join(home, 'sessions'), path.join(home, 'archived_sessions')],
    dataDir: path.normalize(dataDir),
    archiveRoot: path.join(home, config.host.archiveSubdir),
  };
}
