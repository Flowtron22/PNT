import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {Spring} from '../ui/ui-util.js';
import {createRound,stepRound,dash,tag} from './rules.js';

const $=s=>document.querySelector(s),canvas=$('#world');
const ui={menu:$('#menu'),hud:$('#hud'),pause:$('#pause'),results:$('#results'),how:$('#how')};
const scene=new THREE.Scene();scene.background=new THREE.Color('#c3d3e7');scene.fog=new THREE.Fog('#c3d3e7',35,75);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const camera=new THREE.PerspectiveCamera(48,1,.05,120);
scene.add(new THREE.HemisphereLight(0xeaf4ff,0x6c728e,2.4));
const sunlight=new THREE.DirectionalLight(0xfff1df,3);sunlight.position.set(8,16,7);scene.add(sunlight);
const fill=new THREE.DirectionalLight(0xb6d8ff,1.2);fill.position.set(-8,7,-4);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0xb4c6db,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.3;scene.add(floor);
const ray=new THREE.Raycaster(),up=new THREE.Vector3(0,1,0),down=new THREE.Vector3(0,-1,0);
let ready=false,role='runner',quality=localStorage.getItem('psx-web-quality')||'balanced';
let round=null,avatars=[],templates={},clips={},ground=[],bounds=null,grid=null;
let paused=false,yaw=.65,pitch=.62,frameTime=0,toastTime=0,lastFrame=performance.now();
const keys=new Set(),input={x:0,z:0},stick={id:null,x:0,y:0},look={id:null,x:0,y:0};
const cameraTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3();
const cameraX=new Spring(10,90,20),cameraY=new Spring(10,90,20),cameraZ=new Spring(13,90,20);
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize(){const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='battery'?1:1.5));}
addEventListener('resize',resize);resize();
function show(name){for(const [key,node]of Object.entries(ui))node.hidden=key!==name;document.body.classList.toggle('playing',name==='hud'||name==='pause');}
function say(text,seconds=2){$('#toast').textContent=text;toastTime=seconds;}
function clearInput(){keys.clear();input.x=input.z=0;stick.id=look.id=null;$('#stick').style.transform='';}
function pauseGame(){if(!round||round.phase!=='playing'||paused)return;paused=true;clearInput();show('pause');}
function resume(){paused=false;show('hud');lastFrame=performance.now();}
function menu(){round=null;paused=false;clearInput();for(const a of avatars)a.group.visible=true;show('menu');}

for(const button of document.querySelectorAll('[data-role]'))button.addEventListener('click',()=>{
  role=button.dataset.role;for(const b of document.querySelectorAll('[data-role]')){b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));}
});
$('#how-button').onclick=()=>show('how');$('#close-how').onclick=()=>show('menu');
$('#pause-button').onclick=pauseGame;$('#resume').onclick=resume;$('#leave').onclick=menu;$('#result-menu').onclick=menu;
$('#play').onclick=()=>start();$('#again').onclick=()=>start();
$('#fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
function applyQuality(){const low=quality==='battery';$('#quality').textContent=`GRAPHICS: ${low?'BATTERY':'BALANCED'}`;resize();}
$('#quality').onclick=()=>{quality=quality==='battery'?'balanced':'battery';localStorage.setItem('psx-web-quality',quality);applyQuality();};applyQuality();
addEventListener('keydown',event=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
  if(event.code==='Escape'){if(paused)resume();else if(round)pauseGame();else if(!ui.how.hidden)show('menu');return;}
  keys.add(event.code);
  if(round&&!paused&&!event.repeat){if(event.code.startsWith('Shift'))useDash();if(event.code==='Space')jump();}
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{clearInput();pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(!round||paused||look.id!==null)return;look.id=e.pointerId;look.x=e.clientX;look.y=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==look.id)return;yaw-=(e.clientX-look.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-look.y)*.004,.25,1.05);look.x=e.clientX;look.y=e.clientY;});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(e.pointerId===look.id)look.id=null;});
const joystick=$('#joystick');
function moveStick(e){const r=joystick.getBoundingClientRect(),radius=r.width*.34;let x=(e.clientX-r.left-r.width/2)/radius,z=-(e.clientY-r.top-r.height/2)/radius;const d=Math.max(1,Math.hypot(x,z));input.x=x/d;input.z=z/d;$('#stick').style.transform=`translate(${input.x*radius}px,${-input.z*radius}px)`;}
joystick.addEventListener('pointerdown',e=>{e.stopPropagation();if(stick.id!==null)return;stick.id=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)moveStick(e);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,e=>{if(e.pointerId!==stick.id)return;stick.id=null;input.x=input.z=0;$('#stick').style.transform='';});
$('#dash').addEventListener('pointerdown',e=>{e.preventDefault();useDash();});$('#jump').addEventListener('pointerdown',e=>{e.preventDefault();jump();});

