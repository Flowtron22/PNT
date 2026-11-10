import * as THREE from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';

function cloudMaterial() {
 const material = new THREE.MeshStandardMaterial({
  color:0xfff7ff, roughness:.94, emissive:0xc7ceff, emissiveIntensity:.17
 });
 material.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec3 cloudPosition;\n'+shader.vertexShader.replace(
   '#include <begin_vertex>', '#include <begin_vertex>\n cloudPosition=position;'
  );
  shader.fragmentShader = 'varying vec3 cloudPosition;\n'+shader.fragmentShader.replace(
   '#include <color_fragment>', `
   #include <color_fragment>
   float heightLight=smoothstep(-.64,.58,cloudPosition.y);
   vec3 tint=mix(vec3(.48,.60,.98),vec3(1.0,.90,1.0),heightLight);
   vec2 underRider=cloudPosition.xz-vec2(0.0,.17);
   vec2 shadowSize=underRider*vec2(3.5,7.0);
   float contact=exp(-dot(shadowSize,shadowSize))*heightLight;
   diffuseColor.rgb*=tint*(1.0-.14*contact);
  `);
 };
 return material;
}

export function createMenuCloud() {
 const rig = new THREE.Group();
 // Leave a broad puff under the rider and silhouette the front with round lobes.
 // Positive Z is the direction of travel.
 const puffs = [
  [0,.57,.03,.73,.52,.79], [-.63,.54,.40,.47,.48,.51],
  [.57,.50,.40,.53,.48,.55], [.12,.61,.90,.51,.47,.57],
  [-.38,.31,1.02,.45,.40,.46], [.47,.30,.92,.42,.38,.43],
  [.64,.35,-.19,.43,.42,.48], [-.63,.34,-.23,.44,.42,.49],
  [.07,.25,.27,.56,.44,.54], [-.29,.25,-.46,.43,.40,.45],
  [.34,.50,-.51,.45,.43,.51], [.02,.44,-.91,.43,.37,.50],
  [.12,.44,-1.35,.29,.28,.35], [.19,.47,-1.68,.19,.19,.25],
  [.31,.53,-2.05,.12,.12,.14], [.16,.39,-2.25,.075,.075,.08]
 ];
 const material = cloudMaterial();
 const size = 64;
 const surface = new MarchingCubes(size,material,false,false,32000);
 surface.isolation = 0;
 surface.position.set(0,.53,-.36);
 surface.scale.set(1.31,1.02,2.28);
 const blendRadius = .10;
 const grid = (i,axis) => surface.position[axis]+(2*i/size-1)*surface.scale[axis];
 for (let z=0;z<size;z++) {
  const pz=grid(z,'z');
  for (let y=0;y<size;y++) {
   const py=grid(y,'y');
   for (let x=0;x<size;x++) {
    const px=grid(x,'x');
    let field=-1;
    for (const [cx,cy,cz,rx,ry,rz] of puffs) {
     const dx=(px-cx)/rx,dy=(py-cy)/ry,dz=(pz-cz)/rz;
     const puff=(1-Math.sqrt(dx*dx+dy*dy+dz*dz))*Math.min(rx,ry,rz);
     const join=Math.max(blendRadius-Math.abs(field-puff),0);
     field=Math.max(field,puff)+join*join/(4*blendRadius);
    }
    surface.field[x+y*size+z*size*size]=field;
   }
  }
 }
 surface.update();
 const geometry = new THREE.BufferGeometry();
 for (const key of ['position','normal']) {
  const values=surface.geometry.getAttribute(key).array.slice(0,surface.count*3);
  geometry.setAttribute(key,new THREE.BufferAttribute(values,3));
 }
 const cloud = new THREE.Mesh(geometry,material);
 cloud.position.copy(surface.position);
 cloud.scale.copy(surface.scale);
 surface.geometry.dispose();
 rig.add(cloud);
 return rig;
}
