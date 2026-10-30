import {menuPreviewFrame} from './viewport.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createRound,stepRound,detectThiefAt,activateTool,canAct as canActRule,harvest,rescue,cancelInteraction,INTERACT_RADIUS,RESCUE_SECONDS,updateSmokeCoverage,startCountdown} from './rules.js';
import {applyOyenAppearance,loadOyenAppearance,saveOyenAppearance,OYEN_COATS,OYEN_SKINS} from './oyen-appearance.js';
import {normalizeLoadout,equipTool,normalizeCostume} from './loadout.js';
import {makeAnimator,animationFor,ANIMATION_PLAY_RATE} from './animation.js';
import {COSTUMES,TOOLS} from './catalog.js';
import {createLobby,addBot,removeBot,beginCountdown,cancelCountdown,stepLobby,cycleMap,resolveRole,validateRoomCode,PREFERENCES,BOTS} from './lobby-state.js';
import {renderLobby} from './lobby-ui.js';
import {createCouchLobby,joinCouch,syncCouchConnections,canStartCouch,prepareCouchMatch,couchCommand,couchHuman,couchInputFor} from './couch-state.js';
import {renderCouchLobby,updateCouchHud} from './couch-ui.js';
import {createWonderUI} from './menu-effects.js';
import {createGameplayAudio} from './game-audio.js';
import {createRoundStart} from './round-start.js';
import {attachHeldHammer,attachHeldJetpack,prepareJetpackMount} from './held-tools.js';
import {createPlayerMirage,animatePlayerMirage,disposePlayerMirage} from './player-mirage.js';
import {updateMoneyBar,cacheCenters} from './money-ui.js';
import {bindingMarkup} from './binding-icons.js';
import {updateCaptureGauge,createCaptureTint} from './capture-ui.js';
import {createMoneyTrail} from './money-trail.js';
import {PROFILE_KEY,readProfile,saveProfile,profileName,recordMatch} from './profile.js';
import {renderHomeWidgets} from './home-widgets.js';
import {loadSettings,saveSettings,DEFAULT_SETTINGS,createRenderGate} from './settings.js';
import {mountSettings} from './settings-ui.js';
import {createController,createControllerPool,controllerMenu} from './controller.js';
import {bindGameControls} from './touch-controls.js';
import {configureFullscreen} from './fullscreen.js';
import {configureLandscape} from './landscape.js';
import {sampleGround,simulationSteps} from './motion.js';
import {landingMask} from './landing.js';
import {createSunkenLook} from './sunken-look.js';
import {matteMall,bakedArena} from './arena-appearance.js';
import {matchView,fixedStageCenter,stageFraming,shakeOffset} from './camera-rig.js';
import {DEFAULT_BINDINGS,BINDING_LABELS,keyLabel,rebind,loadBindings,saveBindings,movementInput,mouseCode} from './keybindings.js';
import {createHaptics} from './haptics.js';
import {creditsMarkup} from './credits-ui.js';
import {hasSight} from './sight.js';
import {createResultPortrait} from './result-portrait.js';
import {createGameFX,smokeBombCloud,animateSmokeBomb,attachHazardTelegraph,animateHazardTelegraph,animateBananaHazard} from './game-fx.js';
import {stageEndState,rollSpinDirection} from './action-state.js';
import {renderResults} from './results-ui.js';
import {createDetectionZone,hasDetectedThief} from './detection-zone.js';
import {policeBadgeMarkup,updatePoliceBadge} from './police-badge.js';
import {shipTilt} from './environment.js';
import {createMallPhysics} from './mall-physics.js';
import {MultiplayerConnection,multiplayerEndpoint} from './multiplayer.js';
import {advanceActor,movementSpeed} from './player-motion.js';
import {prepareSunkenWater} from './water-animation.js';
import {presentOnlineEvent,syncOnlineHazards} from './online-presentation.js';
import {LocalPrediction,SnapshotBuffer,interpolatePose,applyPose} from './netcode.js';
let onlineFrames=new SnapshotBuffer();
let online=null,onlineLoading=false,onlineRoster='',onlineEventId=0,onlineSnapshot=null,onlineRevision=0,remoteFurniture=[];
import {findPath,screenToWorld} from './navigation.js';
import {buildWalkGrid,arenaBounds,solidForGameplay} from './world-navigation.js';
let resultPortrait=null,bindings=loadBindings(localStorage),bindingCapture=null,cameraShake=0,shakeTime=0,stageFrame=null;
let settings=loadSettings(localStorage,matchMedia('(prefers-reduced-motion: reduce)').matches),settingsPage=null;
const renderGate=createRenderGate();let fpsSince=performance.now(),fpsFrames=0,renderElapsed=0;
const fpsCounter=document.createElement('div');fpsCounter.id='fps-counter';fpsCounter.hidden=true;document.body.append(fpsCounter);
const couchControllers=createControllerPool(navigator),couchInputs=new Map();let couchRosterSignature='';
const controller=createController(navigator),interactionSources=new Set();let padMovement={x:0,z:0},controllerActive=false;
const haptics=createHaptics(navigator,{enabled:localStorage.getItem('pnt-haptics')!=='off'});
let touchControls,interactHeld=false,menuArena=null,gameArena=null,mapData=null,menuNavigation=null;
let profile=readProfile(localStorage);
const $=s=>document.querySelector(s),canvas=$('#world');
const ui={menu:$('#menu'),hud:$('#hud'),pause:$('#pause'),results:$('#results'),lobby:$('#lobby')};
const scene=new THREE.Scene();scene.background=new THREE.Color('#70688f');scene.fog=new THREE.Fog('#70688f',38,85);
const matchRoot=new THREE.Group(),shipPivot=new THREE.Vector3();scene.add(matchRoot);let furniturePhysics=null,shipAngle=0;
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const menuCamera=new THREE.PerspectiveCamera(40,1,.05,120),matchCamera=new THREE.PerspectiveCamera(30,1,.1,180);
matchCamera.zoom=1.1;matchCamera.updateProjectionMatrix();
const hemisphere=new THREE.HemisphereLight(0xeaf4ff,0x6c728e,2.4);scene.add(hemisphere);
const sunlight=new THREE.DirectionalLight(0xfff1df,3);sunlight.position.set(8,16,7);scene.add(sunlight);
const fill=new THREE.DirectionalLight(0xb6d8ff,1.2);fill.position.set(-8,7,-4);scene.add(fill);
const mallFill=new THREE.DirectionalLight(0xfff6e8,1.2);mallFill.position.set(-12,14,-18);mallFill.visible=false;scene.add(mallFill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x77768c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.3;scene.add(floor);
const up=new THREE.Vector3(0,1,0),down=new THREE.Vector3(0,-1,0);
const loader=new GLTFLoader(),cache=new Map();
const gameFX=createGameFX(matchRoot);

let ready=false,role='runner',quality=settings.quality;
let oyenAppearance=loadOyenAppearance(localStorage);
let costume=normalizeCostume(localStorage.getItem('pnt-costume'));
let loadout=normalizeLoadout(localStorage.getItem('pnt-loadout'),localStorage.getItem('pnt-tool')),selectedTool=loadout[0];
let round=null,avatars=[],preview=null,previewClip='idle',previewTime=0,templates={},clips={},ground=[],bounds=null,grid=null;
let paused=false,activePage='home',toastTime=0,lastFrame=performance.now(),busy=false,waterAnimation=null,sunkenLook=null;
let sunkenStylized=localStorage.getItem('pnt-sunken-look')!=='original';
const keys=new Set(),input={x:0,z:0},cameraTarget=new THREE.Vector3(),hazards=[];
let room=null,returnToLobby=false,lobbyDisplays=[],cacheAnchors=new Map();
const lobbyCamera=new THREE.PerspectiveCamera(34,1,.05,30);lobbyCamera.position.set(0,1.3,3.2);lobbyCamera.lookAt(0,.8,0);
let reduced=settings.reducedMotion;
const uiEffects=createWonderUI({blocked:()=>busy||!$('#loading').hidden||!ui.hud.hidden,reduced:()=>reduced});
const gameAudio=createGameplayAudio(()=>uiEffects.sounds.engine);
void gameAudio.preload();
const roundStart=createRoundStart(ui.hud,beat=>gameAudio.narrateBeat(beat));
const moneyTrail=createMoneyTrail(ui.hud,$('#money-status'),{reduced:()=>reduced});
document.addEventListener('pointerdown',()=>void gameAudio.prepare(),{capture:true});
document.addEventListener('keydown',()=>void gameAudio.prepare(),{capture:true,once:true});
document.body.classList.toggle('reduced-motion',reduced);
function resize(){const aspect=innerWidth/innerHeight;menuCamera.aspect=aspect;menuCamera.updateProjectionMatrix();matchCamera.aspect=aspect;matchCamera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='battery'?1:1.5));renderer.setSize(innerWidth,innerHeight,false);}
function applySettings(initial=false){
 const qualityChanged=quality!==settings.quality;quality=settings.quality;reduced=settings.reducedMotion;document.body.classList.toggle('reduced-motion',reduced);
 document.documentElement.style.setProperty('--joystick-size',settings.joystickSize);document.documentElement.style.setProperty('--hud-scale',settings.hudScale);
 haptics.setEnabled(settings.haptics);if(!settings.haptics)haptics.stop();
 uiEffects.sounds.engine.setVolumes({master:.8*settings.master});uiEffects.sounds.setEnabled(settings.uiSounds);
 gameAudio.setLevels({sfx:settings.sfx,music:settings.music});gameAudio.setEnabled(settings.sfx>0);gameAudio.setMusic(settings.music>0);
 if(initial||qualityChanged){resize();sunkenLook?.setQuality(quality);}
}
function changeSetting(key,value){settings={...settings,[key]:value};const saved=saveSettings(localStorage,settings);applySettings();return saved;}
addEventListener('resize',resize);applySettings(true);
function show(name){document.body.classList.toggle('couch-mode',room?.mode==='couch');$('#couch-hud').hidden=room?.mode!=='couch';ui.lobby.classList.toggle('couch-lobby',room?.mode==='couch');if(name==='menu'){scene.fog.near=38;scene.fog.far=85;}for(const [key,node]of Object.entries(ui))node.hidden=key!==name;document.body.classList.toggle('playing',name==='hud'||name==='pause'||name==='results');document.body.classList.toggle('lobby-view',name==='lobby');document.body.classList.toggle('menu-view',name==='menu');$('#lobby-backdrop').hidden=!['menu','lobby'].includes(name);scene.background=name==='menu'?null:new THREE.Color('#70688f');floor.visible=name!=='menu';if(menuArena)menuArena.visible=false;}
function say(text,seconds=2){$('#toast').textContent=text;toastTime=seconds;}
function clearInput(){couchControllers.reset();couchInputs.clear();online?.input(0,0,false,performance.now(),true);haptics.stop();controller.reset();padMovement={x:0,z:0};interactionSources.clear();interactHeld=false;keys.clear();input.x=input.z=0;touchControls?.reset();}
function pauseGame(){if(!round||round.phase!=='playing'||paused||busy)return;paused=true;clearInput();show('pause');$('#sunken-look').hidden=!sunkenLook;$('#sunken-look').textContent='SUNKEN LOOK · '+(sunkenStylized?'STYLIZED':'ORIGINAL');$('#pause p').textContent=online?'The online match continues while this menu is open.':'The clock is paused.';}
function resume(){if(room?.mode==='couch'&&room.players.some(p=>p&&!p.bot&&!p.connected)){$('#pause p').textContent='Reconnect the missing controller before resuming.';return;}clearInput();paused=false;show('hud');lastFrame=performance.now();}
function progress(value,text){$('#load-progress').style.width=`${Math.round(value)}%`;$('#load-percent').textContent=`${Math.round(value)}%`;$('#load-status').textContent=text;}
function beginLoading(title){busy=true;clearInput();$('#loading').hidden=false;$('#loading').setAttribute('aria-busy','true');$('#loading-title').textContent=title;$('#retry').hidden=true;$('#error').hidden=true;progress(0,'Preparing assets…');}
function endLoading(){busy=false;$('#loading').hidden=true;$('#loading').setAttribute('aria-busy','false');lastFrame=performance.now();}
function loadError(error,retry){console.error(error);$('#loading-title').textContent='LET’S TRY THAT AGAIN';$('#load-status').textContent=error.message;$('#retry').hidden=false;$('#retry').onclick=retry;busy=false;}
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
async function getGLB(key,url,onProgress){if(cache.has(key))return cache.get(key);const pending=loader.loadAsync(url,onProgress);cache.set(key,pending);try{return await pending;}catch(e){cache.delete(key);throw e;}}
async function ensureCostume(){const c=COSTUMES.find(c=>c.id===costume);if(templates[c.id]||!c.file)return;templates[c.id]=await getGLB(c.id,`assets/pnt/costumes/${c.file}.glb`,e=>progress(e.total?Math.min(85,e.loaded/e.total*85):30,`Loading ${c.name}…`));}
function destroy(a){if(!a)return;a.detectionZone?.dispose();a.group.removeFromParent();a.anim.dispose();sunkenLook?.unregister(a.model);a.captureTint?.dispose();a.appearance?.dispose();const skeletons=new Set();a.model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const skeleton of skeletons)skeleton.dispose();for(const mesh of [a.ring,a.shadow]){mesh.geometry.dispose();mesh.material.dispose();}}
function clearHazards(){gameFX.clear();for(const h of hazards)disposeHazard(h);hazards.length=0;}
function menu(){online?.leave();online=null;onlineLoading=false;onlineRevision++;onlineRoster='';onlineSnapshot=null;clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;restoreMenuArena();room=null;returnToLobby=false;clearLobbyDisplays();round=null;paused=false;clearInput();clearHazards();for(const a of avatars)destroy(a);avatars=[];previewModel();show('menu');openPage('home');}
function previewModel(){destroy(preview);preview=avatar(templates[costume],0,role);preview.group.position.copy(spot(0,0));preview.group.rotation.y=0;previewClip='idle';previewTime=0;preview.anim.play('idle');labels();}
function labels(){refreshControlHints();
 renderHomeWidgets(profile,loadout,costume);
 $('#costume-label').textContent=COSTUMES.find(c=>c.id===costume).name.toUpperCase();$('#equipped-label').textContent=loadout.map(id=>TOOLS.find(t=>t.id===id).name.toUpperCase()).join(' / ');
 loadout.forEach((id,slot)=>{const tool=TOOLS.find(t=>t.id===id);$('#tool-action-label'+(slot+1)).textContent=tool.key;$('#tool-action-icon'+(slot+1)).src='assets/pnt/'+tool.icon+'.png';$('#tool-action'+(slot+1)).setAttribute('aria-label','Use slot '+(slot+1)+': '+tool.name);});
}
function demo(name){const loop=['idle','thiefRun','policeRun','jet','bustedIdle','dance'].includes(name);previewClip=name;previewTime=loop?0:(clips[name]?.duration||1)/ANIMATION_PLAY_RATE;preview?.anim.play(name,{loop,restart:true});}
function goBack(){
 if(room?.mode==='couch'&&!ui.lobby.hidden){if(room.phase==='countdown'){cancelCountdown(room);refreshLobby();}else quitLobby();return;}
 if(busy)return;uiEffects.sounds.play('ui_back');
 if(room&&!ui.lobby.hidden){const help=$('#room-help');if(help&&!help.hidden){help.hidden=true;return;}if(online&&room.phase==='countdown'){online.control('cancel');return;}if(!online&&cancelCountdown(room)){refreshLobby();return;}quitLobby();return;}
 if(returnToLobby&&room){returnToLobby=false;room.players[0].costume=costume;if(online)online.send('profile',{name:profile.name,costume,loadout,preference:room.preference});buildLobbyDisplays();show('lobby');refreshLobby();return;}
 openPage(activePage==='join'?'online':activePage==='online'?'play':'home');
}
function clearLobbyDisplays(){for(const display of lobbyDisplays){destroy(display.actor);display.base.geometry.dispose();display.base.material.dispose();}lobbyDisplays=[];}
function buildLobbyDisplays(){
 clearLobbyDisplays();const colors=[0x005bff,0xff9a00,0x00c54b,0xff36a9];
 for(let i=0;i<4;i++){
  const stage=new THREE.Scene();stage.add(new THREE.HemisphereLight(0xf4f8ff,0x7280a0,2.8));const light=new THREE.DirectionalLight(0xffffff,3.2);light.position.set(-2,4,4);stage.add(light);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.82,.85,.14,40),new THREE.MeshStandardMaterial({color:room.players[i]?colors[i]:0xadb8ca,roughness:.5}));stage.add(base);
  const player=room.players[i];let actor=null;
  if(player&&templates[player.costume]){actor=avatar(templates[player.costume],i,'runner');actor.group.position.set(0,.08,0);actor.group.rotation.y=0;actor.ring.visible=false;actor.anim.update(i*.6);stage.add(actor.group);}
  lobbyDisplays.push({scene:stage,base,actor});
 }
}
function refreshLobby(){if(room?.mode==='couch'){refreshCouchLobby();return;}if(online){refreshOnlineLobby();return;}
 if(!room)return;
 renderLobby(ui.lobby,room,loadout,costume,{
  quit:quitLobby,addBot:()=>{if(addBot(room)){buildLobbyDisplays();refreshLobby();}},removeBot:()=>{if(removeBot(room)){buildLobbyDisplays();refreshLobby();}},
  map:direction=>{if(cycleMap(room,direction))refreshLobby();},preference:()=>{room.preference=PREFERENCES[(PREFERENCES.indexOf(room.preference)+1)%PREFERENCES.length];refreshLobby();},
  start:()=>{if(beginCountdown(room)){lastFrame=performance.now();refreshLobby();}},cancel:()=>{cancelCountdown(room);refreshLobby();},
  edit:page=>{cancelCountdown(room);returnToLobby=true;previewModel();show('menu');openPage(page);},
 });
}
async function hostCouchLobby(){
 if(!ready||busy)return;beginLoading('GATHERING THE COUCH CREW');await nextFrame();
 try{let loaded=0;await Promise.all(COSTUMES.map(async c=>{if(!templates[c.id]&&c.file)templates[c.id]=await getGLB(c.id,`assets/pnt/costumes/${c.file}.glb`);progress(++loaded/COSTUMES.length*85,'Preparing costumes for the crew…');}));room=createCouchLobby(costume,loadout,profile.name);couchRosterSignature='';returnToLobby=false;show('lobby');refreshLobby();for(const display of lobbyDisplays)await renderer.compileAsync(display.scene,lobbyCamera);endLoading();}catch(error){room=null;loadError(error,hostCouchLobby);}
}
function refreshCouchLobby(){
 const signature=room.players.map(p=>p?`${p.costume}/${p.bot}`:'empty').join('|');if(signature!==couchRosterSignature){couchRosterSignature=signature;buildLobbyDisplays();}
 renderCouchLobby(ui.lobby,room,{keyboard:()=>{room.keyboardHost=!room.keyboardHost;refreshLobby();},quit:quitLobby,map:direction=>{cycleMap(room,direction);refreshLobby();},start:startCouchCountdown,cancel:()=>{cancelCountdown(room);refreshLobby();},command:(id,command)=>{if(couchCommand(room,id,command))refreshLobby();},choose:(id,row)=>{room.players[id].cursor=row;if(couchCommand(room,id,'accept'))refreshLobby();},pick:(id,index)=>{room.players[id].picker.index=index;if(couchCommand(room,id,'accept'))refreshLobby();},leave:id=>{room.players[id]=null;refreshLobby();}});
}
function startCouchCountdown(){if(!prepareCouchMatch(room))return;beginCountdown(room);clearInput();lastFrame=performance.now();refreshLobby();}
function couchLobbyCommand(id,command){const player=room.players[id];if(!player)return;if(command==='back'&&!player.picker){if(room.phase==='countdown'){cancelCountdown(room);refreshLobby();return;}if(id===0){quitLobby();return;}room.players[id]=null;refreshLobby();return;}if(couchCommand(room,id,command))refreshLobby();}
function couchRematch(){clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;restoreMenuArena();round=null;clearInput();clearHazards();for(const a of avatars)destroy(a);avatars=[];room.phase='waiting';room.countdown=0;for(const p of room.players)if(p&&!p.bot){p.ready=false;p.picker=null;}couchRosterSignature='';show('lobby');refreshLobby();}
function updateCouchControllers(now,dt){
 const pads=couchControllers.poll(now),connections=syncCouchConnections(room,pads);if(connections.changed&&!ui.lobby.hidden)refreshLobby();if(connections.lost&&round?.phase==='playing'){pauseGame();$('#pause p').textContent='Controller disconnected. Reconnect it before resuming.';}
 couchInputs.clear();if(document.hidden||busy)return;
 for(const pad of pads){
  if(!pad.connected)continue;let id=room.players.findIndex(p=>p&&!p.bot&&p.controller===pad.index);
  if(id<0){if((!ui.lobby.hidden||paused||!ui.results.hidden)&&pad.pressed.size){id=joinCouch(room,pad.index);if(id>=0){void gameAudio.prepare();if(!ui.lobby.hidden)refreshLobby();}}continue;}
  if(pad.pressed.size)void gameAudio.prepare();
  if(!ui.lobby.hidden){if(pad.direction)couchLobbyCommand(id,pad.direction);if(room?.mode!=='couch')return;if(pad.pressed.has(1)){couchLobbyCommand(id,'back');if(room?.mode!=='couch')return;}if(!room.players[id]||room.players[id].bot)continue;if(pad.pressed.has(0))couchLobbyCommand(id,'accept');if(pad.pressed.has(2))couchLobbyCommand(id,'ready');if(id===0){if(pad.pressed.has(4)||pad.pressed.has(5)){cycleMap(room,pad.pressed.has(5)?1:-1);refreshLobby();}if(pad.pressed.has(9))startCouchCountdown();}continue;}
  if(pad.pressed.has(9)){if(paused)resume();else if(round&&!ui.hud.hidden)pauseGame();return;}
  if(paused||!ui.results.hidden){if(id===0){if(pad.direction)controllerMenu(document,pad.direction);if(pad.pressed.has(0)){controllerMenu(document,'accept');return;}if(pad.pressed.has(1)&&paused){resume();return;}}continue;}
  const active=round?.phase==='playing'&&!(round.startRemaining>0)&&!phoneLandscape.blocked;
  couchControllers.rumble(pad.index,round?.actors[id]?.effect,dt,active&&round.actors[id].effectTime>0,settings.haptics);
  if(!active)continue;couchInputs.set(id,{x:pad.x,z:pad.z,interact:pad.held.has(0)});if(pad.pressed.has(2))useTool(0,id);if(pad.pressed.has(3))useTool(1,id);
 }
}
async function hostLobby(){
 if(!ready||busy)return;beginLoading('GATHERING THE CREW');await nextFrame();
 try{await ensureCostume();let loaded=0;await Promise.all(BOTS.map(async bot=>{if(!templates[bot.costume])templates[bot.costume]=await getGLB(bot.costume,`assets/pnt/costumes/${bot.costume}.glb`);progress(++loaded/BOTS.length*85,'Preparing the lobby characters…');}));
  room=createLobby(costume);room.players[0].name=profile.name;returnToLobby=false;buildLobbyDisplays();refreshLobby();progress(90,'Warming up the lobby…');for(const display of lobbyDisplays)await renderer.compileAsync(display.scene,lobbyCamera);show('lobby');endLoading();
 }catch(error){room=null;loadError(error,hostLobby);}
}
function quitLobby(){const training=room?.mode==='practice';online?.leave();online=null;onlineLoading=false;onlineRevision++;onlineRoster='';onlineSnapshot=null;room=null;returnToLobby=false;clearLobbyDisplays();show('menu');if(!preview)previewModel();openPage(training?'home':'play');}
function renderLobbyCharacters(dt){
 renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.setClearColor(0,0);renderer.clear();
 const windows=ui.lobby.querySelectorAll('.avatar-window');
 for(let wi=0;wi<windows.length;wi++){const i=Number(windows[wi].dataset.avatar);const window=windows[wi];
  const rect=window.getBoundingClientRect(),left=Math.max(0,rect.left),right=Math.min(innerWidth,rect.right),top=Math.max(0,rect.top),bottom=Math.min(innerHeight,rect.bottom);
  if(right<=left||bottom<=top||!lobbyDisplays[i])continue;
  lobbyDisplays[i]?.actor?.anim.update(dt);lobbyCamera.aspect=rect.width/rect.height;lobbyCamera.updateProjectionMatrix();renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(left,innerHeight-bottom,right-left,bottom-top);renderer.setScissorTest(true);renderer.render(lobbyDisplays[i].scene,lobbyCamera);
 }
 renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);
}
function onlineProfile(){return {name:profile.name,costume,loadout,preference:room?.preference||'none'};}
async function ensureRoster(){await Promise.all(room.players.filter(Boolean).map(async p=>{const outfit=COSTUMES.find(c=>c.id===p.costume);if(!templates[p.costume])templates[p.costume]=await getGLB(p.costume,`assets/pnt/costumes/${outfit.file}.glb`);}));}
function onlineNotice(message){const status=$('#join-status')||$('#play-status');if(status)status.textContent=message;if(round)say(message,4);else if(!ui.lobby.hidden){const help=$('#room-help');help.querySelector('h2').textContent='Room update';help.querySelector('p').textContent=message;help.hidden=false;}}
async function connectOnline(mode,code){
 if(!ready||busy)return;if(!multiplayerEndpoint()){onlineNotice('The online server has not been deployed yet. Choose Training from the main menu to play with bots.');return;}
 beginLoading('CONNECTING TO THE CREW');online=new MultiplayerConnection({onLobby:receiveOnlineLobby,onSnapshot:receiveOnlineSnapshot,onNotice:onlineNotice,onProgress:progress,onConnection:status=>{if(status==='reconnecting'){clearInput();if(round)say('RECONNECTING…',4);else{const line=$('#lobby-status-line');if(line)line.textContent='RECONNECTING…';}}else if(status==='connected'){if(avatars[0])avatars[0].prediction=null;onlineFrames=new SnapshotBuffer();const help=$('#room-help');if(help)help.hidden=true;if(round)say('RECONNECTED',1.5);}else{const code=room?.code;endLoading();menu();openPage('join');if(code)$('#join-code').value=code;onlineNotice(status==='expired'?'Your seat expired while the game was away. Join again if the room is still waiting, or host a new lobby.':'The connection ended. Join the room again to continue.');}}});
 try{await online.connect(mode,onlineProfile(),code);}catch(error){online?.leave();online=null;endLoading();onlineNotice(error.message||'Could not connect to the game server.');}
}
function refreshOnlineLobby(){
 if(!room)return;renderLobby(ui.lobby,room,loadout,costume,{quit:quitLobby,addBot:()=>online.control('add-bot'),removeBot:()=>online.control('remove-bot'),map:direction=>online.control('map',direction),preference:()=>online.send('profile',{...onlineProfile(),preference:PREFERENCES[(PREFERENCES.indexOf(room.preference)+1)%PREFERENCES.length]}),start:()=>online.control('start'),cancel:()=>online.control('cancel'),edit:page=>{if(room.phase!=='waiting')return;returnToLobby=true;previewModel();show('menu');openPage(page);}});
}
async function receiveOnlineLobby(data){
 if(!online)return;room=data;
 if(data.phase==='loading'){if(data.match&&!onlineLoading&&!round)void beginOnlineMatch(data.match);else if(!busy&&!round)beginLoading('PREPARING THE ONLINE MATCH');return;}
 if(['playing','finished'].includes(data.phase)){if(round&&!onlineLoading&&busy){endLoading();show('hud');}if(data.phase==='finished')refreshOnlineRematch();return;}
 if(data.phase==='waiting'&&(round||onlineLoading)){onlineRevision++;onlineLoading=false;clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;clearHazards();for(const a of avatars)destroy(a);avatars=[];round=null;restoreMenuArena();}
 const revision=onlineRevision,signature=data.players.map(p=>[p.sessionId,p.costume,p.bot].join(':')).join('|');
 try{await ensureRoster();if(!online||room!==data||revision!==onlineRevision||!['waiting','countdown'].includes(room.phase))return;if(signature!==onlineRoster){buildLobbyDisplays();onlineRoster=signature;}refreshOnlineLobby();if(!returnToLobby){show('lobby');endLoading();}}
 catch(error){onlineNotice(error.message);endLoading();}
}
async function beginOnlineMatch(snapshot){
 if(onlineLoading||!online)return;const revision=++onlineRevision;onlineLoading=true;beginLoading('LOADING THE SHARED MATCH');returnToLobby=false;clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;clearLobbyDisplays();
 try{await ensureRoster();if(!online||revision!==onlineRevision)return;await loadArena(snapshot.map);if(!online||revision!==onlineRevision){restoreMenuArena();return;}destroy(preview);preview=null;round={...snapshot.round};role=round.playerRole;paused=false;clearInput();clearHazards();onlineEventId=0;onlineRoster='';populate();for(let i=0;i<avatars.length;i++)avatars[i].tools=room.players[i].loadout;buildMarkers();stageFrame=stageFraming(mapData.spawns,mapData.caches);const center=fixedStageCenter(mapData.spawns,mapData.caches),anchor=spot(center.x,center.z);cameraTarget.set(center.x,anchor.y,center.z);cameraShake=0;positionMatchCamera();
  onlineFrames=new SnapshotBuffer();receiveOnlineSnapshot(snapshot,true);await renderer.compileAsync(scene,matchCamera);if(!online||revision!==onlineRevision)return;$('#role-label').textContent=room?.mode==='couch'?'COUCH PLAY':role==='runner'?'THIEF':'POLICE';$('#role-label').classList.toggle('chaser',role==='chaser');labels();onlineLoading=false;online.send('ready');if(['playing','finished'].includes(room.phase)){endLoading();show('hud');}else progress(100,'Waiting for everyone to finish loading…');if(onlineSnapshot?.tick>snapshot.tick)receiveOnlineSnapshot(onlineSnapshot,true);
 }catch(error){onlineLoading=false;online?.send('load-error');loadError(error,()=>beginOnlineMatch(snapshot));}
}
function receiveOnlineSnapshot(snapshot,initial=false){
 onlineSnapshot=snapshot;if(!online)return;if(!round){if(!onlineLoading)void beginOnlineMatch(snapshot);return;}if(round.profileId!==snapshot.round.profileId)return;
 const wasCaught=round.actors.map(actor=>actor.caught),presentation={endStarted:round.endStarted,endElapsed:round.endElapsed,resultsShown:round.resultsShown,profileRecorded:round.profileRecorded};round={...snapshot.round,...presentation};role=round.playerRole;
 if(!initial)syncCacheCelebrations();
 if(!initial)for(let i=0;i<round.actors.length;i++)if(wasCaught[i]&&!round.actors[i].caught&&avatars[i])gameFX.rescue(avatars[i].group.position);
 onlineFrames.push(snapshot);
 for(const pose of snapshot.poses){const actor=avatars[pose.id];if(!actor)continue;
  if(pose.id===0&&snapshot.inputFrames){if(initial||!actor.prediction)actor.prediction=new LocalPrediction(actor,pose,round.actors[0],(snapshot.worldTime??snapshot.time),{grid,map:mapData.id});else actor.prediction.reconcile(pose,round.actors[0],(snapshot.worldTime??snapshot.time));}
  else if(initial)applyPose(actor,pose);
  // Compatibility with a server that has not yet received the input-frame update.
  if(pose.id===0&&!snapshot.inputFrames){actor.netTarget=new THREE.Vector3(...pose.position);if(!initial)actor.group.position.lerp(actor.netTarget,.65);actor.vx=pose.vx;actor.vz=pose.vz;actor.slideX=pose.slideX;actor.velocity=pose.velocity;actor.grounded=pose.grounded;actor.speed=pose.speed;}
 }
 for(const event of snapshot.events)if(event.id>onlineEventId){if(!initial){if(event.type==='tool')gameAudio.tool(event.tool,event.actor,avatars);presentOnlineEvent(event,{actors:avatars,root:matchRoot,hazards,prop,fx:gameFX,audio:gameAudio});}onlineEventId=event.id;}
 syncOnlineHazards(snapshot.hazards,{root:matchRoot,hazards,prop,dispose:disposeHazard,actors:avatars});
 for(const item of snapshot.furniture){const f=remoteFurniture.find(f=>f.mesh.name===item.name);if(f){f.target=new THREE.Vector3(...item.position);f.rotation=new THREE.Quaternion(...item.rotation);if(initial){f.mesh.position.copy(f.target);f.mesh.quaternion.copy(f.rotation);}}}
 if(round.phase==='finished'&&!round.endStarted){if(!ui.pause.hidden)show('hud');beginStageVerdict();}
}
function updateOnlineMatch(dt){
 if(!onlineSnapshot||!round||round.endStarted)return;const keyboard=movementInput(keys,bindings),active=!paused&&!document.hidden&&!phoneLandscape.blocked&&!(round.startRemaining>0)&&round.phase==='playing',direction=active?screenToWorld(input.x+keyboard.x+padMovement.x,-input.z+keyboard.z+padMovement.z):{x:0,z:0};const inputLength=Math.hypot(direction.x,direction.z);if(inputLength>1){direction.x/=inputLength;direction.z/=inputLength;}
 const me=avatars[0],command={x:direction.x,z:direction.z,interact:active&&interactHeld};
 if(me?.prediction){if(round.phase==='playing'&&!(round.startRemaining>0)){me.prediction.advance(dt,command);online.flushPrediction(me.prediction);}const visual=me.prediction.render();me.group.position.copy(visual.position);me.group.rotation.y=visual.angle;for(const key of ['speed','grounded','velocity','vx','vz','slideX'])me[key]=me.prediction.actor[key];}
 else online.input(command.x,command.z,command.interact);
 shipAngle=mapData.id==='sunken'?shipTilt(300-round.remaining):0;matchRoot.rotation.z=shipAngle;matchRoot.position.copy(shipPivot).sub(shipPivot.clone().applyAxisAngle(new THREE.Vector3(0,0,1),shipAngle));if(mapData.id!=='sunken')matchRoot.position.set(0,0,0);
 const buffered=onlineFrames.advance(dt);
 for(const actor of avatars){const state=round.actors[actor.id];
  if(actor.id!==0&&buffered){const {a,b,alpha,extra}=buffered;applyPose(actor,interpolatePose(a.poses[actor.id],b.poses[actor.id],alpha,extra));}
  else if(actor.id===0&&!actor.prediction&&active&&!state.caught){let dx=direction.x,dz=direction.z;const flying=state.effect==='rocket'&&state.effectTime>0;if(state.effect==='banana'&&state.effectTime>0){dx=state.spinDirection?.x||0;dz=state.spinDirection?.z||0;}if(flying&&Math.hypot(dx,dz)<.1){dx=Math.sin(actor.group.rotation.y);dz=Math.cos(actor.group.rotation.y);}const prediction=simulationSteps(dt);for(let step=0;step<prediction.count;step++)advanceActor(actor,state,dx,dz,prediction.dt,{grid,map:mapData.id,tilt:shipAngle,speed:movementSpeed(state.role,mapData.id,true,flying)});}
  animate(actor,state,dt);if(actor.detectionZone)actor.detectionZone.update(hasDetectedThief(round,avatars,actor.id,(p,q)=>withinSight(p,q)),!state.caught&&!state.inSmoke);
 }
 if(buffered){const {a,b,alpha}=buffered;for(const f of remoteFurniture){const to=b.furniture.find(item=>item.name===f.mesh.name),from=a.furniture.find(item=>item.name===f.mesh.name)||to;if(to){f.mesh.position.fromArray(from.position).lerp(new THREE.Vector3(...to.position),alpha);f.mesh.quaternion.fromArray(from.rotation).slerp(new THREE.Quaternion(...to.rotation),alpha);}}}
 for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];if(h.type==='smoke')animateSmokeBomb(h.mesh,dt);if(h.type==='banana')animateBananaHazard(h.mesh,dt);animateHazardTelegraph(h.mesh,dt);animatePlayerMirage(h.mesh,dt);if(h.networkId)continue;h.time-=dt;if(h.time<=0){disposeHazard(h);hazards.splice(i,1);}}gameFX.update(dt,matchCamera,{map:mapData?.id,bounds});updateHud();
}

