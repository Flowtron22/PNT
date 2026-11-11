import * as THREE from 'three';

const BANDS = [0xa99aff,0x66dfff,0x9be876,0xffdf68,0xffa858,0xff658d];
const SEGMENTS = 48;
const STAR_COLORS = [0xffdc47,0xff78be,0x60f2ff,0xb996ff,0xffad62];
const STAR_SIZES = [.22,.47,.30,.62,.18,.39,.53,.26];
const SPRINKLES = 108;

function createSprinkles(parent) {
 const geometry = new THREE.BufferGeometry();
 const position = new THREE.BufferAttribute(new Float32Array(SPRINKLES*3),3).setUsage(THREE.DynamicDrawUsage);
 const glint = new THREE.BufferAttribute(new Float32Array(SPRINKLES*2),2).setUsage(THREE.DynamicDrawUsage);
 const colors = new Float32Array(SPRINKLES*3);
 const tint = new THREE.Color();
 for (let i=0;i<SPRINKLES;i++) {
  tint.setHex(i%3===0?0xfff5cf:STAR_COLORS[i%STAR_COLORS.length]).toArray(colors,i*3);
 }
 geometry.setAttribute('position',position);
 geometry.setAttribute('glint',glint);
 geometry.setAttribute('tint',new THREE.BufferAttribute(colors,3));
 const material = new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,toneMapped:false,
  uniforms:{screenHeight:{value:800}},
  vertexShader:`
   attribute vec2 glint;
   attribute vec3 tint;
   uniform float screenHeight;
   varying vec4 sparkle;
   void main(){
    sparkle=vec4(tint,glint.y);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    gl_PointSize=max(1.0,glint.x*screenHeight);
   }`,
  fragmentShader:`
   varying vec4 sparkle;
   void main(){
    vec2 p=abs(gl_PointCoord*2.0-1.0);
    float halo=1.0-smoothstep(0.0,0.92,length(p));
    float crossShape=1.0-smoothstep(0.08,0.66,min(p.x,p.y)*3.1+max(p.x,p.y)*0.55);
    gl_FragColor=vec4(mix(sparkle.rgb,vec3(1.0),crossShape*0.66),sparkle.a*(halo*0.38+crossShape*0.62));
    #include <colorspace_fragment>
   }`
 });
 const points = new THREE.Points(geometry,material);
 points.frustumCulled = false;
 points.renderOrder = 3;
 parent.add(points);
 return points;
}

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
 const sprinkles = createSprinkles(parent);
 const anchor = new THREE.Vector3();
 const wakePoint = new THREE.Vector3();
 const toParent = new THREE.Matrix4();
 const cameraFacing = new THREE.Quaternion();
 const tilt = new THREE.Quaternion();
 const tumble = new THREE.Euler();
 return {
  update(time,reduced,camera,screenHeight) {
   const motion = reduced?0:time;
   camera.updateMatrixWorld();
   anchor.set(-.42,.08,-1.13);
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
    const spread = THREE.MathUtils.smoothstep(progress,0,.16);
    const width = THREE.MathUtils.lerp(.24,.42,spread)*(1-progress*.71);
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
   sprinkles.visible = !reduced;
   if (reduced) return;
   sprinkles.material.uniforms.screenHeight.value = screenHeight;
   const dust = sprinkles.geometry.attributes;
   for (let i=0;i<SPRINKLES;i++) {
    const progress = (i*.618034+time*(.31+(i%5)*.025))%1;
    const drift = ((i*17%31)/15-1)*(.19+progress*.19);
    const flutter = Math.sin(time*2.7+i*2.4)*.022;
    project(progress,0,drift+flutter).toArray(dust.position.array,i*3);
    const flicker = .25+.75*Math.sin(time*(3+i%5)+i*.73)**2;
    const fade = Math.min(1,progress*14,(1-progress)*5);
    dust.glint.setXY(i,(.003+(i%9)*.00067)*(1-progress*.38),flicker*fade);
   }
   dust.position.needsUpdate = dust.glint.needsUpdate = true;
  }
 };
}
