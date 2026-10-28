// Deterministic Iceberg pursuit music renderer, adapted from Wonder Wave's
// layered procedural-song approach. Original composition; no sampled music.
// Usage: node tools/render-iceberg-chase-bgm.mjs [output.wav]
import fs from 'node:fs';
import path from 'node:path';

const output=path.resolve(process.argv[2]||'iceberg-chase-bgm.wav');
const rate=44100,bpm=150,beat=60/bpm,bars=24,barDuration=beat*4,duration=bars*barDuration;
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
const leadA=[12,null,14,15,19,17,15,null,12,14,15,null,10,12,14,null];
const leadB=[19,17,15,14,12,null,14,15,17,19,17,15,14,null,10,null];
const leadC=[12,15,19,22,19,17,15,14,12,15,17,19,22,24,22,null];

for(let bar=0;bar<bars;bar++){const start=bar*barDuration,section=Math.floor(bar/8),index=bar%8,root=roots[index],step=beat/4;if(index===0)swell(start,section===2?.1:.07);
 // Firm chase pulse with broad tundra drums rather than retro noise percussion.
 for(let s=0;s<16;s++){const t=start+s*step;if(s%4===0)kick(t,s===0?.44:.31);if(s===4||s===12)snare(t,.19);frostHat(t,s===14,s%2?.34:-.3);}
 tundraDrum(start+2*beat,64,.14,-.28);tundraDrum(start+3.5*beat,72,.13,.3);
 if(index===7){tundraDrum(start+3.25*beat,76,.16,-.35);tundraDrum(start+3.5*beat,86,.18,0);tundraDrum(start+3.75*beat,96,.2,.35);}
 // Low-string ostinato, crystalline mallet pattern and slow frozen-air pad.
 for(let e=0;e<8;e++)tone(start+e*beat/2,beat*.4,root+bass[e],{type:'warm',amp:.105,pan:-.08,attack:.008,release:.085,slide:e===7?-2:0});
 for(let s=0;s<16;s++)tone(start+s*step,step*.78,root+12+arp[(s+bar*3)%16],{type:'ice',amp:.022+section*.004,pan:s%2?.5:-.5,attack:.003,release:.07,echo:.17});
 if(section>0||bar%2===0)pad(start,chords[index],section===2?.021:.016);
 // Bowed-string lead grows into horn-supported pursuit in the final section.
 const phrase=section===0?(bar%2?leadB:leadA):section===1?(bar%2?leadA:leadB):leadC;
 for(let s=0;s<16;s++){const interval=phrase[s];if(interval===null)continue;const t=start+s*step,note=root+interval+12;tone(t,step*.92,note,{type:'bow',amp:section===2?.052:.041,pan:.12,attack:.022,release:.09,vibrato:.0032,echo:.09});if(section===2&&s%4===0)tone(t,step*.86,note-12,{type:'horn',amp:.027,pan:-.16,attack:.035,release:.11,vibrato:.001});}
 if(index===3||index===7)for(let i=0;i<4;i++)tone(start+(3+i*.25)*beat,beat*.22,73+i*2+(section?12:0),{type:'horn',amp:.031,pan:-.24+i*.16,attack:.03,release:.08});
}

// Smooth saturation, DC-safe high-pass, click-free loop edge and normalization.
let previousL=0,previousR=0,filteredL=0,filteredR=0,peak=0;for(let i=0;i<length;i++){const satL=Math.tanh(left[i]*1.17),satR=Math.tanh(right[i]*1.17);filteredL=.995*(filteredL+satL-previousL);filteredR=.995*(filteredR+satR-previousR);previousL=satL;previousR=satR;const edge=Math.min(1,i/(rate*.02),(length-1-i)/(rate*.02));left[i]=filteredL*edge;right[i]=filteredR*edge;peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));}
const gain=.9/Math.max(.001,peak),dataBytes=length*4,wav=Buffer.alloc(44+dataBytes);wav.write('RIFF',0);wav.writeUInt32LE(36+dataBytes,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(dataBytes,40);
for(let i=0,offset=44;i<length;i++){wav.writeInt16LE(Math.round(clamp(left[i]*gain,-1,1)*32767),offset);wav.writeInt16LE(Math.round(clamp(right[i]*gain,-1,1)*32767),offset+2);offset+=4;}
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,wav);console.log(`Rendered ${bars} bars at ${bpm} BPM (${duration.toFixed(2)} s, peak ${peak.toFixed(3)}) to ${output}`);
