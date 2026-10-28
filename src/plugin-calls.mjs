import { lstat, readFile, mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import { dataFile } from './data-path.mjs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { acquireAdoptionLock } from './adoption-lock.mjs';

const validCall = c => c && typeof c.id === 'string' && /^[A-Za-z0-9_-]{16,160}$/.test(c.id) &&
  typeof c.plugin === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(c.plugin) &&
  typeof c.tool === 'string' && c.tool.length <= 240 &&
  [`mcp__codex_apps__${c.plugin}_`, `mcp__${c.plugin}__`].some(prefix => c.tool.startsWith(prefix) && c.tool.length > prefix.length) && /^[A-Za-z0-9_]+$/.test(c.tool);
const same = (a,b) => a.plugin === b.plugin && a.tool === b.tool;

export class PluginCalls {
  constructor(file = dataFile('plugin-calls.json')) { this.file = file; }
  async read() {
    try {
      const info = await lstat(this.file);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 32 * 1024 * 1024) throw new Error('插件调用账本类型或容量无效');
      const state = JSON.parse(await readFile(this.file, 'utf8'));
      if (state?.version !== 1 || !Array.isArray(state.calls) || state.calls.some(c => !validCall(c) || !Number.isFinite(Date.parse(c.at))) || new Set(state.calls.map(c=>c.id)).size !== state.calls.length) throw new Error('插件调用账本损坏，原文件保留');
      return state;
    } catch (error) { if (error.code === 'ENOENT') return {version:1,calls:[]}; throw error; }
  }
  async record(calls, { observed = false } = {}) {
    if (!Array.isArray(calls) || !calls.length || calls.length > 32 || calls.some(c=>!validCall(c))) throw new Error('插件调用参数无效');
    if (observed && calls.some(c => c.source !== 'host-event' || !Number.isFinite(Date.parse(c.at)))) throw new Error('宿主调用时间无效');
    const directory = path.dirname(this.file);
    await mkdir(directory,{recursive:true});
    if ((await lstat(directory)).isSymbolicLink()) throw new Error('账本目录不能为链接');
    const release = await acquireAdoptionLock(`${this.file}.lock`);
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      const state = await this.read(), known = new Map(state.calls.map(c=>[c.id,c]));
      const at = new Date().toISOString(); let changed = false;
      for (const call of calls) {
        const {id,plugin,tool} = call;
        const old = known.get(id);
        if (old) {
          if (!same(old,{plugin,tool})) throw new Error('同一调用 ID 内容冲突，拒绝覆盖');
          // Exact-ID corroboration is safe; never guess matches from tool/time proximity.
          if (observed && old.source !== 'host-event') {
            old.reportedAt = old.at; old.at = call.at; old.source = 'host-event'; old.receivedAt = at;
            if (call.status) old.status = call.status;
            changed = true;
          }
          continue;
        }
        const entry = {id,plugin,tool,at: observed ? call.at : at, ...(observed ? {source:'host-event', receivedAt:at, ...(call.status ? {status:call.status} : {})} : {})}; known.set(id,entry); state.calls.push(entry); changed = true;
      }
      if (!changed) return;
      const serialized = JSON.stringify(state);
      if (Buffer.byteLength(serialized) > 32 * 1024 * 1024) throw new Error('插件调用账本达到容量限制');
      await writeFile(temporary,serialized,{flag:'wx',mode:0o600});
      await rename(temporary,this.file);
    } finally { await unlink(temporary).catch(()=>{}); await release(); }
  }
  async summary(period = {}) {
    const state = await this.read();
    return {
      ...summarizeCalls(state.calls, period, 'host-event'),
      sources: {
        'host-event': summarizeCalls(state.calls, period, 'host-event'),
        'assistant-report': summarizeCalls(state.calls, period, 'assistant-report'),
      },
    };
  }
}

function summarizeCalls(allCalls, period, source) {
    const calls = allCalls.filter(c => source === 'host-event' ? c.source === 'host-event' : c.source !== 'host-event');
    const from = period.from ? Date.parse(period.from) : -Infinity, to = period.to ? Date.parse(period.to) : Infinity;
    if (Number.isNaN(from) || Number.isNaN(to) || from >= to) throw new Error('插件调用统计期间无效');
    const timeZone = period.timeZone || 'UTC';
    const format = new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
    const catalog = new Map(), days = new Map(), tools = new Map(); let total = 0;
    for (const call of calls) {
      catalog.set(call.plugin,{id:call.plugin,name:call.plugin,detail:'独立插件工具调用记录'});
      const time = Date.parse(call.at); if (time < from || time >= to) continue;
      const parts = Object.fromEntries(format.formatToParts(new Date(call.at)).map(p=>[p.type,p.value]));
      const date = `${parts.year}-${parts.month}-${parts.day}`;
      if (!days.has(date)) days.set(date,new Map());
      const entries = days.get(date); entries.set(call.plugin,(entries.get(call.plugin)||0)+1);
      tools.set(call.tool,(tools.get(call.tool)||0)+1); total++;
    }
    return {total,source,catalog:[...catalog.values()],tools:[...tools].map(([name,count])=>({name,count})),
      activity:{timeZone,excluded:0,uncertainIds:[],days:[...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,entries])=>({date,entries:[...entries].map(([id,calls])=>({id,calls}))}))},
      period:{from:period.from||null,to:period.to||null},coverage:{from:calls.map(c=>c.at).sort()[0]||null,to:calls.map(c=>c.at).sort().at(-1)||null,complete:false,scope:'recorded-events-only',pendingBytes:0,issues:[]},
      limits:['宿主事件使用原始调用时间；手动上报使用接收时间。调用记录不代表成功。','同一调用 ID 去重；手动使用不同 ID 上报同一调用可能重复。自动采集只覆盖本机可读日志中的 McpToolCall 事件。']};
}
