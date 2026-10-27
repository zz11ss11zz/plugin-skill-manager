import { AutoCapture } from '../src/auto-capture.mjs';
import { CaptureController } from '../src/capture-settings.mjs';
const collector = new AutoCapture();
if (process.argv.includes('--once')) console.log(JSON.stringify(await collector.refresh()));
else { new CaptureController(collector).start(); setInterval(() => {}, 60000); }
