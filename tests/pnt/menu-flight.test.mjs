import assert from 'node:assert/strict';
import test from 'node:test';
import {createMenuFlight} from '../../src/pnt/menu-flight.js';

function setup(lane) {
 const gradient = {addColorStop(){}};
 const context = {
  gradients:0, clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){},
  quadraticCurveTo(){}, closePath(){}, fill(){},
  createLinearGradient(){this.gradients++;return gradient;}
 };
 const canvas = {getContext:()=>context};
 const rolls = [0,lane,.5,0];
 return {context,flight:createMenuFlight(canvas,()=>rolls.shift()??0)};
}

test('home flybys follow either upward-right lane and leave a six-band trail',()=>{
 for (const [random,range] of [[.9,[.18,.22]],[.1,[.78,.82]]]) {
  const {context,flight} = setup(random);
  for (let frame=0;frame<29;frame++) assert.equal(flight.update(.1,1280,800,false,true),null);
  const start = flight.update(.1,1280,800,false,true);
  assert(start.x>range[0]&&start.x<range[1]);
  assert(start.y>1);
  const next = flight.update(.1,1280,800,false,true);
  assert(next.x>start.x&&next.y<start.y&&next.roll>0);
  assert.equal(context.gradients,12);
  for (let frame=0;frame<45;frame++) flight.update(.1,1280,800,false,true);
  assert.equal(flight.update(.1,1280,800,false,true),null);
 }
});

test('other menus and reduced motion cancel flybys without painting a trail',()=>{
 for (const [reduced,home] of [[true,true],[false,false]]) {
  const {context,flight} = setup(.9);
  for (let frame=0;frame<30;frame++) flight.update(.1,1280,800,false,true);
  assert.equal(context.gradients,6);
  assert.equal(flight.update(.1,1280,800,reduced,home),null);
  assert.equal(flight.update(.1,1280,800,false,true),null);
  assert.equal(context.gradients,6);
 }
});
