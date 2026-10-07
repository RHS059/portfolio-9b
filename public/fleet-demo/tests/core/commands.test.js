import test from 'node:test';
import assert from 'node:assert/strict';
import {buildConfigurationCommand as build} from '../../src/app/commands.js';
const base={selectedVehicleId:'TRK-104',configVersion:1,asOf:'2026-01-12T03:00:00Z',id:'ui-1'};
test('UI exclusion scopes remain explicit and never widen an unknown scope',()=>{
 for(const scope of [null,'', 'source','vehcile'])assert.throws(()=>build({...base,action:{type:'add-exclusion',sourceId:'A',scope}}),/valid exclusion scope/);
 const field=build({...base,action:{type:'add-exclusion',sourceId:'A',scope:'field'}});assert.equal(field.vehicleId,'TRK-104');assert.equal(field.field,'odometer');
 const vehicle=build({...base,action:{type:'add-exclusion',sourceId:'A',scope:'vehicle'}});assert.equal(vehicle.vehicleId,'TRK-104');assert.equal(vehicle.field,undefined);
 const integration=build({...base,action:{type:'add-exclusion',sourceId:'A',scope:'integration'}});assert.equal(integration.vehicleId,undefined);assert.equal(integration.field,undefined);
});
test('row exclusion requires its exact row and cannot carry conflicting broad scope',()=>{
 const row=build({...base,action:{type:'add-exclusion',sourceId:'A',scope:'reading',readingId:'v1-a-3'}});assert.equal(row.readingId,'v1-a-3');assert.equal(row.type,'exclude-reading');
 assert.throws(()=>build({...base,action:{type:'add-exclusion',sourceId:'A',scope:'reading'}}),/Choose a reading/);
 assert.throws(()=>build({...base,action:{type:'add-exclusion',sourceId:'A',scope:'integration',readingId:'v1-a-3'}}),/broader exclusion/);
});
