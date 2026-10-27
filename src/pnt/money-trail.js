// Screen-space coins follow real cache balance changes in practice and online play.
export function createMoneyTrail(root,target,{reduced=()=>false}={}){
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:8';root.append(canvas);
 const ctx=canvas.getContext('2d'),balances=new Map(),pending=new Map(),coins=[];
 let match=null,width=0,height=0,pulse=0,flash=null;
 function glow(){if(pulse>0)return;pulse=.15;flash?.cancel();flash=target.animate([{filter:'brightness(1)'},{filter:'brightness(1.8)',offset:.3},{filter:'brightness(1)'}],{duration:240});}
 return {update(round,project,dt,active){
  dt=Math.min(.05,Math.max(0,dt));pulse=Math.max(0,pulse-dt);
  if(match!==round?.profileId){match=round?.profileId;balances.clear();pending.clear();coins.length=0;}
  const ratio=Math.min(devicePixelRatio||1,2);
  if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);coins.length=0;}
  ctx.clearRect(0,0,width,height);
  const rect=target.getBoundingClientRect(),end={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  for(const cache of round?.caches||[]){
   const old=balances.get(cache.id);balances.set(cache.id,cache.remaining);
   if(!active||old===undefined||cache.remaining>=old){if(!active)pending.delete(cache.id);continue;}
   const amount=(pending.get(cache.id)||0)+old-cache.remaining;
   if(amount<40&&cache.remaining>0){pending.set(cache.id,amount);continue;}
   pending.set(cache.id,0);const start=project(cache.position);
   if(!start||reduced()){glow();continue;}
   for(let n=0;n<Math.min(3,Math.max(1,Math.floor(amount/40)))&&coins.length<48;n++)coins.push({x:start.x+(Math.random()-.5)*18,y:start.y+(Math.random()-.5)*12,t:-n*.06,life:.65+Math.random()*.15,bend:(Math.random()-.5)*90,r:4+Math.random()*2});
  }
  if(!active){coins.length=0;return;}
  for(let i=coins.length-1;i>=0;i--){const coin=coins[i];coin.t+=dt;if(coin.t<0)continue;const t=Math.min(1,coin.t/coin.life);
   if(t>=1){coins.splice(i,1);glow();continue;}
   const ease=t*t,x=coin.x+(end.x-coin.x)*ease+Math.sin(t*Math.PI)*coin.bend,y=coin.y+(end.y-coin.y)*ease-Math.sin(t*Math.PI)*65;
   const size=coin.r*(1-t*.35);ctx.save();ctx.translate(x,y);ctx.globalAlpha=Math.min(1,(1-t)*7);ctx.scale(.65+Math.abs(Math.cos(t*12))*.35,1);
   ctx.fillStyle='#d47a0c';ctx.beginPath();ctx.ellipse(1,2,size,size,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#ffd74a';ctx.strokeStyle='#fff0a1';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,size,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.fillStyle='#bb7207';ctx.font=`bold ${size*1.4}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',0,.5);ctx.restore();
  }
 }};
}
