export function sampleGround(grid,x,z){
 const fx=(x-grid.minX)/grid.step,fz=(z-grid.minZ)/grid.step,ix=Math.floor(fx),iz=Math.floor(fz);
 if(ix<0||iz<0||ix>=grid.nx-1||iz>=grid.nz-1)return NaN;
 const values=[grid.heights[iz*grid.nx+ix],grid.heights[iz*grid.nx+ix+1],grid.heights[(iz+1)*grid.nx+ix],grid.heights[(iz+1)*grid.nx+ix+1]],nearest=grid.heights[Math.round(fz)*grid.nx+Math.round(fx)];
 if(!values.every(Number.isFinite)||Math.max(...values)-Math.min(...values)>.6)return nearest;
 const tx=fx-ix,tz=fz-iz;return (values[0]*(1-tx)+values[1]*tx)*(1-tz)+(values[2]*(1-tx)+values[3]*tx)*tz;
}
export function dampVelocity(current,target,dt){return current+(target-current)*(1-Math.exp(-dt*(target===0?22:16)));}
export function simulationSteps(elapsed){const total=Math.min(.25,Math.max(0,Number.isFinite(elapsed)?elapsed:0)),count=Math.ceil(total/(1/60));return {count,dt:count?total/count:0};}
