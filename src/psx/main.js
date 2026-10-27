import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createRound,stepRound,beginCapture,activateTool,canAct as canActRule,harvest,rescue,cancelInteraction,INTERACT_RADIUS,RESCUE_SECONDS} from './rules.js';
import {normalizeLoadout,equipTool,normalizeCostume} from './loadout.js';
import {makeAnimator,animationFor} from './animation.js';
import {COSTUMES,TOOLS} from './catalog.js';
import {createLobby,addBot,removeBot,beginCountdown,cancelCountdown,stepLobby,cycleMap,resolveRole,validateRoomCode,PREFERENCES,BOTS} from './lobby-state.js';
import {renderLobby} from './lobby-ui.js';
import {createWonderUI} from './wonder-ui.js';
import {PROFILE_KEY,readProfile,saveProfile,profileName,recordMatch} from './profile.js';
import {renderHomeWidgets} from './home-widgets.js';
import {bindGameControls} from './touch-controls.js';
import {configureFullscreen} from './fullscreen.js';
import {sampleGround,dampVelocity,simulationSteps} from './motion.js';
import {matchView} from './camera-rig.js';
import {canTraverse,gridSightClear} from './collision.js';
import {createResultPortrait} from './result-portrait.js';
import {createGameFX,createToonSmoke} from './game-fx.js';
import {stageEndState,rollSpinDirection,movementGroundReference} from './action-state.js';
import {renderResults} from './results-ui.js';
import {findPath,screenToWorld} from './navigation.js';
import {buildWalkGrid,arenaBounds,solidForGameplay} from './world-navigation.js';
let resultPortrait=null;
let touchControls,interactHeld=false,menuArena=null,gameArena=null,mapData=null,menuNavigation=null;
let profile=readProfile(localStorage);
const $=s=>document.querySelector(s),canvas=$('#world');
const ui={menu:$('#menu'),hud:$('#hud'),pause:$('#pause'),results:$('#results'),lobby:$('#lobby')};
const scene=new THREE.Scene();scene.background=new THREE.Color('#70688f');scene.fog=new THREE.Fog('#70688f',38,85);
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const menuCamera=new THREE.PerspectiveCamera(40,1,.05,120),matchCamera=new THREE.PerspectiveCamera(30,1,.1,180);
scene.add(new THREE.HemisphereLight(0xeaf4ff,0x6c728e,2.4));
const sunlight=new THREE.DirectionalLight(0xfff1df,3);sunlight.position.set(8,16,7);scene.add(sunlight);
const fill=new THREE.DirectionalLight(0xb6d8ff,1.2);fill.position.set(-8,7,-4);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x77768c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.3;scene.add(floor);
const up=new THREE.Vector3(0,1,0),down=new THREE.Vector3(0,-1,0);
const loader=new GLTFLoader(),cache=new Map();
const gameFX=createGameFX(scene);

