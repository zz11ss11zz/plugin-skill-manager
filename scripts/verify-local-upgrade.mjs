import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.argv[2];
const manifest = JSON.parse(await readFile(path.join(root, 'integrity.json')));
for (const [file, hash] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(await readFile(path.join(root,file))).digest('hex'),hash,file);
const client = new Client({name:'local-upgrade-verification',version:'1'});
const transport = new StdioClientTransport({command:process.execPath,args:[path.join(root,'plugins/plugin-skill-manager/server/src/server.mjs')],stderr:'pipe'});
try {
 await client.connect(transport);
 assert.equal(client.getServerVersion().version,manifest.version);
 const entry = (await client.listTools()).tools.find(t=>t.name==='open_skill_manager');
 const uri = entry._meta.ui.resourceUri;
 const resource = await client.readResource({uri});
 assert.ok(resource.contents[0].text.includes(`v${manifest.version}`));
 const status = await client.callTool({name:'check_recording_status',arguments:{}});
 console.log(JSON.stringify({integrity:'passed',version:client.getServerVersion().version,uri,pageVersion:manifest.version,recordingStatus:status.structuredContent},null,2));
} finally { await client.close(); await transport.close(); }

