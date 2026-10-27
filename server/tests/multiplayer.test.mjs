import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {createGameServer}=await import('../app.mjs'),{Client}=await import('@colyseus/sdk');
const {matchMaker}=await import('@colyseus/core');
const wait=(check,timeout=12000)=>new Promise((resolve,reject)=>{const start=Date.now(),timer=setInterval(()=>{if(check()){clearInterval(timer);resolve();}else if(Date.now()-start>timeout){clearInterval(timer);reject(Error('Timed out waiting: '+check.toString()));}},15);});
test('four real clients share a room, host controls, loading barrier, server gameplay and reconnect',async()=>{
 const server=await createGameServer();await server.listen(0,'127.0.0.1');const endpoint=`http://127.0.0.1:${server.transport.server.address().port}`,rooms=[],states=[];
 async function join(method,id,options){const client=new Client(endpoint),room=await client[method](id,{protocol:1,name:`Player ${rooms.length}`,costume:'thief',loadout:['hammer','banana'],...options}),index=rooms.length;rooms.push(room);states[index]={};room.reconnection.minUptime=0;room.onMessage('lobby',value=>states[index].lobby=value);room.onMessage('snapshot',value=>states[index].snapshot=value);room.onMessage('notice',()=>{});room.send('hello');return room;}
 try{
  const host=await join('create','pnt',{public:false,preference:'chaser'});assert.match(host.roomId,/^[A-Z0-9]{6}$/);for(let i=0;i<3;i++)await join('joinById',host.roomId,{preference:'runner'});await wait(()=>states.every(s=>s.lobby?.players.length===4));
  await assert.rejects(new Client(endpoint).joinById(host.roomId,{protocol:1}),/full|locked|available/i);
  rooms[1].send('control',{action:'map',direction:1});await new Promise(r=>setTimeout(r,60));assert.equal(states[0].lobby.map,0);
  host.send('control',{action:'map',direction:1});await wait(()=>states.every(s=>s.lobby?.map===1));host.send('control',{action:'start'});await wait(()=>states.every(s=>s.lobby?.phase==='loading'&&s.lobby.match));
  for(const room of rooms.slice(0,3))room.send('ready');await new Promise(r=>setTimeout(r,80));assert.equal(states[0].lobby.phase,'loading');rooms[3].send('ready');await wait(()=>states.every(s=>s.snapshot?.tick>2));
  assert.equal(new Set(states.map(s=>s.snapshot.round.profileId)).size,1);assert.equal(states[0].snapshot.round.actors.filter(a=>a.role==='chaser').length,1);
  const start=states[1].snapshot.poses[1].position;rooms[1].send('input',{seq:1,x:0,z:1,position:[999,999,999]});await wait(()=>states[0].snapshot.poses[1].ack===1);await new Promise(r=>setTimeout(r,170));const moved=states[0].snapshot.poses[1].position;assert.ok(Math.hypot(moved[0]-start[0],moved[2]-start[2])<3);assert.ok(moved.every(n=>Math.abs(n)<100));
  rooms[1].send('input',{frames:[2,3,4].map(seq=>({seq,x:0,z:1,interact:false,position:[999,999,999]}))});await wait(()=>states.every(s=>s.snapshot.poses[1].ack===4));assert.equal(states[0].snapshot.inputFrames,true);
  const tick=states[0].snapshot.tick;host.send('tool',{slot:0});await wait(()=>states[0].snapshot.events.some(e=>e.type==='tool'&&e.actor===0));assert.ok(states[0].snapshot.round.actors[0].toolCooldowns[0]>9);
  let reconnected=false;rooms[1].onReconnect(()=>{reconnected=true;rooms[1].send('hello');});rooms[1].connection.close(4010,'test drop');await wait(()=>reconnected,10000);await wait(()=>states[1].snapshot.tick>tick);assert.equal(rooms[1].sessionId,states[0].lobby.players[1].sessionId);
  const previousMatch=states[0].snapshot.round.profileId;matchMaker.getLocalRoomById(host.roomId).sim.round.remaining=.001;await wait(()=>states.every(s=>s.snapshot.round.phase==='finished'));host.send('control',{action:'rematch'});await wait(()=>states.every(s=>s.lobby.phase==='waiting'));host.send('control',{action:'map',direction:1});await wait(()=>states.every(s=>s.lobby.map===2));host.send('control',{action:'start'});await wait(()=>states.every(s=>s.lobby.phase==='loading'&&s.lobby.match));for(const room of rooms)room.send('ready');await wait(()=>states.every(s=>s.snapshot.round.profileId!==previousMatch));
 }finally{for(const room of rooms)await room.leave();await server.gracefullyShutdown(false);}
});
test('public matchmaking shares public rooms and does not expose private rooms',async()=>{
 const server=await createGameServer();await server.listen(0,'127.0.0.1');const client=new Client(`http://127.0.0.1:${server.transport.server.address().port}`),rooms=[];
 try{const privateRoom=await client.create('pnt',{protocol:1,public:false});rooms.push(privateRoom);const first=await client.joinOrCreate('pnt',{protocol:1,public:true});rooms.push(first);const second=await client.joinOrCreate('pnt',{protocol:1,public:true});rooms.push(second);assert.notEqual(first.roomId,privateRoom.roomId);assert.equal(first.roomId,second.roomId);}finally{for(const room of rooms)await room.leave();await server.gracefullyShutdown(false);}
});
test('a mobile client can return to the same lobby after more than twenty seconds away',async()=>{
 const server=await createGameServer();await server.listen(0,'127.0.0.1');const client=new Client(`http://127.0.0.1:${server.transport.server.address().port}`),rooms=[];let lobby;
 try{
  const host=await client.create('pnt',{protocol:1,name:'Host'});rooms.push(host);host.onMessage('lobby',value=>lobby=value);
  const guest=await client.joinById(host.roomId,{protocol:1,name:'Returning player',costume:'raptor'});rooms.push(guest);guest.onMessage('lobby',()=>{});host.send('hello');await wait(()=>lobby?.players.length===2);
  assert.equal(matchMaker.getLocalRoomById(host.roomId).seatReservationTimeout,60);
  const token=guest.reconnectionToken,sessionId=guest.sessionId;guest.reconnection.enabled=false;guest.connection.close(4010,'simulate phone background');await wait(()=>lobby.players.some(p=>p.sessionId===sessionId&&!p.connected));
  await new Promise(resolve=>setTimeout(resolve,22000));assert.equal(lobby.players.length,2);
  const returned=await client.reconnect(token);rooms.push(returned);returned.onMessage('lobby',()=>{});returned.send('hello');await wait(()=>lobby.players.some(p=>p.sessionId===sessionId&&p.connected));
  assert.equal(returned.sessionId,sessionId);assert.equal(lobby.players[1].costume,'raptor');assert.equal(lobby.host,host.sessionId);
 }finally{for(const room of rooms)await room.leave();await server.gracefullyShutdown(false);}
});
