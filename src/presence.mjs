import {lstat,readFile,mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {dataFile} from './data-path.mjs';
import {acquireAdoptionLock} from './adoption-lock.mjs';

// Presence is an observation date, never an inferred installation date or continuous coverage.
export class Presence {
  constructor(file=dataFile('presence.json')){this.file=file;}
  async observe(keys,now=Date.now()) {
    const dir=path.dirname(this.file);await mkdir(dir,{recursive:true});
    if((await lstat(dir)).isSymbolicLink())throw Error('Presence directory is linked');
    const release=await acquireAdoptionLock(this.file+'.lock'),tmp=this.file+'.'+randomUUID()+'.tmp';
    try{
      let state={version:1,entries:{}};
      try{const stat=await lstat(this.file);if(stat.isSymbolicLink()||!stat.isFile()||stat.size>4*1024*1024)throw Error('Invalid presence file');state=JSON.parse(await readFile(this.file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
      if(state.version!==1||!state.entries||Array.isArray(state.entries)||typeof state.entries!=='object'||Object.values(state.entries).some(v=>typeof v!=='string'||!Number.isFinite(Date.parse(v))))throw Error('Invalid presence state');
      const result={};let changed=false;
      for(const key of [...new Set(keys)]){const id=createHash('sha256').update(key).digest('hex');if(!Object.hasOwn(state.entries,id)){state.entries[id]=new Date(now).toISOString();changed=true;}result[key]=state.entries[id];}
      if(changed){const json=JSON.stringify(state);if(Buffer.byteLength(json)>4*1024*1024)throw Error('Presence capacity exceeded');await writeFile(tmp,json,{flag:'wx',mode:0o600});await rename(tmp,this.file);}
      return result;
    }finally{await unlink(tmp).catch(()=>{});await release();}
  }
}
