import {Server} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {GameRoom} from './game-room.mjs';
export async function createGameServer(){
 const origins=(process.env.ALLOWED_ORIGINS||'https://police-n-thief.vercel.app,http://localhost:8491,http://127.0.0.1:8491').split(',').map(s=>s.trim());
 const allowed=origin=>!origin||origins.includes(origin)||process.env.NODE_ENV!=='production'&&/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);
 const server=new Server({greet:false,gracefullyShutdown:false,transport:new WebSocketTransport({maxPayload:4096,pingInterval:10000,pingMaxRetries:3,beforeUpgrade:context=>allowed(context.headers.get('origin'))?undefined:new Response('Origin not allowed',{status:403})}),express:app=>{app.use((req,res,next)=>{if(!allowed(req.headers.origin)){res.status(403).end();return;}next();});app.get('/health',(_req,res)=>res.json({ok:true,game:'pnt',protocol:1}));}});
 server.define('pnt',GameRoom).filterBy(['public']);return server;
}
