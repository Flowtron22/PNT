// Deterministic, original retro-arcade chase music renderer.
// Usage: node tools/render-chase-bgm.mjs [output.wav]
import fs from 'node:fs';
import path from 'node:path';

const output=path.resolve(process.argv[2]||'chase-bgm.wav');
const rate=44100,bpm=152,beat=60/bpm,bars=32,duration=bars*4*beat;
const length=Math.ceil(duration*rate),left=new Float32Array(length),right=new Float32Array(length);
let seed=0x504e54;
const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)*2-1;
const midi=note=>440*2**((note-69)/12);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function mix(index,value,pan=0){
 if(index<0||index>=length)return;
 left[index]+=value*Math.sqrt((1-pan)*.5);right[index]+=value*Math.sqrt((1+pan)*.5);
}
function wave(type,phase){
 const turn=phase-Math.floor(phase);
 if(type==='pulse')return turn<.25?1:-1;
 if(type==='square')return turn<.5?1:-1;
 if(type==='triangle')return 1-4*Math.abs(turn-.5);
 return Math.sin(phase*Math.PI*2);
}
function tone(start,dur,note,{type='square',amp=.1,pan=0,attack=.006,release=.06,vibrato=0,slide=0}={}){
 const begin=Math.floor(start*rate),count=Math.floor(dur*rate),base=midi(note);let phase=0;
 for(let i=0;i<count;i++){
  const t=i/rate,p=i/Math.max(1,count-1),freq=base*2**((slide*p)/12)*(1+Math.sin(t*Math.PI*11)*vibrato);
  phase+=freq/rate;
  const env=Math.min(1,t/attack,Math.max(0,(dur-t)/release));
  mix(begin+i,wave(type,phase)*amp*env,pan);
 }
}
function kick(start,amp=.42){
 const begin=Math.floor(start*rate),dur=.18,count=Math.floor(dur*rate);let phase=0;
 for(let i=0;i<count;i++){const t=i/rate,p=t/dur,freq=145*(1-p)**3+48;phase+=freq/rate;mix(begin+i,Math.sin(phase*Math.PI*2)*amp*(1-p)**2.4);}
}
function snare(start,amp=.2){
 const begin=Math.floor(start*rate),dur=.15,count=Math.floor(dur*rate);let last=0;
 for(let i=0;i<count;i++){const p=i/count,n=random(),bright=n-last*.72;last=n;const body=Math.sin(i/rate*Math.PI*2*185);mix(begin+i,(bright*.78+body*.22)*amp*(1-p)**3,(i&1)?.08:-.08);}
}
function hat(start,open=false,amp=.075,pan=0){
 const begin=Math.floor(start*rate),dur=open?.16:.045,count=Math.floor(dur*rate);let last=0;
 for(let i=0;i<count;i++){const p=i/count,n=random(),high=n-last;last=n;mix(begin+i,high*amp*(1-p)**(open?2:5),pan);}
}
function chord(start,notes,amp=.035){for(let i=0;i<notes.length;i++)tone(start,.16,notes[i],{type:'pulse',amp,pan:(i-1)*.22,attack:.003,release:.08});}

const roots=[40,36,43,38]; // E minor: Em, C, G, D
const chordNotes=[[52,55,59],[48,52,55],[50,55,59],[50,54,57]];
const arpOffsets=[0,7,12,15,12,7,3,7,0,7,12,19,15,12,7,3];
const bassPattern=[0,0,7,0,12,7,10,7];
const leadA=[12,null,14,15,19,15,14,null,12,14,15,null,10,12,7,null];
const leadB=[19,17,15,14,12,null,14,15,17,15,14,12,10,null,7,null];
const leadC=[12,15,19,22,19,17,15,14,12,15,17,19,22,19,17,null];

for(let bar=0;bar<bars;bar++){
 const barTime=bar*4*beat,progress=bar/bars,chordIndex=bar%4,root=roots[chordIndex];
 // Drums: steady pursuit pulse with fills at phrase endings.
 for(let step=0;step<16;step++){
  const time=barTime+step*beat/4;
  if(step%4===0)kick(time,step===0?.46:.34);
  if(step===4||step===12)snare(time,.22);
  if(step%2===0)hat(time,step===14,.06+(step%4?0:.018),step%4?.26:-.2);
  else if(bar>=8)hat(time,false,.032,-.28);
 }
 if(bar%8===7){snare(barTime+3.5*beat,.15);snare(barTime+3.75*beat,.17);}
 // Springy triangle bass and bright off-beat chord shots.
 for(let eighth=0;eighth<8;eighth++)tone(barTime+eighth*beat/2,.32*beat,root+bassPattern[eighth],{type:'triangle',amp:.13,pan:-.06,attack:.004,release:.055,slide:eighth===7?-2:0});
 for(const offbeat of [.5,1.5,2.5,3.5])chord(barTime+offbeat*beat,chordNotes[chordIndex],bar>=24?.042:.034);
 // Continuous low-level arpeggio supplies the procedural clockwork feel.
 for(let step=0;step<16;step++)tone(barTime+step*beat/4,.16*beat,root+12+arpOffsets[(step+bar*3)%16],{type:'pulse',amp:.022+(progress*.012),pan:step%2?.45:-.45,attack:.002,release:.035});
 // Two-bar call-and-response lead; later sections climb for more urgency.
 if(bar>=2){
  const phrase=bar<16?(bar%4<2?leadA:leadB):leadC;
  for(let step=0;step<16;step++){const interval=phrase[(step+(bar%2)*8)%16];if(interval!==null)tone(barTime+step*beat/4,.2*beat,root+interval+12,{type:bar>=16?'square':'pulse',amp:bar>=24?.066:.052,pan:.12,attack:.004,release:.045,vibrato:.0015});}
 }
 // Short rising alarm response without using any existing melody.
 if(bar%4===3)for(let i=0;i<4;i++)tone(barTime+(3+i*.25)*beat,.18*beat,72+i*2,{type:'square',amp:.045,pan:-.18+i*.12,attack:.003,release:.04});
}

// Gentle saturation, DC-safe high-pass, and peak normalization.
let previousL=0,previousR=0,filteredL=0,filteredR=0,peak=0;
for(let i=0;i<length;i++){
 const saturatedL=Math.tanh(left[i]*1.22),saturatedR=Math.tanh(right[i]*1.22);
 filteredL=.995*(filteredL+saturatedL-previousL);filteredR=.995*(filteredR+saturatedR-previousR);
 previousL=saturatedL;previousR=saturatedR;left[i]=filteredL;right[i]=filteredR;peak=Math.max(peak,Math.abs(filteredL),Math.abs(filteredR));
}
const gain=.89/Math.max(.001,peak),dataBytes=length*4,wav=Buffer.alloc(44+dataBytes);
wav.write('RIFF',0);wav.writeUInt32LE(36+dataBytes,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(dataBytes,40);
for(let i=0,offset=44;i<length;i++){wav.writeInt16LE(Math.round(clamp(left[i]*gain,-1,1)*32767),offset);wav.writeInt16LE(Math.round(clamp(right[i]*gain,-1,1)*32767),offset+2);offset+=4;}
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,wav);
console.log(`Rendered ${bars} bars at ${bpm} BPM (${duration.toFixed(2)} s) to ${output}`);
