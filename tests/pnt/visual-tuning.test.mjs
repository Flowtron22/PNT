import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('all gameplay arenas use the brighter color grade and ten-percent lower lights',()=>{
 const main=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8'),appearance=readFileSync(new URL('../../src/pnt/arena-appearance.js',import.meta.url),'utf8');assert.match(appearance,/ARENA_SATURATION=1\.2/);
 assert.match(main,/sunlight\.intensity=\(id==='mall'\?2\.4:3\)\*\.9/);assert.match(main,/fill\.intensity=\(id==='mall'\?\.96:1\.2\)\*\.9/);
 assert.match(main,/hemisphere\.intensity=\(id==='mall'\?1\.92:2\.4\)\*\.9/);assert.match(main,/mallFill\.intensity=1\.2\*\.9/);
});
