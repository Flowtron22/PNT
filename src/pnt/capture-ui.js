import {CAPTURE_SECONDS,RELEASE_COOLDOWN,RESCUE_SECONDS} from './rules.js';
const clamp=v=>Math.max(0,Math.min(1,v));
export function captureGauge(state){
 if(state.caught){if(state.releaseCooldown>0)return {phase:'cooldown',progress:clamp(1-state.releaseCooldown/RELEASE_COOLDOWN),label:'Release cooldown'};if(state.rescueProgress>0)return {phase:'release',progress:clamp(state.rescueProgress/RESCUE_SECONDS),label:'Releasing teammate'};return {phase:'ready',progress:1,label:'Ready for release'};}
 if(state.detectionProgress>0)return {phase:'capture',progress:clamp(state.detectionProgress/CAPTURE_SECONDS),label:'Police capture'};
 return null;
}
export function updateCaptureGauge(node,state){
 const gauge=captureGauge(state);if(!gauge){node.hidden=true;return false;}
 if(!node.querySelector('svg'))node.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="gauge-track" cx="32" cy="32" r="27"/><circle class="gauge-fill" cx="32" cy="32" r="27" pathLength="100"/><path class="gauge-symbol"/></svg>';
 node.dataset.phase=gauge.phase;node.setAttribute('role','progressbar');node.setAttribute('aria-label',gauge.label);node.setAttribute('aria-valuemin','0');node.setAttribute('aria-valuemax','100');node.setAttribute('aria-valuenow',String(Math.round(gauge.progress*100)));
 const fill=node.querySelector('.gauge-fill');fill.style.strokeDasharray=`${gauge.progress*100} 100`;fill.style.opacity=gauge.progress>0?'1':'0';
 node.querySelector('.gauge-symbol').setAttribute('d',gauge.phase==='cooldown'?'M25 30v-5a7 7 0 0 1 14 0v5 M23 30h18v15H23Z':gauge.phase==='ready'?'M24 33l6 6 12-14':'');return true;
}
// Cloned materials keep the cooldown tint local to this avatar. The shared uniform
// survives Sunken material wrappers and preserves costume recolouring callbacks.
export function createCaptureTint(root){
 const grey={value:0},records=[],materials=new Map();
 function convert(source){if(!source)return source;if(materials.has(source))return materials.get(source);const material=source.clone(),compile=source.onBeforeCompile,key=source.customProgramCacheKey();material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.uniforms.uCaptureGrey=grey;shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uCaptureGrey;').replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(dot(gl_FragColor.rgb,vec3(.299,.587,.114))),uCaptureGrey);');};material.customProgramCacheKey=()=>key+'-capture-grey-v1';materials.set(source,material);return material;}
 root.traverse(mesh=>{if(!mesh.isMesh)return;records.push([mesh,mesh.material]);mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);});
 return {update(state){grey.value=state.caught&&state.releaseCooldown>0?1:0;},dispose(){for(const [mesh,material] of records)mesh.material=material;for(const material of materials.values())material.dispose();},grey};
}
