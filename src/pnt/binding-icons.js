import {keyLabel} from './keybindings.js';
export function bindingMarkup(code){
 const button={Mouse0:'left',Mouse1:'middle',Mouse2:'right'}[code];if(!button)return keyLabel(code);
 const highlight=button==='left'?'<path d="M12 4C6 4 3 8 3 15h9Z"/>':button==='right'?'<path d="M12 4c6 0 9 4 9 11h-9Z"/>':'<rect x="10" y="7" width="4" height="9" rx="2"/>';
 return `<svg class="mouse-binding" viewBox="0 0 24 32" role="img" aria-label="Mouse ${button} button"><g class="mouse-button-highlight">${highlight}</g><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="27" rx="9"/><path d="M3 16h18M12 3v13"/><rect x="10" y="7" width="4" height="7" rx="2"/></g></svg>`;
}
