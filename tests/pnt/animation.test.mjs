import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {makeAnimator,animationFor}=await import('../../src/pnt/animation.js');
const data=JSON.parse(readFileSync(new URL('../../assets/pnt/animations/clips.json',import.meta.url)));
const clips=Object.fromEntries(Object.entries(data.clips).map(([name,clip])=>[name,THREE.AnimationClip.parse(clip)]));
function rig(file){
 const b=readFileSync(new URL('../../assets/pnt/'+file,import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 const nodes=j.nodes.map(n=>{const o=new THREE.Bone();o.name=n.name||'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);return o;});
 j.nodes.forEach((n,i)=>n.children?.forEach(child=>nodes[i].add(nodes[child])));const root=new THREE.Group();nodes.filter(n=>!n.parent).forEach(n=>root.add(n));return root;
}
test('idle B retains its root height and keeps both feet planted through a full loop on every costume',()=>{
 assert.match(data.source,/sk_chr_idleB/);assert.ok(clips.idle.tracks.some(t=>t.name==='Bip001.position'));
 for(const file of ['thief.glb','police.glb',...readdirSync(new URL('../../assets/pnt/costumes/',import.meta.url)).map(n=>'costumes/'+n)]){
  const model=rig(file);model.updateMatrixWorld(true);const feet=['Bip001-L-Foot','Bip001-R-Foot'].map(name=>model.getObjectByName(name));
  const standingHeight=feet.map(foot=>foot.getWorldPosition(new THREE.Vector3()).y),heights=[[],[]],anim=makeAnimator(model,clips,'runner');
  for(let i=0;i<Math.ceil(clips.idle.duration*30);i++){anim.update(1/30);model.updateMatrixWorld(true);feet.forEach((foot,k)=>heights[k].push(foot.getWorldPosition(new THREE.Vector3()).y));}
  heights.forEach((values,k)=>{assert.ok(Math.max(...values)-Math.min(...values)<.001,file+': idle foot must not lift vertically');assert.ok(Math.abs(values[0]-standingHeight[k])<.02,file+': idle must retain standing ground contact');});anim.dispose();
 }
});
for(const [file,role,clip]of [['thief.glb','runner','thiefRun'],['police.glb','chaser','policeRun']]){
 test(`${file}: actual run keys move leg bones and survive repeated transitions`,()=>{
  const model=rig(file),anim=makeAnimator(model,clips,role),leg=model.getObjectByName('Bip001-L-Thigh');anim.play(clip,{fade:0});anim.update(.11);const pose=leg.quaternion.clone();anim.update(.23);assert.ok(pose.angleTo(leg.quaternion)>.05,'run must visibly change the thigh rotation');
  anim.play('idle',{fade:0});anim.update(.2);anim.play(clip,{fade:0});anim.update(.15);assert.equal(anim.current,clip);assert.ok(leg.quaternion.toArray().every(Number.isFinite));anim.dispose();
 });
}
test('all supplied action clips have changing rotations and bind to every costume',()=>{
 for(const name of ['hammer','stunned','airStunned','banana','jet','rocket','busted','bustedIdle','dance'])assert.ok(clips[name]?.tracks.some(t=>{const a=new THREE.Quaternion().fromArray(t.values,0);for(let i=4;i<t.values.length;i+=4)if(a.angleTo(new THREE.Quaternion().fromArray(t.values,i))>.02)return true;return false;}),name+' must have motion');
 for(const file of readdirSync(new URL('../../assets/pnt/costumes/',import.meta.url))){const model=rig('costumes/'+file),anim=makeAnimator(model,clips,'runner');for(const name of Object.keys(clips)){anim.play(name,{fade:0});anim.update(.2);assert.ok(anim.actions[name].getClip().tracks.length>=15,file+': '+name);}anim.dispose();}
});
test('run playback can double without restarting and other clips keep their normal rate',()=>{
 const anim=makeAnimator(rig('thief.glb'),clips,'runner');anim.play('thiefRun',{rate:2,fade:0});anim.update(.1);assert.equal(anim.actions.thiefRun.getEffectiveTimeScale(),2.6);const time=anim.actions.thiefRun.time;anim.play('thiefRun',{rate:2});assert.equal(anim.actions.thiefRun.time,time);anim.play('idle',{fade:0});assert.equal(anim.actions.idle.getEffectiveTimeScale(),1.3);anim.play('thiefRun',{fade:0});assert.equal(anim.actions.thiefRun.getEffectiveTimeScale(),1.3);anim.dispose();
});
test('animation priority keeps captured and stunned characters from running',()=>{
 assert.equal(animationFor({caught:false,role:'runner',effectTime:0},true,false),'thiefRun');assert.equal(animationFor({caught:false,role:'chaser',effectTime:0},true,false),'policeRun');assert.equal(animationFor({caught:false,role:'runner',effectTime:1,effect:'banana'},true,false),'banana');assert.equal(animationFor({caught:true,caughtTime:.1},true,true),'airStunned');assert.equal(animationFor({caught:true,caughtTime:2},true,false),'bustedIdle');
});

test('flight adds thirty degrees forward pitch without changing source clips or gameplay heading',()=>{
 const model=rig('thief.glb'),anim=makeAnimator(model,clips,'runner');
 const lean=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/6);
 for(const name of ['rocket','jet']){
  const source=clips[name].tracks.find(t=>t.name==='Bip001.quaternion');
  const before=Array.from(source.values),actual=anim.actions[name].getClip().tracks.find(t=>t.name==='Bip001.quaternion');
  for(let i=0;i<source.values.length;i+=4){const expected=new THREE.Quaternion().fromArray(source.values,i).premultiply(lean);assert.ok(expected.normalize().angleTo(new THREE.Quaternion().fromArray(actual.values,i).normalize())<.001);}
  assert.deepEqual(Array.from(source.values),before);
 }
 anim.play('jet',{fade:0});anim.update(.2);anim.play('idle',{fade:0});anim.update(.001);
 assert.ok(model.quaternion.angleTo(new THREE.Quaternion())<.001);anim.dispose();
});
test('banana root spins around world up rather than flipping head over heels',()=>{
 const track=clips.banana.tracks.find(t=>t.name==='Bip001.quaternion'),initial=new THREE.Quaternion().fromArray(track.values).invert();let biggestTurn=0;
 for(let i=0;i<track.values.length;i+=4){const delta=new THREE.Quaternion().fromArray(track.values,i).multiply(initial);const vertical=new THREE.Vector3(0,1,0).applyQuaternion(delta);assert.ok(vertical.y>.999,'banana spin axis must remain vertical');biggestTurn=Math.max(biggestTurn,delta.angleTo(new THREE.Quaternion()));}
 assert.ok(biggestTurn>3,'the authored spin must be preserved');
});
test('hammer begins facing the same way as idle, and returns without changing the actor heading',()=>{
 const first=name=>new THREE.Quaternion().fromArray(clips[name].tracks.find(t=>t.name==='Bip001.quaternion').values);
 assert.ok(first('idle').angleTo(first('hammer'))<.001);
 const track=clips.hammer.tracks.find(t=>t.name==='Bip001.quaternion'),initial=first('hammer').invert();
 for(let i=0;i<track.values.length;i+=4){const delta=new THREE.Quaternion().fromArray(track.values,i).multiply(initial);const forward=new THREE.Vector3(0,0,1).applyQuaternion(delta);assert.ok(Math.abs(forward.x)<.001,'hammer root must lean forward rather than turn sideways');}
 const model=rig('thief.glb'),anim=makeAnimator(model,clips,'runner');anim.play('hammer',{fade:0,loop:false});anim.update(.2);anim.play('idle',{fade:0});anim.update(.001);assert.ok(model.quaternion.angleTo(new THREE.Quaternion())<.001);anim.dispose();
});
