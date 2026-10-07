import test from 'node:test';
import assert from 'node:assert/strict';
import { workshopPresentation } from './state.js';

test('empty snapshots have no implied workshop occupants', () => {
  for (const value of [undefined, null, {}, { vehicles: null }]) {
    const state = workshopPresentation(value);
    assert.equal(state.occupied, 0); assert.equal(state.overflow, 0);
    assert.match(state.label, /Fictional.*reconstruction/);
  }
});
test('only an explicit bay route or in-bay status indicates occupancy', () => {
  for (const status of ['workshop', 'in-service', 'maintenance', 'in-bay', 'WORKSHOP']) {
    assert.equal(workshopPresentation({ vehicles: [{ id: 'TRK-104', status }] }).occupied, 1);
  }
  for (const status of ['moving', 'en-route-to-service', 'returning', '', undefined]) {
    assert.equal(workshopPresentation({ vehicles: [{ id: 'TRK-104', status }] }).occupied, 0);
  }
});
test('selected ID, odometer, issue and authority never invent a workshop trip', () => {
  const state = workshopPresentation({ selectedId:'TRK-104', issueActive:true, authorityResolved:false, odometer:900000, vehicles:[{id:'TRK-104',status:'moving'}] });
  assert.equal(state.occupied,0); assert.equal(state.selectedId,'TRK-104'); assert.equal(state.issueActive,true);
});
test('occupancy is deduplicated, stable and capacity-bounded', () => {
  const state = workshopPresentation({vehicles:[{id:'TRK-208',status:'workshop'},{id:'TRK-104',status:'maintenance'},{id:'TRK-208',status:'workshop'},{id:'TRK-300',status:'workshop'}]});
  assert.deepEqual(state.occupants,['TRK-104','TRK-208']); assert.equal(state.overflow,1); assert.equal(state.occupied,2);
});
test('snapshot and nested records remain unchanged and results are frozen', () => {
  const snapshot = Object.freeze({vehicles:Object.freeze([Object.freeze({id:'TRK-104',status:'workshop'})])});
  const before = JSON.stringify(snapshot), state = workshopPresentation(snapshot);
  assert.equal(JSON.stringify(snapshot),before); assert.ok(Object.isFrozen(state)); assert.ok(Object.isFrozen(state.occupants));
});
test('repeated updates and replay reset do not accumulate visits', () => {
  const snapshot={vehicles:[{id:'TRK-104',status:'workshop'}],timeSeconds:10};
  const first=workshopPresentation(snapshot);
  for(let i=0;i<100;i++) assert.deepEqual(workshopPresentation({...snapshot,timeSeconds:999}),first);
  assert.equal(workshopPresentation({timeSeconds:0,vehicles:[]}).occupied,0);
});
test('invalid vehicle records are harmless', () => {
  assert.equal(workshopPresentation({vehicles:[null,{}, {id:4,status:'workshop'}, {id:'',status:'moving'}]}).occupied,0);
});

test('a ready tractor still physically occupies its assigned bay without implying another service',()=>{const snapshot=Object.freeze({vehicles:Object.freeze([Object.freeze({id:'TRK-104',routeId:'depot-bay',status:'ready for work'})])});assert.deepEqual(workshopPresentation(snapshot).occupants,['TRK-104']);assert.equal(snapshot.vehicles[0].status,'ready for work');});
