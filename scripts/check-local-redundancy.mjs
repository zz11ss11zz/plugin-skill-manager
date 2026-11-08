import {scanInventory} from '../src/backend/adapters/hosts/codex/skill-source.mjs';
import {loadPluginStatus,applyPluginStatus} from '../src/backend/adapters/hosts/codex/plugin-registry.mjs';
import {Adoptions} from '../src/backend/adapters/storage/json-file/adoptions.mjs';
import {PluginCalls} from '../src/backend/adapters/storage/json-file/plugin-calls.mjs';
import { redundancyReportWithDefaults as redundancyReport } from '../src/backend/container.mjs';
const inventory=applyPluginStatus(await scanInventory(),await loadPluginStatus());
const report=await redundancyReport(inventory,{adoptions:await new Adoptions().summary({timeZone:'UTC'}),calls:await new PluginCalls().summary({timeZone:'UTC'})});
console.log(JSON.stringify({scope:report.scope,groups:report.skills.map(g=>({types:g.types,names:g.members.map(m=>m.name)})),pluginGroups:report.plugins.length,inactivity:{cutoff:report.inactivity.cutoff,skills:report.inactivity.skills.map(m=>({name:m.name,state:m.state,last:m.lastRecorded})),plugins:report.inactivity.plugins.map(m=>({name:m.name,state:m.state,last:m.lastRecorded}))}},null,2));