function choice(id,name,sub,selected,icon=''){return `<button class="choice${selected?' selected':''}" data-choice="${id}" aria-pressed="${selected}">${icon}<strong>${name}</strong><small>${sub}</small></button>`;}
function toolImage(t){return `<img src="assets/pnt/${t.icon}.png" alt="">`;}
function renderTools(){
 const selected=TOOLS.find(t=>t.id===selectedTool),types=Object.fromEntries(TOOLS.map(t=>[t.id,t.type]));
 $('#page-content').innerHTML=`
 <div class="equipped-slots" aria-label="Equipped tools">${loadout.map((id,slot)=>{const t=TOOLS.find(t=>t.id===id);return `<button class="equipped-slot" data-slot-detail="${slot}">${toolImage(t)}<span><small>SLOT ${slot+1} <kbd>${actionMarkup(slot===0?'tool1':'tool2')}</kbd></small><strong>${t.name}</strong><em>${t.cooldown}s cooldown · ${types[id]}</em></span></button>`;}).join('')}</div>
 <div class="kit-body"><div id="tool-catalog" class="tool-catalog" aria-label="Tool catalog">${TOOLS.map(t=>choice(t.id,t.name,loadout.includes(t.id)?'SLOT '+(loadout.indexOf(t.id)+1):'',t.id===selectedTool,toolImage(t))).join('')}</div>
 <section class="tool-detail" aria-label="Selected tool details"><div class="tool-detail-title">${toolImage(selected)}<h2>${selected.name}</h2></div><div class="tool-stats"><span>${selected.cooldown}s<small>COOLDOWN</small></span><span>${types[selected.id]}<small>TOOL TYPE</small></span></div><p>${selected.description.replace(" 8 second cooldown.","")}</p>
 <button id="equip-slot1" class="primary equip-button" ${loadout[0]===selectedTool?'disabled':''}>${loadout[0]===selectedTool?'EQUIPPED IN SLOT 1':'EQUIP SLOT 1'}</button><button id="equip-slot2" class="primary equip-button" ${loadout[1]===selectedTool?'disabled':''}>${loadout[1]===selectedTool?'EQUIPPED IN SLOT 2':'EQUIP SLOT 2'}</button><button id="preview-tool" class="secondary">PREVIEW ${selected.key}</button></section></div>`;
 for(const b of document.querySelectorAll('#tool-catalog [data-choice]'))b.onclick=()=>{selectedTool=b.dataset.choice;previewTime=0;preview.anim.play('idle');renderTools();};
 for(const b of document.querySelectorAll('[data-slot-detail]'))b.onclick=()=>{selectedTool=loadout[Number(b.dataset.slotDetail)];renderTools();};
 for(const slot of [0,1])$('#equip-slot'+(slot+1)).onclick=()=>{loadout=equipTool(loadout,selectedTool,slot);localStorage.setItem('pnt-loadout',JSON.stringify(loadout));labels();renderTools();};
 $('#preview-tool').onclick=()=>demo(selected.clip);
}
function openPage(name){if(busy)return;bindingCapture=null;settingsPage=null;activePage=name;ui.menu.classList.toggle('oyen-customizing',name==='costume'&&costume==='oyen');if(preview)preview.group.visible=!['play','online','join','credits','settings'].includes(name);$('#page-back').textContent=returnToLobby?'← LOBBY':'← BACK';ui.menu.dataset.page=name;$('#home').hidden=name!=='home';$('#home-widgets').hidden=name!=='home';$('#page').hidden=name==='home';$('#page').scrollTop=0;if(name==='home'){labels();previewClip='idle';previewTime=0;if(preview)preview.anim.play('idle');return;}
 $('#page-title').textContent={play:'LET’S PLAY',online:'SOLO ONLINE',join:'JOIN THE CHASE',tools:'TOOLS OF THE TRADE',costume:'YOUR LOOK',settings:'SETTINGS',credits:'CREDIT'}[name];
 $('#page-kicker').hidden=true;
 $('#page-kicker').textContent={play:'GATHER THE CREW',join:'FIND YOUR CREW',tools:'A LITTLE HELP FOR YOUR GETAWAY',costume:'LOOK GOOD. RUN FAST.',settings:'MAKE YOURSELF COMFORTABLE',credits:'MADE FOR A LITTLE TROUBLE'}[name];
 const content=$('#page-content');
 if(name==='play'){
  content.innerHTML='<div class="flow-options"><button id="solo-online" class="flow-option host-option"><img src="assets/pnt/ui/online.png" alt=""><small>PLAY WITH PEOPLE ONLINE</small><b>SOLO ONLINE →</b></button><button id="couch-play" class="flow-option join-option"><img src="assets/pnt/ui/users.png" alt=""><small>2–4 PLAYERS · ONE SCREEN</small><b>COUCH PLAY →</b></button></div>';$('#solo-online').onclick=()=>openPage('online');$('#couch-play').onclick=hostCouchLobby;
 }else if(name==='online'){
  content.innerHTML=`<div class="flow-options"><button id="host-lobby" class="flow-option host-option"><img src="assets/pnt/ui/users.png" alt=""><small>HOST A LOBBY</small><b>HOST LOBBY →</b></button><button id="join-lobby" class="flow-option join-option"><img src="assets/pnt/ui/online.png" alt=""><small>FIND YOUR CREW</small><b>JOIN LOBBY →</b></button></div>`;
  content.insertAdjacentHTML('beforeend','<p id=play-status class=flow-network-note role=status></p>');$('#host-lobby').onclick=()=>connectOnline('host');$('#join-lobby').onclick=()=>openPage('join');
 }else if(name==='join'){
  content.innerHTML=`<div class="flow-options"><section class="flow-option join-option"><img src="assets/pnt/ui/online.png" alt=""><small>PUBLIC MATCHMAKING</small><strong>FIND A<br>CHASE.</strong><button id="public-match" class="primary">FIND PUBLIC MATCH</button></section><form id="join-code-form" class="flow-option code-option"><img src="assets/pnt/ui/lock.png" alt=""><strong>GOT AN<br>INVITE?</strong><label for="join-code">ROOM CODE</label><input id="join-code" name="roomCode" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="6" placeholder="ABC123" aria-describedby="join-status"><button type="submit" class="primary">JOIN ROOM →</button></form></div><p id="join-status" class="flow-network-note" role="status"></p>`;
  $('#public-match').onclick=()=>connectOnline('public');
  $('#join-code-form').onsubmit=e=>{e.preventDefault();if(!validateRoomCode($('#join-code').value)){$('#join-status').textContent='Enter a six-character room code using letters and numbers.';$('#join-code').focus();return;}connectOnline('join',$('#join-code').value.trim().toUpperCase());};$('#join-code').oninput=e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');};
 }else if(name==='tools'){
  renderTools();
 }else if(name==='costume'){
  content.innerHTML=`<section id="oyen-options"></section><div class="wardrobe-grid">${COSTUMES.map(c=>choice(c.id,c.name,c.id===costume?'EQUIPPED':'',c.id===costume,'<img src="assets/pnt/portraits/'+c.id+'.png" alt="">')).join('')}</div><button id="costume-dance" class="secondary">SHOW YOUR MOVES</button>`;
  for(const b of content.querySelectorAll('[data-choice]'))b.onclick=()=>selectCostume(b.dataset.choice);$('#costume-dance').onclick=()=>demo('dance');renderOyenOptions();
 }else if(name==='settings'){
  settingsPage=mountSettings(content,{getSettings:()=>settings,onChange:changeSetting,hapticsSupported:haptics.supported||controller.supported,
   bindingsMarkup:'<div id="key-binding-list"></div><button id="reset-bindings" class="secondary">RESET KEY MAPPING</button><p id="binding-status" role="status"></p>',
   onBindings:()=>{renderBindingSettings();$('#reset-bindings').onclick=()=>{bindings={...DEFAULT_BINDINGS};bindingCapture=null;saveBindings(localStorage,bindings);renderBindingSettings();refreshControlHints();};},
   onCloseBindings:()=>{bindingCapture=null;},
   onFullscreen:(button,status)=>configureFullscreen(button,status),
   onReset:()=>{settings={...DEFAULT_SETTINGS,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};bindings={...DEFAULT_BINDINGS};bindingCapture=null;saveBindings(localStorage,bindings);refreshControlHints();const saved=saveSettings(localStorage,settings);applySettings();return saved;}
  });
 }else{
  content.innerHTML=creditsMarkup();
 }
 $('#page-back').focus({preventScroll:true});
}
function actionLabel(action){return controllerActive?({tool1:'X / □',tool2:'Y / △',interact:'A / ×'})[action]:keyLabel(bindings[action]);}
function setControlDevice(pad){if(controllerActive===pad)return;controllerActive=pad;if(!pad)for(const el of document.querySelectorAll('.pad-focus'))el.classList.remove('pad-focus');refreshControlHints();}
function actionMarkup(action){return controllerActive?actionLabel(action):bindingMarkup(bindings[action]);}
function refreshControlHints(){

 $('#interact-key').innerHTML=actionMarkup('interact');$('#tool-key1').innerHTML=actionMarkup('tool1');$('#tool-key2').innerHTML=actionMarkup('tool2');loadout.forEach((id,slot)=>{if(!round||round.actors[0].toolCooldowns[slot]<=0)$('#tool-status'+(slot+1)).textContent='';});
}
function renderBindingSettings(){
 const list=$('#key-binding-list');if(!list)return;list.replaceChildren(...Object.entries(BINDING_LABELS).map(([action,label])=>{const button=document.createElement('button');button.className='binding-button';button.innerHTML='<span>'+label+'</span><span>'+(bindingCapture===action?'KEY / MOUSE…':bindingMarkup(bindings[action]))+'</span>';button.onclick=()=>{bindingCapture=action;clearInput();renderBindingSettings();$('#binding-status').textContent='Press a key or left, right or middle mouse button. Escape cancels.';};return button;}));
 $('#binding-status').textContent='';
}
function renderOyenOptions(){
 const host=$('#oyen-options');if(!host)return;ui.menu.classList.toggle('oyen-customizing',costume==='oyen');host.hidden=costume!=='oyen';if(host.hidden){host.replaceChildren();return;}
 host.innerHTML=`<div class="oyen-variants"><h2>OYEN COAT</h2><div class="oyen-coats">${OYEN_COATS.map(c=>`<button class="oyen-swatch coat-${c.id}" data-coat="${c.id}" aria-pressed="${oyenAppearance.coat===c.id}"><i aria-hidden="true"></i><span>${c.name}</span></button>`).join('')}</div><div class="oyen-faces"><span>FACE</span>${OYEN_SKINS.map(c=>`<button class="face-swatch" data-skin="${c.id}" aria-label="${c.name}" aria-pressed="${oyenAppearance.skin===c.id}" style="--face-color:${c.color}"><i aria-hidden="true"></i></button>`).join('')}</div></div>`;
 for(const button of host.querySelectorAll('button'))button.onclick=()=>{oyenAppearance={...oyenAppearance,...(button.dataset.coat?{coat:button.dataset.coat}:{skin:button.dataset.skin})};saveOyenAppearance(localStorage,oyenAppearance);previewModel();for(const b of host.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.coat?b.dataset.coat===oyenAppearance.coat:b.dataset.skin===oyenAppearance.skin));};
}
function refreshCostumeSelection(){
 const panel=$('#page'),scrollTop=panel.scrollTop;
 for(const button of panel.querySelectorAll('.wardrobe-grid [data-choice]')){const equipped=button.dataset.choice===costume;button.classList.toggle('selected',equipped);button.classList.toggle('is-on',equipped);button.setAttribute('aria-pressed',String(equipped));button.querySelector('small').textContent=equipped?'EQUIPPED':'';}
 renderOyenOptions();panel.scrollTop=scrollTop;
}
async function selectCostume(id){if(id===costume)return;const previous=costume;costume=id;beginLoading('DRESSING FOR TROUBLE');try{await ensureCostume();progress(90,'Preparing your character…');previewModel();await renderer.compileAsync(scene,menuCamera);localStorage.setItem('pnt-costume',costume);endLoading();refreshCostumeSelection();}catch(error){costume=previous;loadError(error,()=>selectCostume(id));}}
for(const b of document.querySelectorAll('[data-page]'))b.onclick=()=>openPage(b.dataset.page);
$('#training').onclick=hostLobby;
$('#profile-name-edit').onclick=()=>{$('#profile-name-form').hidden=false;$('#profile-name-edit').setAttribute('aria-expanded','true');$('#profile-name-input').value=profile.name;$('#profile-name-input').focus();$('#profile-name-input').select();};
function closeNameForm(){$('#profile-name-form').hidden=true;$('#profile-name-edit').setAttribute('aria-expanded','false');$('#profile-name-edit').focus();}
$('#cancel-profile-name').onclick=closeNameForm;
$('#profile-name-input').onkeydown=e=>{if(e.code==='Escape'){e.stopPropagation();closeNameForm();}};
$('#profile-name-form').onsubmit=e=>{e.preventDefault();const name=profileName($('#profile-name-input').value);if(!name)return;profile={...readProfile(localStorage),name};if(!saveProfile(localStorage,profile)){$('#profile-save-status').textContent='Storage unavailable. Name applies for this visit.';}else closeNameForm();labels();uiEffects.sounds.play('ui_confirm');};
addEventListener('storage',e=>{if(e.key===PROFILE_KEY){profile=readProfile(localStorage);labels();}});

