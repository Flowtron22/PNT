const TOOL_SOUNDS={hammer:'Tool_Hammer_Activate',banana:'Tool_Banana_Throw',smoke:'Tool_Smoke_Throw',rocket:'Tool_Jetpack_Launch',rewind:'Tool_Rewind_Teleport'};
const CLIPS=['Match_Countdown','Match_Start','Player_Land','Player_Launch','Player_Spin_Out','Player_Stunned','Police_Capture_Start','Police_Capture_Success','Thief_Escape','Thief_Loot_Stolen','Tool_Banana_Slip','Tool_Banana_Throw','Tool_Hammer_Activate','Tool_Hammer_Impact','Tool_Jetpack_Flight','Tool_Jetpack_Land','Tool_Jetpack_Launch','Tool_Rewind_Box_Deploy','Tool_Rewind_Teleport','Tool_Smoke_Activate','Tool_Smoke_Throw','gameplay-bgm'];
export function createGameplayAudio(getEngine){
 let context=null,sfx=null,music=null,loading=null,musicVoice=null,match=null,previous=[],enabled=localStorage.getItem('pnt-game-sfx')!=='off',musicEnabled=localStorage.getItem('pnt-game-music')!=='off';
 const buffers=new Map(),last=new Map(),loops=new Map(),voices=new Set();
 function unlock(){const engine=getEngine();engine.init();context=engine.ctx;if(!context)return;engine.resume();if(!sfx){sfx=context.createGain();sfx.gain.value=enabled?.55:0;sfx.connect(engine.master);music=context.createGain();music.gain.value=musicEnabled?.2:0;music.connect(engine.master);}}
 async function prepare(){unlock();if(!context)return;if(loading)return loading;loading=Promise.all(CLIPS.filter(name=>!buffers.has(name)).map(async name=>{try{const response=await fetch(`assets/pnt/audio/${name}.mp3`);if(!response.ok)return;buffers.set(name,await context.decodeAudioData(await response.arrayBuffer()));}catch{}})).finally(()=>{loading=null;});return loading;}
 function voice(name,{volume=1,loop=false,bus=sfx}={}){if(!context||context.state!=='running'||!buffers.has(name)||!bus)return null;const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.get(name);source.loop=loop;gain.gain.value=volume;source.connect(gain);gain.connect(bus);const item={source,gain,stop(){try{source.stop();}catch{}}};voices.add(item);source.onended=()=>{voices.delete(item);source.disconnect();gain.disconnect();};source.start();return item;}
 function play(name,volume=1,cooldown=.08){if(!enabled||!context)return;const now=context.currentTime;if(now-(last.get(name)??-Infinity)<cooldown)return;last.set(name,now);voice(name,{volume});}
 function distanceVolume(id,actors){if(!actors[id]||!actors[0])return 0;return id===0?1:Math.max(0,1-actors[id].group.position.distanceTo(actors[0].group.position)/18)*.65;}
 function tool(name,id,actors){const volume=distanceVolume(id,actors);if(volume<=0)return;play(TOOL_SOUNDS[name],volume);if(name==='smoke')play('Tool_Smoke_Activate',volume*.8);}
 function stop(){for(const item of voices)item.stop();loops.clear();musicVoice=null;previous=[];match=null;}
 function stopEffects(){for(const item of voices)if(item!==musicVoice)item.stop();loops.clear();previous=[];match=null;}
 function update(round,actors,active,musicActive=active){
  if(!round){if(match)stopEffects();}
  else if(match!==round.profileId){stopEffects();match=round.profileId;previous=round.actors.map(a=>({...a}));void prepare();}
  if(musicActive&&musicEnabled&&!musicVoice)musicVoice=voice('gameplay-bgm',{bus:music,loop:true});
  if((!musicActive||!musicEnabled)&&musicVoice){musicVoice.stop();musicVoice=null;}
  if(!round)return;
  round.actors.forEach((state,id)=>{const before=previous[id]||state,volume=distanceVolume(id,actors),flying=state.effect==='rocket'&&state.effectTime>0;
   if(active){if(state.caught&&!before.caught)play('Police_Capture_Success',volume);if(!state.caught&&before.caught)play('Thief_Escape',volume);if(state.effect!==before.effect&&state.effectTime>0){if(state.effect==='banana')play('Tool_Banana_Slip',volume);if(['stunned','airStunned'].includes(state.effect))play('Player_Stunned',volume);}if(before.effect==='rocket'&&!flying)play('Tool_Jetpack_Land',volume);if(state.detectionProgress>0&&!before.detectionProgress&&state.role==='runner'&&round.playerRole==='chaser')play('Police_Capture_Start',volume,.8);if(state.interacting&&!before.interacting&&round.caches?.some(cache=>cache.harvester===id))play('Thief_Loot_Stolen',volume*.45,.2);}
   if(active&&enabled&&flying&&volume>0){if(!loops.has(id)){const item=voice('Tool_Jetpack_Flight',{loop:true,volume:volume*.4});if(item)loops.set(id,item);}else loops.get(id).gain.gain.value=volume*.4;}else if(loops.has(id)){loops.get(id).stop();loops.delete(id);}
  });
  previous=round.actors.map(a=>({...a}));
 }
 return {unlock,prepare,play,tool,update,stop,get enabled(){return enabled;},get musicEnabled(){return musicEnabled;},setEnabled(value){enabled=!!value;localStorage.setItem('pnt-game-sfx',enabled?'on':'off');if(sfx)sfx.gain.value=enabled?.55:0;},setMusic(value){musicEnabled=!!value;localStorage.setItem('pnt-game-music',musicEnabled?'on':'off');if(music)music.gain.value=musicEnabled?.2:0;}};
}
