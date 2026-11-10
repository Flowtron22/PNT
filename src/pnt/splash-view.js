import * as THREE from 'three';
import {SPLASH_COLORS,SPLASH_SIZE,splashHoseTarget,splashCanTarget,splashCanHeight,SPLASH_CAN_TIME,paintIndex} from './splash-rules.js';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.4,metalness:0,...extra});
// Three bevel segments produce a rounded chamfer while retaining broad, flat box faces.
function boxGeometry(w,h,d){const r=.22,s=new THREE.Shape(),x=-w/2+r,z=-d/2+r;s.moveTo(x,z);s.lineTo(-x,z);s.lineTo(-x,-z);s.lineTo(x,-z);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.1,h-2*r),bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,steps:1,curveSegments:1});g.rotateX(-Math.PI/2);g.translate(0,r,0);g.computeVertexNormals();return g;}
const LIGHT_SIZE=512;
function bakeGroundContact(data,boxes){
 data.fill(255);
 for(const {x,z,w,d,h} of boxes){
  const spread=1.15,shadowX=-h*.31,shadowZ=-h*.27;
  const cell=24/LIGHT_SIZE;
  const loX=Math.max(0,Math.floor((x-w/2-spread+shadowX+12)/cell));
  const hiX=Math.min(LIGHT_SIZE,Math.ceil((x+w/2+spread+12)/cell));
  const loZ=Math.max(0,Math.floor((z-d/2-spread+shadowZ+12)/cell));
  const hiZ=Math.min(LIGHT_SIZE,Math.ceil((z+d/2+spread+12)/cell));
  for(let iz=loZ;iz<hiZ;iz++)for(let ix=loX;ix<hiX;ix++){
   const dx=(ix+.5)*cell-12-x,dz=(iz+.5)*cell-12-z;
   const dist=(sx,sz)=>Math.hypot(Math.max(0,Math.abs(dx-sx)-w/2),Math.max(0,Math.abs(dz-sz)-d/2));
   const contact=Math.exp(-dist(0,0)*6)*.36;
   const cast=Math.exp(-(dist(shadowX,shadowZ)**2)*4)*.22;
   const index=iz*LIGHT_SIZE+ix;
   data[index]=Math.round(data[index]*(1-contact-cast));
  }
 }
}
const HOSE_STEPS=18,HOSE_SIDES=8;
function createHose(color){
 const geometry=new THREE.PlaneGeometry(1,1,HOSE_SIDES,HOSE_STEPS);
 const colors=new Float32Array((HOSE_STEPS+1)*(HOSE_SIDES+1)*3);
 const base=new THREE.Color(color),shade=new THREE.Color();
 for(let i=0;i<colors.length/3;i++){
  const side=i%(HOSE_SIDES+1),glint=Math.max(0,Math.sin(side/HOSE_SIDES*Math.PI*2))**6;
  shade.copy(base).lerp(new THREE.Color('#ffffff'),glint*.58).toArray(colors,i*3);
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false}));
 mesh.frustumCulled=false;mesh.visible=false;
 return mesh;
}
function updateHose(mesh,p,angle,reach,time){
 const positions=mesh.geometry.attributes.position;
 const dx=Math.sin(angle),dz=Math.cos(angle),nozzle=Math.min(.58,reach);
 for(let i=0;i<=HOSE_STEPS;i++){
  const t=i/HOSE_STEPS,distance=nozzle+(reach-nozzle)*t;
  const y=.85+.14*Math.sin(t*Math.PI)-.79*t*t;
  const radius=(.072+.146*t*t)*(1+.16*Math.sin(t*31-time*35));
  for(let j=0;j<=HOSE_SIDES;j++){
   const phase=j/HOSE_SIDES*Math.PI*2;
   const across=Math.cos(phase)*radius;
   positions.setXYZ(i*(HOSE_SIDES+1)+j,p.x+dx*distance+dz*across,
    y+Math.sin(phase)*radius,p.z+dz*distance-dx*across);
  }
 }
 positions.needsUpdate=true;
}
function createImpactDroplets(root){
 const capacity=192,geometry=new THREE.PlaneGeometry(1,1);
 const material=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,toneMapped:false,
  vertexShader:`
   varying vec2 spriteUv;
   varying vec3 ink;
   void main(){
    spriteUv=uv;ink=instanceColor;
    vec4 center=modelViewMatrix*instanceMatrix[3];
    center.xy+=position.xy*instanceMatrix[0].x;
    gl_Position=projectionMatrix*center;
   }
  `,
  fragmentShader:`
   varying vec2 spriteUv;
   varying vec3 ink;
   void main(){
    vec2 p=spriteUv*2.0-1.0;
    float r=length(p);
    float alpha=1.0-smoothstep(.82,1.0,r);
    if(alpha<.02)discard;
    vec3 body=mix(ink*1.1,ink*.26,smoothstep(.63,.95,r));
    float gleam=1.0-smoothstep(.08,.48,length(p-vec2(-.29,.33)));
    gl_FragColor=vec4(mix(body,vec3(1.0),gleam*.92),alpha);
    #include <colorspace_fragment>
   }
  `
 });
 const sprites=new THREE.InstancedMesh(geometry,material,capacity);
 sprites.frustumCulled=false;sprites.count=0;root.add(sprites);
 const pool=Array.from({length:capacity},()=>({life:0}));
 const palette=SPLASH_COLORS.map(c=>new THREE.Color(c)),transform=new THREE.Matrix4();
 sprites.setColorAt(0,palette[0]);
 let cursor=0;
 return {
  emit(x,z,seat){
   const drop=pool[cursor];cursor=(cursor+1)%capacity;
   const angle=Math.random()*Math.PI*2,speed=1.35+Math.random()*3;
   const life=.28+Math.random()*.23;
   Object.assign(drop,{x,z,y:.11,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed,
    vy:2.4+Math.random()*2.5,life,duration:life,seat,size:.19+Math.random()*.16});
  },
  update(dt){
   let count=0;
   for(const drop of pool){
    if(drop.life<=0)continue;
    drop.life-=dt;drop.vy-=12*dt;
    drop.x+=drop.vx*dt;drop.z+=drop.vz*dt;drop.y+=drop.vy*dt;
    if(drop.y<=.02||drop.life<=0){drop.life=0;continue;}
    const size=drop.size*Math.min(1,drop.life/drop.duration*3);
    transform.makeScale(size,size,size).setPosition(drop.x,drop.y,drop.z);
    sprites.setMatrixAt(count,transform);sprites.setColorAt(count++,palette[drop.seat]);
   }
   sprites.count=count;sprites.instanceMatrix.needsUpdate=sprites.instanceColor.needsUpdate=true;
  },
  dispose(){sprites.removeFromParent();sprites.dispose();material.dispose();geometry.dispose();}
 };
}
function createFootstepRipples(root){
 const geometry=new THREE.RingGeometry(.84,1,24);
 const pool=Array.from({length:24},()=>{
  const material=new THREE.MeshBasicMaterial({color:'white',transparent:true,depthWrite:false,toneMapped:false});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='PaintFootstepRipple';mesh.rotation.x=-Math.PI/2;mesh.visible=false;root.add(mesh);
  return {mesh,age:1};
 });
 const tracks=new WeakMap(),highlight=new THREE.Color('#ffffff');
 let cursor=0;
 return {
  track(round,avatar,dt,reduced){
   const p=avatar.group.position;
   const track=tracks.get(avatar)||{x:p.x,z:p.z,distance:0,side:1};
   tracks.set(avatar,track);
   const dx=p.x-track.x,dz=p.z-track.z,travel=Math.hypot(dx,dz);
   track.x=p.x;track.z=p.z;
   if(dt<=0||!avatar.grounded||round.startRemaining>0||round.phase!=='playing'||travel>1.2){
    track.distance=0;return;
   }
   const stride=reduced?1.3:.64;
   track.distance+=travel;
   if(track.distance<stride||travel<.001)return;
   const offset=track.distance-stride;
   track.distance=offset%stride;
   const x=p.x-(dx*offset+dz*.16*track.side)/travel;
   const z=p.z-(dz*offset-dx*.16*track.side)/travel;
   track.side*=-1;
   const owner=Number(round.paint[paintIndex(x,z)]);
   if(!(owner>=1&&owner<=4))return;
   const ripple=pool[cursor];cursor=(cursor+1)%pool.length;
   ripple.age=0;ripple.mesh.position.set(x,.052,z);
   ripple.mesh.material.color.set(SPLASH_COLORS[owner-1]).lerp(highlight,.66);
  },
  update(dt){
   for(const ripple of pool){
    ripple.age+=dt;
    const t=ripple.age/.48;
    ripple.mesh.visible=t<1;
    if(t>=1)continue;
    ripple.mesh.scale.setScalar(.16+.48*t);
    ripple.mesh.material.opacity=.72*(1-t);
   }
  }
 };
}
export function createSplashView(parent){
 const root=new THREE.Group();root.name='SplishSplash';parent.add(root);
 // Keep network scoring at grid resolution. Reconstruct a smooth paint contour
 // from separate coverage channels so adjacent colors never blur into each other.
 const coverage=new Uint8Array(SPLASH_SIZE*SPLASH_SIZE*4);
 const tex=new THREE.DataTexture(coverage,SPLASH_SIZE,SPLASH_SIZE);
 tex.magFilter=tex.minFilter=THREE.LinearFilter;
 const lighting=new Uint8Array(LIGHT_SIZE*LIGHT_SIZE).fill(255);
 const lightmap=new THREE.DataTexture(lighting,LIGHT_SIZE,LIGHT_SIZE,THREE.RedFormat);
 lightmap.magFilter=lightmap.minFilter=THREE.LinearFilter;lightmap.needsUpdate=true;
 const floorMaterial=mat('#ece5d3',{roughness:.52});
 floorMaterial.defines={USE_UV:''};
 floorMaterial.onBeforeCompile=shader=>{
  shader.uniforms.splashCoverage={value:tex};
  shader.uniforms.splashLightmap={value:lightmap};
  shader.uniforms.splashColors={value:SPLASH_COLORS.map(color=>new THREE.Color(color))};
  shader.fragmentShader='uniform sampler2D splashCoverage;\nuniform sampler2D splashLightmap;\nuniform vec3 splashColors[4];\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
   #include <color_fragment>
   vec4 weights=texture2D(splashCoverage,vec2(vUv.x,1.0-vUv.y));
   float dominant=max(max(weights.r,weights.g),max(weights.b,weights.a));
   vec3 paint=weights.r==dominant?splashColors[0]:
     weights.g==dominant?splashColors[1]:weights.b==dominant?splashColors[2]:splashColors[3];
   float edge=max(fwidth(dominant)*.58,.025);
   float wet=smoothstep(.48-edge,.48+edge,dominant);
   diffuseColor.rgb=mix(diffuseColor.rgb,paint,wet);
  `).replace('#include <roughnessmap_fragment>',`
   #include <roughnessmap_fragment>
   roughnessFactor=mix(roughnessFactor,.24,wet);
  `).replace('#include <tonemapping_fragment>',`
   #include <tonemapping_fragment>
   float floorLight=texture2D(splashLightmap,vec2(vUv.x,1.0-vUv.y)).r;
   gl_FragColor.rgb=mix(gl_FragColor.rgb,paint*.91,wet*.86)*floorLight;
  `);
 };
 const base=new THREE.Mesh(boxGeometry(24.6,.65,24.6),mat('#29384f'));base.position.y=-.68;root.add(base);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(24,24),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=.015;floor.receiveShadow=true;root.add(floor);
 const cover=new THREE.Group();root.add(cover);const paintMats=SPLASH_COLORS.map(c=>mat(c));
 for(let i=0;i<4;i++){const rail=new THREE.Mesh(boxGeometry(24.6,.45,.35),mat(SPLASH_COLORS[i]));rail.position.set(i%2?i===1?12.18:-12.18:0,.08,i%2?0:i===0?-12.18:12.18);rail.rotation.y=i%2?Math.PI/2:0;root.add(rail);}
 const throwGeometry=new THREE.CylinderGeometry(.18,.18,.44,10);
 const launches=SPLASH_COLORS.map((color,seat)=>{
  const mesh=new THREE.Mesh(throwGeometry,paintMats[seat]);
  mesh.visible=false;root.add(mesh);return mesh;
 });
 const hoses=SPLASH_COLORS.map(color=>{const mesh=createHose(color);root.add(mesh);return mesh;});
 const droplets=createImpactDroplets(root),impactTimers=[0,0,0,0];
 const guideMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false});
 const guide=new THREE.Group(),dotGeometry=new THREE.SphereGeometry(.048,7,5);
 for(let i=0;i<12;i++)guide.add(new THREE.Mesh(dotGeometry,guideMaterial));
 const marker=new THREE.Mesh(new THREE.RingGeometry(.33,.44,32),guideMaterial);
 marker.rotation.x=-Math.PI/2;guide.add(marker);root.add(guide);
 const ripples=Array.from({length:48},()=>{const m=new THREE.Mesh(new THREE.RingGeometry(.72,1,24),new THREE.MeshBasicMaterial({color:'white',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.visible=false;root.add(m);return {mesh:m,age:1,r:1};});
 const swimmers=Array.from({length:4},(_,i)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(.5,.055,6,24),paintMats[i]);m.rotation.x=-Math.PI/2;root.add(m);return m;});
 const cans=Array.from({length:4},(_,i)=>{const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.5,12),paintMats[i]),lid=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.05,12),mat('#e6f1ff'));lid.position.y=.26;g.add(body,lid);root.add(g);return g;});
 const modelBases=new WeakMap(),footsteps=createFootstepRipples(root);
 const seenBursts=new Set();let revision=-1,paintMap='',layout='',time=0;
 return {root,update(round,dt,avatars,reduced=false){time+=dt;const key=JSON.stringify(round.paintCover);if(key!==layout){layout=key;bakeGroundContact(lighting,round.paintCover);lightmap.needsUpdate=true;cover.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});cover.clear();for(const b of round.paintCover){const m=new THREE.Mesh(boxGeometry(b.w,b.h,b.d),mat('#e4d7b9'));m.position.set(b.x,0,b.z);m.castShadow=m.receiveShadow=true;cover.add(m);const rim=new THREE.Mesh(boxGeometry(b.w-.05,.1,b.d-.05),mat('#99a9b8'));rim.position.set(b.x,b.h-.12,b.z);cover.add(rim);}}
 if(revision!==round.paintRevision || paintMap!==round.paint){
  revision=round.paintRevision;paintMap=round.paint;coverage.fill(0);
  for(let i=0;i<paintMap.length;i++){
   const owner=paintMap.charCodeAt(i)-49;
   if(owner>=0&&owner<4)coverage[i*4+owner]=255;
  }
  tex.needsUpdate=true;
 }
 for(const mesh of launches)mesh.visible=false;
 for(const shot of round.paintShots){
  if(shot.age<0)continue;
  const mesh=launches[shot.seat];mesh.visible=true;
  mesh.position.set(shot.x,shot.y,shot.z);
  mesh.rotation.set(shot.age*11,0,shot.age*5);
 }
 const local=round.actors[0],localAvatar=avatars[0];
 const inFlight=round.paintShots.find(shot=>shot.seat===local.paintSeat);
 const ready=round.phase==='playing'&&!round.startRemaining&&local.ink>=30&&local.toolCooldowns[1]<=0;
 guide.visible=!!localAvatar&&(ready||!!inFlight);
 if(guide.visible){
  const p=localAvatar.group.position,angle=localAvatar.group.rotation.y;
  const origin=inFlight?{x:inFlight.startX,z:inFlight.startZ}:p;
  const target=inFlight?{x:inFlight.targetX,z:inFlight.targetZ}:splashCanTarget(round.paintCover,p,angle);
  for(let i=0;i<12;i++){
   const t=(i+1)/13,dot=guide.children[i];
   dot.visible=!inFlight||t>inFlight.age/SPLASH_CAN_TIME;
   dot.position.set(origin.x+(target.x-origin.x)*t,splashCanHeight(t),origin.z+(target.z-origin.z)*t);
  }
  marker.position.set(target.x,.065,target.z);
  guideMaterial.color.set(SPLASH_COLORS[local.paintSeat]);
 }
 for(const actor of round.actors){
  const avatar=avatars[actor.id],hose=hoses[actor.paintSeat];
  hose.visible=!!avatar&&actor.spraying===true&&round.phase==='playing';
  if(!hose.visible){impactTimers[actor.paintSeat]=0;continue;}
  const p=avatar.group.position,angle=actor.sprayAngle;
  const {x,z,distance}=splashHoseTarget(round.paintCover,p,angle);
  updateHose(hose,p,angle,distance,time);
  if(dt>0){
   const interval=reduced?.12:.043;
   impactTimers[actor.paintSeat]+=dt;
   while(impactTimers[actor.paintSeat]>=interval){
    impactTimers[actor.paintSeat]-=interval;
    const count=reduced?1:3;
    for(let i=0;i<count;i++)droplets.emit(x,z,actor.paintSeat);
   }
  }
 }
 droplets.update(dt);
 for(const b of round.paintBursts){if(seenBursts.has(b.id))continue;seenBursts.add(b.id);if(seenBursts.size>512)seenBursts.delete(seenBursts.values().next().value);const ripple=ripples.find(p=>p.age>=.45)||ripples[0];ripple.age=0;ripple.r=b.r;ripple.mesh.material.color.set(SPLASH_COLORS[b.seat]);ripple.mesh.position.set(b.x,.045,b.z);}
 for(const r of ripples){r.age+=dt;r.mesh.visible=r.age<.45;r.mesh.scale.setScalar(r.r*(.35+Math.min(1,r.age/.45)*.9));r.mesh.material.opacity=Math.max(0,.65*(1-r.age/.45));}
 for(const a of round.actors){const avatar=avatars[a.id],p=avatar?.group.position;if(!p)continue;footsteps.track(round,avatar,dt,reduced);if(!modelBases.has(avatar.model))modelBases.set(avatar.model,{scale:avatar.model.scale.y,y:avatar.model.position.y});const base=modelBases.get(avatar.model);avatar.model.scale.y=base.scale*(a.submerged?.22:1);avatar.model.position.y=base.y+(a.submerged?-.15:0);const ring=swimmers[a.paintSeat];ring.visible=a.diving;ring.position.set(p.x,.08,p.z);ring.scale.setScalar(1+Math.sin(time*8)*.08);const can=cans[a.paintSeat];can.visible=!a.submerged&&!launches[a.paintSeat].visible;const facing=avatar.group.rotation.y;can.position.set(p.x-Math.sin(facing)*.53,p.y+1.02,p.z-Math.cos(facing)*.53);can.rotation.set(-.16,facing,.08,'YXZ');}
 footsteps.update(dt);
 },dispose(){droplets.dispose();tex.dispose();lightmap.dispose();const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();}};
}