$('#sunken-look').onclick=()=>{if(!sunkenLook)return;sunkenStylized=!sunkenStylized;try{localStorage.setItem('pnt-sunken-look',sunkenStylized?'stylized':'original');}catch{}sunkenLook.setEnabled(sunkenStylized);resume();};
$('#page-back').onclick=goBack;$('#pause-button').onclick=pauseGame;$('#resume').onclick=resume;$('#leave').onclick=menu;$('#result-menu').onclick=menu;$('#again').onclick=start;
addEventListener('keydown',e=>{if(!bindingCapture)return;e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape'){bindingCapture=null;renderBindingSettings();return;}const next=rebind(bindings,bindingCapture,e.code);if(!next){$('#binding-status').textContent='Choose a key, or click left, right or middle mouse button.';return;}bindings=next;bindingCapture=null;clearInput();saveBindings(localStorage,bindings);renderBindingSettings();refreshControlHints();},true);
function handleCouchLobbyKey(e){
 if(room?.mode!=='couch'||ui.lobby.hidden||busy||e.target.matches('input,select,textarea'))return;
 // Focused buttons retain native Enter/Space activation, including Start, map
 // arrows and pickers. The panel shortcuts apply outside those controls.
 if(['Enter','Space'].includes(e.code)&&ui.lobby.contains(e.target)&&e.target.closest('button,a[href],[role=button]'))return;
 const command={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'accept',Space:'ready',Escape:'back'}[e.code];
 if(command){if(room.players[0].controller===null)room.keyboardHost=true;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat||command!=='ready')couchLobbyCommand(0,command);}
}
addEventListener('keydown',handleCouchLobbyKey,true);
addEventListener('keydown',e=>{if(e.target.matches('select,input,textarea')||busy||e.metaKey)return;setControlDevice(false);if(e.code==='Escape'){if(paused)resume();else if(round)pauseGame();else goBack();return;}if(round&&Object.values(bindings).includes(e.code)){e.preventDefault();keys.add(e.code);}if(round&&!paused&&!e.repeat){if(e.code===bindings.interact)interact('keyboard');if(e.code===bindings.tool1)useTool(0);if(e.code===bindings.tool2)useTool(1);}});
addEventListener('keyup',e=>{keys.delete(e.code);if(e.code===bindings.interact)stopInteract('keyboard');});addEventListener('blur',()=>{clearInput();pauseGame();});document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(document.hidden){pauseGame();gameAudio.stop();}});
let capturedMouseClickUntil=0,capturedMouseButton=null;
function mouseGameplay(){return !!round&&!ui.hud.hidden&&!paused&&!busy&&!document.hidden&&!phoneLandscape.blocked;}
addEventListener('pointerdown',e=>{
 if(e.pointerType!=='mouse'){if(e.pointerType==='touch')setControlDevice(false);return;}const code=mouseCode(e.button);if(!code)return;if(!bindingCapture)setControlDevice(false);
 if(bindingCapture){e.preventDefault();e.stopImmediatePropagation();const next=rebind(bindings,bindingCapture,code);if(!next)return;bindings=next;bindingCapture=null;capturedMouseClickUntil=performance.now()+800;capturedMouseButton=e.button;clearInput();saveBindings(localStorage,bindings);renderBindingSettings();refreshControlHints();return;}
 if(!mouseGameplay()||e.target.closest('button,input,select,textarea,a'))return;
 setControlDevice(false);if(!Object.values(bindings).includes(code))return;e.preventDefault();if(keys.has(code))return;keys.add(code);
 if(code===bindings.tool1)useTool(0);if(code===bindings.tool2)useTool(1);if(code===bindings.interact)interact(code);
},true);
addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')return;const code=mouseCode(e.button);keys.delete(code);if(code===bindings.interact)stopInteract(code);},true);
addEventListener('click',e=>{if(e.button===capturedMouseButton&&performance.now()<capturedMouseClickUntil){capturedMouseButton=null;e.preventDefault();e.stopImmediatePropagation();}},true);
for(const event of ['contextmenu','auxclick'])addEventListener(event,e=>{if(mouseGameplay()||bindingCapture||performance.now()<capturedMouseClickUntil)e.preventDefault();},true);
function updateController(now,dt){
 if(room?.mode==='couch'){updateCouchControllers(now,dt);return;}
 if(document.hidden){padMovement={x:0,z:0};return;}const pad=controller.poll(now),status=$('#controller-status');
 if(status){const text=pad.connected?'Controller connected · '+pad.id:'Controller ready · connect a pad and press a button';if(status.textContent!==text)status.textContent=text;}
 if(!pad.connected)setControlDevice(false);else if(pad.pressed.size||pad.x||pad.z)setControlDevice(true);
 const game=mouseGameplay()&&round.phase==='playing'&&!(round.startRemaining>0);padMovement=game?{x:pad.x,z:pad.z}:{x:0,z:0};
 controller.rumble(round?.actors[0]?.effect,dt,game&&controllerActive&&round.actors[0].effectTime>0,settings.haptics);
 if(!pad.connected||!game||!pad.held.has(0)){if(interactionSources.has('controller'))stopInteract('controller');}
 if(busy)return;if(bindingCapture){if(pad.pressed.has(1)){bindingCapture=null;renderBindingSettings();}return;}
 if(pad.pressed.has(9)){if(paused)resume();else if(round&&!ui.hud.hidden)pauseGame();return;}
 if(game){if(pad.pressed.has(0))interact('controller');if(pad.pressed.has(2))useTool(0);if(pad.pressed.has(3))useTool(1);return;}
 if(!ui.hud.hidden)return;
 if(pad.pressed.has(1)){if(paused)resume();else if(!ui.results.hidden)menu();else goBack();return;}
 if(pad.direction)controllerMenu(document,pad.direction);
 if(pad.pressed.has(4))controllerMenu(document,'tabLeft');if(pad.pressed.has(5))controllerMenu(document,'tabRight');if(pad.pressed.has(0))controllerMenu(document,'accept');
}

