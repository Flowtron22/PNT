import {cpSync,mkdirSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'dist');
const inputs=['manifest.webmanifest','index.html','styles/pnt.css','styles/menu-ui.css','styles/mobile-pages.css','styles/desktop-layout.css','src/menu-audio','src/pnt','src/ui/ui-util.js','assets/pnt','assets/fonts','vendor/three','vendor/rapier','notices'];
for(const path of inputs)if(!existsSync(join(root,path)))throw new Error(`Missing input: ${path}`);
for(const name of ['thief.glb','police.glb','mall-slice.glb','logo.png','animations/clips.json','smoke.png','rewind.png',...['mall','sunken','iceberg'].flatMap(n=>['arenas/'+n+'.glb','arenas/'+n+'.json','arenas/'+n+'.nav.json','arenas/'+n+'.collision.json']),...['SM_TL_Hammer','SM_TL_Banana','SM_TL_Bomb','jetpack','rewind'].map(n=>'props/'+n+'.glb'),...['oyen','pingu','pumpkin','boney','purple','racer','raptor'].map(n=>`costumes/${n}.glb`),...['mall','sunken','iceberg'].map(n=>`maps/${n}.webp`),...['users','online','lock'].map(n=>`ui/${n}.png`)])if(!existsSync(join(root,'assets/pnt',name)))throw new Error(`Export missing: ${name}`);
if(out!==join(root,'dist'))throw new Error('Unsafe output path');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
for(const path of inputs){const target=join(out,path);mkdirSync(dirname(target),{recursive:true});cpSync(join(root,path),target,{recursive:true,filter:source=>!source.endsWith('asset-manifest.json')&&!['idle.glb','run.glb'].includes(source.split(/[\\/]/).at(-1))});}
let notices=readFileSync(join(root,'notices/foundation.txt'),'utf8');
const three=join(root,'vendor/three/LICENSE');if(existsSync(three))notices+='\n\nTHREE.JS\n'+readFileSync(three,'utf8');
notices+='\n\nRAPIER 3D 0.21.0 (@dimforge/rapier3d-compat)\n'+readFileSync(join(root,'vendor/rapier/LICENSE'),'utf8');
// Retain dependency notices in the distribution, separate from the studio credits UI.
writeFileSync(join(out,'third-party-notices.txt'),notices);
const credits=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Credits · Police N Thief</title><link rel="stylesheet" href="styles/pnt.css"><link rel="stylesheet" href="styles/menu-ui.css"><style>body{overflow:auto;min-height:100dvh;background:#211b32}main{max-width:620px;margin:50px auto;padding:25px;text-align:center}a{display:block;text-align:left;color:white;margin-bottom:50px}h1{font:44px Titan}</style><main><a href="/">← BACK</a><h1>CREDITS</h1><section class="studio-credit"><h3>Developed by</h3><img class="todak-credit-logo" src="assets/pnt/ui/todak-studios.png" alt="Todak Studios"><p>STUDIOS</p></section></main></html>`;
writeFileSync(join(out,'credits.html'),credits);writeFileSync(join(root,'credits.html'),credits);
console.log('Static browser build ready in dist/. No deployment was performed.');
