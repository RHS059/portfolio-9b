import test from 'node:test';
import assert from 'node:assert/strict';
import {createProvenancePanel} from '../../src/ui/provenance/index.js';

// This host checks class application across imperative re-renders, not layout.
function setup(theme) {
  const doc={activeElement:null};
  const element=()=>({classes:new Set(),classList:{add(...names){for(const name of names)this.owner.classes.add(name);}}});
  class Root {
    constructor(){this.ownerDocument=doc;this.children=[];this.scrollTop=0;this.buttons=[];this.labels=[];}
    set innerHTML(value){this.html=value;this.buttons=[element(),element()];this.labels=[element()];for(const node of [...this.buttons,...this.labels])node.classList.owner=node;}
    get innerHTML(){return this.html;}
    appendChild(node){this.children.push(node);return node;}
    setAttribute(){} addEventListener(){} removeEventListener(){} contains(){return false;} remove(){}
    querySelectorAll(selector){return selector==='button'?this.buttons:selector==='.fp-kicker'?this.labels:[];}
  }
  doc.createElement=()=>new Root();
  const container=new Root();
  const panel=createProvenancePanel({container,onAction:()=>{},theme});
  return {panel,root:container.children[0]};
}

test('native provenance consumes supplied portfolio CSS classes on every render',()=>{
  const {panel,root}=setup({controlClassName:'portfolio_control shared-control',eyebrowClassName:'portfolio_eyebrow'});
  for(let i=0;i<2;i++){
    panel.update({});
    for(const button of root.buttons)assert.deepEqual([...button.classes],['fp-native-control','portfolio_control','shared-control']);
    for(const label of root.labels)assert.deepEqual([...label.classes],['portfolio_eyebrow']);
  }
  panel.dispose();
});

test('standalone provenance has no added portfolio theme classes',()=>{
  const {panel,root}=setup();panel.update({});
  for(const node of [...root.buttons,...root.labels])assert.equal(node.classes.size,0);
  panel.dispose();
});

test('standalone button appearance cannot override native portfolio controls',async()=>{
  const {panelStyles}=await import('../../src/ui/provenance/styles.js');
  assert.ok(panelStyles.includes('.fp-panel button:not(.fp-native-control){'));
  assert.ok(panelStyles.includes('.fp-panel .fp-record button:not(.fp-native-control){font-size:10px;min-height:36px}'));
});
