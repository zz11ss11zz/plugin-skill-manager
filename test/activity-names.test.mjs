import test from 'node:test';
import assert from 'node:assert/strict';
import {activityView} from '../src/activity.mjs';
test('installed app display names replace opaque IDs without changing identities',()=>{
 const id='app-6948b485f5bc8191adb4df13f369cec7@openai-curated-remote';
 const usage={coverage:{from:'2026-01-01T00:00:00Z',to:'2026-01-02T00:00:00Z'},activity:{days:[]}};
 for(const displayName of ['Sider Scholar','',undefined]){
 const view=activityView({skills:[],usage,pluginRegistry:{plugins:[{id,displayName}]}},'plugins',2026,'calls');
 assert.equal(view.all[0].id,id);assert.equal(view.all[0].name,displayName||id.split('@')[0]);
 }
});
