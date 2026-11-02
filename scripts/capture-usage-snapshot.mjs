// Render an explicitly supplied, sanitized activity snapshot; never read live ledgers.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
const input = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
const snapshot = JSON.parse(await readFile(input, 'utf8'));
const data = snapshot.structuredContent;
assert.equal(data.mode, 'inventory');
assert.equal(data.skills.length, 0, 'Capture input must exclude private inventory');
assert.equal(data.pluginCalls.source, 'host-event');
const serialized = JSON.stringify(snapshot);
assert.ok(!/[A-Z]:\\|\/Users\/|threadId|sessionId|password|token/i.test(serialized), 'Private fields in snapshot');
const expected = data.pluginCalls.activity.days.reduce((sum,d) => sum+d.entries.reduce((s,e)=>s+e.calls,0),0);
assert.equal(expected, data.pluginCalls.total);
const bridge = await build({entryPoints:[fileURLToPath(new URL('./preview-host.mjs',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser'});
const dashboard = await readFile(new URL('../dist/dashboard.html',import.meta.url));
const host = `<!doctype html><html lang="en-US"><meta charset="utf-8"><title>Recorded usage snapshot</title><style>body{margin:0;background:#edf1f4;font:13px system-ui;color:#40515b}header{padding:16px 22px;display:flex;justify-content:space-between;gap:12px}iframe{display:block;border:0;background:white;width:100%;height:1250px}button{display:none}</style><header><strong>REAL USAGE · ${data.scannedAt.slice(0,10)} · Asia/Shanghai</strong><span>Local browser capture · recorded events only</span><span id="host-status"></span><button id="narrow"></button><button id="wide"></button></header><iframe id="app" title="Plugin & Skill Manager"></iframe><script type="module" src="/bridge.js"></script></html>`;
const server=createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(host);}
 else if(req.url==='/dashboard'){res.setHeader('Content-Type','text/html');res.end(dashboard);}
 else if(req.url==='/bridge.js'){res.setHeader('Content-Type','text/javascript');res.end(bridge.outputFiles[0].text);}
 else if(req.url==='/tool'&&req.method==='POST'){res.setHeader('Content-Type','application/json');res.end(serialized);}
 else {res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
const errors=[];
try {
 await mkdir(output,{recursive:true});
 const page=await browser.newPage({viewport:{width:1100,height:1300},locale:'en-US',timezoneId:'Asia/Shanghai',colorScheme:'light',deviceScaleFactor:2});
 // Reproduce the snapshot date instead of advancing the chart on later reruns.
 await page.clock.setFixedTime(new Date(data.scannedAt));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 const frame=page.frameLocator('#app');
 await frame.locator('.activity-bar').last().waitFor();
 await page.mouse.move(1,1);
 const visible=await frame.locator('body').innerText();
 assert.ok(!/[\u3400-\u9fff]/.test(visible),'Untranslated visible text');
 assert.equal(Number(await frame.locator('.activity-metrics strong').first().innerText()),expected);
 const bars=await frame.locator('.activity-bar').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));
 const height=await frame.locator('body').evaluate(e=>e.scrollHeight);
 await page.locator('#app').evaluate((e,h)=>e.style.height=`${h+8}px`,height);
 // Crop before rankings: the exported snapshot intentionally omits inventory,
 // so low-use/installed counts below this point are outside the capture scope.
 const boundary=await frame.locator('.entity-panel').boundingBox();
 await page.screenshot({path:path.join(output,'activity-en.png'),clip:{x:0,y:0,width:1100,height:Math.floor(boundary.y)},animations:'disabled'});
 await page.setViewportSize({width:390,height:1100});
 const overflow=await frame.locator('body').evaluate(e=>e.scrollWidth>innerWidth);
 assert.equal(overflow,false,'Narrow view overflows');
 await page.screenshot({path:path.join(output,'narrow-en.png'),fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);
 const evidence={capturedAt:data.scannedAt,version:JSON.parse(await readFile(new URL('../package.json',import.meta.url))).version,timeZone:'Asia/Shanghai',source:'host-event',total:expected,recordedDays:data.pluginCalls.activity.days.length,recordedPlugins:data.pluginCalls.catalog.length,coverage:data.pluginCalls.coverage,browserErrors:errors,narrowOverflow:overflow,bars,scope:'Actual application rendered from sanitized real aggregate records; not native Codex. Inventory and private evidence omitted from capture input.'};
 await writeFile(path.join(output,'capture.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({total:expected,days:evidence.recordedDays,plugins:evidence.recordedPlugins,height,errors}));
} finally {await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
