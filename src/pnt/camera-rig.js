export function matchView(aspect,stage=null){const tan=Math.tan(Math.PI/12),referenceHeight=(25*1.3*1.1*1.1)/(16/9),distance=Math.max(referenceHeight/(2*tan),stage?fitDistance(aspect,stage):0),height=2*distance*tan;return {fov:30,width:height*aspect,height,distance,offset:[-distance*.509,distance*.861,0]};}
// The stage center is established once per match and never follows an actor.
export function fixedStageCenter(spawns,caches){const points=[...spawns,...caches.map(c=>c.position)];const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]);return {x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2};}
export function shakeOffset(time,strength){return {x:Math.sin(time*89)*strength,z:Math.cos(time*107)*strength*.7};}

// Keep the shared stage in frame even in portrait, without following any player.
export function stageFraming(spawns,caches){const center=fixedStageCenter(spawns,caches),points=[...spawns,...caches.map(c=>c.position)];return {x:Math.max(...points.map(p=>Math.abs(p[0]-center.x)))+3,z:Math.max(...points.map(p=>Math.abs(p[2]-center.z)))+3};}
function fitDistance(aspect,stage){const tan=Math.tan(Math.PI/12);return Math.max(stage.z/(tan*aspect)+stage.x*.509,stage.x*.861/tan+stage.x*.509);}
