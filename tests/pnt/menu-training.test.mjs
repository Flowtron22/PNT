import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('Events sits below Play and Training stays on the main menu',()=>{
 const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8'),main=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8');
 assert.match(html,/data-page="play"[^>]*>[\s\S]*?<\/button>\s*<button class="nav-button event-nav" data-page="events"/);
 assert.match(html,/<button id="training" class="nav-button"/);
 assert.match(html,/<span>TRAINING<\/span>/);assert.match(main,/\$\('#training'\)\.onclick=\(\)=>\{selectedMode='classic';hostLobby\(\);\}/);
 assert.doesNotMatch(main,/play-practice|join-practice/);assert.match(main,/openPage\(event\?'events':training\?'home':'play'\)/);
});
