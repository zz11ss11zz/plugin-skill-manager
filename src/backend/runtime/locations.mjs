// Every path that depends on where the code is installed is resolved here, and only here.
// Source layout: <repo>/src/backend/runtime/locations.mjs.
// The plugin bundler replaces this module with bundle-relative paths (scripts/build-plugin.mjs).
import { fileURLToPath } from 'node:url';

const root = new URL('../../../', import.meta.url);

export const locations = Object.freeze({
  mode: 'source',
  root: fileURLToPath(root),
  entry: fileURLToPath(new URL('src/server.mjs', root)),
  dashboardFile: fileURLToPath(new URL('dist/dashboard.html', root)),
  legacyDataDir: fileURLToPath(new URL('.local', root)),
  configDir: fileURLToPath(new URL('config/', root)),
  brandAsset: name => new URL(`assets/brand/${name}`, root),
});
