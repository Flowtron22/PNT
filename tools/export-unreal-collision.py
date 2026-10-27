"""Read-only export of pawn-blocking Unreal collision, including invisible blocking volumes."""
import unreal,json,math
from pathlib import Path
ROOT=Path('D:/Projects/PNT/PNT/PNT');out=ROOT/'.local/ue-gameplay/collision-primitives';out.mkdir(exist_ok=True);audit={}
def get(obj,key,default=None):
 try:return obj.get_editor_property(key)
 except:return default
def v(p,origin):return [round(p.x*.01-origin[0],5),round(p.z*.01-origin[1],5),round(p.y*.01-origin[2],5)]
for key,num,title in [('mall','01','Mall'),('sunken','02','Sunken'),('iceberg','03','Iceberg')]:
 unreal.EditorLoadingAndSavingUtils.load_map('/Game/_MyGame/Maps/Level_'+num+'_'+title);origin=json.loads((ROOT/'assets/psx/arenas'/(key+'.json')).read_text())['origin'];shapes=[];errors=[]
 for actor in unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors():
  loc=actor.get_actor_location()
  if abs(loc.y)>5000 or abs(loc.x)>6000 or 'lobby' in actor.get_actor_label().lower():continue
  for c in actor.get_components_by_class(unreal.PrimitiveComponent):
   if c.get_collision_enabled()==unreal.CollisionEnabled.NO_COLLISION or c.get_collision_response_to_channel(unreal.CollisionChannel.ECC_PAWN)!=unreal.CollisionResponseType.ECR_BLOCK:continue
   label=actor.get_actor_label()+':'+c.get_name();t=c.get_world_transform();body=None
   if isinstance(c,unreal.StaticMeshComponent):
    mesh=get(c,'static_mesh');body=get(mesh,'body_setup') if mesh else None
   elif isinstance(c,unreal.BrushComponent):body=get(c,'brush_body_setup')
   agg=get(body,'agg_geom') if body else None
   def add(points,kind):
    if len(points)>3:shapes.append({'source':label,'kind':kind,'vertices':[v(p,origin) for p in points]})
   def point(p):return unreal.MathLibrary.transform_location(t,p)
   if agg:
    for elem in get(agg,'box_elems',[]):
     center=get(elem,'center');rot=get(elem,'rotation');half=[get(elem,'x',0)/2,get(elem,'y',0)/2,get(elem,'z',0)/2];et=unreal.Transform(location=center,rotation=rot)
     add([point(unreal.MathLibrary.transform_location(et,unreal.Vector(x*half[0],y*half[1],z*half[2]))) for x in [-1,1] for y in [-1,1] for z in [-1,1]],'box')
    for elem in get(agg,'convex_elems',[]):
     verts=get(elem,'vertex_data')
     if verts:add([point(p) for p in verts],'convex')
     else:errors.append(label+': convex vertices not exposed')
    for elem in get(agg,'sphere_elems',[]):
     center=get(elem,'center');radius=get(elem,'radius',0)
     add([point(center+unreal.Vector(math.sin(p)*math.cos(a)*radius,math.sin(p)*math.sin(a)*radius,math.cos(p)*radius)) for p in [i*math.pi/8 for i in range(9)] for a in [i*math.pi/6 for i in range(12)]],'sphere')
   if isinstance(c,unreal.BoxComponent):
    half=c.get_unscaled_box_extent();add([point(unreal.Vector(x*half.x,y*half.y,z*half.z)) for x in [-1,1] for y in [-1,1] for z in [-1,1]],'box-component')
   elif isinstance(c,unreal.BrushComponent) and not agg:
    center,extent=actor.get_actor_bounds(False);add([center+unreal.Vector(x*extent.x,y*extent.y,z*extent.z) for x in [-1,1] for y in [-1,1] for z in [-1,1]],'volume-bounds')
 (out/(key+'.collision-source.json')).write_text(json.dumps({'map':key,'shapes':shapes,'errors':errors},separators=(',',':')));audit[key]={'shapes':len(shapes),'errors':errors}
(ROOT/'.local/ue-gameplay/collision-export.json').write_text(json.dumps(audit,indent=2));unreal.log('PNT_COLLISION_EXPORTED '+str(audit))
