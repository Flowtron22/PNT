// Offline FBX -> compact animation clips. The browser never parses FBX or loads its textures.
import {registerHooks} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(join(root,'vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const THREE=await import('../vendor/three/build/three.module.js');
// Only skeletons and keyframes are read in this offline process.
THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
const {FBXLoader}=await import('../vendor/three/jsm/loaders/FBXLoader.js');
const input=resolve(process.argv[2]||join(root,'../assets/characters/3d_Assets/anim'));
const sources={idle:'sk_chr_idleA',thiefRun:'sk_chr_thief_runA',hammer:'sk_chr_hamsmash',stunned:'sk_chr_stunGR',airStunned:'sk_chr_stunAIR',banana:'sk_chr_spin',jet:'sk_chr_jetpack',rocket:'sk_chr_thief_rocketlaunch',busted:'sk_rn_busted',bustedIdle:'sk_rn_busted_idleA',dance:'sk_thief_00_danceA',policeRun:resolve(root,'.local/police-run.fbx')};
const glb=readFileSync(join(root,'assets/psx/thief.glb'));
const gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)));
const normalize=s=>s.replace(/[_\- ]/g,'').toLowerCase();
const names=new Map(gltf.nodes.filter(n=>n.name).map(n=>[normalize(n.name),n.name]));
const output={version:2,source:'Original PSX FBX animations; police run exported from sk_chr_ch_runA; root-local basis corrected',clips:{}};
for(const [name,file]of Object.entries(sources)){
 const data=readFileSync(file.endsWith('.fbx')?file:join(input,file+'.fbx'));
 const group=new FBXLoader().parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 const clip=group.animations[0];if(!clip)throw new Error('No animation: '+name);
 // FBX bone-local axes need a basis change, not a left-side pose correction.
 // The root is already in world Y-up (or has the FBXLoader's Z-up group rotation).
 // Convert its local axes on the RIGHT, preserving world-up spin and authored yaw.
 const basis=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
 const inverseBasis=basis.clone().invert();
 const tracks=[];
 for(const track of clip.tracks){
  const parsed=THREE.PropertyBinding.parseTrackName(track.name),bone=names.get(normalize(parsed.nodeName));
  if(!bone||parsed.propertyName!=='quaternion')continue;
  const values=[];
  for(let i=0;i<track.values.length;i+=4){
   const q=new THREE.Quaternion().fromArray(track.values,i);
   if(bone==='Bip001')q.premultiply(group.quaternion).multiply(inverseBasis);else q.premultiply(basis).multiply(inverseBasis);
   q.normalize();values.push(...q.toArray().map(v=>+v.toFixed(7)));
  }
  tracks.push({name:bone+'.quaternion',type:'quaternion',times:Array.from(track.times,v=>+v.toFixed(6)),values});
 }
 // Keep root motion in the gameplay controller, so attacks cannot teleport the actor.
 const dynamic=tracks.filter(t=>t.values.some((v,i)=>Math.abs(v-t.values[i%4])>.005));
 if(!dynamic.length)throw new Error('Static animation rejected: '+name);
 output.clips[name]={name,duration:clip.duration,tracks};
 console.log(`${name}: ${tracks.length} bones, ${dynamic.length} animated, ${clip.duration.toFixed(2)}s`);
}
mkdirSync(join(root,'assets/psx/animations'),{recursive:true});
writeFileSync(join(root,'assets/psx/animations/clips.json'),JSON.stringify(output));
