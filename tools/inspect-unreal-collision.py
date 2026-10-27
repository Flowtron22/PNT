"""Inspect original collision primitives, without saving packages."""
import unreal,json
from pathlib import Path
out=Path('D:/Projects/PNT/PNT/PNT/.local/ue-gameplay');report=[]
for key,num,title in [('mall','01','Mall'),('sunken','02','Sunken'),('iceberg','03','Iceberg')]:
 unreal.EditorLoadingAndSavingUtils.load_map('/Game/_MyGame/Maps/Level_'+num+'_'+title)
 for actor in unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors():
  p=actor.get_actor_location()
  if abs(p.y)>5000 or abs(p.x)>6000:continue
  for c in actor.get_components_by_class(unreal.PrimitiveComponent):
   row={'map':key,'actor':actor.get_actor_label(),'type':c.get_class().get_name(),'name':c.get_name(),'enabled':str(c.get_collision_enabled()),'pawn':str(c.get_collision_response_to_channel(unreal.CollisionChannel.ECC_PAWN))}
   if isinstance(c,unreal.StaticMeshComponent):
    mesh=c.get_editor_property('static_mesh')
    if mesh:
     row['mesh']=mesh.get_path_name()
     try:
      body=mesh.get_editor_property('body_setup');row['body']=str(body);agg=body.get_editor_property('agg_geom');row['agg']=str(agg)
      for field in ['box_elems','sphere_elems','sphyl_elems','convex_elems']:
       try:row[field]=[str(x) for x in agg.get_editor_property(field)]
       except Exception as e:row[field]=str(e)
     except Exception as e:row['error']=str(e)
   report.append(row)
(out/'collision-inspection.json').write_text(json.dumps(report,indent=2));unreal.log('PNT_COLLISION_INSPECTION_DONE')

