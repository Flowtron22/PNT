"""Read-only Unreal mechanics inspection and prepared web exports. Never saves packages."""
import unreal,json,re
from pathlib import Path
ROOT=Path('D:/Projects/PNT/PNT/PNT');SOURCE=Path('D:/Projects/PNT/PSX');OUT=ROOT/'.local/ue-gameplay';OUT.mkdir(parents=True,exist_ok=True)
report={'defaults':{},'levels':{},'skills':json.loads(unreal.DataTableFunctionLibrary.export_data_table_to_json_string(unreal.load_asset('/Game/_MyGame/DataTable/DT_Skills')))}
def vec(p):return [p.x,p.y,p.z]
def props(obj,names):
 d={}
 for name in names:
  try:d[name]=str(obj.get_editor_property(name))
  except:pass
 return d
paths=['/Game/_MyGame/Characters/BP_Player','/Game/_MyGame/Blueprints/BP_Jail','/Game/_MyGame/Blueprints/BP_SharedCamera','/Game/_MyGame/PhysicAsset/BP_Base_Money','/Game/_MyGame/PhysicAsset/BP_Money_Ship','/Game/AGameOfTagKit/Blueprints/Core/Gameplay/BP_GM_GameOfTag','/Game/AGameOfTagKit/Blueprints/Core/Gameplay/BP_GS_GameOfTag','/Game/_MyGame/Items/BP_ITEM_Rewind','/Game/_MyGame/Items/BP_ITEM_Gone_Jutsu','/Game/_MyGame/Items/BP_ITEM_Lickity_Split','/Game/_MyGame/Items/BP_AOE_HammerTime','/Game/_MyGame/Items/BP_AOE_PocketRocketman']
for path in paths:
 file=SOURCE/'Content'/(path[6:]+'.uasset');names=set(x.decode('ascii') for x in re.findall(rb'[A-Za-z_][A-Za-z_0-9 ]{2,100}',file.read_bytes()) if re.search(rb'money|steal|rescue|release|cooldown|time|duration|radius|speed|range|camera|rotation|rewind|smoke|capture|catch|stun|jail|win|delay|amount|rate|distance',x,re.I))
 cls=unreal.EditorAssetLibrary.load_blueprint_class(path)
 if cls:
  cdo=unreal.get_default_object(cls);report['defaults'][path]={'properties':props(cdo,names),'names':sorted(names),'components':[]}
  if isinstance(cdo,unreal.Actor):
   for c in cdo.get_components_by_class(unreal.ActorComponent):report['defaults'][path]['components'].append({'type':c.get_class().get_name(),'name':c.get_name(),'properties':props(c,['relative_rotation','relative_location','target_arm_length','ortho_width','projection_mode','max_walk_speed','capsule_radius','sphere_radius','box_extent','static_mesh','skeletal_mesh_asset'])})
for key,num,title in [('mall','01','Mall'),('sunken','02','Sunken'),('iceberg','03','Iceberg')]:
 world=unreal.EditorLoadingAndSavingUtils.load_map('/Game/_MyGame/Maps/Level_'+num+'_'+title)
 level=[]
 for a in unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors():
  entry={'label':a.get_actor_label(),'class':a.get_class().get_name(),'position':vec(a.get_actor_location()),'rotation':str(a.get_actor_rotation()),'props':props(a,['Money','MoneyAmount','MoneyLeft','TotalMoney','StealRate','StealTime','Amount','ReleaseCooldown','Cooldown','TimeLimit','GameTime','RoundTime','ReleaseCD','CaptureDuration','RescueTime']),'meshes':[]}
  for c in a.get_components_by_class(unreal.MeshComponent):
   entry['meshes'].append({'name':c.get_name(),'properties':props(c,['static_mesh','skeletal_mesh_asset','collision_enabled','visible']),'position':vec(c.get_world_location())})
  level.append(entry)
 report['levels'][key]=level
 (OUT/'audit.json').write_text(json.dumps(report,indent=2))
unreal.log('PNT_GAMEPLAY_AUDIT_COMPLETE')
