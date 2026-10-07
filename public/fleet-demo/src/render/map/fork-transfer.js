const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{const p=clamp(v);return p*p*(3-2*p);};
const mix=(a,b,p)=>a.map((v,i)=>v+(b[i]-v)*p),distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const cache=new Map();
/** Authored lift/extract/travel/place path. Heights come from the process snapshot. */
export function sampleIncomingForkTransfer(from,to,progress){const p=clamp(progress),start=from.position,end=to.position,h0=from.heading||0,h1=to.heading||0,d0=[Math.sin(h0),Math.cos(h0)],d1=[Math.sin(h1),Math.cos(h1)],a=[start[0]+d0[0]*1.5,start[1]+d0[1]*1.5],b=[end[0]-4.2,end[1]+5.7],key=JSON.stringify([start,end,h0,h1]);let curve=cache.get(key);if(!curve){const bend=Math.min(6,distance(a,b)/3),c=[a[0]+d0[0]*bend,a[1]+d0[1]*bend],d=[b[0]-d1[0]*bend,b[1]-d1[1]*bend],sample=t=>{const u=1-t;return[0,1].map(i=>u*u*u*a[i]+3*u*u*t*c[i]+3*u*t*t*d[i]+t*t*t*b[i]);},heading=t=>{const u=1-t,v=[0,1].map(i=>3*u*u*(c[i]-a[i])+6*u*t*(d[i]-c[i])+3*t*t*(b[i]-d[i]));return Math.atan2(v[0],v[1])+Math.PI;},lengths=[0];let old=a;for(let i=1;i<=64;i++){const next=sample(i/64);lengths.push(lengths.at(-1)+distance(old,next));old=next;}curve={sample,heading,lengths,length:lengths.at(-1)};if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,curve);}let point,heading,travel;
 if(p<=.05){point=start;heading=h0+Math.PI;travel=0;}
 else if(p<.2){const u=smooth((p-.05)/.15);point=mix(start,a,u);heading=h0+Math.PI;travel=1.5*u;}
 else if(p<.6){const u=smooth((p-.2)/.4),index=Math.min(63,Math.floor(u*64)),alpha=u*64-index;point=curve.sample(u);heading=curve.heading(u);travel=1.5+curve.lengths[index]+(curve.lengths[index+1]-curve.lengths[index])*alpha;}
 else if(p<.7){const u=smooth((p-.6)/.1),d=u*Math.PI*2.1,first=Math.min(d,Math.PI*2.1/2),h=Math.PI-first/2.1;point=[b[0]+2.1*(1+Math.cos(h)),b[1]-2.1*Math.sin(h)];heading=h;if(d>first){const h2=Math.PI/2+(d-first)/2.1;point=[b[0]+2.1+2.1*(-Math.cos(h2)),b[1]-2.1+2.1*(Math.sin(h2)-1)];heading=h2;}travel=1.5+curve.length-d;}
 else if(p<.8){point=[end[0],end[1]+1.5];heading=h1+Math.PI;travel=1.5+curve.length-Math.PI*2.1;}
 else if(p<.95){const u=smooth((p-.8)/.15);point=mix([end[0],end[1]+1.5],end,u);heading=h1+Math.PI;travel=1.5+curve.length-Math.PI*2.1-1.5*u;}
 else{point=end;heading=h1+Math.PI;travel=curve.length-Math.PI*2.1;}
 return{x:point[0],y:point[1],heading,payloadHeading:heading-Math.PI,travelMeters:-travel};
}
