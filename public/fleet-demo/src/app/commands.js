/** Translate UI intent without widening an ambiguous exclusion. Domain validation follows. */
export function buildConfigurationCommand({action,selectedVehicleId,configVersion,asOf,id}) {
  const command={id,expectedVersion:configVersion,effectiveFrom:asOf,vehicleId:action.vehicleId||selectedVehicleId,sourceId:action.sourceId,reason:'Explicit user choice in the synthetic working demo.'};
  if(action.type==='set-authority')return{...command,type:'set-authority',field:'odometer'};
  if(action.type!=='add-exclusion')throw new Error('Unsupported settings action.');
  const scope=action.scope??(action.readingId?'reading':null);
  if(!['reading','field','vehicle','integration'].includes(scope))throw new Error('Choose a valid exclusion scope before applying the change.');
  if(scope==='reading'){
    if(!action.readingId)throw new Error('Choose a reading to exclude.');
    return{...command,type:'exclude-reading',readingId:action.readingId,field:action.field||'odometer'};
  }
  if(action.readingId)throw new Error('A reading ID cannot be combined with a broader exclusion scope.');
  command.type='exclude-source';
  if(scope==='integration')delete command.vehicleId;
  if(scope==='field')command.field=action.field||'odometer';
  return command;
}
