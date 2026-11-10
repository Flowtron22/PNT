import {createSplashRound,createSplashArenaData,stepSplash,splashAction,splashFire,splashBotInput,SPLASH_SPAWNS,splashCoverage,SPLASH_COLORS,SPLASH_INK_CAPACITY} from './splash-rules.js';
import {createSplashView} from './splash-view.js';
import {applyIceBlockCollision} from './collision.js';
import {createTitleScreen} from './title-screen.js';
import {applyDiretideGroundAO} from './diretide-lighting.js';
import {candyMarkerMarkup,updateWellHealth} from './diretide-ui.js';
import {createDiretideRound,stepDiretide,collectEventCandy,eventTarget,eventInteract,eventBotGoal,spillOnStun,PLAYER_COLORS,EVENT_HAMMER_RADIUS,EVENT_BANANA_SECONDS,EVENT_STUN_SECONDS} from './diretide-rules.js';
import {createDiretideView} from './diretide-view.js';
import {createTiletideRound,stepTiletide,tileBotGoal,tileStageContains,TILE_SPAWNS,TILE_STUN_SECONDS,TILE_BANANA_SECONDS} from './tiletide-rules.js';
import {createTiletideView,createTiletideCallout} from './tiletide-view.js';
import {createStrikersRound,stepStrikers,strikerShoot,strikerBotGoal,strikerBotWantsShot,updateStrikerPossession,resetStrikerPlayers,strikerKickoffAngle,GOAL_RESET_SECONDS,STRIKER_HAMMER_STUN_SECONDS,STRIKER_TEAMS,STRIKER_SPAWNS} from './strikers-rules.js';
import {createStrikersView} from './strikers-view.js';
import {createBalloonRound,stepBalloon,resolveBalloonHammer,balloonBotGoal,createBalloonArenaData,slideBalloonSpheres,BALLOON_SPAWNS,BALLOON_ARENA_RADIUS,BALLOON_BANANA_SECONDS,BALLOON_SPHERE_RADIUS} from './balloon-rules.js';
import {createBalloonView} from './balloon-view.js';
import {updateBalloonLaunch,BALLOON_LAUNCH_SECONDS} from './balloon-launch.js';
import {menuPreviewFrame} from './viewport.js';
import {COLOR_COSTUMES,outfitColors,SKIN_COLORS,loadCostumeAppearances,saveCostumeAppearances,applyCostumeAppearance} from './costume-appearance.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createRound,stepRound,detectThiefAt,activateTool,canAct as canActRule,harvest,rescue,cancelInteraction,INTERACT_RADIUS,RESCUE_SECONDS,updateSmokeCoverage,startCountdown} from './rules.js';
import {applyOyenAppearance,loadOyenAppearance,saveOyenAppearance,OYEN_COATS,OYEN_SKINS} from './oyen-appearance.js';
import {normalizeLoadout,equipTool,normalizeCostume,modeLoadout} from './loadout.js';
import {makeAnimator,animationFor,ANIMATION_PLAY_RATE} from './animation.js';
import {COSTUMES,TOOLS} from './catalog.js';
import {lobbyMaps,createLobby,addBot,removeBot,beginCountdown,cancelCountdown,stepLobby,cycleMap,resolveRole,PREFERENCES,BOTS} from './lobby-state.js';
import {renderLobby} from './lobby-ui.js';
import {createCouchLobby,joinCouch,syncCouchConnections,canStartCouch,couchHostLobbyAction,prepareCouchMatch,couchCommand,couchHuman,couchInputFor} from './couch-state.js';
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
import {loadSettings,saveSettings,DEFAULT_SETTINGS,createRenderGate,renderPixelRatio} from './settings.js';
import {mountSettings} from './settings-ui.js';
import {createController,createControllerPool,controllerMenu} from './controller.js';
import {createVirtualKeyboard} from './virtual-keyboard.js';
import {bindGameControls} from './touch-controls.js';
import {configureFullscreen} from './fullscreen.js';
import {configureLandscape} from './landscape.js';
import {sampleGround,simulationSteps} from './motion.js';
import {landingMask} from './landing.js';
import {createSunkenLook} from './sunken-look.js';
import {setArenaSurface,bakedArena} from './arena-appearance.js';
import {matchView,fixedStageCenter,stageFraming,shakeOffset} from './camera-rig.js';
import {DEFAULT_BINDINGS,BINDING_LABELS,keyLabel,rebind,loadBindings,saveBindings,movementInput,mouseCode} from './keybindings.js';
import {createHaptics} from './haptics.js';
import {creditsMarkup} from './credits-ui.js';
import {hasSight} from './sight.js';
import {createResultPortrait} from './result-portrait.js';
import {createGameFX,smokeBombCloud,animateSmokeBomb,disposeSmokeBomb,attachHazardTelegraph,animateHazardTelegraph,animateBananaHazard} from './game-fx.js';
import {stageEndState,rollSpinDirection} from './action-state.js';
import {renderResults} from './results-ui.js';
import {createDetectionZone,hasDetectedThief} from './detection-zone.js';
import {policeBadgeMarkup,updatePoliceBadge} from './police-badge.js';
import {shipTilt} from './environment.js';
import {createMallPhysics} from './mall-physics.js';
import {MultiplayerConnection} from './multiplayer.js';
import {advanceActor,movementSpeed} from './player-motion.js';
import {prepareSunkenWater} from './water-animation.js';
import {presentOnlineEvent,syncOnlineHazards} from './online-presentation.js';
import {LocalPrediction,SnapshotBuffer,interpolatePose,applyPose} from './netcode.js';
let onlineFrames=new SnapshotBuffer();
const immediateOnlineTools=new Set();
let online=null,onlineLoading=false,onlineRoster='',onlineEventId=0,onlineSnapshot=null,onlineRevision=0,remoteFurniture=[];
import {findPath,screenToWorld} from './navigation.js';
import {buildWalkGrid,arenaBounds,solidForGameplay} from './world-navigation.js';
let resultPortrait=null,bindings=loadBindings(localStorage),bindingCapture=null,cameraShake=0,shakeTime=0,stageFrame=null;
let settings=loadSettings(localStorage,matchMedia('(prefers-reduced-motion: reduce)').matches),settingsPage=null;
const renderGate=createRenderGate();let fpsSince=performance.now(),fpsFrames=0,renderElapsed=0;
const fpsCounter=document.createElement('div');fpsCounter.id='fps-counter';fpsCounter.hidden=true;document.body.append(fpsCounter);
const couchControllers=createControllerPool(navigator),couchInputs=new Map();let couchRosterSignature='';
const controller=createController(navigator),interactionSources=new Set();let padMovement={x:0,z:0},controllerActive=false;
const virtualKeyboard=createVirtualKeyboard(document);
const desktop=globalThis.pntDesktop;
const haptics=createHaptics(desktop?null:navigator,{enabled:localStorage.getItem('pnt-haptics')!=='off'});
let touchControls,interactHeld=false,menuArena=null,gameArena=null,mapData=null,menuNavigation=null;
let profile=readProfile(localStorage);
const $=s=>document.querySelector(s),canvas=$('#world');
const ui={menu:$('#menu'),hud:$('#hud'),pause:$('#pause'),results:$('#results'),lobby:$('#lobby')};
const leaveLobbyDialog=$('#leave-lobby-dialog');
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
const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x77768c,roughness:.7,metalness:0}));floor.rotation.x=-Math.PI/2;floor.position.y=-.3;scene.add(floor);
const up=new THREE.Vector3(0,1,0),down=new THREE.Vector3(0,-1,0);
const loader=new GLTFLoader(),cache=new Map();
const gameFX=createGameFX(matchRoot);
const tileCallout=createTiletideCallout($('#tile-call'));