let ready=false,role='runner',quality=localStorage.getItem('psx-web-quality')||'balanced';
let costume=normalizeCostume(localStorage.getItem('pnt-costume'));
let loadout=normalizeLoadout(localStorage.getItem('pnt-loadout'),localStorage.getItem('pnt-tool')),selectedTool=loadout[0];
let round=null,avatars=[],preview=null,previewClip='idle',previewTime=0,templates={},clips={},ground=[],bounds=null,grid=null;
let paused=false,activePage='home',toastTime=0,lastFrame=performance.now(),busy=false;
const keys=new Set(),input={x:0,z:0},cameraTarget=new THREE.Vector3(),hazards=[];
let room=null,returnToLobby=false,lobbyDisplays=[];
const lobbyCamera=new THREE.PerspectiveCamera(34,1,.05,30);lobbyCamera.position.set(0,1.3,3.2);lobbyCamera.lookAt(0,.8,0);
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const uiEffects=createWonderUI({blocked:()=>busy||!$('#loading').hidden||!ui.hud.hidden,reduced:()=>reduced});
document.body.classList.toggle('reduced-motion',reduced);
function resize(){const aspect=innerWidth/innerHeight;menuCamera.aspect=aspect;menuCamera.updateProjectionMatrix();matchCamera.aspect=aspect;matchCamera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='battery'?1:1.5));renderer.setSize(innerWidth,innerHeight,false);}
addEventListener('resize',resize);resize();
function show(name){for(const [key,node]of Object.entries(ui))node.hidden=key!==name;document.body.classList.toggle('playing',name==='hud'||name==='pause'||name==='results');document.body.classList.toggle('lobby-view',name==='lobby');document.body.classList.toggle('menu-view',name==='menu');$('#lobby-backdrop').hidden=!['menu','lobby'].includes(name);scene.background=name==='menu'?null:new THREE.Color('#70688f');floor.visible=name!=='menu';if(menuArena)menuArena.visible=false;}
function say(text,seconds=2){$('#toast').textContent=text;toastTime=seconds;}
function clearInput(){interactHeld=false;keys.clear();input.x=input.z=0;touchControls?.reset();}
function pauseGame(){if(!round||round.phase!=='playing'||paused||busy)return;paused=true;clearInput();show('pause');}
function resume(){paused=false;show('hud');lastFrame=performance.now();}
function progress(value,text){$('#load-progress').style.width=`${Math.round(value)}%`;$('#load-percent').textContent=`${Math.round(value)}%`;$('#load-status').textContent=text;}
function beginLoading(title){busy=true;clearInput();$('#loading').hidden=false;$('#loading').setAttribute('aria-busy','true');$('#loading-title').textContent=title;$('#retry').hidden=true;$('#error').hidden=true;progress(0,'Preparing assets…');}
function endLoading(){busy=false;$('#loading').hidden=true;$('#loading').setAttribute('aria-busy','false');lastFrame=performance.now();}
function loadError(error,retry){console.error(error);$('#loading-title').textContent='LET’S TRY THAT AGAIN';$('#load-status').textContent=error.message;$('#retry').hidden=false;$('#retry').onclick=retry;busy=false;}
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
async function getGLB(key,url,onProgress){if(cache.has(key))return cache.get(key);const pending=loader.loadAsync(url,onProgress);cache.set(key,pending);try{return await pending;}catch(e){cache.delete(key);throw e;}}
async function ensureCostume(){const c=COSTUMES.find(c=>c.id===costume);if(templates[c.id]||!c.file)return;templates[c.id]=await getGLB(c.id,`assets/psx/costumes/${c.file}.glb`,e=>progress(e.total?Math.min(85,e.loaded/e.total*85):30,`Loading ${c.name}…`));}
function destroy(a){if(!a)return;a.group.removeFromParent();a.anim.dispose();const skeletons=new Set();a.model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const skeleton of skeletons)skeleton.dispose();for(const mesh of [a.ring,a.shadow]){mesh.geometry.dispose();mesh.material.dispose();}}
function clearHazards(){gameFX.clear();for(const h of hazards)disposeHazard(h);hazards.length=0;}
function menu(){clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;restoreMenuArena();room=null;returnToLobby=false;clearLobbyDisplays();round=null;paused=false;clearInput();clearHazards();for(const a of avatars)destroy(a);avatars=[];previewModel();show('menu');openPage('home');}
function previewModel(){destroy(preview);preview=avatar(templates[costume],0,role);preview.group.position.copy(spot(0,0));preview.group.rotation.y=0;previewClip='idle';previewTime=0;preview.anim.play('idle');labels();}
function labels(){
 renderHomeWidgets(profile,loadout,costume);
 $('#costume-label').textContent=COSTUMES.find(c=>c.id===costume).name.toUpperCase();$('#equipped-label').textContent=loadout.map(id=>TOOLS.find(t=>t.id===id).name.toUpperCase()).join(' / ');
 loadout.forEach((id,slot)=>{const tool=TOOLS.find(t=>t.id===id);$('#tool-action-label'+(slot+1)).textContent=tool.key;$('#tool-action-icon'+(slot+1)).src='assets/psx/'+tool.icon+'.png';$('#tool-action'+(slot+1)).setAttribute('aria-label','Use slot '+(slot+1)+': '+tool.name);});
}
function demo(name){const loop=['idle','thiefRun','policeRun','jet','bustedIdle','dance'].includes(name);previewClip=name;previewTime=loop?0:clips[name]?.duration||1;preview?.anim.play(name,{loop,restart:true});}
function goBack(){
 if(busy)return;uiEffects.sounds.play('ui_back');
 if(room&&!ui.lobby.hidden){const help=$('#room-help');if(help&&!help.hidden){help.hidden=true;return;}if(cancelCountdown(room)){refreshLobby();return;}quitLobby();return;}
 if(returnToLobby&&room){returnToLobby=false;room.players[0].costume=costume;buildLobbyDisplays();show('lobby');refreshLobby();return;}
 openPage(activePage==='join'?'play':'home');
}
function clearLobbyDisplays(){for(const display of lobbyDisplays){destroy(display.actor);display.base.geometry.dispose();display.base.material.dispose();}lobbyDisplays=[];}
function buildLobbyDisplays(){
 clearLobbyDisplays();const colors=[0x005bff,0xff9a00,0x00c54b,0xff36a9];
 for(let i=0;i<4;i++){
  const stage=new THREE.Scene();stage.add(new THREE.HemisphereLight(0xf4f8ff,0x7280a0,2.8));const light=new THREE.DirectionalLight(0xffffff,3.2);light.position.set(-2,4,4);stage.add(light);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.82,.85,.14,40),new THREE.MeshStandardMaterial({color:room.players[i]?colors[i]:0xadb8ca,roughness:.5}));stage.add(base);
  const player=room.players[i];let actor=null;
  if(player){actor=avatar(templates[player.costume],i,'runner');actor.group.position.set(0,.08,0);actor.group.rotation.y=0;actor.ring.visible=false;actor.anim.update(i*.6);stage.add(actor.group);}
  lobbyDisplays.push({scene:stage,base,actor});
 }
}
function refreshLobby(){
 if(!room)return;
 renderLobby(ui.lobby,room,loadout,costume,{
  quit:quitLobby,addBot:()=>{if(addBot(room)){buildLobbyDisplays();refreshLobby();}},removeBot:()=>{if(removeBot(room)){buildLobbyDisplays();refreshLobby();}},
  map:direction=>{if(cycleMap(room,direction))refreshLobby();},preference:()=>{room.preference=PREFERENCES[(PREFERENCES.indexOf(room.preference)+1)%PREFERENCES.length];refreshLobby();},
  start:()=>{if(beginCountdown(room)){lastFrame=performance.now();refreshLobby();}},cancel:()=>{cancelCountdown(room);refreshLobby();},
  edit:page=>{cancelCountdown(room);returnToLobby=true;previewModel();show('menu');openPage(page);},
 });
}
async function hostLobby(){
 if(!ready||busy)return;beginLoading('GATHERING THE CREW');await nextFrame();
 try{await ensureCostume();let loaded=0;await Promise.all(BOTS.map(async bot=>{if(!templates[bot.costume])templates[bot.costume]=await getGLB(bot.costume,`assets/psx/costumes/${bot.costume}.glb`);progress(++loaded/BOTS.length*85,'Preparing the lobby characters…');}));
  room=createLobby(costume);room.players[0].name=profile.name;returnToLobby=false;buildLobbyDisplays();refreshLobby();progress(90,'Warming up the lobby…');for(const display of lobbyDisplays)await renderer.compileAsync(display.scene,lobbyCamera);show('lobby');endLoading();
 }catch(error){room=null;loadError(error,hostLobby);}
}
function quitLobby(){room=null;returnToLobby=false;clearLobbyDisplays();show('menu');if(!preview)previewModel();openPage('play');}
function renderLobbyCharacters(dt){
 renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.setClearColor(0,0);renderer.clear();
 const windows=ui.lobby.querySelectorAll('.avatar-window');
 for(let i=0;i<windows.length;i++){
  const rect=windows[i].getBoundingClientRect(),left=Math.max(0,rect.left),right=Math.min(innerWidth,rect.right),top=Math.max(0,rect.top),bottom=Math.min(innerHeight,rect.bottom);
  if(right<=left||bottom<=top)continue;
  lobbyDisplays[i]?.actor?.anim.update(dt);lobbyCamera.aspect=rect.width/rect.height;lobbyCamera.updateProjectionMatrix();renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(left,innerHeight-bottom,right-left,bottom-top);renderer.setScissorTest(true);renderer.render(lobbyDisplays[i].scene,lobbyCamera);
 }
 renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);
}
function choice(id,name,sub,selected,icon=''){return `<button class="choice${selected?' selected':''}" data-choice="${id}" aria-pressed="${selected}">${icon}<strong>${name}</strong><small>${sub}</small></button>`;}
function toolImage(t){return `<img src="assets/psx/${t.icon}.png" alt="">`;}
function renderTools(){
 const selected=TOOLS.find(t=>t.id===selectedTool),types=Object.fromEntries(TOOLS.map(t=>[t.id,t.type]));
 $('#page-content').innerHTML=`<p class="page-copy">Choose your kit. Two slots. Make them count.</p>
 <div class="equipped-slots" aria-label="Equipped tools">${loadout.map((id,slot)=>{const t=TOOLS.find(t=>t.id===id);return `<button class="equipped-slot" data-slot-detail="${slot}">${toolImage(t)}<span><small>SLOT ${slot+1} <kbd>${slot===0?'E':'R'}</kbd></small><strong>${t.name}</strong><em>${t.cooldown}s cooldown · ${types[id]}</em></span></button>`;}).join('')}</div>
 <div class="kit-body"><div id="tool-catalog" class="tool-catalog" aria-label="Tool catalog">${TOOLS.map(t=>choice(t.id,t.name,loadout.includes(t.id)?'SLOT '+(loadout.indexOf(t.id)+1):'AVAILABLE',t.id===selectedTool,toolImage(t))).join('')}</div>
 <section class="tool-detail" aria-label="Selected tool details"><div class="tool-detail-title">${toolImage(selected)}<h2>${selected.name}</h2></div><div class="tool-stats"><span>${selected.cooldown}s<small>COOLDOWN</small></span><span>${types[selected.id]}<small>TOOL TYPE</small></span></div><p>${selected.description.replace(" 8 second cooldown.","")}</p>
 <button id="equip-slot1" class="primary equip-button" ${loadout[0]===selectedTool?'disabled':''}>${loadout[0]===selectedTool?'EQUIPPED IN SLOT 1':'EQUIP SLOT 1'}</button><button id="equip-slot2" class="primary equip-button" ${loadout[1]===selectedTool?'disabled':''}>${loadout[1]===selectedTool?'EQUIPPED IN SLOT 2':'EQUIP SLOT 2'}</button><button id="preview-tool" class="secondary">PREVIEW ${selected.key}</button></section></div><p id="kit-status" class="kit-hint" role="status">CHOOSE A TOOL, THEN EQUIP A SLOT</p>`;
 for(const b of document.querySelectorAll('#tool-catalog [data-choice]'))b.onclick=()=>{selectedTool=b.dataset.choice;previewTime=0;preview.anim.play('idle');renderTools();};
 for(const b of document.querySelectorAll('[data-slot-detail]'))b.onclick=()=>{selectedTool=loadout[Number(b.dataset.slotDetail)];renderTools();};
 for(const slot of [0,1])$('#equip-slot'+(slot+1)).onclick=()=>{loadout=equipTool(loadout,selectedTool,slot);localStorage.setItem('pnt-loadout',JSON.stringify(loadout));labels();renderTools();$('#kit-status').textContent=`${selected.name.toUpperCase()} EQUIPPED IN SLOT ${slot+1}`;};
 $('#preview-tool').onclick=()=>demo(selected.clip);
}
function openPage(name){if(busy)return;activePage=name;if(preview)preview.group.visible=!['play','join'].includes(name);$('#page-back').textContent=returnToLobby?'← LOBBY':'← BACK';ui.menu.dataset.page=name;$('#home').hidden=name!=='home';$('#home-widgets').hidden=name!=='home';$('#page').hidden=name==='home';$('#page').scrollTop=0;if(name==='home'){labels();previewClip='idle';previewTime=0;if(preview)preview.anim.play('idle');return;}
 $('#page-title').textContent={play:'LET’S PLAY',join:'JOIN THE CHASE',tools:'TOOLS OF THE TRADE',costume:'YOUR LOOK',settings:'SETTING',credits:'CREDIT'}[name];
 $('#page-kicker').textContent={play:'GATHER THE CREW',join:'FIND YOUR CREW',tools:'A LITTLE HELP FOR YOUR GETAWAY',costume:'LOOK GOOD. RUN FAST.',settings:'MAKE YOURSELF COMFORTABLE',credits:'MADE FOR A LITTLE TROUBLE'}[name];
 const content=$('#page-content');
 if(name==='play'){
  content.innerHTML=`<p class="page-copy flow-copy">Gather the crew. A four-player chase starts here.</p><div class="flow-options"><button id="host-lobby" class="flow-option host-option"><img src="assets/psx/ui/users.png" alt=""><small>HOST A LOBBY</small><strong>YOUR ROOM.<br>YOUR CHASE.</strong><span>Create a local practice lobby with bots.</span><b>HOST LOBBY →</b></button><button id="join-lobby" class="flow-option join-option"><img src="assets/psx/ui/online.png" alt=""><small>FIND YOUR CREW</small><strong>JOIN THE<br>CHASE.</strong><span>Public matchmaking or a friend's room code.</span><b>JOIN LOBBY →</b></button></div><p class="flow-network-note">Local practice is available. Online matchmaking is not connected in this web build.</p>`;
  $('#host-lobby').onclick=hostLobby;$('#join-lobby').onclick=()=>openPage('join');
 }else if(name==='join'){
  content.innerHTML=`<p class="page-copy flow-copy">Find a public match or enter a friend's room code.</p><div class="flow-options"><section class="flow-option join-option"><img src="assets/psx/ui/online.png" alt=""><small>PUBLIC MATCHMAKING</small><strong>FIND A<br>CHASE.</strong><span>Join an open room with other players.</span><button id="public-match" class="primary">FIND PUBLIC MATCH</button></section><form id="join-code-form" class="flow-option code-option"><img src="assets/psx/ui/lock.png" alt=""><small>JOIN WITH A CODE</small><strong>GOT AN<br>INVITE?</strong><label for="join-code">ROOM CODE</label><input id="join-code" name="roomCode" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="6" placeholder="ABC123" aria-describedby="join-status"><button type="submit" class="primary">JOIN ROOM →</button></form></div><p id="join-status" class="flow-network-note" role="status">Online matchmaking is not connected. You can still host a local practice lobby.</p><button id="join-practice" class="secondary flow-practice">HOST LOCAL PRACTICE</button>`;
  const unavailable=()=>{$('#join-status').textContent='Online rooms are not connected yet. No search or join request was sent. Host local practice to play with bots.';};$('#public-match').onclick=unavailable;
  $('#join-code-form').onsubmit=e=>{e.preventDefault();if(!validateRoomCode($('#join-code').value)){$('#join-status').textContent='Enter a six-character room code using letters and numbers.';$('#join-code').focus();return;}unavailable();};$('#join-code').oninput=e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');};$('#join-practice').onclick=hostLobby;
 }else if(name==='tools'){
  renderTools();
 }else if(name==='costume'){
  content.innerHTML=`<p class="page-copy">Pick your costume. Bring your own kind of trouble.</p><div class="wardrobe-grid">${COSTUMES.map(c=>choice(c.id,c.name,c.id===costume?'EQUIPPED':'',c.id===costume,'<img src="assets/psx/portraits/'+c.id+'.png" alt="">')).join('')}</div><div class="wardrobe-footer"><p>CHOOSE A COSTUME TO EQUIP</p><small>One wardrobe for everyone. Any costume works as police or thief.</small></div><button id="costume-dance" class="secondary">SHOW YOUR MOVES</button>`;
  for(const b of content.querySelectorAll('[data-choice]'))b.onclick=()=>selectCostume(b.dataset.choice);$('#costume-dance').onclick=()=>demo('dance');
 }else if(name==='settings'){
  content.innerHTML=`<div class="setting-row"><label for="quality">Graphics<small>Battery uses fewer pixels.</small></label><select id="quality"><option value="balanced">Balanced</option><option value="battery">Battery</option></select></div><div class="setting-row"><label for="motion">Menu motion<small>Gentler menu transitions.</small></label><select id="motion"><option value="normal">Normal</option><option value="reduced">Reduced</option></select></div><div class="setting-row"><label for="ui-sounds">UI sounds<small>Original Wonder Wave menu feedback.</small></label><select id="ui-sounds"><option value="on">On</option><option value="off">Off</option></select></div><p class="page-copy">The match camera uses a fixed 30° perspective view. Your character follows the joystick or WASD directly. No camera drag is needed.</p><button id="fullscreen" class="secondary">FULLSCREEN</button><p id="fullscreen-status" class="page-copy fullscreen-help" role="status"></p>`;
  $('#ui-sounds').value=uiEffects.sounds.enabled?'on':'off';$('#ui-sounds').onchange=e=>uiEffects.sounds.setEnabled(e.target.value==='on');$('#quality').value=quality;$('#quality').onchange=e=>{quality=e.target.value;localStorage.setItem('psx-web-quality',quality);resize();};$('#motion').value=reduced?'reduced':'normal';$('#motion').onchange=e=>{reduced=e.target.value==='reduced';document.body.classList.toggle('reduced-motion',reduced);};configureFullscreen($('#fullscreen'),$('#fullscreen-status'));
 }else{
  content.innerHTML=`<div class="credits-copy"><p><b>POLICE N THIEF</b><br>Characters, costumes and animations from the original PSX project.</p><p><b>UI FOUNDATION & INSPIRATION</b><br>Wonder Wave / PURRITORY — Jayden Davis.</p><p><b>BUILT WITH</b><br>Three.js · Titan One · Rubik</p><p><a href="credits.html" target="_blank" rel="noopener">Full credits & licence notices ↗</a></p><p>Web 0.8.1 · local practice. Online multiplayer is still in development.</p></div>`;
 }
 $('#page-back').focus({preventScroll:true});
}
function refreshCostumeSelection(){
 const panel=$('#page'),scrollTop=panel.scrollTop;
 for(const button of panel.querySelectorAll('.wardrobe-grid [data-choice]')){const equipped=button.dataset.choice===costume;button.classList.toggle('selected',equipped);button.classList.toggle('is-on',equipped);button.setAttribute('aria-pressed',String(equipped));button.querySelector('small').textContent=equipped?'EQUIPPED':'';}
 panel.scrollTop=scrollTop;
}
async function selectCostume(id){if(id===costume)return;const previous=costume;costume=id;beginLoading('DRESSING FOR TROUBLE');try{await ensureCostume();progress(90,'Preparing your character…');previewModel();await renderer.compileAsync(scene,menuCamera);localStorage.setItem('pnt-costume',costume);endLoading();refreshCostumeSelection();}catch(error){costume=previous;loadError(error,()=>selectCostume(id));}}
for(const b of document.querySelectorAll('[data-page]'))b.onclick=()=>openPage(b.dataset.page);
$('#profile-name-edit').onclick=()=>{$('#profile-name-form').hidden=false;$('#profile-name-edit').setAttribute('aria-expanded','true');$('#profile-name-input').value=profile.name;$('#profile-name-input').focus();$('#profile-name-input').select();};
function closeNameForm(){$('#profile-name-form').hidden=true;$('#profile-name-edit').setAttribute('aria-expanded','false');$('#profile-name-edit').focus();}
$('#cancel-profile-name').onclick=closeNameForm;
$('#profile-name-input').onkeydown=e=>{if(e.code==='Escape'){e.stopPropagation();closeNameForm();}};
$('#profile-name-form').onsubmit=e=>{e.preventDefault();const name=profileName($('#profile-name-input').value);if(!name)return;profile={...readProfile(localStorage),name};if(!saveProfile(localStorage,profile)){$('#profile-save-status').textContent='Storage unavailable. Name applies for this visit.';}else closeNameForm();labels();uiEffects.sounds.play('ui_confirm');};
addEventListener('storage',e=>{if(e.key===PROFILE_KEY){profile=readProfile(localStorage);labels();}});

