import path from 'node:path';
import { definePlatform, home } from './common.mjs';
import { CAPABILITIES } from '../../ports/platform.mjs';

// Archive moves were verified on Windows only; other platforms enable them after acceptance.
export const win32 = (env = process.env) => definePlatform({
  id: 'win32',
  caseInsensitive: true,
  capabilities: [CAPABILITIES.archive, CAPABILITIES.toolEvents, CAPABILITIES.dashboard],
  spawnOptions: { windowsHide: true },
  configHome: () => env.APPDATA || path.join(home(), 'AppData', 'Roaming'),
});