let ready=false,role='runner',quality=settings.quality;
let oyenAppearance=loadOyenAppearance(localStorage),costumeAppearances=loadCostumeAppearances(localStorage);
let costume=normalizeCostume(localStorage.getItem('pnt-costume'));
let loadout=normalizeLoadout(localStorage.getItem('pnt-loadout'),localStorage.getItem('pnt-tool')),selectedTool=loadout[0];
let round=null,avatars=[],preview=null,previewClip='idle',previewTime=0,templates={},clips={},ground=[],bounds=null,grid=null;
let paused=false,activePage='home',toastTime=0,lastFrame=performance.now(),busy=false,waterAnimation=null,sunkenLook=null;
let sunkenStylized=localStorage.getItem('pnt-sunken-look')!=='original';
const keys=new Set(),input={x:0,z:0},cameraTarget=new THREE.Vector3(),hazards=[];
let selectedMode='classic',eventView=null,eventSmashes=0,eventStage='sleeping';
let room=null,returnToLobby=false,lobbyDisplays=[],cacheAnchors=new Map();
const lobbyCamera=new THREE.PerspectiveCamera(34,1,.05,30);lobbyCamera.position.set(0,1.3,3.2);lobbyCamera.lookAt(0,.8,0);
let reduced=settings.reducedMotion;
const titleScreen=createTitleScreen($('#title-screen'),{onEnter:()=>{clearInput();void gameAudio.prepare();show('menu');openPage('home');void joinSteamInvite();}});
const uiEffects=createWonderUI({blocked:()=>titleScreen.active||busy||!$('#loading').hidden||!ui.hud.hidden,reduced:()=>reduced});
const gameAudio=createGameplayAudio(()=>uiEffects.sounds.engine);
void gameAudio.preload();
const roundStart=createRoundStart(ui.hud,beat=>gameAudio.narrateBeat(beat));
const moneyTrail=createMoneyTrail(ui.hud,$('#money-status'),{reduced:()=>reduced});
document.addEventListener('pointerdown',()=>void gameAudio.prepare(),{capture:true});
document.addEventListener('keydown',()=>void gameAudio.prepare(),{capture:true,once:true});
document.body.classList.toggle('reduced-motion',reduced);
function resize(){
 const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight),aspect=width/height;
 menuCamera.aspect=aspect;menuCamera.updateProjectionMatrix();matchCamera.aspect=aspect;matchCamera.updateProjectionMatrix();
 renderer.setDrawingBufferSize(width,height,renderPixelRatio(width,height,devicePixelRatio,quality,settings.renderResolution,!!desktop));
}
function applySettings(initial=false){
 const qualityChanged=quality!==settings.quality;quality=settings.quality;reduced=settings.reducedMotion;document.body.classList.toggle('reduced-motion',reduced);
 document.documentElement.style.setProperty('--joystick-size',settings.joystickSize);document.documentElement.style.setProperty('--hud-scale',settings.hudScale);
 haptics.setEnabled(settings.haptics);if(!settings.haptics)haptics.stop();
 uiEffects.sounds.engine.setVolumes({master:.8*settings.master});uiEffects.sounds.setEnabled(settings.uiSounds);
 gameAudio.setLevels({sfx:settings.sfx,music:settings.music});gameAudio.setEnabled(settings.sfx>0);gameAudio.setMusic(settings.music>0);
 if(initial||qualityChanged){resize();sunkenLook?.setQuality(quality);}
}
function changeSetting(key,value){settings={...settings,[key]:value};const saved=saveSettings(localStorage,settings);applySettings();if(key==='renderResolution')resize();return saved;}
addEventListener('resize',resize);applySettings(true);
function show(name){if(name!=='lobby')leaveLobbyDialog.close();document.body.classList.toggle('diretide-mode',['diretide','tiletide','strikers','balloon','splash'].includes(round?.mode)||['diretide','tiletide','strikers','balloon','splash'].includes(room?.gameMode)||['diretide','tiletide','strikers','balloon','splash'].includes(selectedMode)&&name==='menu'&&activePage!=='home');document.body.classList.toggle('couch-mode',room?.mode==='couch');$('#couch-hud').hidden=room?.mode!=='couch';ui.lobby.classList.toggle('couch-lobby',room?.mode==='couch');if(name==='menu'){scene.fog.near=38;scene.fog.far=85;}for(const [key,node]of Object.entries(ui))node.hidden=key!==name;document.body.classList.toggle('playing',name==='hud'||name==='pause'||name==='results');document.body.classList.toggle('lobby-view',name==='lobby');document.body.classList.toggle('menu-view',name==='menu');$('#lobby-backdrop').hidden=!['menu','lobby'].includes(name);scene.background=name==='menu'?null:new THREE.Color('#70688f');floor.visible=name!=='menu';if(menuArena)menuArena.visible=false;}
function say(text,seconds=2){$('#toast').textContent=text;toastTime=seconds;}
function clearInput(){couchControllers.reset();couchInputs.clear();online?.input(0,0,false,performance.now(),true);haptics.stop();controller.reset();padMovement={x:0,z:0};interactionSources.clear();interactHeld=false;keys.clear();input.x=input.z=0;touchControls?.reset();}
function pauseGame(){if(!round||round.phase!=='playing'||paused||busy)return;paused=true;clearInput();show('pause');$('#sunken-look').hidden=!sunkenLook||mapData?.id!=='sunken';$('#sunken-look').textContent='SUNKEN LOOK · '+(sunkenStylized?'STYLIZED':'ORIGINAL');$('#pause p').textContent=online?'The online match continues while this menu is open.':'The clock is paused.';}
function resume(){if(room?.mode==='couch'&&room.players.some(p=>p&&!p.bot&&!p.connected)){$('#pause p').textContent='Reconnect the missing controller before resuming.';return;}clearInput();paused=false;show('hud');lastFrame=performance.now();}
function progress(value,text){$('#load-progress').style.width=`${Math.round(value)}%`;$('#load-percent').textContent=`${Math.round(value)}%`;$('#load-status').textContent=text;}
function beginLoading(title){leaveLobbyDialog.close();busy=true;clearInput();$('#loading').hidden=false;$('#loading').setAttribute('aria-busy','true');$('#loading-title').textContent=title;$('#retry').hidden=true;$('#error').hidden=true;progress(0,'Preparing assets…');}
function endLoading(){busy=false;$('#loading').hidden=true;$('#loading').setAttribute('aria-busy','false');lastFrame=performance.now();}
function loadError(error,retry){console.error(error);$('#loading-title').textContent='LET’S TRY THAT AGAIN';$('#load-status').textContent=error.message;$('#retry').hidden=false;$('#retry').onclick=retry;busy=false;}
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
async function getGLB(key,url,onProgress){if(cache.has(key))return cache.get(key);const pending=loader.loadAsync(url,onProgress);cache.set(key,pending);try{const value=await pending;if(key==='police')value.scene.traverse(mesh=>{if(mesh.isMesh)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material?.name==='M_ch_eye'){material.roughness=1;material.metalness=0;}});return value;}catch(e){cache.delete(key);throw e;}}
async function ensureCostume(){const c=COSTUMES.find(c=>c.id===costume);if(templates[c.id]||!c.file)return;templates[c.id]=await getGLB(c.id,`assets/pnt/costumes/${c.file}.glb`,e=>progress(e.total?Math.min(85,e.loaded/e.total*85):30,`Loading ${c.name}…`));}
function destroy(a){if(!a)return;a.detectionZone?.dispose();a.group.removeFromParent();a.anim.dispose();sunkenLook?.unregister(a.model);a.captureTint?.dispose();a.appearance?.dispose();const skeletons=new Set();a.model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const skeleton of skeletons)skeleton.dispose();a.seatMarker?.material.map.dispose();for(const mesh of [a.ring,a.shadow,a.seatMarker].filter(Boolean)){mesh.geometry.dispose();mesh.material.dispose();}}
function clearHazards(){gameFX.clear();for(const h of hazards)disposeHazard(h);hazards.length=0;}
function menu(){selectedMode='classic';online?.leave();online=null;onlineLoading=false;onlineRevision++;onlineRoster='';onlineSnapshot=null;clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;restoreMenuArena();room=null;returnToLobby=false;clearLobbyDisplays();round=null;paused=false;clearInput();clearHazards();for(const a of avatars)destroy(a);avatars=[];previewModel();show('menu');openPage('home');}
function previewModel(){destroy(preview);preview=avatar(templates[costume],0,role);preview.group.position.copy(spot(0,0));preview.group.rotation.y=0;previewClip='idle';previewTime=0;preview.anim.play('idle');labels();}
function labels(){refreshControlHints();
 const splash=(round?.mode||room?.gameMode)==='splash';document.body.classList.toggle('splash-mode',splash);if(splash){for(let i=1;i<=2;i++){$('#tool-action-icon'+i).src='assets/pnt/maps/'+(i===1?'splash-refill':'splash-can')+'.svg';$('#tool-action'+i).setAttribute('aria-label',i===1?'Toggle submerge and refill':'Throw paint can');}return;}
 renderHomeWidgets(profile,loadout,costume);
 modeLoadout(round?.mode||room?.gameMode,loadout).forEach((id,slot)=>{const tool=TOOLS.find(t=>t.id===id);$('#tool-action-label'+(slot+1)).textContent=tool.key;$('#tool-action-icon'+(slot+1)).src='assets/pnt/'+tool.icon+'.png';$('#tool-action'+(slot+1)).setAttribute('aria-label','Use slot '+(slot+1)+': '+tool.name);});
}
function demo(name){const loop=['idle','thiefRun','policeRun','jet','bustedIdle','dance'].includes(name);previewClip=name;previewTime=loop?0:(clips[name]?.duration||1)/ANIMATION_PLAY_RATE;preview?.anim.play(name,{loop,restart:true});}
function goBack(){
 if(room?.mode==='couch'&&!ui.lobby.hidden){if(room.phase==='countdown'){cancelCountdown(room);refreshLobby();}else quitLobby();return;}
 if(busy)return;uiEffects.sounds.play('ui_back');
 if(room&&!ui.lobby.hidden){
  if(leaveLobbyDialog.open){leaveLobbyDialog.close();return;}
  const help=$('#room-help');if(help&&!help.hidden){help.hidden=true;return;}
  if(online&&room.phase==='countdown'&&room.canHost){online.control('cancel');return;}
  if(!online&&cancelCountdown(room)){refreshLobby();return;}
  requestLobbyLeave();return;
 }
 if(returnToLobby&&room){returnToLobby=false;if(online){const next=onlineProfile();Object.assign(room.players[0],next);online.send('profile',next);}else room.players[0].costume=costume;buildLobbyDisplays();show('lobby');refreshLobby();return;}
 openPage(activePage==='join'?'online':activePage==='online'?'play':activePage==='play'&&['diretide','tiletide','strikers','balloon','splash'].includes(selectedMode)?'events':'home');
}
function clearLobbyDisplays(){for(const display of lobbyDisplays){destroy(display.actor);display.base.geometry.dispose();display.base.material.dispose();}lobbyDisplays=[];}
function buildLobbyDisplays(){
 clearLobbyDisplays();const seats=room.seats||room.players,colors=[0x005bff,0xff9a00,0x00c54b,0xff36a9];
 for(let i=0;i<4;i++){
  const stage=new THREE.Scene();stage.add(new THREE.HemisphereLight(0xf4f8ff,0x7280a0,2.8));const light=new THREE.DirectionalLight(0xffffff,3.2);light.position.set(-2,4,4);stage.add(light);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.82,.85,.14,40),new THREE.MeshStandardMaterial({color:seats[i]?colors[i]:0xadb8ca,roughness:.5}));stage.add(base);
  const player=seats[i];let actor=null;
  if(player&&templates[player.costume]){actor=avatar(templates[player.costume],i,'runner',online?player:null);actor.group.position.set(0,.08,0);actor.group.rotation.y=0;actor.ring.visible=false;actor.anim.update(i*.6);stage.add(actor.group);}
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
 if(controllerActive)controllerMenu(document,'restore');
}
async function hostCouchLobby(){
 if(!ready||busy)return;beginLoading('GATHERING THE COUCH CREW');await nextFrame();
 try{let loaded=0;await Promise.all(COSTUMES.map(async c=>{if(!templates[c.id]&&c.file)templates[c.id]=await getGLB(c.id,`assets/pnt/costumes/${c.file}.glb`);progress(++loaded/COSTUMES.length*85,'Preparing costumes for the crew…');}));room=createCouchLobby(costume,loadout,profile.name,!controllerActive);room.gameMode=selectedMode;couchRosterSignature='';returnToLobby=false;show('lobby');refreshLobby();for(const display of lobbyDisplays)await renderer.compileAsync(display.scene,lobbyCamera);endLoading();}catch(error){room=null;loadError(error,hostCouchLobby);}
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
  if(!ui.lobby.hidden){const hostAction=couchHostLobbyAction(room,id,pad.pressed.has(9)?'start':pad.direction);if(hostAction?.map){cycleMap(room,hostAction.map);refreshLobby();}else if(pad.direction)couchLobbyCommand(id,pad.direction);if(room?.mode!=='couch')return;if(pad.pressed.has(1)){couchLobbyCommand(id,'back');if(room?.mode!=='couch')return;}if(!room.players[id]||room.players[id].bot)continue;if(pad.pressed.has(0))couchLobbyCommand(id,'accept');if(pad.pressed.has(2))couchLobbyCommand(id,'ready');if(id===0){if(pad.pressed.has(4)||pad.pressed.has(5)){cycleMap(room,pad.pressed.has(5)?1:-1);refreshLobby();}if(hostAction?.start)startCouchCountdown();}continue;}
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
  room=createLobby(costume,selectedMode);room.players[0].name=profile.name;returnToLobby=false;buildLobbyDisplays();refreshLobby();progress(90,'Warming up the lobby…');for(const display of lobbyDisplays)await renderer.compileAsync(display.scene,lobbyCamera);show('lobby');endLoading();
 }catch(error){room=null;loadError(error,hostLobby);}
}
function requestLobbyLeave(){
 if(!online){quitLobby();return;}
 if(busy||leaveLobbyDialog.open)return;
 leaveLobbyDialog.showModal();
 if(controllerActive)controllerMenu(document,'focus',$('#stay-in-lobby'));
}
function quitLobby(){const training=room?.mode==='practice',event=['diretide','tiletide','strikers','balloon','splash'].includes(room?.gameMode);online?.leave();online=null;onlineLoading=false;onlineRevision++;onlineRoster='';onlineSnapshot=null;room=null;returnToLobby=false;clearLobbyDisplays();show('menu');if(!preview)previewModel();openPage(event?'events':training?'home':'play');}
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
function onlineProfile(){return {gameMode:selectedMode,name:profile.name,costume,appearance:costume==='oyen'?oyenAppearance:costumeAppearances[costume],loadout,preference:room?.preference||'none'};}
async function ensureRoster(){await Promise.all(room.players.filter(Boolean).map(async p=>{const outfit=COSTUMES.find(c=>c.id===p.costume);if(!templates[p.costume])templates[p.costume]=await getGLB(p.costume,`assets/pnt/costumes/${outfit.file}.glb`);}));}
function onlineNotice(message){const status=$('#join-status')||$('#play-status');if(status)status.textContent=message;if(round)say(message,4);else if(!ui.lobby.hidden){const help=$('#room-help');help.querySelector('h2').textContent='Room update';help.querySelector('p').textContent=message;help.hidden=false;}}
async function joinSteamInvite(){
 if(!desktop?.steam||!ready||busy||titleScreen.active||online||round)return;
 const code=await desktop.steam.takeInvite();
 if(code&&!busy&&!online&&!round){openPage('join');void connectOnline('join',code);}
}
desktop?.steam.onInvite(()=>void joinSteamInvite());
async function connectOnline(mode,code){
 if(!ready||busy)return;if(!globalThis.pntDesktop?.steam){onlineNotice('Online play requires the Steam desktop build. Choose Training to play with bots.');return;}
 beginLoading('CONNECTING TO THE CREW');online=new MultiplayerConnection({onLobby:receiveOnlineLobby,onSnapshot:receiveOnlineSnapshot,onTool:receiveOnlineTool,onNotice:onlineNotice,onProgress:progress,onConnection:status=>{if(status==='reconnecting'){clearInput();if(round)say('RECONNECTING…',4);else{const line=$('#lobby-status-line');if(line)line.textContent='RECONNECTING…';}}else if(status==='connected'){if(avatars[0])avatars[0].prediction=null;onlineFrames=new SnapshotBuffer();const help=$('#room-help');if(help)help.hidden=true;if(round)say('RECONNECTED',1.5);}else{const code=room?.code,gameMode=room?.gameMode||selectedMode;endLoading();menu();selectedMode=gameMode;openPage('join');if(code)$('#join-code').value=code;onlineNotice(status==='expired'?'Your seat expired while the game was away. Join again if the room is still waiting, or host a new lobby.':'The connection ended. Join the room again to continue.');}}});
 try{await online.connect(mode,onlineProfile(),code);}catch(error){online?.leave();online=null;endLoading();onlineNotice(error.message||'Could not connect to the game server.');}
}
function refreshOnlineLobby(){
 if(!room)return;renderLobby(ui.lobby,room,loadout,costume,{quit:requestLobbyLeave,invite:desktop?.steam?()=>online.invite():null,visibility:value=>online.control('visibility',value),addBot:()=>online.control('add-bot'),removeBot:()=>online.control('remove-bot'),map:direction=>online.control('map',direction),preference:()=>online.send('profile',{...onlineProfile(),preference:PREFERENCES[(PREFERENCES.indexOf(room.preference)+1)%PREFERENCES.length]}),start:()=>online.control('start'),cancel:()=>online.control('cancel'),edit:page=>{if(room.phase!=='waiting')return;returnToLobby=true;previewModel();show('menu');openPage(page);}});if(controllerActive)controllerMenu(document,'restore');
}
async function receiveOnlineLobby(data){
 if(!online)return;room=data;selectedMode=data.gameMode||'classic';
 if(data.phase==='loading'){if(data.match&&!onlineLoading&&!round)void beginOnlineMatch(data.match);else if(!busy&&!round)beginLoading('PREPARING THE ONLINE MATCH');return;}
 if(['playing','finished'].includes(data.phase)){if(round&&!onlineLoading&&busy){endLoading();show('hud');}if(data.phase==='finished')refreshOnlineRematch();return;}
 if(data.phase==='waiting'&&(round||onlineLoading)){onlineRevision++;onlineLoading=false;clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;clearHazards();for(const a of avatars)destroy(a);avatars=[];round=null;restoreMenuArena();}
 const revision=onlineRevision,signature=JSON.stringify(data.seats.map(p=>[p.sessionId,p.costume,p.bot,p.appearance]));
 try{await ensureRoster();if(!online||room!==data||revision!==onlineRevision||!['waiting','countdown'].includes(room.phase))return;if(signature!==onlineRoster){buildLobbyDisplays();onlineRoster=signature;}refreshOnlineLobby();if(!returnToLobby){show('lobby');endLoading();}}
 catch(error){onlineNotice(error.message);endLoading();}
}
async function beginOnlineMatch(snapshot){
 if(onlineLoading||!online)return;const revision=++onlineRevision,current=()=>!!online&&revision===onlineRevision;onlineLoading=true;beginLoading('LOADING THE SHARED MATCH');returnToLobby=false;clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;clearLobbyDisplays();
 try{await ensureRoster();if(!current())return;await loadArena(snapshot.map,current);if(!current())return;destroy(preview);preview=null;round={...snapshot.round};role=round.playerRole;paused=false;clearInput();clearHazards();onlineEventId=0;immediateOnlineTools.clear();onlineRoster='';populate();for(let i=0;i<avatars.length;i++)avatars[i].tools=modeLoadout(round.mode,room.players[i].loadout);buildMarkers();stageFrame=round.mode==='strikers'?{x:9,z:12}:round.mode==='splash'?{x:14.6,z:14.6}:round.mode==='balloon'?{x:BALLOON_ARENA_RADIUS,z:BALLOON_ARENA_RADIUS}:stageFraming(mapData.spawns,mapData.caches);const center=['tiletide','strikers','balloon','splash'].includes(round.mode)?{x:0,z:0}:fixedStageCenter(mapData.spawns,mapData.caches),anchor=spot(center.x,center.z);cameraTarget.set(center.x,anchor.y,center.z);cameraShake=0;positionMatchCamera();
  onlineFrames=new SnapshotBuffer();receiveOnlineSnapshot(snapshot,true);await renderer.compileAsync(scene,matchCamera);if(!current())return;renderer.render(scene,matchCamera);$('#role-label').textContent=round.mode==='splash'?'SPLISH SPLASH':round.mode==='diretide'?'PATTY PROWL · P'+(1+(round.actors[0].seat??0)):round.mode==='tiletide'?'TILE TUMBLE · P'+(1+(round.actors[0].seat??0)):round.mode==='strikers'?'SLIPPERY SHOOTS · TEAM '+(round.actors[0].team===0?'BLUE':'RED'):round.mode==='balloon'?'BALLOON BASH · P'+(1+(round.actors[0].seat??0)):room?.mode==='couch'?'COUCH PLAY':role==='runner'?'THIEF':'POLICE';$('#role-label').classList.toggle('chaser',role==='chaser');labels();onlineLoading=false;online.send('ready');if(['playing','finished'].includes(room.phase)){endLoading();show('hud');}else progress(100,'Waiting for everyone to finish loading…');if(onlineSnapshot?.tick>snapshot.tick)receiveOnlineSnapshot(onlineSnapshot,true);
 }catch(error){if(!current())return;onlineLoading=false;online.send('load-error');loadError(error,()=>beginOnlineMatch(snapshot));}
}
function playOnlineEvent(event){
 if(event.type==='balloon-pop'&&event.target===0)say(event.remaining?'ONE BALLOON LEFT!':'BOTH BALLOONS POPPED!',1);
 if(event.type==='balloon-block'&&event.actor===0)say('SPHERE BLOCK!',1);
 if(event.type==='tool'){
  if(event.tool==='rewind-mark'){
   gameAudio.play('Tool_Rewind_Box_Deploy',event.actor===0?1:.5);
   if(event.actor===0)say('MARK SET · PRESS AGAIN TO RETURN',1.5);
  }else gameAudio.tool(event.tool,event.actor,avatars);
 }
 presentOnlineEvent(event,{actors:avatars,root:matchRoot,hazards,prop,fx:gameFX,audio:gameAudio});
}
function receiveOnlineTool(event,profileId){
 if(round?.profileId!==profileId||event.id<=onlineEventId||immediateOnlineTools.has(event.id))return;
 immediateOnlineTools.add(event.id);
 if(immediateOnlineTools.size>64)immediateOnlineTools.delete(immediateOnlineTools.values().next().value);
 playOnlineEvent(event);
}
function receiveOnlineSnapshot(snapshot,initial=false){
 onlineSnapshot=snapshot;if(!online)return;if(!round){if(!onlineLoading)void beginOnlineMatch(snapshot);return;}if(round.profileId!==snapshot.round.profileId)return;
 const wasCaught=round.actors.map(actor=>actor.caught),presentation={endStarted:round.endStarted,endElapsed:round.endElapsed,resultsShown:round.resultsShown,profileRecorded:round.profileRecorded,fallOutro:round.fallOutro};round={...snapshot.round,...presentation};role=round.playerRole;
 if(!initial)syncCacheCelebrations();
 if(!initial)for(let i=0;i<round.actors.length;i++)if(wasCaught[i]&&!round.actors[i].caught&&avatars[i])gameFX.rescue(avatars[i].group.position);
 onlineFrames.push(snapshot);
 for(const pose of snapshot.poses){const actor=avatars[pose.id];if(!actor)continue;
  if(pose.id===0&&snapshot.inputFrames){if(initial||!actor.prediction)actor.prediction=new LocalPrediction(actor,pose,round.actors[0],(snapshot.worldTime??snapshot.time),{grid,map:mapData.id});else actor.prediction.reconcile(pose,round.actors[0],(snapshot.worldTime??snapshot.time));}
  else if(initial)applyPose(actor,pose);
  // Compatibility with a server that has not yet received the input-frame update.
  if(pose.id===0&&!snapshot.inputFrames){actor.netTarget=new THREE.Vector3(...pose.position);if(!initial)actor.group.position.lerp(actor.netTarget,.65);actor.vx=pose.vx;actor.vz=pose.vz;actor.slideX=pose.slideX;actor.velocity=pose.velocity;actor.grounded=pose.grounded;actor.speed=pose.speed;}
 }
 for(const event of snapshot.events)if(event.id>onlineEventId){if(!immediateOnlineTools.delete(event.id)&&!initial)playOnlineEvent(event);onlineEventId=event.id;}
 syncOnlineHazards(snapshot.hazards,{root:matchRoot,hazards,prop,dispose:disposeHazard,actors:avatars});
 for(const item of snapshot.furniture){const f=remoteFurniture.find(f=>f.mesh.name===item.name);if(f){f.target=new THREE.Vector3(...item.position);f.rotation=new THREE.Quaternion(...item.rotation);if(initial){f.mesh.position.copy(f.target);f.mesh.quaternion.copy(f.rotation);}}}
 if(round.phase==='finished'&&!round.endStarted&&!ui.pause.hidden)show('hud');
}
function updateOnlineMatch(dt){
 if(!onlineSnapshot||!round||round.endStarted)return;const keyboard=movementInput(keys,bindings),active=!paused&&!document.hidden&&!phoneLandscape.blocked&&!(round.startRemaining>0||round.resetClock>0)&&round.phase==='playing',direction=active?screenToWorld(input.x+keyboard.x+padMovement.x,-input.z+keyboard.z+padMovement.z):{x:0,z:0};const inputLength=Math.hypot(direction.x,direction.z);if(inputLength>1){direction.x/=inputLength;direction.z/=inputLength;}
 const me=avatars[0],command={x:direction.x,z:direction.z,interact:active&&interactHeld};
 if(me?.prediction){if(round.phase==='playing'&&!(round.startRemaining>0||round.resetClock>0)){me.prediction.advance(dt,command);online.flushPrediction(me.prediction);}const visual=me.prediction.render();me.group.position.copy(visual.position);me.group.rotation.y=visual.angle;for(const key of ['speed','grounded','velocity','vx','vz','slideX'])me[key]=me.prediction.actor[key];}
 else online.input(command.x,command.z,command.interact);
 shipAngle=mapData.id==='sunken'?shipTilt(300-round.remaining):0;matchRoot.rotation.z=shipAngle;matchRoot.position.copy(shipPivot).sub(shipPivot.clone().applyAxisAngle(new THREE.Vector3(0,0,1),shipAngle));if(mapData.id!=='sunken')matchRoot.position.set(0,0,0);
 const buffered=onlineFrames.advance(dt);
 for(const actor of avatars){const state=round.actors[actor.id];
  if(actor.id!==0&&buffered){const {a,b,alpha,extra}=buffered;applyPose(actor,interpolatePose(a.poses[actor.id],b.poses[actor.id],alpha,extra));}
  else if(actor.id===0&&!actor.prediction&&active&&!state.caught){let dx=direction.x,dz=direction.z;const flying=state.effect==='rocket'&&state.effectTime>0;if(state.effect==='banana'&&state.effectTime>0){dx=state.spinDirection?.x||0;dz=state.spinDirection?.z||0;}if(flying&&Math.hypot(dx,dz)<.1){dx=Math.sin(actor.group.rotation.y);dz=Math.cos(actor.group.rotation.y);}const prediction=simulationSteps(dt);for(let step=0;step<prediction.count;step++)advanceActor(actor,state,dx,dz,prediction.dt,{grid,map:mapData.id,tilt:shipAngle,speed:movementSpeed(state.role,mapData.id,true,flying)});}
  if(round.mode==='balloon'&&!state.eliminated)slideBalloonSpheres(state,actor.group.position,actor.group.position);animate(actor,state,dt);if(actor.detectionZone)actor.detectionZone.update(hasDetectedThief(round,avatars,actor.id,(p,q)=>withinSight(p,q)),!state.caught&&!state.inSmoke);
 }
 if(buffered){const {a,b,alpha}=buffered;for(const f of remoteFurniture){const to=b.furniture.find(item=>item.name===f.mesh.name),from=a.furniture.find(item=>item.name===f.mesh.name)||to;if(to){f.mesh.position.fromArray(from.position).lerp(new THREE.Vector3(...to.position),alpha);f.mesh.quaternion.fromArray(from.rotation).slerp(new THREE.Quaternion(...to.rotation),alpha);}}}
 for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];if(h.type==='smoke')animateSmokeBomb(h.mesh,dt);if(h.type==='banana')animateBananaHazard(h.mesh,dt);animateHazardTelegraph(h.mesh,dt);animatePlayerMirage(h.mesh,dt);if(h.networkId)continue;h.time-=dt;if(h.time<=0){disposeHazard(h);hazards.splice(i,1);}}gameFX.update(dt,matchCamera,{map:mapData?.id,bounds});updateHud();
}

