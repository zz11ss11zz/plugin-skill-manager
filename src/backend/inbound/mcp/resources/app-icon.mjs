import { locations } from '../../../runtime/locations.mjs';
import { readFileSync } from 'node:fs';

export const appIcon = {
  src: `data:image/png;base64,${readFileSync(locations.brandAsset('orbit-color.png')).toString('base64')}`,
  mimeType: 'image/png',
};

export const sidebarIcon = {
  src: `data:image/png;base64,${readFileSync(locations.brandAsset('sidebar-wrench.png')).toString('base64')}`,
  mimeType: 'image/png',
};
