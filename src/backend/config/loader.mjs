// Loads, merges and validates configuration synchronously (startup only). The result is frozen and injected into the container;
// no other module reads configuration files or PSM__* environment variables.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseToml } from '../vendor/toml.mjs';
import { configSchema } from './schema.mjs';
import { readShippedConfig } from './files.mjs';

export class ConfigError extends Error {
  constructor(message, layer) { super(layer ? `${message} (layer: ${layer})` : message); this.name = 'ConfigError'; this.layer = layer; }
}

const camel = key => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const isPlain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

function camelize(value) {
  if (Array.isArray(value)) return value.map(camelize);
  if (!isPlain(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [camel(k), camelize(v)]));
}

function merge(base, layer) {
  const out = { ...base };
  for (const [key, value] of Object.entries(layer)) out[key] = isPlain(value) && isPlain(base[key]) ? merge(base[key], value) : value;
  return out;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const v of Object.values(value)) deepFreeze(v); }
  return value;
}

function parseLayer(text, layer) {
  try { return camelize(parseToml(text)); }
  catch (error) { throw new ConfigError(`invalid TOML: ${error.message}`, layer); }
}

const setPath = (target, keys, value) => {
  let node = target;
  for (const key of keys.slice(0, -1)) node = node[key] ??= {};
  node[keys.at(-1)] = value;
};

// PSM__SECTION__KEY=value ; values are parsed as TOML scalars/arrays when possible ("30", "true", "[30, 60]").
function environmentLayer(env) {
  const layer = {};
  for (const [name, raw] of Object.entries(env)) {
    if (!name.startsWith('PSM__') || raw === undefined) continue;
    const keys = name.slice(5).split('__').filter(Boolean).map(k => camel(k.toLowerCase()));
    if (!keys.length) continue;
    let value = raw;
    try { value = parseToml(`v = ${raw}`).v; } catch { /* keep as plain string */ }
    setPath(layer, keys, value);
  }
  return layer;
}

// Environment variables used by earlier releases remain supported.
function legacyLayer(env) {
  const layer = {};
  if (env.CODEX_SKILL_MANAGER_CLI) setPath(layer, ['hostCli', 'command'], env.CODEX_SKILL_MANAGER_CLI);
  if (env.CODEX_SKILL_MANAGER_DATA_DIR) setPath(layer, ['paths', 'dataDir'], env.CODEX_SKILL_MANAGER_DATA_DIR);
  if (env.CODEX_SKILL_MANAGER_AUTO_CAPTURE !== undefined) setPath(layer, ['capture', 'enabled'], env.CODEX_SKILL_MANAGER_AUTO_CAPTURE === '1');
  if (env.CODEX_SKILL_MANAGER_CAPTURE_INTERVAL_SECONDS !== undefined) setPath(layer, ['capture', 'intervalSeconds'], Number(env.CODEX_SKILL_MANAGER_CAPTURE_INTERVAL_SECONDS));
  return layer;
}

/**
 * @param {object} [options]
 * @param {import('../ports/platform.mjs').Platform} [options.platform]
 * @param {Record<string,string|undefined>} [options.env]
 * @param {string} [options.host]          explicit host id; otherwise app.host or 'codex'
 * @param {string|null} [options.userFile] override the user configuration file path (null disables it)
 * @param {object} [options.overrides]     final layer (camelCase), e.g. from tests or CLI flags
 * @param {(rel: string) => string|null} [options.readShipped]
 * @returns {import('./schema.mjs').Config}
 */
export function loadConfig({ platform, env = process.env, host, userFile, overrides = {}, readShipped = readShippedConfig } = {}) {
  const required = rel => {
    const text = readShipped(rel);
    if (text === null) throw new ConfigError(`missing shipped configuration ${rel}`);
    return parseLayer(text, rel);
  };
  let merged = required('default.toml');
  const environment = environmentLayer(env), legacy = legacyLayer(env);
  const requestedHost = host || overrides.app?.host || environment.app?.host || merged.app.host;
  const hostId = requestedHost === 'auto' ? 'codex' : requestedHost;  // only Codex is implemented
  if (!/^[a-z0-9-]+$/.test(hostId)) throw new ConfigError(`invalid host id "${hostId}"`);
  merged = merge(merged, required(`hosts/${hostId}.toml`));
  const platformText = platform ? readShipped(`platforms/${platform.id}.toml`) : null;
  if (platformText !== null) merged = merge(merged, parseLayer(platformText, `platforms/${platform.id}.toml`));
  merged.redundancy.overlap.tasks = required('redundancy/task-vocabulary.toml').task || [];
  const guidance = required('redundancy/guidance.toml');
  merged.redundancy.guidance = { purposes: guidance.purpose || [], rules: guidance.rule || [] };

  const userPath = userFile === undefined ? (platform ? path.join(platform.userConfigDir('plugin-skill-manager'), 'config.toml') : null) : userFile;
  if (userPath) {
    try { merged = merge(merged, parseLayer(readFileSync(userPath, 'utf8'), userPath)); }
    catch (error) { if (error.code !== 'ENOENT') throw error instanceof ConfigError ? error : new ConfigError(error.message, userPath); }
  }
  merged = merge(merge(merge(merged, legacy), environment), overrides);
  merged.app.host = hostId;

  const result = configSchema.safeParse(merged);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ConfigError(`invalid configuration at ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  for (const task of result.data.redundancy.overlap.tasks) {
    try { new RegExp(task.pattern, 'i'); } catch (error) { throw new ConfigError(`invalid task pattern "${task.id}": ${error.message}`, 'redundancy/task-vocabulary.toml'); }
  }
  return deepFreeze(result.data);
}
