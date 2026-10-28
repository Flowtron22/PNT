import test from 'node:test';
import assert from 'node:assert/strict';
import {portraitCameraDistance} from '../../src/pnt/result-portrait-framing.js';

test('result portrait camera backs up for narrow desktop canvases and wide costumes',()=>{
 const size={x:1.8,y:1.9,z:.8},wide=portraitCameraDistance(size,1),narrow=portraitCameraDistance(size,.5);
 assert.ok(narrow>wide*1.6);
 const verticalHalf=narrow*Math.tan(14*Math.PI/180),horizontalHalf=verticalHalf*.5;
 assert.ok(horizontalHalf>size.x/2,'full costume width fits with padding');
 assert.ok(verticalHalf>size.y/2,'full character height fits with padding');
});
