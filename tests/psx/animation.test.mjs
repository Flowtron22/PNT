import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {makeAnimator,animationFor}=await import('../../src/psx/animation.js');
const data=JSON.parse(readFileSync(new URL('../../assets/psx/animations/clips.json',import.meta.url)));
const clips=Object.fromEntries(Object.entries(data.clips).map(([name,clip])=>[name,THREE.AnimationClip.parse(clip)]));
function rig(file){
 const b=readFileSync(new URL('../../assets/psx/'+file,import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 const nodes=j.nodes.map(n=>{const o=new THREE.Bone();o.name=n.name||'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);return o;});
 j.nodes.forEach((n,i)=>n.children?.forEach(child=>nodes[i].add(nodes[child])));const root=new THREE.Group();nodes.filter(n=>!n.parent).forEach(n=>root.add(n));return root;
}
for(const [file,role,clip]of [['thief.glb','runner','thiefRun'],['police.glb','chaser','policeRun']]){
 test(`${file}: actual run keys move leg bones and survive repeated transitions`,()=>{
  const model=rig(file),anim=makeAnimator(model,clips,role),leg=model.getObjectByName('Bip001-L-Thigh');anim.play(clip,{fade:0});anim.update(.11);const pose=leg.quaternion.clone();anim.update(.23);assert.ok(pose.angleTo(leg.quaternion)>.05,'run must visibly change the thigh rotation');
  anim.play('idle',{fade:0});anim.update(.2);anim.play(clip,{fade:0});anim.update(.15);assert.equal(anim.current,clip);assert.ok(leg.quaternion.toArray().every(Number.isFinite));anim.dispose();
 });
}
test('all supplied action clips have changing rotations and bind to every costume',()=>{
 for(const name of ['hammer','stunned','airStunned','banana','jet','rocket','busted','bustedIdle','dance'])assert.ok(clips[name]?.tracks.some(t=>{const a=new THREE.Quaternion().fromArray(t.values,0);for(let i=4;i<t.values.length;i+=4)if(a.angleTo(new THREE.Quaternion().fromArray(t.values,i))>.02)return true;return false;}),name+' must have motion');
 for(const file of readdirSync(new URL('../../assets/psx/costumes/',import.meta.url))){const model=rig('costumes/'+file),anim=makeAnimator(model,clips,'runner');for(const name of Object.keys(clips)){anim.play(name,{fade:0});anim.update(.2);assert.ok(anim.actions[name].getClip().tracks.length>=15,file+': '+name);}anim.dispose();}
});
test('animation priority keeps captured and stunned characters from running',()=>{
 assert.equal(animationFor({caught:false,role:'runner',effectTime:0},true,false),'thiefRun');assert.equal(animationFor({caught:false,role:'chaser',effectTime:0},true,false),'policeRun');assert.equal(animationFor({caught:false,role:'runner',effectTime:1,effect:'banana'},true,false),'banana');assert.equal(animationFor({caught:true,caughtTime:.1},true,true),'airStunned');assert.equal(animationFor({caught:true,caughtTime:2},true,false),'bustedIdle');
});
