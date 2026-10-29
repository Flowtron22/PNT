import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('menu pages use the loading-screen purple stripes while lobbies retain their own backdrop',()=>{
 const css=readFileSync(new URL('../../styles/pnt.css',import.meta.url),'utf8'),html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 assert.match(css,/body\.menu-view \.menu-backdrop\{[^}]*background-color:#1c1730[^}]*linear-gradient\(90deg[^}]*repeating-linear-gradient\(135deg/);
 assert.match(css,/\.menu-backdrop:after\{[^}]*radial-gradient\(#fff 1px,transparent 1px\)/);assert.doesNotMatch(css,/body\.menu-view \.menu-backdrop:after\{display:none\}/);
 assert.match(css,/body\.lobby-view \.menu-backdrop\{display:none\}/);
 assert.match(css,/\.lobby-backdrop\{[^}]*radial-gradient\(ellipse at 50% 30%/);
 assert.doesNotMatch(html,/PACKING A LITTLE TROUBLE|A clean getaway starts with a good warm-up/);
});
