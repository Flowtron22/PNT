// Deterministic Iceberg pursuit music renderer, adapted from Wonder Wave's
// layered procedural-song approach. Original composition; no sampled music.
// Usage: node tools/render-iceberg-chase-bgm.mjs [output.wav]
import fs from 'node:fs';
import path from 'node:path';

const output=path.resolve(process.argv[2]||'iceberg-chase-bgm.wav');
const rate=44100,bpm=120,beat=60/bpm,bars=32,barDuration=beat*4,duration=bars*barDuration;
const length=Math.ceil(duration*rate),left=new Float32Array(length),right=new Float32Array(length);
let seed=0x494345;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)*2-1;
const midi=note=>440*2**((note-69)/12),clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function mix(index,value,pan=0){if(index<0||index>=length)return;left[index]+=value*Math.sqrt((1-pan)*.5);right[index]+=value*Math.sqrt((1+pan)*.5);}
function wave(type,phase,progress){const s1=Math.sin(phase*Math.PI*2),s2=Math.sin(phase*Math.PI*4),s3=Math.sin(phase*Math.PI*6),s4=Math.sin(phase*Math.PI*8);
 if(type==='ice')return s1*.68+s2*.2*(1-progress)**1.2+s3*.09*(1-progress)**2+s4*.03*(1-progress)**3;
 if(type==='bow')return s1*.78+s2*.14+s3*.06+s4*.02;
 if(type==='horn')return s1*.74+s2*.17+s3*.07+s4*.02;
 if(type==='air')return s1*.9+s2*.07+s3*.03;
 return s1*.84+s2*.11+s3*.05;
}
function tone(start,dur,note,{type='warm',amp=.1,pan=0,attack=.008,release=.08,vibrato=0,slide=0,echo=0}={}){const begin=Math.floor(start*rate),count=Math.floor(dur*rate),base=midi(note);let phase=0;
 for(let i=0;i<count;i++){const t=i/rate,p=i/Math.max(1,count-1),freq=base*2**(slide*p/12)*(1+Math.sin(t*Math.PI*9.6)*vibrato);phase+=freq/rate;const env=Math.min(1,t/attack,Math.max(0,(dur-t)/release)),value=wave(type,phase,p)*amp*env;mix(begin+i,value,pan);if(echo)mix(begin+i+Math.floor(beat*.75*rate),value*echo,-pan*.55);}}
function kick(start,amp=.4){const begin=Math.floor(start*rate),dur=.19,count=Math.floor(dur*rate);let phase=0;for(let i=0;i<count;i++){const p=i/count;phase+=(138*(1-p)**3+43)/rate;mix(begin+i,(Math.sin(phase*Math.PI*2)*amp+random()*.022*(1-p)**13)*(1-p)**2.4);}}
function tundraDrum(start,note=58,amp=.19,pan=0){const begin=Math.floor(start*rate),dur=.28,count=Math.floor(dur*rate);let phase=0;for(let i=0;i<count;i++){const p=i/count;phase+=(note*(1-p*.18))/rate;mix(begin+i,(Math.sin(phase*Math.PI*2)+random()*.08)*amp*(1-p)**3.2,pan);}}
function snare(start,amp=.18){const begin=Math.floor(start*rate),dur=.14,count=Math.floor(dur*rate);let last=0;for(let i=0;i<count;i++){const p=i/count,n=random(),bright=n-last*.7;last=n;mix(begin+i,(bright*.82+Math.sin(i/rate*Math.PI*390)*.18)*amp*(1-p)**3,(i&1)?.08:-.08);}}
function frostHat(start,open=false,pan=0){const begin=Math.floor(start*rate),dur=open?.13:.042,count=Math.floor(dur*rate);let a=0,b=0;for(let i=0;i<count;i++){const p=i/count,n=random(),high=n-a*.76-b*.12;b=a;a=n;mix(begin+i,high*(open?.048:.032)*(1-p)**(open?2.2:5),pan);}}
function swell(start,amp=.075){const begin=Math.floor(start*rate),dur=1.1,count=Math.floor(dur*rate);let last=0;for(let i=0;i<count;i++){const p=i/count,n=random(),high=n-last*.55;last=n;mix(begin+i,high*amp*Math.sin(p*Math.PI)**1.4,(i&1)?.2:-.2);}}
function pad(start,notes,amp=.018){for(let i=0;i<notes.length;i++)tone(start,barDuration*.92,notes[i],{type:'air',amp,pan:(i-(notes.length-1)/2)*.22,attack:.32,release:.34,vibrato:.0012});}

