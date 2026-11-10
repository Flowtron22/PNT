import * as THREE from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';

export function createMenuCloud() {
 const rig = new THREE.Group();
 const material = new THREE.MeshStandardMaterial({color: 0xffbc45, roughness: .88});
 // Stagger the puffs in depth so the camera sees a rounded front and a tapered wake.
 const puffs = [
  [-1.44,.31,-.14,.55,.13,.21], [-1.02,.38,-.12,.65,.24,.36],
  [-.44,.45,-.1,.69,.43,.60], [.28,.43,-.05,.77,.45,.63],
  [-.67,.52,.34,.46,.38,.47], [-.27,.38,.60,.45,.36,.43],
  [.28,.34,.61,.46,.34,.44], [.80,.43,.37,.44,.37,.47],
  [1.02,.5,-.06,.39,.36,.4], [.62,.67,-.27,.51,.39,.49],
  [.03,.65,-.3,.58,.45,.55], [-.45,.68,-.22,.47,.36,.43],
  [.09,.67,.43,.38,.39,.42], [.57,.62,.43,.37,.35,.40]
 ];
 // Blend the ellipsoid fields before meshing to round the joins between puffs.
 const size = 54;
 const surface = new MarchingCubes(size,material,false,false,24000);
 surface.isolation = 0;
 surface.position.set(-.23,.52,0);
 surface.scale.set(2.1,.85,1.16);
 const blendRadius = .085;
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

export function createCloudRider(model, animator) {
 const bones = new Map();
 model.traverse(node => {
  if (node.isBone) bones.set(node.name.replace(/[_\- ]/g, '').toLowerCase(), node);
 });
 const bone = name => bones.get('bip001' + name.toLowerCase());
 const offsets = [];
 const direction = new THREE.Vector3();
 const parentSpace = new THREE.Quaternion();
 const original = new THREE.Quaternion();

 // Aim each limb from the first idle frame, in the character's forward/up axes.
 // Store the correction in parent space so the existing idle still drives the rig.
 animator.update(0);
 const facing = model.getWorldQuaternion(new THREE.Quaternion());
 function aim(from, to, x, y, z) {
  const joint = bone(from), tip = bone(to);
  if (!joint || !tip) return;
  parentSpace.copy(joint.parent.getWorldQuaternion(original)).invert();
  direction.copy(tip.getWorldPosition(new THREE.Vector3()))
   .sub(joint.getWorldPosition(new THREE.Vector3())).normalize().applyQuaternion(parentSpace);
  const target = new THREE.Vector3(x,y,z).normalize().applyQuaternion(facing).applyQuaternion(parentSpace);
  const correction = new THREE.Quaternion().setFromUnitVectors(direction, target);
  offsets.push({joint, correction, base: joint.quaternion.clone()});
  joint.quaternion.premultiply(correction);
 }
 aim('Spine','Spine1', 0,.98,.22);
 aim('LUpperArm','LForearm', .53,.39,.77);
 aim('LForearm','LHand', .46,.61,.67);
 aim('RUpperArm','RForearm', -.62,-.48,-.65);
 aim('RForearm','RHand', -.46,-.26,-.85);
 aim('LThigh','LCalf', .44,-.38,.78);
 aim('LCalf','LFoot', .18,-.48,-.86);
 aim('RThigh','RCalf', -.34,-.69,.52);
 aim('RCalf','RFoot', -.14,-.36,-.92);
 const blend = new THREE.Quaternion();
 return {
  update(dt, weight) {
   for (const {joint,base} of offsets) joint.quaternion.copy(base);
   animator.update(dt);
   for (const {joint,correction,base} of offsets) {
    base.copy(joint.quaternion);
    joint.quaternion.premultiply(blend.identity().slerp(correction,weight));
   }
  }
 };
}
