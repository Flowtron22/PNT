import * as THREE from 'three';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';

function cottonMaterial() {
 const material = new THREE.MeshStandardMaterial({
  color:0xf6ecda, roughness:1, transparent:true,
  emissive:0xb0d5ff, emissiveIntensity:.18
 });
 material.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec3 cottonPosition;\n'+shader.vertexShader.replace(
   '#include <begin_vertex>', '#include <begin_vertex>\n cottonPosition=position;'
  );
  shader.fragmentShader = `
   varying vec3 cottonPosition;
   float cottonHash(vec3 p) {
    p=fract(p*.3183099+vec3(.12,.39,.17));
    p*=17.0;
    return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
   }
   float cottonNoise(vec3 p) {
    vec3 i=floor(p),f=fract(p);
    f=f*f*(3.0-2.0*f);
    return mix(
     mix(mix(cottonHash(i),cottonHash(i+vec3(1,0,0)),f.x),
         mix(cottonHash(i+vec3(0,1,0)),cottonHash(i+vec3(1,1,0)),f.x),f.y),
     mix(mix(cottonHash(i+vec3(0,0,1)),cottonHash(i+vec3(1,0,1)),f.x),
         mix(cottonHash(i+vec3(0,1,1)),cottonHash(i+vec3(1,1,1)),f.x),f.y),f.z);
   }
  `+shader.fragmentShader.replace('#include <color_fragment>',`
   #include <color_fragment>
   vec3 cottonPoint=cottonPosition*vec3(1.15,1.02,2.26);
   float billow=cottonNoise(cottonPoint*7.0);
   float fiber=cottonNoise(cottonPoint*31.0);
   float upperLight=smoothstep(-.67,.52,cottonPosition.y);
   vec3 cottonTint=mix(vec3(.56,.68,.94),vec3(1.0,.96,.88),upperLight);
   vec2 underRider=cottonPoint.xz-vec2(0.0,.34);
   float contact=exp(-dot(underRider*vec2(2.5,3.0),underRider*vec2(2.5,3.0)));
   diffuseColor.rgb*=cottonTint*(.87+.15*billow+.048*fiber-.19*upperLight*contact);
  `).replace('#include <opaque_fragment>',`
   float edge=dot(normal,normalize(vViewPosition));
   diffuseColor.a*=mix(.79+.11*fiber,1.0,smoothstep(.02,.25,edge));
   #include <opaque_fragment>
  `);
 };
 return material;
}

export function createMenuCloud() {
 const rig = new THREE.Group();
 // Positive Z is the direction of travel. The puff behind the rider trails away.
 const puffs = [
  [0,.59,.16,.75,.49,.78], [-.57,.55,.57,.49,.45,.56],
  [.55,.48,.55,.52,.43,.56], [.10,.60,.92,.49,.42,.53],
  [-.36,.42,1.17,.49,.41,.44], [.49,.34,1.11,.41,.34,.42],
  [.72,.49,.08,.45,.39,.49], [-.66,.38,-.09,.43,.39,.57],
  [.41,.55,-.47,.51,.46,.63], [-.35,.54,-.54,.54,.46,.65],
  [.08,.49,-.96,.56,.40,.60], [-.07,.45,-1.39,.38,.31,.48],
  [.04,.50,-1.75,.26,.22,.43], [.17,.59,-2.04,.16,.15,.28]
 ];
 const noise = new ImprovedNoise();
 const material = cottonMaterial();
 const size = 68;
 const surface = new MarchingCubes(size,material,false,false,40000);
 surface.isolation = 0;
 surface.position.set(0,.55,-.34);
 surface.scale.set(1.32,1,2.26);
 const blendRadius = .11;
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
    // Smaller billows roughen the silhouette and catch light across the surface.
    if(Math.abs(field)<.18) {
     field+=noise.noise(px*5.1+9,py*5.1,pz*5.1)*.045+
       noise.noise(px*12.3,py*12.3+11,pz*12.3)*.010;
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
