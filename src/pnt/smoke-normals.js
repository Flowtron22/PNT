import * as THREE from 'three';

// Transfer the normals of one enclosing ellipsoid to every animated lobe.
// Evaluate in cloud space so puff rotations/scales cannot rotate the lighting.
export function createSmokeNormalField(cloud){
 const center=new THREE.Vector3(),inverseRadiusSquared=new THREE.Vector3();
 const worldToCloud=new THREE.Matrix4(),lastWorld=new THREE.Matrix4();
 const bounds=new THREE.Box3(),extent=new THREE.Vector3(),point=new THREE.Vector3();
 const material=new THREE.MeshLambertMaterial({color:0xe8e9ec});
 material.name='smoke-shared-envelope-normals';
 material.customProgramCacheKey=()=> 'smoke-shared-envelope-normals-v1';
 material.onBeforeCompile=shader=>{
  shader.uniforms.uSmokeWorldToCloud={value:worldToCloud};
  shader.uniforms.uSmokeCenter={value:center};
  shader.uniforms.uSmokeInverseRadiusSquared={value:inverseRadiusSquared};
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
uniform mat4 uSmokeWorldToCloud;
uniform vec3 uSmokeCenter;
uniform vec3 uSmokeInverseRadiusSquared;`)
   .replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
mat4 smokeObjectToCloud = uSmokeWorldToCloud * modelMatrix;
vec3 smokePoint = (smokeObjectToCloud * vec4(position, 1.0)).xyz;
vec3 smokeNormal = (smokePoint - uSmokeCenter) * uSmokeInverseRadiusSquared;
smokeNormal = dot(smokeNormal, smokeNormal) > 0.00000001 ? normalize(smokeNormal) : vec3(0.0, 1.0, 0.0);
// A transpose cancels the per-puff inverse transpose in normalMatrix.
objectNormal = vec3(dot(smokeObjectToCloud[0].xyz, smokeNormal),
                    dot(smokeObjectToCloud[1].xyz, smokeNormal),
                    dot(smokeObjectToCloud[2].xyz, smokeNormal));`);
 };
 function syncWorld(){
  if(!lastWorld.equals(cloud.matrixWorld)){
   lastWorld.copy(cloud.matrixWorld);worldToCloud.copy(lastWorld).invert();
  }
 }
 function update(){
  bounds.makeEmpty();
  for(const puff of cloud.children){
   puff.updateMatrix();const e=puff.matrix.elements;
   extent.set(Math.hypot(e[0],e[4],e[8]),Math.hypot(e[1],e[5],e[9]),Math.hypot(e[2],e[6],e[10]));
   bounds.expandByPoint(point.copy(puff.position).sub(extent));
   bounds.expandByPoint(point.copy(puff.position).add(extent));
  }
  bounds.getCenter(center);bounds.getSize(extent).multiplyScalar(.5);
  inverseRadiusSquared.set(1/Math.max(extent.x*extent.x,.0001),1/Math.max(extent.y*extent.y,.0001),1/Math.max(extent.z*extent.z,.0001));
 }
 for(const puff of cloud.children){puff.material=material;puff.onBeforeRender=syncWorld;}
 update();let disposed=false;
 return {update,dispose(){if(disposed)return;disposed=true;material.dispose();}};
}
