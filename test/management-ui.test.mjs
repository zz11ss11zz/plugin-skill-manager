import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('view checks run automatically, cache results, and offer retry only after failure', async () => {
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=items;}
    setAttribute(){}
    addEventListener(event,fn){this.listeners[event]=fn;}
  }
  const root=new Element('root'), activity=new Element('section'), calls=[];
  const inventory={mode:'inventory',skills:[]};
  let fail=false, release, now=100000, updated=0;
  const source=(await readFile(new URL('../src/management-ui.mjs',import.meta.url),'utf8')).replace('export function','function');
  const context=vm.createContext({Date:{now:()=>now},document:{createElement:tag=>new Element(tag),querySelector:()=>activity}});
  vm.runInContext(source+'\nglobalThis.createPanel=createManagementPanel;',context);
  const update=context.createPanel(root,async ({name})=>{
    calls.push(name);
    assert.equal(name,'check_plugin_status');
    await new Promise(resolve=>{release=resolve;});
    if(fail) return {isError:true,content:[{type:'text',text:'offline'}]};
    return {structuredContent:inventory};
  },()=>updated++);
  update(inventory);
  const all=(e=root)=>[e,...e.children.flatMap(c=>all(c))];
  const find=label=>all().find(e=>e.tag==='button'&&e.textContent===label);
  const click=label=>{const b=find(label);assert.ok(b,label);if(!b.disabled)b.listeners.click();};
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,0);
  assert.deepEqual(root.children[0].children.map(e=>e.textContent),['活动','管理']);
  click('管理'); assert.equal(calls.length,1); click('管理'); assert.equal(calls.length,1);
  assert.equal(find('刷新中…').disabled,true);
  assert.equal(find('技能').disabled,false,'inventory navigation stays usable while status is pending');
  click('技能'); assert.equal(all().find(e=>e.type==='search').disabled,undefined);
  click('活动'); assert.equal(activity.hidden,false,'slow refresh must not lock navigation');
  click('管理'); assert.equal(calls.length,1,'pending refresh is reused');
  release(); await flush(); assert.equal(updated,1);
  assert.equal(find('核对插件状态'),undefined);
  click('活动'); click('管理'); assert.equal(calls.length,1);
  fail=true; now+=61000; click('管理'); release(); await flush(); assert.ok(find('重试检查'));
  click('活动'); click('管理'); assert.equal(calls.length,2,'failure must not trigger a retry loop');
  fail=false; click('重试检查'); release(); await flush(); assert.equal(calls.length,3); assert.equal(find('重试检查'),undefined);
  now+=61000; click('管理'); assert.equal(calls.length,4,'expired check refreshes on next entry');
  release(); await flush();
});

test('source summary groups personal roots, filters every category, and keeps totals independent of search', async () => {
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.attributes={};}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=items;}
    setAttribute(k,v){this.attributes[k]=v;}
    addEventListener(event,fn){this.listeners[event]=fn;}
  }
  const root=new Element('root');
  const sources=['用户技能','用户 .agents 技能','系统技能','插件缓存技能'];
  const inventory={mode:'inventory',skills:sources.map((source,i)=>({id:String(i),name:'skill-'+i,source,description:'Example',path:'/example/'+i,fingerprint:String(i)}))};
  const source=(await readFile(new URL('../src/management-ui.mjs',import.meta.url),'utf8')).replace('export function','function');
  const context=vm.createContext({Date,document:{createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text,children:[]}),querySelector:()=>new Element('section')}});
  vm.runInContext(source+'\nglobalThis.createPanel=createManagementPanel;',context);
  const update=context.createPanel(root,async()=>({structuredContent:inventory}),()=>{});
  update(inventory);
  const all=(e=root)=>[e,...e.children.flatMap(c=>all(c))];
  all().find(e=>e.tag==='button'&&e.textContent==='管理').listeners.click();
  await new Promise(resolve=>setImmediate(resolve));
  all().find(e=>e.tag==='button'&&e.textContent==='技能').listeners.click();
  const rows=()=>all().filter(e=>e.className==='source-choice');
  const select=group=>rows().find(e=>e.attributes['data-source']===group).listeners.click();
  const names=()=>all().find(e=>e.className==='manager-list').children.filter(e=>e.tag==='li').map(e=>e.children[0].textContent);
  assert.deepEqual(rows().map(e=>e.children[1].textContent),['2','1','1','4']);
  assert.deepEqual(names(),['skill-0','skill-1','skill-2','skill-3']);
  select('personal'); assert.deepEqual(names(),['skill-0','skill-1']);
  const input=all().find(e=>e.type==='search'); input.value='skill-1'; input.listeners.input();
  assert.deepEqual(names(),['skill-1']); assert.equal(rows()[0].children[1].textContent,'2');
  select('system'); assert.deepEqual(names(),['skill-2']);
  assert.equal(all().find(e=>e.type==='search').value,'','switching category clears the previous search');
  select('plugins'); assert.deepEqual(names(),['skill-3']);
  select(''); assert.equal(names().length,4);
  update.setLocale('en'); assert.equal(rows()[0].children[0].textContent,'Personal skills');
  assert.equal(root.children[0].attributes['aria-label'],'Manager views');
  assert.equal(rows()[1].attributes['aria-label'],'System skills, 1 Skill file');
  update({...inventory,skills:inventory.skills.filter(s=>s.source!=='系统技能')});
  select('system'); assert.deepEqual(names(),[]); assert.equal(rows()[1].children[1].textContent,'0');
});

