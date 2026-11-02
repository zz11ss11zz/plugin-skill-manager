import path from 'node:path';
import {readdir,lstat,readFile,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';

const ignored = /^(?:\..*|node_modules|tests?|fixtures?|examples?|evals?|audits?|results?|dist|build|assets|scripts|__pycache__)$/i;
// Report-only discovery: never register, execute or independently archive bundled components.
export async function discoverComponents(parents) {
  const components=[], issues=[];let visited=0,bytes=0;
  for(const parent of parents) {
    const root=path.dirname(parent.path);
    async function walk(dir,depth) {
      if(depth>6||visited>=5000||components.length>=500||bytes>=8*1024*1024){issues.push({path:dir,reason:'component-scan-limit'});return;}
      let items;try{if((await lstat(dir)).isSymbolicLink())return;items=await readdir(dir,{withFileTypes:true});}catch{issues.push({path:dir,reason:'component-unreadable'});return;}
      for(const e of items.sort((a,b)=>a.name.localeCompare(b.name))) {
        if(++visited>5000||components.length>=500||bytes>=8*1024*1024)break;
        const target=path.join(dir,e.name);
        if(e.isSymbolicLink())continue;
        if(e.isDirectory()&&!ignored.test(e.name))await walk(target,depth+1);
        if(!e.isFile()||!['SKILL.md','WORKFLOW.md'].includes(e.name)||target===parent.path)continue;
        try {
          const info=await lstat(target);if(info.isSymbolicLink()||info.size>1024*1024||bytes+info.size>8*1024*1024)continue;
          const relative=path.relative(await realpath(root),await realpath(target));if(relative.startsWith('..')||path.isAbsolute(relative))continue;
          const raw=await readFile(target,'utf8');bytes+=Buffer.byteLength(raw);
          const front=raw.replace(/^\uFEFF/,'').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
          if(!front)continue;const meta=parse(front[1],{maxAliasCount:20});
          if(typeof meta?.name!=='string'||typeof meta.description!=='string')continue;
          components.push({...parent,id:createHash('sha256').update(path.resolve(target)).digest('hex'),name:meta.name,description:meta.description,path:target,
            fingerprint:createHash('sha256').update(raw).digest('hex'),parentSkillId:parent.id,parentSkillName:parent.name,parentSkillPath:parent.path,componentKind:e.name==='WORKFLOW.md'?'workflow':'skill',annotation:undefined});
        }catch{issues.push({path:target,reason:'component-unreadable'});}
      }
    }
    await walk(root,0);
  }
  return {components,issues,visited,bytes};
}
