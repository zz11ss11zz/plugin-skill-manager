// Port: operating-system services. Application code depends on this shape, never on process.platform.
//
// Adding an operating system = one adapter in src/backend/adapters/platform/ that satisfies this
// typedef and passes test/contracts/platform.contract.test.mjs.

/**
 * @typedef {object} Platform
 * @property {'win32'|'darwin'|'linux'|string} id
 * @property {Set<string>} capabilities          Capability names from CAPABILITIES (e.g. 'archive').
 * @property {(a: string, b: string) => boolean} pathsEqual   Case-insensitive on Windows.
 * @property {(value: string) => string} pathKey  Normalized comparison key for a path.
 * @property {(app: string) => string} userConfigDir   Per-user configuration directory for an app.
 * @property {ReadonlyArray<string>} trustedSystemLinks
 *   Operating-system owned symbolic links that may appear as ancestors of data directories
 *   (e.g. /var -> /private/var on macOS). Every other linked ancestor is rejected.
 * @property {object} spawnOptions               Extra child_process options (e.g. windowsHide).
 */

export const CAPABILITIES = Object.freeze({
  archive: 'archive',            // move user Skill directories into a recoverable archive
  toolEvents: 'tool_events',     // read host tool-call events from local logs
  dashboard: 'dashboard',        // render the MCP Apps dashboard
});
