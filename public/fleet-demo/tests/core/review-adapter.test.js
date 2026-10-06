import test from 'node:test';
import assert from 'node:assert/strict';
import * as domain from '../../src/domain/readings/index.js';
import {reviewFixture} from '../../src/app/review-adapter.js';
test('app review preserves input and exposes labeled, scoped, in-app findings',async()=>{
 const scenario=domain.createScenario({authorityApplied:false}),before=JSON.stringify(scenario);
 const result=await reviewFixture({domain,scenario,vehicleId:'TRK-104'});
 assert.equal(result.mode,'simulated');assert.equal(result.live,false);assert.equal(result.notification.channel,'in-app only');assert.ok(result.findings.length>0);assert.equal(JSON.stringify(scenario),before);assert.equal(domain.replayReadings(scenario).vehicles.find(v=>v.vehicleId==='TRK-104').status,'unresolved');
});