$('#page-back').onclick=goBack;$('#pause-button').onclick=pauseGame;$('#resume').onclick=resume;$('#leave').onclick=menu;$('#result-menu').onclick=menu;$('#again').onclick=start;
addEventListener('keydown',e=>{if(e.target.matches('select,input,textarea')||busy)return;if(round&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(paused)resume();else if(round)pauseGame();else goBack();return;}keys.add(e.code);if(round&&!paused&&!e.repeat){if(e.code==='KeyF')interact();if(e.code==='KeyE')useTool(0);if(e.code==='KeyR')useTool(1);}});
addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyF')stopInteract();});addEventListener('blur',()=>{clearInput();pauseGame();});document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(document.hidden)pauseGame();});
touchControls=bindGameControls({root:document,joystick:$('#joystick'),knob:$('#stick'),isActive:()=>!ui.hud.hidden&&!busy&&!paused&&round?.phase==='playing',onMove:(x,z)=>{input.x=x;input.z=z;},actions:[[$('#interact'),interact,stopInteract],[$('#tool-action1'),()=>useTool(0)],[$('#tool-action2'),()=>useTool(1)],[$('#pause-button'),pauseGame]]});
$('#pause-button').onclick=null;
for(const name of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(name,()=>{if(activePage==='settings'&&$('#fullscreen'))configureFullscreen($('#fullscreen'),$('#fullscreen-status'));});

async function loadArena(id){
 const [asset,data,nav,collision]=await Promise.all([getGLB('arena-'+id,`assets/psx/arenas/${id}.glb`,e=>progress(e.total?Math.min(50,e.loaded/e.total*50):15,'Loading '+id+' arena…')),fetch(`assets/psx/arenas/${id}.json`).then(r=>{if(!r.ok)throw Error('Missing arena metadata');return r.json();}),fetch(`assets/psx/arenas/${id}.nav.json`).then(r=>{if(!r.ok)throw Error('Missing arena navigation');return r.json();}),fetch(`assets/psx/arenas/${id}.collision.json`).then(r=>{if(!r.ok)throw Error('Missing Unreal collision');return r.json();})]);
 gameArena?.removeFromParent();gameArena=asset.scene;gameArena.visible=true;mapData=data;gameArena.position.set(...data.origin.map(v=>-v));scene.add(gameArena);gameArena.updateMatrixWorld(true);menuArena.visible=false;
 ground=[];gameArena.traverse(o=>{if(o.isMesh){if(solidForGameplay(o))ground.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.map)m.map.anisotropy=2;}});
 bounds=arenaBounds(gameArena,data);renderer.toneMappingExposure=id==='mall'?1.15*1.15:1.15;
 grid={...nav,blocked:collision.blocked,edges:collision.edges,heights:Float32Array.from(collision.groundHeights||nav.heights,v=>v===null?NaN:v)};floor.position.y=-12;floor.material.color.set(id==='mall'?0x77768c:id==='sunken'?0x24638b:0x9bc4d7);
 const props=[['propBanana','SM_TL_Banana'],['propSmoke','SM_TL_Bomb'],['propHammer','SM_TL_Hammer'],['propJet','jetpack'],['propRewind','rewind']];await Promise.all(props.map(async([key,file])=>{templates[key]=await getGLB(key,`assets/psx/props/${file}.glb`);}));
}
function restoreMenuArena(){renderer.toneMappingExposure=1.15;if(gameArena)gameArena.visible=false;if(menuArena){menuArena.visible=false;({ground,bounds,grid}=menuNavigation);}floor.position.y=-.3;floor.material.color.set(0x77768c);$('#world-markers').replaceChildren();}
function prop(key,size=1){const source=templates[key];if(!source)return null;const object=clone(source.scene);const box=new THREE.Box3().setFromObject(object),scale=size/Math.max(.01,...box.getSize(new THREE.Vector3()).toArray());object.scale.multiplyScalar(scale);object.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(object),center=b.getCenter(new THREE.Vector3());object.position.add(new THREE.Vector3(-center.x,-b.min.y,-center.z));const root=new THREE.Group();root.add(object);return root;}
function disposeHazard(h){h.mesh.removeFromParent();if(h.owned)h.mesh.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
function withinSight(p,q,smoke=true,stop=.35){
 const from=p.clone().addScaledVector(up,.65),to=q.clone().addScaledVector(up,.65),delta=to.sub(from),distance=delta.length();if(distance<.1)return true;
 if(smoke)for(const h of hazards.filter(h=>h.type==='smoke'&&h.time>0)){const t=THREE.MathUtils.clamp(h.mesh.position.clone().sub(from).dot(delta)/delta.lengthSq(),0,1),closest=from.clone().addScaledVector(delta,t);if(closest.distanceTo(h.mesh.position.clone().addScaledVector(up,.65))<2.6)return false;}
 return gridSightClear(grid,p.x,p.z,q.x,q.z,stop);
}
function steerBot(a,target,dt){
 a.routeTime=(a.routeTime||0)-dt;const p=a.group.position;
 if(a.routeTime<=0||!a.route||!a.routeGoal||a.routeGoal.distanceToSquared(target)>1){a.route=findPath(grid,p,target);a.routeGoal=target.clone();a.routeTime=.8;}
 while(a.route.length&&Math.hypot(a.route[0].x-p.x,a.route[0].z-p.z)<.22)a.route.shift();const next=a.route[0]||target,dx=next.x-p.x,dz=next.z-p.z,d=Math.hypot(dx,dz);return d>.06?{x:dx/d,z:dz/d}:{x:0,z:0};
}
function interactionTarget(id){
 const a=avatars[id],state=round.actors[id];if(!a||state.role!=='runner')return null;const p=a.group.position;
 const teammate=round.actors.filter(t=>t.id!==id&&t.caught).map(t=>({type:'rescue',target:t,position:avatars[t.id].group.position})).filter(t=>p.distanceTo(t.position)<INTERACT_RADIUS&&withinSight(p,t.position,false,1.1)).sort((a,b)=>p.distanceToSquared(a.position)-p.distanceToSquared(b.position))[0];if(teammate)return teammate;
 return round.caches.filter(c=>c.remaining>0).map(c=>({type:'money',target:c,position:new THREE.Vector3(...c.position)})).filter(t=>Math.hypot(p.x-t.position.x,p.z-t.position.z)<INTERACT_RADIUS&&Math.abs(p.y-t.position.y)<2&&withinSight(p,t.position,false,1.1)).sort((a,b)=>p.distanceToSquared(a.position)-p.distanceToSquared(b.position))[0]||null;
}
function performInteraction(id,target,dt){
 if(!target){cancelInteraction(round,id);return;}const p=avatars[id].group.position,d=Math.hypot(p.x-target.position.x,p.z-target.position.z);
 if(target.type==='money')harvest(round,id,target.target.id,dt,d);else if(rescue(round,id,target.target.id,dt,d)){say(id===0?'TEAMMATE RELEASED!':'A THIEF WAS RELEASED!',1.3);avatars[target.target.id].ring.material.color.setHex(0x83f9c4);}
}
function buildMarkers(){const root=$('#world-markers');root.replaceChildren();for(const c of round.caches){const node=document.createElement('div');node.className='world-marker cache-marker';node.id='marker-'+c.id;root.append(node);}for(const a of round.actors){if(a.role==='chaser')continue;const node=document.createElement('div');node.className='world-marker rescue-marker';node.id='rescue-'+a.id;root.append(node);}}
function updateMarkers(){
 if(!round||ui.hud.hidden)return;matchCamera.updateMatrixWorld();
 const place=(node,p)=>{const v=p.clone().project(matchCamera);node.hidden=v.z>1||v.z< -1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1;node.style.transform=`translate(-50%,-100%) translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px)`;};
 for(const c of round.caches){const node=$('#marker-'+c.id);if(!node)continue;node.textContent=c.remaining>0?'$'+Math.ceil(c.remaining).toLocaleString():'EMPTY';node.classList.toggle('empty',c.remaining<=0);place(node,new THREE.Vector3(...c.position).addScaledVector(up,2.4));}
 for(const a of round.actors.filter(a=>a.role==='runner')){const node=$('#rescue-'+a.id);if(!a.caught){node.hidden=true;continue;}node.textContent=a.releaseCooldown>0?'RELEASE IN '+Math.ceil(a.releaseCooldown)+'s':a.rescueProgress>0?'RELEASING '+Math.round(a.rescueProgress/RESCUE_SECONDS*100)+'%':'HOLD INTERACT TO RELEASE';place(node,avatars[a.id].group.position.clone().addScaledVector(up,2));}
}

function buildGround(){grid=buildWalkGrid(ground,bounds);}

function heightAt(x,z){return grid?sampleGround(grid,x,z):0;}
function walkable(x,z,y){const h=heightAt(x,z);return Number.isFinite(h)&&h-y<.5&&y-h<1.2;}
function spot(x,z){let best=null,distance=Infinity;for(let iz=2;iz<grid.nz-2;iz++)for(let ix=2;ix<grid.nx-2;ix++){
  const y=grid.heights[iz*grid.nx+ix];if(!Number.isFinite(y)||grid.blocked?.[iz*grid.nx+ix])continue;const px=bounds.min.x+ix*grid.step,pz=bounds.min.z+iz*grid.step,d=(px-x)**2+(pz-z)**2;
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
function populate(){for(const a of avatars)destroy(a);avatars=[];for(const state of round.actors){const template=state.id===0?templates[costume]:(templates[room?.players[state.id]?.costume]||templates[state.role==='chaser'?'police':'thief']);const actor=avatar(template,state.id,state.role);const p=mapData.spawns[state.id];actor.group.position.copy(spot(p[0],p[2]));actor.tools=state.id===0?loadout:state.role==='chaser'?['hammer','rocket']:state.id%2?['banana','smoke']:['rewind','rocket'];avatars.push(actor);}}
async function start(){if(!ready||busy)return;clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;if(room){role=resolveRole(room.preference);room.phase='playing';}returnToLobby=false;clearLobbyDisplays();beginLoading('SETTING UP THE CHASE');await nextFrame();try{await ensureCostume();await loadArena(['mall','sunken','iceberg'][room?.map||0]);progress(55,'Placing the crew…');destroy(preview);preview=null;round=createRound(role,mapData.caches);round.profileId=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);paused=false;clearInput();clearHazards();populate();buildMarkers();cameraTarget.copy(avatars[0].group.position);positionMatchCamera();progress(85,'Warming up materials…');await renderer.compileAsync(scene,matchCamera);renderer.render(scene,matchCamera);progress(100,'Ready. Set. Run!');await nextFrame();$('#role-label').textContent=role==='runner'?'THIEF':'POLICE';$('#role-label').classList.toggle('chaser',role==='chaser');labels();show('hud');endLoading();say(role==='runner'?'HOLD INTERACT TO STEAL CASH!':'CATCH ALL THREE THIEVES!');updateHud();}catch(e){round=null;loadError(e,start);}}
function canAct(){return round&&canActRule(round,0)&&!paused&&!busy;}
function interact(){if(canAct())interactHeld=true;}
function stopInteract(){interactHeld=false;if(round)cancelInteraction(round,0);}
function setEffect(state,name,time){state.effect=name;state.effectTime=time;if(name==='banana'){state.spinDirection=rollSpinDirection();state.spinTurn=.35;}}
function useTool(slot,id=0){
 const actor=avatars[id],state=round?.actors[id],tool=(id===0?loadout:actor?.tools)?.[slot];if(!actor||!state||!canActRule(round,id)||paused||busy)return;
 if(tool==='rewind'&&!actor.mark&&state.toolCooldowns[slot]<=0){actor.mark=actor.group.position.clone();const mesh=prop('propRewind',.6);mesh.position.copy(actor.mark);scene.add(mesh);hazards.push({mesh,type:'marker',owner:id,time:Infinity});if(id===0)say('MARK SET · PRESS AGAIN TO RETURN',1.5);return;}
 if(!activateTool(round,id,slot,tool))return;
 const point=actor.group.position.clone();
 if(tool==='hammer'){
  setEffect(state,'hammer',.48);actor.hammerImpact=.18;const visual=prop('propHammer',1.25);visual.position.set(.5,.6,.4);actor.group.add(visual);hazards.push({mesh:visual,type:'visual',time:.48});
  for(const other of round.actors){if(other.role===state.role||other.caught)continue;const a=avatars[other.id];if(point.distanceTo(a.group.position)<2&&withinSight(point,a.group.position,false))setEffect(other,a.grounded?'stunned':'airStunned',2);}
  if(id===0)say('HAMMER SWING!',.7);
 }else if(tool==='banana'){
  const mesh=prop('propBanana',.65);mesh.position.copy(point).add(new THREE.Vector3(-Math.sin(actor.group.rotation.y)*.7,.03,-Math.cos(actor.group.rotation.y)*.7));scene.add(mesh);hazards.push({mesh,type:'banana',owner:id,ownerRole:state.role,time:15});limitItems(id,'banana',5);if(id===0)say('PEEL DROPPED!',.7);
 }else if(tool==='smoke'){
  const mesh=prop('propSmoke',.65);mesh.position.copy(point);const cloud=createToonSmoke(1.2,14);cloud.position.y=.9;mesh.add(cloud);scene.add(mesh);hazards.push({mesh,type:'smoke',owner:id,time:20});limitItems(id,'smoke',3);if(id===0)say('SMOKE SCREEN!',.8);
 }else if(tool==='rewind'){
  if(actor.mark){actor.group.position.copy(spot(actor.mark.x,actor.mark.z));actor.velocity=0;actor.mark=null;for(const h of hazards)if(h.type==='marker'&&h.owner===id)h.time=0;if(id===0)say('BACK TO YOUR MARK!',.8);}
 }else if(tool==='rocket'){
  setEffect(state,'rocket',5);actor.velocity=4.5;actor.grounded=false;const mesh=prop('propJet',.8);mesh.position.set(0,.6,-.3);mesh.rotation.y=Math.PI/2;actor.group.add(mesh);hazards.push({mesh,type:'visual',time:5});if(id===0)say('JETPACK!',.7);
 }
}
function limitItems(owner,type,max){const all=hazards.filter(h=>h.owner===owner&&h.type===type&&h.time>0);for(let i=0;i<all.length-max;i++)all[i].time=0;}

function move(a,dx,dz,dt,speed){const p=a.group.position,magnitude=Math.hypot(dx,dz);if(magnitude>.01){dx/=Math.max(1,magnitude);dz/=Math.max(1,magnitude);}a.vx=dampVelocity(a.vx||0,dx*speed,dt);a.vz=dampVelocity(a.vz||0,dz*speed,dt);const nx=p.x+a.vx*dt,nz=p.z+a.vz*dt;let moved=false;
 const walkY=movementGroundReference(p.y,heightAt(p.x,p.z));
 if(Math.hypot(a.vx,a.vz)>.01){if(walkable(nx,p.z,walkY)&&canTraverse(grid,p.x,p.z,nx,p.z)){p.x=nx;moved=true;}else a.vx=0;if(walkable(p.x,nz,walkY)&&canTraverse(grid,p.x,p.z,p.x,nz)){p.z=nz;moved=true;}else a.vz=0;}
 if(magnitude>.06&&moved){const angle=Math.atan2(a.vx,a.vz);a.group.rotation.y+=Math.atan2(Math.sin(angle-a.group.rotation.y),Math.cos(angle-a.group.rotation.y))*Math.min(1,dt*14);}
 const h=heightAt(p.x,p.z),flying=round?.actors[a.id]?.effect==='rocket'&&round.actors[a.id].effectTime>0;if(flying&&Number.isFinite(h)){p.y=THREE.MathUtils.damp(p.y,h+1.8,6,dt);a.velocity=0;}else{a.velocity-=16*dt;p.y+=a.velocity*dt;}if(!flying&&Number.isFinite(h)&&(p.y<=h||a.grounded&&Math.abs(p.y-h)<.55)){p.y=THREE.MathUtils.damp(p.y,h,30,dt);a.velocity=0;a.grounded=true;}else a.grounded=false;if(p.y<bounds.min.y-3){p.copy(spot(0,0));a.velocity=0;}a.speed=THREE.MathUtils.damp(a.speed,magnitude>.05&&moved?1:0,10,dt);return moved;
}
function animate(a,state,dt){let name=animationFor(state,a.speed>.16,!a.grounded);if(name==='rocket'&&state.effectTime<4.5)name='jet';a.anim.play(name,{loop:!['hammer','stunned','airStunned','busted','rocket'].includes(name)});a.anim.update(dt);a.group.userData.animation=name;gameFX.run(a,dt);if(a.hammerImpact>0){a.hammerImpact-=dt;if(a.hammerImpact<=0)gameFX.hammer(a.group.position);}}
function updateGame(dt){
 stepRound(round,dt);const chaser=round.actors.find(a=>a.role==='chaser'),cop=avatars[chaser.id],wishes=[];
 for(const state of round.actors){
  const a=avatars[state.id];state.interacting=false;
  if(state.caught){a.vx=a.vz=0;cancelInteraction(round,state.id);a.mark=null;for(const h of hazards)if(h.type==='marker'&&h.owner===state.id)h.time=0;move(a,0,0,dt,0);animate(a,state,dt);continue;}
  let dx=0,dz=0,wants=false;
  if(state.id===0){const sx=input.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),sz=-input.z-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+(keys.has('KeyS')||keys.has('ArrowDown')?1:0);const direction=screenToWorld(sx,sz);dx=direction.x;dz=direction.z;wants=interactHeld;}
  else if(state.role==='chaser'){
   const targets=round.actors.filter(r=>r.role==='runner'&&!r.caught&&withinSight(a.group.position,avatars[r.id].group.position)).sort((x,y)=>a.group.position.distanceToSquared(avatars[x.id].group.position)-a.group.position.distanceToSquared(avatars[y.id].group.position));
   const target=targets[0]?avatars[targets[0].id].group.position:new THREE.Vector3(...round.caches[Math.floor(performance.now()/5000)%round.caches.length].position);const d=steerBot(a,target,dt);dx=d.x;dz=d.z;if(targets[0]&&a.group.position.distanceTo(target)<1.8)useTool(0,state.id);
  }else{
   const p=a.group.position,danger=p.distanceTo(cop.group.position);let target;
   const friends=round.actors.filter(t=>t.caught&&t.releaseCooldown<=0).sort((x,y)=>p.distanceToSquared(avatars[x.id].group.position)-p.distanceToSquared(avatars[y.id].group.position));
   if(danger<3.5&&withinSight(p,cop.group.position)){const choices=round.caches.filter(c=>c.remaining>0).sort((a,b)=>new THREE.Vector3(...b.position).distanceToSquared(cop.group.position)-new THREE.Vector3(...a.position).distanceToSquared(cop.group.position));target=new THREE.Vector3(...(choices[0]||round.caches[0]).position);if(danger<2){dx=p.x-cop.group.position.x;dz=p.z-cop.group.position.z;}if(state.toolCooldowns[0]<=0)useTool(0,state.id);else if(state.toolCooldowns[1]<=0)useTool(1,state.id);}
   else if(friends[0]){target=avatars[friends[0].id].group.position;wants=true;}
   else {const choices=round.caches.filter(c=>c.remaining>0).sort((a,b)=>{const score=c=>p.distanceToSquared(new THREE.Vector3(...c.position))+(avatars.some(o=>o.id!==state.id&&o.goalCache===c.id)?50:0);return score(a)-score(b);});if(choices[0]){a.goalCache=choices[0].id;target=new THREE.Vector3(...choices[0].position);wants=true;}}
   if(target&&dx===0&&dz===0){if(Math.hypot(p.x-target.x,p.z-target.z)>1.5){const d=steerBot(a,target,dt);dx=d.x;dz=d.z;}}
  }
  if(state.effect==='banana'&&state.effectTime>0){state.spinTurn-=dt;if(state.spinTurn<=0){state.spinDirection=rollSpinDirection();state.spinTurn=.35;}dx=state.spinDirection.x;dz=state.spinDirection.z;wants=false;}
  const locked=state.captureRemaining>0||state.effectTime>0&&!['rocket','banana'].includes(state.effect);if(locked){dx=dz=0;a.vx=a.vz=0;}
  if(state.effect==='rocket'&&state.effectTime>0&&Math.hypot(dx,dz)<.1){dx=Math.sin(a.group.rotation.y);dz=Math.cos(a.group.rotation.y);}
  const moved=move(a,dx,dz,dt,(state.role==='chaser'?3.65:3.4)*(state.id===0?1.08:1)*(state.effect==='rocket'&&state.effectTime>0?1.8:1));if(!moved&&state.effect==='banana'&&state.effectTime>0)state.spinDirection=rollSpinDirection();if(!moved&&state.id!==0&&!locked&&Math.hypot(dx,dz)>.1){a.routeTime=0;}animate(a,state,dt);wishes.push({id:state.id,wants:wants&&!locked});
 }
 for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];h.time-=dt;if(h.type==='capture'){h.mesh.rotation.x+=dt*h.spin.x;h.mesh.rotation.y+=dt*h.spin.y;h.mesh.rotation.z+=dt*h.spin.z;h.mesh.scale.setScalar(Math.min(1,h.time*4));}else if(h.type==='smoke')h.mesh.rotation.y+=dt*.2;if(h.type==='banana'&&h.time>0)for(const state of round.actors){if(state.caught||state.role===h.ownerRole||state.effectTime>0)continue;if(avatars[state.id].group.position.distanceTo(h.mesh.position)<.8){setEffect(state,'banana',2);h.time=0;break;}}if(h.time<=0){disposeHazard(h);hazards.splice(i,1);}}
 if(round.remaining<298.5&&chaser.effectTime<=0)for(const r of round.actors.filter(a=>a.role==='runner'&&!a.caught)){const p=cop.group.position,q=avatars[r.id].group.position,d=p.distanceTo(q);if(d<.9&&Math.abs(p.y-q.y)<.8&&withinSight(p,q)&&beginCapture(round,chaser.id,r.id,d)){const cloud=createToonSmoke(.7,16);cloud.position.copy(q).addScaledVector(up,.8);scene.add(cloud);cloud.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);hazards.push({mesh:cloud,type:'capture',owner:r.id,time:1,spin:new THREE.Vector3(12+Math.random()*16,14+Math.random()*18,10+Math.random()*16)});cancelInteraction(round,r.id);if(r.id===0)stopInteract();say(r.id===0?'CAPTURED!':'CATCHING THIEF!',1);}}
 for(const c of round.caches)c.harvester=null;
 for(const wish of wishes){const target=wish.wants?interactionTarget(wish.id):null,key=target?target.type+':'+target.target.id:null,actor=avatars[wish.id];if(actor.interactionKey!==key||!target)cancelInteraction(round,wish.id);actor.interactionKey=key;if(target)performInteraction(wish.id,target,dt);}
 if(round.phase==='finished'&&!round.endStarted)beginStageVerdict();
}
function clearStageVerdict(){document.body.classList.remove('round-ending');$('#stage-verdict').hidden=true;$('#stage-verdict').classList.remove('is-lose');$('#round-fade').style.opacity='0';}
function beginStageVerdict(){
 round.endStarted=true;round.endElapsed=0;paused=false;clearInput();document.body.classList.add('round-ending');const won=round.winner===round.playerRole;
 $('#stage-verdict').classList.toggle('is-lose',!won);$('#stage-verdict-title').textContent=won?'VICTORY!':'DEFEAT';$('#stage-verdict-reason').textContent=round.reason==='timeout'?'TIME UP':round.reason==='money'?'ALL MONEY STOLEN':'ALL THIEVES CAUGHT';$('#stage-verdict').hidden=false;
 uiEffects.sounds.play(won?'victory_fanfare':'defeat_jingle');$('#toast').textContent='';
 for(const a of avatars)a.anim.play(round.actors[a.id].role===round.winner?'dance':'idle');
}
function tickStageVerdict(elapsed){
 if(!round?.endStarted||round.resultsShown||document.hidden)return;round.endElapsed+=Math.min(elapsed,1);const view=stageEndState(round.endElapsed);$('#round-fade').style.opacity=String(view.fade);for(const a of avatars)a.anim.update(Math.min(elapsed,.1));gameFX.update(Math.min(elapsed,.1));
 if(view.ready){round.resultsShown=true;clearStageVerdict();showFinalResults();}
}
function showFinalResults(){
 const won=round.winner===round.playerRole;if(!round.profileRecorded){profile=recordMatch(readProfile(localStorage),{id:round.profileId,won});saveProfile(localStorage,profile);round.profileRecorded=true;labels();}
  show('results');renderResults(ui.results,{round,won,profile,costume,players:room?.players||[],map:mapData?.id||'mall',sounds:uiEffects.sounds,onAgain:start,onMenu:menu,reduced,playOutcome:false});try{resultPortrait=createResultPortrait(ui.results.querySelector('.result-character-host'),templates[costume],clips,won);}catch(error){console.warn('Character portrait could not be rendered',error);}
}

