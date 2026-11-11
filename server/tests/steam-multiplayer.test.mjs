import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';

registerHooks({resolve(specifier, context, next) {
  if (specifier === 'three') {
    return next(new URL('../../vendor/three/build/three.module.js', import.meta.url).href, context);
  }
  return next(specifier, context);
}});
const {steamMultiplayer} = await import('../steam-multiplayer.mjs');
const {MatchSimulation} = await import('../simulation.mjs');
const {DIRETIDE_VERSION} = await import('../../src/pnt/diretide-rules.js');

function fakeSteamNetwork({hideMemberAfterTransfer, switchingGuests = []} = {}) {
  const lobbies = new Map();
  const users = new Map();
  let nextLobbyId = 109775243304509900n;

  return function user(id) {
    const steamId = {steamId64: id};
    const incoming = [], callbacks = new Map();
    let dropFirstPacket = id === 2n;
    let dropFirstSnapshot = id === 1n;
    let departing = false, missNextSearch = false;
    const delayedFragments = [];
    users.set(id, incoming);

    function lobbyFor(record) {
      return {
        id: record.id,
        join: () => joinLobby(record.id),
        leave() {
          const removeMember = () => {
            departing = false;
            record.members.delete(id);
            if (record.owner === id) {
              record.owner = record.members.keys().next().value;
              record.transferTime = performance.now();
            }
            if (!record.members.size) lobbies.delete(record.id);
          };
          if (switchingGuests.includes(id) && record.owner !== id) {
            departing = true;
            missNextSearch = true;
            setTimeout(removeMember, 150);
          } else {
            removeMember();
          }
        },
        getOwner: () => ({steamId64: record.owner}),
        getMembers() {
          const hideSelf = id === hideMemberAfterTransfer && performance.now() - record.transferTime < 500;
          return [...record.members].filter(member => !hideSelf || member !== id).map(steamId64 => ({steamId64}));
        },
        getMemberCount: () => BigInt(record.members.size),
        getData: key => record.data[key],
        setData: (key, value) => Boolean(record.data[key] = value),
        mergeFullData: data => Boolean(Object.assign(record.data, data)),
        setJoinable: value => { record.joinable = value; },
        openInviteDialog: () => {}
      };
    }

    async function joinLobby(lobbyId) {
      if (departing) throw new Error('Still leaving the previous lobby');
      const record = lobbies.get(lobbyId);
      if (!record?.joinable || record.members.size >= 4) throw new Error('Lobby unavailable');
      record.members.add(id);
      return lobbyFor(record);
    }

    return {
      localplayer: {getSteamId: () => steamId},
      callback: {register(type, fn) {
        callbacks.set(type, fn);
        return {disconnect: () => callbacks.delete(type)};
      }},
      matchmaking: {
        joinLobby,
        async createLobby(type) {
          if (departing) throw new Error('Still leaving the previous lobby');
          const lobbyId = ++nextLobbyId;
          const record = {id: lobbyId, owner: id, members: new Set([id]), type, joinable: true, data: {}};
          lobbies.set(lobbyId, record);
          return lobbyFor(record);
        },
        async getLobbies() {
          if (departing) throw new Error('Still leaving the previous lobby');
          if (missNextSearch) {
            missNextSearch = false;
            return []; // The new public room has yet to appear in Steam's list.
          }
          const available = [...lobbies.values()].filter(lobby => lobby.type === 3 && lobby.joinable && lobby.members.size < 4).map(lobbyFor);
          if (id === 5n && available.length) {
            return [{...available[0], join: async () => { throw new Error('Lobby filled'); }}, ...available];
          }
          return available;
        }
      },
      networking: {
        acceptP2PSession() {},
        isP2PPacketAvailable: () => incoming[0]?.data.length || 0,
        readP2PPacket: () => incoming.shift(),
        sendP2PPacket(peer, type, data) {
          if (dropFirstPacket) {
            dropFirstPacket = false;
            return false;
          }
          if (type === 1) {
            assert.ok(data.length <= 1200);
            if (dropFirstSnapshot && peer === 2n) {
              dropFirstSnapshot = false;
              return false;
            }
            // Deliver each tail after the first fragment of the next frame.
            if (id === 1n && peer === 2n) {
              if (data[5] > 0) delayedFragments.push({data, steamId});
              else users.get(peer).push({data, steamId}, ...delayedFragments.splice(0));
              return true;
            }
          }
          users.get(peer).push({data, steamId});
          return true;
        }
      }
    };
  };
}

