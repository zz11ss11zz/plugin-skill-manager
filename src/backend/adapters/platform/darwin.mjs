import path from 'node:path';
import { definePlatform, home } from './common.mjs';
import { CAPABILITIES } from '../../ports/platform.mjs';

export const darwin = () => definePlatform({
  id: 'darwin',
  capabilities: [CAPABILITIES.toolEvents, CAPABILITIES.dashboard],
  // macOS ships these as links into /private; they are not user-created redirections.
  trustedSystemLinks: ['/var', '/tmp', '/etc'],
  configHome: () => path.join(home(), 'Library', 'Application Support'),
});
