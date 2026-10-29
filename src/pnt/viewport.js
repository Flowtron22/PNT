// Inkwave-style sizing reference: scale UI components together without boxing
// the renderer into that aspect ratio. The scene always fills the real screen.
export function layoutUnit(width,height){return Math.min(width*.01,height/56.25);}
export function menuPreviewFrame({width,height,left,right,mode='home',bodyHeight=2.325,bodyWidth=1.6,fov=40}){
 const u=layoutUnit(width,height),freeLeft=Math.max(u*2,left+u*1.8),freeRight=Math.min(width-u*2,right-u);
 const available=Math.max(u*4,freeRight-freeLeft),heightLimit=height*(mode==='home'?.68:.78);
 const pixelsPerUnit=Math.max(.01,Math.min(heightLimit/bodyHeight,available*.88/bodyWidth));
 return {x:(freeLeft+freeRight)/2,y:height*.5,distance:height/(2*Math.tan(fov*Math.PI/360)*pixelsPerUnit),focus:bodyHeight*.5,pixelsPerUnit,freeLeft,freeRight};
}
