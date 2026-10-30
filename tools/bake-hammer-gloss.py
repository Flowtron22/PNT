"""Bake four original asymmetric layouts, each with 16 evolving mask frames.

RGB: pink contours / independent yellow strokes / sparkle. 1024px atlas is
four 4x4-frame quadrants. No reference artwork is extracted.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
import math
import random

ROOT=Path(__file__).resolve().parents[1]
CELL,AA=128,3
atlas=Image.new('RGB',(1024,1024))


def poly(draw,points,value):
    draw.polygon([(round(x*AA),round(y*AA)) for x,y in points],fill=value)


def stroke(draw,points,width):
    left,right=[],[]
    for i,(x,y) in enumerate(points):
        a=points[max(0,i-1)];b=points[min(len(points)-1,i+1)]
        dx,dy=b[0]-a[0],b[1]-a[1];length=max(.001,math.hypot(dx,dy))
        w=width*(.16 if i in (0,len(points)-1) else 1)
        left.append((x-dy/length*w,y+dx/length*w))
        right.append((x+dy/length*w,y-dx/length*w))
    poly(draw,left+right[::-1],255)


def wipe(draw,angle,distance):
    # A directional half-plane removes the stem first, leaving outer corners.
    x,y=64+math.cos(angle)*distance,64+math.sin(angle)*distance
    ux,uy=math.cos(angle),math.sin(angle);tx,ty=-uy,ux
    poly(draw,[(x+tx*150,y+ty*150),(x-tx*150,y-ty*150),
               (x-tx*150-ux*200,y-ty*150-uy*200),
               (x+tx*150-ux*200,y+ty*150-uy*200)],0)


for variant in range(4):
    rng=random.Random(6701+variant*137)
    count=[5,4,6,5][variant]
    weights=[rng.uniform(.65,1.35) for _ in range(count)]
    cursor=.13;lobes=[]
    for weight in weights:
        span=math.tau*weight/sum(weights)
        angle=cursor+span*.48;cursor+=span
        length=rng.uniform(.78,1.0);width=rng.uniform(.22,.4)*span/(math.tau/5)
        shape=[(rng.uniform(.08,.2),0),(.37,-width*.9),
               (rng.uniform(.72,.89),-width),
               (length,rng.uniform(-.1,.08)),(.79,width*.78),(.35,width*.65)]
        lobes.append(dict(angle=angle,shape=shape,skew=rng.uniform(-.12,.12),
                          thickness=rng.uniform(.53,.7),delay=rng.uniform(-.06,.12),
                          offset=(rng.uniform(-6,6),rng.uniform(-6,6)),
                          yellowangle=rng.uniform(-.15,.15),width=rng.uniform(1.3,2.6),
                          path=rng.choice([(0,1,2,3),(2,3,4,5),(1,2,3,4)])))
    for frame in range(16):
        t=frame/15;expand=.22+.78*(1-(1-min(1,t/.36))**3);radius=52*expand
        pink=Image.new('L',(CELL*AA,CELL*AA));yellow=pink.copy()
        for lobe in lobes:
            a=lobe['angle'];c,s=math.cos(a),math.sin(a)
            coords=[(64+(x*c-y*s)*radius,64+(x*s+y*c)*radius) for x,y in lobe['shape']]
            layer=Image.new('L',pink.size);draw=ImageDraw.Draw(layer)
            cx=sum(x for x,y in coords)/len(coords);cy=sum(y for x,y in coords)/len(coords)
            poly(draw,coords,255)
            poly(draw,[(cx+(x-cx)*lobe['thickness'],cy+(y-cy)*lobe['thickness']) for x,y in coords],0)
            progress=max(0,min(1,(t-.27-lobe['delay'])/.67))
            if progress: wipe(draw,a, radius*(.02+1.18*progress))
            pink=ImageChops.lighter(pink,layer)
            # Related design language, independently skewed/offset OPEN strokes.
            ya=a+lobe['yellowangle']+t*lobe['skew'];c,s=math.cos(ya),math.sin(ya)
            ox,oy=lobe['offset']
            points=[(64+(lobe['shape'][i][0]*c-lobe['shape'][i][1]*s)*radius*1.04+ox*expand,
                     64+(lobe['shape'][i][0]*s+lobe['shape'][i][1]*c)*radius*1.04+oy*expand)
                    for i in lobe['path']]
            layer=Image.new('L',pink.size);draw=ImageDraw.Draw(layer)
            stroke(draw,points,lobe['width']*expand)
            progress=max(0,min(1,(t-.16+lobe['delay'])/.76))
            if progress:wipe(draw,ya,radius*(1.18*progress-.04))
            yellow=ImageChops.lighter(yellow,layer)
        star=Image.new('L',pink.size);draw=ImageDraw.Draw(star);points=[]
        for i in range(8):
            a=i*math.pi/4;r=(43 if i%2==0 else 10)*(1-.22*t)
            points.append((64+math.cos(a)*r,64+math.sin(a)*r))
        poly(draw,points,255)
        poly(draw,[(64+(x-64)*.64,64+(y-64)*.64) for x,y in points],150)
        if t>.65:
            r=(t-.65)*44
            draw.ellipse(tuple(round(v*AA) for v in (64-r,64-r,64+r,64+r)),fill=0)
        cell=Image.merge('RGB',[c.resize((CELL,CELL),Image.Resampling.LANCZOS) for c in (pink,yellow,star)])
        atlas.paste(cell,((variant%2)*512+(frame%4)*CELL,(variant//2)*512+(frame//4)*CELL))
atlas.save(ROOT/'assets/pnt/vfx/hammer-gloss-flipbook.png',optimize=True)
print('Baked four asymmetric 16-frame layouts: pink contours / separate yellow strokes / sparkle.')
