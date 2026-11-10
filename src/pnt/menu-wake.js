import * as THREE from 'three';

const BANDS = [0xa99aff,0x66dfff,0x9be876,0xffdf68,0xffa858,0xff658d];
const SEGMENTS = 48;
const STAR_COLORS = [0xffdc47,0xff78be,0x60f2ff,0xb996ff,0xffad62];
const STAR_SIZES = [.22,.47,.30,.62,.18,.39,.53,.26];

export function createMenuWake(parent,starGeometry) {
 const ribbon = new THREE.BufferGeometry();
 const position = new Float32Array(BANDS.length*(SEGMENTS+1)*6);
 const color = new Float32Array(BANDS.length*(SEGMENTS+1)*8);
 const indices = [];
 const shade = new THREE.Color();
 for (let band=0;band<BANDS.length;band++) {
  shade.setHex(BANDS[band]);
  for (let i=0;i<=SEGMENTS;i++) {
   const vertex = (band*(SEGMENTS+1)+i)*2;
   for (let edge=0;edge<2;edge++) shade.toArray(color,(vertex+edge)*4);
   if (i<SEGMENTS) indices.push(vertex,vertex+2,vertex+1,vertex+1,vertex+2,vertex+3);
  }
 }
 ribbon.setAttribute('position',new THREE.BufferAttribute(position,3).setUsage(THREE.DynamicDrawUsage));
 ribbon.setAttribute('color',new THREE.BufferAttribute(color,4).setUsage(THREE.DynamicDrawUsage));
 ribbon.setIndex(indices);
 const mesh = new THREE.Mesh(ribbon,new THREE.MeshBasicMaterial({
  vertexColors:true,side:THREE.DoubleSide,transparent:true,depthWrite:false,toneMapped:false
 }));
 mesh.frustumCulled = false;
 mesh.renderOrder = 1;
 parent.add(mesh);
 const stars = Array.from({length:16},(_,i)=>{
  const tint = STAR_COLORS[i%STAR_COLORS.length];
  const star = new THREE.Mesh(starGeometry,new THREE.MeshStandardMaterial({
   color:tint,emissive:tint,emissiveIntensity:.24,roughness:.46,transparent:true,depthWrite:false
  }));
  star.renderOrder = 2;
  parent.add(star);
  return star;
 });
 const anchor = new THREE.Vector3();
 const wakePoint = new THREE.Vector3();
 const toParent = new THREE.Matrix4();
 const cameraFacing = new THREE.Quaternion();
 const tilt = new THREE.Quaternion();
 const tumble = new THREE.Euler();
 return {
  update(time,reduced,camera) {
   const motion = reduced?0:time;
   camera.updateMatrixWorld();
   anchor.set(-.27,.34,-1.29);
   parent.localToWorld(anchor).project(camera);
   toParent.copy(parent.matrixWorld).invert();
   parent.getWorldQuaternion(cameraFacing).invert().multiply(camera.quaternion);
   // Frame the wake in the same screen space as the menu while keeping its
   // geometry behind the cloud for depth occlusion.
   const span = Math.max(.12,1.15-anchor.x);
   const project = (progress,offsetX=0,offsetY=0) => {
    const distance = progress*span;
    const wave = Math.sin(distance*9-motion*3.5)*.015*progress;
    return wakePoint.set(anchor.x+distance+offsetX,
     anchor.y+distance*.45+wave+offsetY,
     THREE.MathUtils.lerp(anchor.z,1,progress*.38)).unproject(camera).applyMatrix4(toParent);
   };
   for (let i=0;i<=SEGMENTS;i++) {
    const progress = i/SEGMENTS;
    const width = THREE.MathUtils.lerp(.42,.12,Math.min(1,progress*1.03));
    const opacity = Math.min(1,progress*24,(1-progress)*8);
    const glint = .88+.11*Math.sin(progress*27-motion*8);
    for (let band=0;band<BANDS.length;band++) {
     for (let edge=0;edge<2;edge++) {
      const vertex = (band*(SEGMENTS+1)+i)*2+edge;
      const point = project(progress,0,((band+edge)/BANDS.length-.5)*width);
      point.toArray(position,vertex*3);
      color[vertex*4+3] = opacity*glint*(reduced?.62:.94);
     }
    }
   }
   ribbon.attributes.position.needsUpdate = ribbon.attributes.color.needsUpdate = true;
   for (let i=0;i<stars.length;i++) {
    const star = stars[i];
    star.visible = !reduced;
    if (reduced) continue;
    const progress = (i/stars.length+time*.25)%1;
    const side = i%2===0?1:-1;
    const spread = .09+(i*3%7)*.021+progress*.07;
    star.position.copy(project(progress,0,side*spread));
    tumble.set(.24+.40*Math.sin(time*1.8+i),.37+.54*Math.cos(time*1.6+i*.73),i*.47+side*time*1.7);
    star.quaternion.copy(cameraFacing).multiply(tilt.setFromEuler(tumble));
    star.material.opacity = Math.min(1,progress*15,(1-progress)*5);
    star.scale.setScalar(STAR_SIZES[(i*3)%STAR_SIZES.length]*(1-progress*.16));
   }
  }
 };
}
