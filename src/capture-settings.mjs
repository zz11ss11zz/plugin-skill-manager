import { readFile, writeFile, rename, unlink, mkdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { dataFile } from './data-path.mjs';
import { acquireAdoptionLock } from './adoption-lock.mjs';

export const validSettings = value => value?.version === 1 && typeof value.enabled === 'boolean' && Number.isInteger(value.intervalSeconds) && value.intervalSeconds >= 5 && value.intervalSeconds <= 3600;

export class CaptureSettings {
  constructor(file = dataFile('auto-capture-settings.json'), env = process.env) { this.file = file; this.env = env; }
  async read() {
    try {
      const info = await lstat(this.file);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 4096) throw new Error('自动采集配置类型或大小无效');
      const settings = JSON.parse(await readFile(this.file, 'utf8'));
      if (!validSettings(settings)) throw new Error('自动采集配置损坏，原文件保留');
      return { ...settings, source: 'settings-file' };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const settings = { version: 1, enabled: this.env.CODEX_SKILL_MANAGER_AUTO_CAPTURE === '1', intervalSeconds: Number(this.env.CODEX_SKILL_MANAGER_CAPTURE_INTERVAL_SECONDS || 10) };
      if (!validSettings(settings)) throw new Error('自动采集间隔必须为 5 至 3600 秒的整数');
      return { ...settings, source: 'environment' };
    }
  }
  async save({ enabled, intervalSeconds = 10 }) {
    const settings = { version: 1, enabled, intervalSeconds };
    if (!validSettings(settings)) throw new Error('自动采集参数无效');
    const dir = path.dirname(this.file); await mkdir(dir, { recursive: true });
    if ((await lstat(dir)).isSymbolicLink()) throw new Error('自动采集配置目录不能为链接');
    const release = await acquireAdoptionLock(`${this.file}.lock`);
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      await this.read(); // Refuse to overwrite a corrupt or linked configuration.
      await writeFile(temporary, JSON.stringify(settings), { flag: 'wx', mode: 0o600 });
      await rename(temporary, this.file);
      return settings;
    } finally { await unlink(temporary).catch(() => {}); await release(); }
  }
}

export class CaptureController {
  constructor(collector, settings = new CaptureSettings()) { this.collector = collector; this.settings = settings; }
  async refresh() {
    this.current = await this.settings.read();
    if (!this.current.enabled) return null;
    const coverage = (await this.collector.status()).coverage;
    // Visible-panel queries and other service instances must honor the same interval.
    const checkedAt = Date.parse(coverage?.checkedAt);
    if (Number.isFinite(checkedAt) && Date.now() - checkedAt < this.current.intervalSeconds * 1000) return coverage;
    return this.collector.refresh();
  }
  async info() {
    const settings = await this.settings.read();
    let coverage = null, error = this.lastError || null;
    try { coverage = (await this.collector.status()).coverage; }
    catch (failure) { error = failure.message; }
    return { ...settings, coverage, lastError: error, skillAdoptions: 'caller-reported', logScope: 'local-readable-host-events' };
  }
  async configure(settings) {
    await this.settings.save(settings);
    // All instances consult the shared configuration on their next tick.
    return this.info();
  }
  start() {
    this.running = true;
    const tick = async () => {
      try { await this.refresh(); this.lastError = null; }
      catch (error) { this.lastError = error.message; }
      if (this.running) { this.timer = setTimeout(tick, (this.current?.intervalSeconds || 10) * 1000); this.timer.unref(); }
    };
    void tick();
    return () => { this.running = false; clearTimeout(this.timer); };
  }
}
