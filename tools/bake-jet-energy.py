"""Author a deterministic packed 16-frame VFX atlas and tileable flow noise.

Pillow only. R = thrust, G = broken shock ring, B = ignition burst.
Each 128px cell has an 8px safe border. Frames run left-right, top-bottom.
These are original shape animations, not extracted reference artwork.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math
import random

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/pnt/vfx'
CELL, AA = 128, 3


def polygon(draw, points, value):
    draw.polygon([(round(x*AA), round(y*AA)) for x, y in points], fill=value)


atlas = Image.new('RGB', (CELL*4, CELL*4))
for frame in range(16):
    t = frame / 15
    channels = [Image.new('L', (CELL*AA, CELL*AA)) for _ in range(3)]
    # Tapered exhaust tears into separately moving tongues, then erodes away.
    draw = ImageDraw.Draw(channels[0])
    for side in [-1, 1]:
        sway = math.sin(t*7+side)*6
        tail = 108-t*30
        polygon(draw, [(64, 12), (64+side*26, 28), (64+side*18, 47),
                       (64+side*30+sway, 62), (64+side*11+sway, tail),
                       (64+side*3, 78-t*18), (64-side*5, 45)], 170)
    polygon(draw, [(64, 13), (78, 32), (71, 49), (77, 59),
                   (63+math.sin(t*8)*4, 96-t*29), (57, 59), (50, 39)], 225)
    polygon(draw, [(63, 15), (69, 34), (64, 66-t*18), (58, 34)], 255)
    if t > .45:
        for k in range(4):
            y = 50+k*13-t*12
            x = 65+math.sin(k*5+t*8)*13
            polygon(draw, [(x-12, y), (x+12, y-4), (x+8, y+3), (x-8, y+7)], 0)
    # Uneven expanding rings: broad arcs, narrow inner edge and deliberate gaps.
    draw = ImageDraw.Draw(channels[1])
    radius = 17+36*(1-(1-t)**2)
    width = 9*(1-t)+1.2
    for start, end in [(12, 104), (124, 201), (229, 292), (313, 345)]:
        points = []
        for sign, angles in [(1, range(start, end+1, 3)), (-1, range(end, start-1, -3))]:
            for a in angles:
                angle = math.radians(a+t*55)
                r = radius+sign*width*.5+math.sin(angle*5+t*4)*2
                points.append((64+math.cos(angle)*r, 64+math.sin(angle)*r))
        polygon(draw, points, 195)
    # A short angular white-hot star which breaks into wedges as it expands.
    draw = ImageDraw.Draw(channels[2])
    points = []
    for i in range(12):
        angle = i*math.pi/6+.17
        r = (45 if i % 2 == 0 else 12)*(0.6+0.4*math.sin(min(1,t*2)*math.pi/2))
        points.append((64+math.cos(angle)*r, 64+math.sin(angle)*r))
    polygon(draw, points, 210)
    polygon(draw, [(64,29),(72,55),(89,62),(72,69),(64,91),(58,70),(36,63),(57,56)],255)
    if t > .3:
        radius = (t-.3)*58
        draw.ellipse(tuple(round(v*AA) for v in (64-radius,64-radius,64+radius,64+radius)),fill=0)
    channels = [c.resize((CELL,CELL),Image.Resampling.LANCZOS) for c in channels]
    atlas.paste(Image.merge('RGB',channels),((frame%4)*CELL,(frame//4)*CELL))
atlas.save(OUT/'jet-energy-flipbook.png',optimize=True)

# Periodic Fourier noise: independently seeded RG vector field plus B erosion.
rng = random.Random(1402)
waves = [[(rng.randint(1,5),rng.randint(1,5),rng.random()*math.tau,1/(k+1))
          for k in range(6)] for _ in range(3)]
noise = Image.new('RGB',(128,128))
pixels = noise.load()
for y in range(128):
    for x in range(128):
        values=[]
        for channel in waves:
            value=sum(math.sin(math.tau*(a*x+b*y)/128+phase)*amp for a,b,phase,amp in channel)
            values.append(round(127.5+value/sum(w[3] for w in channel)*115))
        pixels[x,y]=tuple(values)
noise.save(OUT/'jet-energy-noise.png',optimize=True)
print('Baked packed 512x512 flipbook and tileable 128x128 flow/erosion noise.')
