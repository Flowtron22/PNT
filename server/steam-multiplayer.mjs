import {performance} from 'node:perf_hooks';
import {deflateRawSync, inflateRawSync} from 'node:zlib';
import {MatchRoom} from './match-room.mjs';
import {MatchSimulation} from './simulation.mjs';

const CHANNEL_VERSION = 'pnt-steam-5';
const MAX_PACKET = 64 * 1024;
const MAX_SNAPSHOT = 256 * 1024;
const SNAPSHOT_CHUNK = 1180;
const SNAPSHOT_HEADER = 7;
const SNAPSHOT_WINDOW = 4;
const UNRELIABLE = 1;
const INVISIBLE = 3;
const RELIABLE = 2;
const P2P_REQUEST = 6;
const INVITE_REQUEST = 8;

// Steam matchmaking lobby IDs share the public universe, chat type and lobby flags.
const LOBBY_PREFIX = 0x1860000n << 32n;
const ACCOUNT_MASK = 0xffffffffn;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function lobbyCode(id) {
  if ((id & ~ACCOUNT_MASK) !== LOBBY_PREFIX) throw new Error('Unsupported Steam lobby ID.');
  let code = '';
  for (let account = id & ACCOUNT_MASK, i = 0; i < 7; i++, account >>= 5n) {
    code = CODE_ALPHABET[Number(account & 31n)] + code;
  }
  return code;
}

function lobbyId(code) {
  if (/^\d{17,20}$/.test(code)) return BigInt(code); // Steam overlay invitation.
  if (typeof code !== 'string' || !/^[A-HJ-NP-Z2-9]{7}$/.test(code)) throw new Error('Enter a seven-character room code.');
  let account = 0n;
  for (const char of code) account = (account << 5n) | BigInt(CODE_ALPHABET.indexOf(char));
  if (account > ACCOUNT_MASK || account === 0n) throw new Error('Invalid room code.');
  return LOBBY_PREFIX | account;
}

class HostedRoom extends MatchRoom {
  constructor(lobby, publish) {
    super();
    this.lobby = lobby;
    this.publish = publish;
    this.clients = new Map();
    this.handlers = new Map();
  }

  async onCreate(options) {
    this.roomId = lobbyCode(this.lobby.id);
    await super.onCreate(options);
  }

  control(action, value) {
    if (action !== 'visibility') return super.control(action, value);
    if (this.phase !== 'waiting' || !['public', 'private'].includes(value)) return;
    if (!this.lobby.setData('visibility', value)) {
      this.clients.get(this.host)?.send('notice', {message: 'Steam could not change the room setting. Try again.'});
      return;
    }
    this.public = value === 'public';
    this.sendLobby();
  }

  onMessage(type, handler) { this.handlers.set(type, handler); }
  setMetadata({map}) { this.lobby.setData('map', map); }
  lock() { this.lobby.setJoinable(false); }
  unlock() { this.lobby.setJoinable(true); }

  setSimulationInterval(update, interval) {
    let previous = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      update(now - previous);
      previous = now;
    }, interval);
  }

  broadcast(type, data) {
    for (const client of this.clients.values()) client.send(type, data);
  }

  add(id, profile) {
    if (this.clients.has(id)) return;
    const client = this.client(id);
    this.onAuth(client, profile);
    this.clients.set(id, client);
    try {
      this.onJoin(client, profile);
    } catch (error) {
      this.clients.delete(id);
      throw error;
    }
  }

  client(id) {
    return {sessionId: id, send: (type, data) => this.publish(id, type, data)};
  }

  restoreSeats(previous, members, owner, resumeMatch) {
    this.map = previous?.map ?? this.map;
    this.players = (previous?.players || []).flatMap(player => {
      if (player.bot) return [player];
      if (members.has(player.sessionId)) {
        this.clients.set(player.sessionId, this.client(player.sessionId));
        return [{...player, connected: true}];
      }
      return resumeMatch ? [{...player, sessionId: null, name: player.name + ' (bot)', bot: true, connected: false}] : [];
    });
    this.host = owner;
  }

  remove(id) {
    const client = this.clients.get(id);
    if (!client) return;
    this.clients.delete(id);
    this.onLeave(client);
  }

  receive(id, type, data) {
    const client = this.clients.get(id);
    if (client) this.handlers.get(type)?.(client, data);
  }

  dispose() {
    clearInterval(this.timer);
    this.onDispose();
    this.clients.clear();
  }
}

