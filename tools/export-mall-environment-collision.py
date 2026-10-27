"""Read-only native Pawn sweeps with movable coffee furniture excluded.

Run `node tools/prepare-mall-navigation.mjs`, then run this through UE 5.6 Python
commandlet against the original project. The prepared grid excludes movable meshes.
Never saves UE packages.
"""
import unreal,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'assets/pnt/arenas'
unreal.EditorLoadingAndSavingUtils.load_map('/Game/_MyGame/Maps/Level_01_Mall')
world=unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
ignored=[a for a in actors if a.get_class().get_name().startswith(('BP_CoffeeChair','BP_CoffeeTable'))]
assert len(ignored)==15,'Unexpected furniture count'
nav=json.loads((ROOT/'.local/environment-audit/mall-static-nav.json').read_text())
meta=json.loads((out/'mall.json').read_text());origin=meta['origin'];nx=nav['nx'];nz=nav['nz'];step=nav['step'];heights=nav['heights'];blocked=[0]*len(heights);edges=[0]*len(heights)
def point(i):return unreal.Vector((nav['minX']+i%nx*step+origin[0])*100,(nav['minZ']+i//nx*step+origin[2])*100,(heights[i]+origin[1]+.84)*100)
def hit(a,b):return unreal.SystemLibrary.capsule_trace_single_by_profile(world,a,b,28,72,'Pawn',False,ignored,unreal.DrawDebugTrace.NONE,True) is not None
for i,h in enumerate(heights):
 if h is None:blocked[i]=1;continue
 p=point(i);blocked[i]=int(hit(p,p+unreal.Vector(.01,0,0)))
 if blocked[i]:
  for lift in [.1,.2,.3,.4,.45]:
   raised=p+unreal.Vector(0,0,lift*100)
   if not hit(raised,raised+unreal.Vector(.01,0,0)):heights[i]=round(h+lift,4);blocked[i]=0;break
for i,h in enumerate(heights):
 if blocked[i]:edges[i]=15;continue
 x=i%nx;z=i//nx
 for bit,dx,dz in [(1,1,0),(2,-1,0),(4,0,1),(8,0,-1)]:
  xx=x+dx;zz=z+dz;j=zz*nx+xx
  if xx<0 or zz<0 or xx>=nx or zz>=nz or blocked[j] or abs(heights[i]-heights[j])>.6:edges[i]|=bit
  else:
   a=point(i);b=point(j);floor=max(a.z,b.z);a.z=floor;b.z=floor
   if hit(a,b):edges[i]|=bit
result={'source':'Unreal 5.6 native Pawn capsule sweeps; 12 movable coffee chairs and 3 tables excluded for dynamic simulation','radius':.28,'halfHeight':.72,'nx':nx,'nz':nz,'step':step,'minX':nav['minX'],'minZ':nav['minZ'],'groundHeights':heights,'blocked':blocked,'edges':edges}
(out/'mall.nav.json').write_text(json.dumps(nav,separators=(',',':')))
(out/'mall.collision.json').write_text(json.dumps(result,separators=(',',':')))
unreal.log('PNT_DYNAMIC_MALL_COLLISION_EXPORTED')
