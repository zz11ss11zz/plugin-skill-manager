import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, cp } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { diagnoseEnvironment, registrationCheck, inspectDirectory, probeCli } from '../src/environment-health.mjs';
import { queryInstalledPlugins } from '../src/plugins.mjs';

const run = promisify(execFile);
const fulfilled = value => ({ status: 'fulfilled', value });
const denied = () => { throw Object.assign(new Error('PRIVATE_PATH token=SECRET'), { code: 'EACCES' }); };
const failed = { status: 'rejected', reason: new Error('private response') };
const installed = [{ id: 'plugin-skill-manager@local', version: '0.4.6', enabled: true }];
const cliProbe = async kind => kind === 'version' ? '1.0.0' : kind === 'mcp' ? [] : installed;
const item = (result, id) => result.health.checks.find(c => c.id === id);
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'manager-health-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const data = path.join(root, 'data');
  const env = { ...process.env, CODEX_HOME: path.join(root, 'codex'), CODEX_SKILL_MANAGER_DATA_DIR: data, CODEX_SKILL_MANAGER_AUTO_CAPTURE: '0', CODEX_SKILL_MANAGER_CAPTURE_INTERVAL_SECONDS: '10' };
  await mkdir(env.CODEX_HOME);
  delete env.CODEX_SKILL_MANAGER_LEGACY_DIR;
  const options = { home: root, env, cliProbe, platform: 'win32' };
  const json = async (name, content) => { await mkdir(data, { recursive: true }); await writeFile(path.join(data, name), typeof content === 'string' ? content : JSON.stringify(content)); };
  return { root, data, env, options, json };
}
async function snapshot(dir) {
  const result = {};
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name);
    result[entry.name] = entry.isDirectory() ? await snapshot(name) : (await readFile(name)).toString('base64');
  }
  return result;
}

test('new installation reports empty records without creating data or treating disabled capture as a failure', async t => {
  const { root, options } = await fixture(t), before = await snapshot(root);
  const result = await diagnoseEnvironment(options);
  assert.equal(result.health.status, 'ok');
  assert.equal(result.adoptions.state, 'empty');
  assert.equal(result.pluginCalls.count, 0);
  assert.equal(result.automaticMonitoring, false);
  assert.equal(item(result, 'settings').status, 'info');
  assert.equal(item(result, 'registration').code, 'registered');
  assert.equal(result.hostWideCoverage, 'unknown');
  assert.equal(result.health.nativeHostVerified, false);
  assert.deepEqual(await snapshot(root), before);
  assert.ok(!JSON.stringify(result).includes(root), 'diagnostics omit private absolute paths');
});

test('corrupt settings, ledger and migration receipt stay independent and never become disabled or zero', async t => {
  const { root, options, json } = await fixture(t);
  await json('migration.json', '{');
  await json('auto-capture-settings.json', '{"version":1,"enabled":"yes"}');
  await json('plugin-calls.json', '{');
  await json('auto-capture.json', { version: 1, files: { secret: null } });
  const before = await snapshot(root), result = await diagnoseEnvironment(options);
  assert.equal(result.health.status, 'error');
  for (const id of ['migration', 'settings', 'pluginCalls', 'captureState']) assert.equal(item(result, id).status, 'error', id);
  assert.equal(result.automaticMonitoring, null);
  assert.equal(result.capture, 'unknown');
  assert.equal(result.pluginCalls.count, null);
  assert.equal(result.adoptions.state, 'empty');
  assert.equal(item(result, 'cli').status, 'ok');
  assert.deepEqual(await snapshot(root), before);
});

test('permission and CLI failures return a partial sanitized report', async t => {
  const { options, data } = await fixture(t);
  const result = await diagnoseEnvironment({ ...options, directoryProbe: async (dir, config) => { if (dir === data) return denied(); return inspectDirectory(dir, config); }, cliProbe: denied });
  assert.equal(item(result, 'storage').code, 'EACCES');
  assert.equal(result.adoptions.count, null);
  assert.equal(item(result, 'node').status, 'ok');
  assert.equal(item(result, 'cli').status, 'unknown');
  assert.equal(item(result, 'registration').status, 'unknown');
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_PATH|SECRET|private response/);
});

