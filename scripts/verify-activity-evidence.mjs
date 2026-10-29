// Local-only deployment verification. Does not send records to external services.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { AutoCapture } from '../src/auto-capture.mjs';
import { CaptureSettings } from '../src/capture-settings.mjs';
import { PluginCalls } from '../src/plugin-calls.mjs';
const root=path.resolve(process.argv[2]);
const manifest=JSON.parse(await readFile(path.join(root,'integrity.json'),'utf8'));
for(const [file,hash] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(await readFile(path.join(root,file))).digest('hex'),hash,file);
let coverage=null,passes=0;
if(process.argv.includes('--catch-up')) {
 assert.equal((await new CaptureSettings().read()).enabled,true,'Enable collection explicitly before catch-up');
 const collector=new AutoCapture(), started=Date.now();
 do { coverage=await collector.refresh(); passes++; if(coverage.issues.length) break; }
 while(coverage.pendingBytes>0 && Date.now()-started<45000);
}
const client=new Client({name:'activity-evidence-verification',version:'1'});
const transport=new StdioClientTransport({command:process.execPath,args:[path.join(root,'plugins/plugin-skill-manager/server/src/server.mjs')],stderr:'pipe'});
try {
 await client.connect(transport); assert.equal(client.getServerVersion().version,'0.4.3');
 const entry=(await client.listTools()).tools.find(t=>t.name==='open_skill_manager');
 const uri=entry._meta.ui.resourceUri, html=(await client.readResource({uri})).contents[0].text;
 assert.match(html,/v0\.4\.1/); assert.match(html,/source-tabs/);
 const result=await client.callTool({name:'query_usage',arguments:{timeZone:'Asia/Shanghai'}});
 assert.ok(!result.isError);
 const data=result.structuredContent;
 assert.equal(data.pluginCalls.total,data.pluginCalls.sources['host-event'].total);
 assert.equal(data.pluginCalls.coverage.complete,false);
 const saved=(await new PluginCalls().read()).calls;
 const beforePath=process.argv.find(a=>a.startsWith('--before='))?.slice(9);
 let historicalReportsPreserved=null;
 if(beforePath) {
   const before=JSON.parse(await readFile(beforePath,'utf8')).calls;
   const byId=new Map(saved.map(c=>[c.id,c]));
   for(const call of before) assert.deepEqual(byId.get(call.id),call,'Historical report changed');
   historicalReportsPreserved=before.length;
 }
 console.log(JSON.stringify({integrity:'passed',version:client.getServerVersion().version,uri,hostEvents:data.pluginCalls.total,assistantReports:data.pluginCalls.sources['assistant-report'].total,skillAdoptions:data.adoptions.total,sourceSeparation:'passed',historicalReportsPreserved,passes,capture:data.captureStatus,officialReconciliation:'not verified',nativeSidebar:'reload required; not visually verified'},null,2));
} finally {await client.close();await transport.close();}
