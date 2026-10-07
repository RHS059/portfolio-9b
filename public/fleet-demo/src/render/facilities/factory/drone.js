/** A recognizable visual quadcopter, not a manufacturing drawing or specification. */
export function addDetailedDrone(b,x,y,z,stage=3){
  // Sandwich frame, exposed center tray, battery, controller and a faceted upper shell.
  b.box(.72,1.08,.08,x,y,z,'dark');b.box(.62,.98,.045,x,y,z+.12,'face');
  for(const dx of [-.25,.25])for(const dy of [-.38,.38])b.cylinder(.035,.12,x+dx,y+dy,z+.065,'muted');
  b.box(.32,.47,.19,x,y+.12,z+.245,'dark');b.box(.28,.28,.035,x,y-.24,z+.16,'muted');
  b.link([x-.1,y-.1,z+.22],[x+.2,y-.3,z+.21],.025,.025,'ink');
  if(stage>=2)b.ellipsoid(.34,.49,.18,x,y,z+.27,'paper');
  const motors=[];
  for(const [index,[dx,dy]] of [[-.84,-.84],[.84,-.84],[-.84,.84],[.84,.84]].entries()){
    if(stage===0&&index>1)continue;
    b.link([x+Math.sign(dx)*.22,y+Math.sign(dy)*.25,z+.04],[x+dx,y+dy,z+.06],.12,.09,'dark');
    b.box(.22,.22,.06,x+dx,y+dy,z+.07,'face',Math.atan2(dy,dx));
    if(stage>=2||stage===1&&index<2){
      b.cylinder(.14,.19,x+dx,y+dy,z+.185,'muted');b.cylinder(.16,.055,x+dx,y+dy,z+.305,'dark');
      b.cylinder(.055,.055,x+dx,y+dy,z+.36,'paper');motors.push([x+dx,y+dy,z+.39]);
      if(stage===3||stage===2&&index<3){const angle=index%2?.45:-.4;b.box(1.08,.085,.028,x+dx,y+dy,z+.36,'dark',angle);b.box(.2,.12,.045,x+dx,y+dy,z+.36,'muted',angle);}
    }
  }
  // Twin landing skids and the forward camera/gimbal distinguish it from a cross icon.
  for(const dx of [-.34,.34]){
    for(const dy of [-.38,.38])b.link([x+dx,y+dy,z-.02],[x+dx*1.45,y+dy,z-.36],.035,.035,'muted');
    b.link([x+dx*1.45,y-.62,z-.36],[x+dx*1.45,y+.62,z-.36],.055,.055,'dark');
  }
  if(stage>=2){b.box(.2,.1,.14,x,y-.58,z-.12,'muted');b.ellipsoid(.13,.12,.11,x,y-.63,z-.23,'dark');b.cylinder(.075,.08,x,y-.74,z-.23,'ink',[Math.PI/2,0,0]);}
  return motors;
}