touchControls=bindGameControls({root:document,sensitivity:()=>settings.joystickSensitivity,joystick:$('#joystick'),knob:$('#stick'),isActive:()=>!ui.hud.hidden&&!busy&&!paused&&!phoneLandscape.blocked&&round?.phase==='playing'&&!(round.startRemaining>0),onMove:(x,z)=>{input.x=x;input.z=z;},actions:[[$('#interact'),interact,stopInteract],[$('#tool-action1'),()=>useTool(0)],[$('#tool-action2'),()=>useTool(1)],[$('#pause-button'),pauseGame]]});
$('#pause-button').onclick=null;
for(const name of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(name,()=>{if(activePage==='settings')settingsPage?.refreshFullscreen();});

function restoreRemoteFurniture(){for(const f of remoteFurniture){f.parent.add(f.mesh);f.mesh.position.copy(f.position);f.mesh.quaternion.copy(f.quaternion);f.mesh.scale.copy(f.scale);}remoteFurniture=[];}
function prepareRemoteFurniture(){const meshes=[];gameArena.traverse(o=>{if(o.isMesh&&/^BP_Coffee(Chair|Table)/.test(o.name))meshes.push(o);});remoteFurniture=meshes.map(mesh=>{const item={mesh,parent:mesh.parent,position:mesh.position.clone(),quaternion:mesh.quaternion.clone(),scale:mesh.scale.clone()};matchRoot.attach(mesh);return item;});}
async function loadArena(id){
 const [asset,data,nav,collision]=await Promise.all([getGLB('arena-'+id,`assets/pnt/arenas/${id}-lit.glb?v=contact-1`,e=>progress(e.total?Math.min(50,e.loaded/e.total*50):15,'Loading '+id+' arena…')),fetch(`assets/pnt/arenas/${id}.json`).then(r=>{if(!r.ok)throw Error('Missing arena metadata');return r.json();}),fetch(`assets/pnt/arenas/${id}.nav.json?v=environment-098`).then(r=>{if(!r.ok)throw Error('Missing arena navigation');return r.json();}),fetch(`assets/pnt/arenas/${id}.collision.json?v=${id==='sunken'?'overhead-046':'environment-098'}`).then(r=>{if(!r.ok)throw Error('Missing Unreal collision');return r.json();})]);
 sunkenLook?.dispose();sunkenLook=null;restoreRemoteFurniture();furniturePhysics?.dispose();furniturePhysics=null;matchRoot.rotation.set(0,0,0);matchRoot.position.set(0,0,0);shipAngle=0;
 gameArena?.removeFromParent();gameArena=asset.scene;gameArena.visible=true;mapData=data;gameArena.position.set(...data.origin.map(v=>-v));matchRoot.add(gameArena);matchRoot.updateMatrixWorld(true);menuArena.visible=false;
 mallFill.visible=id==='mall';if(id==='mall')matteMall(gameArena);await bakedArena(gameArena,id);waterAnimation=id==='sunken'?prepareSunkenWater(gameArena,THREE.RepeatWrapping):null;ground=[];gameArena.traverse(o=>{if(o.isMesh){if(solidForGameplay(o))ground.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.map)m.map.anisotropy=2;}});
 bounds=arenaBounds(gameArena,data);sunlight.intensity=(id==='mall'?2.4:3)*.9;fill.intensity=(id==='mall'?.96:1.2)*.9;hemisphere.intensity=(id==='mall'?1.92:2.4)*.9;mallFill.intensity=1.2*.9;renderer.toneMappingExposure=id==='mall'?1.15*1.15:1.15;
 grid={...nav,blocked:collision.blocked,edges:collision.edges,heights:Float32Array.from(collision.groundHeights||nav.heights,v=>v===null?NaN:v)};grid.landingMask=landingMask(grid,data.spawns);floor.position.y=-12;floor.material.color.set(id==='mall'?0x77768c:id==='sunken'?0x24638b:0x9bc4d7);
 if(id==='sunken'){sunkenLook=createSunkenLook({renderer,scene,sunlight,fill,hemisphere,bounds,quality,enabled:sunkenStylized});sunkenLook.register(gameArena);sunkenLook.register(floor);}
 if(id==='sunken')gameArena.getObjectByName('SunkenShip').getWorldPosition(shipPivot);if(id==='mall'&&!online){progress(50,'Preparing movable furniture…');furniturePhysics=await createMallPhysics(gameArena,matchRoot,grid);}if(id==='mall'&&online)prepareRemoteFurniture();
 const props=[['propBanana','SM_TL_Banana'],['propSmoke','SM_TL_Bomb'],['propHammer','SM_TL_Hammer'],['propJet','jetpack']];await Promise.all(props.map(async([key,file])=>{templates[key]=await getGLB(key,`assets/pnt/props/${file}.glb`);}));await gameAudio.prepare(id==='sunken'?'pirate-chase-bgm':id==='iceberg'?'iceberg-chase-bgm':null);
}
function restoreMenuArena(){sunkenLook?.dispose();sunkenLook=null;restoreRemoteFurniture();furniturePhysics?.dispose();furniturePhysics=null;waterAnimation=null;matchRoot.rotation.set(0,0,0);matchRoot.position.set(0,0,0);shipAngle=0;sunlight.intensity=3;fill.intensity=1.2;hemisphere.intensity=2.4;mallFill.visible=false;renderer.toneMappingExposure=1.15;if(gameArena)gameArena.visible=false;if(menuArena){menuArena.visible=false;({ground,bounds,grid}=menuNavigation);}floor.position.y=-.3;floor.material.color.set(0x77768c);$('#world-markers').replaceChildren();}
function prop(key,size=1){const source=templates[key];if(!source)return null;const object=clone(source.scene);const box=new THREE.Box3().setFromObject(object),scale=size/Math.max(.01,...box.getSize(new THREE.Vector3()).toArray());object.scale.multiplyScalar(scale);object.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(object),center=b.getCenter(new THREE.Vector3());object.position.add(new THREE.Vector3(-center.x,-b.min.y,-center.z));const root=new THREE.Group();root.add(object);return root;}
function disposeHazard(h){disposePlayerMirage(h.mesh);h.mesh.removeFromParent();if(h.owned)h.mesh.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
function withinSight(p,q,smoke=true,stop=.35){return hasSight(grid,p,q,hazards,smoke,stop);}
function steerBot(a,target,dt){
 a.routeTime=(a.routeTime||0)-dt;const p=a.group.position;
 if(a.routeTime<=0||!a.route||!a.routeGoal||a.routeGoal.distanceToSquared(target)>1){a.route=findPath(grid,p,target);a.routeGoal=target.clone();a.routeTime=.8;}
 while(a.route.length&&Math.hypot(a.route[0].x-p.x,a.route[0].z-p.z)<.22)a.route.shift();const next=a.route[0]||target,dx=next.x-p.x,dz=next.z-p.z,d=Math.hypot(dx,dz);return d>.06?{x:dx/d,z:dz/d}:{x:0,z:0};
}
function interactionTarget(id){
 const a=avatars[id],state=round.actors[id];if(!a||state.role!=='runner')return null;const p=a.group.position;
 const teammate=round.actors.filter(t=>t.id!==id&&t.caught&&t.releaseCooldown<=0&&(t.rescuer===null||t.rescuer===id||!canActRule(round,t.rescuer))).map(t=>({type:'rescue',target:t,position:avatars[t.id].group.position})).filter(t=>p.distanceTo(t.position)<INTERACT_RADIUS&&withinSight(p,t.position,false,1.1)).sort((a,b)=>p.distanceToSquared(a.position)-p.distanceToSquared(b.position))[0];if(teammate)return teammate;
 if(round.actors[id].inSmoke)return null;return round.caches.filter(c=>c.remaining>0).map(c=>({type:'money',target:c,position:new THREE.Vector3(...c.position)})).filter(t=>Math.hypot(p.x-t.position.x,p.z-t.position.z)<INTERACT_RADIUS&&Math.abs(p.y-t.position.y)<2&&withinSight(p,t.position,false,1.1)).sort((a,b)=>p.distanceToSquared(a.position)-p.distanceToSquared(b.position))[0]||null;
}
function performInteraction(id,target,dt){
 if(!target){cancelInteraction(round,id);return;}const p=avatars[id].group.position,d=Math.hypot(p.x-target.position.x,p.z-target.position.z);
 if(target.type==='money')harvest(round,id,target.target.id,dt,d);else if(rescue(round,id,target.target.id,dt,d)){say(id===0?'TEAMMATE RELEASED!':'A THIEF WAS RELEASED!',1.3);avatars[target.target.id].ring.material.color.setHex(0x83f9c4);gameFX.rescue(avatars[target.target.id].group.position);}
}
function syncCacheCelebrations(initial=false){gameFX.syncCaches(round.caches,c=>cacheAnchors.get(c.id)||new THREE.Vector3(...c.position),initial);}
function buildMarkers(){cacheAnchors=cacheCenters(gameArena,round.caches,matchRoot,heightAt);syncCacheCelebrations(true);const root=$('#world-markers');root.replaceChildren();for(const c of round.caches){const node=document.createElement('div');node.className='world-marker cache-marker';node.id='marker-'+c.id;root.append(node);}for(const a of round.actors){const node=document.createElement('div');if(a.role==='chaser'){node.className='world-marker police-badge';node.id='police-badge-'+a.id;node.innerHTML=policeBadgeMarkup();updatePoliceBadge(node,0,reduced);}else{node.className='world-marker rescue-marker';node.id='rescue-'+a.id;}root.append(node);}if(room?.mode==='couch')for(const a of round.actors){const node=document.createElement('div');node.className='world-marker couch-name';node.id='couch-name-'+a.id;node.style.setProperty('--player-color',['#4f97ff','#ffb331','#4bd58a','#ef78ba'][a.id]);node.textContent='P'+(a.id+1);root.append(node);}}
function updateMarkers(){
 if(!round||ui.hud.hidden)return;matchCamera.updateMatrixWorld();
 const place=(node,p,center=false)=>{matchRoot.updateMatrixWorld();const v=matchRoot.localToWorld(p.clone()).project(matchCamera);node.hidden=v.z>1||v.z< -1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1;node.style.transform=`translate(-50%,${center?'-50%':'-100%'}) translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px)`;};
 for(const a of round.actors){if(a.role==='chaser'){const node=$('#police-badge-'+a.id);if(node){updatePoliceBadge(node,performance.now()/1000,reduced);place(node,avatars[a.id].group.position.clone().addScaledVector(up,2.05));}}if(room?.mode==='couch'){const node=$('#couch-name-'+a.id);if(node)place(node,avatars[a.id].group.position.clone().addScaledVector(up,a.role==='chaser'?1.72:1.95),true);}}
 for(const c of round.caches){const node=$('#marker-'+c.id);if(!node)continue;updateMoneyBar(node,c.remaining,c.amount,{cache:true});place(node,cacheAnchors.get(c.id)||new THREE.Vector3(...c.position),true);}
 for(const a of round.actors.filter(a=>a.role==='runner')){const node=$('#rescue-'+a.id);avatars[a.id].captureTint.update(a);if(!updateCaptureGauge(node,a))continue;place(node,avatars[a.id].group.position.clone().addScaledVector(up,.78),true);}
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
 let box=new THREE.Box3().setFromObject(model),height=box.max.y-box.min.y;model.scale.multiplyScalar(1.55/height);model.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));group.add(model);(round?matchRoot:scene).add(group);group.position.copy(spot((id-1.5)*2.7,id%2?4:-3));
 model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)m.roughness=Math.max(.55,m.roughness||0);}});
 const appearance=id===0&&template===templates.oyen?applyOyenAppearance(model,oyenAppearance):null;
 const captureTint=createCaptureTint(model);sunkenLook?.register(model);
 const jetpackRig={model,group};prepareJetpackMount(jetpackRig);
 const anim=makeAnimator(model,clips,actorRole);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.35,.42,24),new THREE.MeshBasicMaterial({color:id===0?0xff8a14:actorRole==='chaser'?0x2f5bff:0xffffff,transparent:true,opacity:.8,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;group.add(ring);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.35,20),new THREE.MeshBasicMaterial({color:0x09154b,transparent:true,opacity:.25,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;group.add(shadow);
 return {...jetpackRig,id,group,model,anim,ring,shadow,appearance,captureTint,velocity:0,grounded:true,speed:0,wander:id*2.2};
}
function populate(){for(const a of avatars)destroy(a);avatars=[];for(const state of round.actors){const template=room?.mode==='couch'?templates[room.players[state.id].costume]:state.id===0?templates[costume]:(templates[room?.players[state.id]?.costume]||templates[state.role==='chaser'?'police':'thief']);const actor=avatar(template,state.id,state.role);const p=mapData.spawns[state.id];actor.group.position.copy(spot(p[0],p[2]));if(state.role==='chaser'){actor.detectionZone=createDetectionZone();actor.group.add(actor.detectionZone.group);}actor.tools=room?.mode==='couch'?normalizeLoadout(room.players[state.id].loadout):state.id===0?loadout:state.role==='chaser'?['hammer','rocket']:state.id%2?['banana','smoke']:['rewind','rocket'];avatars.push(actor);}}
async function start(){if(!ready||busy)return;clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;if(room){role=resolveRole(room.preference);room.phase='playing';}returnToLobby=false;clearLobbyDisplays();beginLoading('SETTING UP THE CHASE');await nextFrame();try{await ensureCostume();await loadArena(['mall','sunken','iceberg'][room?.map||0]);progress(55,'Placing the crew…');destroy(preview);preview=null;round=createRound(role,mapData.caches);if(room?.mode==='couch'){const police=Math.floor(Math.random()*4);for(const actor of round.actors)actor.role=actor.id===police?'chaser':'runner';role=round.playerRole=round.actors[0].role;}startCountdown(round);round.profileId=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);paused=false;clearInput();clearHazards();populate();buildMarkers();stageFrame=stageFraming(mapData.spawns,mapData.caches);const center=fixedStageCenter(mapData.spawns,mapData.caches),anchor=spot(center.x,center.z);cameraTarget.set(center.x,anchor.y,center.z);cameraShake=0;positionMatchCamera();progress(85,'Warming up materials…');await renderer.compileAsync(scene,matchCamera);renderer.render(scene,matchCamera);progress(100,'Ready. Set. Run!');await nextFrame();$('#role-label').textContent=room?.mode==='couch'?'COUCH PLAY':role==='runner'?'THIEF':'POLICE';$('#role-label').classList.toggle('chaser',role==='chaser');labels();show('hud');endLoading();if(room?.mode==='couch'&&room.players.some(p=>!p.bot&&!p.connected))pauseGame();say(room?.mode==='couch'?'ONE POLICE · THREE THIEVES':role==='runner'?'HOLD INTERACT TO STEAL CASH!':'CATCH ALL THREE THIEVES!');updateHud();}catch(e){round=null;loadError(e,start);}}
function canAct(){return round&&canActRule(round,0)&&!paused&&!busy;}
function interact(source='touch'){if(canAct()){interactionSources.add(source);interactHeld=true;}}
function stopInteract(source='touch'){interactionSources.delete(source);if(interactionSources.size)return;interactHeld=false;if(online)online.input(0,0,false,performance.now(),true);else if(round)cancelInteraction(round,0);}
function smokeCoverage(){if(round)updateSmokeCoverage(round,avatars.map(a=>a.group.position),hazards.filter(h=>h.type==='smoke').map(h=>({position:h.mesh.position,time:h.time})));}
function setEffect(state,name,time){if(state.inSmoke&&['stunned','airStunned','banana'].includes(name))return;state.effect=name;state.effectTime=time;if(name==='banana'){state.spinDirection=rollSpinDirection();state.spinTurn=.35;}}
function useTool(slot,id=0){if(round?.actors[id]?.inSmoke||round?.startRemaining>0)return;if(online){if(!paused&&!busy)online.send('tool',{slot});return;}
 smokeCoverage();const actor=avatars[id],state=round?.actors[id],tool=(room?.mode==='couch'?actor?.tools:id===0?loadout:actor?.tools)?.[slot];if(!actor||!state||!canActRule(round,id)||state.inSmoke||paused||busy)return;
 if(tool==='rewind'&&!actor.mark&&state.toolCooldowns[slot]<=0){actor.mark=actor.group.position.clone();const mesh=createPlayerMirage(actor);mesh.position.copy(actor.mark);attachHazardTelegraph(mesh,'rewind');matchRoot.add(mesh);hazards.push({mesh,type:'marker',owner:id,time:Infinity});gameFX.rewind(actor.mark);gameAudio.play('Tool_Rewind_Box_Deploy',id===0?1:.5);if(id===0)say('MARK SET · PRESS AGAIN TO RETURN',1.5);return;}
 if(!activateTool(round,id,slot,tool))return;gameAudio.tool(tool,id,avatars);
 const point=actor.group.position.clone();
 if(tool==='hammer'){
  setEffect(state,'hammer',.48);actor.hammerImpact=.18/ANIMATION_PLAY_RATE;gameFX.hammerSwing(actor);const visual=attachHeldHammer(actor,prop('propHammer',1.25));if(visual)hazards.push({mesh:visual,type:'visual',time:.48});
  for(const other of round.actors){if(other.role===state.role||other.caught||other.inSmoke)continue;const a=avatars[other.id];if(point.distanceTo(a.group.position)<2&&withinSight(point,a.group.position,false))setEffect(other,a.grounded?'stunned':'airStunned',2);}
  if(id===0)say('HAMMER SWING!',.7);
 }else if(tool==='banana'){
  const mesh=prop('propBanana',.65);mesh.position.copy(point).add(new THREE.Vector3(-Math.sin(actor.group.rotation.y)*.7,.03,-Math.cos(actor.group.rotation.y)*.7));matchRoot.add(mesh);hazards.push({mesh,type:'banana',owner:id,ownerRole:state.role,time:15});gameFX.bananaDeploy(mesh.position);limitItems(id,'banana',5);if(id===0)say('PEEL DROPPED!',.7);
 }else if(tool==='smoke'){
  const mesh=prop('propSmoke',.65);mesh.position.copy(point);const cloud=smokeBombCloud();mesh.add(cloud);attachHazardTelegraph(mesh,'smoke');matchRoot.add(mesh);hazards.push({mesh,type:'smoke',owner:id,time:20});gameFX.smokeDeploy(point);limitItems(id,'smoke',3);smokeCoverage();if(id===0)say('SMOKE SCREEN!',.8);
 }else if(tool==='rewind'){
  if(actor.mark){gameFX.rewind(actor.mark);actor.group.position.copy(spot(actor.mark.x,actor.mark.z));actor.velocity=0;actor.mark=null;for(const h of hazards)if(h.type==='marker'&&h.owner===id)h.time=0;if(id===0)say('BACK TO YOUR MARK!',.8);}
 }else if(tool==='rocket'){
  setEffect(state,'rocket',5);actor.velocity=4.5;actor.grounded=false;const mesh=attachHeldJetpack(actor,prop('propJet',.8));if(mesh)hazards.push({mesh,type:'visual',time:5});if(id===0)say('JETPACK!',.7);
 }
}
function limitItems(owner,type,max){const all=hazards.filter(h=>h.owner===owner&&h.type===type&&h.time>0);for(let i=0;i<all.length-max;i++)all[i].time=0;}

function move(a,dx,dz,dt,speed){return advanceActor(a,round.actors[a.id],dx,dz,dt,{grid,map:mapData.id,tilt:shipAngle,speed,furniture:furniturePhysics,respawn:()=>spot(0,0)});}
function animate(a,state,dt){a.captureTint.update(state);let name=animationFor(state,a.speed>.16,!a.grounded);if(name==='rocket'&&state.effectTime<4.5)name='jet';a.anim.play(name,{loop:!['hammer','stunned','airStunned','busted','rocket'].includes(name),rate:mapData.id==='iceberg'&&['policeRun','thiefRun'].includes(name)?2:1});a.anim.update(dt);a.group.userData.animation=name;gameFX.run(a,dt);gameFX.jetpack(a,state,dt,matchCamera);if(a.hammerImpact>0){a.hammerImpact-=dt;if(a.hammerImpact<=0){const impact=a.group.position.clone().add(new THREE.Vector3(Math.sin(a.group.rotation.y)*.9,0,Math.cos(a.group.rotation.y)*.9));const y=heightAt(impact.x,impact.z);impact.y=Number.isFinite(y)?y:a.group.position.y;gameFX.hammer(impact);gameAudio.play('Tool_Hammer_Impact',a.id===0?1:.45);cameraShake=Math.max(cameraShake,.198);}}}
function updateGame(dt){
 const starting=round.startRemaining>0;stepRound(round,dt);if(round.phase!=='playing'){if(!round.endStarted)beginStageVerdict();return;}if(starting){clearInput();for(const a of avatars)animate(a,round.actors[a.id],dt);return;}smokeCoverage();shipAngle=mapData.id==='sunken'?shipTilt(300-round.remaining):0;matchRoot.rotation.z=shipAngle;matchRoot.position.copy(shipPivot).sub(shipPivot.clone().applyAxisAngle(new THREE.Vector3(0,0,1),shipAngle));if(mapData.id!=='sunken')matchRoot.position.set(0,0,0);const chaser=round.actors.find(a=>a.role==='chaser'),cop=avatars[chaser.id],wishes=[];
 for(const state of round.actors){
  const a=avatars[state.id];state.interacting=false;
  if(state.caught){a.vx=a.vz=0;cancelInteraction(round,state.id);a.mark=null;for(const h of hazards)if(h.type==='marker'&&h.owner===state.id)h.time=0;move(a,0,0,dt,0);animate(a,state,dt);continue;}
  let dx=0,dz=0,wants=false;
  if(state.id===0||couchHuman(room,state.id)){const keyboard=movementInput(keys,bindings),local=room?.mode==='couch'?couchInputFor(room,state.id,couchInputs,{keyboard,touch:input,interact:interactHeld}):{x:input.x+keyboard.x+padMovement.x,z:-input.z+keyboard.z+padMovement.z,interact:interactHeld};const direction=screenToWorld(local.x,local.z);dx=direction.x;dz=direction.z;wants=local.interact;}
  else if(state.role==='chaser'){
   const targets=round.actors.filter(r=>r.role==='runner'&&!r.caught&&withinSight(a.group.position,avatars[r.id].group.position)).sort((x,y)=>a.group.position.distanceToSquared(avatars[x.id].group.position)-a.group.position.distanceToSquared(avatars[y.id].group.position));
   const target=targets[0]?avatars[targets[0].id].group.position:new THREE.Vector3(...round.caches[Math.floor(performance.now()/5000)%round.caches.length].position);const d=steerBot(a,target,dt);dx=d.x;dz=d.z;if(targets[0]&&a.group.position.distanceTo(target)<1.8)useTool(0,state.id);
  }else{
   const p=a.group.position,danger=p.distanceTo(cop.group.position);let target;
   const friends=round.actors.filter(t=>t.caught&&t.releaseCooldown<=0&&(t.rescuer===null||t.rescuer===state.id)).sort((x,y)=>p.distanceToSquared(avatars[x.id].group.position)-p.distanceToSquared(avatars[y.id].group.position));
   if(danger<3.5&&withinSight(p,cop.group.position)){const choices=round.caches.filter(c=>c.remaining>0).sort((a,b)=>new THREE.Vector3(...b.position).distanceToSquared(cop.group.position)-new THREE.Vector3(...a.position).distanceToSquared(cop.group.position));target=new THREE.Vector3(...(choices[0]||round.caches[0]).position);if(danger<2){dx=p.x-cop.group.position.x;dz=p.z-cop.group.position.z;}if(state.toolCooldowns[0]<=0)useTool(0,state.id);else if(state.toolCooldowns[1]<=0)useTool(1,state.id);}
   else if(friends[0]){target=avatars[friends[0].id].group.position;wants=true;}
   else {const choices=round.caches.filter(c=>c.remaining>0).sort((a,b)=>{const score=c=>p.distanceToSquared(new THREE.Vector3(...c.position))+(avatars.some(o=>o.id!==state.id&&o.goalCache===c.id)?50:0);return score(a)-score(b);});if(choices[0]){a.goalCache=choices[0].id;target=new THREE.Vector3(...choices[0].position);wants=true;}}
   if(target&&dx===0&&dz===0){if(Math.hypot(p.x-target.x,p.z-target.z)>1.5){const d=steerBot(a,target,dt);dx=d.x;dz=d.z;}}
  }
  if(state.effect==='banana'&&state.effectTime>0){state.spinTurn-=dt;if(state.spinTurn<=0){state.spinDirection=rollSpinDirection();state.spinTurn=.35;}dx=state.spinDirection.x;dz=state.spinDirection.z;wants=false;}
  const locked=state.captureLock>0||state.captureRemaining>0||state.effectTime>0&&!['rocket','banana'].includes(state.effect);if(locked){dx=dz=0;a.vx=a.vz=0;}
  if(state.effect==='rocket'&&state.effectTime>0&&Math.hypot(dx,dz)<.1){dx=Math.sin(a.group.rotation.y);dz=Math.cos(a.group.rotation.y);}
  const moved=move(a,dx,dz,dt,(state.role==='chaser'?3.65:3.4)*1.15*(mapData.id==='iceberg'?1.5:1)*(state.id===0||couchHuman(room,state.id)?1.08:1)*(state.effect==='rocket'&&state.effectTime>0?1.8:1));if(!moved&&state.effect==='banana'&&state.effectTime>0)state.spinDirection=rollSpinDirection();if(!moved&&state.id!==0&&!locked&&Math.hypot(dx,dz)>.1){a.routeTime=0;}animate(a,state,dt);wishes.push({id:state.id,wants:wants&&!locked});
 }
 furniturePhysics?.step(dt,avatars);
 for(const h of hazards)h.time-=dt;smokeCoverage();for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];if(h.type==='smoke')animateSmokeBomb(h.mesh,dt);else if(h.type==='banana')animateBananaHazard(h.mesh,dt);animateHazardTelegraph(h.mesh,dt);animatePlayerMirage(h.mesh,dt);if(h.type==='banana'&&h.time>0)for(const state of round.actors){if(state.caught||state.inSmoke||state.role===h.ownerRole||state.effectTime>0)continue;if(avatars[state.id].group.position.distanceTo(h.mesh.position)<.8){setEffect(state,'banana',2);h.time=0;break;}}if(h.time<=0){disposeHazard(h);hazards.splice(i,1);}}
 for(const r of round.actors.filter(a=>a.role==='runner')){const p=cop.group.position,q=avatars[r.id].group.position;if(detectThiefAt(round,chaser.id,r.id,dt,p,q,withinSight(p,q))){gameFX.capture(q,p);gameAudio.capture(r.id,avatars);cop.vx=cop.vz=cop.slideX=cop.speed=0;cancelInteraction(round,r.id);if(r.id===0)stopInteract();say(r.id===0?'CAPTURED!':'CATCHING THIEF!',1);}}
 cop.detectionZone.update(hasDetectedThief(round,avatars,chaser.id,(p,q)=>withinSight(p,q)),round.phase==='playing'&&!chaser.inSmoke);
 for(const c of round.caches)c.harvester=null;
 for(const wish of wishes){const target=wish.wants?interactionTarget(wish.id):null,key=target?target.type+':'+target.target.id:null,actor=avatars[wish.id];if(actor.interactionKey!==key||!target)cancelInteraction(round,wish.id);actor.interactionKey=key;if(target)performInteraction(wish.id,target,dt);}
 if(round.phase==='finished'&&!round.endStarted)beginStageVerdict();
}
function clearStageVerdict(){document.body.classList.remove('round-ending');$('#stage-verdict').hidden=true;$('#stage-verdict').classList.remove('is-lose');$('#round-fade').style.opacity='0';}
function beginStageVerdict(){
 for(const actor of avatars)if(actor.detectionZone)actor.detectionZone.group.visible=false;round.endStarted=true;round.endElapsed=0;paused=false;clearInput();document.body.classList.add('round-ending');const won=round.winner===round.playerRole;
 $('#stage-verdict').classList.toggle('is-lose',!won);$('#stage-verdict-title').textContent=room?.mode==='couch'?(round.winner==='chaser'?'POLICE WIN!':'THIEVES WIN!'):won?'VICTORY!':'DEFEAT';$('#stage-verdict-reason').textContent=round.reason==='timeout'?'TIME UP':round.reason==='money'?'ALL MONEY STOLEN':'ALL THIEVES CAUGHT';$('#stage-verdict').hidden=false;
 uiEffects.sounds.play(won?'victory_fanfare':'defeat_jingle');$('#toast').textContent='';
 for(const a of avatars)a.anim.play(round.actors[a.id].role===round.winner?'dance':'idle');
}
function tickStageVerdict(elapsed){
 if(!round?.endStarted||round.resultsShown||document.hidden)return;round.endElapsed+=Math.min(elapsed,1);const view=stageEndState(round.endElapsed);$('#round-fade').style.opacity=String(view.fade);for(const a of avatars)a.anim.update(Math.min(elapsed,.1));gameFX.update(Math.min(elapsed,.1));
 if(view.ready){round.resultsShown=true;clearStageVerdict();showFinalResults();}
}
function refreshOnlineRematch(){
 if(!online||ui.results.hidden)return;const button=$('#again');button.disabled=!room.canHost;button.textContent=room.canHost?'ONE MORE CHASE →':'WAITING FOR HOST';
}
function showFinalResults(){
 const won=round.winner===round.playerRole;if(!round.profileRecorded){profile=recordMatch(readProfile(localStorage),{id:round.profileId,won});saveProfile(localStorage,profile);round.profileRecorded=true;labels();}
  const resultCostume=room?.mode==='couch'?room.players[0].costume:costume;show('results');renderResults(ui.results,{round,won,profile,costume:resultCostume,players:room?.players||[],map:mapData?.id||'mall',sounds:uiEffects.sounds,onAgain:online?()=>online.control('rematch'):room?.mode==='couch'?couchRematch:start,onMenu:menu,reduced,online:!!online,couch:room?.mode==='couch',playOutcome:false});try{resultPortrait=createResultPortrait(ui.results.querySelector('.result-character-host'),templates[resultCostume],clips,won,resultCostume==='oyen'?model=>applyOyenAppearance(model,oyenAppearance):null);}catch(error){console.warn('Character portrait could not be rendered',error);}if(room?.mode==='couch'){$('#result-title').textContent=round.winner==='chaser'?'POLICE WIN!':'THIEVES WIN!';$('#again').textContent='BACK TO COUCH LOBBY';}refreshOnlineRematch();
}

