import * as THREE from 'three';
export function moneyFraction(value,total){return Number.isFinite(value)&&Number.isFinite(total)&&total>0?Math.max(0,Math.min(1,value/total)):0;}
export function updateMoneyBar(node,value,total,{cache=false}={}){
 if(!node.querySelector('.money-bar-fill')){node.innerHTML='<span class="money-bar-fill" aria-hidden="true"></span><span class="money-bar-label" aria-hidden="true"></span>';node.setAttribute('role','progressbar');node.setAttribute('aria-label',cache?'Cache money remaining':'Money stolen');node.setAttribute('aria-valuemin','0');}
 total=Number.isFinite(total)?Math.max(0,total):0;value=Number.isFinite(value)?value:0;const amount=Math.max(0,Math.min(total,Math.ceil(value))),signature=`${amount}/${total}`;if(node.dataset.balance===signature)return;node.dataset.balance=signature;
 node.setAttribute('aria-valuemax',String(total));node.setAttribute('aria-valuenow',String(amount));node.querySelector('.money-bar-fill').style.clipPath=`inset(0 ${(1-moneyFraction(value,total))*100}% 0 0)`;
 node.querySelector('.money-bar-label').textContent=cache?'$'+amount.toLocaleString():'$'+amount.toLocaleString()+' / $'+total.toLocaleString();node.classList.toggle('empty',amount<=0);
}
export function cacheCenters(arena,caches,matchRoot,ground=()=>NaN){
 const candidates=[],used=new Set(),result=new Map();matchRoot.updateMatrixWorld(true);
 arena.traverse(node=>{if(!/^BP_Money/i.test(node.name))return;const box=new THREE.Box3().setFromObject(node);if(!box.isEmpty())candidates.push(matchRoot.worldToLocal(box.getCenter(new THREE.Vector3())));});
 for(const cache of caches){let closest=null,distance=Infinity;for(const point of candidates){if(used.has(point))continue;const d=Math.hypot(point.x-cache.position[0],point.z-cache.position[2]);if(d<distance&&d<3){distance=d;closest=point;}}if(closest){used.add(closest);result.set(cache.id,closest);}else{const y=ground(cache.position[0],cache.position[2]);result.set(cache.id,new THREE.Vector3(cache.position[0],Number.isFinite(y)?y+.6:cache.position[1]+.55,cache.position[2]));}}
 return result;
}
