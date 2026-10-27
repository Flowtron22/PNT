"""Read-only export of all three gameplay arenas, original cache placements, and tools."""
import unreal,json,re,statistics
from pathlib import Path
ROOT=Path('D:/Projects/PNT/PNT/PNT');SOURCE=Path('D:/Projects/PNT/PSX');OUT=ROOT/'assets/psx';LOCAL=ROOT/'.local/ue-gameplay'
audit=json.loads((LOCAL/'audit.json').read_text())
base=SOURCE/'Content/AGameOfTagKit/Blueprints/BP_GameOfTagCharacter.uasset'
names=set(s.decode('ascii') for s in re.findall(rb'[A-Za-z_][A-Za-z_0-9 ]{2,100}',base.read_bytes()))
for path in ['/Game/AGameOfTagKit/Blueprints/BP_GameOfTagCharacter','/Game/_MyGame/PhysicAsset/BP_Base_Money','/Game/_MyGame/Blueprints/BP_Jail']:
 cls=unreal.EditorAssetLibrary.load_blueprint_class(path);obj=unreal.get_default_object(cls);d={}
 for name in names:
  if re.search('money|harvest|captur|release|delay|time|range|rate|cooldown|radius',name,re.I):
   try:d[name]=str(obj.get_editor_property(name))
   except:pass
 audit['defaults'][path]={'properties':d}
(LOCAL/'audit.json').write_text(json.dumps(audit,indent=2))
options=unreal.GLTFExportOptions();options.export_uniform_scale=.01;options.bake_material_inputs=unreal.GLTFMaterialBakeMode.SIMPLE;options.default_material_bake_size=unreal.GLTFMaterialBakeSize(x=512,y=512,auto_detect=False);options.export_lights=False;options.export_cameras=False
(OUT/'arenas').mkdir(exist_ok=True);(OUT/'props').mkdir(exist_ok=True)
def export(obj,dest,selected=[]):
 result=unreal.GLTFExporter.export_to_gltf(obj,str(dest),options,set(selected))
 if not dest.exists():raise RuntimeError('Export failed '+str(dest)+' '+str(result))
 unreal.log('PNT_EXPORTED '+dest.name+' '+str(dest.stat().st_size))
for source,name in [('/Game/_MyGame/Asset_UI/T_UI_SmokeBomb','smoke'),('/Game/_MyGame/Asset_UI/T_UI_RewindBox','rewind')]:
 task=unreal.AssetExportTask();task.object=unreal.load_asset(source);task.filename=str(OUT/(name+'.png'));task.automated=True;task.prompt=False;task.replace_identical=True
 if not unreal.Exporter.run_asset_export_task(task):raise RuntimeError(source)
meshes={}
for key,num,title in [('mall','01','Mall'),('sunken','02','Sunken'),('iceberg','03','Iceberg')]:
 world=unreal.EditorLoadingAndSavingUtils.load_map('/Game/_MyGame/Maps/Level_'+num+'_'+title);actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
 selected=[]
 for a in actors:
  p=a.get_actor_location()
  if abs(p.y)>5000 or abs(p.x)>6000 or ('lobby' in a.get_actor_label().lower()):continue
  if abs(p.z-(3900 if key=='mall' else 16000))>3000:continue
  components=a.get_components_by_class(unreal.MeshComponent)
  if not components:continue
  if any(x in a.get_class().get_name().lower() for x in ['sky','atmosphere','cloud','fog']):continue
  selected.append(a)
  for c in components:
   for prop in ['static_mesh','skeletal_mesh_asset']:
    try:
     m=c.get_editor_property(prop)
     if m and any(x in m.get_name().lower() for x in ['bomb','rewind','banana','rocket','jetpack','hammer','atm']):meshes[m.get_name()]=m
    except:pass
 if not selected:raise RuntimeError('Empty '+key)
 export(world,OUT/'arenas'/(key+'.glb'),selected)
 entries=audit['levels'][key];starts=[a for a in entries if a['class']=='PlayerStart' and 'game' in a['label'].lower()];caches=[a for a in entries if 'money' in a['class'].lower()]
 origin=[statistics.mean(a['position'][i] for a in starts) for i in range(3)];origin[2]-=89
 def point(p):return [round((p[0]-origin[0])*.01,4),round((p[2]-origin[2])*.01,4),round((p[1]-origin[1])*.01,4)]
 meta={'id':key,'origin':[origin[0]*.01,origin[2]*.01,origin[1]*.01],'spawns':[point(a['position']) for a in starts],'caches':[{'id':key+'-'+str(i),'position':point(a['position']),'amount':int(a['props'].get('TotalMoney','2000'))} for i,a in enumerate(caches)],'source':'/Game/_MyGame/Maps/Level_'+num+'_'+title,'selected':[a.get_actor_label() for a in selected]}
 (OUT/'arenas'/(key+'.json')).write_text(json.dumps(meta,indent=2))
for folder in ['smokebomb','banana','hammer','jetpack']:
 for assetpath in unreal.EditorAssetLibrary.list_assets('/Game/Assets/3D/_props/_tools/'+folder,recursive=True):
  obj=unreal.load_asset(assetpath)
  if isinstance(obj,unreal.StaticMesh):meshes[obj.get_name()]=obj
for name,obj in meshes.items():export(obj,OUT/'props'/(name+'.glb'))
for key,path in [('rewind','/Game/_MyGame/Items/BP_ITEM_Rewind')]:
 cls=unreal.EditorAssetLibrary.load_blueprint_class(path);actor=unreal.get_editor_subsystem(unreal.EditorActorSubsystem).spawn_actor_from_class(cls,unreal.Vector(0,0,0))
 for c in actor.get_components_by_class(unreal.StaticMeshComponent):
  mesh=c.get_editor_property('static_mesh')
  if mesh:export(mesh,OUT/'props'/(key+'.glb'))
 unreal.get_editor_subsystem(unreal.EditorActorSubsystem).destroy_actor(actor)
export(unreal.load_asset('/Game/Assets/3D/_props/_tools/jetpack/SM_TL_Jetpack'),OUT/'props/jetpack.glb')
unreal.log('PNT_GAMEPLAY_EXPORT_COMPLETE')
