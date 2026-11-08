// Selects the platform adapter for the running operating system.
import { win32 } from './win32.mjs';
import { darwin } from './darwin.mjs';
import { linux } from './linux.mjs';

const adapters = { win32, darwin, linux };

/** @returns {import('../../ports/platform.mjs').Platform} */
export function selectPlatform(id = process.platform, env = process.env) {
  // Unknown POSIX systems get the conservative Linux behavior (no archive capability).
  return (adapters[id] || linux)(env);
}
