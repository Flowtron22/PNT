import * as THREE from 'three';

const BANDS = [0xa99aff,0x66dfff,0x9be876,0xffdf68,0xffa858,0xff658d];
const SEGMENTS = 48;
const STAR_COLORS = [0xffdc47,0xff78be,0x60f2ff,0xb996ff,0xffad62];

function starTexture() {
 const canvas = document.createElement('canvas');
 canvas.width = canvas.height = 64;
 const ink = canvas.getContext('2d');
 ink.translate(32,32);
 ink.shadowBlur = 7;
 ink.shadowColor = 'white';
 ink.fillStyle = 'white';
 ink.beginPath();
 for (let i=0;i<10;i++) {
  const angle = i*Math.PI/5-Math.PI/2;
  const radius = i%2===0?25:11.5;
  ink.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);
 }
 ink.closePath();
 ink.fill();
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 return texture;
}

export function createMenuWake(parent) {
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
 parent.add(mesh);
 const texture = starTexture();
 const stars = Array.from({length:25},(_,i)=>{
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
   map:texture,color:STAR_COLORS[i%STAR_COLORS.length],transparent:true,depthWrite:false,toneMapped:false
  }));
  parent.add(sprite);
  return sprite;
 });
 const anchor = new THREE.Vector3();
 const wakePoint = new THREE.Vector3();
 const toParent = new THREE.Matrix4();
 return {
  update(time,reduced,camera) {
   const motion = reduced?0:time;
   camera.updateMatrixWorld();
   anchor.set(-.27,.34,-1.29);
   parent.localToWorld(anchor).project(camera);
   toParent.copy(parent.matrixWorld).invert();
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
    const progress = (i*.618034+time*(.235+(i%4)*.032))%1;
    const side = i%2===0?1:-1;
    const spread = (.045+(i%5)*.021)*(1-progress*.48);
    star.position.copy(project(progress,side*(i%3)*.008,side*spread));
    star.material.rotation = i*.47+side*time*2;
    star.material.opacity = Math.min(1,progress*15,(1-progress)*5);
    star.scale.setScalar((.32+(i%4)*.085)*(1-progress*.2));
   }
  }
 };
}
