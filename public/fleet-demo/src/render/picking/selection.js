/** Instance slots are transient. IDs, including the selected ID, are not. */
export class EntityRegistry {
  constructor(){this.ids=[];this.byId=new Map();this.selectedId=null;}
  sync(entities){this.ids=entities.map(v=>v.id);this.byId=new Map(entities.map((v,i)=>[v.id,{entity:v,index:i}]));}
  select(id){this.selectedId=id||null;}
  idAt(index){return this.ids[index]??null;}
  selected(){return this.byId.get(this.selectedId)?.entity??null;}
  clear(){this.ids=[];this.byId.clear();this.selectedId=null;}
}
export function pickNearest(point, entities, project, maxDistance=24) {
  let best=null,distance=maxDistance;
  for(const entity of entities){const p=project(entity);if(!p)continue;const d=Math.hypot(point.x-p.x,point.y-p.y);if(d<distance){best=entity.id;distance=d;}}
  return best;
}
export function cullProjected(entities,project,width,height,padding=80){return entities.filter(v=>{const p=project(v);return p&&p.x>=-padding&&p.y>=-padding&&p.x<=width+padding&&p.y<=height+padding;});}
