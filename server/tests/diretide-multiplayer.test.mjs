import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {createGameServer}=await import('../app.mjs'),{Client}=await import('@colyseus/sdk'),{matchMaker}=await import('@colyseus/core');
const wait=(check,timeout=12000)=>new Promise((resolve,reject)=>{const end=Date.now()+timeout,t=setInterval(()=>{if(check()){clearInterval(t);resolve();}else if(Date.now()>end){clearInterval(t);reject(Error('Timed out: '+check));}},15);});
test('event matchmaking is isolated; real host/guest load Grassfield, finish and rematch',async()=>{
 const server=await createGameServer();await server.listen(0,'127.0.0.1');const endpoint=`http://127.0.0.1:${server.transport.server.address().port}`,rooms=[];
 const connect=async(method,id,options)=>{const room=await new Client(endpoint)[method](id,{protocol:1,eventVersion:4,name:'Tester',costume:'thief',loadout:['hammer','banana'],...options});rooms.push(room);room.onMessage('lobby',()=>{});room.onMessage('snapshot',()=>{});room.onMessage('notice',()=>{});return room;};
 try{
  const classic=await connect('joinOrCreate','pnt',{public:true,gameMode:'classic'}),host=await connect('joinOrCreate','pnt',{public:true,gameMode:'diretide'}),guest=await connect('joinOrCreate','pnt',{public:true,gameMode:'diretide'});assert.notEqual(host.roomId,classic.roomId);assert.equal(guest.roomId,host.roomId);
  await assert.rejects(new Client(endpoint).joinById(host.roomId,{protocol:1,gameMode:'classic'}),/different game mode/);
  await assert.rejects(new Client(endpoint).joinById(host.roomId,{protocol:1,gameMode:'diretide'}),/refresh the game/);
  let lobby,snapshot;host.onMessage('lobby',v=>lobby=v);host.onMessage('snapshot',v=>snapshot=v);host.send('hello');await wait(()=>lobby?.players.length===2);assert.equal(lobby.gameMode,'diretide');
  host.send('control',{action:'add-bot'});host.send('control',{action:'add-bot'});await wait(()=>lobby.players.length===4);host.send('control',{action:'map',direction:1});host.send('control',{action:'start'});await wait(()=>lobby.phase==='loading'&&lobby.match);assert.equal(lobby.match.map,'grassfield');assert.equal(lobby.map,0);host.send('ready');guest.send('ready');await wait(()=>snapshot?.round.startRemaining>0);assert.equal(snapshot.round.mode,'diretide');
  const actual=matchMaker.getLocalRoomById(host.roomId);actual.sim.round.startRemaining=0;actual.sim.round.remaining=.01;actual.sim.round.wells.forEach((w,i)=>{w.hearts=i===1?3:1;w.candy=i===1?0:5;});for(let i=0;i<3000&&actual.sim.round.phase==='playing';i++)actual.sim.step(.1);await wait(()=>lobby.phase==='finished');assert.equal(snapshot.round.winnerId,1);assert.equal(snapshot.round.reason,'last-well');
  host.send('control',{action:'rematch'});await wait(()=>lobby.phase==='waiting');assert.equal(lobby.gameMode,'diretide');assert.equal(actual.sim,null);
 }finally{for(const room of rooms)await room.leave();await server.gracefullyShutdown(false);}
});