function updateHud(){
 syncCacheCelebrations();
 const seconds=Math.ceil(round.remaining);$('#timer').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;updateMoneyBar($('#money-status'),round.collected,round.totalMoney);
 const crew=$('#crew-status'),outfitFor=a=>room?.mode==='couch'?room.players[a.id].costume:a.id===0?costume:room?.players[a.id]?.costume||'thief',crewSignature=round.actors.map(a=>[a.id,a.role,outfitFor(a),a.caught,a.captureRemaining>0,Math.ceil(a.releaseCooldown)].join(':')).join('|');if(crew.dataset.signature!==crewSignature){crew.dataset.signature=crewSignature;crew.replaceChildren(...round.actors.filter(a=>a.role==='runner').map(a=>{const chip=document.createElement('span'),capturing=a.captureRemaining>0;chip.className=`crew-chip crew-head${a.caught?' caught':''}${a.id===0?' is-self':''}${capturing?' is-capturing':''}`;const label=`${a.id===0?'You':room?.players[a.id]?.name||'Thief '+a.id}: ${capturing?'being captured':a.caught?(a.releaseCooldown>0?'release in '+Math.ceil(a.releaseCooldown)+' seconds':'ready for rescue'):'free'}`;chip.setAttribute('role','img');chip.setAttribute('aria-label',label);chip.title=label;const image=document.createElement('img');image.src='assets/pnt/portraits/'+outfitFor(a)+'.png';image.alt='';chip.append(image);if(a.caught||capturing){const cross=document.createElement('b');cross.className='crew-cross';cross.textContent='×';cross.setAttribute('aria-hidden','true');chip.append(cross);}if(a.caught&&a.releaseCooldown>0){const timer=document.createElement('small');timer.className='crew-release';timer.textContent=Math.ceil(a.releaseCooldown);timer.setAttribute('aria-hidden','true');chip.append(timer);}return chip;}));}
 if(room?.mode==='couch'){updateCouchHud($('#couch-hud'),room,round,bindings);return;}
 const state=round.actors[0],actor=avatars[0];state.toolCooldowns.forEach((cd,slot)=>{const tool=TOOLS.find(t=>t.id===loadout[slot]);$('#tool-action'+(slot+1)).classList.toggle('cooling-down',cd>0);$('#tool-status'+(slot+1)).textContent=cd>0?Math.ceil(cd)+'s':'';$('#tool-action'+(slot+1)).disabled=cd>0||state.captureLock>0||state.inSmoke||round.startRemaining>0||state.caught||state.captureRemaining>0;$('#tool-action-label'+(slot+1)).textContent=tool.id==='rewind'&&actor.mark?'RETURN':tool.key;});
 const target=interactionTarget(0);$('#interact').disabled=round.startRemaining>0||state.inSmoke&&target?.type!=='rescue'||state.caught||state.effectTime>0||state.role==='chaser'||state.captureRemaining>0;
}

