"""Bake original Gloss-inspired hammer masks: R petals, G fans, B sparkle.

Pillow, deterministic 4x4/16-frame atlas, 128px cells, supersampled 3x.
No reference artwork is extracted. Shapes expand, open and break apart.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math

ROOT = Path(__file__).resolve().parents[1]
CELL, AA = 128, 3
atlas = Image.new('RGB', (512,512))


def poly(draw, points, value):
    draw.polygon([(round(x*AA),round(y*AA)) for x,y in points],fill=value)


for frame in range(16):
    t=frame/15
    expand=.22+.78*(1-(1-min(1,t/.43))**3)
    radius=53*expand
    channels=[Image.new('L',(CELL*AA,CELL*AA)) for _ in range(3)]
    petals=ImageDraw.Draw(channels[0])
    for arm in range(4):
        angle=arm*math.pi/2+.15
        # Six deliberate corners make an asymmetric, broad hollow petal.
        shape=[(.12,0),(.38,-.28),(.77,-.33),(1,-.04),(.77,.27),(.38,.23)]
        coords=[(64+(x*math.cos(angle)-y*math.sin(angle))*radius,
                 64+(x*math.sin(angle)+y*math.cos(angle))*radius) for x,y in shape]
        cx=sum(p[0] for p in coords)/len(coords)
        cy=sum(p[1] for p in coords)/len(coords)
        poly(petals,coords,255)
        poly(petals,[(cx+(x-cx)*.92,cy+(y-cy)*.92) for x,y in coords],155)
        poly(petals,[(cx+(x-cx)*.61,cy+(y-cy)*.61) for x,y in coords],0)
        if t>.57:
            cut=(t-.57)/.43
            x=64+math.cos(angle)*radius*.61
            y=64+math.sin(angle)*radius*.61
            w=1+cut*15
            poly(petals,[(x-w,y-18),(x+w,y-12),(x+w*.4,y+18),(x-w*.6,y+12)],0)
    fans=ImageDraw.Draw(channels[1])
    outer=57*expand
    fans.ellipse(tuple(round(v*AA) for v in (64-outer,64-outer,64+outer,64+outer)),fill=35)
    for arm in range(8):
        a=arm*math.pi/4+t*.24
        sweep=.18 if arm%2 else .38
        points=[(64,64)]+[(64+math.cos(a+sweep*j/12)*outer,
                                         64+math.sin(a+sweep*j/12)*outer) for j in range(13)]
        poly(fans,points,145 if arm%2 else 190)
    inner=outer*(.3+t*.15)
    fans.ellipse(tuple(round(v*AA) for v in (64-inner,64-inner,64+inner,64+inner)),fill=0)
    # Four-point twinkle opens slightly over the sequence, then loses its centre.
    star=ImageDraw.Draw(channels[2]);points=[]
    for i in range(8):
        a=i*math.pi/4
        r=(43 if i%2==0 else 10)*(1-.22*t)
        points.append((64+math.cos(a)*r,64+math.sin(a)*r))
    poly(star,points,255)
    poly(star,[(64+(x-64)*.64,64+(y-64)*.64) for x,y in points],150)
    if t>.65:
        r=(t-.65)*44
        star.ellipse(tuple(round(v*AA) for v in (64-r,64-r,64+r,64+r)),fill=0)
    cell=Image.merge('RGB',[c.resize((CELL,CELL),Image.Resampling.LANCZOS) for c in channels])
    atlas.paste(cell,((frame%4)*CELL,(frame//4)*CELL))
atlas.save(ROOT/'assets/pnt/vfx/hammer-gloss-flipbook.png',optimize=True)
print('Baked 16-frame packed hammer petals / radial fans / sparkle masks.')
