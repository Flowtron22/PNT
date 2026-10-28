import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {makeAnimator,ANIMATION_PLAY_RATE} from './animation.js';
import {portraitCameraDistance} from './result-portrait-framing.js';
// Render the original model with alpha rather than processing an opaque portrait PNG.
export function createResultPortrait(host,template,clips,won,customize=null){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new THREE.Scene(),model=clone(template.scene);scene.add(model);model.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(model);model.scale.multiplyScalar(1.9/Math.max(.01,box.max.y-box.min.y));model.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));
 scene.add(new THREE.HemisphereLight(0xeaf4ff,0x6c728e,2.4));const light=new THREE.DirectionalLight(0xfff1df,3);light.position.set(3,5,5);scene.add(light);
 const appearance=customize?.(model);
 const size=box.getSize(new THREE.Vector3()),camera=new THREE.PerspectiveCamera(28,1,.1,20),targetY=size.y*.5;const frame=()=>{const distance=portraitCameraDistance(size,camera.aspect,camera.fov);camera.position.set(0,targetY,distance);camera.lookAt(0,targetY,0);};frame();const animator=makeAnimator(model,clips,'runner');animator.play(won?'dance':'busted',{loop:won});let defeatIntro=won?0:(clips.busted?.duration||.5)/ANIMATION_PLAY_RATE;
 const canvas=renderer.domElement;canvas.className='result-character';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Your character');host.replaceChildren(canvas);let w=0,h=0;
 return {update(dt){const rect=host.getBoundingClientRect(),nw=Math.max(1,Math.round(rect.width)),nh=Math.max(1,Math.round(rect.height));if(w!==nw||h!==nh){w=nw;h=nh;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();frame();}animator.update(dt);if(defeatIntro>0){defeatIntro-=dt;if(defeatIntro<=0)animator.play('bustedIdle');}renderer.render(scene,camera);},dispose(){animator.dispose();appearance?.dispose();const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const s of skeletons)s.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}};
}
