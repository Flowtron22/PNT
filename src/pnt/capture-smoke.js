import * as THREE from 'three';

export const CAPTURE_SMOKE_SECONDS=.65;
export const CAPTURE_CELEBRATION_DELAY=CAPTURE_SMOKE_SECONDS+.08;

export class CaptureSmokeVFX{
 constructor(root,geometry){
  this.group=new THREE.Group();this.group.name='capture-smoke';root.add(this.group);this.cursor=0;
  this.items=Array.from({length:32},()=>{
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,
    uniforms:{opacity:{value:0},tint:{value:new THREE.Color(0xe9edf2)}},
    vertexShader:`varying vec3 vNormal;varying vec3 vView;void main(){vec4 view=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=-view.xyz;gl_Position=projectionMatrix*view;}`,
    fragmentShader:`uniform float opacity;uniform vec3 tint;varying vec3 vNormal;varying vec3 vView;
     void main(){vec3 n=normalize(vNormal);float edge=smoothstep(0.0,.6,abs(dot(n,normalize(vView))));float light=.86+.14*dot(n,normalize(vec3(-.3,.8,.5)));gl_FragColor=vec4(tint*light,opacity*edge);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
   const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;this.group.add(mesh);
   return {mesh,life:0,p:new THREE.Vector3(),v:new THREE.Vector3(),size:0};
  });
 }
 burst(position){
  for(let i=0;i<10;i++){
   const item=this.items.find(p=>p.life<=0)||this.items[this.cursor++%this.items.length],angle=i*Math.PI/5;
   item.life=CAPTURE_SMOKE_SECONDS;item.p.copy(position);item.p.y+=.45+i%3*.18;
   item.p.x+=Math.cos(angle)*.14;item.p.z+=Math.sin(angle)*.14;
   item.v.set(Math.cos(angle)*.7,.25+Math.random()*.2,Math.sin(angle)*.7);item.size=.16+Math.random()*.05;
   item.mesh.position.copy(item.p);item.mesh.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
   item.mesh.scale.setScalar(item.size);item.mesh.material.uniforms.opacity.value=0;item.mesh.visible=true;
  }
 }
 update(dt){
  dt=Math.min(Math.max(dt||0,0),.1);
  for(const item of this.items){
   if(item.life<=0)continue;item.life=Math.max(0,item.life-dt);if(!item.life){item.mesh.visible=false;continue;}
   const age=1-item.life/CAPTURE_SMOKE_SECONDS,fadeIn=Math.min(1,age/.1),fadeOut=Math.min(1,item.life/.3);
   item.v.multiplyScalar(Math.exp(-dt*1.5));item.p.addScaledVector(item.v,dt);item.mesh.position.copy(item.p);
   item.mesh.rotation.y+=dt*.35;item.mesh.scale.setScalar(item.size*(1+age*2.1));
   item.mesh.material.uniforms.opacity.value=.62*fadeIn*fadeOut;
  }
 }
 clear(){for(const item of this.items){item.life=0;item.mesh.visible=false;}}
}