export function steamMultiplayer(steam, version, emit, invite) {
  const self = String(steam.localplayer.getSteamId().steamId64);
  const protocol = CHANNEL_VERSION + ':' + version;
  let active, attempt = 0, opening = false, openingKey, openingDone;

  function close(notify = false) {
    attempt++;
    const session = active;
    active = null;
    if (!session) return;
    try {
      session.hosted?.dispose();
    } finally {
      session.lobby.leave();
    }
    if (notify) emit({key: session.key, type: 'disconnect'});
  }

  function send(session, id, type, data) {
    if (id === self) {
      emit({key: session.key, type, data});
      return;
    }
    if (type === 'snapshot' && data.round.phase !== 'finished') {
      if (session.sentSnapshot !== data) {
        const body = deflateRawSync(JSON.stringify({lobby: String(session.lobby.id), type, data}));
        const count = Math.ceil(body.length / SNAPSHOT_CHUNK);
        if (body.length > MAX_PACKET) return;
        const seq = session.snapshotSequence = (session.snapshotSequence || 0) + 1;
        session.snapshotPackets = Array.from({length: count}, (_, index) => {
          const chunk = body.subarray(index * SNAPSHOT_CHUNK, (index + 1) * SNAPSHOT_CHUNK);
          const packet = Buffer.allocUnsafe(SNAPSHOT_HEADER + chunk.length);
          packet[0] = 1;
          packet.writeUInt32LE(seq, 1);
          packet[5] = index;
          packet[6] = count;
          chunk.copy(packet, SNAPSHOT_HEADER);
          return packet;
        });
        session.sentSnapshot = data;
      }
      for (const packet of session.snapshotPackets) steam.networking.sendP2PPacket(BigInt(id), UNRELIABLE, packet);
      return;
    }
    const body = deflateRawSync(JSON.stringify({lobby: String(session.lobby.id), type, data}));
    if (body.length < MAX_PACKET) steam.networking.sendP2PPacket(BigInt(id), RELIABLE, Buffer.concat([Buffer.from([0]), body]));
  }

  function packetBody(session, id, packet) {
    if (packet[0] === 0) return packet.subarray(1);
    if (packet[0] !== 1 || session.hosted || id !== session.owner ||
        packet.length <= SNAPSHOT_HEADER || packet.length > SNAPSHOT_HEADER + SNAPSHOT_CHUNK) return null;
    const seq = packet.readUInt32LE(1), index = packet[5], count = packet[6];
    if (!count || count > Math.ceil(MAX_PACKET / SNAPSHOT_CHUNK) || index >= count) return null;
    session.newestFragment = Math.max(seq, session.newestFragment || 0);
    const cutoff = Math.max(session.completedFragment || 0, session.newestFragment - SNAPSHOT_WINDOW);
    if (seq <= cutoff) return null;
    const pending = session.fragments ??= new Map();
    for (const frame of pending.keys()) if (frame <= cutoff) pending.delete(frame);
    if (!pending.has(seq)) pending.set(seq, {chunks: new Array(count), received: 0});
    const frame = pending.get(seq), {chunks} = frame;
    if (count !== chunks.length || chunks[index]) return null;
    chunks[index] = packet.subarray(SNAPSHOT_HEADER);
    if (++frame.received !== count) return null;
    session.completedFragment = seq;
    for (const older of pending.keys()) if (older <= seq) pending.delete(older);
    return Buffer.concat(chunks);
  }

  async function promote(session) {
    const previous = session.lastLobby;
    const checkpoint = session.checkpoint;
    const room = new HostedRoom(session.lobby, (id, type, data) => send(session, id, type, data));
    try {
      await room.onCreate({
        gameMode: session.profile.gameMode,
        public: session.lobby.getData('visibility') === 'public'
      });
      // Countdown and loading restart from the lobby. A running match has a
      // canonical checkpoint with stable player seats and input sequence IDs.
      const resume = checkpoint && ['playing', 'finished'].includes(previous?.phase);
      if (resume) room.sim = await MatchSimulation.restore(checkpoint, previous.players);
      if (active !== session || session.owner !== self || String(session.lobby.getOwner().steamId64) !== self) {
        room.dispose();
        return;
      }
      room.restoreSeats(previous, session.members, self, resume);
      if (resume) {
        // MatchSimulation uses the same player array when deciding who runs as a bot.
        room.sim.players = room.players;
        room.phase = checkpoint.round.phase === 'finished' ? 'finished' : 'playing';
        room.lock();
      } else {
        room.unlock();
        if (!room.clients.has(self)) room.add(self, session.profile);
      }
      session.hosted = room;
      session.connected = true;
      emit({key: session.key, type: 'migrated'});
      room.sendLobby();
      if (room.sim) room.broadcast('snapshot', room.sim.snapshot());
    } catch (error) {
      room.dispose();
      if (active === session && session.owner === self) {
        console.error('Steam host migration failed:', error);
        close(true);
      }
    } finally {
      session.promoting = false;
    }
  }

  function receive(session, id, type, data) {
    if (session.hosted) {
      if (type === 'connect') {
        try {
          if (data?.public && !session.hosted.public && !session.hosted.clients.has(id)) {
            throw new Error('This lobby is now private. Join with a room code or Steam invite.');
          }
          session.hosted.add(id, data);
          session.hosted.receive(id, 'hello');
        } catch (error) {
          send(session, id, 'reject', error.message);
        }
      } else if (type === 'ping') {
        send(session, id, 'pong');
      } else {
        session.hosted.receive(id, type, data);
      }
    } else if (id === session.owner) {
      session.lastHost = performance.now();
      if (type === 'lobby') {
        if (data.host !== session.owner || !data.players.some(player => player.sessionId === self)) return;
        if (session.migrating) {
          session.migrating = false;
          emit({key: session.key, type: 'migrated'});
        }
        if (data.phase === 'waiting' || data.phase === 'loading') {
          session.checkpoint = null;
          session.snapshotId = data.match?.round.profileId;
          session.lastSnapshotTick = -1;
        }
        session.lastLobby = data;
        session.connected = true;
      }
      if (type === 'snapshot') {
        if (!session.connected || !['playing', 'finished'].includes(session.lastLobby?.phase) ||
            (session.snapshotId && data.round.profileId !== session.snapshotId) ||
            data.tick <= (session.lastSnapshotTick ?? -1)) return;
        session.checkpoint = data;
        session.snapshotId = data.round.profileId;
        session.lastSnapshotTick = data.tick;
      }
      if (['lobby', 'snapshot', 'notice', 'reject', 'tool-event'].includes(type)) {
        emit({key: session.key, type, data});
      }
    }
  }

  const poll = setInterval(() => {
    const session = active;
    if (session) {
      const now = performance.now();
      const members = new Set(session.lobby.getMembers().map(player => String(player.steamId64)));
      if (session.hosted) {
        for (const id of members) {
          if (id !== self && !session.members.has(id)) steam.networking.acceptP2PSession(BigInt(id));
        }
      }
      session.members = members;
      const owner = String(session.lobby.getOwner().steamId64);
      if (!members.has(self)) {
        // Steam membership can lag behind an ownership change.
        session.missingSince ??= now;
        if (now - session.missingSince >= 3000) close(true);
        return;
      }
      session.missingSince = null;
      if (members.has(owner) && owner !== session.owner) {
        session.hosted?.dispose();
        session.hosted = null;
        session.owner = owner;
        session.connected = false;
        session.fragments = null;
        session.newestFragment = 0;
        session.completedFragment = 0;
        session.lastSnapshotTick = -1;
        session.migrating = Boolean(session.lastLobby);
        session.lastHost = now;
        session.nextPing = now;
        if (owner !== self) steam.networking.acceptP2PSession(BigInt(owner));
        if (session.migrating) emit({key: session.key, type: 'migrating'});
      } else if (!session.hosted && now - session.lastHost > (session.lastLobby ? 60000 : 25000)) {
        close(true);
      } else if (!session.hosted && owner === self && !session.promoting) {
        session.promoting = true;
        void promote(session);
      } else if (session.hosted) {
        for (const id of session.hosted.clients.keys()) {
          if (id !== self && !session.members.has(id)) session.hosted.remove(id);
        }
      } else if (session.started && owner !== self && owner === session.owner && now >= session.nextPing) {
        if (session.connected) send(session, session.owner, 'ping');
        else send(session, session.owner, 'connect', session.profile);
        session.nextPing = now + 2000;
      }
    }
    const counts = new Map();
    for (let i = 0; i < 80; i++) {
      const size = steam.networking.isP2PPacketAvailable();
      if (!size) break;
      const packet = steam.networking.readP2PPacket(size);
      const id = String(packet.steamId.steamId64);
      if (!active || !active.members.has(id) || (!active.hosted && id !== active.owner) || size > MAX_PACKET) continue;
      const count = (counts.get(id) || 0) + 1;
      counts.set(id, count);
      if (count > (active.hosted ? 12 : 64)) continue;
      try {
        const body = packetBody(active, id, packet.data);
        if (!body) continue;
        const message = JSON.parse(inflateRawSync(body, {maxOutputLength: MAX_SNAPSHOT}));
        if (message.lobby === String(active.lobby.id)) receive(active, id, message.type, message.data);
      } catch {
        // Discard invalid packets from peers.
      }
    }
  }, 1000 / 60);

  const sessionRequest = steam.callback.register(P2P_REQUEST, ({remote}) => {
    if (active?.lobby.getMembers().some(player => player.steamId64 === remote)) {
      steam.networking.acceptP2PSession(remote);
    }
  });
  const inviteRequest = steam.callback.register(INVITE_REQUEST, ({lobby_steam_id}) => invite(String(lobby_steam_id)));

  return {
    async connect(key, mode, profile, code) {
      if (opening || active) throw new Error('Leave the current Steam lobby first.');
      if (!['host', 'public', 'join'].includes(mode)) throw new Error('Invalid lobby action.');
      const target = mode === 'join' ? lobbyId(code) : null;
      const gameMode = ['diretide','tiletide','strikers','balloon'].includes(profile?.gameMode) ? profile.gameMode : 'classic';
      const current = ++attempt;
      opening = true;
      openingKey = key;
      let finishOpening;
      openingDone = new Promise(resolve => { finishOpening = resolve; });
      let lobby, session;
      try {
        let host = mode === 'host';
        if (mode === 'join') {
          lobby = await steam.matchmaking.joinLobby(target);
        } else if (mode === 'public') {
          const candidates = await steam.matchmaking.getLobbies();
          const available = candidates.filter(item => item.getData('pnt') === protocol && item.getData('visibility') === 'public' &&
            item.getData('mode') === gameMode && item.getMemberCount() < 4n);
          for (const candidate of available) {
            if (attempt !== current) throw new Error('Steam lobby request canceled.');
            try {
              lobby = await candidate.join();
            } catch {
              continue; // The room may have filled or locked since discovery.
            }
            if (lobby.getData('visibility') === 'public') break;
            lobby.leave();
            lobby = null;
          }
          host = !lobby;
        }
        // Invisible Steam lobbies support direct joins by ID. PNT's list filters by visibility.
        if (host) lobby = await steam.matchmaking.createLobby(INVISIBLE, 4);
        if (attempt !== current) throw new Error('Steam lobby request canceled.');
        if (host) {
          if (!lobby.mergeFullData({pnt: protocol, mode: gameMode, visibility: mode === 'public' ? 'public' : 'private'})) {
            throw new Error('Steam could not advertise the lobby.');
          }
        } else if (lobby.getData('pnt') !== protocol) {
          throw new Error('This Steam lobby uses a different PNT build.');
        }
        session = {
          key, lobby, owner: String(lobby.getOwner().steamId64),
          members: new Set(lobby.getMembers().map(player => String(player.steamId64))),
          profile: {...profile, public: mode === 'public', gameMode: lobby.getData('mode') || gameMode},
          lastHost: performance.now(), nextPing: 0
        };
        if (host) {
          session.hosted = new HostedRoom(lobby, (id, type, data) => send(session, id, type, data));
          await session.hosted.onCreate({...profile, public: mode === 'public'});
        }
        if (attempt !== current) throw new Error('Steam lobby request canceled.');
        active = session;
        return self;
      } catch (error) {
        session?.hosted?.dispose();
        lobby?.leave();
        throw error;
      } finally {
        opening = false;
        openingKey = null;
        finishOpening();
      }
    },
    send(key, type, data) {
      const session = active;
      if (!session || key !== session.key || !['hello', 'input', 'tool', 'profile', 'control', 'ready', 'load-error'].includes(type)) return;
      if (type === 'hello') {
        if (session.hosted) receive(session, self, 'connect', session.profile);
        else {
          session.started = true;
          session.nextPing = performance.now() + 2000;
          steam.networking.acceptP2PSession(BigInt(session.owner));
          send(session, session.owner, 'connect', session.profile);
        }
      } else if (session.hosted) {
        receive(session, self, type, data);
      } else if (session.connected) {
        send(session, session.owner, type, data);
      }
    },
    async leave(key) {
      if (active?.key === key) close();
      else if (openingKey === key) {
        close();
        await openingDone;
      }
    },
    invite(key) {
      if (active?.key === key) active.lobby.openInviteDialog();
    },
    dispose() {
      clearInterval(poll);
      sessionRequest.disconnect();
      inviteRequest.disconnect();
      close();
    }
  };
}
