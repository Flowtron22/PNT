import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
if(!existsSync(new URL('../server/node_modules/@colyseus/core',import.meta.url))){console.error('Install the game server once: npm --prefix server ci');process.exit(1);}
const children=[['tools/pnt-serve.mjs','--lan'],['server/run.mjs']].map(args=>spawn(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true}));
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
for(const child of children){child.on('error',error=>{console.error(error.message);stop(1);});child.on('exit',code=>{if(!stopping)stop(code||0);});}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
