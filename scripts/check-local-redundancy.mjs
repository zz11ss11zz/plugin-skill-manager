import {scanInventory} from '../src/inventory.mjs';
import {loadPluginStatus,applyPluginStatus} from '../src/plugins.mjs';
import {Adoptions} from '../src/adoptions.mjs';
import {PluginCalls} from '../src/plugin-calls.mjs';
import {redundancyReport} from '../src/redundancy.mjs';
const inventory=applyPluginStatus(await scanInventory(),await loadPluginStatus());
const report=await redundancyReport(inventory,{adoptions:await new Adoptions().summary({timeZone:'UTC'}),calls:await new PluginCalls().summary({timeZone:'UTC'})});
console.log(JSON.stringify({scope:report.scope,groups:report.skills.map(g=>({types:g.types,names:g.members.map(m=>m.name)})),pluginGroups:report.plugins.length,inactivity:{cutoff:report.inactivity.cutoff,skills:report.inactivity.skills.map(m=>({name:m.name,state:m.state,last:m.lastRecorded})),plugins:report.inactivity.plugins.map(m=>({name:m.name,state:m.state,last:m.lastRecorded}))}},null,2));
