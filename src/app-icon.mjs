import { readFileSync } from 'node:fs';

export const appIcon = {
  src: `data:image/png;base64,${readFileSync(new URL('./assets/orbit-color.png', import.meta.url)).toString('base64')}`,
  mimeType: 'image/png',
};

export const sidebarIcon = {
  src: `data:image/png;base64,${readFileSync(new URL('./assets/sidebar-wrench.png', import.meta.url)).toString('base64')}`,
  mimeType: 'image/png',
};
