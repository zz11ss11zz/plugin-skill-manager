import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const installed=path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'plugins/cache/created-by-me-remote/plugin-skill-manager/0.4.16/server/src/server.mjs');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(await readFile(installed)),hash(await readFile(process.argv[2])));
const client=new Client({name:'redundancy-acceptance',version:'1'});
const transport=new StdioClientTransport({command:process.execPath,args:[installed],stderr:'pipe'});
try{
  await client.connect(transport);assert.equal(client.getServerVersion().version,'0.4.16');assert.equal((await client.listTools()).tools.length,13);
  const r=await client.callTool({name:'check_plugin_status',arguments:{includeReport:true,days:30}});assert.ok(!r.isError);const report=r.structuredContent.redundancy;
  const calculator=report.inactivity.plugins.find(p=>p.name==='2+2 Calculator');assert.ok(calculator);assert.ok(calculator.firstSeen);assert.equal(calculator.state,'insufficient-history');
  assert.equal(report.scope.presenceAvailable,true);
  const result={version:'0.4.16',scope:report.scope,skillGroups:report.skills.length,pluginGroups:report.plugins.length,calculator,cutoff:report.inactivity.cutoff};
  await writeFile(process.argv[3],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await client.close();}
