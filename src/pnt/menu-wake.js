import * as THREE from 'three';

const BANDS = [0xa99aff,0x66dfff,0x9be876,0xffdf68,0xffa858,0xff658d];
const SEGMENTS = 32;
const STAR_COLORS = [0xfff1a3,0xffffff,0xffbcef,0xb0f1ff];

function starTexture() {
 const canvas = document.createElement('canvas');
 canvas.width = canvas.height = 64;
 const ink = canvas.getContext('2d');
 ink.translate(32,32);
 ink.shadowBlur = 9;
 ink.shadowColor = 'white';
 ink.fillStyle = 'white';
 ink.beginPath();
 for (let i=0;i<10;i++) {
  const angle = i*Math.PI/5-Math.PI/2;
  const radius = i%2===0?22:10;
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
 const stars = Array.from({length:18},(_,i)=>{
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
   map:texture,color:STAR_COLORS[i%STAR_COLORS.length],transparent:true,depthWrite:false,toneMapped:false
  }));
  parent.add(sprite);
  return sprite;
 });
 const wakePoint = new THREE.Vector3();
 function curve(progress,time) {
  wakePoint.set(.24+.48*progress+.21*Math.sin(progress*7-time*4)*progress,
   .48-.44*progress+.27*Math.sin(progress*8-time*3.7)*progress,
   -1.63-progress*8.3);
 }
 return {
  update(time,reduced) {
   const motion = reduced?0:time;
   for (let i=0;i<=SEGMENTS;i++) {
    const progress = i/SEGMENTS;
    curve(progress,motion);
    const width = (.32+.57*Math.sin(progress*Math.PI*.74))*(1-progress*.22);
    const opacity = Math.min(1,progress*13,(1-progress)*2.6);
    const glint = .83+.14*Math.sin(progress*22-motion*9);
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
    const progress = (i*.618034+time*(.56+(i%4)*.095))%1;
    const side = i%2===0?1:-1;
    curve(progress,time);
    star.position.copy(wakePoint);
    star.position.x += side*progress*(.4+(i%3)*.34);
    star.position.y += side*(.11+progress*(.28+(i%5)*.22));
    star.material.rotation = i*.47+side*time*2;
    star.material.opacity = Math.min(1,progress*10,(1-progress)*3);
    star.scale.setScalar((.24+(i%4)*.095)*(.75+progress*.62));
   }
  }
 };
}