test('plugin inventory deduplicates IDs, separates old caches, preserves unknown and refreshes status', async () => {
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.attributes={};}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=items;}
    setAttribute(k,v){this.attributes[k]=v;}
    addEventListener(event,fn){this.listeners[event]=fn;}
  }
  const root=new Element('root'), calls=[];
  const skill=(name,version)=>({name,path:'/cache/'+name+'/'+version,owner:{name,directory:name,marketplace:'market',version}});
  const inventory={mode:'inventory',skills:[skill('alpha','1'),skill('alpha','0'),skill('cached','1')],pluginRegistry:{checkedAt:'2026-10-28T00:00:00Z',plugins:[
    {id:'alpha@market',version:'1',enabled:true},{id:'alpha@market',version:'2',enabled:true},
    {id:'tools-only@market',version:'1',enabled:false},{id:'unknown@market',version:'1',enabled:null},
    {id:'mixed@market',version:'1',enabled:true},{id:'mixed@market',version:'2',enabled:false}
  ]}};
  let fail=false;
  const source=(await readFile(new URL('../src/management-ui.mjs',import.meta.url),'utf8')).replace('export function','function');
  const context=vm.createContext({Date,document:{createElement:tag=>new Element(tag),querySelector:()=>new Element('section')}});
  vm.runInContext(source+'\nglobalThis.createPanel=createManagementPanel;',context);
  const update=context.createPanel(root,async ({name})=>{calls.push(name);return fail?{isError:true,content:[{type:'text',text:'offline'}]}:{structuredContent:inventory};},()=>{});
  const all=(e=root)=>[e,...e.children.flatMap(c=>all(c))];
  const click=label=>all().find(e=>e.tag==='button'&&e.textContent===label).listeners.click();
  const filter=state=>all().find(e=>e.attributes['data-plugin-filter']===state);
  const names=()=>all().find(e=>e.className==='manager-list').children.filter(e=>e.tag==='li').map(e=>e.children[0].textContent);
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  update({mode:'inventory',skills:inventory.skills});
  click('管理');
  assert.equal(filter('').textContent,'已安装 · —');
  await flush();
  assert.equal(filter('').textContent,'已安装 · 4');
  assert.equal(filter('enabled').textContent,'已启用 · 1');
  assert.equal(filter('unknown').textContent,'状态未知 · 2');
  assert.ok(names().includes('tools-only'));
  assert.ok(all().some(e=>e.textContent==='匹配安装版本的 Skill 文件：1'));
  assert.ok(all().some(e=>e.textContent==='未匹配安装版本的缓存 Skill 文件：1'));
  filter('cache').listeners.click(); assert.deepEqual(names(),['cached']);
  filter('').listeners.click();
  const input=all().find(e=>e.type==='search');input.value='TOOLS';input.listeners.input();assert.deepEqual(names(),['tools-only']);
  assert.equal(filter('').textContent,'已安装 · 4');
  update.setLocale('en');assert.equal(filter('').textContent,'Installed · 4');
  fail=true;click('Refresh inventory');await flush();
  assert.equal(calls.at(-1),'check_plugin_status');
  assert.ok(all().some(e=>e.textContent==='Showing the previous check; results may be stale.'));
  fail=false;click('Retry check');await flush();
  assert.equal(all().some(e=>e.textContent==='Showing the previous check; results may be stale.'),false);
});
