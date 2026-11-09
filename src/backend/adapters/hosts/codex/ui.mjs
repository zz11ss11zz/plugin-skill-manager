// Codex-specific MCP Apps metadata. Kept out of the router so other hosts can supply their own.
export const codexUi = Object.freeze({
  toolMeta: resourceUri => ({ ui: { resourceUri }, 'openai/ui': { entrypoints: [{ type: 'global' }] } }),
  appOnlyMeta: resourceUri => ({ ui: { resourceUri, visibility: ['app'] } }),
  resourceDomains: ['https://files.openai.com'],
});
