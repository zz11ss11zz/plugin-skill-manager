import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, appendFile, rename, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AutoCapture, CallParser } from '../src/auto-capture.mjs';
import { PluginCalls } from '../src/plugin-calls.mjs';
const event = (id, tool = 'github.fetch_file') => ({ type:'event_msg',timestamp:'2026-10-27T12:00:01Z',payload:{type:'item_completed',started_at_ms:Date.parse('2026-10-27T12:00:00Z'),item:{type:'McpToolCall',id,server:'codex_apps',tool,status:'failed',arguments:{secret:'PRIVATE_ARGUMENT'},result:{text:'PRIVATE_RESULT'}}}});
test('only real host MCP events count, never prose, wrapper plans or tool outputs',()=>{
  const parser=new CallParser();
  assert.equal(parser.accept(event('real-host-call-0001'))[0].tool,'mcp__codex_apps__github_fetch_file');
  for(const record of [{type:'response_item',payload:{type:'message',text:JSON.stringify(event('fake'))}},{type:'response_item',payload:{type:'custom_tool_call',name:'exec',input:'await tools.mcp__codex_apps__github_fetch_file({})'}},{type:'response_item',payload:{type:'function_call_output',output:JSON.stringify(event('fake'))}}]) assert.deepEqual(parser.accept(record),[]);
  const self=event('record-self-call-01');self.payload.item.server='plugin-skill-manager';self.payload.item.tool='record_plugin_calls';assert.deepEqual(parser.accept(self),[]);
  const other=event('other-server-call-1');other.payload.item.server='filesystem';other.payload.item.tool='read_file';assert.equal(parser.accept(other)[0].tool,'mcp__filesystem__read_file');
});
test('cross-session collection survives partial lines, restart, archive moves and truncation without double counts or private payloads',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'auto-capture-'));
  try{
    const sessions=path.join(root,'sessions'),archive=path.join(root,'archive');await mkdir(sessions);await mkdir(archive);
    const file=path.join(sessions,'one.jsonl'),two=path.join(sessions,'two.jsonl');
    const first=JSON.stringify(event('real-host-call-0001'))+'\n',second=JSON.stringify(event('real-host-call-0002'))+'\n';
    await writeFile(file,first+second.slice(0,70));await writeFile(two,first);
    const calls=new PluginCalls(path.join(root,'calls.json')),stateFile=path.join(root,'cursor.json');
    const options={roots:[sessions,archive],calls,stateFile};let collector=new AutoCapture(options);
    await collector.refresh();assert.equal((await calls.summary()).total,1);
    await appendFile(file,second.slice(70));collector=new AutoCapture(options);await collector.refresh();assert.equal((await calls.summary()).total,2);
    await rename(file,path.join(archive,'one.jsonl'));await collector.refresh();assert.equal((await calls.summary()).total,2);
    await writeFile(two,JSON.stringify(event('real-host-call-0003'))+'\n');await collector.refresh();assert.equal((await calls.summary()).total,3);
    assert.equal((await calls.summary({from:'2026-10-27T12:00:00Z',to:'2026-10-27T12:00:01Z'})).total,3);
    assert.doesNotMatch(await readFile(stateFile,'utf8'),/PRIVATE_ARGUMENT|PRIVATE_RESULT|github/);
    assert.doesNotMatch(await readFile(calls.file,'utf8'),/PRIVATE_ARGUMENT|PRIVATE_RESULT/);
    await writeFile(stateFile,'broken');await assert.rejects(collector.refresh());assert.equal(await readFile(stateFile,'utf8'),'broken');
  }finally{await rm(root,{recursive:true,force:true});}
});
test('ledger failure retains cursor and retry is safe; malformed input reports coverage',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'auto-retry-'));
  try{
    const file=path.join(root,'log.jsonl');await writeFile(file,'bad json\n'+JSON.stringify(event('real-host-call-0001'))+'\n');
    const calls=new PluginCalls(path.join(root,'calls.json')),stateFile=path.join(root,'cursor.json');
    const collector=new AutoCapture({roots:[root],calls,stateFile});
    await writeFile(calls.file,'corrupt');const failed=await collector.refresh();assert.equal(failed.issues.length,1);assert.equal(failed.pendingBytes>0,true);
    await writeFile(calls.file,JSON.stringify({version:1,calls:[]}));const done=await collector.refresh();assert.equal(done.malformedLines,1);assert.equal((await calls.summary()).total,1);
    await Promise.all([collector.refresh(),collector.refresh()]);assert.equal((await calls.summary()).total,1);
  }finally{await rm(root,{recursive:true,force:true});}
});
