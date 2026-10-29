import * as THREE from 'three';
// Hammer-only geometry and pools. Crisp silhouettes and unlit colours keep the
// burst readable under every arena's lighting without a bloom/postprocess pass.
export function hammerCrownGeometry(teeth=16){
 const positions=[],uv=[];for(let i=0;i<teeth;i++){const a=i/teeth*Math.PI*2,spread=Math.PI/teeth*.65,height=i%4===0?1.05:i%2===0?.7:.48;positions.push(Math.cos(a-spread)*.62,0,Math.sin(a-spread)*.62,Math.cos(a)*1.08,height,Math.sin(a)*1.08,Math.cos(a+spread)*.62,0,Math.sin(a+spread)*.62);uv.push(0,0,.5,1,1,0);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.name='hammer-sharp-crown';return geometry;
}
export function hammerShockGeometry(teeth=20){
 const positions=[],indices=[],count=teeth*2;for(let i=0;i<count;i++){const a=i/count*Math.PI*2,outer=i%2?.79:1.1;positions.push(Math.cos(a)*.53,0,Math.sin(a)*.53,Math.cos(a)*outer,0,Math.sin(a)*outer);const next=(i+1)%count;indices.push(i*2,i*2+1,next*2,next*2,i*2+1,next*2+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.name='hammer-jagged-shock';return geometry;
}
const crownGeometry=hammerCrownGeometry(),shockGeometry=hammerShockGeometry(),pixelGeometry=new THREE.PlaneGeometry(1,1);
pixelGeometry.name='hammer-square-pixel';
const vertexShader='varying float vHeight;void main(){vHeight=uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const fragmentShader=`uniform float uFade;varying float vHeight;void main(){vec3 blue=vec3(0.,.06,1.),cyan=vec3(0.,.82,1.),tip=vec3(.72,1.,1.);vec3 colour=mix(blue,cyan,smoothstep(0.,.5,vHeight));colour=mix(colour,tip,smoothstep(.55,1.,vHeight));gl_FragColor=vec4(colour,uFade);
#include <colorspace_fragment>
}`;
const palette=[0x00eaff,0x0077ff,0xa333ff,0xff28d5,0xf3ff38];
export class HammerImpactPool{
 constructor(root){this.group=new THREE.Group();this.group.name='hammer-sharp-impact-pool';root.add(this.group);this.cursor=0;this.pixelCursor=0;this.parentRotation=new THREE.Quaternion();this.cameraRotation=new THREE.Quaternion();
  this.bursts=Array.from({length:8},()=>{const group=new THREE.Group(),crown=new THREE.Mesh(crownGeometry,new THREE.ShaderMaterial({uniforms:{uFade:{value:1}},vertexShader,fragmentShader,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false})),shock=new THREE.Mesh(shockGeometry,new THREE.MeshBasicMaterial({color:0x7314ff,transparent:true,opacity:1,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));crown.renderOrder=7;shock.renderOrder=6;shock.position.y=.015;group.add(crown,shock);group.visible=false;this.group.add(group);return {group,crown,shock,age:0,life:0};});
  this.pixels=Array.from({length:96},()=>{const mesh=new THREE.Mesh(pixelGeometry,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));mesh.renderOrder=8;mesh.visible=false;this.group.add(mesh);return {mesh,life:0,age:0,delay:0,duration:0,size:0,p:new THREE.Vector3(),v:new THREE.Vector3()};});
 }
 hit(position){const burst=this.bursts.find(item=>item.life<=0)||this.bursts[this.cursor++%this.bursts.length];burst.age=0;burst.life=.36;burst.group.position.copy(position);burst.group.rotation.y=Math.random()*Math.PI;burst.group.visible=true;burst.crown.scale.set(.5,.12,.5);burst.shock.scale.setScalar(.35);burst.crown.material.uniforms.uFade.value=1;burst.shock.material.opacity=1;
  for(let i=0;i<24;i++){const pixel=this.pixels.find(item=>item.life<=0)||this.pixels[this.pixelCursor++%this.pixels.length],angle=i/24*Math.PI*2,speed=1.1+Math.random()*1.9;pixel.age=0;pixel.delay=.12+Math.random()*.08;pixel.duration=.4+Math.random()*.3;pixel.life=pixel.delay+pixel.duration;pixel.p.copy(position);pixel.p.y+=.12;pixel.v.set(Math.cos(angle)*speed,.65+Math.random()*1.4,Math.sin(angle)*speed);pixel.size=.065+Math.random()*.065;pixel.mesh.material.color.setHex(palette[i%palette.length]);pixel.mesh.visible=false;}
 }
 update(elapsed,camera){const dt=Math.min(.05,Math.max(0,elapsed||0));if(camera){camera.getWorldQuaternion(this.cameraRotation);this.cameraRotation.premultiply(this.group.getWorldQuaternion(this.parentRotation).invert());}
  for(const burst of this.bursts){if(burst.life<=0)continue;burst.life=Math.max(0,burst.life-dt);burst.age+=dt;if(!burst.life){burst.group.visible=false;continue;}const t=burst.age/.36,expansion=1-Math.pow(1-t,3);burst.crown.scale.set(.5+expansion*1.05,.12+Math.sin(Math.min(1,t*1.5)*Math.PI/2)*.9,.5+expansion*1.05);burst.shock.scale.setScalar(.35+expansion*1.45);burst.crown.material.uniforms.uFade.value=Math.min(1,burst.life/.12);burst.shock.material.opacity=Math.max(0,1-t*1.7);}
  for(const pixel of this.pixels){if(pixel.life<=0)continue;pixel.age+=dt;pixel.life=Math.max(0,pixel.life-dt);if(pixel.life<=0){pixel.mesh.visible=false;continue;}if(pixel.age<pixel.delay)continue;const time=pixel.age-pixel.delay,remaining=1-time/pixel.duration;pixel.mesh.visible=true;pixel.mesh.position.copy(pixel.p).addScaledVector(pixel.v,time);pixel.mesh.position.y-=1.4*time*time;pixel.mesh.position.x=Math.round(pixel.mesh.position.x/.035)*.035;pixel.mesh.position.y=Math.round(pixel.mesh.position.y/.035)*.035;pixel.mesh.position.z=Math.round(pixel.mesh.position.z/.035)*.035;if(camera)pixel.mesh.quaternion.copy(this.cameraRotation);pixel.mesh.scale.setScalar(pixel.size*(remaining<.3?.65:1));pixel.mesh.material.opacity=Math.max(0,Math.ceil(Math.min(1,remaining*1.6)*4)/4);}
 }
 clear(){for(const burst of this.bursts){burst.life=0;burst.group.visible=false;}for(const pixel of this.pixels){pixel.life=0;pixel.mesh.visible=false;}}
}