function choice(id,name,sub,selected,icon=''){return `<button class="choice${selected?' selected':''}" data-choice="${id}" aria-pressed="${selected}">${icon}<strong>${name}</strong><small>${sub}</small></button>`;}
function toolImage(t){return `<img src="assets/pnt/${t.icon}.png" alt="">`;}
function renderTools(){
 if(selectedMode==='splash'){$('#page-content').innerHTML='<p>Splish Splash has no equipped tools. Hold Interact to spray. Slot 1 toggles submerge/refill; Slot 2 throws a paint can.</p>';return;}
 const event=['diretide','tiletide','strikers','balloon','splash'].includes(selectedMode),kit=modeLoadout(selectedMode,loadout);if(event&&!kit.includes(selectedTool))selectedTool='hammer';
 const source=TOOLS.find(t=>t.id===selectedTool),selected={...source,description:selectedMode==='strikers'&&source.id==='hammer'?source.description.replace('2 seconds','1.5 seconds'):selectedMode==='diretide'&&source.id==='hammer'?source.description.replace('2 seconds','4 seconds'):event&&source.id==='banana'?source.description.replace('2 seconds',selectedMode==='tiletide'?'1 second':selectedMode==='balloon'?'2 seconds':'7 seconds'):source.description},types=Object.fromEntries(TOOLS.map(t=>[t.id,t.type]));
 $('#page-content').innerHTML=`
 <div class="equipped-slots" aria-label="Equipped tools">${kit.map((id,slot)=>{const t=TOOLS.find(t=>t.id===id);return `<button class="equipped-slot" data-slot-detail="${slot}">${toolImage(t)}<span><small>SLOT ${slot+1} <kbd>${actionMarkup(slot===0?'tool1':'tool2')}</kbd></small><strong>${t.name}</strong><em>${t.cooldown}s cooldown · ${types[id]}</em></span></button>`;}).join('')}</div>
 <div class="kit-body"><div id="tool-catalog" class="tool-catalog" aria-label="Tool catalog">${TOOLS.filter(t=>!event||kit.includes(t.id)).map(t=>choice(t.id,t.name,kit.includes(t.id)?'SLOT '+(kit.indexOf(t.id)+1):'',t.id===selectedTool,toolImage(t))).join('')}</div>
 <section class="tool-detail" aria-label="Selected tool details"><div class="tool-detail-title">${toolImage(selected)}<h2>${selected.name}</h2></div><div class="tool-stats"><span>${selected.cooldown}s<small>COOLDOWN</small></span><span>${types[selected.id]}<small>TOOL TYPE</small></span></div><p>${selected.description.replace(" 8 second cooldown.","")}</p>
 <button id="equip-slot1" class="primary equip-button" ${event||kit[0]===selectedTool?'disabled':''}>${kit[0]===selectedTool?'EQUIPPED IN SLOT 1':'EQUIP SLOT 1'}</button><button id="equip-slot2" class="primary equip-button" ${event||kit[1]===selectedTool?'disabled':''}>${kit[1]===selectedTool?'EQUIPPED IN SLOT 2':'EQUIP SLOT 2'}</button><button id="preview-tool" class="secondary">PREVIEW ${selected.key}</button></section></div>`;
 for(const b of document.querySelectorAll('#tool-catalog [data-choice]'))b.onclick=()=>{const controllerSelection=b.classList.contains('pad-focus');selectedTool=b.dataset.choice;previewTime=0;preview.anim.play('idle');renderTools();if(controllerSelection){const first=$('#equip-slot1'),second=$('#equip-slot2'),target=!first.disabled?first:!second.disabled?second:null;if(target)controllerMenu(document,'focus',target);}};
 for(const b of document.querySelectorAll('[data-slot-detail]'))b.onclick=()=>{selectedTool=kit[Number(b.dataset.slotDetail)];renderTools();};
 for(const slot of [0,1])$('#equip-slot'+(slot+1)).onclick=()=>{if(event)return;loadout=equipTool(loadout,selectedTool,slot);localStorage.setItem('pnt-loadout',JSON.stringify(loadout));labels();renderTools();};
 $('#preview-tool').onclick=()=>demo(selected.clip);
}
function openPage(name){if(busy)return;bindingCapture=null;settingsPage=null;activePage=name;ui.menu.classList.toggle('oyen-customizing',name==='costume'&&(costume==='oyen'||COLOR_COSTUMES.includes(costume)));if(preview)preview.group.visible=!['events','play','online','join','credits','settings'].includes(name);$('#page-back').textContent=returnToLobby?'← LOBBY':'← BACK';ui.menu.dataset.page=name;$('#home').hidden=name!=='home';$('#home-widgets').hidden=name!=='home';$('#page').hidden=name==='home';$('#page').scrollTop=0;if(name==='home'){selectedMode='classic';labels();previewClip='idle';previewTime=0;if(preview)preview.anim.play('idle');return;}
 const modeTitle=selectedMode==='splash'?'SPLISH SPLASH':selectedMode==='diretide'?'PATTY PROWL':selectedMode==='tiletide'?'TILE TUMBLE':selectedMode==='strikers'?'SLIPPERY SHOOTS':selectedMode==='balloon'?'BALLOON BASH':null;$('#page-title').textContent={events:'EVENTS',play:modeTitle||'LET’S PLAY',online:modeTitle?modeTitle+' ONLINE':'SOLO ONLINE',join:'JOIN THE CHASE',tools:'TOOLS OF THE TRADE',costume:'YOUR LOOK',settings:'SETTINGS',credits:'CREDIT'}[name];
 $('#page-kicker').hidden=true;
 $('#page-kicker').textContent={play:'GATHER THE CREW',join:'FIND YOUR CREW',tools:'A LITTLE HELP FOR YOUR GETAWAY',costume:'LOOK GOOD. RUN FAST.',settings:'MAKE YOURSELF COMFORTABLE',credits:'MADE FOR A LITTLE TROUBLE'}[name];
 const content=$('#page-content');
 if(name==='events'){
  content.innerHTML='<div class="event-card-grid"><button id="diretide-event" class="event-mode-card patty-card"><span class="event-mode-art"><img src="assets/pnt/maps/grassfield.png" alt="Grassfield arena"><strong><span>PATTY</span><span>PROWL</span></strong></span><span class="event-mode-body"><p>Fill enemy wells with patties. Protect your own. Survive the unstoppable smash.</p></span></button><button id="tiletide-event" class="event-mode-card tiletide-card"><span class="event-mode-art"><img src="assets/pnt/maps/tiletide.svg" alt="Seven colorful Tile Tumble platforms"><strong>TILE TUMBLE</strong></span><span class="event-mode-body"><p>Race to the matching tile before every other platform sinks into the galaxy.</p></span></button><button id="strikers-event" class="event-mode-card strikers-card"><span class="event-mode-art"><img src="assets/pnt/maps/slipperystriker.svg" alt="Slippery Shoots ice rink"><strong>SLIPPERY SHOOTS</strong></span><span class="event-mode-body"><p>Two teams. One bouncing ball. Press Shoot and grab falling power-ups.</p></span></button><button id="balloon-event" class="event-mode-card balloon-card"><span class="event-mode-art"><img src="assets/pnt/maps/balloonbash.png" alt="Circular Balloon Bash sand arena"><strong>BALLOON BASH</strong></span><span class="event-mode-body"><p>Pop both rival balloons. Use falling spheres as cover. Last player standing wins.</p></span></button><button id="splash-event" class="event-mode-card splash-card"><span class="event-mode-art"><img src="assets/pnt/maps/splash.svg" alt="Square paint arena with beveled cover"><strong>SPLISH SPLASH</strong></span><span class="event-mode-body"><p>Shoot, splash and submerge. Cover the most turf before the two-minute timer ends.</p></span></button></div>';
  $('#diretide-event').onclick=()=>{selectedMode='diretide';openPage('play');};
  $('#tiletide-event').onclick=()=>{selectedMode='tiletide';openPage('play');};
  $('#strikers-event').onclick=()=>{selectedMode='strikers';openPage('play');};

  $('#splash-event').onclick=()=>{selectedMode='splash';openPage('play');};
  $('#balloon-event').onclick=()=>{selectedMode='balloon';openPage('play');};
 }else if(name==='play'){
  content.innerHTML='<div class="flow-options"><button id="solo-online" class="flow-option host-option"><img src="assets/pnt/ui/online.png" alt=""><small>PLAY WITH PEOPLE ONLINE</small><b>SOLO ONLINE →</b></button><button id="couch-play" class="flow-option join-option"><img src="assets/pnt/ui/users.png" alt=""><small>2–4 PLAYERS · ONE SCREEN</small><b>COUCH PLAY →</b></button></div>';$('#solo-online').hidden=!globalThis.pntDesktop?.steam;$('#solo-online').onclick=()=>openPage('online');$('#couch-play').onclick=hostCouchLobby;if(['diretide','tiletide','strikers','balloon','splash'].includes(selectedMode)){content.insertAdjacentHTML('beforeend','<button id=event-training class=secondary>TRAINING · PLAY WITH BOTS</button>');$('#event-training').onclick=hostLobby;}
 }else if(name==='online'){
  content.innerHTML=`<div class="online-cards"><button id="host-lobby" class="online-card online-create-card"><img src="assets/pnt/ui/users.png" alt=""><span><small>YOU HOST</small><strong>CREATE A ROOM</strong><span>Pick the stage, share the code, and start when your crew is ready.</span></span><b aria-hidden="true">GO!</b></button><button id="join-lobby" class="online-card online-join-card"><img src="assets/pnt/ui/online.png" alt=""><span><small>FIND YOUR CREW</small><strong>JOIN A ROOM</strong><span>Enter a room code or find a public match.</span></span><b aria-hidden="true">→</b></button></div>`;
  content.insertAdjacentHTML('beforeend','<p id=play-status class=flow-network-note role=status></p>');$('#host-lobby').onclick=()=>connectOnline('host');$('#join-lobby').onclick=()=>openPage('join');
 }else if(name==='join'){
  content.innerHTML=`<div class="flow-options"><section class="flow-option join-option"><img src="assets/pnt/ui/online.png" alt=""><small>PUBLIC MATCHMAKING</small><strong>FIND A<br>CHASE.</strong><button id="public-match" class="primary">FIND PUBLIC MATCH</button></section><form id="join-code-form" class="flow-option code-option online-join-card"><img src="assets/pnt/ui/lock.png" alt=""><strong>GOT AN<br>INVITE?</strong><label for="join-code">ROOM CODE</label><input id="join-code" name="roomCode" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="7" placeholder="ABC2345" aria-describedby="join-status"><button type="submit" class="primary">JOIN ROOM →</button></form></div><p id="join-status" class="flow-network-note" role="status"></p>`;
  $('#public-match').onclick=()=>connectOnline('public');
  $('#join-code-form').onsubmit=e=>{e.preventDefault();const code=$('#join-code').value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{7}$/.test(code)){$('#join-status').textContent='Enter the seven-character room code or accept a Steam invitation.';$('#join-code').focus();return;}connectOnline('join',code);};$('#join-code').oninput=e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'');};
 }else if(name==='tools'){
  renderTools();
 }else if(name==='costume'){
  content.innerHTML=`<section id="oyen-options"></section><div class="wardrobe-grid">${COSTUMES.map(c=>choice(c.id,c.name,c.id===costume?'EQUIPPED':'',c.id===costume,'<img src="assets/pnt/portraits/'+c.id+'.png" alt="">')).join('')}</div><button id="costume-dance" class="secondary">SHOW YOUR MOVES</button>`;
  for(const b of content.querySelectorAll('[data-choice]'))b.onclick=()=>selectCostume(b.dataset.choice);$('#costume-dance').onclick=()=>demo('dance');renderCostumeOptions();
 }else if(name==='settings'){
  settingsPage=mountSettings(content,{getSettings:()=>settings,onChange:changeSetting,hapticsSupported:haptics.supported||controller.supported,
   bindingsMarkup:'<div id="key-binding-list"></div><button id="reset-bindings" class="secondary">RESET KEY MAPPING</button><p id="binding-status" role="status"></p>',
   onBindings:()=>{renderBindingSettings();$('#reset-bindings').onclick=()=>{bindings={...DEFAULT_BINDINGS};bindingCapture=null;saveBindings(localStorage,bindings);renderBindingSettings();refreshControlHints();};},
   onCloseBindings:()=>{bindingCapture=null;},
   desktop:!!desktop,
   onFullscreen:(button,status)=>configureFullscreen(button,status),
   onReset:()=>{settings={...DEFAULT_SETTINGS,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};bindings={...DEFAULT_BINDINGS};bindingCapture=null;saveBindings(localStorage,bindings);refreshControlHints();const saved=saveSettings(localStorage,settings);applySettings(true);return saved;}
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
function renderCostumeOptions(){
 const host=$('#oyen-options');if(!host)return;ui.menu.classList.toggle('oyen-customizing',costume==='oyen'||COLOR_COSTUMES.includes(costume));host.hidden=costume!=='oyen'&&!COLOR_COSTUMES.includes(costume);if(host.hidden){host.replaceChildren();return;}
 if(COLOR_COSTUMES.includes(costume)){
  const appearance=costumeAppearances[costume],original={thief:'#eeeeee',police:'#2465ee',pingu:'#2465ee',raptor:'#89ae3e'}[costume];
  host.innerHTML=`<div class="oyen-variants"><h2>${costume.toUpperCase()} OUTFIT</h2><div class="oyen-coats">${outfitColors(costume).map(c=>`<button class="oyen-swatch outfit-swatch" data-outfit="${c.id}" aria-pressed="${appearance.outfit===c.id}" style="--outfit-color:${c.swatch||c.color||original}"><i aria-hidden="true"></i><span>${c.name}</span></button>`).join('')}</div><div class="oyen-faces"><span>SKIN TONE</span>${SKIN_COLORS.map(c=>`<button class="face-swatch" data-skin="${c.id}" aria-label="${c.name}" aria-pressed="${appearance.skin===c.id}" style="--face-color:${c.color}"><i aria-hidden="true"></i></button>`).join('')}</div></div>`;
  for(const button of host.querySelectorAll('button'))button.onclick=()=>{
   costumeAppearances[costume]={...costumeAppearances[costume],...(button.dataset.outfit?{outfit:button.dataset.outfit}:{skin:button.dataset.skin})};
   saveCostumeAppearances(localStorage,costumeAppearances);if(returnToLobby&&online)online.send('profile',onlineProfile());previewModel();renderCostumeOptions();
  };
  return;
 }
 host.innerHTML=`<div class="oyen-variants"><h2>OYEN COAT</h2><div class="oyen-coats">${OYEN_COATS.map(c=>`<button class="oyen-swatch coat-${c.id}" data-coat="${c.id}" aria-pressed="${oyenAppearance.coat===c.id}"><i aria-hidden="true"></i><span>${c.name}</span></button>`).join('')}</div><div class="oyen-faces"><span>SKIN TONE</span>${OYEN_SKINS.map(c=>`<button class="face-swatch" data-skin="${c.id}" aria-label="${c.name}" aria-pressed="${oyenAppearance.skin===c.id}" style="--face-color:${c.color}"><i aria-hidden="true"></i></button>`).join('')}</div></div>`;
 for(const button of host.querySelectorAll('button'))button.onclick=()=>{oyenAppearance={...oyenAppearance,...(button.dataset.coat?{coat:button.dataset.coat}:{skin:button.dataset.skin})};saveOyenAppearance(localStorage,oyenAppearance);if(returnToLobby&&online)online.send('profile',onlineProfile());previewModel();for(const b of host.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.coat?b.dataset.coat===oyenAppearance.coat:b.dataset.skin===oyenAppearance.skin));};
}
function refreshCostumeSelection(){
 const panel=$('#page'),scrollTop=panel.scrollTop;
 for(const button of panel.querySelectorAll('.wardrobe-grid [data-choice]')){const equipped=button.dataset.choice===costume;button.classList.toggle('selected',equipped);button.classList.toggle('is-on',equipped);button.setAttribute('aria-pressed',String(equipped));button.querySelector('small').textContent=equipped?'EQUIPPED':'';}
 renderCostumeOptions();panel.scrollTop=scrollTop;
}
async function selectCostume(id){if(id===costume)return;const previous=costume;costume=id;beginLoading('DRESSING FOR TROUBLE');try{await ensureCostume();progress(90,'Preparing your character…');previewModel();await renderer.compileAsync(scene,menuCamera);localStorage.setItem('pnt-costume',costume);if(returnToLobby&&online)online.send('profile',onlineProfile());endLoading();refreshCostumeSelection();}catch(error){costume=previous;loadError(error,()=>selectCostume(id));}}
for(const b of document.querySelectorAll('[data-page]'))b.onclick=()=>{if(b.dataset.page==='play')selectedMode='classic';openPage(b.dataset.page);};
$('#training').onclick=()=>{selectedMode='classic';hostLobby();};
$('#profile-name-edit').onclick=()=>{$('#profile-name-form').hidden=false;$('#profile-name-edit').setAttribute('aria-expanded','true');$('#profile-name-input').value=profile.name;$('#profile-name-input').focus();$('#profile-name-input').select();if(controllerActive)virtualKeyboard.open($('#profile-name-input'));};
function closeNameForm(){$('#profile-name-form').hidden=true;$('#profile-name-edit').setAttribute('aria-expanded','false');$('#profile-name-edit').focus();}
$('#cancel-profile-name').onclick=closeNameForm;
$('#profile-name-input').onkeydown=e=>{if(e.code==='Escape'){e.stopPropagation();closeNameForm();}};
$('#profile-name-form').onsubmit=e=>{e.preventDefault();const name=profileName($('#profile-name-input').value);if(!name)return;profile={...readProfile(localStorage),name};if(!saveProfile(localStorage,profile)){$('#profile-save-status').textContent='Storage unavailable. Name applies for this visit.';}else closeNameForm();labels();uiEffects.sounds.play('ui_confirm');};
addEventListener('storage',e=>{if(e.key===PROFILE_KEY){profile=readProfile(localStorage);labels();}});

$('#sunken-look').onclick=()=>{if(!sunkenLook)return;sunkenStylized=!sunkenStylized;try{localStorage.setItem('pnt-sunken-look',sunkenStylized?'stylized':'original');}catch{}sunkenLook.setEnabled(sunkenStylized);resume();};
$('#page-back').onclick=goBack;$('#pause-button').onclick=pauseGame;$('#resume').onclick=resume;$('#leave').onclick=menu;$('#result-menu').onclick=menu;$('#again').onclick=start;
$('#stay-in-lobby').onclick=()=>leaveLobbyDialog.close();
$('#confirm-leave-lobby').onclick=()=>{leaveLobbyDialog.close();quitLobby();};
leaveLobbyDialog.addEventListener('close',()=>{if(!ui.lobby.hidden&&controllerActive)controllerMenu(document,'restore');});
leaveLobbyDialog.addEventListener('keydown',e=>{if(e.code==='Escape')e.stopPropagation();});
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
 if(titleScreen.active){titleScreen.gamepad(controller.poll(now).pressed);return;}
 if(room?.mode==='couch'){updateCouchControllers(now,dt);return;}
 if(document.hidden){padMovement={x:0,z:0};return;}const pad=controller.poll(now),status=$('#controller-status');
 if(status){const text=pad.connected?'Controller connected · '+pad.id:'Controller ready · connect a pad and press a button';if(status.textContent!==text)status.textContent=text;}
 if(!pad.connected)setControlDevice(false);else if(pad.pressed.size||pad.x||pad.z)setControlDevice(true);
 if(virtualKeyboard.active){if(pad.direction)controllerMenu(document,pad.direction);if(pad.pressed.has(0))controllerMenu(document,'accept');if(pad.pressed.has(1))virtualKeyboard.cancel();if(pad.pressed.has(2))virtualKeyboard.backspace();if(pad.pressed.has(3))virtualKeyboard.space();if(pad.pressed.has(9))virtualKeyboard.done();return;}
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

document.addEventListener('controllertext',e=>{if(e.target instanceof HTMLInputElement)virtualKeyboard.open(e.target);});

if(desktop){
 const button=$('#interact');
 button.onpointerdown=e=>{
  if(e.button!==0)return;
  button.setPointerCapture(e.pointerId);interact('hud');
 };
 button.onlostpointercapture=()=>stopInteract('hud');
 $('#tool-action1').onclick=()=>useTool(0);
 $('#tool-action2').onclick=()=>useTool(1);
 $('#quit-game').onclick=()=>desktop.quit();
}else{
 touchControls=bindGameControls({root:document,sensitivity:()=>settings.joystickSensitivity,joystick:$('#joystick'),knob:$('#stick'),isActive:()=>!ui.hud.hidden&&!busy&&!paused&&!phoneLandscape.blocked&&round?.phase==='playing'&&!(round.startRemaining>0),onMove:(x,z)=>{input.x=x;input.z=z;},actions:[[$('#interact'),interact,stopInteract],[$('#tool-action1'),()=>useTool(0)],[$('#tool-action2'),()=>useTool(1)],[$('#pause-button'),pauseGame]]});
 $('#pause-button').onclick=null;
}
for(const name of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(name,()=>{if(activePage==='settings')settingsPage?.refreshFullscreen();});

function restoreRemoteFurniture(){for(const f of remoteFurniture){f.parent.add(f.mesh);f.mesh.position.copy(f.position);f.mesh.quaternion.copy(f.quaternion);f.mesh.scale.copy(f.scale);}remoteFurniture=[];}
function prepareRemoteFurniture(){const meshes=[];gameArena.traverse(o=>{if(o.isMesh&&/^BP_Coffee(Chair|Table)/.test(o.name))meshes.push(o);});remoteFurniture=meshes.map(mesh=>{const item={mesh,parent:mesh.parent,position:mesh.position.clone(),quaternion:mesh.quaternion.clone(),scale:mesh.scale.clone()};matchRoot.attach(mesh);return item;});}
async function loadArena(id,current=()=>true){
 if(id==='grassfield'&&(['balloon','splash'].includes(room?.gameMode)||['balloon','splash'].includes(round?.mode))){
  if(!current())return;clearEventView();sunkenLook?.dispose();sunkenLook=null;restoreRemoteFurniture();furniturePhysics?.dispose();furniturePhysics=null;
  matchRoot.rotation.set(0,0,0);matchRoot.position.set(0,0,0);shipAngle=0;waterAnimation=null;
  gameArena?.removeFromParent();gameArena=new THREE.Group();gameArena.visible=false;matchRoot.add(gameArena);menuArena.visible=false;mallFill.visible=true;
  const splash=(room?.gameMode||round?.mode)==='splash',data=splash?createSplashArenaData():createBalloonArenaData();mapData=data.metadata;grid=data.grid;ground=[];bounds=new THREE.Box3(new THREE.Vector3(-16,-12,-16),new THREE.Vector3(16,3,16));
  floor.position.y=-12;sunlight.intensity=2.4*.9;fill.intensity=.96*.9;hemisphere.intensity=1.92*.9;mallFill.intensity=1.2*.9;renderer.toneMappingExposure=1.15*1.15;
  eventView=splash?createSplashView(matchRoot):createBalloonView(matchRoot);
  await Promise.all([['propBanana','SM_TL_Banana'],['propHammer','SM_TL_Hammer'],['propJet','jetpack']].map(async([key,file])=>{templates[key]=await getGLB(key,`assets/pnt/props/${file}.glb`);}));
  if(current())await gameAudio.prepare(null);return;
 }
 const [asset,data,nav,collision]=await Promise.all([getGLB('arena-'+id,`assets/pnt/arenas/${id}-lit.glb?v=contact-1`,e=>{if(current())progress(e.total?Math.min(50,e.loaded/e.total*50):15,'Loading '+id+' arena…');}),fetch(`assets/pnt/arenas/${id}.json`).then(r=>{if(!r.ok)throw Error('Missing arena metadata');return r.json();}),fetch(`assets/pnt/arenas/${id}.nav.json?v=environment-098`).then(r=>{if(!r.ok)throw Error('Missing arena navigation');return r.json();}),fetch(`assets/pnt/arenas/${id}.collision.json?v=${id==='sunken'?'overhead-046':'environment-098'}`).then(r=>{if(!r.ok)throw Error('Missing Unreal collision');return r.json();})]);
 if(!current())return;
 clearEventView();sunkenLook?.dispose();sunkenLook=null;restoreRemoteFurniture();furniturePhysics?.dispose();furniturePhysics=null;matchRoot.rotation.set(0,0,0);matchRoot.position.set(0,0,0);shipAngle=0;
 gameArena?.removeFromParent();gameArena=asset.scene;gameArena.visible=true;const strikers=id==='slipperystriker';
 mapData=data;gameArena.position.set(...data.origin.map(v=>-v));matchRoot.add(gameArena);matchRoot.updateMatrixWorld(true);menuArena.visible=false;
 mallFill.visible=id==='mall';setArenaSurface(gameArena);if(id==='grassfield')await applyDiretideGroundAO(gameArena);else if(!strikers)await bakedArena(gameArena,id);if(!current())return;waterAnimation=id==='sunken'?prepareSunkenWater(gameArena,THREE.RepeatWrapping):null;ground=[];gameArena.traverse(o=>{if(o.isMesh){if(solidForGameplay(o))ground.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.map)m.map.anisotropy=2;}});
 bounds=arenaBounds(gameArena,data);sunlight.intensity=(id==='mall'?2.4:3)*.9;fill.intensity=(id==='mall'?.96:1.2)*.9;hemisphere.intensity=(id==='mall'?1.92:2.4)*.9;mallFill.intensity=1.2*.9;renderer.toneMappingExposure=id==='mall'?1.15*1.15:1.15;
 grid={...nav,blocked:collision.blocked,edges:collision.edges,heights:Float32Array.from(collision.groundHeights||nav.heights,v=>v===null?NaN:v)};applyIceBlockCollision(grid,data.iceBlockFootprints);grid.landingMask=landingMask(grid,strikers?STRIKER_SPAWNS:data.spawns);floor.position.y=-12;floor.material.color.set(id==='mall'?0x77768c:id==='sunken'?0x24638b:0x9bc4d7);
 if(id==='sunken'||id==='grassfield'){sunkenLook=createSunkenLook({renderer,scene,sunlight,fill,hemisphere,bounds,quality,enabled:id==='grassfield'||sunkenStylized,lightScale:id==='grassfield'?.8:1,exposure:id==='grassfield'?1:1.12});sunkenLook.register(gameArena);sunkenLook.register(floor);if(id==='grassfield')gameArena.traverse(o=>{if(o.isMesh)o.castShadow=false;});}
 if(id==='sunken')gameArena.getObjectByName('SunkenShip').getWorldPosition(shipPivot);if(id==='mall'&&!online){progress(50,'Preparing movable furniture…');furniturePhysics=await createMallPhysics(gameArena,matchRoot,grid);}if(id==='mall'&&online)prepareRemoteFurniture();
 if(id==='grassfield'&&(['balloon','splash'].includes(room?.gameMode)||['balloon','splash'].includes(round?.mode))){gameArena.visible=false;eventView=createBalloonView(matchRoot);}
 else if(id==='grassfield'&&(room?.gameMode==='tiletide'||round?.mode==='tiletide')){gameArena.visible=false;eventView=createTiletideView(matchRoot);sunkenLook?.register(eventView.root);}
 else if(strikers){eventView=createStrikersView(matchRoot);sunkenLook?.register(eventView.root);}
 else if(id==='grassfield'){const [boss,burger]=await Promise.all([getGLB('patrics','assets/pnt/arenas/patrics.glb?v=jumping-jack-092'),getGLB('krabbypatty','assets/pnt/props/krabbypatty.glb?v=burger-093')]);if(!current())return;eventView=createDiretideView(matchRoot,boss,data,burger);sunkenLook?.register(eventView.root);eventSmashes=0;eventStage='sleeping';}
 const props=[['propBanana','SM_TL_Banana'],['propSmoke','SM_TL_Bomb'],['propHammer','SM_TL_Hammer'],['propJet','jetpack']];await Promise.all(props.map(async([key,file])=>{templates[key]=await getGLB(key,`assets/pnt/props/${file}.glb`);}));if(current())await gameAudio.prepare(id==='sunken'?'pirate-chase-bgm':id==='iceberg'?'iceberg-chase-bgm':null);
}
function clearEventView(){if(!eventView)return;sunkenLook?.unregister(eventView.root);eventView.dispose();eventView=null;}
function restoreMenuArena(){clearEventView();document.body.classList.remove('diretide-mode');sunkenLook?.dispose();sunkenLook=null;restoreRemoteFurniture();furniturePhysics?.dispose();furniturePhysics=null;waterAnimation=null;matchRoot.rotation.set(0,0,0);matchRoot.position.set(0,0,0);shipAngle=0;sunlight.intensity=3;fill.intensity=1.2;hemisphere.intensity=2.4;mallFill.visible=false;renderer.toneMappingExposure=1.15;if(gameArena)gameArena.visible=false;if(menuArena){menuArena.visible=false;({ground,bounds,grid}=menuNavigation);}floor.position.y=-.3;floor.material.color.set(0x77768c);$('#world-markers').replaceChildren();}
function prop(key,size=1){const source=templates[key];if(!source)return null;const object=clone(source.scene);const box=new THREE.Box3().setFromObject(object),scale=size/Math.max(.01,...box.getSize(new THREE.Vector3()).toArray());object.scale.multiplyScalar(scale);object.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(object),center=b.getCenter(new THREE.Vector3());object.position.add(new THREE.Vector3(-center.x,-b.min.y,-center.z));const root=new THREE.Group();root.add(object);return root;}
function disposeHazard(h){disposePlayerMirage(h.mesh);disposeSmokeBomb(h.mesh);h.mesh.removeFromParent();if(h.owned)h.mesh.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
function withinSight(p,q,smoke=true,stop=.35){return hasSight(grid,p,q,hazards,smoke,stop);}
function steerBot(a,target,dt){
 a.routeTime=(a.routeTime||0)-dt;const p=a.group.position;
 if(a.routeTime<=0||!a.route||!a.routeGoal||a.routeGoal.distanceToSquared(target)>1){a.route=findPath(grid,p,target);a.routeGoal=target.clone();a.routeTime=.8;}
 while(a.route.length&&Math.hypot(a.route[0].x-p.x,a.route[0].z-p.z)<.22)a.route.shift();const next=a.route[0]||target,dx=next.x-p.x,dz=next.z-p.z,d=Math.hypot(dx,dz);return d>.06?{x:dx/d,z:dz/d}:{x:0,z:0};
}
function interactionTarget(id){
 if(round.mode==='diretide'){const p=avatars[id]?.group.position;if(!p)return null;const t=eventTarget(round,id,p,q=>withinSight(p,new THREE.Vector3(...q),false,1.1));return t?{...t,position:new THREE.Vector3(...t.position)}:null;}
 const a=avatars[id],state=round.actors[id];if(!a||state.role!=='runner')return null;const p=a.group.position;
 const teammate=round.actors.filter(t=>t.id!==id&&t.caught&&t.releaseCooldown<=0&&(t.rescuer===null||t.rescuer===id||!canActRule(round,t.rescuer))).map(t=>({type:'rescue',target:t,position:avatars[t.id].group.position})).filter(t=>p.distanceTo(t.position)<INTERACT_RADIUS&&withinSight(p,t.position,false,1.1)).sort((a,b)=>p.distanceToSquared(a.position)-p.distanceToSquared(b.position))[0];if(teammate)return teammate;
 if(round.actors[id].inSmoke)return null;return round.caches.filter(c=>c.remaining>0).map(c=>({type:'money',target:c,position:new THREE.Vector3(...c.position)})).filter(t=>Math.hypot(p.x-t.position.x,p.z-t.position.z)<INTERACT_RADIUS&&Math.abs(p.y-t.position.y)<2&&withinSight(p,t.position,false,1.1)).sort((a,b)=>p.distanceToSquared(a.position)-p.distanceToSquared(b.position))[0]||null;
}
function performInteraction(id,target,dt){
 if(!target){cancelInteraction(round,id);return;}const p=avatars[id].group.position,d=Math.hypot(p.x-target.position.x,p.z-target.position.z);
 if(round.mode==='diretide'){eventInteract(round,id,target,dt,d);return;}
 if(target.type==='money')harvest(round,id,target.target.id,dt,d);else if(rescue(round,id,target.target.id,dt,d)){say(id===0?'TEAMMATE RELEASED!':'A THIEF WAS RELEASED!',1.3);avatars[target.target.id].ring.material.color.setHex(0x83f9c4);gameFX.rescue(avatars[target.target.id].group.position);}
}
function syncCacheCelebrations(initial=false){if(['diretide','tiletide','strikers','balloon','splash'].includes(round.mode))return;gameFX.syncCaches(round.caches,c=>cacheAnchors.get(c.id)||new THREE.Vector3(...c.position),initial);}
function buildMarkers(){if(round.mode==='diretide'){buildEventMarkers();return;}if(['tiletide','strikers','balloon','splash'].includes(round.mode)){$('#world-markers').replaceChildren();return;}cacheAnchors=cacheCenters(gameArena,round.caches,matchRoot,heightAt);syncCacheCelebrations(true);const root=$('#world-markers');root.replaceChildren();for(const c of round.caches){const node=document.createElement('div');node.className='world-marker cache-marker';node.id='marker-'+c.id;root.append(node);}for(const a of round.actors){const node=document.createElement('div');if(a.role==='chaser'){node.className='world-marker police-badge';node.id='police-badge-'+a.id;node.innerHTML=policeBadgeMarkup();updatePoliceBadge(node,0,reduced);}else{node.className='world-marker rescue-marker';node.id='rescue-'+a.id;}root.append(node);}}
function updateMarkers(){
 if(!round||ui.hud.hidden)return;if(round.mode==='diretide'){updateEventMarkers();return;}if(['tiletide','strikers','balloon','splash'].includes(round.mode))return;matchCamera.updateMatrixWorld();
 const place=(node,p,center=false)=>{matchRoot.updateMatrixWorld();const v=matchRoot.localToWorld(p.clone()).project(matchCamera);node.hidden=v.z>1||v.z< -1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1;node.style.transform=`translate(-50%,${center?'-50%':'-100%'}) translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px)`;};
 for(const a of round.actors){if(a.role==='chaser'){const node=$('#police-badge-'+a.id);if(node){updatePoliceBadge(node,performance.now()/1000,reduced);place(node,avatars[a.id].group.position.clone().addScaledVector(up,2.05));}}}
 for(const c of round.caches){const node=$('#marker-'+c.id);if(!node)continue;updateMoneyBar(node,c.remaining,c.amount,{cache:true});place(node,cacheAnchors.get(c.id)||new THREE.Vector3(...c.position),true);}
 for(const a of round.actors.filter(a=>a.role==='runner')){const node=$('#rescue-'+a.id);avatars[a.id].captureTint.update(a);if(!updateCaptureGauge(node,a))continue;place(node,avatars[a.id].group.position.clone().addScaledVector(up,.78),true);}
}

function buildEventMarkers(){
 const root=$('#world-markers');root.replaceChildren();
 for(const w of round.wells){const node=document.createElement('div');node.className='world-marker event-well-marker';node.id='well-marker-'+w.id;node.innerHTML=candyMarkerMarkup(true);root.append(node);}
 for(const a of round.actors){
  const node=document.createElement('div');node.className='world-marker event-player-marker';node.id='event-player-'+a.id;node.innerHTML=candyMarkerMarkup();
  root.append(node);
 }
}
function updateEventMarkers(){
 matchCamera.updateMatrixWorld();matchRoot.updateMatrixWorld();
 const place=(node,position)=>{const p=matchRoot.localToWorld(new THREE.Vector3(...position)).project(matchCamera);node.hidden=p.z>1||p.z< -1||Math.abs(p.x)>1.1||Math.abs(p.y)>1.1;node.style.transform=`translate(-50%,-100%) translate(${(p.x*.5+.5)*innerWidth}px,${(-p.y*.5+.5)*innerHeight}px)`;};
 for(const w of round.wells){const node=$('#well-marker-'+w.id);if(!node)continue;node.style.setProperty('--player-color',PLAYER_COLORS[w.seat??w.owner]);node.classList.toggle('is-target',round.boss.target===w.id);node.querySelector('.well-candy-count').textContent=Math.ceil(w.candy);updateWellHealth(node.querySelector('.well-health'),w.hearts);place(node,[w.position[0],w.position[1]+1.2,w.position[2]]);if(w.hearts<=0)node.hidden=true;}
 for(const a of round.actors){
  const node=$('#event-player-'+a.id),actor=avatars[a.id],p=actor.group.position;
  avatars[a.id].captureTint.update({...a,caught:false});node.querySelector('.player-candy-count').textContent=Math.floor(a.candy);node.style.setProperty('--player-color',PLAYER_COLORS[a.seat??a.id]);
  place(node,[p.x,p.y+2.1,p.z]);
  if(a.eliminated)node.hidden=true;
 }
}
function updateEventHud(){
 const state=round.actors[0],actor=avatars[0],boss=round.boss,sleeping=boss.stage==='sleeping';
 $('#timer').textContent=sleeping?`${Math.floor(Math.ceil(round.remaining)/60)}:${String(Math.ceil(round.remaining)%60).padStart(2,'0')}`:boss.stage==='returning'?'RESET':'SMASH';
 $('#role-label').textContent='PATTY PROWL · ROUND '+round.cycle;
 $('#money-status').classList.add('event-candy-status');
 const target=interactionTarget(0);
 $('#crew-status').hidden=true;
 if(room?.mode==='couch'){updateCouchHud($('#couch-hud'),room,round,bindings);return;}
 state.toolCooldowns.forEach((cd,slot)=>{const tool=TOOLS.find(t=>t.id===actor.tools[slot]),button=$('#tool-action'+(slot+1));button.classList.toggle('cooling-down',cd>0);button.disabled=cd>0||state.eliminated||state.effectTime>0||state.inSmoke||round.startRemaining>0;$('#tool-status'+(slot+1)).textContent=cd>0?Math.ceil(cd)+'s':'';$('#tool-action-label'+(slot+1)).textContent=tool.id==='rewind'&&actor.mark?'RETURN':tool.key;});
 $('#interact').disabled=!target||state.eliminated||round.startRemaining>0;$('#interact .control-label').textContent='DEPOSIT';
}

function buildGround(){grid=buildWalkGrid(ground,bounds);}

function heightAt(x,z){return grid?sampleGround(grid,x,z):0;}
function walkable(x,z,y){const h=heightAt(x,z);return Number.isFinite(h)&&h-y<.5&&y-h<1.2;}
function spot(x,z){let best=null,distance=Infinity;for(let iz=2;iz<grid.nz-2;iz++)for(let ix=2;ix<grid.nx-2;ix++){
  const y=grid.heights[iz*grid.nx+ix];if(!Number.isFinite(y)||grid.blocked?.[iz*grid.nx+ix])continue;const px=bounds.min.x+ix*grid.step,pz=bounds.min.z+iz*grid.step,d=(px-x)**2+(pz-z)**2;
  if(d<distance){distance=d;best=new THREE.Vector3(px,y,pz);}
}if(!best)throw new Error('No walkable ground was found in the Mall export');return best;}
function avatar(template,id,actorRole,player=null){
 const model=clone(template.scene),group=new THREE.Group();model.updateMatrixWorld(true);
 let box=new THREE.Box3().setFromObject(model),height=box.max.y-box.min.y;model.scale.multiplyScalar(1.55/height);model.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));group.add(model);(round?matchRoot:scene).add(group);group.position.copy(spot((id-1.5)*2.7,id%2?4:-3));
 model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)m.roughness=Math.max(.55,m.roughness||0);}});
 const appearanceCostume=player?.costume??(id===0?Object.keys(templates).find(key=>templates[key]===template):null);
 const custom=player?player.appearance:appearanceCostume==='oyen'?oyenAppearance:costumeAppearances[appearanceCostume];
 const appearance=appearanceCostume==='oyen'?applyOyenAppearance(model,custom):COLOR_COSTUMES.includes(appearanceCostume)?applyCostumeAppearance(model,appearanceCostume,custom):null;
 const captureTint=createCaptureTint(model);sunkenLook?.register(model);
 const jetpackRig={model,group};prepareJetpackMount(jetpackRig);
 const anim=makeAnimator(model,clips,actorRole);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.35,.42,24),new THREE.MeshBasicMaterial({color:id===0?0xff8a14:actorRole==='chaser'?0x2f5bff:0xffffff,transparent:true,opacity:.8,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;group.add(ring);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.35,20),new THREE.MeshBasicMaterial({color:0x09154b,transparent:true,opacity:.25,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;group.add(shadow);
 return {...jetpackRig,id,group,model,anim,ring,shadow,appearance,captureTint,velocity:0,grounded:true,speed:0,wander:id*2.2};
}
function createSeatMarker(seat,team){
 const canvas=document.createElement('canvas');canvas.width=160;canvas.height=104;
 const ink=canvas.getContext('2d');
 ink.beginPath();
 if(team){ink.moveTo(80,8);ink.lineTo(148,40);ink.lineTo(148,88);ink.quadraticCurveTo(148,98,138,98);ink.lineTo(22,98);ink.quadraticCurveTo(12,98,12,88);ink.lineTo(12,40);}else{
 ink.moveTo(67,17);ink.quadraticCurveTo(80,3,93,17);
 ink.lineTo(147,74);ink.quadraticCurveTo(162,94,139,96);
 ink.lineTo(21,96);ink.quadraticCurveTo(-2,94,13,74);}
 ink.closePath();
 const color=new THREE.Color(team?.color??PLAYER_COLORS[seat]),shade=new THREE.Color('#171329');
 const fill=ink.createLinearGradient(0,8,0,98);
 fill.addColorStop(0,color.clone().lerp(shade,.24).getStyle());
 fill.addColorStop(1,color.clone().lerp(shade,.42).getStyle());
 ink.fillStyle=fill;ink.fill();
 ink.font=team?'bold 36px sans-serif':'bold 53px sans-serif';ink.textAlign='center';ink.textBaseline='middle';
 ink.fillStyle='#fff';ink.fillText(team?.name??'P'+(seat+1),80,65,114);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
 const geometry=new THREE.PlaneGeometry(team?1.15:.84,team?.7:.55);
 geometry.rotateX(-Math.PI/2);geometry.rotateY(-Math.PI/2);geometry.translate(-.61,.036,0);
 const marker=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}));
 marker.name='FootRing_P'+(seat+1);
 return marker;
}
function populate(){for(const a of avatars)destroy(a);avatars=[];for(const state of round.actors){const player=online?room.players[state.id]:null,template=online||room?.mode==='couch'?templates[room.players[state.id].costume]:state.id===0?templates[costume]:(templates[room?.players[state.id]?.costume]||templates[state.role==='chaser'?'police':'thief']);const actor=avatar(template,state.id,state.role,player);const seat=state.seat??state.id;if(['diretide','tiletide','strikers','balloon','splash'].includes(round.mode))actor.ring.material.color.set(round.mode==='strikers'?STRIKER_TEAMS[state.team].color:PLAYER_COLORS[seat]);actor.seatMarker=createSeatMarker(seat,STRIKER_TEAMS[state.team]);actor.group.add(actor.seatMarker);const p=round.mode==='splash'?SPLASH_SPAWNS[state.paintSeat]:round.mode==='tiletide'?TILE_SPAWNS[state.id]:round.mode==='strikers'?STRIKER_SPAWNS[state.id]:round.mode==='balloon'?BALLOON_SPAWNS[state.id]:mapData.spawns[state.id];actor.group.position.copy(spot(p[0],p[2]));actor.spawn=actor.group.position.clone();if(round.mode==='strikers')actor.group.rotation.y=strikerKickoffAngle(actor.spawn);if(['balloon','splash'].includes(round.mode))actor.group.rotation.y=Math.atan2(-actor.spawn.x,-actor.spawn.z);if(state.role==='chaser'){actor.detectionZone=createDetectionZone();actor.group.add(actor.detectionZone.group);}actor.tools=room?.mode==='couch'?normalizeLoadout(room.players[state.id].loadout):state.id===0?loadout:state.role==='chaser'?['hammer','rocket']:state.id%2?['banana','smoke']:['rewind','rocket'];actor.tools=modeLoadout(round.mode,actor.tools);avatars.push(actor);}}
async function start(){
 if(!ready||busy)return;clearStageVerdict();resultPortrait?.dispose();resultPortrait=null;if(room){role=resolveRole(room.preference);room.phase='playing';}returnToLobby=false;clearLobbyDisplays();beginLoading('SETTING UP THE CHASE');await nextFrame();
 try{
  await ensureCostume();await loadArena(lobbyMaps(room)[room?.map||0].id);progress(55,'Placing the crew…');destroy(preview);preview=null;round=createRound(role,mapData.caches);
  if(room?.gameMode==='splash')round=createSplashRound(round);else if(room?.gameMode==='diretide')round=createDiretideRound(round,mapData);else if(room?.gameMode==='tiletide')round=createTiletideRound(round);else if(room?.gameMode==='strikers')round=createStrikersRound(round);else if(room?.gameMode==='balloon')round=createBalloonRound(round);
  if(round.mode)role='runner';else if(room?.mode==='couch'){const police=Math.floor(Math.random()*4);for(const actor of round.actors)actor.role=actor.id===police?'chaser':'runner';role=round.playerRole=round.actors[0].role;}
  startCountdown(round);round.profileId=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);paused=false;clearInput();clearHazards();populate();buildMarkers();
  stageFrame=round.mode==='tiletide'?stageFraming(TILE_SPAWNS,[]):round.mode==='strikers'?{x:9,z:12}:round.mode==='splash'?{x:14.6,z:14.6}:round.mode==='balloon'?{x:BALLOON_ARENA_RADIUS,z:BALLOON_ARENA_RADIUS}:stageFraming(mapData.spawns,mapData.caches);
  const center=['tiletide','strikers','balloon','splash'].includes(round.mode)?{x:0,z:0}:fixedStageCenter(mapData.spawns,mapData.caches),anchor=spot(center.x,center.z);cameraTarget.set(center.x,anchor.y,center.z);cameraShake=0;positionMatchCamera();progress(85,'Warming up materials…');await renderer.compileAsync(scene,matchCamera);renderer.render(scene,matchCamera);progress(100,'Ready. Set. Run!');await nextFrame();
  $('#role-label').textContent=round.mode==='splash'?'SPLISH SPLASH':round.mode==='diretide'?'PATTY PROWL · P1':round.mode==='tiletide'?'TILE TUMBLE · P1':round.mode==='strikers'?'SLIPPERY SHOOTS · TEAM BLUE':round.mode==='balloon'?'BALLOON BASH · P1':room?.mode==='couch'?'COUCH PLAY':role==='runner'?'THIEF':'POLICE';$('#role-label').classList.toggle('chaser',role==='chaser');labels();show('hud');endLoading();if(room?.mode==='couch'&&room.players.some(p=>!p.bot&&!p.connected))pauseGame();
  say(round.mode==='splash'?'PAINT THE MOST TURF!':round.mode==='diretide'?'RUN OVER CANDY · FILL ENEMY WELLS':round.mode==='tiletide'?'FIND THE CALLED COLOR · STAY ON THE TILE':round.mode==='strikers'?'PRESS SHOOT · SCORE IN THE FAR GOAL':round.mode==='balloon'?'POP BOTH BALLOONS · USE FALLING SPHERES AS COVER':room?.mode==='couch'?'ONE POLICE · THREE THIEVES':role==='runner'?'HOLD INTERACT TO STEAL CASH!':'CATCH ALL THREE THIEVES!');updateHud();
 }catch(e){round=null;loadError(e,start);}
}
function canAct(){return round&&canActRule(round,0)&&!paused&&!busy;}
function interact(source='touch'){if(canAct()){interactionSources.add(source);interactHeld=true;}}
function stopInteract(source='touch'){interactionSources.delete(source);if(interactionSources.size)return;interactHeld=false;if(online)online.input(0,0,false,performance.now(),true);else if(round)cancelInteraction(round,0);}
function smokeCoverage(){if(round)updateSmokeCoverage(round,avatars.map(a=>a.group.position),hazards.filter(h=>h.type==='smoke').map(h=>({position:h.mesh.position,time:h.time})));}
function setEffect(state,name,time){if(state.inSmoke&&['stunned','airStunned','banana'].includes(name))return;spillOnStun(round,state.id,name,avatars[state.id].group.position.toArray());state.effect=name;state.effectTime=time;if(name==='banana'){state.spinDirection=rollSpinDirection();state.spinTurn=.35;}}
function useTool(slot,id=0){if(round?.actors[id]?.inSmoke||round?.startRemaining>0)return;if(online){if(!paused&&!busy)online.send('tool',{slot});return;}
 if(round?.mode==='splash'){if(!paused&&!busy)splashAction(round,id,slot,avatars[id].group.position,avatars[id].group.rotation.y);return;}
 smokeCoverage();const actor=avatars[id],state=round?.actors[id],tool=actor?.tools?.[slot];if(!actor||!state||!canActRule(round,id)||state.inSmoke||paused||busy)return;
 if(tool==='rewind'&&!actor.mark&&state.toolCooldowns[slot]<=0){actor.mark=actor.group.position.clone();const mesh=createPlayerMirage(actor);mesh.position.copy(actor.mark);attachHazardTelegraph(mesh,'rewind');matchRoot.add(mesh);hazards.push({mesh,type:'marker',owner:id,time:Infinity});gameFX.rewind(actor.mark);gameAudio.play('Tool_Rewind_Box_Deploy',id===0?1:.5);if(id===0)say('MARK SET · PRESS AGAIN TO RETURN',1.5);return;}
 if(!activateTool(round,id,slot,tool))return;gameAudio.tool(tool,id,avatars);
 const point=actor.group.position.clone();
 if(tool==='hammer'){
  setEffect(state,'hammer',.48);actor.hammerImpact=.18/ANIMATION_PLAY_RATE;gameFX.hammerSwing(actor);const visual=attachHeldHammer(actor,prop('propHammer',1.25));if(visual)hazards.push({mesh:visual,type:'visual',time:.48});

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
function resolveLocalHammer(actor,state){
 const point=actor.group.position;
 if(round.mode==='balloon'){const result=resolveBalloonHammer(round,state.id,avatars.map(a=>a.group.position),avatars.map(a=>a.group.rotation.y));if(result)say(result.blocked?'SPHERE BLOCK!':result.target===0?(round.actors[0].balloons?'ONE BALLOON LEFT!':'BOTH BALLOONS POPPED!'):'BALLOON POP!',1);return;}
 for(const other of round.actors){const event=['diretide','tiletide','strikers','balloon','splash'].includes(round.mode),friendly=round.mode==='strikers'?other.team===state.team:other.id===state.id;if((event?friendly:other.role===state.role)||other.caught||other.inSmoke)continue;const a=avatars[other.id];if(point.distanceTo(a.group.position)<EVENT_HAMMER_RADIUS&&withinSight(point,a.group.position,false)){setEffect(other,a.grounded?'stunned':'airStunned',round.mode==='tiletide'?TILE_STUN_SECONDS:round.mode==='strikers'?STRIKER_HAMMER_STUN_SECONDS:event?EVENT_STUN_SECONDS:2);state.stuns=(state.stuns||0)+1;}}
}
function limitItems(owner,type,max){const all=hazards.filter(h=>h.owner===owner&&h.type===type&&h.time>0);for(let i=0;i<all.length-max;i++)all[i].time=0;}

function move(a,dx,dz,dt,speed){return advanceActor(a,round.actors[a.id],dx,dz,dt,{grid,map:mapData.id,tilt:shipAngle,speed,furniture:furniturePhysics,respawn:()=>spot(0,0)});}
function animate(a,state,dt){if(round.mode==='balloon'&&state.eliminated)return;a.seatMarker.rotation.y=-a.group.rotation.y;const falling=round.mode==='tiletide'&&state.fell;if(falling){a.fallWait??=state.fallDelay||0;a.group.visible=true;a.group.rotation.x=0;a.group.rotation.z=0;if(a.fallWait>0){a.fallWait=Math.max(0,a.fallWait-dt);a.anim.play('idle');a.anim.update(dt);return;}if(!a.fallStarted){a.fallStarted=true;a.fallDepth=0;a.fallVelocity=1.3;gameAudio.play('Player_Spin_Out',a.id===0?1:.55,.05);}a.fallVelocity+=dt*6;a.fallDepth+=a.fallVelocity*dt;a.group.position.y=-a.fallDepth;a.group.visible=a.fallDepth<11;if(!a.group.visible)return;}else if(['diretide','tiletide'].includes(round.mode)){a.group.visible=!state.eliminated;if(!a.group.visible)return;}a.captureTint.update(state);let name=falling?'jet':animationFor(state,a.speed>.16,!a.grounded);if(round.mode==='strikers'&&round.resetClock>GOAL_RESET_SECONDS)name=state.team===round.goalTeam?'dance':'idle';if(round.mode==='splash'&&state.throwTime>0)name='hammer';if(name==='rocket'&&state.effectTime<4.5)name='jet';a.anim.play(name,{loop:falling||!['hammer','stunned','airStunned','busted','rocket','kick'].includes(name),rate:['policeRun','thiefRun'].includes(name)?(mapData.id==='iceberg'||round.mode==='strikers')?2:mapData.id==='grassfield'?1.3:1:1});a.anim.update(dt);a.group.userData.animation=name;gameFX.bananaSpin(a,state,dt,{reduced});gameFX.run(a,dt);gameFX.jetpack(a,state,dt,matchCamera,{reduced});if(a.hammerImpact>0){a.hammerImpact-=dt;if(a.hammerImpact<=0){if(!online&&round.phase==='playing'&&state.effect==='hammer'&&!state.caught&&!state.inSmoke)resolveLocalHammer(a,state);const impact=a.group.position.clone().add(new THREE.Vector3(Math.sin(a.group.rotation.y)*.9,0,Math.cos(a.group.rotation.y)*.9));const y=heightAt(impact.x,impact.z);impact.y=Number.isFinite(y)?y:a.group.position.y;gameFX.hammer(impact,{reduced});eventView?.hammer?.(impact);gameAudio.play('Tool_Hammer_Impact',a.id===0?1:.45);cameraShake=Math.max(cameraShake,.198);}}}
function updateGame(dt){
 const starting=round.startRemaining>0||round.resetClock>0;if(round.mode==='splash')stepSplash(round,dt,avatars.map(a=>a.group.position));else if(round.mode==='diretide')stepDiretide(round,dt);else if(round.mode==='tiletide')stepTiletide(round,dt,avatars.map(a=>a.group.position));else if(round.mode==='strikers')stepStrikers(round,dt,avatars.map(a=>a.group.position));else if(round.mode==='balloon')stepBalloon(round,dt);else stepRound(round,dt);if(round.phase!=='playing')return;if(round.resetClock===GOAL_RESET_SECONDS)resetStrikerPlayers(avatars);if(starting||round.resetClock>0){clearInput();for(const a of avatars)animate(a,round.actors[a.id],dt);return;}smokeCoverage();shipAngle=mapData.id==='sunken'?shipTilt(300-round.remaining):0;matchRoot.rotation.z=shipAngle;matchRoot.position.copy(shipPivot).sub(shipPivot.clone().applyAxisAngle(new THREE.Vector3(0,0,1),shipAngle));if(mapData.id!=='sunken')matchRoot.position.set(0,0,0);const chaser=round.actors.find(a=>a.role==='chaser'),cop=avatars[chaser?.id],wishes=[];
 for(const state of round.actors){
  const a=avatars[state.id];state.interacting=false;
  if(state.caught){a.vx=a.vz=0;cancelInteraction(round,state.id);a.mark=null;for(const h of hazards)if(h.type==='marker'&&h.owner===state.id)h.time=0;if(!(round.mode==='tiletide'&&state.fell))move(a,0,0,dt,0);animate(a,state,dt);continue;}
  let dx=0,dz=0,wants=false;
  if(state.id===0||couchHuman(room,state.id)){const keyboard=movementInput(keys,bindings),local=room?.mode==='couch'?couchInputFor(room,state.id,couchInputs,{keyboard,touch:input,interact:interactHeld}):{x:input.x+keyboard.x+padMovement.x,z:-input.z+keyboard.z+padMovement.z,interact:interactHeld};const direction=screenToWorld(local.x,local.z);dx=direction.x;dz=direction.z;wants=local.interact;}
  else if(round.mode==='splash'){const command=splashBotInput(round,state.id,a.group.position);dx=command.x;dz=command.z;wants=command.interact;}
  else if(round.mode==='balloon'){
   const p=a.group.position,target=new THREE.Vector3(...balloonBotGoal(round,state.id,avatars.map(x=>x.group.position)));if(p.distanceTo(target)>.12){dx=target.x-p.x;dz=target.z-p.z;}const rival=round.actors.find(o=>o.id!==state.id&&!o.eliminated&&p.distanceTo(avatars[o.id].group.position)<2.8);if(rival&&state.toolCooldowns[0]<=0)useTool(0,state.id);else if(rival&&state.toolCooldowns[1]<=0&&p.distanceTo(avatars[rival.id].group.position)<1.35)useTool(1,state.id);
  }else if(round.mode==='strikers'){
   const p=a.group.position,target=new THREE.Vector3(...strikerBotGoal(round,state.id,avatars.map(x=>x.group.position)));wants=true;if(p.distanceTo(target)>.15){dx=target.x-p.x;dz=target.z-p.z;}const rival=round.actors.some(o=>o.team!==state.team&&p.distanceTo(avatars[o.id].group.position)<2.4);if(rival&&state.toolCooldowns[0]<=0)useTool(0,state.id);
  }else if(round.mode==='tiletide'){
   const p=a.group.position,target=new THREE.Vector3(...tileBotGoal(round,state.id));if(p.distanceTo(target)>.12){dx=(target.x-p.x);dz=(target.z-p.z);}if(round.tileClock<2.4&&round.actors.some(o=>o.id!==state.id&&!o.eliminated&&p.distanceTo(avatars[o.id].group.position)<EVENT_HAMMER_RADIUS*.8))useTool(0,state.id);
  }else if(round.mode==='diretide'){
   const p=a.group.position,target=new THREE.Vector3(...eventBotGoal(round,state.id,p));wants=true;if(p.distanceTo(target)>((state.candy>=8||state.depositWell!==null||state.candy>0&&round.remaining<10)&&['sleeping','returning'].includes(round.boss.stage)?1.5:.18)){const d=steerBot(a,target,dt);dx=d.x;dz=d.z;}
   if(round.actors.some(o=>o.id!==state.id&&!o.eliminated&&p.distanceTo(avatars[o.id].group.position)<EVENT_HAMMER_RADIUS*.9))useTool(0,state.id);
  }else if(state.role==='chaser'){
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
  const botEdge=round.mode==='tiletide'&&state.id!==0&&!couchHuman(room,state.id)&&state.effect!=='banana'?a.group.position.clone():null,moved=move(a,dx,dz,dt,movementSpeed(state.role,mapData.id,state.id===0||couchHuman(room,state.id),state.effect==='rocket'&&state.effectTime>0));if(botEdge&&!tileStageContains(round,a.group.position)){a.group.position.copy(botEdge);a.vx=a.vz=a.slideX=a.speed=0;}if(!moved&&state.effect==='banana'&&state.effectTime>0)state.spinDirection=rollSpinDirection();if(!moved&&state.id!==0&&!locked&&Math.hypot(dx,dz)>.1){a.routeTime=0;}animate(a,state,dt);wishes.push({id:state.id,wants:wants&&!locked});
 }
 furniturePhysics?.step(dt,avatars);
 for(const h of hazards)h.time-=dt;smokeCoverage();for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];if(h.type==='smoke')animateSmokeBomb(h.mesh,dt);else if(h.type==='banana')animateBananaHazard(h.mesh,dt);animateHazardTelegraph(h.mesh,dt);animatePlayerMirage(h.mesh,dt);if(h.type==='banana'&&h.time>0)for(const state of round.actors){const event=['diretide','tiletide','strikers','balloon','splash'].includes(round.mode),friendly=round.mode==='strikers'?state.team===round.actors[h.owner]?.team:state.id===h.owner;if(state.caught||state.inSmoke||(event?friendly:state.role===h.ownerRole)||state.effectTime>0)continue;if(avatars[state.id].group.position.distanceTo(h.mesh.position)<.8){setEffect(state,'banana',round.mode==='tiletide'?TILE_BANANA_SECONDS:round.mode==='balloon'?BALLOON_BANANA_SECONDS:event?EVENT_BANANA_SECONDS:2);h.time=0;break;}}if(h.time<=0){disposeHazard(h);hazards.splice(i,1);}}
 for(const r of round.actors.filter(a=>!['diretide','tiletide','strikers','balloon','splash'].includes(round.mode)&&a.role==='runner')){const p=cop.group.position,q=avatars[r.id].group.position;if(detectThiefAt(round,chaser.id,r.id,dt,p,q,withinSight(p,q))){gameFX.capture(q,p);gameAudio.capture(r.id,avatars);cop.vx=cop.vz=cop.slideX=cop.speed=0;cancelInteraction(round,r.id);if(r.id===0)stopInteract();say(r.id===0?'CAPTURED!':'CATCHING THIEF!',1);}}
 if(cop)cop.detectionZone.update(hasDetectedThief(round,avatars,chaser.id,(p,q)=>withinSight(p,q)),round.phase==='playing'&&!chaser.inSmoke);
 for(const c of round.caches)c.harvester=null;
 if(round.mode==='strikers')updateStrikerPossession(round,avatars.map(a=>a.group),dt);
 for(const wish of wishes){if(round.mode==='splash'){const a=avatars[wish.id];splashFire(round,wish.id,a.group.position,a.group.rotation.y,wish.wants);continue;}if(round.mode==='strikers'){const group=avatars[wish.id].group,human=wish.id===0||couchHuman(room,wish.id);if(wish.wants&&(human||strikerBotWantsShot(round,wish.id,group.position,group.rotation.y)))strikerShoot(round,wish.id);continue;}const target=wish.wants?interactionTarget(wish.id):null,key=target?target.type+':'+target.target.id:null,actor=avatars[wish.id];if(actor.interactionKey!==key||!target)cancelInteraction(round,wish.id);actor.interactionKey=key;if(target)performInteraction(wish.id,target,dt);}
 if(round.mode==='diretide')collectEventCandy(round,avatars.map(a=>a.group.position),(p,q)=>withinSight(p,new THREE.Vector3(...q),false,1.1));
}
function clearStageVerdict(){document.body.classList.remove('round-ending');$('#stage-verdict').hidden=true;$('#stage-verdict').classList.remove('is-lose');$('#round-fade').style.opacity='0';}
function advanceFinishedRound(dt){if(!round||round.phase!=='finished'||round.endStarted)return;if(round.mode==='balloon'&&round.actors.some(state=>state.eliminated&&(!avatars[state.id].popLaunch||avatars[state.id].popLaunch.age<BALLOON_LAUNCH_SECONDS)))return;if(round.mode==='tiletide'&&round.actors.some(state=>state.fell)){round.fallOutro??=2;round.fallOutro-=dt;if(!online)for(const state of round.actors)if(state.fell)animate(avatars[state.id],state,dt);if(round.fallOutro>0)return;}beginStageVerdict();}
function beginStageVerdict(){
 for(const actor of avatars)if(actor.detectionZone)actor.detectionZone.group.visible=false;round.endStarted=true;round.endElapsed=0;paused=false;clearInput();document.body.classList.add('round-ending');const freeForAll=['diretide','tiletide','balloon','splash'].includes(round.mode),teamMode=round.mode==='strikers',won=teamMode?round.winnerTeam===round.actors[0].team:freeForAll?round.winnerId===0:round.winner===round.playerRole;
 $('#stage-verdict').classList.toggle('is-lose',!won);$('#stage-verdict-title').textContent=teamMode?(round.reason==='draw'?'DRAW':won?'VICTORY!':'DEFEAT'):freeForAll?(round.reason==='draw'?'DRAW':room?.mode==='couch'?'P'+(round.winnerId+1)+' WINS!':won?'VICTORY!':'DEFEAT'):room?.mode==='couch'?(round.winner==='chaser'?'POLICE WIN!':'THIEVES WIN!'):won?'VICTORY!':'DEFEAT';$('#stage-verdict-reason').textContent=round.mode==='splash'?'TIME UP · MOST TURF WINS':round.mode==='strikers'?'RED '+round.score[1]+' · '+round.score[0]+' BLUE':round.mode==='diretide'?(round.reason==='draw'?'ALL WELLS DESTROYED · DRAW':'LAST WELL STANDING'):round.mode==='tiletide'?(round.reason==='draw'?'NO PLAYER SURVIVED · DRAW':'LAST PLAYER STANDING'):round.mode==='balloon'?(round.reason==='draw'?'EVERY BALLOON POPPED · DRAW':'LAST BALLOON STANDING'):round.reason==='timeout'?'TIME UP':round.reason==='money'?'ALL MONEY STOLEN':'ALL THIEVES CAUGHT';$('#stage-verdict').hidden=false;
 gameAudio.verdict(round,won);uiEffects.sounds.play(won?'victory_fanfare':'defeat_jingle');$('#toast').textContent='';
 for(const a of avatars)a.anim.play((teamMode?round.actors[a.id].team===round.winnerTeam:freeForAll?a.id===round.winnerId:round.actors[a.id].role===round.winner)?'dance':'idle');
}
function tickStageVerdict(elapsed){
 if(!round?.endStarted||round.resultsShown||document.hidden)return;round.endElapsed+=Math.min(elapsed,1);const view=stageEndState(round.endElapsed);$('#round-fade').style.opacity=String(view.fade);for(const a of avatars)a.anim.update(Math.min(elapsed,.1));gameFX.update(Math.min(elapsed,.1));
 if(view.ready){round.resultsShown=true;clearStageVerdict();showFinalResults();}
}
function refreshOnlineRematch(){
 if(!online||ui.results.hidden)return;const button=$('#again');button.disabled=!room.canHost;button.textContent=room.canHost?(['diretide','tiletide','strikers','balloon','splash'].includes(round.mode)?'PLAY AGAIN →':'ONE MORE CHASE →'):'WAITING FOR HOST';
}
function createStrikersWinnerPortraits(){
 const portraits=[];
 for(const host of ui.results.querySelectorAll('[data-winner-portrait]')){
  const actor=avatars[Number(host.dataset.winnerPortrait)];
  if(!actor)continue;
  try{portraits.push(createResultPortrait(host,{scene:actor.model},clips,true));}
  catch(error){console.warn('Winner portrait could not be rendered',error);}
 }
 return {update(dt){for(const portrait of portraits)portrait.update(dt);},dispose(){for(const portrait of portraits)portrait.dispose();}};
}
function showFinalResults(){
 const won=round.mode==='strikers'?round.winnerTeam===round.actors[0].team:['diretide','tiletide','balloon','splash'].includes(round.mode)?round.winnerId===0:round.winner===round.playerRole;if(!round.profileRecorded){profile=recordMatch(readProfile(localStorage),{id:round.profileId,won});saveProfile(localStorage,profile);round.profileRecorded=true;labels();}
  gameAudio.results(round,won);const resultCostume=room?.mode==='couch'?room.players[0].costume:costume;show('results');renderResults(ui.results,{round,won,profile,costume:resultCostume,players:room?.players||[],map:mapData?.id||'mall',sounds:uiEffects.sounds,onAgain:online?()=>online.control('rematch'):room?.mode==='couch'?couchRematch:start,onMenu:menu,reduced,online:!!online,couch:room?.mode==='couch',playOutcome:false});try{if(round.mode==='strikers')resultPortrait=createStrikersWinnerPortraits();else resultPortrait=createResultPortrait(ui.results.querySelector('.result-character-host'),templates[resultCostume],clips,won,resultCostume==='oyen'?model=>applyOyenAppearance(model,oyenAppearance):COLOR_COSTUMES.includes(resultCostume)?model=>applyCostumeAppearance(model,resultCostume,costumeAppearances[resultCostume]):null);}catch(error){console.warn('Character portrait could not be rendered',error);}if(room?.mode==='couch'&&!round.mode){$('#result-title').textContent=round.winner==='chaser'?'POLICE WIN!':'THIEVES WIN!';$('#again').textContent='BACK TO COUCH LOBBY';}refreshOnlineRematch();
}

function updateHud(){
 if(round.mode!=='strikers')$('#interact').setAttribute('aria-label','Interact');
 if(round.mode==='diretide'){updateEventHud();return;}
 if(round.mode==='tiletide'){updateTileHud();return;}
 if(round.mode==='strikers'){updateStrikersHud();return;}
 if(round.mode==='splash'){updateSplashHud();return;}
 if(round.mode==='balloon'){updateBalloonHud();return;}
 $('#crew-status').hidden=false;$('#money-status').classList.remove('event-candy-status');$('#crew-status').classList.remove('event-wells');$('#interact .control-label').textContent='INTERACT';
 syncCacheCelebrations();
 const seconds=Math.ceil(round.remaining);$('#timer').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;updateMoneyBar($('#money-status'),round.collected,round.totalMoney);
 const crew=$('#crew-status'),outfitFor=a=>room?.mode==='couch'?room.players[a.id].costume:a.id===0?costume:room?.players[a.id]?.costume||'thief',crewSignature=round.actors.map(a=>[a.id,a.role,outfitFor(a),a.caught,a.captureRemaining>0,Math.ceil(a.releaseCooldown)].join(':')).join('|');if(crew.dataset.signature!==crewSignature){crew.dataset.signature=crewSignature;crew.replaceChildren(...round.actors.filter(a=>a.role==='runner').map(a=>{const chip=document.createElement('span'),capturing=a.captureRemaining>0;chip.className=`crew-chip crew-head${a.caught?' caught':''}${a.id===0?' is-self':''}${capturing?' is-capturing':''}`;const label=`${a.id===0?'You':room?.players[a.id]?.name||'Thief '+a.id}: ${capturing?'being captured':a.caught?(a.releaseCooldown>0?'release in '+Math.ceil(a.releaseCooldown)+' seconds':'ready for rescue'):'free'}`;chip.setAttribute('role','img');chip.setAttribute('aria-label',label);chip.title=label;const image=document.createElement('img');image.src='assets/pnt/portraits/'+outfitFor(a)+'.png';image.alt='';chip.append(image);if(a.caught||capturing){const cross=document.createElement('b');cross.className='crew-cross';cross.textContent='×';cross.setAttribute('aria-hidden','true');chip.append(cross);}if(a.caught&&a.releaseCooldown>0){const timer=document.createElement('small');timer.className='crew-release';timer.textContent=Math.ceil(a.releaseCooldown);timer.setAttribute('aria-hidden','true');chip.append(timer);}return chip;}));}
 if(room?.mode==='couch'){updateCouchHud($('#couch-hud'),room,round,bindings);return;}
 const state=round.actors[0],actor=avatars[0];state.toolCooldowns.forEach((cd,slot)=>{const tool=TOOLS.find(t=>t.id===actor.tools[slot]);$('#tool-action'+(slot+1)).classList.toggle('cooling-down',cd>0);$('#tool-status'+(slot+1)).textContent=cd>0?Math.ceil(cd)+'s':'';$('#tool-action'+(slot+1)).disabled=cd>0||state.captureLock>0||state.inSmoke||round.startRemaining>0||state.caught||state.captureRemaining>0;$('#tool-action-label'+(slot+1)).textContent=tool.id==='rewind'&&actor.mark?'RETURN':tool.key;});
 const target=interactionTarget(0);$('#interact').disabled=round.startRemaining>0||state.inSmoke&&target?.type!=='rescue'||state.caught||state.effectTime>0||state.role==='chaser'||state.captureRemaining>0;
}

function updateTileHud(){
 const state=round.actors[0],actor=avatars[0];$('#timer').textContent=round.tileStage==='reveal'?'DROP':round.tileStage==='return'?'':String(Math.max(0,Math.ceil(round.tileClock)));$('#role-label').textContent=`TILE TUMBLE · ROUND ${round.cycle}`;$('#role-label').style.color='';$('#money-status').classList.remove('event-candy-status');$('#crew-status').hidden=true;$('#interact').disabled=true;$('#interact .control-label').textContent='NO INTERACT';
 if(room?.mode==='couch'){updateCouchHud($('#couch-hud'),room,round,bindings);return;}state.toolCooldowns.forEach((cd,slot)=>{const tool=TOOLS.find(t=>t.id===actor.tools[slot]),button=$('#tool-action'+(slot+1));button.classList.toggle('cooling-down',cd>0);button.disabled=cd>0||state.eliminated||state.effectTime>0||round.startRemaining>0;$('#tool-status'+(slot+1)).textContent=cd>0?Math.ceil(cd)+'s':'';$('#tool-action-label'+(slot+1)).textContent=tool.key;});
}
function updateBalloonHud(){
 const state=round.actors[0],actor=avatars[0],alive=round.actors.filter(item=>!item.eliminated).length;
 $('#timer').textContent=`${alive} PLAYER${alive===1?'':'S'} LEFT`;$('#role-label').textContent=`P${1+(state.seat??0)} · ${state.balloons} / 2 BALLOONS`;$('#role-label').style.color='#fff';$('#money-status').classList.remove('event-candy-status');$('#crew-status').hidden=true;$('#interact').disabled=true;$('#interact .control-label').textContent='NO INTERACT';
 if(room?.mode==='couch'){updateCouchHud($('#couch-hud'),room,round,bindings);return;}
 state.toolCooldowns.forEach((cd,slot)=>{const tool=TOOLS.find(t=>t.id===actor.tools[slot]),button=$('#tool-action'+(slot+1));button.classList.toggle('cooling-down',cd>0);button.disabled=cd>0||state.eliminated||state.effectTime>0||round.startRemaining>0;$('#tool-status'+(slot+1)).textContent=cd>0?Math.ceil(cd)+'s':'';$('#tool-action-label'+(slot+1)).textContent=tool.key;});
}
let strikersHudRound,strikersHudGoals=0,strikersHudCue='';
function updateStrikersHud(){
 const goals=round.score[0]+round.score[1];
 if(strikersHudRound!==round.profileId){strikersHudRound=round.profileId;strikersHudGoals=0;strikersHudCue='';}
 if(goals>strikersHudGoals){if(round.resetClock>0){cameraShake=Math.max(cameraShake,.9);if(round.goalPosition)gameFX.strikersGoal(new THREE.Vector3(...round.goalPosition));}strikersHudGoals=goals;}
 const cue=round.resetClock>.0?(round.resetClock>3?'GOAL!':String(Math.ceil(round.resetClock))):strikersHudCue&&strikersHudCue!=='GO!'?'GO!':'';
 if(cue!==strikersHudCue){strikersHudCue=cue;if(cue)say(cue,cue==='GO!'?.65:1.1);}
 const state=round.actors[0],actor=avatars[0],seconds=Math.ceil(round.remaining);
 const clock=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 const timer=$('#timer');
 if(!timer.querySelector('.strikers-score')){
  timer.innerHTML='<span class="strikers-score red"><small></small><b></b></span><span class="strikers-clock"></span><span class="strikers-score blue"><small></small><b></b></span>';
 }
 timer.querySelector('.strikers-clock').textContent=clock;
 timer.querySelectorAll('.strikers-score').forEach(panel=>{
  const team=panel.classList.contains('blue')?0:1;
  panel.querySelector('small').textContent=STRIKER_TEAMS[team].name+(room?.mode!=='couch'&&state.team===team?' · YOU':'');
  panel.querySelector('b').textContent=round.score[team];
 });
 $('#role-label').textContent=state.buff?state.buff.toUpperCase()+' '+Math.ceil(state.buffTime)+'s':round.ball.carrier===0?'BALL AT YOUR FEET':'SLIPPERY SHOOTS';
 $('#role-label').style.color='';
 $('#money-status').classList.remove('event-candy-status');
 $('#crew-status').hidden=true;
 $('#interact .control-label').textContent='SHOOT';
 $('#interact').setAttribute('aria-label','Shoot');
 $('#interact').disabled=round.startRemaining>0||round.resetClock>0||round.ball.carrier!==0||state.effectTime>0||state.shootCooldown>0;
 if(room?.mode==='couch'){updateCouchHud($('#couch-hud'),room,round,bindings);return;}state.toolCooldowns.forEach((cd,slot)=>{const tool=TOOLS.find(t=>t.id===actor.tools[slot]),button=$('#tool-action'+(slot+1));button.classList.toggle('cooling-down',cd>0);button.disabled=cd>0||state.effectTime>0||round.startRemaining>0;$('#tool-status'+(slot+1)).textContent=cd>0?Math.ceil(cd)+'s':'';$('#tool-action-label'+(slot+1)).textContent=tool.key;});
}

function positionMatchCamera(){const view=matchView(menuCamera.aspect,stageFrame,round?.mode==='balloon'?{horizontal:.682,vertical:.731}:undefined),strikers=round?.mode==='strikers',zoom=strikers?.72:round?.mode==='tiletide'?.8:1,distance=view.distance*zoom;scene.fog.near=distance+20;scene.fog.far=distance+85;const far=distance+180;if(matchCamera.far!==far){matchCamera.far=far;matchCamera.updateProjectionMatrix();}const cameraZoom=round?.mode==='splash'?1.21:1.1;if(matchCamera.zoom!==cameraZoom){matchCamera.zoom=cameraZoom;matchCamera.updateProjectionMatrix();}matchCamera.position.copy(cameraTarget).add(new THREE.Vector3(...view.offset).multiplyScalar(zoom));const slide=strikers?-.55:0;matchCamera.position.x+=slide;const shake=reduced?{x:0,z:0}:shakeOffset(shakeTime,cameraShake*settings.cameraShake);matchCamera.position.x+=shake.x;matchCamera.position.z+=shake.z;matchCamera.lookAt(cameraTarget.x+slide,cameraTarget.y,cameraTarget.z);}

async function boot(){beginLoading('GETTING READY');try{let done=0;const names=['thief','police','mall-slice'];const items=await Promise.all(names.map(async name=>{const value=await getGLB(name,`assets/pnt/${name}.glb`);progress(++done/4*70,`Loading ${name==='mall-slice'?'Mall promenade':name}…`);return value;}));templates={thief:items[0],police:items[1]};const response=await fetch('assets/pnt/animations/clips.json?v=idle-b1');if(!response.ok)throw new Error('Animation download failed');const data=await response.json();clips=Object.fromEntries(Object.entries(data.clips).map(([name,clip])=>[name,THREE.AnimationClip.parse(clip)]));progress(75,'Preparing the walkable arena…');const arena=items[2].scene;menuArena=arena;arena.updateMatrixWorld(true);const initial=new THREE.Box3().setFromObject(arena),center=initial.getCenter(new THREE.Vector3());arena.position.add(new THREE.Vector3(-center.x,-initial.min.y,-center.z));scene.add(arena);arena.updateMatrixWorld(true);setArenaSurface(arena);arena.traverse(o=>{if(o.isMesh){if(solidForGameplay(o))ground.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){if(m.map)m.map.anisotropy=2;}}});bounds=new THREE.Box3().setFromObject(arena);buildGround();menuNavigation={ground,bounds,grid};await ensureCostume();progress(90,'Warming up characters and fonts…');previewModel();await document.fonts.ready;await renderer.compileAsync(scene,menuCamera);progress(100,'All set. Let’s play.');ready=true;document.body.dataset.assets='ready';ui.menu.hidden=true;endLoading();titleScreen.show();}catch(e){document.body.dataset.assets='error';loadError(e,()=>location.reload());}}
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
 tileCallout.update(round?.safeTile,round?.mode==='tiletide'&&round.tileStage==='run'&&!ui.hud.hidden,dt);
 if(ready){if(room&&!online&&!ui.lobby.hidden&&!busy&&!document.hidden){if(stepLobby(room,elapsed))start();else if(room.phase==='countdown'){if(room.mode==='couch'){const cancel=$('[data-cancel]');if(cancel)cancel.textContent='CANCEL · '+Math.ceil(room.countdown);}else $('#lobby-counter').textContent=Math.ceil(room.countdown);}}if(round){if(online&&!busy){updateOnlineMatch(Math.min(elapsed,.1));}else if(round.phase==='playing'&&!paused&&!busy&&!phoneLandscape.blocked){const kickSlow=!reduced&&round.mode==='strikers'&&round.actors.some(a=>a.effect==='kick'&&a.kickWindup>0);const steps=simulationSteps(elapsed*(kickSlow?.55:1));for(let i=0;i<steps.count&&round.phase==='playing';i++){updateGame(steps.dt);gameFX.update(steps.dt,matchCamera,{map:mapData?.id,bounds});}updateHud();}if(!paused&&!busy&&!document.hidden)advanceFinishedRound(dt);cameraShake=Math.max(0,cameraShake-elapsed*.7);shakeTime+=elapsed;positionMatchCamera();}
 else if(preview){const homePreview=['home','tools','costume'].includes(activePage);preview.group.scale.setScalar(homePreview?1.5:1);preview.group.rotation.y=homePreview?-Math.PI/6:0;preview.anim.update(dt);if(previewTime>0){previewTime-=dt;if(previewTime<=0)preview.anim.play('idle');}const p=preview.group.position;if(homePreview)frameMenuCharacter(p,dt,now);else{menuCamera.clearViewOffset();menuCamera.position.set(p.x,p.y+1.45,p.z+4.6);menuCamera.lookAt(p.x,p.y+.8,p.z);previewLayout=null;}}}

 moneyTrail.update(['diretide','tiletide','strikers','balloon','splash'].includes(round?.mode)?null:round,position=>{matchRoot.updateMatrixWorld();const cache=round?.caches.find(c=>c.position===position),anchor=cacheAnchors.get(cache?.id)||new THREE.Vector3(...position);const p=matchRoot.localToWorld(anchor.clone()).project(matchCamera);return p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1?{x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight}:null;},elapsed,!!round&&!ui.hud.hidden&&!paused&&!busy&&!document.hidden&&!phoneLandscape.blocked);
 const audioActive=!!round&&round.phase==='playing'&&!(round.startRemaining>0)&&!paused&&!busy&&!document.hidden&&!phoneLandscape.blocked;gameAudio.update(round,avatars,audioActive,!document.hidden&&!phoneLandscape.blocked&&!paused&&(!ui.menu.hidden||!ui.lobby.hidden||audioActive),mapData?.id,room?.mode==='couch'?room.players.flatMap((p,id)=>p&&!p.bot&&((id===0&&interactHeld)||couchInputs.get(id)?.interact)?[id]:[]):interactHeld,room?.mode==='couch',room?.mode==='couch'?room.players.flatMap((p,id)=>p&&!p.bot?[id]:[]):[0]);roundStart.update(round,elapsed);
 if(eventView&&round?.mode==='diretide'&&!busy&&(!paused||online)){eventView.update(round,round.startRemaining>0||round.endStarted?0:dt);if(round.boss.smashes>eventSmashes){eventSmashes=round.boss.smashes;const well=round.wells.find(w=>w.id===round.boss.target);if(well){gameFX.hammer(new THREE.Vector3(...well.position),{reduced});eventView.hammer(new THREE.Vector3(...well.position));gameAudio.play('Tool_Hammer_Impact',1);cameraShake=.35;}}if(round.boss.stage!==eventStage){eventStage=round.boss.stage;if(eventStage==='walking')say('PATRICS IS COMING · TARGET LOCKED',3);}}
 if(eventView&&round?.mode==='tiletide'&&!busy&&(!paused||online))eventView.update(round,round.startRemaining>0||round.endStarted?0:dt);
 if(eventView&&round?.mode==='splash'&&!busy)eventView.update(round,paused&&!online?0:dt,avatars,reduced);
 if(eventView&&round?.mode==='balloon'&&!busy&&(!paused||online)){
  for(const state of round.actors)if(state.eliminated)updateBalloonLaunch(avatars[state.id],state,dt,{fx:gameFX,camera:matchCamera,reduced,play:actor=>gameAudio.tool('rocket',actor.id,avatars),shake:strength=>{cameraShake=Math.max(cameraShake,strength);}});
  if(round.phase==='finished'&&!round.endStarted)gameFX.update(dt,matchCamera,{map:mapData?.id,bounds});
  eventView.update(round,round.startRemaining>0||round.endStarted?0:dt,avatars,position=>gameFX.balloonPop(position),(x,z)=>{
   gameFX.sphereImpact(x,z,BALLOON_SPHERE_RADIUS,{reduced});
   if(!reduced)cameraShake=Math.max(cameraShake,.32);
  });
 }
 if(eventView&&round?.mode==='strikers'&&!busy&&(!paused||online)){
  const playing=round.phase==='playing'&&!(round.startRemaining>0||round.resetClock>0);
  gameFX.strikersBallTrail(playing?round.ball:null,dt,matchCamera);
  eventView.update(round,playing?dt:0,avatars,reduced);
 }
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').textContent='';}updateMarkers();fpsCounter.hidden=!settings.showFps||ui.hud.hidden||busy;
 renderElapsed+=elapsed;
 if(renderGate(now,settings.fpsCap)){if(!ui.lobby.hidden&&!busy)renderLobbyCharacters(Math.min(renderElapsed,.1));else renderer.render(scene,round?matchCamera:menuCamera);fpsFrames++;renderElapsed=0;}
 if(now-fpsSince>=1000){fpsCounter.textContent=Math.round(fpsFrames*1000/(now-fpsSince))+' FPS';fpsSince=now;fpsFrames=0;}
}
const phoneLandscape=desktop?{blocked:false}:configureLandscape({onChange:()=>{clearInput();resize();}});
frame();boot();
function updateSplashHud(){
 const state=round.actors[0],seconds=Math.ceil(round.remaining);$('#timer').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 $('#role-label').textContent='SPLISH SPLASH';$('#role-label').style.color='';$('#crew-status').hidden=true;
 let panel=$('#splash-score');if(!panel){panel=document.createElement('div');panel.id='splash-score';$('#hud').append(panel);}
 const score=round.actors.slice().sort((a,b)=>a.paintSeat-b.paintSeat).map(a=>`<span style="--ink:${SPLASH_COLORS[a.paintSeat]}"><b>P${a.paintSeat+1}</b> ${splashCoverage(round,a).toFixed(1)}%</span>`).join('');if(panel.innerHTML!==score)panel.innerHTML=score;
 $('#tool-action1').disabled=round.startRemaining>0;$('#tool-action2').disabled=round.startRemaining>0||state.ink<30||state.toolCooldowns[1]>0;
 $('#tool-action-label1').textContent=state.diving?'SURFACE':'SUBMERGE';$('#tool-status1').textContent=state.submerged?'REFILLING':state.diving?'FIND YOUR PAINT':'';
 $('#tool-action-label2').textContent='TOSS CAN';$('#tool-status2').textContent=state.toolCooldowns[1]>0?Math.ceil(state.toolCooldowns[1])+'s':'30 INK';
 $('#interact').disabled=round.startRemaining>0;$('#interact').setAttribute('aria-label','Hold to spray paint');$('#interact .control-label').textContent='SPRAY';
 let tank=$('#splash-tank');if(!tank){tank=document.createElement('div');tank.id='splash-tank';$('#hud').append(tank);}
 tank.style.setProperty('--ink',SPLASH_COLORS[state.paintSeat]);tank.innerHTML=`<b>INK ${Math.floor(state.ink/SPLASH_INK_CAPACITY*100)}%</b><meter min="0" max="${SPLASH_INK_CAPACITY}" value="${state.ink}"></meter><small>${state.submerged?'REFILLING':state.diving?'MOVE INTO YOUR PAINT':state.ink<3?'SUBMERGE TO REFILL':'HOLD '+actionLabel('interact')+' TO SPRAY'}</small>`;
 if(room?.mode==='couch'){$('#couch-hud').innerHTML=round.actors.map(a=>`<div class="couch-hud-player" style="--player-color:${SPLASH_COLORS[a.paintSeat]}"><span><b>P${a.paintSeat+1} · INK ${Math.floor(a.ink/SPLASH_INK_CAPACITY*100)}%</b><small>${a.submerged?'REFILLING':a.diving?'FIND YOUR PAINT':'A: SPRAY · X: DIVE · Y: CAN'}</small></span></div>`).join('');}
}
