import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityIcon, safeActivityIcon } from '../src/activity-icons.mjs';
test('activity icons resolve namespaces without changing call identities', () => {
  const registry = [{ id: 'github@openai-curated-remote', icon: 'https://files.openai.com/github.png' }];
  for (const id of ['github', 'github@openai-curated-remote']) assert.equal(activityIcon({id}, registry).icon, registry[0].icon);
  for (const id of ['cua_repl', 'codex_app', 'node_repl', 'search_service']) assert.equal(activityIcon({id}, registry).openai, true);
  assert.ok(safeActivityIcon(activityIcon({id:'plugin_skill_manager'}, [{id:'plugin-skill-manager@local',icon:'data:image/png;base64,YQ=='}]).icon));
  assert.deepEqual(activityIcon({id:'unknown'}, registry), {});
  assert.equal(activityIcon({id:'sider_scholar'}, [{id:'app-example@remote',displayName:'Sider Scholar',icon:'data:image/png;base64,YQ=='}]).icon, 'data:image/png;base64,YQ==');
  assert.equal(safeActivityIcon('https://example.org/icon.svg'), false);
});
