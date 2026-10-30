import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {GLTFLoader}=await import('../../vendor/three/jsm/loaders/GLTFLoader.js');
const {clone}=await import('../../vendor/three/jsm/utils/SkeletonUtils.js');
const {COLOR_COSTUMES,outfitColors,normalizeCostumeAppearance,loadCostumeAppearances,saveCostumeAppearances,applyCostumeAppearance}=await import('../../src/pnt/costume-appearance.js');
const {createCaptureTint}=await import('../../src/pnt/capture-ui.js');
const loader=new GLTFLoader();loader.register(()=>({name:'geometry-only',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const meshes=model=>{const out=[];model.traverse(o=>{if(o.isMesh)out.push(o);});return out;};

test('preferences are independent per supported costume and tolerate unavailable or corrupt storage',()=>{
 let saved;const storage={getItem:()=>saved,setItem:(k,v)=>{saved=v;}};
 const prefs=loadCostumeAppearances(storage);prefs.thief={outfit:'urban',skin:'dark'};prefs.raptor={outfit:'violet',skin:'original'};
 saveCostumeAppearances(storage,prefs);assert.deepEqual(loadCostumeAppearances(storage),prefs);
 assert.equal(loadCostumeAppearances(storage).police.outfit,'original');
 assert.deepEqual(normalizeCostumeAppearance({outfit:'hack',skin:4}),{outfit:'original',skin:'original'});
 assert.equal(loadCostumeAppearances({getItem:()=>'{bad'}).pingu.outfit,'original');
 assert.doesNotThrow(()=>saveCostumeAppearances({setItem(){throw Error();}},prefs));
});
for(const id of COLOR_COSTUMES){
 const file=['thief','police'].includes(id)?`../../assets/pnt/${id}.glb`:`../../assets/pnt/costumes/${id}.glb`;
 const bytes=readFileSync(new URL(file,import.meta.url)),template=(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 test(`${id}: original stays untouched; colour variants own only materials and preserve capture tint`,()=>{
  const original=clone(template),sources=meshes(template);applyCostumeAppearance(original,id,{}).dispose();
  meshes(original).forEach((m,i)=>assert.equal(m.material,sources[i].material));
  const model=clone(template),parts=meshes(model),appearance=applyCostumeAppearance(model,id,{outfit:'mint',skin:'dark'});
  let outfitParts=0,skinParts=0,disposed=0;
  parts.forEach((m,i)=>{
   assert.equal(m.geometry,sources[i].geometry);assert.equal(m.material.map,sources[i].material.map);assert.equal(m.skeleton.bones.length,sources[i].skeleton.bones.length);
   if(m.material===sources[i].material)return;
   m.material.addEventListener('dispose',()=>disposed++);
   const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.material.onBeforeCompile(shader);
   outfitParts+=shader.uniforms.uCostumeMode.value>0;skinParts+=shader.uniforms.uCostumeFace.value>0;
  });
  assert.equal(outfitParts,2);assert.ok(skinParts>=1);
  const tint=createCaptureTint(model),shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};parts[0].material.onBeforeCompile(shader);
  assert.ok(shader.uniforms.uCostumeSkin);assert.ok(shader.uniforms.uCaptureGrey);tint.dispose();appearance.dispose();assert.ok(disposed>=3);
  meshes(template).forEach((m,i)=>assert.equal(m.material,sources[i].material));
  for(const option of outfitColors(id).filter(c=>c.id!=='original')){
   const variant=clone(template),owned=applyCostumeAppearance(variant,id,{outfit:option.id});let changed=0;
   for(const m of meshes(variant)){
    if(!m.material.customProgramCacheKey().includes('costume-v3'))continue;
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.material.onBeforeCompile(shader);changed++;
    assert.equal(shader.uniforms.uCostumeStyle.value,option.id==='security'?1:option.id==='camo'?2:option.id==='urban'?3:0);
    assert.match(shader.vertexShader,/vCostumeRest=position/);
   }
   assert.equal(changed,2);owned.dispose();
  }

 });
}
test('Racer, Pumpkin, Boney and Purple have no recolouring changes',()=>{
 for(const id of ['racer','pumpkin','boney','purple']){const model=new THREE.Group(),source=new THREE.MeshStandardMaterial(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),source);model.add(mesh);applyCostumeAppearance(model,id,{outfit:'mint',skin:'dark'}).dispose();assert.equal(mesh.material,source);}
});

test('costume palettes replace removed choices and migrate saved selections',()=>{
 assert.deepEqual(outfitColors('police').map(c=>c.id),['original','midnight','security','khaki']);
 assert.deepEqual(outfitColors('pingu').map(c=>c.id),['original','midnight','mint','red']);
 assert.deepEqual(outfitColors('thief').map(c=>c.id),['original','midnight','urban','camo']);
 assert.equal(normalizeCostumeAppearance({outfit:'violet',skin:'dark'},'police').outfit,'khaki');
 assert.equal(normalizeCostumeAppearance({outfit:'mint'},'police').outfit,'security');
 assert.equal(normalizeCostumeAppearance({outfit:'violet'},'thief').outfit,'camo');
 assert.equal(normalizeCostumeAppearance({outfit:'mint',skin:'dark'},'thief').outfit,'urban');
 assert.equal(normalizeCostumeAppearance({outfit:'violet'},'pingu').outfit,'red');
 assert.equal(normalizeCostumeAppearance({outfit:'violet'},'raptor').outfit,'violet');
 assert.equal(normalizeCostumeAppearance({outfit:'camo'},'pingu').outfit,'original');
});
