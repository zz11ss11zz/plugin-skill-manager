// Synthetic browser acceptance; never operates on installed user Skills.
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, writeFile, rm, stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {scanInventory} from '../src/backend/adapters/hosts/codex/skill-source.mjs';
import { redundancyReportWithDefaults as redundancyReport } from '../src/backend/container.mjs';
import { createGuidance } from '../src/backend/domain/redundancy/guidance.mjs';
import { testConfig } from '../test/helpers/config.mjs';

const chrome=process.env.CHROME_PATH;
if(!chrome)throw new Error('Set CHROME_PATH to Chromium');
const output=path.resolve(process.argv[2]||'work/redundancy-ui');await mkdir(output,{recursive:true});
const fixture=await mkdtemp(path.join(os.tmpdir(),'redundancy-browser-'));
try{
  const roots={skills:path.join(fixture,'skills'),cache:path.join(fixture,'cache')};
  for(const [name,script]of [['research-primary','export v2'],['research-copy','export v1']]){
    const dir=path.join(roots.skills,name);await mkdir(path.join(dir,'scripts'),{recursive:true});
    await writeFile(path.join(dir,'SKILL.md'),'---\nname: research-notes\ndescription: Organize research references and local evidence.\n---\nSee [guide](references/guide.md).\nUse mcp__sample__read for evidence.');
    await writeFile(path.join(dir,'scripts/export.mjs'),script);
  }
  const inventory=await scanInventory(roots);inventory.inventoryScope='management';inventory.notesAvailable=true;inventory.managementSupported=true;
  inventory.pluginRegistry={checkedAt:'2026-10-30T12:00:00Z',plugins:[{id:'research-tools@team',version:'2.0',enabled:true},{id:'research-tools@personal',version:'1.0',enabled:false}]};
  inventory.redundancy=await redundancyReport(inventory,{now:Date.parse('2026-10-30T12:00:00Z')});
  const idleInventory={...inventory,redundancy:await redundancyReport(inventory,{now:Date.parse('2026-10-30T12:00:00Z'),adoptions:{activity:{days:[]}},calls:{catalog:[],activity:{days:[]}},presence:{observe:async keys=>Object.fromEntries(keys.map(k=>[k,'2026-08-01T00:00:00Z']))}})};
  const sample=inventory.redundancy.skills[0];
  const drawing={...sample,id:'drawing-demo',types:['overlap'],directoryEqual:false,members:['scientific-visualization','matplotlib','plotting-demo'].map((name,i)=>({...sample.members[0],id:'drawing-'+i,name,path:`C:/Synthetic/Skills/${name}/SKILL.md`,declaredAuthor:'Example maintainer',description:'Scientific figure implementation and visual review.'})),totalMembers:3,relations:[{type:'overlap',ids:['drawing-0','drawing-1','drawing-2'],sharedTerms:['scientific-figures']}],retained:[]};
  // The backend attaches guidance from the shipped configuration; the hand-built group gets the same.
  const config=testConfig(),advise=createGuidance(config.redundancy.overlap.tasks,config.redundancy.guidance);
  drawing.members=drawing.members.map(m=>({...m,purpose:advise.purpose(m)}));drawing.guidance=advise.forGroup(drawing);
  const drawingInventory={...inventory,redundancy:{...inventory.redundancy,skills:[drawing]}};
  // Replace temporary fixture paths only in the display evidence.
  for(const g of inventory.redundancy.skills)for(const m of g.members)m.path=`C:/Synthetic/Skills/${path.basename(path.dirname(m.path))}/SKILL.md`;
  const template=await readFile(new URL('../src/frontend/index.html',import.meta.url),'utf8');
  const modulePath=fileURLToPath(new URL('../src/frontend/views/management.view.mjs',import.meta.url));
  const modelPath=fileURLToPath(new URL('../src/frontend/viewmodels/management.vm.mjs',import.meta.url));
  const results=[];
  for(const [locale,width,dark,kind]of [['zh',1100,false,'skills'],['en',1100,true,'skills'],['zh',380,false,'skills'],['en',1100,false,'plugins'],['zh',380,false,'idle-plugins'],['en',1100,false,'idle-plugins'],['zh',1100,false,'drawing'],['zh',380,false,'drawing'],['en',1100,true,'drawing']]){
    const name=`${locale}-${width}-${dark?'dark':'light'}-${kind}`;
    const source=`import {createManagementPanel} from ${JSON.stringify(modulePath)};
      import {createManagementViewModel} from ${JSON.stringify(modelPath)};
      const inventory=${JSON.stringify(kind==='idle-plugins'?idleInventory:kind==='drawing'?drawingInventory:inventory)};
      const locale=${JSON.stringify(locale)},kind=${JSON.stringify(kind)};
      const root=document.querySelector('#workspace-panel');
      const update=createManagementPanel(root,createManagementViewModel({callTool:async()=>({structuredContent:inventory})}),locale);update(inventory);
      const click=(zh,en)=>{const b=[...root.querySelectorAll('button')].find(e=>e.textContent===(locale==='en'?en:zh));if(!b)throw new Error('Missing button '+en);b.click();};
      const wait=()=>new Promise(r=>setTimeout(r,0));
      async function run(){
        click('管理','Manage');await wait();click('冗余候选','Redundancy candidates');
        if(kind==='skills'||kind==='drawing')click('技能','Skills');
        if(kind==='idle-plugins')click('闲置待评估 · 2','Inactivity review · 2');
        await wait();
        const card=root.querySelector('.report-card');if(!card)throw new Error('Missing candidate');
        if(kind!=='idle-plugins'&&kind!=='drawing')card.querySelector('details').open=true;
        await wait();
        if(kind!=='idle-plugins'&&kind!=='drawing'&&root.querySelectorAll('.report-instance').length!==2)throw new Error('Missing instances');
        if(kind==='drawing'){
          const items=[...card.querySelectorAll('.report-skill')],rects=items.map(e=>e.getBoundingClientRect());
          if(items.length!==3||!card.querySelector('.report-assessment')||!card.textContent.includes(locale==='en'?'Scientific plotting':'科研绘图'))throw new Error('Missing function comparison');
          if(window.innerWidth>600&&rects.some(r=>Math.abs(r.top-rects[0].top)>2))throw new Error('Wide cards are not horizontal');
          if(window.innerWidth<600&&rects[1].top<=rects[0].top)throw new Error('Narrow cards are not stacked');
        }
        if(kind==='idle-plugins'&&(!root.textContent.includes(locale==='en'?'Coverage is incomplete':'记录覆盖不完整')||root.querySelectorAll('.report-card').length!==2))throw new Error('Missing inactivity evidence');
        if(kind==='skills'&&!root.textContent.includes(locale==='en'?'Directory differences':'目录存在差异'))throw new Error('Difference missing');
        if(document.documentElement.scrollWidth>window.innerWidth)throw new Error('Horizontal overflow');
        if(locale==='en'&&/[\\u3400-\\u9fff]/.test(root.innerText))throw new Error('Untranslated UI');
        document.body.dataset.reportUi='pass';parent.postMessage({type:'report-verified',pass:true},'*');
      }
      run().catch(e=>{document.body.dataset.reportUi='fail';document.body.append(e.message);parent.postMessage({type:'report-verified',pass:false,error:e.message},'*');});`;
    const bundle=await build({stdin:{contents:source,resolveDir:path.dirname(modulePath),loader:'js'},bundle:true,format:'iife',write:false});
    const html=template.replace('<!-- APP_VERSION -->','Development · Synthetic report').replace('<p>查看本地技能文件与来源证据。</p>','<p>DEMO · Synthetic candidate evidence · Browser verification</p>').replace('<p id="status" role="status">正在读取统计…</p>','').replace('/* APP_BUNDLE */',()=>bundle.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'));
    const escaped=html.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    const file=path.join(output,`${name}.html`),screenshot=path.join(output,`${name}.png`);
    await writeFile(file,`<!doctype html><html><body style="margin:0"><iframe id="preview" style="display:block;border:0;width:${width}px;height:1800px" srcdoc="${escaped}"></iframe><script>window.addEventListener('message',e=>{if(e.source===document.querySelector('#preview').contentWindow&&e.data?.type==='report-verified'){document.body.dataset.reportUi=e.data.pass?'pass':'fail';if(e.data.error)document.body.append(e.data.error);}});</script></body></html>`);
    const {stdout}=await promisify(execFile)(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${path.join(output,'profile-'+name)}`,`--window-size=${Math.max(width,450)},1800`,'--virtual-time-budget=3000','--hide-scrollbars',`--screenshot=${screenshot}`,'--dump-dom',...(dark?['--force-dark-mode']:[]),pathToFileURL(file).href],{windowsHide:true,timeout:30000,maxBuffer:4*1024*1024});
    assert.match(stdout,/data-report-ui="pass"/);assert.ok((await stat(screenshot)).size>1000);results.push({name,passed:true});
  }
  await writeFile(path.join(output,'verification.json'),JSON.stringify({scope:'synthetic-browser-component',results},null,2));console.log(JSON.stringify(results));
}finally{await rm(fixture,{recursive:true,force:true});}