function buildGround(){
  const size=bounds.getSize(new THREE.Vector3()),step=.38,nx=Math.ceil(size.x/step)+1,nz=Math.ceil(size.z/step)+1,heights=new Float32Array(nx*nz).fill(NaN);
  for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
    ray.set(new THREE.Vector3(bounds.min.x+x*step,bounds.max.y+3,bounds.min.z+z*step),down);ray.far=20;
    const hit=ray.intersectObjects(ground,true).find(h=>h.face&&h.face.normal.clone().transformDirection(h.object.matrixWorld).y>.55);
    if(hit)heights[z*nx+x]=hit.point.y;
  }
  grid={nx,nz,step,heights};
}
function heightAt(x,z){if(!grid)return 0;const ix=Math.round((x-bounds.min.x)/grid.step),iz=Math.round((z-bounds.min.z)/grid.step);return ix<0||iz<0||ix>=grid.nx||iz>=grid.nz?NaN:grid.heights[iz*grid.nx+ix];}
function walkable(x,z,y){const h=heightAt(x,z);return Number.isFinite(h)&&h-y<.65;}
function spot(x,z){let best=null,distance=Infinity;for(let iz=2;iz<grid.nz-2;iz++)for(let ix=2;ix<grid.nx-2;ix++){
  const y=grid.heights[iz*grid.nx+ix];if(!Number.isFinite(y))continue;const px=bounds.min.x+ix*grid.step,pz=bounds.min.z+iz*grid.step,d=(px-x)**2+(pz-z)**2;
  if(d<distance){distance=d;best=new THREE.Vector3(px,y,pz);}
}if(!best)throw new Error('No walkable ground was found in the Mall export');return best;}
function avatar(template,id){
  const model=clone(template.scene),group=new THREE.Group();model.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(model),height=box.max.y-box.min.y;model.scale.multiplyScalar(1.55/height);model.updateMatrixWorld(true);
  box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));
  group.add(model);scene.add(group);group.position.copy(spot((id-1.5)*2.7,id%2?4:-3));
  model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)m.roughness=Math.max(.55,m.roughness||0);}});
  const mixer=new THREE.AnimationMixer(model),actions={};
  for(const [name,clip]of Object.entries(clips)){
    const tracks=clip.tracks.filter(t=>model.getObjectByName(THREE.PropertyBinding.parseTrackName(t.name).nodeName));
    const clean=new THREE.AnimationClip(name,clip.duration,tracks);actions[name]=mixer.clipAction(clean);actions[name].play();actions[name].setEffectiveWeight(name==='idle'?1:0);
  }
  const ring=new THREE.Mesh(new THREE.RingGeometry(.32,.39,24),new THREE.MeshBasicMaterial({color:id===0?0xff8a14:0x005bff,transparent:true,opacity:.75,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.02;group.add(ring);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.34,20),new THREE.MeshBasicMaterial({color:0x09154b,transparent:true,opacity:.2,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.01;group.add(shadow);
  return {id,group,model,mixer,actions,velocity:0,grounded:true,speed:0,wander:id*2.2};
}
function populate(){for(const a of avatars){scene.remove(a.group);a.mixer.stopAllAction();}avatars=[];
  const roles=round?.actors||createRound(role).actors;
  for(let i=0;i<4;i++)avatars.push(avatar(roles[i].role==='chaser'?templates.police:templates.thief,i));
}
function start(){if(!ready)return;round=createRound(role);paused=false;clearInput();populate();yaw=.65;pitch=.62;
  const player=avatars[0].group.position;cameraX.snap(player.x+8);cameraY.snap(player.y+7);cameraZ.snap(player.z+9);
  $('#role-label').textContent=role.toUpperCase();$('#role-label').classList.toggle('chaser',role==='chaser');show('hud');say(role==='runner'?'STAY OUT OF REACH!':'CATCH THE CREW!');updateHud();
}
function useDash(){if(round&&!paused&&dash(round,0))say('GO, GO, GO!',.65);}
function jump(){const player=avatars[0];if(round&&!paused&&player?.grounded&&!round.actors[0].caught){player.velocity=5.5;player.grounded=false;}}
function move(a,dx,dz,dt,speed){
  const p=a.group.position,magnitude=Math.hypot(dx,dz);if(magnitude>.01){dx/=Math.max(1,magnitude);dz/=Math.max(1,magnitude);}
  const nx=p.x+dx*speed*dt,nz=p.z+dz*speed*dt;let moved=false;
  if(walkable(nx,p.z,p.y)){p.x=nx;moved=true;}if(walkable(p.x,nz,p.y)){p.z=nz;moved=true;}
  if(magnitude>.06&&moved){const angle=Math.atan2(dx,dz);a.group.rotation.y+=Math.atan2(Math.sin(angle-a.group.rotation.y),Math.cos(angle-a.group.rotation.y))*Math.min(1,dt*14);}
  const h=heightAt(p.x,p.z);a.velocity-=16*dt;p.y+=a.velocity*dt;
  if(Number.isFinite(h)&&p.y<=h){p.y=h;a.velocity=0;a.grounded=true;}else a.grounded=false;
  if(p.y<-5){p.copy(spot(0,0));a.velocity=0;}
  a.speed=THREE.MathUtils.damp(a.speed,magnitude>.05&&moved?1:0,10,dt);
  a.actions.run?.setEffectiveWeight(a.speed);a.actions.idle?.setEffectiveWeight(1-a.speed);a.mixer.update(dt);
  return moved;
}
function updateGame(dt){
  stepRound(round,dt);const chaser=round.actors.find(a=>a.role==='chaser'),cop=avatars[chaser.id];
  for(const state of round.actors){const a=avatars[state.id];if(state.caught){a.actions.run?.setEffectiveWeight(0);a.actions.idle?.setEffectiveWeight(1);a.mixer.update(dt);continue;}
    let dx=0,dz=0;
    if(state.id===0){const ix=input.x+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),iz=input.z+(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);dx=Math.cos(yaw)*ix-Math.sin(yaw)*iz;dz=-Math.sin(yaw)*ix-Math.cos(yaw)*iz;}
    else if(state.role==='chaser'){
      const targets=round.actors.filter(r=>r.role==='runner'&&!r.caught).sort((a,b)=>cop.group.position.distanceToSquared(avatars[a.id].group.position)-cop.group.position.distanceToSquared(avatars[b.id].group.position));
      if(targets[0]){const target=avatars[targets[0].id].group.position;dx=target.x-a.group.position.x;dz=target.z-a.group.position.z;}
    }else{
      const p=a.group.position,c=cop.group.position,d=p.distanceTo(c);a.wander+=dt*.45;
      if(d<6){dx=p.x-c.x;dz=p.z-c.z;}else{dx=Math.sin(a.wander);dz=Math.cos(a.wander*.79);}
    }
    const moved=move(a,dx,dz,dt,(state.role==='chaser'?3.65:3.4)*(state.id===0?1.08:1)*(state.dash>0?1.7:1));
    if(!moved&&state.id!==0){a.wander+=dt*4;move(a,Math.sin(a.wander+state.id),Math.cos(a.wander+state.id),dt,2.7);}
  }
  if(round.remaining<58.5)for(const r of round.actors.filter(a=>a.role==='runner'&&!a.caught)){
    const p=cop.group.position,q=avatars[r.id].group.position,d=p.distanceTo(q);
    if(d<.9&&Math.abs(p.y-q.y)<.8){const from=p.clone().addScaledVector(up,.65),to=q.clone().addScaledVector(up,.65),direction=to.sub(from);ray.set(from,direction.normalize());ray.far=Math.max(0,d-.12);
      if(!ray.intersectObjects(ground,true).length&&tag(round,chaser.id,r.id,d)){say(r.id===0?'YOU WERE TAGGED!\nWatch the rest of the crew.':'RUNNER TAGGED!');avatars[r.id].group.scale.setScalar(.82);}}
  }
  if(round.phase==='finished'){paused=false;const won=round.winner===round.playerRole;$('#result-title').textContent=won?(role==='runner'?'Great escape!':'Crew caught!'):(role==='runner'?'Busted.':'They got away.');$('#result-eyebrow').textContent=won?'YOU WIN':'ROUND OVER';$('#result-copy').textContent=round.winner==='chaser'?'All three runners were tagged.':`${round.actors.filter(a=>a.role==='runner'&&!a.caught).length} runners survived the chase.`;show('results');}
  updateHud();
}
function updateHud(){const seconds=Math.ceil(round.remaining);$('#timer').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  const signature=round.actors.map(a=>`${a.role}:${a.caught}`).join('|');if($('#crew-status').dataset.signature!==signature){$('#crew-status').dataset.signature=signature;$('#crew-status').replaceChildren(...round.actors.filter(a=>a.role==='runner').map(a=>{const chip=document.createElement('span');chip.className=`crew-chip${a.caught?' caught':''}`;chip.textContent=`${a.id===0?'YOU':`RUNNER ${a.id}`} · ${a.caught?'TAGGED':'FREE'}`;return chip;}));}
  const cd=round.actors[0].cooldown;$('#dash-status').textContent=cd>0?`${Math.ceil(cd)}s`:'READY';$('#dash').disabled=cd>0||round.actors[0].caught;
}

async function boot(){
  const loader=new GLTFLoader(),names=['thief','police','idle','run','mall-slice'];let loaded=0;
  const items=await Promise.all(names.map(async name=>{const value=await loader.loadAsync(`assets/psx/${name}.glb`);loaded++;$('#load-status').textContent=`Getting the Mall ready… ${Math.round(loaded/names.length*100)}%`;return value;}));
  templates={thief:items[0],police:items[1]};clips={idle:items[2].animations[0],run:items[3].animations[0]};if(!clips.idle||!clips.run)throw new Error('The character animation export is missing.');
  const arena=items[4].scene;arena.updateMatrixWorld(true);const initial=new THREE.Box3().setFromObject(arena),center=initial.getCenter(new THREE.Vector3());arena.position.add(new THREE.Vector3(-center.x,-initial.min.y,-center.z));scene.add(arena);arena.updateMatrixWorld(true);
  arena.traverse(o=>{if(o.isMesh){ground.push(o);o.castShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.roughness=Math.max(.7,m.roughness||0);if(m.map)m.map.anisotropy=2;}}});
  bounds=new THREE.Box3().setFromObject(arena);buildGround();populate();ready=true;document.body.dataset.assets='ready';$('#play').disabled=false;$('#play-label').textContent='LET’S PLAY';$('#load-status').textContent='Mall promenade · local practice ready';
}
function frame(now=performance.now()){requestAnimationFrame(frame);const dt=Math.max(0,Math.min((now-lastFrame)/1000,.05));lastFrame=now;frameTime+=dt;
  if(ready){
    if(round&&round.phase==='playing'&&!paused)updateGame(dt);
    if(round){const p=avatars[0].group.position;cameraTarget.copy(p).addScaledVector(up,.8);const distance=innerWidth<600?6.7:7.8;desiredCamera.set(p.x+Math.sin(yaw)*Math.cos(pitch)*distance,p.y+Math.sin(pitch)*distance+1,p.z+Math.cos(yaw)*Math.cos(pitch)*distance);}
    else{const angle=.7+(reduceMotion?0:Math.sin(frameTime*.08)*.35);cameraTarget.set(1,1.3,0);desiredCamera.set(Math.sin(angle)*18,13,Math.cos(angle)*18);for(const a of avatars){a.mixer.update(dt);a.group.rotation.y=Math.PI;}}
    cameraX.target=desiredCamera.x;cameraY.target=desiredCamera.y;cameraZ.target=desiredCamera.z;camera.position.set(cameraX.step(dt),cameraY.step(dt),cameraZ.step(dt));camera.lookAt(cameraTarget);
  }else{camera.position.set(12,12,16);camera.lookAt(0,0,0);}
  if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').textContent='';}
  renderer.render(scene,camera);
}
boot().catch(error=>{console.error(error);$('#error').hidden=false;$('#error').textContent=`The local game could not load: ${error.message}. Check that the Unreal asset export has finished, then reload.`;$('#load-status').textContent='Could not load the Mall';document.body.dataset.assets='error';});frame();
