import * as THREE from 'three';
import {SPLASH_COLORS,SPLASH_SIZE} from './splash-rules.js';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.4,metalness:0,...extra});
// Three bevel segments produce a rounded chamfer while retaining broad, flat box faces.
function boxGeometry(w,h,d){const r=.22,s=new THREE.Shape(),x=-w/2+r,z=-d/2+r;s.moveTo(x,z);s.lineTo(-x,z);s.lineTo(-x,-z);s.lineTo(x,-z);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.1,h-2*r),bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,steps:1,curveSegments:1});g.rotateX(-Math.PI/2);g.translate(0,r,0);g.computeVertexNormals();return g;}
export function createSplashView(parent){
 const root=new THREE.Group();root.name='SplishSplash';parent.add(root);
 // Keep network scoring at grid resolution. Reconstruct a smooth paint contour
 // from separate coverage channels so adjacent colors never blur into each other.
 const coverage=new Uint8Array(SPLASH_SIZE*SPLASH_SIZE*4);
 const tex=new THREE.DataTexture(coverage,SPLASH_SIZE,SPLASH_SIZE);
 tex.magFilter=tex.minFilter=THREE.LinearFilter;
 const floorMaterial=mat('#ece5d3',{roughness:.52});
 floorMaterial.defines={USE_UV:''};
 floorMaterial.onBeforeCompile=shader=>{
  shader.uniforms.splashCoverage={value:tex};
  shader.uniforms.splashColors={value:SPLASH_COLORS.map(color=>new THREE.Color(color))};
  shader.fragmentShader='uniform sampler2D splashCoverage;\nuniform vec3 splashColors[4];\n'+shader.fragmentShader;
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
  `);
 };
 const base=new THREE.Mesh(boxGeometry(24.6,.65,24.6),mat('#29384f'));base.position.y=-.68;root.add(base);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(24,24),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=.015;floor.receiveShadow=true;root.add(floor);
 const cover=new THREE.Group();root.add(cover);const paintMats=SPLASH_COLORS.map(c=>mat(c));
 for(let i=0;i<4;i++){const rail=new THREE.Mesh(boxGeometry(24.6,.45,.35),mat(SPLASH_COLORS[i]));rail.position.set(i%2?i===1?12.18:-12.18:0,.08,i%2?0:i===0?-12.18:12.18);rail.rotation.y=i%2?Math.PI/2:0;root.add(rail);}
 const streakGeometry=new THREE.SphereGeometry(1,8,6);
 const throwGeometry=new THREE.CylinderGeometry(.18,.18,.44,10);
 const spray=Array.from({length:100},()=>{
  const mesh=new THREE.Mesh(streakGeometry,paintMats[0]);
  mesh.visible=false;root.add(mesh);return mesh;
 });
 const direction=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0);
 const ripples=Array.from({length:48},()=>{const m=new THREE.Mesh(new THREE.RingGeometry(.72,1,24),new THREE.MeshBasicMaterial({color:'white',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.visible=false;root.add(m);return {mesh:m,age:1,r:1};});
 const swimmers=Array.from({length:4},(_,i)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(.5,.055,6,24),paintMats[i]);m.rotation.x=-Math.PI/2;root.add(m);return m;});
 const cans=Array.from({length:4},(_,i)=>{const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.5,12),paintMats[i]),lid=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.05,12),mat('#e6f1ff'));lid.position.y=.26;g.add(body,lid);root.add(g);return g;});
 const modelBases=new WeakMap();
 const seenBursts=new Set();let revision=-1,paintMap='',layout='',time=0;
 return {root,update(round,dt,avatars){time+=dt;const key=JSON.stringify(round.paintCover);if(key!==layout){layout=key;cover.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});cover.clear();for(const b of round.paintCover){const m=new THREE.Mesh(boxGeometry(b.w,b.h,b.d),mat('#e4d7b9'));m.position.set(b.x,0,b.z);m.castShadow=m.receiveShadow=true;cover.add(m);const rim=new THREE.Mesh(boxGeometry(b.w-.05,.1,b.d-.05),mat('#99a9b8'));rim.position.set(b.x,b.h-.12,b.z);cover.add(rim);}}
 if(revision!==round.paintRevision || paintMap!==round.paint){
  revision=round.paintRevision;paintMap=round.paint;coverage.fill(0);
  for(let i=0;i<paintMap.length;i++){
   const owner=paintMap.charCodeAt(i)-49;
   if(owner>=0&&owner<4)coverage[i*4+owner]=255;
  }
  tex.needsUpdate=true;
 }
 for(let i=0;i<spray.length;i++){
  const shot=round.paintShots[i],mesh=spray[i];
  mesh.visible=!!shot;if(!shot)continue;
  mesh.material=paintMats[shot.seat];
  mesh.position.set(shot.x,Math.max(.1,shot.y),shot.z);
  if(shot.can){
   mesh.geometry=throwGeometry;mesh.scale.setScalar(1);
   mesh.rotation.set(shot.age*11,0,shot.age*5);
  }else{
   mesh.geometry=streakGeometry;
   mesh.scale.set(.035,.21+shot.age*.25,.035);
   direction.set(shot.vx,shot.vy,shot.vz).normalize();
   mesh.quaternion.setFromUnitVectors(axis,direction);
  }
 }
 for(const b of round.paintBursts){if(seenBursts.has(b.id))continue;seenBursts.add(b.id);if(seenBursts.size>512)seenBursts.delete(seenBursts.values().next().value);const ripple=ripples.find(p=>p.age>=.45)||ripples[0];ripple.age=0;ripple.r=b.r;ripple.mesh.material.color.set(SPLASH_COLORS[b.seat]);ripple.mesh.position.set(b.x,.045,b.z);}
 for(const r of ripples){r.age+=dt;r.mesh.visible=r.age<.45;r.mesh.scale.setScalar(r.r*(.35+Math.min(1,r.age/.45)*.9));r.mesh.material.opacity=Math.max(0,.65*(1-r.age/.45));}
 for(const a of round.actors){const avatar=avatars[a.id],p=avatar?.group.position;if(!p)continue;if(!modelBases.has(avatar.model))modelBases.set(avatar.model,{scale:avatar.model.scale.y,y:avatar.model.position.y});const base=modelBases.get(avatar.model);avatar.model.scale.y=base.scale*(a.submerged?.22:1);avatar.model.position.y=base.y+(a.submerged?-.15:0);const ring=swimmers[a.paintSeat];ring.visible=a.diving;ring.position.set(p.x,.08,p.z);ring.scale.setScalar(1+Math.sin(time*8)*.08);const can=cans[a.paintSeat];can.visible=!a.submerged;can.position.set(p.x+Math.sin(avatar.group.rotation.y+.65)*.6,.8,p.z+Math.cos(avatar.group.rotation.y+.65)*.6);can.rotation.z=a.shotCooldown>.06?-.25:0;}
 },dispose(){tex.dispose();const geometries=new Set([streakGeometry,throwGeometry]),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();}};
}
