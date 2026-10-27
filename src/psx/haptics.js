const PATTERNS={rocket:[35,35,35,65],banana:[55,35,25,50,55,60]};
export function createHaptics(device,{enabled=true}={}){let current=null,remaining=0;const supported=typeof device?.vibrate==='function';const call=pattern=>{if(supported)try{device.vibrate(pattern);}catch{}};
 return {supported,get enabled(){return enabled;},setEnabled(value){enabled=!!value;if(!enabled)this.stop();},update(effect,dt,active=true){const kind=active&&enabled&&PATTERNS[effect]?effect:null;if(!kind){this.stop();return;}remaining-=dt;if(kind!==current||remaining<=0){current=kind;remaining=.45;call(PATTERNS[kind]);}},stop(){if(current)call(0);current=null;remaining=0;}};
}
