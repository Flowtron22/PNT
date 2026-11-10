export function createMenuFlight(canvas) {
 const ink = canvas.getContext('2d');
 let time = 0;

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
