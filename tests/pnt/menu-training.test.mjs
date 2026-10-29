import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('Training is a main-menu action directly below Play and no longer appears in online flows',()=>{
 const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8'),main=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8');
 assert.match(html,/data-page="play"[^>]*>[\s\S]*?<\/button>\s*<button id="training" class="nav-button"/);
 assert.match(html,/<span>TRAINING<\/span>/);assert.match(main,/\$\('#training'\)\.onclick=hostLobby/);
 assert.doesNotMatch(main,/play-practice|join-practice/);assert.match(main,/openPage\(training\?'home':'play'\)/);
});
