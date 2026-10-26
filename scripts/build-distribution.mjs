import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { manifestFiles, marketplace } from './plugin-install.mjs';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const root = path.resolve(process.argv[2] || `dist/distribution-${pkg.version}`);
await mkdir(root);
await mkdir(path.join(root, '.agents/plugins'), { recursive: true });
await mkdir(path.join(root, 'plugins'));
execFileSync(process.execPath, ['scripts/build-plugin.mjs', path.join(root, 'plugins', pkg.name)], { stdio: 'inherit' });
const catalog = JSON.parse(await readFile('packaging/marketplace.json', 'utf8'));
catalog.name = marketplace;
catalog.interface.displayName = 'Plugin & Skill Manager';
await writeFile(path.join(root, '.agents/plugins/marketplace.json'), JSON.stringify(catalog, null, 2) + '\n');
await copyFile('scripts/plugin-install.mjs', path.join(root, 'install.mjs'));
await copyFile('docs/DISTRIBUTION.md', path.join(root, 'README.md'));
await writeFile(path.join(root, 'integrity.json'), JSON.stringify({ format: 1, version: pkg.version, files: await manifestFiles(root) }, null, 2) + '\n');
console.log(`Built complete distribution ${root}`);
