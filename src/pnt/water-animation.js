export const SUNKEN_WATER_SPEEDS=Object.freeze({m_ps_watera:{x:0,y:.035},m_ps_waterb:{x:0,y:-.02}});
const wrap=value=>(value%1+1)%1;
export function prepareSunkenWater(arena,repeatWrapping=1000){
 if(!arena)return null;arena.userData??={};if(arena.userData.sunkenWaterPan)return arena.userData.sunkenWaterPan;
 const water=arena.getObjectByName?.('waterplane');if(!water)return null;const layers=[];
 water.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material]){
  const speed=SUNKEN_WATER_SPEEDS[(material?.name||'').replace(/\.\d+$/,'').toLowerCase()];if(!speed||!material.map)continue;
  const texture=material.map.clone();material.map=texture;texture.wrapS=texture.wrapT=repeatWrapping;texture.needsUpdate=true;
  layers.push({texture,speed,base:{x:texture.offset.x,y:texture.offset.y}});material.needsUpdate=true;
 }});if(!layers.length)return null;
 let time=0;const controller={layers,update(dt){if(!Number.isFinite(dt)||dt<=0)return;time=(time+Math.min(dt,.1))%1000;for(const {texture,speed,base} of layers)texture.offset.set(wrap(base.x+speed.x*time),wrap(base.y+speed.y*time));}};
 arena.userData.sunkenWaterPan=controller;return controller;
}