// F-sharp minor with suspended/modal turns for a cold, urgent chase colour.
const roots=[42,38,45,40,47,42,37,40];
const chords=[[54,57,61],[50,54,57],[57,61,64],[52,56,59],[59,62,66],[54,57,61],[49,52,56],[52,56,59]];
const bass=[0,0,7,0,12,7,10,7];
const arp=[0,7,12,15,19,15,12,7,3,7,12,15,19,22,19,12];
const leadA=[12,null,null,15,null,null,14,null,12,null,null,10,null,12,null,null];
const leadB=[19,null,17,null,15,null,null,14,null,12,null,null,10,null,null,null];
const leadC=[12,null,15,null,19,null,17,null,15,null,14,null,12,null,10,null];

for(let bar=0;bar<bars;bar++){const start=bar*barDuration,section=bar<16?0:bar<24?1:2,index=bar%8,root=roots[index],step=beat/4;if(index===0)swell(start,section===2?.075:.055);
 // Relaxed half-time chase pulse with broad tundra drums and sparse frost hats.
 for(let s=0;s<16;s+=2){const t=start+s*step;if(s===0||s===8)kick(t,s===0?.36:.28);if(s===4||s===12)snare(t,.145);frostHat(t,s===14,s%4?.24:-.22);}
 tundraDrum(start+2.5*beat,62,.1,-.22);
 if(index===7){tundraDrum(start+3.5*beat,72,.11,-.25);tundraDrum(start+3.75*beat,82,.12,.25);}
 // Warm low strings, a spacious crystalline pulse and continuous frozen-air pad.
 for(let e=0;e<8;e++)tone(start+e*beat/2,beat*.42,root+bass[e],{type:'warm',amp:.078,pan:-.06,attack:.012,release:.11,slide:e===7?-2:0});
 for(let s=0;s<16;s+=2)tone(start+s*step,step*1.45,root+12+arp[(s+bar*3)%16],{type:'ice',amp:.014+section*.0015,pan:s%4?.4:-.4,attack:.006,release:.12,echo:.13});
 pad(start,chords[index],section===2?.021:.019);
 // Sparse bowed-string phrases keep motion without turning the track into a battle cue.
 const phrase=section===0?(bar%2?leadB:leadA):section===1?(bar%2?leadA:leadB):leadC;
 for(let s=0;s<16;s++){const interval=phrase[s];if(interval===null)continue;const t=start+s*step,note=root+interval+12;tone(t,step*1.65,note,{type:'bow',amp:section===2?.035:.03,pan:.1,attack:.04,release:.14,vibrato:.0028,echo:.07});}
 if(index===7)for(let i=0;i<2;i++)tone(start+(3.25+i*.5)*beat,beat*.38,69+i*5+(section?12:0),{type:'horn',amp:.02,pan:-.12+i*.24,attack:.06,release:.15});
}

// Smooth saturation, DC-safe high-pass, click-free loop edge and normalization.
let previousL=0,previousR=0,filteredL=0,filteredR=0,peak=0;for(let i=0;i<length;i++){const satL=Math.tanh(left[i]*1.17),satR=Math.tanh(right[i]*1.17);filteredL=.995*(filteredL+satL-previousL);filteredR=.995*(filteredR+satR-previousR);previousL=satL;previousR=satR;const edge=Math.min(1,i/(rate*.02),(length-1-i)/(rate*.02));left[i]=filteredL*edge;right[i]=filteredR*edge;peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));}
const gain=.84/Math.max(.001,peak),dataBytes=length*4,wav=Buffer.alloc(44+dataBytes);wav.write('RIFF',0);wav.writeUInt32LE(36+dataBytes,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(dataBytes,40);
for(let i=0,offset=44;i<length;i++){wav.writeInt16LE(Math.round(clamp(left[i]*gain,-1,1)*32767),offset);wav.writeInt16LE(Math.round(clamp(right[i]*gain,-1,1)*32767),offset+2);offset+=4;}
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,wav);console.log(`Rendered ${bars} bars at ${bpm} BPM (${duration.toFixed(2)} s, peak ${peak.toFixed(3)}) to ${output}`);
