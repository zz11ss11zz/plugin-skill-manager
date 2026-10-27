import test from 'node:test';
import assert from 'node:assert/strict';
import { publishDataDirectory } from '../src/data-migration.mjs';
test('Windows publication retries only a transient denial with absent destination and stops at its bound', async () => {
  let attempts = 0;
  const denied = Object.assign(new Error('busy'), {code:'EPERM'});
  const options = { platform:'win32', inspect:async p=>p==='source'?{}:null, wait:async()=>{}, move:async()=>{if(++attempts<3) throw denied;} };
  await publishDataDirectory('source','target',options); assert.equal(attempts,3);
  attempts=0;
  await assert.rejects(publishDataDirectory('source','target',{...options,inspect:async()=>({})}),/busy/); assert.equal(attempts,1);
  attempts=0;
  await assert.rejects(publishDataDirectory('source','target',{...options,move:async()=>{attempts++;throw denied;}}),/busy/); assert.equal(attempts,4);
});
