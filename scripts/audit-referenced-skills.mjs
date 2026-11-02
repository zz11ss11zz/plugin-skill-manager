// Audit downloaded entrypoint text as inert data; never install or execute upstream code.
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {scanInventory} from '../src/inventory.mjs';
import {redundancyReport} from '../src/redundancy.mjs';
const source=JSON.parse(await readFile(process.argv[2],'utf8')),output=path.resolve(process.argv[3]);
const root=await mkdtemp(path.join(os.tmpdir(),'public-skill-audit-'));
try{
  for(const record of source.records){
    if(!/^skills\/[a-z0-9-]+\/(?:SKILL\.md|ars\/[a-z0-9-]+\/WORKFLOW\.md)$/.test(record.path))throw Error('Unexpected upstream source path');
    const file=path.join(root,record.path);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,record.content);
  }
  const inventory=await scanInventory({skills:path.join(root,'skills'),cache:path.join(root,'empty-cache')});
  const report=await redundancyReport(inventory);
  const relations=report.skills.flatMap(g=>g.relations.map(r=>({...r,items:r.ids.map(id=>{const m=g.members.find(s=>s.id===id);return m?{name:m.name,parent:m.parentSkillName}:null;})})));
  const result={checkedDate:source.checkedDate,trees:source.trees,mirrors:source.mirrors,
    entrypoints:source.records.map(({repo,path:sourcePath,ref,sha})=>({repo,path:sourcePath,ref,sha})),
    counts:{rootSkills:inventory.skills.length,components:report.scope.components,exactDocumentPairs:relations.filter(r=>r.type==='documents').length,overlapPairs:relations.filter(r=>r.type==='overlap').length},relations,
    limits:['Only downloaded entrypoints and workflow documents were instantiated for this comparison; generated fixture directories are not complete upstream runtime directories.','No upstream code executed or installed. Functional hints are retrieval clues, not equivalence or removal decisions.']};
  await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.counts));
}finally{await rm(root,{recursive:true,force:true});}
