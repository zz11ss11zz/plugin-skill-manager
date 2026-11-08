// Host registry: maps a configured host id to its adapter factory.
import { createCodexHost } from './codex/index.mjs';

const hosts = {
  codex: createCodexHost,
  // claude: createClaudeHost — not implemented; requires verified directory layout and log format.
};

export function createHost(options) {
  const factory = hosts[options.config.app.host];
  if (!factory) throw new Error(`Host "${options.config.app.host}" is not implemented. Available: ${Object.keys(hosts).join(', ')}`);
  return factory(options);
}
