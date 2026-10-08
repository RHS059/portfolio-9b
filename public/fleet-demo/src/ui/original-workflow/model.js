/** Local reconstruction of the supplied WEX asset-linking recording.
 * Records are synthetic and immutable. A repair adds an association only.
 */
export const WORKFLOW_DURATION=21;
export const SAMPLE_ASSETS=Object.freeze([
  {id:'RAD-001',category:'Computer & IT Equipment',year:'2019',make:'Motorola',model:'Portable radio',status:'In Service',type:'Portable Radio'},
  {id:'TRK-104',category:'Vehicle',year:'2019',make:'Ford',model:'F-150',status:'In Service',type:'Pickup'},
  {id:'EQ-081',category:'Protective Gear',year:'2020',make:'Fleet equipment',model:'Safety vest',status:'In Service',type:'Vest'},
  {id:'EQ-082',category:'Protective Gear',year:'2020',make:'Fleet equipment',model:'Safety vest',status:'In Service',type:'Vest'},
  {id:'EQ-083',category:'Protective Gear',year:'2020',make:'Fleet equipment',model:'Safety vest',status:'In Service',type:'Vest'},
].map(Object.freeze));
export const SAMPLE_RECORDS=Object.freeze([
  {id:'DEMO-001',date:'10/05/2021 7:05 AM',importedAsset:'CARD-104',meter:'50,000.0',unit:'$3.000',quantity:'12.000 Gallons(s)',gross:'$36.00',total:'$36.00',employee:'DEMO-104'},
  {id:'DEMO-002',date:'10/05/2021 5:44 PM',importedAsset:'CARD-307',meter:'50,120.0',unit:'$3.000',quantity:'10.000 Gallons(s)',gross:'$30.00',total:'$30.00',employee:'DEMO-307'},
  {id:'DEMO-003',date:'10/05/2021 10:17 PM',importedAsset:'CARD-208',meter:'42,080.0',unit:'$3.000',quantity:'8.000 Gallons(s)',gross:'$24.00',total:'$24.00',employee:'DEMO-208'},
  {id:'DEMO-004',date:'10/05/2021 5:33 PM',importedAsset:'CARD-412',meter:'61,400.0',unit:'$3.000',quantity:'5.000 Gallons(s)',gross:'$15.00',total:'$15.00',employee:'DEMO-412'},
  {id:'DEMO-005',date:'10/05/2021 8:42 AM',importedAsset:'CARD-412',meter:'61,390.0',unit:'$3.000',quantity:'6.000 Gallons(s)',gross:'$18.00',total:'$18.00',employee:'DEMO-412'},
  ...Array.from({length:16},(_,i)=>({id:`DEMO-${String(i+6).padStart(3,'0')}`,date:`10/05/2021 ${i%9+1}:20 AM`,importedAsset:`CARD-${500+i}`,meter:`${45+i},000.0`,unit:'$3.000',quantity:'10.000 Gallons(s)',gross:'$30.00',total:'$30.00',employee:`DEMO-${500+i}`})),
].map(Object.freeze));
export function createWorkflowState(){return {selectedRecordId:'DEMO-002',view:'records',chosenAssetId:'',links:{'DEMO-001':'TRK-104'},savedMappings:{},notice:'',phase:'unmatched',cursorTarget:'asset-button'};}
export function selectedRecord(state){return SAMPLE_RECORDS.find(item=>item.id===state.selectedRecordId)||SAMPLE_RECORDS[1];}
export function assetLabel(id){const a=SAMPLE_ASSETS.find(item=>item.id===id);return a?`${a.id}: ${a.year} ${a.make} ${a.model}`:'';}
export function reduceWorkflow(state,action){
  if(!state||!action)return state;
  if(action.type==='reset')return createWorkflowState();
  if(action.type==='select-record'&&SAMPLE_RECORDS.some(item=>item.id===action.id))return {...state,selectedRecordId:action.id,view:'records',chosenAssetId:'',notice:''};
  if(action.type==='open-asset'&&!state.links[state.selectedRecordId])return {...state,view:'asset',chosenAssetId:'',notice:''};
  if(action.type==='open-picker'&&state.view==='asset')return {...state,view:'picker'};
  if(action.type==='choose-asset'&&state.view==='picker'&&SAMPLE_ASSETS.some(item=>item.id===action.id))return {...state,view:'asset',chosenAssetId:action.id};
  if(action.type==='cancel')return {...state,view:state.view==='picker'?'asset':'records',chosenAssetId:state.view==='picker'?state.chosenAssetId:'',notice:''};
  if(action.type==='set-asset'&&state.view==='asset'&&SAMPLE_ASSETS.some(item=>item.id===state.chosenAssetId)){
    const record=selectedRecord(state);
    return {...state,view:'records',links:{...state.links,[record.id]:state.chosenAssetId},savedMappings:{...state.savedMappings,[record.importedAsset]:state.chosenAssetId},notice:'All changes have been saved.'};
  }
  if(action.type==='refresh'||action.type==='dismiss-notice')return {...state,notice:''};
  return state;
}
/** Source-paced observed screens; the ending resets for the requested loop. */
export function sampleWorkflow(timeSeconds=0){
  const time=((Number.isFinite(timeSeconds)?timeSeconds:0)%WORKFLOW_DURATION+WORKFLOW_DURATION)%WORKFLOW_DURATION;
  let state=createWorkflowState();if(time<4.6)return state;
  state=reduceWorkflow(state,{type:'open-asset'});if(time<6)return {...state,phase:'asset-dialog',cursorTarget:'picker-toggle'};
  state=reduceWorkflow(state,{type:'open-picker'});if(time<11.7)return {...state,phase:'asset-picker',cursorTarget:'asset-choice'};
  state=reduceWorkflow(state,{type:'choose-asset',id:'TRK-104'});if(time<14.7)return {...state,phase:'asset-chosen',cursorTarget:'set-asset'};
  state=reduceWorkflow(state,{type:'set-asset'});return {...state,phase:'linked',cursorTarget:'linked-record',notice:time<18?'All changes have been saved.':''};
}
