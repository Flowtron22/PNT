// Deterministic pirate-pursuit music renderer, adapted from Wonder Wave's
// procedural layered-song approach. Original composition; no sampled music.
// Usage: node tools/render-pirate-chase-bgm.mjs [output.wav]
import fs from 'node:fs';
import path from 'node:path';

const output=path.resolve(process.argv[2]||'pirate-chase-bgm.wav');
const rate=44100,bpm=146,beat=60/bpm,bars=24,barDuration=beat*4,duration=bars*barDuration;
const length=Math.ceil(duration*rate),left=new Float32Array(length),right=new Float32Array(length);
let seed=0x534541;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)*2-1;
const midi=note=>440*2**((note-69)/12),clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function mix(index,value,pan=0){if(index<0||index>=length)return;left[index]+=value*Math.sqrt((1-pan)*.5);right[index]+=value*Math.sqrt((1+pan)*.5);}
function oscillator(type,phase,progress){const p=phase-Math.floor(phase),s1=Math.sin(phase*Math.PI*2),s2=Math.sin(phase*Math.PI*4),s3=Math.sin(phase*Math.PI*6),s4=Math.sin(phase*Math.PI*8);
 if(type==='pluck')return s1*.7+s2*.21*(1-progress)**1.3+s3*.09*(1-progress)**2;
 if(type==='reed')return s1*.68+s2*.2+s3*.08+s4*.04;
 if(type==='brass')return s1*.72+s2*.17+s3*.08+s4*.03;
 if(type==='fiddle')return s1*.75+s2*.17+s3*.06+s4*.02;
 return s1*.84+s2*.11+s3*.05;
}
function tone(start,dur,note,{type='warm',amp=.1,pan=0,attack=.008,release=.07,vibrato=0,slide=0,echo=0}={}){const begin=Math.floor(start*rate),count=Math.floor(dur*rate),base=midi(note);let phase=0;
 for(let i=0;i<count;i++){const t=i/rate,p=i/Math.max(1,count-1),freq=base*2**(slide*p/12)*(1+Math.sin(t*Math.PI*10.4)*vibrato);phase+=freq/rate;const env=Math.min(1,t/attack,Math.max(0,(dur-t)/release)),value=oscillator(type,phase,p)*amp*env;mix(begin+i,value,pan);if(echo)mix(begin+i+Math.floor(beat*.5*rate),value*echo,-pan*.55);}}
function kick(start,amp=.4){const begin=Math.floor(start*rate),dur=.2,count=Math.floor(dur*rate);let phase=0;for(let i=0;i<count;i++){const p=i/count;phase+=(150*(1-p)**3+45)/rate;mix(begin+i,(Math.sin(phase*Math.PI*2)*amp+random()*.025*(1-p)**12)*(1-p)**2.3);}}
function deckTom(start,note=48,amp=.2,pan=0){const begin=Math.floor(start*rate),dur=.24,count=Math.floor(dur*rate);let phase=0;for(let i=0;i<count;i++){const p=i/count;phase+=(note*(1-p*.24))/rate;mix(begin+i,(Math.sin(phase*Math.PI*2)+random()*.11)*amp*(1-p)**3,pan);}}
function snare(start,amp=.19){const begin=Math.floor(start*rate),dur=.14,count=Math.floor(dur*rate);let last=0;for(let i=0;i<count;i++){const p=i/count,n=random(),bright=n-last*.68;last=n;mix(begin+i,(bright*.8+Math.sin(i/rate*Math.PI*350)*.2)*amp*(1-p)**3,(i&1)?.07:-.07);}}
function shaker(start,accent=false,pan=0){const begin=Math.floor(start*rate),dur=accent?.085:.035,count=Math.floor(dur*rate);let a=0,b=0;for(let i=0;i<count;i++){const p=i/count,n=random(),high=n-a*.72-b*.18;b=a;a=n;mix(begin+i,high*(accent?.052:.027)*(1-p)**4,pan);}}
function crash(start,amp=.12){const begin=Math.floor(start*rate),dur=.75,count=Math.floor(dur*rate);let last=0;for(let i=0;i<count;i++){const p=i/count,n=random(),high=n-last*.45;last=n;mix(begin+i,high*amp*(1-p)**1.8,(i&1)?.18:-.18);}}
function chord(start,notes,amp=.032){for(let i=0;i<notes.length;i++)tone(start,.42*beat,notes[i],{type:'reed',amp,pan:(i-(notes.length-1)/2)*.2,attack:.025,release:.14,vibrato:.0018});}

