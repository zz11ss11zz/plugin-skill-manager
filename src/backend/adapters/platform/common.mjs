// Shared building blocks for platform adapters.
import path from 'node:path';
import os from 'node:os';

/** @returns {import('../../ports/platform.mjs').Platform} */
export function definePlatform({ id, caseInsensitive = false, capabilities = [], trustedSystemLinks = [], spawnOptions = {}, configHome }) {
  const pathKey = value => {
    const resolved = path.resolve(value);
    return caseInsensitive ? resolved.toLowerCase() : resolved;
  };
  return Object.freeze({
    id,
    capabilities: new Set(capabilities),
    pathKey,
    pathsEqual: (a, b) => pathKey(a) === pathKey(b),
    userConfigDir: app => path.join(configHome(), app),
    trustedSystemLinks: Object.freeze([...trustedSystemLinks]),
    spawnOptions: Object.freeze({ ...spawnOptions }),
  });
}

export const home = () => os.homedir();
