import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {translator} from '../src/i18n.mjs';
import {activityView,calendarDays,activityToday,recentActivity} from '../src/activity.mjs';

test('recent activity uses ledger timezone, inclusive 30 days and separates adoption totals',()=>{
  const now=Date.parse('2026-10-27T17:00:00Z');
  const usage={catalog:[{id:'github',name:'github'}],coverage:{from:'2026-01-01T00:00:00Z',to:new Date(now).toISOString()},activity:{timeZone:'Asia/Shanghai',days:[
    {date:'2026-09-28',entries:[{id:'github',calls:99}]},
    {date:'2026-09-29',entries:[{id:'github',calls:2}]},
    {date:'2026-10-28',entries:[{id:'github',calls:3}]},
    {date:'2026-10-29',entries:[{id:'github',calls:88}]}
  ]}};
  assert.equal(activityToday(usage,now),'2026-10-28');
  let recent=recentActivity({skills:[],usage},'plugins',2026,'calls',now);
  assert.equal(recent.from,'2026-09-29');assert.equal(recent.to,'2026-10-28');assert.equal(recent.dates.length,30);
  assert.equal(recent.total,5);assert.equal(recent.activeDays,2);assert.equal(recent.usedItems,1);
  const adopted={...usage,catalog:[],activity:{...usage.activity,days:[{date:'2026-10-28',entries:[{id:'s',adoptions:7,calls:900}]}]}};
  recent=recentActivity({skills:[{id:'s',name:'Example',source:'user'}],usage:adopted},'skills',2026,'adoptions',now);
  assert.equal(recent.total,7);
  const yearEnd=recentActivity({skills:[],usage},'plugins',2025,'calls',now);
  assert.equal(yearEnd.to,'2025-12-31');assert.equal(yearEnd.from,'2025-12-02');
  const january=recentActivity({skills:[],usage},'plugins',2026,'calls',Date.parse('2026-01-02T00:00:00Z'));
  assert.equal(january.from,'2026-01-01');assert.equal(january.dates.length,2);
});

test('bars and calendar share pinned dates, hover stays informational and back restores the period',async()=>{
  const elements=[];
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.style={setProperty(){}};elements.push(this);}
    append(...items){for(const item of items)item.parentNode=this;this.children.push(...items);}
    get firstChild(){return this;}
    replaceChildren(...items){this.children=items;}
    setAttribute(name,value){(this.attributes ||= {})[name]=value;}
    addEventListener(event,fn){this.listeners[event]=fn;}
    checkValidity(){return true;}
    dispatchEvent(event){this.listeners[event.type]?.(event);}
    focus(){this.listeners.focus?.();}
  }
  const source=(await readFile(new URL('../src/activity-ui.mjs',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace('export function','function');
  const context=vm.createContext({document:{createElement:tag=>new Element(tag)},activityView,calendarDays,activityToday,recentActivity,translator,Event});
  vm.runInContext(source+'\nglobalThis.createPanel=createActivityPanel;',context);
  const root=new Element('root'),render=context.createPanel(root,'zh');
  const today=new Date().toISOString().slice(0,10),prior=new Date(Date.parse(today)-86400000).toISOString().slice(0,10);
  const usage={catalog:[{id:'github',name:'GitHub',detail:'fixture'},{id:'notes',name:'Notes',detail:'fixture'}],coverage:{from:prior+'T00:00:00Z',to:new Date().toISOString()},activity:{timeZone:'UTC',days:[
    {date:prior,entries:[{id:'github',calls:2}]},
    {date:today,entries:[{id:'notes',calls:3},{id:'github',calls:1}]}
  ]}};
  render({skills:[],pluginCalls:usage});
  const all=e=>[e,...e.children.flatMap(all)];
  const find=c=>all(root).find(e=>e.className===c);
  const bar=date=>find('recent-plot').children.find(e=>e.title.startsWith(date));
  const cell=date=>find('calendar-cells').children.find(e=>e.title?.startsWith(date));
  const text=e=>[e.textContent||'',...e.children.map(text)].join(' ');
  assert.equal(find('activity-metrics').children[0].children[1].textContent,'6');
  assert.equal(bar(today).title,cell(today).title);
  bar(today).listeners.mouseenter();
  assert.match(find('activity-tooltip').textContent,/4 次工具调用尝试/);
  assert.equal(find('entity-panel').hidden,false);
  bar(today).listeners.click();
  assert.equal(bar(today).attributes['aria-pressed'],'true');assert.equal(cell(today).attributes['aria-pressed'],'true');
  assert.equal(find('entity-panel').hidden,true);assert.equal(find('activity-rankings').hidden,true);
  assert.match(text(find('daily-heading')),new RegExp(today));
  const list=find('activity-ranking daily-list');
  assert.match(text(list.children[0]),/Notes.*3 次/);assert.match(text(list.children[1]),/GitHub.*1 次/);
  if(prior.startsWith(today.slice(0,4))){
    bar(prior).listeners.mouseenter();
    assert.match(find('activity-tooltip').textContent,/2 次工具调用尝试/);
    assert.match(text(find('daily-heading')),new RegExp(today),'hover cannot replace a pinned daily ranking');
    cell(prior).listeners.click();
    assert.equal(bar(prior).attributes['aria-pressed'],'true');assert.equal(bar(today).attributes['aria-pressed'],'false');
  }
  render.setLocale('en');
  assert.equal(find('clear-day').textContent,'Back to all');
  find('clear-day').listeners.click();
  assert.equal(find('daily-ranking').hidden,true);assert.equal(find('entity-panel').hidden,false);
  assert.ok(find('recent-plot').children.every(e=>e.attributes['aria-pressed']==='false'));
  const unknown=find('recent-plot').children.find(e=>e.className.includes('bar-unknown'));
  if(unknown){assert.match(unknown.title,/activity is unknown/);assert.doesNotMatch(unknown.title,/: 0/);}
  const future=new Date(Date.parse(today)+86400000).toISOString().slice(0,10);
  if(future.startsWith(today.slice(0,4))){assert.match(cell(future).className,/heat-future/);assert.match(cell(future).title,/Future date/);}
  render({skills:[],pluginCalls:null});
  assert.equal(find('activity-metrics').children[0].children[1].textContent,'—','unreadable data is never rendered as zero');
});
