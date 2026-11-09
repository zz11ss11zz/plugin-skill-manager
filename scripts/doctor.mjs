import { runDoctor } from '../src/backend/adapters/diagnostics/environment.mjs';

// Runs without npm dependencies and before MCP startup/data migration.
process.exitCode = await runDoctor({ json: process.argv.includes('--json'), locale: process.argv.includes('--zh') ? 'zh' : 'en' });
