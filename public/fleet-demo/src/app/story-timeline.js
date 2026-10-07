/** Editorial presentation only. This timeline never creates telemetry or service facts. */
export const STORY_TITLE = 'The Same Truck. The Same Service. Again.';
export const STORY_SCENES = Object.freeze([
  {id:'question',label:'The question',duration:12,title:STORY_TITLE,copy:'Why were the same trucks getting serviced more than once in a week?'},
  {id:'integration',label:'One working truck',duration:14,title:'One truck. A lot riding on its data.',copy:'Fuel APIs bring purchases and consumption into a fleet’s software. Telematics integrations bring mileage. Together, they help teams plan work, control costs and keep vehicles available.'},
  {id:'repeat-service',label:'Back in the shop',duration:10,title:'Its second oil change. This week.',copy:'The truck was back in the shop for maintenance it had just received. Technicians noticed the pattern. Something was wrong.'},
  {id:'provider-switch',label:'Two providers',duration:12,title:'The provider changed. The imports didn’t.',copy:'The old source kept restoring stale mileage. The current source moved it forward again, making preventive maintenance appear due again.'},
  {id:'mileage-loop',label:'The mileage loop',duration:18,title:'A new day. The same false jump.',copy:''},
  {id:'cost',label:'The real cost',duration:16,title:'The system said “service.” People acted.',copy:'The fleet treated the system as its source of truth. Repeat maintenance meant more labor, more parts and more time without the truck.'},
  {id:'solution',label:'What I changed',duration:18,title:'I made the source a decision.',copy:'I traced the import workflow with support and developers, then designed per-vehicle odometer sources and reading exclusions.'},
  {id:'agents',label:'How I’d do it today',duration:14,title:'Let agents catch the conflict earlier.',copy:'Today, I’d have agents compare incoming readings, flag a suspected provider overlap and notify the right person. A human would review the evidence and approve the source change.'},
  {id:'learning',label:'What I learned',duration:10,title:'Trust needs a source.',copy:'A value can look valid and still lead to the wrong decision. I learned to make where data comes from, and who can act on it, part of the product.'},
].map((scene,index)=>Object.freeze({...scene,index,start:0})).map((scene,index,scenes)=>Object.freeze({...scene,start:scenes.slice(0,index).reduce((sum,item)=>sum+item.duration,0)})));
export const STORY_DURATION = STORY_SCENES.reduce((sum,scene)=>sum+scene.duration,0);
export function sampleStory(timeSeconds=0) {
  const time=Math.max(0,Math.min(STORY_DURATION,Number.isFinite(timeSeconds)?timeSeconds:0));
  const scene=STORY_SCENES.find(item=>time<item.start+item.duration)||STORY_SCENES.at(-1);
  const elapsedSeconds=time-scene.start;
  return Object.freeze({...scene,timeSeconds:time,elapsedSeconds,progress:Math.min(1,elapsedSeconds/scene.duration),complete:time>=STORY_DURATION});
}
export function sceneTime(index,progress=0) {
  const scene=STORY_SCENES[Math.max(0,Math.min(STORY_SCENES.length-1,Math.trunc(Number.isFinite(index)?index:0)))];
  return scene.start+scene.duration*Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
}
/** User-specified explanatory values, deliberately separate from the domain fixture. */
export function sampleMileage(elapsedSeconds=0) {
  const time=Math.max(0,elapsedSeconds)%9,cycle=Math.min(2,Math.floor(time/3));
  const progress=(time%3)/3,current=50000+cycle*500,atCurrent=progress>=.38;
  return Object.freeze({cycle,progress,previous:30000,current,display:atCurrent?current:30000,atCurrent,maintenanceDue:progress>=.62,day:cycle+1,illustrative:true});
}
/** Fixed example pricing, separate from historical invoices and domain service facts. */
export const EXAMPLE_SERVICE_COST = 350;
export function sampleCost(progress=0) {
  const bounded=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
  const visits=bounded<.5?1:2,repeatVisits=visits-1;
  return Object.freeze({day:visits===1?1:4,visitDays:[1,4],visits,repeatVisits,unitCost:EXAMPLE_SERVICE_COST,totalCost:EXAMPLE_SERVICE_COST*visits,repeatCost:EXAMPLE_SERVICE_COST*repeatVisits,illustrative:true});
}
