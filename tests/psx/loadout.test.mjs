import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLoadout,equipTool,normalizeCostume} from '../../src/psx/loadout.js';
import {COSTUMES} from '../../src/psx/catalog.js';
test('old single-tool saves migrate to two valid distinct slots',()=>{
 assert.deepEqual(normalizeLoadout(null,'rocket'),['rocket','hammer']);
 assert.deepEqual(normalizeLoadout('["banana","banana"]'),['banana','hammer']);
 assert.deepEqual(normalizeLoadout('broken'),['hammer','banana']);
});
test('equipping a tool updates only its slot or swaps an already equipped tool',()=>{
 const original=['hammer','banana'];assert.deepEqual(equipTool(original,'rocket',1),['hammer','rocket']);
 assert.deepEqual(equipTool(original,'hammer',1),['banana','hammer']);assert.deepEqual(original,['hammer','banana']);
 assert.throws(()=>equipTool(original,'bad',0));assert.throws(()=>equipTool(original,'hammer',2));
});
test('every costume is shared and independent of gameplay role',()=>{
 for(const costume of COSTUMES){assert.equal(normalizeCostume(costume.id),costume.id);assert.equal(costume.role,undefined);}
 assert.ok(COSTUMES.some(c=>c.id==='police'));assert.ok(COSTUMES.some(c=>c.id==='thief'));assert.equal(normalizeCostume('role'),'thief');
});