function positionMatchCamera(){const view=matchView(menuCamera.aspect,stageFrame);scene.fog.near=view.distance+20;scene.fog.far=view.distance+85;const far=view.distance+180;if(matchCamera.far!==far){matchCamera.far=far;matchCamera.updateProjectionMatrix();}matchCamera.position.copy(cameraTarget).add(new THREE.Vector3(...view.offset));const shake=reduced?{x:0,z:0}:shakeOffset(shakeTime,cameraShake*settings.cameraShake);matchCamera.position.x+=shake.x;matchCamera.position.z+=shake.z;matchCamera.lookAt(cameraTarget);}

async function boot(){beginLoading('GETTING READY');try{let done=0;const names=['thief','police','mall-slice'];const items=await Promise.all(names.map(async name=>{const value=await getGLB(name,`assets/pnt/${name}.glb`);progress(++done/4*70,`Loading ${name==='mall-slice'?'Mall promenade':name}…`);return value;}));templates={thief:items[0],police:items[1]};const response=await fetch('assets/pnt/animations/clips.json?v=idle-b1');if(!response.ok)throw new Error('Animation download failed');const data=await response.json();clips=Object.fromEntries(Object.entries(data.clips).map(([name,clip])=>[name,THREE.AnimationClip.parse(clip)]));progress(75,'Preparing the walkable arena…');const arena=items[2].scene;menuArena=arena;arena.updateMatrixWorld(true);const initial=new THREE.Box3().setFromObject(arena),center=initial.getCenter(new THREE.Vector3());arena.position.add(new THREE.Vector3(-center.x,-initial.min.y,-center.z));scene.add(arena);arena.updateMatrixWorld(true);matteMall(arena);arena.traverse(o=>{if(o.isMesh){if(solidForGameplay(o))ground.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.roughness=Math.max(.7,m.roughness||0);if(m.map)m.map.anisotropy=2;}}});bounds=new THREE.Box3().setFromObject(arena);buildGround();menuNavigation={ground,bounds,grid};await ensureCostume();progress(90,'Warming up characters and fonts…');previewModel();await document.fonts.ready;await renderer.compileAsync(scene,menuCamera);progress(100,'All set. Let’s play.');ready=true;document.body.dataset.assets='ready';show('menu');endLoading();openPage('home');}catch(e){document.body.dataset.assets='error';loadError(e,()=>location.reload());}}
let previewLayout=null,previewLayoutTarget=null,previewLayoutKey='',previewLayoutNext=0;
function frameMenuCharacter(p,dt,now){
 const key=activePage+':'+innerWidth+':'+innerHeight;
 if(now>=previewLayoutNext||key!==previewLayoutKey){
  const panel=$(activePage==='home'?'#home':'#page').getBoundingClientRect();
  const right=activePage==='home'?$('#home-widgets').getBoundingClientRect().left:innerWidth;
  previewLayoutTarget=menuPreviewFrame({width:innerWidth,height:innerHeight,left:panel.right,right,mode:activePage});
  previewLayoutKey=key;previewLayoutNext=now+200;
 }
 if(!previewLayout)previewLayout={...previewLayoutTarget};
 const blend=1-Math.exp(-10*dt);for(const key of ['x','y','distance','focus'])previewLayout[key]+=(previewLayoutTarget[key]-previewLayout[key])*blend;
 const shot=previewLayout;menuCamera.position.set(p.x,p.y+shot.focus+shot.distance*.08,p.z+shot.distance);menuCamera.lookAt(p.x,p.y+shot.focus,p.z);
 menuCamera.setViewOffset(innerWidth,innerHeight,innerWidth*.5-shot.x,innerHeight*.5-shot.y,innerWidth,innerHeight);
}
function frame(now=performance.now()){requestAnimationFrame(frame);const elapsed=Math.max(0,(now-lastFrame)/1000),dt=Math.min(elapsed,.05);lastFrame=now;updateController(now,dt);uiEffects.tick(dt);waterAnimation?.update(dt);tickStageVerdict(elapsed);haptics.update(round?.actors[0]?.effect,Math.min(elapsed,.1),!!round&&round.phase==='playing'&&!paused&&!busy&&!document.hidden&&round.actors[0].effectTime>0);if(resultPortrait&&!ui.results.hidden)resultPortrait.update(dt);
 if(ready){if(room&&!online&&!ui.lobby.hidden&&!busy&&!document.hidden){if(stepLobby(room,elapsed))start();else if(room.phase==='countdown'){if(room.mode==='couch'){const cancel=$('[data-cancel]');if(cancel)cancel.textContent='CANCEL · '+Math.ceil(room.countdown);}else $('#lobby-counter').textContent=Math.ceil(room.countdown);}}if(round){if(online&&!busy){updateOnlineMatch(Math.min(elapsed,.1));}else if(round.phase==='playing'&&!paused&&!busy&&!phoneLandscape.blocked){const steps=simulationSteps(elapsed);for(let i=0;i<steps.count&&round.phase==='playing';i++){updateGame(steps.dt);gameFX.update(steps.dt,matchCamera,{map:mapData?.id,bounds});}updateHud();}cameraShake=Math.max(0,cameraShake-elapsed*.7);shakeTime+=elapsed;positionMatchCamera();}
 else if(preview){const homePreview=['home','tools','costume'].includes(activePage);preview.group.scale.setScalar(homePreview?1.5:1);preview.group.rotation.y=homePreview?-Math.PI/6:0;preview.anim.update(dt);if(previewTime>0){previewTime-=dt;if(previewTime<=0)preview.anim.play('idle');}const p=preview.group.position;if(homePreview)frameMenuCharacter(p,dt,now);else{menuCamera.clearViewOffset();menuCamera.position.set(p.x,p.y+1.45,p.z+4.6);menuCamera.lookAt(p.x,p.y+.8,p.z);previewLayout=null;}}}

 moneyTrail.update(round,position=>{matchRoot.updateMatrixWorld();const cache=round?.caches.find(c=>c.position===position),anchor=cacheAnchors.get(cache?.id)||new THREE.Vector3(...position);const p=matchRoot.localToWorld(anchor.clone()).project(matchCamera);return p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1?{x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight}:null;},elapsed,!!round&&!ui.hud.hidden&&!paused&&!busy&&!document.hidden&&!phoneLandscape.blocked);
 const audioActive=!!round&&round.phase==='playing'&&!(round.startRemaining>0)&&!paused&&!busy&&!document.hidden&&!phoneLandscape.blocked;gameAudio.update(round,avatars,audioActive,!document.hidden&&!phoneLandscape.blocked&&!paused&&(!ui.menu.hidden||!ui.lobby.hidden||audioActive),mapData?.id,room?.mode==='couch'?room.players.flatMap((p,id)=>p&&!p.bot&&((id===0&&interactHeld)||couchInputs.get(id)?.interact)?[id]:[]):interactHeld,room?.mode==='couch');roundStart.update(round,elapsed);
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').textContent='';}updateMarkers();fpsCounter.hidden=!settings.showFps||ui.hud.hidden||busy;
 renderElapsed+=elapsed;
 if(renderGate(now,settings.fpsCap)){if(!ui.lobby.hidden&&!busy)renderLobbyCharacters(Math.min(renderElapsed,.1));else renderer.render(scene,round?matchCamera:menuCamera);fpsFrames++;renderElapsed=0;}
 if(now-fpsSince>=1000){fpsCounter.textContent=Math.round(fpsFrames*1000/(now-fpsSince))+' FPS';fpsSince=now;fpsFrames=0;}
}
const phoneLandscape=configureLandscape({onChange:()=>{clearInput();resize();}});
frame();boot();
