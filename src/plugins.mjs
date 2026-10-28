import { spawn } from 'node:child_process';

export function parseInstalledPlugins(data) {
  if (!Array.isArray(data?.marketplaces) || data.marketplaceLoadErrors?.length) throw new Error('本地插件清单不完整');
  const installed = data.marketplaces.flatMap(m => {
    if (!Array.isArray(m.plugins)) throw new Error('插件市场记录格式不受支持');
    return m.plugins.filter(p => p.installed === true).map(p => ({
      pluginId: p.id, version: p.localVersion ?? p.version ?? 'unknown', installed: true, enabled: p.enabled,
    }));
  });
  return parsePluginList(JSON.stringify({ installed }));
}

// Query installed state, not the marketplace catalog (which may wait on remote services).
export async function queryInstalledPlugins({ cli = process.env.CODEX_SKILL_MANAGER_CLI || 'codex', timeoutMs = 10000 } = {}) {
  const child = spawn(cli, ['app-server', '--stdio'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    let buffer = '', done = false;
    const finish = (error, value) => {
      if (done) return;
      done = true; clearTimeout(timer); child.stdin.end(); child.kill();
      error ? reject(error) : resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('本地插件状态查询超时')), timeoutMs);
    child.on('error', error => finish(error));
    child.stdin.on('error', error => finish(error));
    child.on('exit', () => { if (!done) finish(new Error('插件状态服务提前退出')); });
    child.stderr.resume();
    child.stdout.on('data', chunk => {
      buffer += chunk;
      if (buffer.length > 8 * 1024 * 1024) return finish(new Error('插件状态响应过大'));
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        let message; try { message = JSON.parse(line); } catch { continue; }
        if (![1, 2].includes(message.id)) continue;
        if (message.error) return finish(new Error(message.error.message || '插件状态查询失败'));
        if (message.id === 1) {
          child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
          child.stdin.write(JSON.stringify({ id: 2, method: 'plugin/installed', params: {} }) + '\n');
        } else return finish(null, message.result);
      }
    });
    child.stdin.write(JSON.stringify({ id: 1, method: 'initialize', params: { clientInfo: { name: 'plugin-skill-manager', version: '1' }, capabilities: { experimentalApi: true } } }) + '\n');
  });
}

export function parsePluginList(raw) {
  const data = JSON.parse(raw);
  if (!Array.isArray(data.installed)) throw new Error('插件清单格式不受支持');
  return data.installed.map(p => {
    if (typeof p.pluginId !== 'string' || typeof p.version !== 'string' || p.installed !== true || !['boolean', 'undefined'].includes(typeof p.enabled)) throw new Error('插件清单字段不受支持');
    return { id: p.pluginId, version: p.version, enabled: p.enabled ?? null };
  });
}

export async function loadPluginStatus() {
  const result = await queryInstalledPlugins();
  return { checkedAt: new Date().toISOString(), evidence: 'codex app-server plugin/installed', plugins: parseInstalledPlugins(result) };
}

export function applyPluginStatus(inventory, status) {
  const skills = inventory.skills.map(skill => {
    if (!skill.owner) return skill;
    const id = `${skill.owner.directory || skill.owner.name}@${skill.owner.marketplace}`;
    const records = status.plugins.filter(p => p.id === id);
    const matches = records.filter(p => p.version === skill.owner.version);
    const pluginStatus = { id, evidence: status.evidence, checkedAt: status.checkedAt, installedVersions: records.map(p => p.version), enabled: matches.length === 1 ? matches[0].enabled : null };
    const state = matches.length === 1
      ? `所属插件同版本已安装，${matches[0].enabled === true ? '插件已启用' : matches[0].enabled === false ? '插件已停用' : '插件启用状态未知'}；技能是否被本次会话加载未核实`
      : records.length ? '所属插件其他版本已安装；此文件仍为缓存候选' : '安装清单未匹配；此文件仍为缓存候选';
    return { ...skill, state, pluginStatus };
  });
  return { ...inventory, skills, pluginRegistry: status };
}
