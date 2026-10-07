/** Keep the floating pause reachable without covering persistent choices or the scene view controls. */
export function floatingPlaybackBottom({viewportHeight,bottom=14,height=46,left=0,right=0,region,regions,gap=12}={}) {
  const base=Math.max(0,Number.isFinite(bottom)?bottom:14);
  if(Array.isArray(regions))return [...regions].filter(Boolean).sort((a,b)=>b.top-a.top).reduce((position,region)=>floatingPlaybackBottom({viewportHeight,bottom:position,height,left,right,region,gap}),base);
  if(!Number.isFinite(viewportHeight)||viewportHeight<=0||!Number.isFinite(height)||height<=0||!region)return base;
  if(![region.top,region.bottom,region.left,region.right].every(Number.isFinite))return base;
  const low=viewportHeight-base,high=low-height;
  const overlaps=right>region.left&&left<region.right&&low>region.top&&high<region.bottom;
  if(!overlaps)return base;
  const above=viewportHeight-region.top+gap;
  if(region.top-gap-height>=8)return Math.max(base,above);
  const below=viewportHeight-region.bottom-gap-height;
  if(below>=base)return below;
  return Math.max(base,8,Math.min(above,viewportHeight-height-8));
}