test('invalid paths, missing dependencies and unsupported runtime do not abort remaining checks', async t => {
  const { options, env } = await fixture(t);
  const result = await diagnoseEnvironment({ ...options, env: { ...env, CODEX_SKILL_MANAGER_DATA_DIR: 'relative' }, nodeVersion: '20.17.0', platform: 'linux', dependencyResolver: denied });
  assert.equal(item(result, 'paths').code, 'invalid-path');
  assert.equal(item(result, 'node').status, 'error');
  assert.equal(item(result, 'platform').status, 'warning');
  assert.equal(item(result, 'dependencies').status, 'error');
  assert.equal(item(result, 'cli').status, 'ok');
  assert.equal(result.automaticMonitoring, null);
});

test('directory preflight checks ancestors, rejects links and never claims a write test', async () => {
  const target = path.resolve('test-health-directory'), ancestor = path.dirname(target), calls = [];
  await assert.rejects(inspectDirectory(target, { stat: async dir => ({ isSymbolicLink: () => dir === ancestor, isDirectory: () => true }), canAccess: async () => {} }), { code: 'ELINK' });
  const result = await inspectDirectory(target, { writable: true, stat: async dir => {
    if (dir === target) throw Object.assign(new Error(), { code: 'ENOENT' });
    return { isSymbolicLink: () => false, isDirectory: () => true };
  }, canAccess: async dir => { calls.push(dir); } });
  assert.equal(result.exists, false);
  assert.deepEqual(calls, [ancestor]);
});

test('registration distinguishes plugin installation, disabled, legacy, mismatch, duplicates and incomplete evidence', () => {
  assert.equal(registrationCheck(fulfilled([]), fulfilled(installed)).status, 'ok');
  assert.equal(registrationCheck(failed, fulfilled(installed)).status, 'unknown');
  assert.equal(registrationCheck(fulfilled([]), fulfilled([])).code, 'not-registered');
  assert.equal(registrationCheck(fulfilled([]), fulfilled([{ ...installed[0], enabled: false }])).code, 'disabled');
  assert.equal(registrationCheck(fulfilled([{ name: 'codex-skill-manager' }]), fulfilled([])).code, 'legacy-registration');
  const entry = fileURLToPath(new URL('../src/server.mjs', import.meta.url));
  const registration = { name: 'plugin-skill-manager', enabled: true, transport: { type: 'stdio', command: process.execPath, args: [entry], env: { PRIVATE_TOKEN: 'SECRET' } } };
  assert.equal(registrationCheck(fulfilled([registration]), fulfilled([])).code, 'registered');
  assert.equal(registrationCheck(fulfilled([registration]), fulfilled(installed)).code, 'multiple-installations');
  registration.transport.args = ['other-entry'];
  const mismatch = registrationCheck(fulfilled([registration]), fulfilled([]));
  assert.equal(mismatch.code, 'different-entry');
  assert.doesNotMatch(JSON.stringify(mismatch), /SECRET|PRIVATE_TOKEN|other-entry/);
});

test('capture separates disabled, no scan, stale, clock skew, backlog, runtime failure and recent snapshot', async t => {
  const { options, json, data } = await fixture(t), now = Date.now();
  await json('migration.json', { version: 1, files: [] });
  await json('auto-capture-settings.json', { version: 1, enabled: true, intervalSeconds: 10 });
  assert.equal(item(await diagnoseEnvironment(options), 'capture').code, 'no-scan');
  for (const [age, extra, expected] of [[120000, {}, 'stale-scan'], [-120000, {}, 'clock-skew'], [0, { pendingBytes: 1 }, 'partial-coverage'], [0, { issues: [{ path: 'PRIVATE_PATH', reason: 'SECRET' }] }, 'partial-coverage'], [0, {}, 'recent-scan']]) {
    await json('auto-capture.json', { version: 1, files: {}, coverage: { checkedAt: new Date(now - age).toISOString(), ...extra } });
    const result = await diagnoseEnvironment({ ...options, now });
    assert.equal(item(result, 'capture').code, expected);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_PATH|SECRET/);
  }
  const result = await diagnoseEnvironment({ ...options, captureController: { lastError: 'PRIVATE_PATH SECRET' } });
  assert.equal(item(result, 'capture').code, 'collector-error');
  await writeFile(path.join(data, 'plugin-calls.json.lock'), 'private lock owner');
  assert.equal(item(await diagnoseEnvironment(options), 'locks').code, 'locks-present');
  assert.equal(await readFile(path.join(data, 'plugin-calls.json.lock'), 'utf8'), 'private lock owner');
});

