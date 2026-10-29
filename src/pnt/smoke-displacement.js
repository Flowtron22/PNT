import {smokeNoiseSize,smokeNoiseHeights} from './smoke-noise-data.js';

// Mirrored sampling avoids depending on perfect image-edge tiling. Sampling in
// object space (rather than sphere UVs) also avoids seams and pinched poles.
function sample(u,v){
 const mirror=t=>{const p=((t%2)+2)%2;return (p<=1?p:2-p)*(smokeNoiseSize-1);};
 const x=mirror(u),y=mirror(v),ix=Math.floor(x),iy=Math.floor(y);
 const nx=Math.min(ix+1,smokeNoiseSize-1),ny=Math.min(iy+1,smokeNoiseSize-1);
 const smooth=t=>t*t*(3-2*t),fx=smooth(x-ix),fy=smooth(y-iy);
 const at=(a,b)=>smokeNoiseHeights[b*smokeNoiseSize+a]/255;
 const top=at(ix,iy)*(1-fx)+at(nx,iy)*fx;
 const bottom=at(ix,ny)*(1-fx)+at(nx,ny)*fx;
 return top*(1-fy)+bottom*fy;
}

// Once per shared geometry at startup; no per-frame vertex work or GPU noise.
export function displaceSmokeLobe(geometry,seed=0){
 const positions=geometry.getAttribute('position');
 const offset=seed*.173;
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
  const height=(sample(y*.18+.5+offset,z*.18+.5)*x*x+
   sample(z*.18+.23+offset,x*.18+.41)*y*y+
   sample(x*.18+.67+offset,y*.18+.19)*z*z)/(x*x+y*y+z*z);
  const scale=1+(height-.5)*.7;
  positions.setXYZ(i,x*scale,y*scale,z*scale);
 }
 positions.needsUpdate=true;
 return geometry;
}

