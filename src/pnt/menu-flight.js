function cloudSprite() {
 const canvas = document.createElement('canvas');
 canvas.width = 200;
 canvas.height = 112;
 const ink = canvas.getContext('2d');
 const puffs = [[49,69,34,25],[102,71,64,31],[144,68,43,29],[94,47,44,38],[121,59,40,34]];
 for (const [x,y,rx,ry] of puffs) {
  ink.save();
  ink.translate(x,y);
  ink.scale(rx,ry);
  const light = ink.createRadialGradient(-.22,-.45,.1,0,0,1);
  light.addColorStop(0,'#fff9ff');
  light.addColorStop(.58,'#edf0ff');
  light.addColorStop(.86,'#aebff9');
  light.addColorStop(1,'#aebff900');
  ink.fillStyle = light;
  ink.fillRect(-1,-1,2,2);
  ink.restore();
 }
 return canvas;
}

export function createMenuFlight(canvas) {
 const ink = canvas.getContext('2d');
 const cloud = cloudSprite();
 let time = 0;

 function draw(width,height) {
  ink.clearRect(0,0,width,height);
  for (let i=0;i<39;i++) {
   const isCloud = i<12;
   const phase = (i*.618034+time*(isCloud?.185:.56)*(1+(i%5)*.08))%1;
   // Moving through the scene reduces depth and pushes details outward from
   // the vanishing point. The ship flies left, so traffic streams to the right.
   const depth = 1.62-phase*1.37;
   const lane = (i%2===0?1:-1)*(.115+(i*13%19)*.014);
   const x = width*(.23+(.065+(i*7%17)*.011)/depth+phase*.19);
   const y = height*(.47+lane/depth);
   const opacity = Math.min(1,phase*8,(1-phase)*9);
   if (isCloud) {
    const size = width*(.033+(i%4)*.014)/depth;
    ink.globalAlpha = opacity*(.48+(i%3)*.12);
    ink.drawImage(cloud,x-size*.5,y-size*.28,size,size*.56);
   } else {
    const length = width*(.024+(i%4)*.010)/(depth*depth);
    const thickness = Math.max(1,height*.004/depth);
    const rise = lane*length*.73;
    ink.globalAlpha = opacity*(.27+(i%3)*.12);
    ink.fillStyle = i%4===0?'#e6cbff':'#edfcff';
    ink.beginPath();
    ink.moveTo(x-length,y-rise);
    ink.quadraticCurveTo(x-length*.31,y-rise*.28-thickness,x,y);
    ink.quadraticCurveTo(x-length*.24,y-rise*.17+thickness,x-length,y-rise);
    ink.fill();
   }
  }
  ink.globalAlpha = 1;
 }

 return {
  update(dt,width,height,reduced) {
   if (canvas.width!==width||canvas.height!==height) {
    canvas.width=width;
    canvas.height=height;
   }
   if (reduced) {
    ink.clearRect(0,0,width,height);
    return;
   }
   time+=Math.min(dt,.1);
   draw(width,height);
  }
 };
}
