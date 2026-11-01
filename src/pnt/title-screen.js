// Startup gate: the input that opens the menu must not activate a menu button.
export function createTitleScreen(root,{onEnter,target=globalThis.window,now=()=>performance.now()}={}){
 let active=false,entered=false,consumeUntil=0,swallowPointerClick=false;
 const button=root.querySelector('button');
 const consume=event=>{event.preventDefault();event.stopImmediatePropagation();};
 function enter(){if(!active)return;active=false;entered=true;consumeUntil=now()+600;root.hidden=true;onEnter?.();}
 function keydown(event){if(!active)return;consume(event);if(!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!['Shift','Control','Alt','Meta','CapsLock'].includes(event.key))enter();}
 function pointerdown(event){if(!active)return;consume(event);if(event.button===0||event.button===undefined){swallowPointerClick=true;enter();}}
 function click(event){if(swallowPointerClick){swallowPointerClick=false;consume(event);return;}if(active){consume(event);enter();}else if(entered&&now()<consumeUntil)consume(event);}
 target.addEventListener('keydown',keydown,true);target.addEventListener('pointerdown',pointerdown,true);target.addEventListener('click',click,true);
 return {get active(){return active;},show(){if(entered)return;active=true;root.hidden=false;button?.focus({preventScroll:true});},gamepad(pressed){if(active&&pressed.size)enter();},dispose(){target.removeEventListener('keydown',keydown,true);target.removeEventListener('pointerdown',pointerdown,true);target.removeEventListener('click',click,true);}};
}
