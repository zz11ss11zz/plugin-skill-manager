import { AutoCapture } from '../src/backend/adapters/hosts/codex/auto-capture.mjs';
import { CaptureController } from '../src/backend/adapters/storage/json-file/capture-settings.mjs';
const collector = new AutoCapture();
if (process.argv.includes('--once')) console.log(JSON.stringify(await collector.refresh()));
else { new CaptureController(collector).start(); setInterval(() => {}, 60000); }
