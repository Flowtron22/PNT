import * as THREE from 'three';

export function attachHeldHammer(actor,visual){
 if(!visual)return null;
 // Fit the socket against the undeformed rig, not a transient turn squash.
 actor.turnMotion?.reset();
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