// D-minor pursuit progression, arranged in eight-bar phrases.
const roots=[38,34,41,36,43,38,33,38];
const chords=[[50,53,57],[46,50,53],[53,57,60],[48,52,55],[55,58,62],[50,53,57],[45,49,52],[50,53,57]];
const bass=[0,0,7,0,12,7,5,7,0,7,12,10];
const arp=[0,7,12,15,12,7,3,7,12,15,19,15];
const leadA=[12,null,15,14,12,10,12,15,17,15,14,null];
const leadB=[19,17,15,14,12,null,10,12,14,15,12,null];
const leadC=[12,15,19,17,15,14,12,10,12,14,15,17];

for(let bar=0;bar<bars;bar++){const start=bar*barDuration,section=Math.floor(bar/8),index=bar%8,root=roots[index],step=barDuration/12;if(index===0)crash(start,section===2?.15:.11);
 // Galloping deck percussion in 12/8, with tom fills at each phrase end.
 for(let s=0;s<12;s++){const t=start+s*step;if([0,3,6,9].includes(s))kick(t,s===0?.44:.3);if(s===3||s===9)snare(t,.19);shaker(t,s%3===0,s%2?.32:-.28);}
 deckTom(start+6*step,58,.14,-.32);deckTom(start+8*step,66,.12,.3);
 if(index===7){deckTom(start+9*step,68,.16,-.35);deckTom(start+10*step,76,.18,0);deckTom(start+11*step,88,.2,.35);}
 // Rolling bass, plucked-string ostinato and accordion-like offbeat chords.
 for(let s=0;s<12;s++)tone(start+s*step,step*.82,root+bass[s],{type:'warm',amp:.105,pan:-.08,attack:.007,release:.075,slide:s===11?-2:0});
 for(let s=0;s<12;s++)tone(start+s*step,step*.68,root+12+arp[(s+bar*2)%12],{type:'pluck',amp:.027+section*.004,pan:s%2?.48:-.48,attack:.004,release:.055,echo:.1});
 for(const s of [1,4,7,10])chord(start+s*step,chords[index],section===2?.04:.033);
 // Original call-and-response lead: restrained fiddle, then fuller brass/fiddle unison.
 const phrase=section===0?(bar%2?leadB:leadA):section===1?(bar%2?leadA:leadB):leadC;
 for(let s=0;s<12;s++){const interval=phrase[s];if(interval===null)continue;const t=start+s*step,note=root+interval+12;tone(t,step*.9,note,{type:'fiddle',amp:section===2?.052:.043,pan:.13,attack:.018,release:.09,vibrato:.0038,echo:.1});if(section===2&&s%3===0)tone(t,step*.82,note-12,{type:'brass',amp:.026,pan:-.16,attack:.028,release:.1,vibrato:.0015});}
 if(index===3||index===7)for(let i=0;i<3;i++)tone(start+(9+i)*step,step*.8,69+i*2+(section?12:0),{type:'brass',amp:.035,pan:-.2+i*.2,attack:.025,release:.08});
}

// Smooth saturation, DC-safe high-pass, loop-edge fade and peak normalization.
let previousL=0,previousR=0,filteredL=0,filteredR=0,peak=0;for(let i=0;i<length;i++){const satL=Math.tanh(left[i]*1.18),satR=Math.tanh(right[i]*1.18);filteredL=.995*(filteredL+satL-previousL);filteredR=.995*(filteredR+satR-previousR);previousL=satL;previousR=satR;const edge=Math.min(1,i/(rate*.02),(length-1-i)/(rate*.02));left[i]=filteredL*edge;right[i]=filteredR*edge;peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));}
const gain=.9/Math.max(.001,peak),dataBytes=length*4,wav=Buffer.alloc(44+dataBytes);wav.write('RIFF',0);wav.writeUInt32LE(36+dataBytes,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(dataBytes,40);
for(let i=0,offset=44;i<length;i++){wav.writeInt16LE(Math.round(clamp(left[i]*gain,-1,1)*32767),offset);wav.writeInt16LE(Math.round(clamp(right[i]*gain,-1,1)*32767),offset+2);offset+=4;}
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,wav);console.log(`Rendered ${bars} bars at ${bpm} BPM (${duration.toFixed(2)} s, peak ${peak.toFixed(3)}) to ${output}`);
