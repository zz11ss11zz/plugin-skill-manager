import path from 'node:path';
import { definePlatform, home } from './common.mjs';
import { CAPABILITIES } from '../../ports/platform.mjs';

export const linux = (env = process.env) => definePlatform({
  id: 'linux',
  capabilities: [CAPABILITIES.toolEvents, CAPABILITIES.dashboard],
  configHome: () => (env.XDG_CONFIG_HOME && path.isAbsolute(env.XDG_CONFIG_HOME)) ? env.XDG_CONFIG_HOME : path.join(home(), '.config'),
});
