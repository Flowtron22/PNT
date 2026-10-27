export function stageEndState(seconds){return {fade:Math.max(0,Math.min(1,(seconds-1.7)/.7)),ready:seconds>=2.4};}
export function rollSpinDirection(random=Math.random){const angle=random()*Math.PI*2;return {x:Math.sin(angle),z:Math.cos(angle)};}
export function movementGroundReference(y,ground){return Number.isFinite(ground)?ground:y;}
