import * as THREE from 'three';
let engine;
export async function loadFurniturePhysics(){if(!engine)engine=import('../../vendor/rapier/rapier.mjs').then(async m=>{await m.default.init();return m.default;});return engine;}
export async function createMallPhysics(arena,root,grid){
 const R=await loadFurniturePhysics(),world=new R.World({x:0,y:-12,z:0}),furniture=[],players=new Map();
 const controller=world.createCharacterController(.015);controller.setApplyImpulsesToDynamicBodies(true);controller.setCharacterMass(90);controller.disableAutostep();controller.disableSnapToGround();
 // Coarse floor triangles and native blocking-grid walls, excluding movable props.
 const vertices=[],indices=[],{nx,nz,step,minX,minZ,heights,blocked,edges}=grid;
 for(let i=0;i<heights.length;i++)vertices.push(minX+i%nx*step,Number.isFinite(heights[i])?heights[i]:-20,minZ+Math.floor(i/nx)*step);
 for(let z=0;z<nz-1;z++)for(let x=0;x<nx-1;x++){const a=z*nx+x,b=a+1,c=a+nx,d=c+1,ys=[heights[a],heights[b],heights[c],heights[d]];if(ys.every(Number.isFinite)&&Math.max(...ys)-Math.min(...ys)<.65)indices.push(a,c,b,b,c,d);}
 world.createCollider(R.ColliderDesc.trimesh(new Float32Array(vertices),new Uint32Array(indices)).setFriction(.65));
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  const i=z*nx+x,h=heights[i];if(!Number.isFinite(h))continue;
  if(blocked[i]){let end=x;while(end+1<nx&&blocked[z*nx+end+1]&&Number.isFinite(heights[z*nx+end+1])&&Math.abs(heights[z*nx+end+1]-h)<.2)end++;
   world.createCollider(R.ColliderDesc.cuboid((end-x+1)*step/2,.85,step/2).setTranslation(minX+(x+end)*step/2,h+.6,minZ+z*step));x=end;
  }else{
   if(edges[i]&1&&x+1<nx&&!blocked[i+1])world.createCollider(R.ColliderDesc.cuboid(.025,.8,step/2).setTranslation(minX+(x+.5)*step,h+.65,minZ+z*step));
   if(edges[i]&4&&z+1<nz&&!blocked[i+nx])world.createCollider(R.ColliderDesc.cuboid(step/2,.8,.025).setTranslation(minX+x*step,h+.65,minZ+(z+.5)*step));
  }
 }
 const meshes=[];arena.traverse(o=>{if(o.isMesh&&/^BP_Coffee(Chair|Table)/.test(o.name))meshes.push(o);});
 for(const mesh of meshes){
  const original={parent:mesh.parent,position:mesh.position.clone(),quaternion:mesh.quaternion.clone(),scale:mesh.scale.clone()};root.attach(mesh);mesh.geometry.computeBoundingBox();
  const box=mesh.geometry.boundingBox,size=new THREE.Vector3().fromArray(box.getSize(new THREE.Vector3()).multiply(mesh.scale).toArray().map(Math.abs)),offset=box.getCenter(new THREE.Vector3()).multiply(mesh.scale),center=offset.clone().applyQuaternion(mesh.quaternion).add(mesh.position),chair=mesh.name.startsWith('BP_CoffeeChair'),mass=chair?30:50;
  const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(center.x,center.y+.015,center.z).setRotation(mesh.quaternion).setLinearDamping(.45).setAngularDamping(.7).setCanSleep(true).setCcdEnabled(true));
  const hx=size.x/2,hy=size.y/2,hz=size.z/2,parts=chair?[
   [hx,.065,hz,0,-hy*.05,0],[hx,hy*.5,.065,0,hy*.45,-hz*.8],
   ...[-1,1].flatMap(x=>[-1,1].map(z=>[.045,hy*.43,.045,x*hx*.8,-hy*.55,z*hz*.75]))
  ]:[[hx,.07,hz,0,hy*.8,0],[.12,hy*.8,.12,0,-hy*.1,0],[hx*.65,.06,hz*.65,0,-hy*.87,0]];
  for(const [x,y,z,px,py,pz]of parts)world.createCollider(R.ColliderDesc.cuboid(Math.max(.03,x),Math.max(.03,y),Math.max(.03,z)).setTranslation(px,py,pz).setMass(mass/parts.length).setFriction(.65).setRestitution(.12),body);
  furniture.push({mesh,body,offset,original,spawn:center.clone().add(new THREE.Vector3(0,.015,0)),rotation:mesh.quaternion.clone(),mass});
 }
 world.timestep=1/60;world.step();
 function player(actor){let entry=players.get(actor.id);if(!entry){const p=actor.group.position,body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x,p.y+.75,p.z));const collider=world.createCollider(R.ColliderDesc.capsule(.43,.28).setFriction(.2),body);entry={body,collider};players.set(actor.id,entry);}return entry;}
 return {world,furniture,
  move(actor,from,to,dt){const {body,collider}=player(actor);body.setTranslation({x:from.x,y:from.y+.75,z:from.z},false);world.propagateModifiedBodyPositionsToColliders();world.timestep=dt;
   controller.computeColliderMovement(collider,{x:to.x-from.x,y:0,z:to.z-from.z},R.QueryFilterFlags.EXCLUDE_FIXED|R.QueryFilterFlags.EXCLUDE_KINEMATIC);const delta=controller.computedMovement();to.x=from.x+delta.x;to.z=from.z+delta.z;
  },
  step(dt,actors){world.timestep=dt;for(const actor of actors){const {body}=player(actor),p=actor.group.position;body.setNextKinematicTranslation({x:p.x,y:p.y+.75,z:p.z});}world.step();
   for(const f of furniture){const p=f.body.translation();if(p.y< -14||!Number.isFinite(p.x)){f.body.setTranslation(f.spawn,true);f.body.setRotation(f.rotation,true);f.body.setLinvel({x:0,y:0,z:0},true);f.body.setAngvel({x:0,y:0,z:0},true);}
    if(!f.body.isSleeping()){const v=f.body.linvel(),length=Math.hypot(v.x,v.y,v.z);if(length>9)f.body.setLinvel({x:v.x*9/length,y:v.y*9/length,z:v.z*9/length},false);const a=f.body.angvel(),spin=Math.hypot(a.x,a.y,a.z);if(spin>12)f.body.setAngvel({x:a.x*12/spin,y:a.y*12/spin,z:a.z*12/spin},false);}
    f.mesh.quaternion.copy(f.body.rotation());f.mesh.position.copy(f.body.translation()).sub(f.offset.clone().applyQuaternion(f.mesh.quaternion));
   }
  },
  dispose(){for(const f of furniture){f.original.parent.add(f.mesh);f.mesh.position.copy(f.original.position);f.mesh.quaternion.copy(f.original.quaternion);f.mesh.scale.copy(f.original.scale);}world.free();}
 };
}
