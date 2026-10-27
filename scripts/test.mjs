import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const files = (await readdir(new URL('../test', import.meta.url))).filter(name => name.endsWith('.test.mjs')).sort().map(name => `test/${name}`);
// Explicit files work on Node 20 and 24 on Windows; serialize filesystem fixtures.
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...files], { cwd: root, stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
