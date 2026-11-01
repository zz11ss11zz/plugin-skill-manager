// Synthetic browser acceptance; never operates on installed user Skills.
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, writeFile, rm, stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {scanInventory} from '../src/inventory.mjs';
import {redundancyReport} from '../src/redundancy.mjs';

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
  // Replace temporary fixture paths only in the display evidence.
  for(const g of inventory.redundancy.skills)for(const m of g.members)m.path=`C:/Synthetic/Skills/${path.basename(path.dirname(m.path))}/SKILL.md`;
  const template=await readFile(new URL('../src/dashboard.html',import.meta.url),'utf8');
  const modulePath=fileURLToPath(new URL('../src/management-ui.mjs',import.meta.url));
  const results=[];
  for(const [locale,width,dark,kind]of [['zh',1100,false,'skills'],['en',1100,true,'skills'],['zh',380,false,'skills'],['en',1100,false,'plugins']]){
    const name=`${locale}-${width}-${dark?'dark':'light'}-${kind}`;
    const source=`import {createManagementPanel} from ${JSON.stringify(modulePath)};
      const inventory=${JSON.stringify(inventory)};
      const locale=${JSON.stringify(locale)},kind=${JSON.stringify(kind)};
      const root=document.querySelector('#workspace-panel');
      const update=createManagementPanel(root,async()=>({structuredContent:inventory}),()=>{},locale);update(inventory);
      const click=(zh,en)=>{const b=[...root.querySelectorAll('button')].find(e=>e.textContent===(locale==='en'?en:zh));if(!b)throw new Error('Missing button '+en);b.click();};
      const wait=()=>new Promise(r=>setTimeout(r,0));
      async function run(){
        click('管理','Manage');await wait();click('冗余候选','Redundancy candidates');
        if(kind==='skills')click('技能','Skills');
        await wait();
        const card=root.querySelector('.report-card');if(!card)throw new Error('Missing candidate');
        card.querySelector('details').open=true;
        await wait();
        if(root.querySelectorAll('.report-instance').length!==2)throw new Error('Missing instances');
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
