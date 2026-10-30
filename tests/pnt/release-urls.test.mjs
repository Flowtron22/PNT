import test from 'node:test';
import assert from 'node:assert/strict';
import {versionModule,versionHTML} from '../../build/release-urls.mjs';
import {assetURL} from '../../src/pnt/asset-url.js';

test('release stamps static and dynamic local module dependencies without changing bare imports',()=>{
 const source=`import * as T from 'three';import {x} from './fx.js';export {y} from '../ui.js?v=2#part';const lazy=import('../../vendor/sdk.mjs');`;
 const result=versionModule(source,'0.9.83');
 assert.ok(result.includes(`from 'three'`));
 assert.ok(result.includes(`from './fx.js?release=0.9.83'`));
 assert.ok(result.includes(`from '../ui.js?v=2&release=0.9.83#part'`));
 assert.ok(result.includes(`import('../../vendor/sdk.mjs?release=0.9.83')`));
 assert.equal(versionModule(result,'0.9.83'),result);
});
test('HTML versions all game styles and entry modules, preserving unrelated links',()=>{
 const result=versionHTML(`<link href="styles/layout.css?v=2"><script src="src/pnt/main.js"></script><a href="https://example.com">link</a>`,'0.9.83');
 assert.ok(result.includes('styles/layout.css?v=2&release=0.9.83'));
 assert.ok(result.includes('src/pnt/main.js?release=0.9.83'));
 assert.ok(result.includes('href="https://example.com"'));
});
test('VFX textures inherit module release, retain variants and work in local development',()=>{
 assert.equal(assetURL('../../assets/vfx.png?v=2','https://game.test/src/pnt/fx.js?release=0.9.83'),'https://game.test/assets/vfx.png?v=2&release=0.9.83');
 assert.equal(assetURL('../../assets/vfx.png','https://game.test/src/pnt/fx.js'),'https://game.test/assets/vfx.png');
});