async function waitFor(check) {
  const end = Date.now() + 14000;
  while (!check()) {
    if (Date.now() > end) throw new Error('Timed out waiting for ' + check);
    await delay(15);
  }
}

function steamPeers(t, options) {
  const user = fakeSteamNetwork(options), peers = [];
  t.after(() => { for (const peer of peers) peer.dispose(); });
  return async function connect(id, mode, code, profile = {}) {
    const state = {}, key = String(id);
    const connection = steamMultiplayer(user(id), 'test', message => {
      state[message.type] = structuredClone(message.data ?? true);
    }, () => {});
    peers.push(connection);
    const send = (type, data) => connection.send(key, type, data);
    async function enter(mode, code, profile) {
      for (const type of Object.keys(state)) delete state[type];
      await connection.connect(key, mode, {
        name: 'Tester', protocol: 1, eventVersion: DIRETIDE_VERSION, ...profile
      }, code);
      send('hello');
      await waitFor(() => state.lobby?.players.some(player => player.sessionId === key));
    }
    await enter(mode, code, profile);
    return {connection, key, state, send, enter};
  };
}

test('Steam peers join the host, honor host controls and readiness, and receive match snapshots', async t => {
    const connect = steamPeers(t);
    const host = await connect(1n, 'host');
    assert.match(host.state.lobby.code, /^[A-HJ-NP-Z2-9]{7}$/);
    const guest = await connect(2n, 'join', host.state.lobby.code);
    guest.send('profile', {name: 'Tester', costume: 'oyen', appearance: {coat: 'stripes', skin: 'honey'}});
    await waitFor(() => [host, guest].every(peer => peer.state.lobby.players[1].appearance?.coat === 'stripes'));
    assert.deepEqual(guest.state.lobby.players[1].appearance, {coat: 'stripes', skin: 'honey'});
    guest.send('control', {action: 'visibility', direction: 'public'});
    await delay(60);
    assert.equal(host.state.lobby.public, false);
    host.send('control', {action: 'visibility', direction: 'public'});
    await waitFor(() => guest.state.lobby.public);
    const publicGuest = await connect(5n, 'public');
    assert.equal(publicGuest.state.lobby.code, host.state.lobby.code);
    publicGuest.connection.leave(publicGuest.key);
    await waitFor(() => guest.state.lobby.players.length === 2);
    host.send('control', {action: 'visibility', direction: 'private'});
    await waitFor(() => !guest.state.lobby.public);
    const publicHost = await connect(6n, 'public');
    assert.notEqual(publicHost.state.lobby.code, host.state.lobby.code);
    const other = await connect(3n, 'public', null, {gameMode: 'diretide'});
    const eventGuest = await connect(4n, 'public', null, {gameMode: 'diretide'});
    assert.notEqual(other.state.lobby.code, host.state.lobby.code);
    assert.equal(eventGuest.state.lobby.code, other.state.lobby.code);
    assert.equal(guest.state.lobby.players.length, 2);
    const eventCode = eventGuest.state.lobby.code;
    other.connection.leave(other.key);
    await waitFor(() => eventGuest.state.migrated && eventGuest.state.lobby.host === eventGuest.key);
    assert.equal(eventGuest.state.lobby.code, eventCode);
    assert.equal(eventGuest.state.lobby.public, true);
    assert.equal(eventGuest.state.lobby.gameMode, 'diretide');
    assert.equal(eventGuest.state.lobby.players.length, 1);

    const survivor = await connect(7n, 'join', host.state.lobby.code);

    guest.send('control', {action: 'map', direction: 1});
    await delay(60);
    assert.equal(host.state.lobby.map, 0);
    host.send('control', {action: 'map', direction: 1});
    await waitFor(() => guest.state.lobby.map === 1);
    host.send('control', {action: 'map', direction: -1});
    host.send('control', {action: 'add-bot'});
    host.send('control', {action: 'start'});
    await waitFor(() => guest.state.lobby?.match && host.state.lobby?.match);
    assert.equal(guest.state.lobby.map, 0);

    host.send('ready');
    survivor.send('ready');
    await delay(80);
    assert.equal(host.state.lobby.phase, 'loading');
    guest.send('ready');
    await waitFor(() => guest.state.snapshot?.round.startRemaining === 0);
    guest.send('input', {frames: [{seq: 1, x: 1, z: 0}]});
    await waitFor(() => host.state.snapshot?.poses[1].ack === 1 && guest.state.snapshot?.poses[1].ack === 1);
    assert.equal(guest.state.snapshot.round.profileId, host.state.snapshot.round.profileId);
    guest.send('tool', {slot: 0});
    await waitFor(() => host.state['tool-event']?.event.tool === 'hammer' && guest.state['tool-event']?.event.tool === 'hammer');
    assert.equal(host.state['tool-event'].event.actor, 1);

    const {tick, round: {profileId, remaining}} = guest.state.snapshot;
    const code = guest.state.lobby.code;
    host.connection.leave(host.key);
    await waitFor(() => [guest, survivor].every(peer => peer.state.migrated && peer.state.lobby.host === guest.key));
    await waitFor(() => [guest, survivor].every(peer => peer.state.snapshot.tick > tick));
    for (const {state} of [guest, survivor]) {
      assert.equal(state.lobby.code, code);
      assert.equal(state.lobby.phase, 'playing');
      assert.equal(state.lobby.players[0].bot, true);
      assert.equal(state.snapshot.round.profileId, profileId);
      assert.ok(state.snapshot.round.remaining <= remaining);
      assert.ok(state.snapshot.furniture.length > 0);
      assert.equal(state.disconnect, undefined);
    }
    guest.send('input', {frames: [{seq: 2, x: 1, z: 0}]});
    await waitFor(() => survivor.state.snapshot.poses[1].ack === 2);
});

