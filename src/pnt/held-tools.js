import * as THREE from 'three';

// Prepare in the bind pose, before the animator starts. The socket then follows
// the spine through launch, flight and turning on every normalized costume.
export function prepareJetpackMount(actor){
 if(actor.jetpackMount)return actor.jetpackMount;
 let spine;actor.model.traverse(node=>{if(node.isBone&&node.name.replace(/[_\- ]/g,'').toLowerCase()==='bip001spine1')spine=node;});
 if(!spine)return null;
 actor.group.updateWorldMatrix(true,true);
 const point=actor.group.worldToLocal(spine.getWorldPosition(new THREE.Vector3()));
 point.y+=.12;point.z-=.18;
 const desired=new THREE.Matrix4().compose(point,new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/9,Math.PI/2,0)),new THREE.Vector3(1,1,1));
 const local=new THREE.Matrix4().copy(spine.matrixWorld).invert().multiply(actor.group.matrixWorld).multiply(desired);
 const socket=new THREE.Group();socket.name='Jetpack_SpineMount';local.decompose(socket.position,socket.quaternion,socket.scale);spine.add(socket);
 const nozzle=new THREE.Object3D();nozzle.name='Jetpack_Exhaust';nozzle.position.y=-.34;socket.add(nozzle);
 actor.jetpackMount=socket;actor.jetpackNozzle=nozzle;return socket;
}

export function attachHeldJetpack(actor,visual){
 if(!visual)return null;
 const socket=prepareJetpackMount(actor);if(!socket)return null;
 actor.heldJetpack?.removeFromParent();
 const center=new THREE.Box3().setFromObject(visual).getCenter(new THREE.Vector3());
 visual.position.sub(center);socket.add(visual);actor.heldJetpack=visual;return visual;
}

export function attachHeldHammer(actor,visual){
 if(!visual)return null;
 let hand;actor.model.traverse(node=>{if(node.isBone&&/^(bip001rhand|righthand|handr)$/.test(node.name.replace(/[_\- ]/g,'').toLowerCase()))hand=node;});
 if(!hand)return null;
 actor.group.updateWorldMatrix(true,true);
 const socket=new THREE.Group();socket.name='Hammer_HandGrip';
 const finger=hand.children.find(node=>node.isBone&&/finger/i.test(node.name));
 if(finger)socket.position.copy(finger.position).multiplyScalar(.55);else socket.position.set(.11,0,0);
 // Seat the thick cartoon handle against the palm, leaving the glove visible.
 socket.position.z+=.07;
 // The authored head points along -Y; the hammer clip swings hand +Y forward.
 socket.rotation.z=Math.PI;
 // Costume normalization scales the skeleton. Keep the existing tool size.
 const boneScale=hand.getWorldScale(new THREE.Vector3()),actorScale=actor.group.getWorldScale(new THREE.Vector3());
 socket.scale.set(actorScale.x/boneScale.x,actorScale.y/boneScale.y,actorScale.z/boneScale.z);
 const box=new THREE.Box3().setFromObject(visual),center=box.getCenter(new THREE.Vector3());
 // Grip the handle near its capped end, rather than the mesh center/head.
 visual.position.sub(new THREE.Vector3(center.x,box.min.y+(box.max.y-box.min.y)*.88,center.z));
 socket.add(visual);hand.add(socket);return socket;
}
