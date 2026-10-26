import test from 'node:test';
import assert from 'node:assert/strict';
import { recordingStatus } from '../src/recording-status.mjs';

test('recording status distinguishes empty, recorded and unreadable without writes', async () => {
  const empty = await recordingStatus({ read: async () => ({ batches: {} }) }, { read: async () => ({ calls: [] }) });
  assert.equal(empty.adoptions.state, 'empty');
  assert.equal(empty.adoptions.latestReceivedAt, null);
  assert.equal(empty.hostWideCoverage, 'unknown');
  const result = await recordingStatus({ read: async () => ({ batches: { first: { at: '2026-01-01T00:00:00Z', skills: ['a', 'a'] }, next: { at: '2026-01-02T00:00:00Z', skills: ['b'] } } }) }, { read: async () => { throw new Error('corrupt'); } });
  assert.equal(result.adoptions.state, 'recorded');
  assert.equal(result.adoptions.count, 3);
  assert.equal(result.adoptions.latestReceivedAt, '2026-01-02T00:00:00Z');
  assert.equal(result.pluginCalls.state, 'unavailable');
  assert.equal(result.pluginCalls.count, null);
});
