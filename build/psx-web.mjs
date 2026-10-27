import {cpSync,mkdirSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'dist');
const inputs=['manifest.webmanifest','index.html','styles/psx.css','styles/wonder-ui.css','src/wonder-wave','src/psx','src/ui/ui-util.js','assets/psx','assets/fonts','vendor/three','LICENSE'];
for(const path of inputs)if(!existsSync(join(root,path)))throw new Error(`Missing input: ${path}`);
for(const name of ['thief.glb','police.glb','mall-slice.glb','logo.png','animations/clips.json','smoke.png','rewind.png',...['mall','sunken','iceberg'].flatMap(n=>['arenas/'+n+'.glb','arenas/'+n+'.json','arenas/'+n+'.nav.json']),...['SM_TL_Hammer','SM_TL_Banana','SM_TL_Bomb','jetpack','rewind'].map(n=>'props/'+n+'.glb'),...['oyen','pingu','pumpkin','boney','purple','racer','raptor'].map(n=>`costumes/${n}.glb`),...['mall','sunken','iceberg'].map(n=>`maps/${n}.webp`),...['users','online','lock'].map(n=>`ui/${n}.png`)])if(!existsSync(join(root,'assets/psx',name)))throw new Error(`Export missing: ${name}`);
if(out!==join(root,'dist'))throw new Error('Unsafe output path');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
for(const path of inputs){const target=join(out,path);mkdirSync(dirname(target),{recursive:true});cpSync(join(root,path),target,{recursive:true,filter:source=>!source.endsWith('asset-manifest.json')&&!['idle.glb','run.glb'].includes(source.split(/[\\/]/).at(-1))});}
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
let notices=readFileSync(join(root,'LICENSE'),'utf8');
const three=join(root,'vendor/three/LICENSE');if(existsSync(three))notices+='\n\nTHREE.JS\n'+readFileSync(three,'utf8');
const credits=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Credits · Police N Thief</title><style>body{max-width:900px;margin:50px auto;padding:20px;font:16px system-ui}pre{white-space:pre-wrap}</style><a href="/">Back to game</a><h1>Credits and licences</h1><p>Browser foundation: Wonder Wave / PURRITORY, Jayden Davis. Game assets: PSX project; licence review pending before public distribution. Titan One and Rubik use the SIL Open Font License; full notices are included with the font files.</p><pre>${esc(notices)}</pre>`;
writeFileSync(join(out,'credits.html'),credits);writeFileSync(join(root,'credits.html'),credits);
console.log('Static browser build ready in dist/. No deployment was performed.');
