const RAINBOW = ['#ff759b','#ffae71','#ffea85','#a6ed97','#86e5ff','#c4aaff'];
const ASCENT_SECONDS = 2.8;
const TRAIL_LENGTH = .44;
const TRAIL_SEGMENTS = 12;
const SPRINKLES = 78;
const SPIN_TURNS_PER_SECOND = 1.5;

export const FLYER_COSTUMES = ['oyen','thief','police','raptor','pingu'];

// The first two routes launch from the bottom. The arcs enter from the sides.
const ROUTES = [
 {start:[.78,1.08],control:[.905,.60],end:[1.03,.12]},
 {start:[.18,1.08],control:[.36,.48],end:[.54,-.12]},
 {start:[-.08,.73],control:[.55,.57],end:[.88,-.13]},
 {start:[1.08,.67],control:[.91,.27],end:[.30,-.07]}
];

function sampleRoute(flyby,progress,width,height) {
 const {start,control,end} = flyby.route;
 const t = Math.max(0,Math.min(1,progress)), u = 1-t;
 const dx = 2*(u*(control[0]-start[0])+t*(end[0]-control[0]))*width;
 const dy = 2*(u*(control[1]-start[1])+t*(end[1]-control[1]))*height;
 const length = Math.hypot(dx,dy);
 // The trail can extend past either endpoint. Continue along its tangent there.
 const extension = progress-t;
 return {
  x:(u*u*start[0]+2*u*t*control[0]+t*t*end[0]+flyby.offsetX)*width+extension*dx,
  y:(u*u*start[1]+2*u*t*control[1]+t*t*end[1])*height+extension*dy,
  dx,dy,nx:-dy/length,ny:dx/length
 };
}

export function createMenuFlight(canvas,random=Math.random) {
 const ink = canvas.getContext('2d');
 let time = 0;
 let wait = 3+random()*4;
 let flyby = null;
 let lastCostume;

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
  const {progress} = flyby;
  const trail = Array.from({length:TRAIL_SEGMENTS+1},(_,i)=>
   sampleRoute(flyby,progress-TRAIL_LENGTH*(1-i/TRAIL_SEGMENTS),width,height)
  );
  const tail = trail[0], head = trail[TRAIL_SEGMENTS];
  const bandWidth = Math.max(1.7,height*.004);
  for (let band=0;band<RAINBOW.length;band++) {
   const tint = RAINBOW[band];
   const offset = (band-RAINBOW.length/2)*bandWidth;
   const fade = ink.createLinearGradient(tail.x,tail.y,head.x,head.y);
   fade.addColorStop(0,tint+'00');
   fade.addColorStop(.55,tint+'80');
   fade.addColorStop(1,tint+'cc');
   ink.fillStyle = fade;
   ink.beginPath();
   ink.moveTo(tail.x+tail.nx*offset*.24,tail.y+tail.ny*offset*.24);
   for (let i=1;i<=TRAIL_SEGMENTS;i++) {
    const point = trail[i], spread = offset*(.24+.76*i/TRAIL_SEGMENTS);
    ink.lineTo(point.x+point.nx*spread,point.y+point.ny*spread);
   }
   for (let i=TRAIL_SEGMENTS;i>=0;i--) {
    const point = trail[i], spread = (offset+bandWidth)*(.24+.76*i/TRAIL_SEGMENTS);
    ink.lineTo(point.x+point.nx*spread,point.y+point.ny*spread);
   }
   ink.closePath();
   ink.fill();
  }
  for (let i=0;i<SPRINKLES;i++) {
   const age = (i/SPRINKLES+progress*1.8)%1;
   const distance = age*TRAIL_LENGTH*1.17;
   const drift = ((i*17%23)/11-1)*bandWidth*(1+age*7);
   const point = sampleRoute(flyby,progress-distance,width,height);
   const px = point.x+point.nx*drift, py = point.y+point.ny*drift;
   const size = Math.max(1,height*(.0017+(i%7)*.00044))*(1-age*.6);
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
  return {
   x:head.x/width,y:head.y/height,roll:Math.atan2(head.dx,-head.dy),costume:flyby.costume,
   spin:progress*ASCENT_SECONDS*SPIN_TURNS_PER_SECOND*2*Math.PI
  };
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
    const route = ROUTES[Math.floor(random()*ROUTES.length)];
    const offsetX = (random()-.5)*.045;
    wait = 9+random()*9;
    const costumes = FLYER_COSTUMES.filter(costume=>costume!==lastCostume);
    lastCostume = costumes[Math.floor(random()*costumes.length)];
    flyby = {progress:0,route,offsetX,costume:lastCostume};
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
