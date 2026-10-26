import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, readdir, cp } from 'node:fs/promises';
import path from 'node:path';

// A fresh directory avoids retaining private state from an earlier test run.
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const root = path.resolve(process.argv[2] || path.join('dist', `plugin-${pkg.version}`));
await mkdir(root); // Fail closed if the destination already exists.
for (const dir of ['assets', 'server/src/assets']) await mkdir(path.join(root, dir), { recursive: true });
const html = await readFile('dist/dashboard.html', 'utf8');
const embeddedModule = path.resolve('src/bundled-dashboard.mjs');
const bundle = await build({
  entryPoints: ['src/server.mjs'], outfile: path.join(root, 'server/src/server.mjs'),
  bundle: true, platform: 'node', target: 'node20', format: 'esm', metafile: true,
  banner: { js: "import { createRequire as bundleCreateRequire } from 'node:module'; const require = bundleCreateRequire(import.meta.url);" },
  plugins: [{ name: 'bundle-dashboard', setup(builder) {
    builder.onLoad({ filter: /bundled-dashboard\.mjs$/ }, ({ path: file }) => {
      if (file !== embeddedModule) return;
      return { contents: `export const bundledDashboard = ${JSON.stringify(html)};`, loader: 'js' };
    });
  } }],
});
const manifest = {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
  name: pkg.name, version: pkg.version, description: 'Local skill inventory and adoption records for Codex.',
  license: 'Apache-2.0', repository: 'https://github.com/zz11ss11zz/codex-skill-manager',
  extensions: { 'com.openai': {
    onboardingSkill: './skills/setup/SKILL.md',
    interface: JSON.parse(await readFile('packaging/interface.json', 'utf8')),
    review: { test_cases: JSON.parse(await readFile('packaging/review-cases.json', 'utf8')) },
    publication: { release_notes: 'Prebuilt installation, recording setup, separate inventory management and a color icon. Native desktop review remains pending.' },
  } },
};
const mcp = { mcpServers: { 'codex-skill-manager': { type: 'stdio', command: 'node', args: ['${PLUGIN_ROOT}/server/src/server.mjs'], cwd: '${PLUGIN_ROOT}' } } };
for (const [name, data] of [['plugin.json', manifest], ['mcp.json', mcp]]) await writeFile(path.join(root, name), JSON.stringify(data, null, 2) + '\n');
for (const dest of ['assets/icon.png', 'server/src/assets/orbit-color.png']) await copyFile('src/assets/orbit-color.png', path.join(root, dest));
const dependencies = new Set(Object.keys(bundle.metafile.inputs).flatMap(file => {
  const match = file.replaceAll('\\', '/').match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//);
  return match ? [match[1]] : [];
}));
const notices = [];
for (const dependency of [...dependencies].sort()) {
  const info = JSON.parse(await readFile(path.join(dependency, 'package.json'), 'utf8'));
  const files = (await readdir(dependency)).filter(name => /^(license|notice|copying)(\.|$)/i.test(name));
  if (!files.length) throw new Error(`Missing license notice: ${info.name}`);
  notices.push(`${info.name}@${info.version}\n${(await Promise.all(files.map(file => readFile(path.join(dependency, file), 'utf8')))).join('\n')}`);
}
await writeFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), notices.join('\n\n---\n\n'));
for (const name of ['LICENSE', 'NOTICE']) await copyFile(name, path.join(root, name));
await copyFile('docs/PLUGIN_TESTING.md', path.join(root, 'README.md'));
await copyFile('docs/DATA_MIGRATION.md', path.join(root, 'DATA_MIGRATION.md'));
await cp('skills/skill-manager', path.join(root, 'skills/skill-manager'), { recursive: true });
await cp('skills/setup', path.join(root, 'skills/setup'), { recursive: true });
console.log(`Built ${root}`);
