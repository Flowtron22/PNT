import {starSVG} from '../ui/ui-util.js';
import {TOOLS,COSTUMES} from './catalog.js';
import {profileView} from './profile.js';
export function renderHomeWidgets(profile,loadout,costume){
 const $=id=>document.getElementById(id),view=profileView(profile),tools=loadout.map(id=>TOOLS.find(t=>t.id===id)),outfit=COSTUMES.find(c=>c.id===costume);
 $('profile-name').textContent=profile.name;$('profile-name-edit').setAttribute('aria-label','Edit profile name: '+profile.name);$('profile-rank').textContent=view.rank;
 $('profile-level').textContent=profile.level;$('profile-xp').textContent=`${profile.xp.toLocaleString()} / ${view.xpToNext.toLocaleString()} XP`;$('profile-xp-bar').style.setProperty('--t',(profile.xp/view.xpToNext).toFixed(3));$('profile-xp-bar').setAttribute('aria-valuenow',String(profile.xp));$('profile-xp-bar').setAttribute('aria-valuemax',String(view.xpToNext));
 $('profile-wins').textContent=profile.wins.toLocaleString();$('profile-matches').textContent=profile.played.toLocaleString();$('profile-next-label').textContent=view.next?'NEXT RANK':'TOP RANK';$('profile-next').textContent=view.next?'LV '+view.next:view.rank;
 $('profile-portrait').src=`assets/pnt/portraits/${costume}.png`;$('profile-portrait').alt=outfit.name;
 if(!$('profile-splat').childElementCount)$('profile-splat').innerHTML=starSVG({seed:17,cls:'iw-fa',r:62,arms:8,drops:0});
 $('home-tool-icon').src=`assets/pnt/${tools[0].icon}.png`;$('home-tool-name').textContent=tools[0].name;$('home-tool-kind').textContent='TOOL SLOT 1';
 $('home-second-icon').src=`assets/pnt/${tools[1].icon}.png`;$('home-second-name').textContent=tools[1].name;$('home-costume-icon').src=`assets/pnt/portraits/${costume}.png`;$('home-costume-name').textContent=outfit.name;
 $('home-kit-main').setAttribute('aria-label','Change tools. Slot 1: '+tools[0].name);$('home-kit-second').setAttribute('aria-label','Change tools. Slot 2: '+tools[1].name);$('home-kit-costume').setAttribute('aria-label','Change costume: '+outfit.name);
}
