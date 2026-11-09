import {cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {Data, NtExecutable, NtExecutableResource, Resource} from 'resedit';

const root = fileURLToPath(new URL('../', import.meta.url));
const smokeTest = process.argv.includes('--smoke-test');
const devPlaytest = process.argv.includes('--dev-playtest');
if (smokeTest && devPlaytest) throw new Error('Choose either --smoke-test or --dev-playtest.');
const appId = devPlaytest ? 480 : Number(process.env.PNT_STEAM_APP_ID);
if (!smokeTest && !devPlaytest && (!Number.isInteger(appId) || appId <= 0 || appId > 0xffffffff || appId === 480)) {
  throw new Error('Set PNT_STEAM_APP_ID to the assigned App ID, or select a development build.');
}
if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('Build the Steam depot on Windows with x64 Node.js.');
}

const require = createRequire(import.meta.url);
const electronExe = require('electron');
const steamworks = dirname(require.resolve('steamworks.js'));
const {version} = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

await import('./pnt-web.mjs');

const outputRoot = join(root, 'dist-steam');
const output = join(outputRoot, smokeTest ? 'win64-smoke-test' : devPlaytest ? `win64-dev-playtest-${version}` : 'win64');
mkdirSync(outputRoot, {recursive: true});
const staging = mkdtempSync(join(outputRoot, 'staging-'));
try {
  cpSync(dirname(electronExe), staging, {recursive: true});
  const gameExe = join(staging, 'Police N Thief.exe');
  renameSync(join(staging, 'electron.exe'), gameExe);
  const executable = NtExecutable.from(readFileSync(gameExe), {ignoreCert: true});
  const resources = NtExecutableResource.from(executable);
  const icon = Data.IconFile.from(readFileSync(join(root, 'desktop', 'pnt.ico')));
  for (const group of Resource.IconGroupEntry.fromEntries(resources.entries)) {
    Resource.IconGroupEntry.replaceIconsForResource(resources.entries, group.id, group.lang, icon.icons.map(entry => entry.data));
  }
  resources.outputResource(executable);
  writeFileSync(gameExe, Buffer.from(executable.generate()));
  if (devPlaytest) writeFileSync(join(staging, 'steam_appid.txt'), `${appId}\n`);
  const app = join(staging, 'resources', 'app');
  mkdirSync(app, {recursive: true});
  cpSync(join(root, 'desktop'), app, {recursive: true});
  const web = join(app, 'web');
  const excluded = new Set(['manifest.webmanifest', 'app-update.js', 'app-update.css']);
  cpSync(join(root, 'dist'), web, {
    recursive: true,
    filter: source => !excluded.has(source.split(/[\\/]/).at(-1))
  });
  const server = join(web, 'server');
  mkdirSync(server);
  for (const file of ['steam-multiplayer.mjs', 'match-room.mjs', 'simulation.mjs', 'arena.mjs']) {
    cpSync(join(root, 'server', file), join(server, file));
  }
  const index = join(web, 'index.html');
  const html = readFileSync(index, 'utf8')
    .replace(/<meta name="(?:apple-)?mobile-web-app-[^"]+"[^>]*>/g, '')
    .replace(/<link rel="(?:manifest|apple-touch-icon)"[^>]*>/g, '')
    .replace(/<link rel="stylesheet" href="styles\/app-update\.css[^"]*"[^>]*>/, '')
    .replace(/<script type="module" src="src\/pnt\/app-update\.js[^"]*"><\/script>/, '')
    .replace(/<div class="touch-controls">.*?<\/svg><\/div><\/div><\/div>/s, '')
    .replace('OR CLICK OR TAP TO START', 'OR PRESS A CONTROLLER BUTTON')
    .replace(/(<button class="nav-button" data-page="credits".*?<\/button>)/,
      '$1\n    <button class="nav-button" id="quit-game"><i aria-hidden="true">×</i><span>QUIT GAME</span><b>›</b></button>');
  writeFileSync(index, html);
  writeFileSync(join(app, 'package.json'), JSON.stringify({
    name: 'police-n-thief',
    productName: 'Police N Thief',
    type: 'module',
    version,
    main: 'main.cjs',
    steamAppId: smokeTest ? null : appId,
    smokeTest,
    devPlaytest
  }, null, 2));

  const binding = join(app, 'node_modules', 'steamworks.js');
  mkdirSync(join(binding, 'dist', 'win64'), {recursive: true});
  for (const file of ['index.js', 'package.json', 'LICENSE']) {
    cpSync(join(steamworks, file), join(binding, file));
  }
  for (const file of ['steamworksjs.win32-x64-msvc.node', 'steam_api64.dll']) {
    cpSync(join(steamworks, 'dist', 'win64', file), join(binding, 'dist', 'win64', file));
  }

  rmSync(join(staging, 'resources', 'default_app.asar'), {force: true});
  rmSync(output, {recursive: true, force: true});
  renameSync(staging, output);
  console.log(`Steam desktop build ready in ${output}`);
} finally {
  rmSync(staging, {recursive: true, force: true});
}