function updateHud(){
 const seconds=Math.ceil(round.remaining);$('#timer').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;$('#money-status').textContent='$'+Math.floor(round.collected).toLocaleString()+' / $'+round.totalMoney.toLocaleString();
 const crew=$('#crew-status'),crewSignature=round.actors.map(a=>[a.caught,a.captureRemaining>0,Math.ceil(a.releaseCooldown)].join(':')).join('|');if(crew.dataset.signature!==crewSignature){crew.dataset.signature=crewSignature;crew.replaceChildren(...round.actors.filter(a=>a.role==='runner').map(a=>{const chip=document.createElement('span');chip.className=`crew-chip${a.caught?' caught':''}`;chip.textContent=`${a.id===0?'YOU':'THIEF '+a.id} · ${a.captureRemaining>0?'CAPTURING':a.caught?(a.releaseCooldown>0?'LOCKED '+Math.ceil(a.releaseCooldown)+'s':'RESCUE READY'):'FREE'}`;return chip;}));}
 const state=round.actors[0],actor=avatars[0];state.toolCooldowns.forEach((cd,slot)=>{const tool=TOOLS.find(t=>t.id===loadout[slot]);$('#tool-action'+(slot+1)).classList.toggle('cooling-down',cd>0);$('#tool-status'+(slot+1)).textContent=cd>0?Math.ceil(cd)+'s':slot===0?'E':'R';$('#tool-action'+(slot+1)).disabled=cd>0||state.caught||state.captureRemaining>0;$('#tool-action-label'+(slot+1)).textContent=tool.id==='rewind'&&actor.mark?'RETURN':tool.key;});
 const target=interactionTarget(0);$('#interact').disabled=state.caught||state.effectTime>0||state.role==='chaser'||state.captureRemaining>0;const hint=$('#interaction-hint');hint.textContent=state.captureRemaining>0?'CAPTURING…':state.caught?(state.releaseCooldown>0?'RELEASE UNLOCKS IN '+Math.ceil(state.releaseCooldown)+'s':'WAIT FOR A TEAMMATE TO RELEASE YOU'):state.role==='chaser'?'CATCH ALL THIEVES · PROTECT THE CACHES':target?.type==='rescue'?(target.target.releaseCooldown>0?'TEAMMATE LOCKED '+Math.ceil(target.target.releaseCooldown)+'s':'HOLD INTERACT · RELEASE TEAMMATE'):target?.type==='money'?(state.interacting?'STEALING · YOU $'+Math.floor(state.money).toLocaleString():interactHeld&&target.target.harvester!==null?'A TEAMMATE IS USING THIS CACHE':'HOLD INTERACT · STEAL MONEY'):'FIND A MONEY CACHE';
}

