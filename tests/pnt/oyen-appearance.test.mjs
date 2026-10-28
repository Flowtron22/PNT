import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {GLTFLoader}=await import('../../vendor/three/jsm/loaders/GLTFLoader.js');
const {clone}=await import('../../vendor/three/jsm/utils/SkeletonUtils.js');
const {applyOyenAppearance,loadOyenAppearance,saveOyenAppearance,normalizeOyenAppearance}=await import('../../src/pnt/oyen-appearance.js');
const loader=new GLTFLoader();loader.register(()=>({name:'geometry-only',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const bytes=readFileSync(new URL('../../assets/pnt/costumes/oyen.glb',import.meta.url)),template=(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
const meshes=model=>{const list=[];model.traverse(o=>{if(o.isMesh)list.push(o);});return list;};
test('Oyen appearance preferences normalize, persist and handle unavailable storage',()=>{
 assert.deepEqual(normalizeOyenAppearance({coat:'invalid',skin:'invalid'}),{coat:'original',skin:'original'});let saved;const storage={setItem:(k,v)=>saved=v,getItem:()=>saved};saveOyenAppearance(storage,{coat:'spots',skin:'dark'});assert.deepEqual(loadOyenAppearance(storage),{coat:'spots',skin:'dark'});assert.equal(loadOyenAppearance({getItem:()=>'{bad'}).coat,'original');assert.doesNotThrow(()=>saveOyenAppearance({setItem(){throw Error();}},{}));
});
test('coat variants preserve the source, eyes, face, rig and gold bell while owning their material resources',()=>{
 const sources=meshes(template);
 for(const coat of ['black','spots','stripes']){
  const model=clone(template),parts=meshes(model),appearance=applyOyenAppearance(model,{coat,skin:'original'});
  for(let i=0;i<parts.length;i++){
   const mesh=parts[i],source=sources[i],cloth=/oyen_(head|body)$/.test(source.material.name);
   assert.equal(mesh.skeleton.bones.length,source.skeleton.bones.length);
   if(!cloth){assert.equal(mesh.material,source.material);assert.equal(mesh.geometry,source.geometry);continue;}
   assert.notEqual(mesh.material,source.material);assert.equal(mesh.material.map,source.material.map);assert.notEqual(mesh.geometry,source.geometry);assert.equal(mesh.geometry.index.count,source.geometry.index.count);assert.deepEqual(mesh.geometry.attributes.skinWeight.array,source.geometry.attributes.skinWeight.array);
   const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader);assert.equal(shader.uniforms.uOyenCoat.value,{black:1,spots:2,stripes:3}[coat]);assert.match(shader.vertexShader,/vOyenRest=position/);assert.match(shader.fragmentShader,/oyenNoise/);
   if(source.material.name.endsWith('_head')){const a=mesh.geometry.attributes.aOyenFabric;assert.ok(a.array.some(v=>v===0),'bell excluded');assert.ok(a.array.some(v=>v===1),'hood included');}
   assert.equal(source.geometry.attributes.aOyenFabric,undefined);
  }
  appearance.dispose();
 }
});
test('dark face changes only the skin material; original appearance is untouched',()=>{
 const model=clone(template),parts=meshes(model),source=meshes(template),appearance=applyOyenAppearance(model,{coat:'original',skin:'dark'});
 for(let i=0;i<parts.length;i++){if(parts[i].material.name==='m_cs_oyen_skin'){assert.notEqual(parts[i].material,source[i].material);const shader={uniforms:{},fragmentShader:THREE.ShaderLib.standard.fragmentShader};parts[i].material.onBeforeCompile(shader);assert.ok(shader.uniforms.uOyenSkin.value.isColor);assert.match(shader.fragmentShader,/skinMask/);}else assert.equal(parts[i].material,source[i].material);assert.equal(parts[i].geometry,source[i].geometry);}
 appearance.dispose();const original=clone(template);applyOyenAppearance(original,{coat:'original',skin:'original'}).dispose();meshes(original).forEach((m,i)=>assert.equal(m.material,source[i].material));
});