test('Public matchmaking and room-code guests stay in a public match after the host leaves', async t => {
  const connect = steamPeers(t, {hideMemberAfterTransfer: 3n});
  const host = await connect(1n, 'host');
  host.send('control', {action: 'visibility', direction: 'public'});
  await waitFor(() => host.state.lobby.public);
  const {code} = host.state.lobby;
  const next = await connect(2n, 'public');
  const guest = await connect(3n, 'join', code);
  const survivors = [next, guest];
  assert.ok(survivors.every(peer => peer.state.lobby.code === code && peer.state.lobby.public));

  host.send('control', {action: 'add-bot'});
  host.send('control', {action: 'start'});
  const peers = [host, ...survivors];
  await waitFor(() => peers.every(peer => peer.state.lobby.match));
  for (const peer of peers) peer.send('ready');
  await waitFor(() => survivors.every(peer => peer.state.snapshot?.round.startRemaining === 0));
  const {tick, round: {profileId}} = guest.state.snapshot;
  await host.connection.leave(host.key);

  await waitFor(() => survivors.every(peer => peer.state.migrated && peer.state.lobby.host === next.key));
  await waitFor(() => survivors.every(peer => peer.state.snapshot.tick > tick));
  for (const {state} of survivors) {
    assert.equal(state.disconnect, undefined);
    assert.equal(state.lobby.code, code);
    assert.equal(state.lobby.public, true);
    assert.equal(state.lobby.phase, 'playing');
    assert.equal(state.lobby.players[0].bot, true);
    assert.equal(state.snapshot.round.profileId, profileId);
  }
  guest.send('input', {frames: [{seq: 1, x: 1, z: 0}]});
  await waitFor(() => next.state.snapshot.poses[2].ack === 1);

  const event = {gameMode: 'diretide'};
  await host.enter('host', null, event);
  host.send('control', {action: 'visibility', direction: 'public'});
  await waitFor(() => host.state.lobby.public);
  const eventCode = host.state.lobby.code;
  assert.notEqual(eventCode, code);

  await guest.connection.leave(guest.key);
  await guest.enter('join', eventCode, event);
  await next.connection.leave(next.key);
  await next.enter('public', null, event);

  await waitFor(() => peers.every(peer => peer.state.lobby.players.length === 3));
  for (const {state} of peers) {
    assert.equal(state.lobby.code, eventCode);
    assert.equal(state.lobby.gameMode, event.gameMode);
    assert.equal(state.lobby.host, host.key);
  }
});

