import { readFile, writeFile, rename, unlink, mkdir, lstat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { readUsageFile, discover, defaultUsageOptions } from './usage-index.mjs';
import { acquireAdoptionLock } from './adoption-lock.mjs';
import { PluginCalls } from './plugin-calls.mjs';
import { dataFile } from './data-path.mjs';

// Read host execution events only. Never inspect arguments, results, prose or code.
export class CallParser {
  accept(record) {
    const p = record?.payload;
    if (record?.type !== 'event_msg' || p?.type !== 'item_completed') return [];
    const item = p.item;
    if (item?.type !== 'McpToolCall' || typeof item.id !== 'string' || !item.id) return [];
    if (typeof item.server !== 'string' || typeof item.tool !== 'string') return [];
    const server = item.server.replaceAll('-', '_');
    if (['plugin_skill_manager', 'codex_skill_manager'].includes(server)) return [];
    let plugin, tool;
    if (server === 'codex_apps') {
      const match = /^([a-z0-9][a-z0-9_-]{0,79})\.([A-Za-z0-9_]+)$/.exec(item.tool);
      if (!match) return [];
      plugin = match[1]; tool = `mcp__codex_apps__${plugin}_${match[2]}`;
    } else {
      if (!/^[a-z0-9][a-z0-9_]{0,79}$/.test(server) || !/^[A-Za-z0-9_]+$/.test(item.tool)) return [];
      plugin = server; tool = `mcp__${server}__${item.tool}`;
    }
    if (tool.length > 240) return [];
    const ms = Number.isFinite(p.started_at_ms) ? p.started_at_ms : Date.parse(record.timestamp);
    if (!Number.isFinite(ms)) return [];
    const id = /^[A-Za-z0-9_-]{16,160}$/.test(item.id) ? item.id : createHash('sha256').update(item.id).digest('hex');
    return [{ id, plugin, tool, at: new Date(ms).toISOString(), source: 'host-event' }];
  }
}

export class AutoCapture {
  constructor({ roots = defaultUsageOptions().roots, stateFile = dataFile('auto-capture.json'), calls = new PluginCalls(), maxBytes = 32 * 1024 * 1024, maxLineBytes = 4 * 1024 * 1024 } = {}) {
    Object.assign(this, { roots, stateFile, calls, maxBytes, maxLineBytes });
  }
  async status() {
    try { return await this.read(); }
    catch (error) { if (error.code === 'ENOENT') return { version: 1, files: {}, coverage: null }; throw error; }
  }
  async read() {
    const info = await lstat(this.stateFile);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 64 * 1024 * 1024) throw new Error('自动采集索引类型或容量无效');
    const state = JSON.parse(await readFile(this.stateFile, 'utf8'));
    if (state.version !== 1 || !state.files || typeof state.files !== 'object' || Array.isArray(state.files)) throw new Error('自动采集索引损坏，原文件保留');
    for (const [file, s] of Object.entries(state.files)) {
      if (s.path !== file || !Number.isSafeInteger(s.offset) || s.offset < 0 || !Array.isArray(s.events) || s.events.length || !s.parser || !Number.isSafeInteger(s.prefixLength) || s.prefixLength < 0 || s.prefixLength > 4096 || !Number.isSafeInteger(s.anchorStart) || s.anchorStart < 0 || s.anchorStart > s.offset || s.offset - s.anchorStart > 4096) throw new Error('自动采集游标损坏，原文件保留');
    }
    return state;
  }
  refresh() {
    if (!this.inFlight) this.inFlight = this.run().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }
  async run() {
    const directory = path.dirname(this.stateFile);
    await mkdir(directory, { recursive: true });
    if ((await lstat(directory)).isSymbolicLink()) throw new Error('自动采集目录不能为链接');
    const release = await acquireAdoptionLock(`${this.stateFile}.lock`);
    const temporary = `${this.stateFile}.${randomUUID()}.tmp`;
    try {
      const state = await this.status(), found = await discover(this.roots);
      const issues = [...found.issues]; let budget = this.maxBytes, observed = 0;
      // Keep old cursors on temporary discovery failures; event ledger is append-only.
      for (const file of found.files) {
        if (budget <= this.maxLineBytes) break;
        try {
          const result = await readUsageFile(file.path, state.files[file.path], { maxBytes: budget, maxLineBytes: this.maxLineBytes, parserFactory: () => new CallParser() });
          budget -= result.bytesRead;
          for (let i = 0; i < result.state.events.length; i += 32) await this.calls.record(result.state.events.slice(i, i + 32), { observed: true });
          observed += result.state.events.length;
          result.state.events = []; // Persist offsets and counters, never raw log contents.
          state.files[file.path] = result.state;
        } catch { issues.push({ path: file.path, reason: '读取或入账失败，游标保留，下次重试' }); }
      }
      state.coverage = { checkedAt: new Date().toISOString(), discoveredFiles: found.files.length, observed, pendingBytes: found.files.reduce((n, f) => n + Math.max(0, f.size - (state.files[f.path]?.offset || 0)), 0), malformedLines: Object.values(state.files).reduce((n, s) => n + s.malformed, 0), oversizedLines: Object.values(state.files).reduce((n, s) => n + s.oversized, 0), issues };
      const serialized = JSON.stringify(state);
      if (Buffer.byteLength(serialized) > 64 * 1024 * 1024) throw new Error('自动采集索引达到容量限制');
      await writeFile(temporary, serialized, { flag: 'wx', mode: 0o600 });
      await rename(temporary, this.stateFile);
      return state.coverage;
    } finally { await unlink(temporary).catch(() => {}); await release(); }
  }
}
