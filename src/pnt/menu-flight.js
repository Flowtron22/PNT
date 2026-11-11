const RAINBOW = ['#ff759b','#ffae71','#ffea85','#a6ed97','#86e5ff','#c4aaff'];
const ASCENT_SECONDS = 2.8;
const TRAIL_LENGTH = .44;

export function createMenuFlight(canvas,random=Math.random) {
 const ink = canvas.getContext('2d');
 let time = 0;
 let wait = 3+random()*4;
 let flyby = null;

 function draw(width,height) {
  ink.clearRect(0,0,width,height);
  for (let i=12;i<39;i++) {
   const phase = (i*.618034+time*.56*(1+(i%5)*.08))%1;
   const lane = (i%2===0?1:-1)*(.115+(i*13%19)*.014);
   const opacity = Math.min(1,phase*8,(1-phase)*9);
   // Project the streaks from a near-left origin toward a far-right point.
   const depth = .50+phase*1.20;
   const x = width*(.86+(i%5)*.032-(.25+(i*7%17)*.012)/depth);
   const y = height*(.47+lane/depth);
   const length = width*(.024+(i%4)*.010)/(depth*depth);
   const thickness = Math.max(1,height*.004/depth);
   const left = x-length;
   const nearY = y+lane*length*.9;
   ink.globalAlpha = opacity*(.27+(i%3)*.12);
   ink.fillStyle = i%4===0?'#e6cbff':'#edfcff';
   ink.beginPath();
   ink.moveTo(left,nearY-thickness*.62);
   ink.quadraticCurveTo(left+length*.32,nearY-thickness,x,y);
   ink.quadraticCurveTo(left+length*.24,nearY+thickness,left,nearY+thickness*.62);
   ink.quadraticCurveTo(left-thickness,nearY,left,nearY-thickness*.62);
   ink.fill();
  }
  ink.globalAlpha = 1;
 }

 function drawFlyby(width,height) {
  const {progress,startX,endX,endY} = flyby;
  const dx = (endX-startX)*width;
  const dy = (endY-1.08)*height;
  const length = Math.hypot(dx,dy);
  const nx = -dy/length, ny = dx/length;
  const x = startX*width+dx*progress, y = 1.08*height+dy*progress;
  const tailX = x-dx*TRAIL_LENGTH, tailY = y-dy*TRAIL_LENGTH;
  const bandWidth = Math.max(1.7,height*.004);
  for (let band=0;band<RAINBOW.length;band++) {
   const tint = RAINBOW[band];
   const offset = (band-(RAINBOW.length-1)/2)*bandWidth;
   const fade = ink.createLinearGradient(tailX,tailY,x,y);
   fade.addColorStop(0,tint+'00');
   fade.addColorStop(.55,tint+'80');
   fade.addColorStop(1,tint+'cc');
   ink.fillStyle = fade;
   ink.beginPath();
   ink.moveTo(tailX+nx*(offset-bandWidth/2)*.24,tailY+ny*(offset-bandWidth/2)*.24);
   ink.lineTo(x+nx*(offset-bandWidth/2),y+ny*(offset-bandWidth/2));
   ink.lineTo(x+nx*(offset+bandWidth/2),y+ny*(offset+bandWidth/2));
   ink.lineTo(tailX+nx*(offset+bandWidth/2)*.24,tailY+ny*(offset+bandWidth/2)*.24);
   ink.closePath();
   ink.fill();
  }
  for (let i=0;i<46;i++) {
   const age = (i/46+progress*1.8)%1;
   const distance = age*TRAIL_LENGTH*1.17;
   const drift = ((i*17%23)/11-1)*bandWidth*(1+age*7);
   const px = x-dx*distance+nx*drift, py = y-dy*distance+ny*drift;
   const size = Math.max(.65,height*(.0011+(i%7)*.00029))*(1-age*.6);
   ink.globalAlpha = Math.sin(age*Math.PI)*(.42+.48*Math.sin(progress*36+i)**2);
   ink.fillStyle = i%3===0?'#fffde7':RAINBOW[i%RAINBOW.length];
   ink.beginPath();
   ink.moveTo(px-size,py);
   ink.lineTo(px,py-size*(i%4===0?2:1));
   ink.lineTo(px+size,py);
   ink.lineTo(px,py+size*(i%4===0?2:1));
   ink.fill();
  }
  ink.globalAlpha = 1;
  return {x:x/width,y:y/height,roll:Math.atan2(dx,-dy)};
 }

 return {
  clearFlyby() { flyby = null; },
  update(dt,width,height,reduced,home) {
   if (canvas.width!==width||canvas.height!==height) {
    canvas.width=width;
    canvas.height=height;
   }
   if (reduced) {
    flyby = null;
    ink.clearRect(0,0,width,height);
    return null;
   }
   dt = Math.min(dt,.1);
   time+=dt;
   draw(width,height);
   if (!home) {
    flyby = null;
    return null;
   }
   if (!flyby) {
    wait -= dt;
    if (wait>0) return null;
    const right = random()<.5;
    const startX = (right?.78:.18)+(random()-.5)*.045;
    flyby = {progress:0,startX,endX:startX+(right?.25:.36),endY:right?.12:-.12};
    wait = 9+random()*9;
   }
   flyby.progress += dt/ASCENT_SECONDS;
   if (flyby.progress>1+TRAIL_LENGTH) {
    flyby = null;
    return null;
   }
   return drawFlyby(width,height);
  }
 };
}
