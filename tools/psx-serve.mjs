import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';
import {spawn} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)),process.argv.includes('--dist')?'dist':'.');
const port=Number(process.env.PORT||8491),lan=process.argv.includes('--lan');
const types={'.webmanifest':'application/manifest+json','.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.glb':'model/gltf-binary','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');const relative=decodeURIComponent(url.pathname);
    const path=resolve(root,'.'+(relative==='/'?'/index.html':relative));
    if(!path.startsWith(root+sep)||relative.split('/').some(p=>p.startsWith('.'))){res.writeHead(403);res.end('Forbidden');return;}
    const info=await stat(path);if(!info.isFile())throw new Error('Not a file');
    const body=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,lan?'0.0.0.0':'127.0.0.1',()=>{
  console.log(`PSX Web: http://localhost:${port}`);
  if(lan) for(const entries of Object.values(networkInterfaces()))for(const item of entries||[])if(item.family==='IPv4'&&!item.internal)console.log(`Phone on the same Wi-Fi: http://${item.address}:${port}`);
  if(process.argv.includes('--open')&&process.platform==='win32')spawn('cmd.exe',['/d','/c','start','','http://localhost:'+port],{windowsHide:true,stdio:'ignore'}).unref();
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. If the preview is already running, open http://localhost:${port}. Otherwise use another PORT.`:error.message);process.exitCode=1;});
