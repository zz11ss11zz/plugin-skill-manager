// Reads shipped configuration files. The plugin bundler replaces this module with an inlined copy
// of config/**/*.toml so a bundled server needs no files next to it (scripts/build-plugin.mjs).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { locations } from '../runtime/locations.mjs';

/** @returns {string|null} file text, or null when the optional file does not exist */
export function readShippedConfig(relativePath) {
  try { return readFileSync(path.join(locations.configDir, relativePath), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
