import * as THREE from 'three';
import {createToonSmoke} from './game-fx.js';
export function presentOnlineEvent(event,{actors,root,hazards,prop}){
 const actor=actors[event.actor];if(!actor)return;
 if(event.type==='capture'){const mesh=createToonSmoke(.7,16);mesh.position.fromArray(event.position).y+=.8;root.add(mesh);hazards.push({mesh,type:'capture',time:1,spin:new THREE.Vector3(16,20,12)});return;}
 if(event.type!=='tool')return;
 if(event.tool==='hammer'){actor.hammerImpact=.18/1.3;const mesh=prop('propHammer',1.25);mesh.position.set(.5,.6,.4);actor.group.add(mesh);hazards.push({mesh,type:'visual',time:.48});}
 if(event.tool==='rocket'){const mesh=prop('propJet',.8);mesh.position.set(0,.6,-.3);mesh.rotation.y=Math.PI/2;actor.group.add(mesh);hazards.push({mesh,type:'visual',time:5});}
}
export function syncOnlineHazards(snapshot,{root,hazards,prop,dispose}){
 const ids=new Set(snapshot.map(h=>h.id));for(let i=hazards.length-1;i>=0;i--)if(hazards[i].networkId&&!ids.has(hazards[i].networkId)){dispose(hazards[i]);hazards.splice(i,1);}
 for(const h of snapshot){let existing=hazards.find(p=>p.networkId===h.id);if(!existing){const mesh=prop(h.type==='banana'?'propBanana':h.type==='smoke'?'propSmoke':'propRewind',.65);if(h.type==='smoke'){const cloud=createToonSmoke(1.2,14);cloud.position.y=.9;mesh.add(cloud);}root.add(mesh);existing={mesh,type:h.type,networkId:h.id,owner:h.owner};hazards.push(existing);}existing.mesh.position.fromArray(h.position);existing.time=h.time<0?Infinity:h.time;}
}
