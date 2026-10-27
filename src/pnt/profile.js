import {PROGRESSION} from '../menu-audio/config.js';
export const PROFILE_KEY='pnt-profile';
// the menu foundation's rank milestones and progression; stats belong to this browser's PNT practice.
export const RANKS=[{level:1,name:'Fresh Recruit'},{level:5,name:'Turf Scrapper'},{level:10,name:'Ink Slinger'},{level:20,name:'Splat Veteran'},{level:30,name:'Tide Legend'}];
const number=(value,fallback=0)=>Number.isFinite(+value)?Math.max(0,Math.min(1e8,Math.floor(+value))):fallback;
export function profileName(value){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,20);}
export function normalizeProfile(value={}){
 if(!value||typeof value!=='object')value={};
 const played=number(value.played??value.matches),level=Math.max(1,Math.min(999,number(value.level,1)));
 return {name:profileName(value.name)||'Player',level,xp:Math.min(number(value.xp),PROGRESSION.xpForLevel(level)-1),wins:Math.min(played,number(value.wins)),played,completed:Array.isArray(value.completed)?value.completed.filter(id=>typeof id==='string').slice(-32):[]};
}
export function readProfile(storage){try{return normalizeProfile(JSON.parse(storage.getItem(PROFILE_KEY)||'{}'));}catch{return normalizeProfile();}}
export function saveProfile(storage,profile){try{storage.setItem(PROFILE_KEY,JSON.stringify(profile));return true;}catch{return false;}}
export function profileView(profile){const rank=[...RANKS].reverse().find(r=>profile.level>=r.level)||RANKS[0];return {rank:rank.name,next:RANKS.find(r=>r.level>profile.level)?.level??null,xpToNext:PROGRESSION.xpForLevel(profile.level)};}
export function recordMatch(profile,{id,won}){
 if(typeof id!=='string'||!id||profile.completed.includes(id))return profile;
 const next={...profile,completed:[...profile.completed,id].slice(-32),played:profile.played+1,wins:profile.wins+(won?1:0),xp:profile.xp+(won?PROGRESSION.xpWin:PROGRESSION.xpLose)};
 while(next.xp>=PROGRESSION.xpForLevel(next.level)&&next.level<999){next.xp-=PROGRESSION.xpForLevel(next.level);next.level++;}
 return next;
}
