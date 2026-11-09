// Enforces the layer rules in docs/dev/ARCHITECTURE.md. Fails (exit 1) on any forbidden import.
// Run: pnpm run check:architecture
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseJavaScript } from '../src/backend/vendor/js-parser.mjs';

const root = process.cwd();
const rel = file => path.relative(root, file).split(path.sep).join('/');

async function sources(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await sources(file));
    else if (entry.name.endsWith('.mjs')) out.push(file);
  }
  return out;
}

function imports(code) {
  const ast = parseJavaScript(code, { ecmaVersion: 'latest', sourceType: 'module' });
  const specs = [];
  const visit = node => {
    if (!node || typeof node.type !== 'string') return;
    if ((node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source) specs.push(node.source.value);
    if (node.type === 'ImportExpression' && node.source.type === 'Literal') specs.push(node.source.value);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast);
  return specs;
}

// Layer of a source file (first matching prefix wins).
const layers = [
  ['src/server.mjs', 'entry'],
  ['src/backend/main.mjs', 'entry'],
  ['src/backend/container.mjs', 'composition'],
  ['src/backend/domain/', 'domain'],
  ['src/backend/application/', 'application'],
  ['src/backend/ports/', 'ports'],
  ['src/backend/contracts/', 'contracts'],
  ['src/backend/config/', 'config'],
  ['src/backend/vendor/', 'vendor'],
  ['src/backend/runtime/', 'runtime'],
  ['src/backend/adapters/', 'adapters'],
  ['src/backend/inbound/', 'inbound'],
  ['src/frontend/', 'frontend'],
];
const layerOf = file => layers.find(([prefix]) => file === prefix || file.startsWith(prefix))?.[1] ?? 'unknown';

// Which layers each layer may import (relative imports).
const allowed = {
  entry: ['entry', 'composition', 'inbound', 'adapters', 'config'],
  composition: ['adapters', 'application', 'domain', 'config', 'ports', 'contracts', 'runtime', 'vendor'],
  domain: ['domain'],
  application: ['application', 'domain', 'ports'],
  ports: ['ports'],
  contracts: ['contracts'],
  config: ['config', 'vendor', 'runtime', 'ports'],
  vendor: [],
  runtime: ['runtime'],
  adapters: ['adapters', 'ports', 'domain', 'vendor', 'runtime'],
  inbound: ['inbound', 'composition', 'contracts', 'ports', 'runtime', 'package'],
  frontend: ['frontend', 'package'],
};
// Node built-ins: pure helpers are allowed in application; domain and frontend get none.
const nodeAllowed = {
  domain: [], frontend: [], ports: [], contracts: [],
  application: ['node:path', 'node:crypto'],
};
// Third-party packages and where they may be imported.
const packages = {
  yaml: ['vendor'], acorn: ['vendor'], 'smol-toml': ['vendor'],
  zod: ['contracts', 'config'],
  '@modelcontextprotocol/sdk': ['inbound', 'entry'],
  '@modelcontextprotocol/ext-apps': ['frontend'],
};

const violations = [];
for (const file of await sources(path.join(root, 'src'))) {
  const from = rel(file), layer = layerOf(from);
  if (layer === 'unknown') { violations.push(`${from}: file is outside every known layer`); continue; }
  for (const spec of imports(await readFile(file, 'utf8'))) {
    if (spec.startsWith('node:')) {
      const list = nodeAllowed[layer];
      if (list && !list.includes(spec)) violations.push(`${from}: ${layer} may not import ${spec}`);
      continue;
    }
    if (spec.startsWith('.')) {
      const target = rel(path.resolve(path.dirname(file), spec));
      const targetLayer = target === 'package.json' ? 'package' : layerOf(target);
      if (targetLayer !== layer && !allowed[layer].includes(targetLayer)) violations.push(`${from}: ${layer} may not import ${targetLayer} (${spec})`);
      continue;
    }
    const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    const where = packages[pkg];
    if (!where) violations.push(`${from}: unknown package "${pkg}" (declare it in scripts/check-architecture.mjs)`);
    else if (!where.includes(layer)) violations.push(`${from}: ${layer} may not import package ${pkg}`);
  }
}

if (violations.length) { console.error(`Architecture violations (${violations.length}):\n  ${violations.join('\n  ')}`); process.exit(1); }
console.log('Architecture rules satisfied.');
