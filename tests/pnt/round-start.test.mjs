import test from 'node:test';
import assert from 'node:assert/strict';
import {roundStartBeat} from '../../src/pnt/round-start.js';

test('four-second match intro maps to READY, 3, 2, 1 and GO announcer beats',()=>{
 assert.deepEqual([4,3,2,1,0].map(roundStartBeat),['ready','3','2','1','go']);
});
