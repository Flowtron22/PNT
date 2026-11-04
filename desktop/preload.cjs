const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('pntDesktop', {
  quit: () => ipcRenderer.send('game:quit'),
  steam: {
    connect: (...args) => ipcRenderer.invoke('steam:connect', ...args),
    send: (...args) => ipcRenderer.send('steam:send', ...args),
    leave: key => ipcRenderer.invoke('steam:leave', key),
    invite: key => ipcRenderer.send('steam:invite', key),
    takeInvite: () => ipcRenderer.invoke('steam:take-invite'),
    onInvite: fn => { ipcRenderer.on('steam:invite', () => fn()); },
    onRoomEvent: fn => {
      const listener = (_, message) => fn(message);
      ipcRenderer.on('steam:room-event', listener);
      return () => ipcRenderer.removeListener('steam:room-event', listener);
    }
  }
});
