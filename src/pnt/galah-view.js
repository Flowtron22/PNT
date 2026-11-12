import * as THREE from 'three';
import {GALAH_WIDTH, GALAH_END, GALAH_CROSSBARS, GALAH_RUN_LINE, GALAH_RUNWAY_END} from './galah-rules.js';
import {matchView} from './camera-rig.js';

export const GALAH_CAMERA_LIFT = .7;
export const GALAH_CAMERA_ZOOM = 2.2;

export function galahCameraView(aspect) {
 const base = matchView(aspect);
 const [x, y] = base.offset;
 const horizontal = -x / base.distance, vertical = y / base.distance;
 const tangent = Math.tan(base.fov * Math.PI / 360) / GALAH_CAMERA_ZOOM;
 let distance = base.distance;
 // Fit the runways and avatars at the tighter zoom, with room for the HUD.
 for (const courtX of [-GALAH_WIDTH - .45, GALAH_WIDTH + .45]) {
  for (const height of [-GALAH_CAMERA_LIFT, 1.8 - GALAH_CAMERA_LIFT]) {
   const depth = horizontal * courtX - vertical * height;
   const screenY = vertical * courtX + horizontal * height;
   distance = Math.max(distance,
    (GALAH_RUNWAY_END + .45) / (tangent * aspect * .94) - depth,
    Math.abs(screenY) / (tangent * (screenY > 0 ? .78 : .91)) - depth);
  }
 }
 return {distance, offset:[-distance * horizontal, distance * vertical, 0]};
}

export function createGalahCourt(parent, heightAt) {
 const root = new THREE.Group();
 root.name = 'Galah Panjang court';
 const outline = new THREE.MeshBasicMaterial({color:'#132239', side:THREE.DoubleSide, toneMapped:false});
 const blue = new THREE.MeshBasicMaterial({color:'#62d1ff', side:THREE.DoubleSide, toneMapped:false});
 const red = new THREE.MeshBasicMaterial({color:'#ff5869', side:THREE.DoubleSide, toneMapped:false});
 const white = new THREE.MeshBasicMaterial({color:'#fff4cc', side:THREE.DoubleSide, toneMapped:false});
 const materials = [outline, blue, red, white];

 function strip(x0, z0, x1, z1, width, lift, material) {
  const length = Math.hypot(x1-x0, z1-z0);
  const segments = Math.ceil(length / .24);
  const dx = (z1-z0) / length * width / 2;
  const dz = (x0-x1) / length * width / 2;
  const points = [], indices = [];
  for (let i = 0; i <= segments; i++) {
   const t = i / segments, x = x0 + (x1-x0)*t, z = z0 + (z1-z0)*t;
   points.push(x-dx, heightAt(x-dx,z-dz)+lift, z-dz, x+dx, heightAt(x+dx,z+dz)+lift, z+dz);
   const a = i*2;
   if (i < segments) indices.push(a,a+1,a+2,a+1,a+3,a+2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices);
  root.add(new THREE.Mesh(geometry, material));
 }

 const line = (x0, z0, x1, z1, color, width=.14) => {
  strip(x0,z0,x1,z1,width+.07,.021,outline);
  strip(x0,z0,x1,z1,width,.032,color);
 };
 const w = GALAH_WIDTH, end = GALAH_END;
 for (const x of [-w, w]) line(x,-end,x,end,white,.11);
 line(0,-end,0,end,blue);
 line(-w,-end,w,-end,blue);
 for (const z of GALAH_CROSSBARS) line(-w,z,w,z,red);
 for (const z of [-GALAH_RUN_LINE, GALAH_RUN_LINE]) {
  const dashes = Math.floor((w - .3) / .6);
  for (let dash = -dashes; dash <= dashes; dash++) {
   const x = dash * .6;
   line(x-.15,z,x+.15,z,white,.08);
  }
 }
 parent.add(root);
 return {root, dispose() {
  root.removeFromParent();
  for (const mesh of root.children) mesh.geometry.dispose();
  for (const material of materials) material.dispose();
 }};
}
