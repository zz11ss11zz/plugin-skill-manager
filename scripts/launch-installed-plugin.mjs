// Stable local-MCP compatibility entry. Resolve the enabled account installation
// at each start; never select a version just because it is present in the cache.
import {spawn} from 'node:child_process';
import {readFile, realpath} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';

const pluginId='plugin-skill-manager@created-by-me-remote';
export async function queryInstallation({env=process.env,timeoutMs=8000}={}) {
  // Prevent this compatibility entry from starting recursively in the read-only
  // discovery subprocess. This override never edits the user's configuration.
  const child=spawn(env.CODEX_SKILL_MANAGER_CLI||'codex', ['-c','mcp_servers.plugin-skill-manager.enabled=false','app-server','--stdio'],
    {env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  return new Promise((resolve,reject)=>{
    let buffer='',received=0,done=false;
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);child.stdin.end();child.kill();error?reject(error):resolve(value);};
    const timer=setTimeout(()=>finish(new Error('Installed-plugin lookup timed out.')),timeoutMs);
    child.on('error',()=>finish(new Error('Codex CLI is unavailable.')));
    child.on('exit',()=>{if(!done)finish(new Error('Installed-plugin lookup closed early.'));});
    child.stdin.on('error',()=>finish(new Error('Installed-plugin lookup connection failed.')));
    child.stderr.resume();child.stdout.setEncoding('utf8');
    child.stdout.on('data',chunk=>{
      received+=Buffer.byteLength(chunk);if(received>8*1024*1024)return finish(new Error('Installed-plugin response is too large.'));
      buffer+=chunk;let end;
      while((end=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,end);buffer=buffer.slice(end+1);let message;
        try{message=JSON.parse(line);}catch{continue;}
        if(![1,2].includes(message.id))continue;
        if(message.error)return finish(new Error('Installed-plugin lookup failed.'));
        if(message.id===1){
          child.stdin.write(JSON.stringify({method:'initialized'})+'\n');
          child.stdin.write(JSON.stringify({id:2,method:'plugin/installed',params:{}})+'\n');
        }else return finish(null,message.result);
      }
    });
    child.stdin.write(JSON.stringify({id:1,method:'initialize',params:{clientInfo:{name:'manager-installed-launcher',version:'1'},capabilities:{experimentalApi:true}}})+'\n');
  });
}

export async function resolveInstalledRuntime({env=process.env,query=queryInstallation}={}) {
  const data=await query({env});
  if(!Array.isArray(data?.marketplaces)||data.marketplaceLoadErrors?.length)throw new Error('Installed-plugin evidence is incomplete.');
  const candidates=data.marketplaces.flatMap(m=>m.plugins||[]).filter(p=>p.id===pluginId&&p.installed===true);
  if(candidates.length!==1||candidates[0].enabled!==true)throw new Error('Plugin & Skill Manager must have one enabled account installation.');
  const version=candidates[0].localVersion??candidates[0].version;
  if(typeof version!=='string'||!/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(version))throw new Error('Installed plugin version is invalid.');
  const codexHome=env.CODEX_HOME||path.join(os.homedir(),'.codex');
  if(!path.isAbsolute(codexHome))throw new Error('CODEX_HOME must be absolute.');
  const cache=await realpath(path.join(codexHome,'plugins/cache/created-by-me-remote/plugin-skill-manager'));
  const root=await realpath(path.join(cache,version));
  if(path.relative(cache,root)!==version)throw new Error('Installed plugin path leaves its cache.');
  const manifest=JSON.parse(await readFile(path.join(root,'plugin.json'),'utf8'));
  if(manifest.name!=='plugin-skill-manager'||manifest.version!==version)throw new Error('Installed plugin manifest does not match the registry.');
  const entry=await realpath(path.join(root,'server/src/server.mjs'));
  const relative=path.relative(root,entry);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Installed server leaves its plugin directory.');
  return {entry,version};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const selected=await resolveInstalledRuntime();
    if(process.argv.includes('--resolve-only'))console.log(JSON.stringify(selected));
    else {
      // The packaged entry owns its normal main/diagnostic behavior and stdio.
      process.argv[1]=selected.entry;
      await import(pathToFileURL(selected.entry).href);
    }
  }catch{console.error('Plugin & Skill Manager could not resolve its enabled installed package. Check the account installation and Codex CLI; no older cache was selected.');process.exitCode=1;}
}