test('CLI subprocess timeout kills stalled app-server and command probes', { timeout: 10000 }, async t => {
  const { root, env } = await fixture(t), hang = path.join(root, 'hang.mjs');
  await writeFile(hang, 'await new Promise(() => { setInterval(() => {}, 1000); });');
  const isolated = { ...env, CODEX_SKILL_MANAGER_CLI: process.execPath, NODE_OPTIONS: `--import=${pathToFileURL(hang).href}` };
  const started = Date.now();
  await assert.rejects(queryInstalledPlugins({ env: isolated, timeoutMs: 150 }), { code: 'ETIMEDOUT' });
  await assert.rejects(probeCli('mcp', { env: isolated, timeoutMs: 150 }), error => error.killed === true);
  assert.ok(Date.now() - started < 8000);
});

test('doctor works without npm dependencies or MCP startup and does not initialize data', { timeout: 15000 }, async t => {
  const { root, env, data } = await fixture(t), copy = path.join(root, 'source');
  await mkdir(path.join(copy, 'scripts'), { recursive: true });
  await cp(fileURLToPath(new URL('../src', import.meta.url)), path.join(copy, 'src'), { recursive: true, filter: file => !file.endsWith('assets') });
  await cp(fileURLToPath(new URL('../scripts/doctor.mjs', import.meta.url)), path.join(copy, 'scripts', 'doctor.mjs'));
  const isolated = { ...env, USERPROFILE: root, HOME: root, CODEX_SKILL_MANAGER_CLI: path.join(root, 'missing-cli') };
  const child = await run(process.execPath, ['scripts/doctor.mjs', '--json'], { cwd: copy, env: isolated, windowsHide: true, timeout: 10000 }).catch(error => error);
  assert.equal(child.code, 1);
  const result = JSON.parse(child.stdout);
  assert.equal(item(result, 'dependencies').status, 'error');
  assert.equal(item(result, 'cli').code, 'ENOENT');
  assert.equal(result.adoptions.state, 'empty');
  await assert.rejects(readdir(data), { code: 'ENOENT' });
});

test('installed query preserves split UTF-8 and caps cumulative newline-delimited output', { timeout: 15000 }, async t => {
  const { root, env } = await fixture(t), preload = path.join(root, 'protocol.mjs');
  await writeFile(preload, `
    import {createInterface} from 'node:readline';
    createInterface({input:process.stdin}).on('line',line=>{
      const m=JSON.parse(line);if(m.id===1)process.stdout.write(JSON.stringify({id:1,result:{}})+'\\n');
      if(m.id===2){const b=Buffer.from(JSON.stringify({id:2,result:{marketplaces:[],label:'中文'}})+'\\n');const n=b.indexOf(Buffer.from('中'))+1;process.stdout.write(b.subarray(0,n));setTimeout(()=>process.stdout.write(b.subarray(n)),20);}
    });
    await new Promise(()=>{setInterval(()=>{},1000);});`);
  const isolated = { ...env, CODEX_SKILL_MANAGER_CLI: process.execPath, NODE_OPTIONS: `--import=${pathToFileURL(preload).href}` };
  assert.equal((await queryInstalledPlugins({ env: isolated, timeoutMs: 2000 })).label, '中文');
  await writeFile(preload, `setInterval(()=>process.stdout.write('{}\\n'.repeat(400000)),5);await new Promise(()=>{});`);
  await assert.rejects(queryInstalledPlugins({ env: isolated, timeoutMs: 3000 }), { code: 'EOUTPUTLIMIT' });
});
