// Loads the shipped TOML configuration deterministically (no user file, no environment layers).
import { loadConfig } from '../../src/backend/config/loader.mjs';
import { selectPlatform } from '../../src/backend/adapters/platform/index.mjs';

let cached;
export function testConfig(overrides = {}) {
  if (!Object.keys(overrides).length) return cached ??= loadConfig({ platform: selectPlatform(), env: {}, userFile: null });
  return loadConfig({ platform: selectPlatform(), env: {}, userFile: null, overrides });
}
