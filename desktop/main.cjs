const {app, BrowserWindow, dialog, ipcMain, net, protocol} = require('electron');
const {resolve, sep, dirname} = require('node:path');
const {pathToFileURL} = require('node:url');
const {registerHooks} = require('node:module');
const {steamAppId, smokeTest, devPlaytest} = require('./package.json');

const gameUrl = 'pnt://game/index.html';
const webRoot = resolve(__dirname, 'web');
if (smokeTest) app.setPath('userData', resolve(app.getPath('appData'), 'Police N Thief Smoke Test'));
if (devPlaytest) app.setPath('userData', resolve(app.getPath('appData'), 'Police N Thief Dev Playtest'));
let steam, multiplayer, window;

function lobbyArgument(args) {
  const position = args.indexOf('+connect_lobby');
  return position >= 0 && /^\d{17,20}$/.test(args[position + 1]) ? args[position + 1] : null;
}

let pendingInvite = lobbyArgument(process.argv);
function receiveInvite(code) {
  if (!code) return;
  pendingInvite = code;
  window?.webContents.send('steam:invite');
}

protocol.registerSchemesAsPrivileged([{
  scheme: 'pnt',
  privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true}
}]);

function startSteam() {
  const steamworks = require('steamworks.js');
  if (smokeTest) return true;

  if (steamworks.restartAppIfNecessary(steamAppId)) return false;
  steam = steamworks.init();
  steamworks.electronEnableSteamOverlay(true);
  return true;
}

function serveGame(request) {
  const url = new URL(request.url);
  if (url.host !== 'game') return new Response(null, {status: 404});

  let filename;
  try {
    filename = resolve(webRoot, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  } catch {
    return new Response(null, {status: 400});
  }
  if (!filename.startsWith(webRoot + sep)) return new Response(null, {status: 403});
  return net.fetch(pathToFileURL(filename).href, {
    method: request.method,
    headers: request.headers,
    bypassCustomProtocolHandlers: true
  }).catch(() => new Response(null, {status: 404}));
}

function launch() {
  // Steam looks for development App ID overrides in the working directory.
  process.chdir(dirname(app.getPath('exe')));
  let startupError;
  try {
    if (!startSteam()) {
      app.quit();
      return;
    }
  } catch (error) {
    startupError = error;
  }

  app.whenReady().then(async () => {
    if (startupError) throw startupError;
    protocol.handle('pnt', serveGame);

    window = new BrowserWindow({
      width: 1280,
      height: 800,
      resizable: false,
      maximizable: false,
      fullscreen: steam?.utils.isSteamRunningOnSteamDeck() || process.env.SteamDeck === '1' || process.argv.includes('--fullscreen'),
      autoHideMenuBar: true,
      icon: resolve(__dirname, 'pnt.ico'),
      backgroundColor: '#211b32',
      webPreferences: {
        preload: resolve(__dirname, 'preload.cjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // Keep a 1280 × 720 layout baseline on larger displays. Chromium applies
    // zoom to CSS viewports and pointer coordinates as well as the DOM.
    const scaleLayout = () => {
      const [width, height] = window.getContentSize();
      const zoom = Math.max(1, Math.min(width / 1280, height / 720));
      if (Math.abs(window.webContents.getZoomFactor() - zoom) > 0.001) window.webContents.setZoomFactor(zoom);
    };
    window.on('resize', scaleLayout);
    window.on('enter-full-screen', scaleLayout);
    window.on('leave-full-screen', scaleLayout);
    window.webContents.on('did-finish-load', scaleLayout);
    window.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
    window.webContents.on('will-navigate', (event, url) => {
      if (url !== gameUrl) event.preventDefault();
    });
    const fromGame = event => event.sender === window.webContents &&
      event.senderFrame === window.webContents.mainFrame && event.senderFrame.url === gameUrl;
    ipcMain.on('game:quit', event => { if (fromGame(event)) app.quit(); });

    if (steam) {
      registerHooks({resolve(specifier, context, next) {
        const path = specifier === 'three' ? 'vendor/three/build/three.module.js' :
          specifier.startsWith('three/addons/') ? 'vendor/three/jsm/' + specifier.slice('three/addons/'.length) : null;
        return next(path ? pathToFileURL(resolve(webRoot, path)).href : specifier, context);
      }});
      const {steamMultiplayer} = await import('./web/server/steam-multiplayer.mjs');
      multiplayer = steamMultiplayer(steam, app.getVersion(), message => {
        if (!window.isDestroyed()) window.webContents.send('steam:room-event', message);
      }, receiveInvite);
    }
    ipcMain.handle('steam:connect', (event, ...args) => {
      if (!fromGame(event) || !multiplayer) throw new Error('Steam multiplayer requires a Steam build and a signed-in Steam client.');
      return multiplayer.connect(...args);
    });
    ipcMain.handle('steam:leave', (event, key) => {
      if (fromGame(event)) return multiplayer?.leave(key);
    });
    for (const method of ['send', 'invite']) {
      ipcMain.on('steam:' + method, (event, ...args) => {
        if (fromGame(event)) multiplayer?.[method](...args);
      });
    }
    ipcMain.handle('steam:take-invite', event => {
      if (!fromGame(event)) return null;
      const code = pendingInvite;
      pendingInvite = null;
      return code;
    });

    await window.loadURL(gameUrl);
  }).catch(error => {
    dialog.showErrorBox('Police N Thief could not start', String(error));
    app.exit(1);
  });
}

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => multiplayer?.dispose());
if (app.requestSingleInstanceLock()) {
  app.on('second-instance', (_, args) => {
    receiveInvite(lobbyArgument(args));
    const window = BrowserWindow.getAllWindows()[0];
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  launch();
} else {
  app.quit();
}
