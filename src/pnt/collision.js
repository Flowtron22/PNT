export function cellIndex(grid,x,z){const ix=Math.round((x-grid.minX)/grid.step),iz=Math.round((z-grid.minZ)/grid.step);return ix<0||iz<0||ix>=grid.nx||iz>=grid.nz?-1:iz*grid.nx+ix;}
export function canCross(grid,from,to){if(to<0||from<0||grid.blocked?.[to])return false;if(from===to)return true;const dx=to%grid.nx-from%grid.nx,dz=Math.floor(to/grid.nx)-Math.floor(from/grid.nx);if(Math.abs(dx)+Math.abs(dz)!==1)return false;const bit=dx===1?1:dx===-1?2:dz===1?4:8;return !(grid.edges?.[from]&bit);}
export function canTraverse(grid,x,z,toX,toZ){const count=Math.max(1,Math.ceil(Math.hypot(toX-x,toZ-z)/(grid.step*.35)));let from=cellIndex(grid,x,z);for(let n=1;n<=count;n++){const to=cellIndex(grid,x+(toX-x)*n/count,z+(toZ-z)*n/count);if(!canCross(grid,from,to))return false;from=to;}return true;}
// The Iceberg render blocks have solid footprints that supplement Unreal's grid.
// Use the same clearance on the host, in local play, and in client prediction.
export function applyIceBlockCollision(grid,footprints){
 if(!footprints?.length)return;
 const padding=.28+grid.step*.35;
 grid.iceBlocks=footprints.map(([x,z,hx,hz,angle])=>({x,z,hx:hx+padding,hz:hz+padding,c:Math.cos(angle),s:Math.sin(angle)}));
 grid.iceWallCells=grid.blocked;
 grid.blocked=grid.blocked.slice();
 for(let i=0;i<grid.blocked.length;i++){
  const x=grid.minX+i%grid.nx*grid.step,z=grid.minZ+Math.floor(i/grid.nx)*grid.step;
  if(insideIceBlock(grid.iceBlocks,x,z))grid.blocked[i]=1;
 }
}
function insideIceBlock(blocks,x,z){
 return blocks.some(b=>{const dx=x-b.x,dz=z-b.z;return Math.abs(dx*b.c-dz*b.s)<=b.hx&&Math.abs(dx*b.s+dz*b.c)<=b.hz;});
}
// Test the capsule against cell faces continuously. A center can still be in
// an open cell while its body overlaps a blocked neighbor or a wall edge.
function icebergWallClear(grid,x,z){
 const radius=.28,half=grid.step/2,radiusSquared=radius*radius;
 const minX=Math.max(0,Math.ceil((x-radius-half-grid.minX)/grid.step));
 const maxX=Math.min(grid.nx-1,Math.floor((x+radius+half-grid.minX)/grid.step));
 const minZ=Math.max(0,Math.ceil((z-radius-half-grid.minZ)/grid.step));
 const maxZ=Math.min(grid.nz-1,Math.floor((z+radius+half-grid.minZ)/grid.step));
 for(let iz=minZ;iz<=maxZ;iz++)for(let ix=minX;ix<=maxX;ix++){
  const i=iz*grid.nx+ix,dx=x-(grid.minX+ix*grid.step),dz=z-(grid.minZ+iz*grid.step);
  const gapX=Math.max(0,Math.abs(dx)-half),gapZ=Math.max(0,Math.abs(dz)-half);
  if(grid.iceWallCells[i]&&gapX*gapX+gapZ*gapZ<radiusSquared)return false;
  const edges=grid.edges?.[i]||0;
  if(edges&1&&(dx-half)**2+gapZ**2<radiusSquared||
     edges&2&&(dx+half)**2+gapZ**2<radiusSquared||
     edges&4&&(dz-half)**2+gapX**2<radiusSquared||
     edges&8&&(dz+half)**2+gapX**2<radiusSquared)return false;
 }
 return true;
}
export function icebergGroundPathClear(grid,x,z,toX,toZ){
 if(!grid.iceBlocks)return true;
 const steps=Math.max(1,Math.ceil(Math.hypot(toX-x,toZ-z)/(.35*grid.step)));
 for(let i=1;i<=steps;i++){
  const px=x+(toX-x)*i/steps,pz=z+(toZ-z)*i/steps;
  if(insideIceBlock(grid.iceBlocks,px,pz)||!icebergWallClear(grid,px,pz))return false;
 }
 return true;
}
// Sight uses the same exported Unreal blocking grid as movement, avoiding render-mesh triangle scans.
export function gridSightClear(grid,x,z,toX,toZ,stop=.35){const dx=toX-x,dz=toZ-z,length=Math.hypot(dx,dz);if(length<=stop)return true;const fraction=Math.max(0,(length-stop)/length),endX=x+dx*fraction,endZ=z+dz*fraction,count=Math.max(1,Math.ceil(Math.hypot(endX-x,endZ-z)/(grid.step*.3)));let previous=cellIndex(grid,x,z);for(let n=1;n<=count;n++){const next=cellIndex(grid,x+(endX-x)*n/count,z+(endZ-z)*n/count);if(next<0||previous<0||grid.blocked?.[next])return false;if(next!==previous){const aX=previous%grid.nx,aZ=Math.floor(previous/grid.nx),bX=next%grid.nx,bZ=Math.floor(next/grid.nx);if(aX!==bX&&aZ!==bZ){const sideX=aZ*grid.nx+bX,sideZ=bZ*grid.nx+aX;if(!(canCross(grid,previous,sideX)&&canCross(grid,sideX,next)||canCross(grid,previous,sideZ)&&canCross(grid,sideZ,next)))return false;}else if(!canCross(grid,previous,next))return false;}previous=next;}return true;}
