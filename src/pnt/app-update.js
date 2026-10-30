const versionParts=value=>typeof value==='string'&&/^\d+\.\d+\.\d+$/.test(value)?value.split('.').map(Number):null;
export function newerRelease(candidate,current){
 const a=versionParts(candidate),b=versionParts(current);if(!a||!b)return false;
 for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i];
 return false;
}
export function createReleaseChecker(current,{fetcher=fetch,url='/release.json'}={}){
 let checking=false;
 return async()=>{
  if(checking)return null;checking=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
  try{
   const response=await fetcher(url,{cache:'no-store',signal:controller.signal});
   if(!response.ok)return null;
   const data=await response.json();return newerRelease(data.version,current)?data.version:null;
  }catch{return null;}finally{clearTimeout(timeout);checking=false;}
 };
}
export function mountReleaseUpdates({doc=document,win=window}={}){
 const current=doc.querySelector('footer')?.textContent.match(/WEB\s+(\d+\.\d+\.\d+)/)?.[1];
 if(!current)return;
 const check=createReleaseChecker(current,{fetcher:win.fetch.bind(win)});
 const banner=doc.createElement('aside');banner.id='app-update';banner.hidden=true;banner.setAttribute('aria-label','Game update');
 const text=doc.createElement('span'),refresh=doc.createElement('button'),later=doc.createElement('button');
 refresh.textContent='UPDATE';later.textContent='LATER';banner.append(text,refresh,later);doc.body.append(banner);
 let available=null,dismissed=null,lastCheck=-Infinity;
 // Lobby, loading, play, pause and results all keep the update out of the way.
 const safe=()=>!doc.hidden&&doc.body.classList.contains('menu-view')&&doc.querySelector('#menu')?.hidden===false&&doc.querySelector('#loading')?.hidden===true;
 function render(){banner.hidden=!(available&&available!==dismissed&&safe());}
 async function poll(force=false){
  render();if(doc.hidden||(!force&&Date.now()-lastCheck<60000))return;
  lastCheck=Date.now();const version=await check();
  if(version&&(!available||newerRelease(version,available)))available=version;
  text.textContent=available?`Update ${available} is ready.`:'';render();
 }
 refresh.addEventListener('click',()=>{
  if(!available||!safe()){render();return;}
  const url=new URL(win.location.href);url.searchParams.set('release',available);
  win.location.replace(url.href);
 });
 later.addEventListener('click',()=>{dismissed=available;render();});
 const resume=()=>{void poll(true);},tick=()=>{void poll();};
 const observer=new win.MutationObserver(render);
 observer.observe(doc.body,{attributes:true,attributeFilter:['class']});
 const timer=win.setInterval(tick,1000); // Also catch loading completion on the menu.
 doc.addEventListener('visibilitychange',resume);win.addEventListener('pageshow',resume);win.addEventListener('online',resume);
 void poll(true);
 return()=>{observer.disconnect();win.clearInterval(timer);doc.removeEventListener('visibilitychange',resume);win.removeEventListener('pageshow',resume);win.removeEventListener('online',resume);banner.remove();};
}
if(typeof document!=='undefined')mountReleaseUpdates();
