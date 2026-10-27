export const DEFAULT_BINDINGS={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',tool1:'KeyQ',tool2:'KeyW',interact:'KeyE'};
export const BINDING_LABELS={up:'Move up',down:'Move down',left:'Move left',right:'Move right',tool1:'Tool slot 1',tool2:'Tool slot 2',interact:'Interact'};
const valid=code=>/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight|Enter)$/.test(code);
export function keyLabel(code){return ({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Space:'SPACE',ShiftLeft:'L SHIFT',ShiftRight:'R SHIFT',ControlLeft:'L CTRL',ControlRight:'R CTRL',Enter:'ENTER'})[code]||code.replace(/^Key|^Digit/,'');}
export function rebind(bindings,action,code){if(!(action in DEFAULT_BINDINGS)||!valid(code))return null;const next={...bindings},previous=next[action],other=Object.keys(next).find(k=>k!==action&&next[k]===code);next[action]=code;if(other)next[other]=previous;return next;}
export function loadBindings(storage){try{const saved=JSON.parse(storage.getItem('pnt-bindings')||'{}');let bindings={...DEFAULT_BINDINGS};for(const action of Object.keys(DEFAULT_BINDINGS))if(valid(saved[action]||''))bindings=rebind(bindings,action,saved[action]);return bindings;}catch{return {...DEFAULT_BINDINGS};}}
export function saveBindings(storage,bindings){try{storage.setItem('pnt-bindings',JSON.stringify(bindings));}catch{}}
export function movementInput(keys,bindings){return {x:Number(keys.has(bindings.right))-Number(keys.has(bindings.left)),z:Number(keys.has(bindings.down))-Number(keys.has(bindings.up))};}
