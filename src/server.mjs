// Stable process entry point. Source installs register this path with the host and the plugin
// bundler uses it as its entry, so it stays in place while the implementation lives in ./backend.
import { runMain } from './backend/main.mjs';

await runMain(process.argv);
