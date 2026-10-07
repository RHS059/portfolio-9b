import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePortTransfer,resolvePortCargo,validatePortAnchorBindings} from './process-motion.js';
const bindings=[{id:'ship-slot',parentId:'ship',ownerKind:'ship',berthIndex:0,position:[0,-51,15.75]},
 {id:'hook',parentId:'crane',ownerKind:'crane',berthIndex:0,position:[0,0,30]},
 {id:'trailer-deck',parentId:'trailer',ownerKind:'trailer',berthIndex:0,position:[0,0,2.75]}];
const anchors=validatePortAnchorBindings(bindings,2);
const cargo={id:'CARGO-01-B0001',transferId:'transfer',owner:{kind:'crane',id:'crane',anchorId:'hook'},attachment:{parentId:'crane',anchorId:'hook'},motion:{fromAnchorId:'ship-slot',toAnchorId:'trailer-deck',progress:.5}};
test('motion lifts, traverses and lowers exactly to supplied endpoints, with no clock',()=>{
 const a=bindings[0].position,b=bindings[2].position;
 assert.deepEqual(samplePortTransfer(a,b,0),a);assert.deepEqual(samplePortTransfer(a,b,1),b);
 assert.deepEqual(samplePortTransfer(a,b,.25),[0,-51,30]);assert.deepEqual(samplePortTransfer(a,b,.75),[0,0,30]);
 assert.deepEqual(samplePortTransfer(a,b,.5),[0,-25.5,30]);
 for(const p of [.249999,.250001,.749999,.750001])assert.ok(samplePortTransfer(a,b,p).every(Number.isFinite));
 assert.equal(samplePortTransfer(a,b,NaN),null);assert.equal(samplePortTransfer([NaN,0,0],b,.5),null);
});
test('cargo uses explicit matching owner/attachment facts and hides after trailer handoff',()=>{
 const resolved=resolvePortCargo(cargo,anchors);assert.equal(resolved.cargoId,cargo.id);assert.equal(resolved.attachedToHoist,true);assert.deepEqual(resolved.position,[0,-25.5,30]);
 assert.equal(resolvePortCargo({...cargo,owner:{kind:'trailer',id:'trailer',anchorId:'trailer-deck'},attachment:{parentId:'trailer',anchorId:'trailer-deck'}},anchors),null);
 assert.equal(resolvePortCargo({...cargo,attachment:{parentId:'other',anchorId:'hook'}},anchors),null);
 assert.equal(resolvePortCargo({...cargo,motion:{...cargo.motion,toAnchorId:'unknown'}},anchors),null);
});
test('anchor validation freezes copies and rejects excess, duplicates and unsupported coordinates',()=>{
 const copy=bindings.map(a=>({...a,position:a.position.slice()}));const result=validatePortAnchorBindings(copy,2);copy[0].position[0]=22;assert.equal(result.get('ship-slot').position[0],0);assert.ok(Object.isFrozen(result.get('ship-slot').position));
 for(const b of [[...bindings,bindings[0]],[{...bindings[0],position:[0,0,Infinity]}],[{...bindings[0],berthIndex:2}]])assert.throws(()=>validatePortAnchorBindings(b,2),TypeError);
});
