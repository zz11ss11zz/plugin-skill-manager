import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as collection from '../src/frontend/views/collection.mjs';
import {createManagementViewModel} from '../src/frontend/viewmodels/management.vm.mjs';
import {createGuidance} from '../src/backend/domain/redundancy/guidance.mjs';
import {testConfig} from './helpers/config.mjs';
// Guidance is attached by the backend from the shipped configuration; fixtures do the same.
const advise=createGuidance(testConfig().redundancy.overlap.tasks,testConfig().redundancy.guidance);
const withGuidance=g=>({...g,members:g.members.map(m=>({...m,purpose:advise.purpose(m)})),guidance:advise.forGroup(g)});

test('candidate views retain inventory kind, defer without mutations, preserve evidence and gate archive execution', async () => {
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.attributes={};}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=items;}
    setAttribute(k,v){this.attributes[k]=v;}
    addEventListener(event,fn){this.listeners[event]=fn;}
  }
  const root=new Element('root'), calls=[];
  const member={id:'a',name:'sample',source:'用户技能',path:'/fixture/sample/SKILL.md',fingerprint:'f',tree:{complete:true,files:2,bytes:10},dependencyHints:[],references:[],activity:{count:0,last:null}};
  const group={id:'group1',types:['documents'],members:[member],totalMembers:1,complete:true,directoryEqual:true,retained:[],differences:[],differenceCount:0,documentDifference:[]};
  const report={checkedAt:'2026-10-30',days:90,skills:[group],plugins:[],limits:{directoriesScanned:1,shownSkillGroups:1,skillGroups:1}};
  const inventory={mode:'inventory',inventoryScope:'management',skills:[],notesAvailable:true,managementSupported:true};
  const source=(await readFile(new URL('../src/frontend/views/management.view.mjs',import.meta.url),'utf8')).replace("import * as collection from './collection.mjs';", '').replace('export function','function');
  const context=vm.createContext({collection,Date,document:{createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text,children:[]}),querySelector:()=>new Element('section')}});
  vm.runInContext(source+'\nglobalThis.createPanel=createManagementPanel;',context);
  const panelWith=(callTool,onInventory,locale)=>context.createPanel(root,createManagementViewModel({callTool,onInventory,now:()=>context.Date.now()}),locale);
  const update=panelWith(async call=>{
    calls.push(call);
    if(call.name==='preview_skill_archive')return {structuredContent:{mode:'management-plan',plan:{title:'sample',action:'archive',original:'/fixture/sample',destination:'/fixture/archive',files:2,bytes:10,token:'preview',expiresAt:Date.now()+60000}}};
    if(call.name==='save_skill_note'){member.annotation={retain:call.arguments.retain,revision:1};return {structuredContent:inventory};}
    if(call.name==='cancel_skill_plan')return {structuredContent:{mode:'management-cancelled'}};
    return {structuredContent:{...inventory,...(call.name==='generate_redundancy_report'?{redundancy:report}:{})}};
  },()=>{});
  const all=(e=root)=>[e,...e.children.flatMap(c=>all(c))];
  const find=label=>all().find(e=>e.tag==='button'&&e.textContent===label);
  const click=label=>{const b=find(label);assert.ok(b,label);assert.equal(b.disabled,false,label);b.listeners.click();};
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  update(inventory);click('管理');await flush();click('技能');click('冗余候选');await flush();
  assert.equal(calls.at(-1).name,'generate_redundancy_report');
  assert.equal(find('技能').attributes['aria-pressed'],'true');
  assert.equal(all().filter(e=>e.className==='report-card').length,1);
  assert.ok(all().some(e=>e.textContent?.includes('官方市场中的第三方插件仍纳入')));
  assert.ok(all().some(e=>e.className==='report-skill'));
  assert.ok(all().some(e=>e.className==='report-category'&&e.textContent==='相同技能文档'));
  assert.ok(all().some(e=>e.className==='report-source'&&e.textContent==='来源：用户技能'));
  assert.ok(all().some(e=>e.className==='report-assessment'));
  const before=calls.length;click('本次暂缓');assert.equal(calls.length,before);
  assert.equal(all().filter(e=>e.className==='report-card').length,0);
  click('本次暂缓 · 1');click('恢复本次显示');click('全部 · 1');
  click('闲置待评估 · 0');assert.ok(all().some(e=>e.textContent?.includes('超过一个日历月')));
  click('记录不足 · 0');assert.ok(all().some(e=>e.textContent?.includes('首次观察不是安装日期')));
  click('全部 · 1');click('预览归档');await flush();assert.ok(find('确认归档'));
  assert.equal(calls.some(c=>c.name==='execute_skill_plan'),false);click('取消');await flush();
  click('标记保留');await flush();await flush();assert.equal(find('预览归档').disabled,true);
  assert.equal(calls.find(c=>c.name==='save_skill_note').arguments.retain,true);
  click('清单');assert.equal(find('技能').attributes['aria-pressed'],'true');
  click('冗余候选');click('插件');assert.equal(find('插件').attributes['aria-pressed'],'true');
  update.setLocale('en');assert.ok(find('Inventory'));assert.ok(find('Redundancy candidates'));
  const drawing={...group,id:'drawing',types:['overlap'],retained:[],directoryEqual:false,differenceCount:2,members:[{...member,name:'scientific-visualization',declaredAuthor:'K-Dense Inc.'},{...member,id:'b',name:'matplotlib'}],relations:[{type:'overlap',ids:['a','b'],sharedTerms:['scientific-figures']}]};
  update({...inventory,redundancy:{...report,skills:[withGuidance(drawing)]}});click('Skills');
  assert.equal(all().filter(e=>e.className==='report-skill').length,2);
  assert.ok(all().some(e=>e.className==='report-category'&&e.textContent==='Scientific plotting'));
  assert.ok(all().some(e=>e.className==='report-advice'&&e.textContent.includes('Keep both with distinct roles')));
  assert.ok(all().some(e=>e.textContent==='Document author: K-Dense Inc.'));
  update.setLocale('zh');assert.ok(all().some(e=>e.className==='report-category'&&e.textContent==='科研绘图'));
});

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
  const source=(await readFile(new URL('../src/frontend/views/management.view.mjs',import.meta.url),'utf8')).replace("import * as collection from './collection.mjs';", '').replace('export function','function');
  const context=vm.createContext({collection,Date:{now:()=>now},document:{createElement:tag=>new Element(tag),querySelector:()=>activity}});
  vm.runInContext(source+'\nglobalThis.createPanel=createManagementPanel;',context);
  const panelWith=(callTool,onInventory,locale)=>context.createPanel(root,createManagementViewModel({callTool,onInventory,now:()=>context.Date.now()}),locale);
  const update=panelWith(async ({name})=>{
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
  const source=(await readFile(new URL('../src/frontend/views/management.view.mjs',import.meta.url),'utf8')).replace("import * as collection from './collection.mjs';", '').replace('export function','function');
  const context=vm.createContext({collection,Date,document:{createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text,children:[]}),querySelector:()=>new Element('section')}});
  vm.runInContext(source+'\nglobalThis.createPanel=createManagementPanel;',context);
  const panelWith=(callTool,onInventory,locale)=>context.createPanel(root,createManagementViewModel({callTool,onInventory,now:()=>context.Date.now()}),locale);
  const update=panelWith(async()=>({structuredContent:inventory}),()=>{});
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
    {id:'tools-only@market',displayName:'Readable Tool',icon:'https://files.openai.com/icon.png',version:'1',enabled:false},{id:'unknown@market',version:'1',enabled:null},
    {id:'mixed@market',version:'1',enabled:true},{id:'mixed@market',version:'2',enabled:false}
  ]}};
  let fail=false;
  const source=(await readFile(new URL('../src/frontend/views/management.view.mjs',import.meta.url),'utf8')).replace("import * as collection from './collection.mjs';", '').replace('export function','function');
  const context=vm.createContext({collection,Date,document:{createElement:tag=>new Element(tag),querySelector:()=>new Element('section')}});
  vm.runInContext(source+'\nglobalThis.createPanel=createManagementPanel;',context);
  const panelWith=(callTool,onInventory,locale)=>context.createPanel(root,createManagementViewModel({callTool,onInventory,now:()=>context.Date.now()}),locale);
  const update=panelWith(async ({name})=>{calls.push(name);return fail?{isError:true,content:[{type:'text',text:'offline'}]}:{structuredContent:inventory};},()=>{});
  const all=(e=root)=>[e,...e.children.flatMap(c=>all(c))];
  const click=label=>all().find(e=>e.tag==='button'&&e.textContent===label).listeners.click();
  const filter=state=>all().find(e=>e.attributes['data-plugin-filter']===state);
  const names=()=>all().filter(e=>e.tag==='h3').map(e=>e.textContent);
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  update({mode:'inventory',skills:inventory.skills});
  click('管理');
  assert.equal(filter('').textContent,'已安装 · —');
  await flush();
  assert.equal(filter('').textContent,'已安装 · 4');
  assert.equal(filter('enabled').textContent,'已启用 · 1');
  assert.equal(filter('unknown').textContent,'状态未知 · 2');
  assert.ok(names().includes('Readable Tool'));
  const image=all().find(e=>e.tag==='img'); assert.equal(image.src,'https://files.openai.com/icon.png');
  image.listeners.load(); image.listeners.error(); assert.equal(image.hidden,true);
  assert.equal(all().find(e=>e.className==='plugin-icon'&&e.children.includes(image)).children[0].hidden,false);
  assert.ok(all().some(e=>e.textContent==='匹配安装版本的 Skill 文件：1'));
  assert.ok(all().some(e=>e.textContent==='未匹配安装版本的缓存 Skill 文件：1'));
  filter('cache').listeners.click(); assert.deepEqual(names(),['cached']);
  filter('').listeners.click();
  const input=all().find(e=>e.type==='search');input.value='TOOLS';input.listeners.input();assert.deepEqual(names(),['Readable Tool']);
  input.value='readable';input.listeners.input();assert.deepEqual(names(),['Readable Tool']);
  assert.equal(filter('').textContent,'已安装 · 4');
  update.setLocale('en');assert.equal(filter('').textContent,'Installed · 4');
  fail=true;click('Refresh inventory');await flush();
  assert.equal(calls.at(-1),'check_plugin_status');
  assert.ok(all().some(e=>e.textContent==='Showing the previous check; results may be stale.'));
  fail=false;click('Retry check');await flush();
  assert.equal(all().some(e=>e.textContent==='Showing the previous check; results may be stale.'),false);
});
