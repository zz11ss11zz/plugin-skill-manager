// Process entry for the backend: CLI flags → configuration → data preparation → MCP over stdio.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createContainer, createCapture } from './container.mjs';
import { createServer } from './inbound/mcp/server.mjs';
import { runDoctor } from './adapters/diagnostics/environment.mjs';
import { initializeData } from './adapters/storage/json-file/migration.mjs';

export async function runMain(argv = process.argv) {
  // The doctor must work before configuration, dependencies or data are available.
  if (argv.includes('--diagnose')) {
    process.exitCode = await runDoctor({ json: argv.includes('--json'), locale: argv.includes('--zh') ? 'zh' : 'en' });
    return;
  }
  const container = createContainer();
  const data = await initializeData({ target: container.host.dataDir, trustedLinks: container.platform.trustedSystemLinks });
  if (argv.includes('--initialize-data')) { console.log(JSON.stringify(data, null, 2)); return; }
  container.capture = createCapture(container);
  const stop = container.capture?.start() ?? (() => {});
  const server = createServer(undefined, { container });
  server.server.onclose = stop;
  await server.connect(new StdioServerTransport());
}