test('Guests can immediately join the same host in another mode after results', async t => {
  const step = MatchSimulation.prototype.step;
  t.mock.method(MatchSimulation.prototype, 'step', function (dt) {
    this.round.startRemaining = 0;
    this.round.remaining = .001;
    step.call(this, dt);
  });
  const connect = steamPeers(t, {switchingGuests: [12n, 13n]});
  const host = await connect(11n, 'host');
  const publicGuest = await connect(12n, 'join', host.state.lobby.code);
  const codeGuest = await connect(13n, 'join', host.state.lobby.code);
  const peers = [host, publicGuest, codeGuest];
  host.send('control', {action: 'add-bot'});
  host.send('control', {action: 'start'});
  await waitFor(() => peers.every(peer => peer.state.lobby.match));
  for (const peer of peers) peer.send('ready');
  await waitFor(() => peers.every(peer => peer.state.lobby.phase === 'finished' && peer.state.snapshot?.round.phase === 'finished'));
  const previousCode = host.state.lobby.code;

  await host.connection.leave(host.key);
  const event = {gameMode: 'diretide'};
  await host.enter('host', null, event);
  host.send('control', {action: 'visibility', direction: 'public'});
  await waitFor(() => host.state.lobby.public);
  const nextCode = host.state.lobby.code;
  assert.notEqual(nextCode, previousCode);

  await Promise.all([publicGuest.connection.leave(publicGuest.key), codeGuest.connection.leave(codeGuest.key)]);
  await Promise.all([publicGuest.enter('public', null, event), codeGuest.enter('join', nextCode, event)]);
  await waitFor(() => peers.every(peer => peer.state.lobby.players.length === 3));
  for (const {state} of peers) {
    assert.equal(state.lobby.code, nextCode);
    assert.equal(state.lobby.gameMode, event.gameMode);
    assert.equal(state.lobby.host, host.key);
  }
});

test('PattyTide keeps spawning candy and accepting input after a Steam host transfer', async t => {
  const connect = steamPeers(t);
  const event = {gameMode: 'diretide', loadout: ['rocket', 'smoke']};
  const host = await connect(1n, 'host', null, event);
  const next = await connect(3n, 'join', host.state.lobby.code, event);
  const guest = await connect(4n, 'join', host.state.lobby.code);
  host.send('control', {action: 'add-bot'});
  host.send('control', {action: 'start'});
  await waitFor(() => [host, next, guest].every(peer => peer.state.lobby.match));
  for (const peer of [host, next, guest]) peer.send('ready');
  await waitFor(() => next.state.snapshot?.round.startRemaining === 0);
  const {tick, round: before} = next.state.snapshot;
  assert.equal(next.state.snapshot.map, 'grassfield');
  assert.equal(before.mode, 'diretide');
  assert.ok(before.pickups.length > 0);
  host.connection.leave(host.key);

  await waitFor(() => [next, guest].every(peer => peer.state.migrated && peer.state.lobby.host === next.key));
  await waitFor(() => guest.state.snapshot.tick > tick);
  const after = guest.state.snapshot.round;
  assert.equal(after.profileId, before.profileId);
  assert.equal(after.wells.length, 4);
  assert.ok(after.remaining <= before.remaining);
  assert.equal(guest.state.lobby.players[0].bot, true);
  assert.deepEqual(guest.state.lobby.players[1].loadout, ['hammer', 'banana']);
  guest.send('input', {frames: [{seq: 1, x: 1, z: 0}]});
  await waitFor(() => guest.state.snapshot.poses[2].ack === 1);
  await waitFor(() => guest.state.snapshot.round.pickupId > before.pickupId);
});

test('Splash Area public discovery and host migration preserve turf, seed, ink actions and seat ownership', async t => {
 const connect=steamPeers(t),event={gameMode:'splash',splashVersion:4};
 const host=await connect(1n,'host',null,event);host.send('control',{action:'visibility',direction:'public'});await waitFor(()=>host.state.lobby.public);
 const next=await connect(2n,'public',null,event),guest=await connect(3n,'join',host.state.lobby.code,event),peers=[host,next,guest];
 host.send('control',{action:'add-bot'});host.send('control',{action:'start'});await waitFor(()=>peers.every(p=>p.state.lobby.match));for(const p of peers)p.send('ready');await waitFor(()=>guest.state.snapshot?.round.startRemaining===0);
 guest.send('tool',{slot:1});await waitFor(()=>[next,guest].every(p=>p.state.snapshot.round.actors[2].cans===1));
 const {tick,round:before}=guest.state.snapshot,code=host.state.lobby.code;await host.connection.leave(host.key);
 await waitFor(()=>[next,guest].every(p=>p.state.migrated&&p.state.lobby.host===next.key));await waitFor(()=>guest.state.snapshot.tick>tick);
 const after=guest.state.snapshot.round;assert.equal(after.mode,'splash');assert.equal(after.profileId,before.profileId);assert.deepEqual(after.paintCover,before.paintCover);assert.ok(after.paintRevision>=before.paintRevision);assert.equal(after.actors[2].paintSeat,2);assert.equal(after.actors[2].cans,1);assert.equal(guest.state.lobby.code,code);assert.deepEqual(guest.state.lobby.players[2].loadout,[]);
 await waitFor(()=>guest.state.snapshot.round.actors[2].throwTime===0);
 guest.send('tool',{slot:0});await waitFor(()=>guest.state.snapshot.round.actors[2].diving);assert.equal(guest.state.disconnect,undefined);
});
