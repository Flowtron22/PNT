import assert from 'node:assert/strict';
import test from 'node:test';
import {createMenuFlight} from '../../src/pnt/menu-flight.js';

function setup(lane,costumeRoll=0) {
 const gradient = {addColorStop(){}};
 const context = {
  gradients:0, clearRect(){}, beginPath(){this.points=[];},
  moveTo(x,y){this.points.push({x,y});}, lineTo(x,y){this.points.push({x,y});},
  quadraticCurveTo(){}, closePath(){},
  fill(){if(this.fillStyle===gradient&&this.gradients%6===4)this.centerline=this.points.slice(0,13);},
  createLinearGradient(){this.gradients++;return gradient;}
 };
 const canvas = {getContext:()=>context};
 const rolls = [0,lane,.5,0,costumeRoll, lane,.5,0,costumeRoll];
 return {context,flight:createMenuFlight(canvas,()=>rolls.shift()??0)};
}

test('home flybys follow either upward-right lane and leave a six-band trail',()=>{
 for (const [random,range] of [[.30,[.18,.22]],[.1,[.78,.82]]]) {
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

test('side-entry flybys arc in both directions, with the ribbon bending up to the flyer',()=>{
 for (const [random,direction] of [[.62,1],[.9,-1]]) {
  const {context,flight}=setup(random);
  let start;
  for(let frame=0;frame<30;frame++)start=flight.update(.1,1280,800,false,true);
  assert(direction>0?start.x<0:start.x>1);
  let later;
  for(let frame=0;frame<18;frame++)later=flight.update(.1,1280,800,false,true);
  assert(direction*(later.x-start.x)>0&&later.y<start.y);
  assert(direction*later.roll>0&&Math.abs(later.roll-start.roll)>.2);
  const [tail]=context.centerline,mid=context.centerline[6],head=context.centerline.at(-1);
  assert(Math.abs(head.x-later.x*1280)<1e-9&&Math.abs(head.y-later.y*800)<1e-9);
  const twiceArea=(head.x-tail.x)*(mid.y-tail.y)-(head.y-tail.y)*(mid.x-tail.x);
  assert(Math.abs(twiceArea)>100,'ribbon samples must follow the curve');
 }
});

test('each flyby picks one of five costumes and spins continuously during ascent',()=>{
 const costumes = ['oyen','thief','police','raptor','pingu'];
 for (const [index,costume] of costumes.entries()) {
  const {flight} = setup(.9,(index+.5)/costumes.length);
  let first;
  for (let frame=0;frame<30;frame++) first = flight.update(.1,1280,800,false,true);
  assert.equal(first.costume,costume);
  const next = flight.update(.1,1280,800,false,true);
  assert.equal(next.costume,costume);
  assert(Math.abs(next.spin-first.spin-.1*1.5*2*Math.PI)<1e-10);

  let last = next;
  for (let frame=0;frame<45&&last;frame++) last = flight.update(.1,1280,800,false,true);
  assert.equal(last,null);
  let second;
  for (let frame=0;frame<100&&!second;frame++) second = flight.update(.1,1280,800,false,true);
  assert(costumes.includes(second?.costume));
  assert.notEqual(second.costume,costume);
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
