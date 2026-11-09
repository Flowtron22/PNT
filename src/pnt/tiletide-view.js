import * as THREE from 'three';
import {TILE_COLORS,TILE_POSITIONS,TILE_RADIUS} from './tiletide-rules.js';
import {createHammerSmokeGeometry} from './game-fx.js';

function padGeometry(){
 const shape=new THREE.Shape();for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,x=Math.cos(a)*TILE_RADIUS,z=Math.sin(a)*TILE_RADIUS;i?shape.lineTo(x,z):shape.moveTo(x,z);}shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.72,bevelEnabled:true,bevelSegments:2,bevelSize:.15,bevelThickness:.12});geometry.rotateX(Math.PI/2);return geometry;
}
export function patternTexture(index,color){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const g=canvas.getContext('2d');g.fillStyle=color;g.fillRect(0,0,256,256);g.globalAlpha=.34;g.fillStyle='#fff';if(index%3===0){for(const [x,y,r] of [[48,48,26],[190,55,35],[115,160,46],[220,215,25]]){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}}else if(index%3===1){for(let x=-256;x<512;x+=62)g.fillRect(x,0,28,256);}else{g.lineWidth=24;for(let y=-128;y<384;y+=72){g.beginPath();for(let x=-40;x<300;x+=80){g.lineTo(x,y);g.lineTo(x+40,y+38);}g.strokeStyle='#fff';g.stroke();}}g.globalAlpha=1;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;return texture;}
function galaxySurface(){
 const geometry=new THREE.PlaneGeometry(80,80);geometry.rotateX(-Math.PI/2);
 const material=new THREE.ShaderMaterial({transparent:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},vertexShader:`varying vec2 uvGalaxy;void main(){uvGalaxy=position.xz*.045;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;varying vec2 uvGalaxy;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
  void main(){vec2 p=uvGalaxy+vec2(time*.018,-time*.011);float n=noise(p*2.2)+noise(p*5.1)*.45;float cloud=smoothstep(.55,1.18,n);vec3 color=mix(vec3(.008,.004,.035),vec3(.12,.015,.31),cloud);color+=vec3(.32,.02,.48)*pow(max(0.,noise(p*3.4)-.58),2.)*3.5;vec2 cell=floor(p*24.);float star=step(.976,hash(cell))*pow(1.-length(fract(p*24.)-.5)*2.,8.);color+=star*vec3(.75,.87,1.);gl_FragColor=vec4(color,1.);}`});
 const mesh=new THREE.Mesh(geometry,material);mesh.position.y=-5.5;mesh.name='TileTumbleGalaxy';return mesh;
}
function hammerSmokePool(root){
 const geometry=createHammerSmokeGeometry(),colors=[0xe8e9ec,0xd9dce2,0xc5cbd4,0xf4f4f5],items=Array.from({length:48},(_,i)=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:colors[i%colors.length],transparent:true,opacity:0,depthWrite:false}));mesh.visible=false;root.add(mesh);return {mesh,life:0,total:0,velocity:new THREE.Vector3(),size:1};});let cursor=0;
 function burst(index){const p=TILE_POSITIONS[index];for(let n=0;n<8;n++){const item=items[cursor++%items.length],angle=n/8*Math.PI*2+index*.53,speed=2.2+Math.random()*1.4;item.life=item.total=.7+Math.random()*.25;item.size=.3+Math.random()*.16;item.mesh.visible=true;item.mesh.material.opacity=1;item.mesh.position.set(p[0]+Math.cos(angle)*.45,.18+Math.random()*.22,p[2]+Math.sin(angle)*.45);item.mesh.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);item.mesh.scale.setScalar(item.size);item.velocity.set(Math.cos(angle)*speed,.25+Math.random()*.5,Math.sin(angle)*speed).multiplyScalar(1.5);}}
 function update(dt){for(const item of items){if(item.life<=0)continue;item.life-=dt;if(item.life<=0){item.mesh.visible=false;continue;}const t=1-item.life/item.total,drag=Math.exp(-1.4*dt);item.velocity.x*=drag;item.velocity.z*=drag;item.mesh.position.addScaledVector(item.velocity,dt);item.mesh.rotation.x+=dt*1.1;item.mesh.rotation.z+=dt*.7;item.mesh.material.opacity=Math.min(1,(1-t)*2);item.mesh.scale.setScalar(item.size*(1+Math.min(t,.5))*Math.min(1,(1-t)*3)*1.5);}}
 function dispose(){geometry.dispose();for(const item of items)item.mesh.material.dispose();}
 return {burst,update,dispose};
}
export function createTiletideView(parent){
 const root=new THREE.Group(),galaxy=galaxySurface();root.add(galaxy);const geometry=padGeometry(),materials=TILE_COLORS.map((entry,i)=>new THREE.MeshStandardMaterial({color:entry.color,map:patternTexture(i,entry.color),roughness:.62,metalness:0})),pads=TILE_POSITIONS.map((p,i)=>{const mesh=new THREE.Mesh(geometry,materials[i]);mesh.position.set(p[0],-.12,p[2]);mesh.receiveShadow=true;root.add(mesh);return mesh;}),poofs=hammerSmokePool(root);parent.add(root);
 let lastStage='',lastCycle=0;
 return {root,update(round,dt){galaxy.material.uniforms.time.value+=dt;if(round.tileStage==='reveal'&&(lastStage!=='reveal'||round.cycle!==lastCycle))for(let i=0;i<pads.length;i++)if(i!==round.safeTile)poofs.burst(i);lastStage=round.tileStage;lastCycle=round.cycle;for(let i=0;i<pads.length;i++){const pad=pads[i],safe=i===round.safeTile,vanish=round.tileStage==='reveal'&&!safe,targetScale=vanish?0:1;if(!vanish)pad.visible=true;const scale=pad.scale.x+Math.sign(targetScale-pad.scale.x)*Math.min(Math.abs(targetScale-pad.scale.x),dt*7.5);pad.scale.setScalar(scale);if(vanish&&scale<.025)pad.visible=false;pad.position.y=-.12;pad.material.emissive.set(safe&&round.tileStage==='run'?TILE_COLORS[i].color:'#000');pad.material.emissiveIntensity=safe&&round.tileStage==='run'?.12:0;}poofs.update(dt);},dispose(){root.removeFromParent();geometry.dispose();galaxy.geometry.dispose();galaxy.material.dispose();poofs.dispose();for(const material of materials){material.map.dispose();material.dispose();}}};
}

export function createTiletideCallout(host){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(160,128,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(28,160/128,.1,20);camera.position.set(4.5,4.2,5.4);camera.lookAt(0,-.15,0);scene.add(new THREE.HemisphereLight(0xffffff,0x33215e,2.7));const light=new THREE.DirectionalLight(0xffffff,3.3);light.position.set(-3,6,4);scene.add(light);
 const geometry=padGeometry(),materials=TILE_COLORS.map((entry,i)=>new THREE.MeshStandardMaterial({color:entry.color,map:patternTexture(i,entry.color),roughness:.55,metalness:.04})),mesh=new THREE.Mesh(geometry,materials[0]);mesh.scale.setScalar(.82);scene.add(mesh);
 let index=-1;
 return {update(next,visible,dt){host.hidden=!visible;if(!visible)return;if(next!==index){index=next;mesh.material=materials[next];host.setAttribute('aria-label',`Target tile: ${TILE_COLORS[next].name}`);}mesh.rotation.y+=dt*.65;renderer.render(scene,camera);},dispose(){renderer.dispose();renderer.domElement.remove();geometry.dispose();for(const material of materials){material.map.dispose();material.dispose();}}};
}
