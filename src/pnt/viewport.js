export const DESIGN_WIDTH=1600,DESIGN_HEIGHT=900;
export function fitGameViewport(width,height){
 const scale=Math.max(0,Math.min(width/DESIGN_WIDTH,height/DESIGN_HEIGHT));
 const gameWidth=DESIGN_WIDTH*scale,gameHeight=DESIGN_HEIGHT*scale;
 return {scale,width:gameWidth,height:gameHeight,x:(width-gameWidth)/2,y:(height-gameHeight)/2};
}
// The logical camera/UI size stays fixed, while GPU resolution follows the
// physical game area. A small phone must not render a desktop-sized framebuffer.
export function gamePixelRatio(dpr,scale,quality){return Math.min(dpr||1,quality==='battery'?1:1.5)*Math.max(.01,scale||1);}
export function gameHost(win){
 try{return win.parent&&win.parent!==win&&win.parent.pntFrame?win.parent:null;}catch{return null;}
}
