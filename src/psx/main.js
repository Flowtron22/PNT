import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createRound,stepRound,dash,tag} from './rules.js';
import {makeAnimator,animationFor} from './animation.js';
import {COSTUMES,TOOLS,ANIMATION_PREVIEWS} from './catalog.js';
const $=s=>document.querySelector(s),canvas=$('#world');
const ui={menu:$('#menu'),hud:$('#hud'),pause:$('#pause'),results:$('#results')};
const scene=new THREE.Scene();scene.background=new THREE.Color('#70688f');scene.fog=new THREE.Fog('#70688f',38,85);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const menuCamera=new THREE.PerspectiveCamera(40,1,.05,120),matchCamera=new THREE.OrthographicCamera(-12.5,12.5,7,-7,.05,120);
scene.add(new THREE.HemisphereLight(0xeaf4ff,0x6c728e,2.4));
const sunlight=new THREE.DirectionalLight(0xfff1df,3);sunlight.position.set(8,16,7);scene.add(sunlight);
const fill=new THREE.DirectionalLight(0xb6d8ff,1.2);fill.position.set(-8,7,-4);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x77768c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.3;scene.add(floor);
const ray=new THREE.Raycaster(),up=new THREE.Vector3(0,1,0),down=new THREE.Vector3(0,-1,0);
const loader=new GLTFLoader(),cache=new Map();
let ready=false,role='runner',quality=localStorage.getItem('psx-web-quality')||'balanced';
let costume=localStorage.getItem('pnt-costume')||'role',tool=localStorage.getItem('pnt-tool')||'hammer';
if(!COSTUMES.some(c=>c.id===costume))costume='role';if(!TOOLS.some(t=>t.id===tool))tool='hammer';
let round=null,avatars=[],preview=null,previewClip='idle',previewTime=0,templates={},clips={},ground=[],bounds=null,grid=null;
let paused=false,activePage='home',toastTime=0,lastFrame=performance.now(),busy=false;
const keys=new Set(),input={x:0,z:0},stick={id:null},cameraTarget=new THREE.Vector3(),hazards=[];
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize(){const aspect=innerWidth/innerHeight;menuCamera.aspect=aspect;menuCamera.updateProjectionMatrix();const width=aspect<1?10.5:Math.max(15,Math.min(25,15*aspect)),height=width/aspect;matchCamera.left=-width/2;matchCamera.right=width/2;matchCamera.top=height/2;matchCamera.bottom=-height/2;matchCamera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='battery'?1:1.5));renderer.setSize(innerWidth,innerHeight,false);}
addEventListener('resize',resize);resize();
function show(name){for(const [key,node]of Object.entries(ui))node.hidden=key!==name;document.body.classList.toggle('playing',name==='hud'||name==='pause'||name==='results');}
function say(text,seconds=2){$('#toast').textContent=text;toastTime=seconds;}
function clearInput(){keys.clear();input.x=input.z=0;stick.id=null;$('#stick').style.transform='';}
function pauseGame(){if(!round||round.phase!=='playing'||paused||busy)return;paused=true;clearInput();show('pause');}
function resume(){paused=false;show('hud');lastFrame=performance.now();}
function progress(value,text){$('#load-progress').style.width=`${Math.round(value)}%`;$('#load-percent').textContent=`${Math.round(value)}%`;$('#load-status').textContent=text;}
function beginLoading(title){busy=true;clearInput();$('#loading').hidden=false;$('#loading').setAttribute('aria-busy','true');$('#loading-title').textContent=title;$('#retry').hidden=true;$('#error').hidden=true;progress(0,'Preparing assets…');}
function endLoading(){busy=false;$('#loading').hidden=true;$('#loading').setAttribute('aria-busy','false');lastFrame=performance.now();}
function loadError(error,retry){console.error(error);$('#loading-title').textContent='LET’S TRY THAT AGAIN';$('#load-status').textContent=error.message;$('#retry').hidden=false;$('#retry').onclick=retry;busy=false;}
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
async function getGLB(key,url,onProgress){if(cache.has(key))return cache.get(key);const pending=loader.loadAsync(url,onProgress);cache.set(key,pending);try{return await pending;}catch(e){cache.delete(key);throw e;}}
async function ensureCostume(){const c=COSTUMES.find(c=>c.id===costume);if(!c.file)return;templates[c.id]=await getGLB(c.id,`assets/psx/costumes/${c.file}.glb`,e=>progress(e.total?Math.min(85,e.loaded/e.total*85):30,`Loading ${c.name}…`));}
function destroy(a){if(!a)return;scene.remove(a.group);a.anim.dispose();for(const mesh of [a.ring,a.shadow]){mesh.geometry.dispose();mesh.material.dispose();}}
function clearHazards(){for(const h of hazards){scene.remove(h.mesh);h.mesh.geometry.dispose();h.mesh.material.dispose();}hazards.length=0;}
function menu(){round=null;paused=false;clearInput();clearHazards();for(const a of avatars)destroy(a);avatars=[];previewModel();show('menu');openPage('home');}
function previewModel(){destroy(preview);preview=avatar(templates[costume]||templates[role==='chaser'?'police':'thief'],0,role);preview.group.position.copy(spot(0,0));preview.group.rotation.y=0;previewClip='idle';previewTime=0;preview.anim.play('idle');labels();}
function labels(){$('#costume-label').textContent=COSTUMES.find(c=>c.id===costume).name.toUpperCase();$('#equipped-label').textContent=TOOLS.find(t=>t.id===tool).name.toUpperCase()+' EQUIPPED';$('#tool-action-label').textContent=TOOLS.find(t=>t.id===tool).key;}
function demo(name){const loop=['idle','thiefRun','policeRun','jet','bustedIdle','dance'].includes(name);previewClip=name;previewTime=loop?0:clips[name]?.duration||1;preview?.anim.play(name,{loop,restart:true});}
function choice(id,name,sub,selected,icon=''){return `<button class="choice${selected?' selected':''}" data-choice="${id}" aria-pressed="${selected}">${icon}<strong>${name}</strong><small>${sub}</small></button>`;}
function openPage(name){if(busy)return;activePage=name;$('#home').hidden=name!=='home';$('#page').hidden=name==='home';$('#page').scrollTop=0;if(name==='home'){if(preview)preview.anim.play('idle');return;}
 $('#page-title').textContent={play:'LET’S PLAY',tools:'TOOLS',costume:'COSTUME',settings:'SETTING',credits:'CREDIT'}[name];
 $('#page-kicker').textContent={play:'PICK A SIDE. CAUSE TROUBLE.',tools:'A LITTLE HELP FOR YOUR GETAWAY',costume:'LOOK GOOD. RUN FAST.',settings:'MAKE YOURSELF COMFORTABLE',credits:'MADE FOR A LITTLE TROUBLE'}[name];
 const content=$('#page-content');
 if(name==='play'){
  content.innerHTML=`<p class="page-copy">Pick your side for a quick chase through the Mall.</p><div class="card-grid">${choice('runner','RUNNER','Stay uncaught until time is up.',role==='runner')}${choice('chaser','CHASER','Catch all three runners.',role==='chaser')}</div><div class="map-card"><div><strong>MALL</strong><small>60 seconds · 3 local bots · fixed camera</small></div><span>✦</span></div><button id="start-match" class="primary">LET’S PLAY →</button><div class="match-note">WASD / joystick to move · Shift to dash · Space to jump · E to use your tool. One chaser, three runners. This build is local practice.</div>`;
  for(const b of content.querySelectorAll('[data-choice]'))b.onclick=()=>{role=b.dataset.choice;previewModel();openPage('play');};$('#start-match').onclick=start;
 }else if(name==='tools'){
  const selected=TOOLS.find(t=>t.id===tool);
  content.innerHTML=`<p class="page-copy">Choose a tool. It’s equipped immediately for your next chase.</p><div class="card-grid">${TOOLS.map(t=>choice(t.id,t.name,t.id===tool?'EQUIPPED':'SELECT TOOL',t.id===tool,t.icon?`<img src="assets/psx/${t.icon}.png" alt="">`:'<span class="rocket-icon">↗</span>')).join('')}</div><p class="selection-note">${selected.description}</p><button id="preview-tool" class="primary">PREVIEW ${selected.key}</button><div class="panel-label">ANIMATION PREVIEW</div><select id="animation-preview" aria-label="Animation preview">${ANIMATION_PREVIEWS.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><button id="replay-preview" class="secondary">REPLAY ANIMATION</button>`;
  for(const b of content.querySelectorAll('[data-choice]'))b.onclick=()=>{tool=b.dataset.choice;localStorage.setItem('pnt-tool',tool);labels();openPage('tools');demo(TOOLS.find(t=>t.id===tool).clip);};$('#preview-tool').onclick=()=>demo(selected.clip);$('#animation-preview').onchange=e=>demo(e.target.value);$('#replay-preview').onclick=()=>demo($('#animation-preview').value);
 }else if(name==='costume'){
  content.innerHTML=`<p class="page-copy">Your character, your getaway. Select a costume to equip it. New costumes load once, then stay ready.</p><div class="card-grid">${COSTUMES.map(c=>choice(c.id,c.name,c.id===costume?'EQUIPPED':c.tag,c.id===costume)).join('')}</div><button id="costume-dance" class="secondary">SHOW YOUR MOVES</button>`;
  for(const b of content.querySelectorAll('[data-choice]'))b.onclick=()=>selectCostume(b.dataset.choice);$('#costume-dance').onclick=()=>demo('dance');
 }else if(name==='settings'){
  content.innerHTML=`<div class="setting-row"><label for="quality">Graphics<small>Battery uses fewer pixels.</small></label><select id="quality"><option value="balanced">Balanced</option><option value="battery">Battery</option></select></div><div class="setting-row"><label for="motion">Menu motion<small>Gentler menu transitions.</small></label><select id="motion"><option value="normal">Normal</option><option value="reduced">Reduced</option></select></div><p class="page-copy">The match camera stays fixed in a top-down view. Your character follows the joystick or WASD directly. No camera drag is needed.</p><button id="fullscreen" class="secondary">TOGGLE FULLSCREEN</button>`;
  $('#quality').value=quality;$('#quality').onchange=e=>{quality=e.target.value;localStorage.setItem('psx-web-quality',quality);resize();};$('#motion').value=reduced?'reduced':'normal';$('#motion').onchange=e=>{reduced=e.target.value==='reduced';document.body.classList.toggle('reduced-motion',reduced);};$('#fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
 }else{
  content.innerHTML=`<div class="credits-copy"><p><b>POLICE N THIEF</b><br>Characters, costumes and animations from the original PSX project.</p><p><b>UI FOUNDATION & INSPIRATION</b><br>Wonder Wave / PURRITORY — Jayden Davis.</p><p><b>BUILT WITH</b><br>Three.js · Titan One · Rubik</p><p><a href="credits.html" target="_blank" rel="noopener">Full credits & licence notices ↗</a></p><p>Web 0.2 · local practice. Online multiplayer is still in development.</p></div>`;
 }
 $('#page-back').focus({preventScroll:true});
}
async function selectCostume(id){const previous=costume;costume=id;beginLoading('DRESSING FOR TROUBLE');try{await ensureCostume();progress(90,'Preparing your character…');previewModel();await renderer.compileAsync(scene,menuCamera);localStorage.setItem('pnt-costume',costume);endLoading();openPage('costume');}catch(error){costume=previous;loadError(error,()=>selectCostume(id));}}
for(const b of document.querySelectorAll('[data-page]')){b.onclick=()=>openPage(b.dataset.page);b.onpointermove=e=>{const r=b.getBoundingClientRect();b.style.setProperty('--mx',`${(e.clientX-r.left)/r.width*100}%`);b.style.setProperty('--my',`${(e.clientY-r.top)/r.height*100}%`);};}
$('#page-back').onclick=()=>openPage('home');$('#pause-button').onclick=pauseGame;$('#resume').onclick=resume;$('#leave').onclick=menu;$('#result-menu').onclick=menu;$('#again').onclick=start;
addEventListener('keydown',e=>{if(e.target.matches('select,input,textarea')||busy)return;if(round&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(paused)resume();else if(round)pauseGame();else openPage('home');return;}keys.add(e.code);if(round&&!paused&&!e.repeat){if(e.code.startsWith('Shift'))useDash();if(e.code==='Space')jump();if(e.code==='KeyE')useTool();}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{clearInput();pauseGame();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});
const joystick=$('#joystick');function moveStick(e){const r=joystick.getBoundingClientRect(),radius=r.width*.34;let x=(e.clientX-r.left-r.width/2)/radius,z=-(e.clientY-r.top-r.height/2)/radius;const d=Math.max(1,Math.hypot(x,z));input.x=x/d;input.z=z/d;$('#stick').style.transform=`translate(${input.x*radius}px,${-input.z*radius}px)`;}
joystick.addEventListener('pointerdown',e=>{if(busy||paused||stick.id!==null)return;stick.id=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)moveStick(e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId!==stick.id)return;stick.id=null;input.x=input.z=0;$('#stick').style.transform='';});
$('#dash').onclick=useDash;$('#jump').onclick=jump;$('#tool-action').onclick=useTool;
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
function avatar(template,id,actorRole){
 const model=clone(template.scene),group=new THREE.Group();model.updateMatrixWorld(true);
 let box=new THREE.Box3().setFromObject(model),height=box.max.y-box.min.y;model.scale.multiplyScalar(1.55/height);model.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));group.add(model);scene.add(group);group.position.copy(spot((id-1.5)*2.7,id%2?4:-3));
 model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)m.roughness=Math.max(.55,m.roughness||0);}});
 const anim=makeAnimator(model,clips,actorRole);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.35,.42,24),new THREE.MeshBasicMaterial({color:id===0?0xff8a14:actorRole==='chaser'?0x2f5bff:0xffffff,transparent:true,opacity:.8,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;group.add(ring);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.35,20),new THREE.MeshBasicMaterial({color:0x09154b,transparent:true,opacity:.25,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;group.add(shadow);
 return {id,group,model,anim,ring,shadow,velocity:0,grounded:true,speed:0,wander:id*2.2};
}
function populate(){for(const a of avatars)destroy(a);avatars=[];for(const state of round.actors){const template=state.id===0&&costume!=='role'?templates[costume]:templates[state.role==='chaser'?'police':'thief'];avatars.push(avatar(template,state.id,state.role));}}
async function start(){if(!ready||busy)return;beginLoading('SETTING UP THE CHASE');await nextFrame();try{await ensureCostume();progress(55,'Placing the crew…');destroy(preview);preview=null;round=createRound(role);paused=false;clearInput();clearHazards();populate();cameraTarget.copy(avatars[0].group.position);positionMatchCamera();progress(85,'Warming up materials…');await renderer.compileAsync(scene,matchCamera);renderer.render(scene,matchCamera);progress(100,'Ready. Set. Run!');await nextFrame();$('#role-label').textContent=role.toUpperCase();$('#role-label').classList.toggle('chaser',role==='chaser');labels();show('hud');endLoading();say(role==='runner'?'STAY OUT OF REACH!':'CATCH THE CREW!');updateHud();}catch(e){round=null;loadError(e,start);}}
function canAct(){return round&&round.phase==='playing'&&!paused&&!busy&&!round.actors[0].caught&&round.actors[0].effectTime<=0;}
function useDash(){if(canAct()&&dash(round,0))say('GO, GO, GO!',.65);}
function jump(){const a=avatars[0];if(canAct()&&a?.grounded){a.velocity=5.5;a.grounded=false;}}
function setEffect(state,name,time){state.effect=name;state.effectTime=time;}
function useTool(){if(!canAct()||round.actors[0].toolCooldown>0)return;const player=avatars[0],state=round.actors[0];state.toolCooldown=8;
 if(tool==='hammer'){
  setEffect(state,'hammer',.48);let hits=0;
  for(const other of round.actors){if(other.role===state.role||other.caught)continue;const a=avatars[other.id];if(player.group.position.distanceTo(a.group.position)<2.4){setEffect(other,a.grounded?'stunned':'airStunned',2);a.velocity=a.grounded?0:a.velocity;hits++;}}
  say(hits?'HAMMER HIT!':'HAMMER SWING!',1);
 }else if(tool==='banana'){
  const mesh=new THREE.Mesh(new THREE.TorusGeometry(.24,.09,7,16,Math.PI*1.35),new THREE.MeshStandardMaterial({color:0xffdb28,roughness:.65}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(player.group.position).add(new THREE.Vector3(-Math.sin(player.group.rotation.y)*.7,.08,-Math.cos(player.group.rotation.y)*.7));scene.add(mesh);hazards.push({mesh,ownerRole:state.role,time:10});say('PEEL DROPPED!',1);
 }else{setEffect(state,'rocket',1.65);player.velocity=4.5;player.grounded=false;say('ROCKET JET!',1);}
}
function move(a,dx,dz,dt,speed){const p=a.group.position,magnitude=Math.hypot(dx,dz);if(magnitude>.01){dx/=Math.max(1,magnitude);dz/=Math.max(1,magnitude);}const nx=p.x+dx*speed*dt,nz=p.z+dz*speed*dt;let moved=false;
 if(magnitude>.01){if(walkable(nx,p.z,p.y)){p.x=nx;moved=true;}if(walkable(p.x,nz,p.y)){p.z=nz;moved=true;}}
 if(magnitude>.06&&moved){const angle=Math.atan2(dx,dz);a.group.rotation.y+=Math.atan2(Math.sin(angle-a.group.rotation.y),Math.cos(angle-a.group.rotation.y))*Math.min(1,dt*14);}
 const h=heightAt(p.x,p.z);a.velocity-=16*dt;p.y+=a.velocity*dt;if(Number.isFinite(h)&&p.y<=h){p.y=h;a.velocity=0;a.grounded=true;}else a.grounded=false;if(p.y<-5){p.copy(spot(0,0));a.velocity=0;}a.speed=THREE.MathUtils.damp(a.speed,magnitude>.05&&moved?1:0,10,dt);return moved;
}
function animate(a,state,dt){let name=animationFor(state,a.speed>.16,!a.grounded);if(name==='rocket'&&state.effectTime<1.2)name='jet';a.anim.play(name,{loop:!['hammer','stunned','airStunned','busted','rocket'].includes(name)});a.anim.update(dt);a.group.userData.animation=name;}
function updateGame(dt){stepRound(round,dt);const chaser=round.actors.find(a=>a.role==='chaser'),cop=avatars[chaser.id];
 for(const state of round.actors){const a=avatars[state.id];if(state.caught){move(a,0,0,dt,0);animate(a,state,dt);continue;}let dx=0,dz=0;
  if(state.id===0){dx=input.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);dz=-input.z-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+(keys.has('KeyS')||keys.has('ArrowDown')?1:0);}
  else if(state.role==='chaser'){const targets=round.actors.filter(r=>r.role==='runner'&&!r.caught).sort((a,b)=>cop.group.position.distanceToSquared(avatars[a.id].group.position)-cop.group.position.distanceToSquared(avatars[b.id].group.position));if(targets[0]){const target=avatars[targets[0].id].group.position;dx=target.x-a.group.position.x;dz=target.z-a.group.position.z;}}
  else{const p=a.group.position,c=cop.group.position,d=p.distanceTo(c);a.wander+=dt*.45;if(d<6){dx=p.x-c.x;dz=p.z-c.z;}else{dx=Math.sin(a.wander);dz=Math.cos(a.wander*.79);}}
  const locked=state.effectTime>0&&state.effect!=='rocket';if(locked)dx=dz=0;
  if(state.effect==='rocket'&&state.effectTime>0&&Math.hypot(dx,dz)<.1){dx=Math.sin(a.group.rotation.y);dz=Math.cos(a.group.rotation.y);}
  const moved=move(a,dx,dz,dt,(state.role==='chaser'?3.65:3.4)*(state.id===0?1.08:1)*(state.dash>0?1.7:1)*(state.effect==='rocket'&&state.effectTime>0?1.9:1));
  if(!moved&&state.id!==0&&!locked){a.wander+=dt*4;move(a,Math.sin(a.wander+state.id),Math.cos(a.wander+state.id),dt,2.7);}animate(a,state,dt);
 }
 for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];h.time-=dt;for(const state of round.actors){if(state.caught||state.role===h.ownerRole||state.effectTime>0)continue;if(avatars[state.id].group.position.distanceTo(h.mesh.position)<.8){setEffect(state,'banana',2);h.time=0;say(state.id===0?'BANANA SPIN!':'SLIPPED UP!',1.2);break;}}if(h.time<=0){scene.remove(h.mesh);h.mesh.geometry.dispose();h.mesh.material.dispose();hazards.splice(i,1);}}
 if(round.remaining<58.5&&chaser.effectTime<=0)for(const r of round.actors.filter(a=>a.role==='runner'&&!a.caught)){const p=cop.group.position,q=avatars[r.id].group.position,d=p.distanceTo(q);if(d<.9&&Math.abs(p.y-q.y)<.8){const from=p.clone().addScaledVector(up,.65),to=q.clone().addScaledVector(up,.65),direction=to.sub(from);ray.set(from,direction.normalize());ray.far=Math.max(0,d-.12);if(!ray.intersectObjects(ground,true).length&&tag(round,chaser.id,r.id,d))say(r.id===0?'YOU WERE TAGGED!\nWatch the rest of the crew.':'RUNNER TAGGED!');}}
 if(round.phase==='finished'){paused=false;const won=round.winner===round.playerRole;$('#result-title').textContent=won?(role==='runner'?'Great escape!':'Crew caught!'):(role==='runner'?'Busted.':'They got away.');$('#result-eyebrow').textContent=won?'YOU WIN':'ROUND OVER';$('#result-copy').textContent=round.winner==='chaser'?'All three runners were tagged.':`${round.actors.filter(a=>a.role==='runner'&&!a.caught).length} runners survived the chase.`;show('results');}updateHud();
}
function updateHud(){const seconds=Math.ceil(round.remaining);$('#timer').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;const signature=round.actors.map(a=>`${a.role}:${a.caught}`).join('|');if($('#crew-status').dataset.signature!==signature){$('#crew-status').dataset.signature=signature;$('#crew-status').replaceChildren(...round.actors.filter(a=>a.role==='runner').map(a=>{const chip=document.createElement('span');chip.className=`crew-chip${a.caught?' caught':''}`;chip.textContent=`${a.id===0?'YOU':`RUNNER ${a.id}`} · ${a.caught?'TAGGED':'FREE'}`;return chip;}));}const state=round.actors[0];$('#dash-status').textContent=state.cooldown>0?`${Math.ceil(state.cooldown)}s`:'SHIFT';$('#dash').disabled=state.cooldown>0||state.caught;$('#tool-status').textContent=state.toolCooldown>0?`${Math.ceil(state.toolCooldown)}s`:'E';$('#tool-action').disabled=state.toolCooldown>0||state.caught;$('#jump').disabled=state.caught;}
function positionMatchCamera(){matchCamera.position.copy(cameraTarget).add(new THREE.Vector3(0,22,13));matchCamera.lookAt(cameraTarget);}
async function boot(){beginLoading('GETTING READY');try{let done=0;const names=['thief','police','mall-slice'];const items=await Promise.all(names.map(async name=>{const value=await getGLB(name,`assets/psx/${name}.glb`);progress(++done/4*70,`Loading ${name==='mall-slice'?'Mall promenade':name}…`);return value;}));templates={thief:items[0],police:items[1]};const response=await fetch('assets/psx/animations/clips.json');if(!response.ok)throw new Error('Animation download failed');const data=await response.json();clips=Object.fromEntries(Object.entries(data.clips).map(([name,clip])=>[name,THREE.AnimationClip.parse(clip)]));progress(75,'Preparing the walkable arena…');const arena=items[2].scene;arena.updateMatrixWorld(true);const initial=new THREE.Box3().setFromObject(arena),center=initial.getCenter(new THREE.Vector3());arena.position.add(new THREE.Vector3(-center.x,-initial.min.y,-center.z));scene.add(arena);arena.updateMatrixWorld(true);arena.traverse(o=>{if(o.isMesh){ground.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.roughness=Math.max(.7,m.roughness||0);if(m.map)m.map.anisotropy=2;}}});bounds=new THREE.Box3().setFromObject(arena);buildGround();await ensureCostume();progress(90,'Warming up characters and fonts…');previewModel();await document.fonts.ready;await renderer.compileAsync(scene,menuCamera);progress(100,'All set. Let’s play.');ready=true;document.body.dataset.assets='ready';show('menu');endLoading();openPage('home');}catch(e){document.body.dataset.assets='error';loadError(e,()=>location.reload());}}
function frame(now=performance.now()){requestAnimationFrame(frame);const dt=Math.max(0,Math.min((now-lastFrame)/1000,.05));lastFrame=now;
 if(ready){if(round){if(round.phase==='playing'&&!paused&&!busy)updateGame(dt);const target=avatars[0]?.group.position;if(target){const groundY=heightAt(target.x,target.z);const desired=new THREE.Vector3(target.x,Number.isFinite(groundY)?groundY:0,target.z);cameraTarget.lerp(desired,1-Math.exp(-dt*8));positionMatchCamera();}}
 else if(preview){preview.anim.update(dt);if(previewTime>0){previewTime-=dt;if(previewTime<=0)preview.anim.play('idle');}const p=preview.group.position,narrow=innerWidth<760,pagePreview=narrow&&activePage!=='home';const distance=pagePreview?9:4.6,offset=distance*Math.tan(THREE.MathUtils.degToRad(menuCamera.fov/2))*menuCamera.aspect*.43;menuCamera.position.set(p.x,p.y+1.45,p.z+distance);menuCamera.lookAt(p.x-offset,p.y+(pagePreview?3:.8),p.z);}}
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').textContent='';}renderer.render(scene,round?matchCamera:menuCamera);
}
frame();boot();
