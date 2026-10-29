import * as THREE from 'three';

// Freeze the current skinned pose into ordinary meshes. Markers need neither an
// animator nor a live skeleton, and must not follow the owner after placement.
export function createPlayerMirage(actor){
 actor.group.updateWorldMatrix(true,true);
 const root=new THREE.Group();root.name='B2B_PlayerMirage';
 root.quaternion.copy(actor.group.quaternion);root.scale.copy(actor.group.scale);
 const material=new THREE.ShaderMaterial({
  name:'B2B_Hologram',transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{time:{value:0},tint:{value:new THREE.Color(0x47dfff)}},
  vertexShader:`varying vec3 vNormal;varying vec3 vView;varying float vHeight;
   void main(){vec4 view=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);
    vView=-view.xyz;vHeight=(modelMatrix*vec4(position,1.0)).y;gl_Position=projectionMatrix*view;}`,
  fragmentShader:`uniform float time;uniform vec3 tint;varying vec3 vNormal;varying vec3 vView;varying float vHeight;
   void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),1.6);
    float scan=smoothstep(-.4,.6,sin(vHeight*75.0-time*4.0));
    float pulse=.96+.04*sin(time*2.5);
    gl_FragColor=vec4(mix(tint,vec3(.78,.98,1.0),rim*.75)*pulse,(.18+scan*.2+rim*.35)*pulse);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const inverse=new THREE.Matrix4().copy(actor.group.matrixWorld).invert(),point=new THREE.Vector3(),geometries=[];
 actor.model.traverse(source=>{
  if(!source.isMesh)return;
  // Bone-mounted tools are not part of the costume silhouette.
  for(let p=source;p&&p!==actor.model.parent;p=p.parent)if(!p.visible||/^(Hammer_HandGrip|Jetpack_SpineMount)$/.test(p.name))return;
  const geometry=source.geometry.clone(),positions=geometry.getAttribute('position');
  const transform=new THREE.Matrix4().multiplyMatrices(inverse,source.matrixWorld);
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(source.geometry.getAttribute('position'),i);
   if(source.isSkinnedMesh)source.applyBoneTransform(i,point);
   point.applyMatrix4(transform);positions.setXYZ(i,point.x,point.y,point.z);
  }
  geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.deleteAttribute('tangent');geometry.morphAttributes={};
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.push(geometry);
  const mesh=new THREE.Mesh(geometry,material);mesh.name=source.name;mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);
 });
 root.userData.playerMirage={material,geometries};return root;
}

export function animatePlayerMirage(root,dt){
 const data=root?.userData.playerMirage;if(data)data.material.uniforms.time.value=(data.material.uniforms.time.value+Math.min(Math.max(dt,0),.1))%1000;
}

export function disposePlayerMirage(root){
 const data=root?.userData.playerMirage;if(!data)return;
 for(const geometry of data.geometries)geometry.dispose();data.material.dispose();delete root.userData.playerMirage;
}
