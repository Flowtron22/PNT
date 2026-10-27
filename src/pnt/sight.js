import {gridSightClear} from './collision.js';
import {SMOKE_RADIUS} from './rules.js';

export function smokeBlocksSight(p,q,hazards){
 const dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z,length=dx*dx+dy*dy+dz*dz;
 for(const cloud of hazards){
  if(cloud.type!=='smoke'||!(cloud.time>0))continue;
  const center=cloud.position||cloud.mesh?.position;if(!center)continue;
  // Both eye line and cloud center are raised by .65, so the common offset
  // cancels. Project from the same origin used for the distance calculation.
  const cx=center.x-p.x,cy=center.y-p.y,cz=center.z-p.z;
  const t=length?Math.max(0,Math.min(1,(cx*dx+cy*dy+cz*dz)/length)):0;
  if((cx-dx*t)**2+(cy-dy*t)**2+(cz-dz*t)**2<SMOKE_RADIUS**2)return true;
 }return false;
}
export function hasSight(grid,p,q,hazards,smoke=true,stop=.35){
 return !(smoke&&smokeBlocksSight(p,q,hazards))&&gridSightClear(grid,p.x,p.z,q.x,q.z,stop);
}
