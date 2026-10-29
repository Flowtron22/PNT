import * as THREE from 'three';
import {smokeBombCloud,attachHazardTelegraph} from './game-fx.js';
import {attachHeldHammer,attachHeldJetpack} from './held-tools.js';
import {createPlayerMirage} from './player-mirage.js';
export function presentOnlineEvent(event,{actors,root,hazards,prop,fx}){
 const actor=actors[event.actor];if(!actor)return;
 if(event.type==='capture'){fx?.capture(new THREE.Vector3().fromArray(event.position));return;}
 if(event.type!=='tool')return;
 const point=new THREE.Vector3().fromArray(event.position||[0,0,0]);
 if(event.tool==='hammer'){actor.hammerImpact=.18/1.3;fx?.hammerSwing(actor);const mesh=attachHeldHammer(actor,prop('propHammer',1.25));if(mesh)hazards.push({mesh,type:'visual',time:.48});}
 if(event.tool==='rocket'){const mesh=attachHeldJetpack(actor,prop('propJet',.8));if(mesh)hazards.push({mesh,type:'visual',time:5});}
 if(event.tool==='banana')fx?.bananaDeploy(point);
 if(event.tool==='smoke')fx?.smokeDeploy(point);
 if(event.tool==='rewind')fx?.rewind(point);
}
export function syncOnlineHazards(snapshot,{root,hazards,prop,dispose,actors=[]}){
 const ids=new Set(snapshot.map(h=>h.id));for(let i=hazards.length-1;i>=0;i--)if(hazards[i].networkId&&!ids.has(hazards[i].networkId)){dispose(hazards[i]);hazards.splice(i,1);}
  for(const h of snapshot){let existing=hazards.find(p=>p.networkId===h.id);if(!existing){if(h.type==='marker'&&!actors[h.owner])continue;const mesh=h.type==='marker'?createPlayerMirage(actors[h.owner]):prop(h.type==='banana'?'propBanana':h.type==='smoke'?'propSmoke':'propRewind',.65);if(h.type==='smoke'){const cloud=smokeBombCloud();mesh.add(cloud);}if(h.type!=='banana')attachHazardTelegraph(mesh,h.type);root.add(mesh);existing={mesh,type:h.type,networkId:h.id,owner:h.owner};hazards.push(existing);}existing.mesh.position.fromArray(h.position);existing.time=h.time<0?Infinity:h.time;}
}
