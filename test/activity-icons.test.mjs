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

test('historical finance and tool-only services have embedded official icons', () => {
  for (const id of ['moomoo_readonly', 'robinhood_trading', 'interactive_brokers_ibkr', 'binance', 'elicit', '2_2_calculator']) {
    const entry = {id};
    const visual = activityIcon(entry);
    assert.ok(safeActivityIcon(visual.icon), id);
    assert.match(visual.icon, /^data:image\//);
    if (visual.iconDark) assert.ok(safeActivityIcon(visual.iconDark));
    assert.equal(entry.id, id);
    assert.equal(activityIcon({id:id.replaceAll('_','-')+'@historical'}).icon, visual.icon);
  }
  const icon = 'https://files.openai.com/current.png';
  assert.equal(activityIcon({id:'binance'}, [{id:'binance@curated',icon}]).icon, icon);
  assert.deepEqual(activityIcon({id:'unknown_service'}), {});
  assert.equal(safeActivityIcon('data:image/x-icon;base64,AAABAA=='), true);
  assert.equal(safeActivityIcon('data:text/html;base64,YQ=='), false);
});
