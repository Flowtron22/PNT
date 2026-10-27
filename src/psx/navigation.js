// Grid routes are recomputed only when a target changes or the bot reaches a waypoint.
export function findPath(grid,from,to){
 const {nx,nz,step,heights,minX,minZ}=grid;
 const nearest=p=>{let best=-1,d=Infinity;for(let i=0;i<heights.length;i++){if(!Number.isFinite(heights[i]))continue;const x=minX+(i%nx)*step,z=minZ+Math.floor(i/nx)*step,v=(x-p.x)**2+(z-p.z)**2;if(v<d){d=v;best=i;}}return best;};
 const start=nearest(from),goal=nearest(to);if(start<0||goal<0)return [];
 const prev=new Int32Array(nx*nz).fill(-1),queue=[start];prev[start]=start;let closest=start,best=Infinity;
 for(let q=0;q<queue.length;q++){
  const i=queue[q],x=i%nx,z=Math.floor(i/nx),distance=(x-goal%nx)**2+(z-Math.floor(goal/nx))**2;if(distance<best){best=distance;closest=i;}if(i===goal)break;
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,j=zz*nx+xx;if(xx<0||zz<0||xx>=nx||zz>=nz||prev[j]>=0||!Number.isFinite(heights[j])||Math.abs(heights[j]-heights[i])>.6)continue;prev[j]=i;queue.push(j);}
 }
 const result=[];for(let i=closest;i!==start;i=prev[i])result.push({x:minX+(i%nx)*step,z:minZ+Math.floor(i/nx)*step});return result.reverse();
}
export function screenToWorld(x,z){return {x:-z,z:x};}
