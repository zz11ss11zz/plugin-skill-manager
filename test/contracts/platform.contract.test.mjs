// Every platform adapter must satisfy the Platform port. New operating systems add a row here.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { win32 } from '../../src/backend/adapters/platform/win32.mjs';
import { darwin } from '../../src/backend/adapters/platform/darwin.mjs';
import { linux } from '../../src/backend/adapters/platform/linux.mjs';
import { selectPlatform } from '../../src/backend/adapters/platform/index.mjs';
import { CAPABILITIES } from '../../src/backend/ports/platform.mjs';

const known = new Set(Object.values(CAPABILITIES));
for (const [name, create] of Object.entries({ win32, darwin, linux })) {
  test(`${name} platform adapter satisfies the Platform port`, () => {
    const platform = create({ APPDATA: path.resolve('/appdata'), XDG_CONFIG_HOME: path.resolve('/xdg') });
    assert.equal(platform.id, name);
    assert.ok(platform.capabilities instanceof Set);
    for (const capability of platform.capabilities) assert.ok(known.has(capability), capability);
    assert.equal(typeof platform.pathsEqual, 'function');
    assert.ok(platform.pathsEqual('/a/b', '/a/b'));
    assert.ok(path.isAbsolute(platform.userConfigDir('app')));
    assert.ok(platform.userConfigDir('app').endsWith('app'));
    assert.ok(Array.isArray(platform.trustedSystemLinks));
    assert.ok(Object.isFrozen(platform));
  });
}

test('only Windows is case-insensitive and only accepted platforms expose archive moves', () => {
  assert.ok(win32().pathsEqual('/A/B', '/a/b'));
  assert.ok(!linux().pathsEqual('/A/B', '/a/b'));
  assert.ok(win32().capabilities.has(CAPABILITIES.archive));
  assert.ok(!darwin().capabilities.has(CAPABILITIES.archive));
  assert.ok(!linux().capabilities.has(CAPABILITIES.archive));
  assert.deepEqual([...darwin().trustedSystemLinks], ['/var', '/tmp', '/etc']);
  assert.equal(linux({ XDG_CONFIG_HOME: 'relative' }).userConfigDir('app').includes('.config'), true, 'relative XDG paths are ignored');
  assert.equal(selectPlatform('freebsd').id, 'linux', 'unknown POSIX systems fall back to the conservative adapter');
});
