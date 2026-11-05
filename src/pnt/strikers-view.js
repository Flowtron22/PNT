import * as THREE from 'three';
import {BALL_RADIUS,BUFF_COLORS,FIELD,KICK_DURATION,KICK_WINDUP} from './strikers-rules.js';

function createBallTexture(){
 const canvas=document.createElement('canvas');
 canvas.width=512;
 canvas.height=256;
 const paint=canvas.getContext('2d');
 paint.fillStyle='#ffe32d';
 paint.fillRect(0,0,canvas.width,canvas.height);
 paint.fillStyle='#1454bb';
 const panel=[[8,0],[67,5],[116,39],[83,68],[62,43],[29,64],[0,31]];
 for(const [y,offset] of [[32,0],[102,64],[172,0]]){
  for(let x=offset-128;x<canvas.width;x+=128){
   paint.beginPath();
   for(const [dx,dy] of panel)paint.lineTo(x+dx,y+dy);
   paint.closePath();
   paint.fill();
  }
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=THREE.RepeatWrapping;
 return texture;
}

function pickupGeometry(){
 const shape=new THREE.Shape();
 shape.moveTo(-.26,-.26);shape.lineTo(.26,-.26);shape.lineTo(.26,.26);shape.lineTo(-.26,.26);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.52,bevelEnabled:true,bevelSegments:1,bevelSize:.09,bevelThickness:.09});
 geometry.center();
 return geometry;
}

function createLightning(){
 const segments=16,vertices=new Float32Array(segments*18);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3).setUsage(THREE.DynamicDrawUsage));
 const material=new THREE.MeshBasicMaterial({color:0x72edff,side:THREE.DoubleSide,toneMapped:false,transparent:true,depthWrite:false});
 const mesh=new THREE.Mesh(geometry,material);
 mesh.frustumCulled=false;
 mesh.visible=false;
 return {mesh,update(position,angle,progress){
  mesh.position.copy(position);
  material.opacity=Math.sin(Math.PI*Math.max(.08,progress));
  const point=i=>{
   const t=i/segments,heading=angle+progress*Math.PI*2-t*4.8;
   const radius=.65+t*.43+(i%2?.13:-.08);
   return [Math.sin(heading)*radius,.35+t*.75+(i%3===0?.12:0),Math.cos(heading)*radius];
  };
  let index=0;
  for(let i=0;i<segments;i++){
   const a=point(i),b=point(i+1),width=.075*(1-i/segments)+.018;
   const upperA=[a[0],a[1]+width,a[2]],upperB=[b[0],b[1]+width,b[2]];
   for(const p of [a,upperA,b,b,upperA,upperB])for(const value of p)vertices[index++]=value;
  }
  geometry.attributes.position.needsUpdate=true;
 }};
}

export function createStrikersView(parent){
 const root=new THREE.Group();
 parent.add(root);
 const ballTexture=createBallTexture();
 const ball=new THREE.Mesh(
  new THREE.SphereGeometry(BALL_RADIUS,24,16),
  new THREE.MeshStandardMaterial({map:ballTexture,roughness:.42})
 );
 ball.castShadow=true;
 root.add(ball);
 const lightning=Array.from({length:4},()=>createLightning());
 for(const arc of lightning)root.add(arc.mesh);

 const marker=new THREE.Mesh(new THREE.CircleGeometry(.53,40),new THREE.MeshBasicMaterial({color:0xffdf24,toneMapped:false}));
 marker.rotation.x=-Math.PI/2;
 root.add(marker);
 const lines=[
  [FIELD.minX,0,FIELD.maxX,0]
 ];
 const line=new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(lines.flatMap(([x,z,toX,toZ])=>[new THREE.Vector3(x,.035,z),new THREE.Vector3(toX,.035,toZ)])),
  new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.55})
 );
 root.add(line);

 const pickups=new Map();
 const rollAxis=new THREE.Vector3();
 let hasBallPosition=false,pulseTime=0;

 return {
  root,
  update(round,dt,avatars=[],reduced=false){
   const [x,y,z]=round.ball.position;
   const dx=x-ball.position.x,dz=z-ball.position.z,distance=Math.hypot(dx,dz);
   if(hasBallPosition&&dt>0&&distance>0&&distance<2){
    rollAxis.set(dz/distance,0,-dx/distance);
    ball.rotateOnWorldAxis(rollAxis,distance/BALL_RADIUS);
   }
   hasBallPosition=true;
   ball.position.set(x,y,z);
   marker.position.set(x,.027,z);
   pulseTime+=dt;
   marker.scale.setScalar(reduced?1:1+.12*Math.sin(pulseTime*5));
   const shocked=round.ball.shockTime>0;
   ball.material.emissive.set(shocked?0x7b24d6:0);
   ball.material.emissiveIntensity=shocked?.75:0;
   for(let i=0;i<lightning.length;i++){
    const arc=lightning[i],state=round.actors[i],actor=avatars[i];
    const elapsed=KICK_DURATION-(state?.effectTime||0);
    arc.mesh.visible=!!actor&&state.effect==='kick'&&state.effectTime>0&&elapsed>=KICK_WINDUP&&!reduced;
    if(arc.mesh.visible)arc.update(actor.group.position,actor.group.rotation.y,(elapsed-KICK_WINDUP)/(KICK_DURATION-KICK_WINDUP));
   }
   const ids=new Set(round.buffs.map(buff=>buff.id));
   for(const [id,item] of pickups){
    if(ids.has(id))continue;
    item.removeFromParent();
    item.geometry.dispose();
    item.material.dispose();
    pickups.delete(id);
   }
   for(const buff of round.buffs){
    let item=pickups.get(buff.id);
    if(!item){
     item=new THREE.Mesh(pickupGeometry(),new THREE.MeshStandardMaterial({color:BUFF_COLORS[buff.type],emissive:BUFF_COLORS[buff.type],emissiveIntensity:.32,roughness:.3,metalness:0}));
     root.add(item);
     pickups.set(buff.id,item);
    }
    item.position.fromArray(buff.position);
    item.rotation.y+=dt*2.4;
    item.rotation.x+=dt*.8;
   }
  },
  dispose(){
   root.removeFromParent();
   ballTexture.dispose();
   root.traverse(object=>{
    if(!object.isMesh&&!object.isLine)return;
    object.geometry.dispose();
    object.material.dispose();
   });
  }
 };
}