function positionMatchCamera(){const view=matchView(menuCamera.aspect);matchCamera.position.copy(cameraTarget).add(new THREE.Vector3(...view.offset));matchCamera.lookAt(cameraTarget);}

async function boot(){beginLoading('GETTING READY');try{let done=0;const names=['thief','police','mall-slice'];const items=await Promise.all(names.map(async name=>{const value=await getGLB(name,`assets/psx/${name}.glb`);progress(++done/4*70,`Loading ${name==='mall-slice'?'Mall promenade':name}…`);return value;}));templates={thief:items[0],police:items[1]};const response=await fetch('assets/psx/animations/clips.json?v=idle-b1');if(!response.ok)throw new Error('Animation download failed');const data=await response.json();clips=Object.fromEntries(Object.entries(data.clips).map(([name,clip])=>[name,THREE.AnimationClip.parse(clip)]));progress(75,'Preparing the walkable arena…');const arena=items[2].scene;menuArena=arena;arena.updateMatrixWorld(true);const initial=new THREE.Box3().setFromObject(arena),center=initial.getCenter(new THREE.Vector3());arena.position.add(new THREE.Vector3(-center.x,-initial.min.y,-center.z));scene.add(arena);arena.updateMatrixWorld(true);arena.traverse(o=>{if(o.isMesh){if(solidForGameplay(o))ground.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.roughness=Math.max(.7,m.roughness||0);if(m.map)m.map.anisotropy=2;}}});bounds=new THREE.Box3().setFromObject(arena);buildGround();menuNavigation={ground,bounds,grid};await ensureCostume();progress(90,'Warming up characters and fonts…');previewModel();await document.fonts.ready;await renderer.compileAsync(scene,menuCamera);progress(100,'All set. Let’s play.');ready=true;document.body.dataset.assets='ready';show('menu');endLoading();openPage('home');}catch(e){document.body.dataset.assets='error';loadError(e,()=>location.reload());}}
function frame(now=performance.now()){requestAnimationFrame(frame);const elapsed=Math.max(0,(now-lastFrame)/1000),dt=Math.min(elapsed,.05);lastFrame=now;uiEffects.tick(dt);tickStageVerdict(elapsed);if(resultPortrait&&!ui.results.hidden)resultPortrait.update(dt);
 if(ready){if(room&&!ui.lobby.hidden&&!busy&&!document.hidden){if(stepLobby(room,elapsed))start();else if(room.phase==='countdown'){$('#lobby-counter').textContent=Math.ceil(room.countdown);}}if(round){if(round.phase==='playing'&&!paused&&!busy){const steps=simulationSteps(elapsed);for(let i=0;i<steps.count&&round.phase==='playing';i++){updateGame(steps.dt);gameFX.update(steps.dt);}updateHud();}const target=avatars[0]?.group.position;if(target){const groundY=heightAt(target.x,target.z);const desired=new THREE.Vector3(target.x,Number.isFinite(groundY)?groundY:0,target.z);cameraTarget.lerp(desired,1-Math.exp(-Math.min(elapsed,.15)*8));positionMatchCamera();}}
 else if(preview){preview.anim.update(dt);if(previewTime>0){previewTime-=dt;if(previewTime<=0)preview.anim.play('idle');}const p=preview.group.position,narrow=innerWidth<760,pagePreview=narrow&&activePage!=='home';const distance=pagePreview?9:4.6,offset=distance*Math.tan(THREE.MathUtils.degToRad(menuCamera.fov/2))*menuCamera.aspect*(activePage==='home'?(narrow?.28:.16):.43);menuCamera.position.set(p.x,p.y+1.45,p.z+distance);menuCamera.lookAt(p.x-offset,p.y+(pagePreview?3:.8),p.z);}}
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').textContent='';}updateMarkers();if(!ui.lobby.hidden&&!busy)renderLobbyCharacters(dt);else renderer.render(scene,round?matchCamera:menuCamera);
}
frame();boot();
