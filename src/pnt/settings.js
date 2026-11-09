export const SETTINGS_KEY='pnt-settings-v1';
export const RENDER_RESOLUTIONS=[[0,'Auto'],[720,'1280 × 720'],[1080,'1920 × 1080'],[1440,'2560 × 1440'],[2160,'3840 × 2160']];
export const GRAPHICS_QUALITY={low:{height:720,dpr:1,shadow:512},medium:{height:900,dpr:1.25,shadow:768},high:{height:1080,dpr:1.5,shadow:1024},ultra:{height:2160,dpr:2,shadow:2048}};
export const DEFAULT_SETTINGS=Object.freeze({quality:'high',renderResolution:0,fpsCap:0,showFps:false,master:1,music:1,sfx:1,uiSounds:true,haptics:true,reducedMotion:false,cameraShake:1,hudScale:1,joystickSize:1,joystickSensitivity:1});
const ranges={master:[0,1],music:[0,1],sfx:[0,1],cameraShake:[0,1],hudScale:[.7,1.3],joystickSize:[.8,1.5],joystickSensitivity:[.5,1.5]};
export function normalizeSettings(raw={},defaults=DEFAULT_SETTINGS){
 const value={...defaults};
 for(const key of Object.keys(DEFAULT_SETTINGS)){
  const item=raw?.[key];
  if(key in ranges){if(typeof item==='number'&&Number.isFinite(item))value[key]=Math.min(ranges[key][1],Math.max(ranges[key][0],item));}
  else if(typeof DEFAULT_SETTINGS[key]==='boolean'){if(typeof item==='boolean')value[key]=item;}
  else if(key==='renderResolution'&&RENDER_RESOLUTIONS.some(([height])=>height===item))value[key]=item;
  else if(key==='quality'&&typeof item==='string'){const tier=item==='battery'?'low':item==='balanced'?'high':item;if(Object.hasOwn(GRAPHICS_QUALITY,tier))value[key]=tier;}
  else if(key==='fpsCap'&&[0,30,60].includes(item))value[key]=item;
 }
 return value;
}
export function renderPixelRatio(width,height,pixelRatio,quality,resolution,desktop){
 const preset=GRAPHICS_QUALITY[quality]||GRAPHICS_QUALITY.high;
 if(!desktop)return Math.min(pixelRatio,preset.dpr);
 const limit=resolution||preset.height;
 return Math.min(pixelRatio,(limit*16/9)/width,limit/height);
}
export function loadSettings(storage,reducedMotion=false){
 const defaults={...DEFAULT_SETTINGS,reducedMotion};
 try{
  const saved=storage.getItem(SETTINGS_KEY);
  if(saved)return normalizeSettings(JSON.parse(saved),defaults);
  return normalizeSettings({quality:storage.getItem('psx-web-quality'),uiSounds:storage.getItem('pnt-ui-sounds')!=='off',haptics:storage.getItem('pnt-haptics')!=='off',sfx:storage.getItem('pnt-game-sfx')==='off'?0:1,music:storage.getItem('pnt-game-music')==='off'?0:1},defaults);
 }catch{return defaults;}
}
export function saveSettings(storage,value){try{storage.setItem(SETTINGS_KEY,JSON.stringify(normalizeSettings(value)));return true;}catch{return false;}}
// Gate only rendering: input, simulation, networking and audio keep their cadence.
export function createRenderGate(){let last=null;return (now,cap)=>{if(!cap||last===null||now<last){last=now;return true;}const interval=1000/cap,delta=now-last;if(delta<interval-.5)return false;last+=Math.max(1,Math.floor((delta+.5)/interval))*interval;return true;};}
