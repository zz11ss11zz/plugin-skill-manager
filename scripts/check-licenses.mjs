// Fails when a production dependency (bundled into the shipped plugin) uses a license outside the
// allowlist. Input: the JSON written by `pnpm licenses list --prod --json` (file path or stdin).
//   pnpm licenses list --prod --json > licenses.json && node scripts/check-licenses.mjs licenses.json
import { readFile } from 'node:fs/promises';

// Permissive licenses compatible with distributing the bundle under Apache-2.0.
const ALLOWED = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'BlueOak-1.0.0']);

const readStdin = async () => { let text = ''; for await (const chunk of process.stdin) text += chunk; return text; };
const input = process.argv[2] ? await readFile(process.argv[2], 'utf8') : await readStdin();
const byLicense = JSON.parse(input);

// SPDX expressions such as "(MIT OR Apache-2.0)" pass when any alternative is allowed.
const acceptable = expression => expression.replace(/[()]/g, ' ').split(/\s+OR\s+/i).some(part => ALLOWED.has(part.trim()));

const rejected = [];
let packages = 0;
for (const [license, entries] of Object.entries(byLicense)) {
  for (const entry of entries) {
    packages++;
    if (!acceptable(license)) rejected.push(`${entry.name}@${(entry.versions || [entry.version]).join(',')}: ${license}`);
  }
}

if (rejected.length) {
  console.error(`Production dependencies with licenses outside the allowlist:\n  ${rejected.join('\n  ')}`);
  console.error('Review the license, then extend ALLOWED in scripts/check-licenses.mjs only if it is compatible.');
  process.exit(1);
}
console.log(`Licenses OK: ${packages} production packages (${Object.keys(byLicense).sort().join(', ')}).`);
