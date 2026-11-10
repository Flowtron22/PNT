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
 const wakePoint = new THREE.Vector3();
 function curve(progress,time) {
  wakePoint.set(.31+1.37*progress+.29*Math.sin(progress*10-time*3.5)*progress,
   .47-.48*progress+.32*Math.sin(progress*11-time*3.3)*progress,
   -1.02-progress*13.5);
 }
 return {
  update(time,reduced) {
   const motion = reduced?0:time;
   for (let i=0;i<=SEGMENTS;i++) {
    const progress = i/SEGMENTS;
    curve(progress,motion);
    const width = (.54+.96*Math.sin(progress*Math.PI*.74))*(1-progress*.20);
    const opacity = Math.min(1,progress*17,(1-progress)*4.8);
    const glint = .88+.11*Math.sin(progress*27-motion*8);
    for (let band=0;band<BANDS.length;band++) {
     for (let edge=0;edge<2;edge++) {
      const vertex = (band*(SEGMENTS+1)+i)*2+edge;
      position[vertex*3] = wakePoint.x;
      position[vertex*3+1] = wakePoint.y+((band+edge)/BANDS.length-.5)*width;
      position[vertex*3+2] = wakePoint.z;
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
    curve(progress,time);
    star.position.copy(wakePoint);
    star.position.x += side*progress*(.4+(i%3)*.34);
    star.position.y += side*(.18+progress*(.41+(i%5)*.27));
    star.material.rotation = i*.47+side*time*2;
    star.material.opacity = Math.min(1,progress*15,(1-progress)*5);
    star.scale.setScalar((.36+(i%4)*.13)*(.84+progress*.66));
   }
  }
 };
}
