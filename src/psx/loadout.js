import {TOOLS,COSTUMES} from './catalog.js';
const validTool=id=>TOOLS.some(t=>t.id===id);
export function normalizeLoadout(value,legacy){
 let ids;try{ids=typeof value==='string'?JSON.parse(value):value;}catch{ids=null;}
 const first=validTool(ids?.[0])?ids[0]:validTool(legacy)?legacy:'hammer';
 const second=validTool(ids?.[1])&&ids[1]!==first?ids[1]:TOOLS.find(t=>t.id!==first).id;
 return [first,second];
}
export function equipTool(loadout,id,slot){
 if(!validTool(id)||![0,1].includes(slot))throw new Error('Invalid tool slot');
 const next=normalizeLoadout(loadout),other=1-slot;
 if(next[other]===id)next[other]=next[slot];
 next[slot]=id;return next;
}
export function normalizeCostume(id){return COSTUMES.some(c=>c.id===id)?id:'thief';}
