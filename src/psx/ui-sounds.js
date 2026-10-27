import {AudioEngine} from '../wonder-wave/audio/audio.js';
// Keep Wonder Wave's synthesis, envelopes, pitch jitter, reverb and gain staging.
// Wet gameplay texture prewarming and music are unnecessary for the menu sounds.
class MenuAudio extends AudioEngine{_warm(){}}
export function createUISounds(){
 const engine=new MenuAudio({music:false});let enabled=true;const last=new Map();
 try{enabled=localStorage.getItem('pnt-ui-sounds')!=='off';}catch{}
 return {engine,get enabled(){return enabled;},unlock(){if(enabled){try{engine.init();engine.resume();}catch{}}},
  setEnabled(value){enabled=!!value;try{localStorage.setItem('pnt-ui-sounds',enabled?'on':'off');}catch{}engine.setVolumes({sfx:enabled?.85:0});if(enabled)this.unlock();},
  play(name){if(!enabled||!engine.ready)return;const now=performance.now()/1000;if(now-(last.get(name)??-Infinity)<(name==='ui_hover'?.035:.03))return;last.set(name,now);try{engine.play(name);}catch{}}
 };
}
