import {sampleGround} from './motion.js';
import {cellIndex,canCross} from './collision.js';
// Landing cells must belong to the authored walkable floor, with capsule
// clearance and at least one usable exit. Isolated roofs are excluded.
export function safeLandingCell(grid,x,z){
 const i=cellIndex(grid,x,z);if(i<0||grid.blocked?.[i]||!Number.isFinite(grid.heights[i])||!Number.isFinite(sampleGround(grid,x,z)))return false;
 if(grid.landingMask&&!grid.landingMask[i])return false;
 const ix=i%grid.nx,iz=Math.floor(i/grid.nx);
 return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>{const xx=ix+dx,zz=iz+dz;if(xx<0||zz<0||xx>=grid.nx||zz>=grid.nz)return false;const j=zz*grid.nx+xx;return Number.isFinite(grid.heights[j])&&Math.abs(grid.heights[j]-grid.heights[i])<.6&&canCross(grid,i,j);});
}
export function landingMask(grid,spawns){
 const mask=new Uint8Array(grid.heights.length),queue=[];
 for(const spawn of spawns){let best=-1,distance=Infinity;for(let i=0;i<mask.length;i++){if(grid.blocked?.[i]||!Number.isFinite(grid.heights[i]))continue;const x=grid.minX+i%grid.nx*grid.step,z=grid.minZ+Math.floor(i/grid.nx)*grid.step,d=(x-spawn[0])**2+(z-spawn[2])**2+4*(grid.heights[i]-spawn[1])**2;if(d<distance){distance=d;best=i;}}if(best>=0&&!mask[best]){mask[best]=1;queue.push(best);}}
 for(let n=0;n<queue.length;n++){const i=queue[n],x=i%grid.nx,z=Math.floor(i/grid.nx);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=grid.nx||zz>=grid.nz)continue;const j=zz*grid.nx+xx;if(mask[j]||!Number.isFinite(grid.heights[j])||Math.abs(grid.heights[j]-grid.heights[i])>=.6||!canCross(grid,i,j))continue;mask[j]=1;queue.push(j);}}
 return mask;
}
export function nearestLanding(grid,x,z){
 if(safeLandingCell(grid,x,z))return {x,y:sampleGround(grid,x,z),z};
 let result=null,best=Infinity;
 for(let i=0;i<grid.heights.length;i++){const px=grid.minX+i%grid.nx*grid.step,pz=grid.minZ+Math.floor(i/grid.nx)*grid.step,d=(px-x)**2+(pz-z)**2;if(d>=best||!safeLandingCell(grid,px,pz))continue;best=d;result={x:px,y:grid.heights[i],z:pz};}
 return result;
}
