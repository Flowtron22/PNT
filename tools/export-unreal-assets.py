"""Read-only source export. Run using UE 5.6 Python; never saves source packages."""
import unreal, json, hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/pnt'
OUT.mkdir(parents=True,exist_ok=True)
report={'source_project':'D:/Projects/PNT/PSX','exporter':'Unreal 5.6 GLTFExporter','licence_review':'pending; local prototype only','assets':[]}
options=unreal.GLTFExportOptions()
options.set_editor_property('export_uniform_scale',0.01)
options.set_editor_property('bake_material_inputs',unreal.GLTFMaterialBakeMode.SIMPLE)
options.set_editor_property('default_material_bake_size',unreal.GLTFMaterialBakeSize(x=512,y=512,auto_detect=False))
options.set_editor_property('export_lights',False)
options.set_editor_property('export_cameras',False)
options.set_editor_property('export_vertex_skin_weights',True)
options.set_editor_property('export_animation_sequences',True)
options.set_editor_property('export_preview_mesh',True)
options.set_editor_property('default_level_of_detail',0)

def export_glb(source,name,selected=None):
    obj=unreal.load_asset(source) if isinstance(source,str) else source
    if obj is None: raise RuntimeError('Missing source '+str(source))
    dest=OUT/(name+'.glb')
    result=unreal.GLTFExporter.export_to_gltf(obj,str(dest),options,set(selected or []))
    if not dest.exists() or dest.stat().st_size<100: raise RuntimeError('Export failed '+str(result))
    report['assets'].append({'file':dest.name,'source':obj.get_path_name(),'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
    (OUT/'asset-manifest.json').write_text(json.dumps(report,indent=2))
    unreal.log('PSX_WEB_EXPORTED '+dest.name+' '+str(dest.stat().st_size))

export_glb('/Game/Assets/3D/_char/_players/_runner/sk_rn_base','thief')
export_glb('/Game/Assets/3D/_char/_players/_chaser/sk_ch_base','police')
export_glb('/Game/Assets/3D/_char/_players/_anim/sk_chr_idleA','idle')
export_glb('/Game/Assets/3D/_char/_players/_anim/sk_chr_rn_runA','run')

# Keep a separate police-run FBX: the GLTF animation exporter produced frozen poses.
# The offline converter reads original FBX keys and targets the GLB skeleton axes.
(ROOT/'.local').mkdir(exist_ok=True)
task=unreal.AssetExportTask()
task.object=unreal.load_asset('/Game/Assets/3D/_char/_players/_anim/sk_chr_ch_runA')
task.filename=str(ROOT/'.local/police-run.fbx')
task.automated=True
task.prompt=False
task.replace_identical=True
task.exporter=unreal.AnimSequenceExporterFBX()
task.options=unreal.FbxExportOption()
if not unreal.Exporter.run_asset_export_task(task): raise RuntimeError('Police run FBX export failed')

(OUT/'costumes').mkdir(exist_ok=True)
for key,folder,mesh in [('boney','_cs_boneyM','sk_cs_boneyM'),('oyen','_cs_oyen','sk_cs_oyen'),('pingu','_cs_pingu','sk_cs_pingu'),('pumpkin','_cs_pumpking','sk_cs_pumpking'),('purple','_cs_purple','sk_cs_purple'),('racer','_cs_racer','sk_cs_racer'),('raptor','_cs_raptor','sk_cs_raptor')]:
    export_glb('/Game/Assets/3D/_char/_players/'+folder+'/'+mesh,'costumes/'+key)

(OUT/'portraits').mkdir(exist_ok=True)
texture_exports=[('/Game/_MyGame/Asset_UI/PNT_Logo','logo'),('/Game/_MyGame/Asset_UI/T_UI_HammerTime','hammer'),('/Game/_MyGame/Asset_UI/T_UI_BananaSkin','banana'),('/Game/_MyGame/Asset_UI/T_UI_Jetpack','rocket')]
texture_exports += [('/Game/_MyGame/Asset_UI/Costumes/'+name,'portraits/'+key) for key,name in [('thief','Costume_Thief'),('police','Costume_Police'),('oyen','Costume_Oyen'),('pingu','pingu_cap'),('pumpkin','pumpking_cap'),('boney','boneyM_cap'),('purple','arale_cap'),('racer','Costume_Racer'),('raptor','Costume_Raptor')]]
for source,name in texture_exports:
    task=unreal.AssetExportTask()
    task.object=unreal.load_asset(source)
    task.filename=str(OUT/(name+'.png'))
    task.automated=True
    task.prompt=False
    task.replace_identical=True
    if not unreal.Exporter.run_asset_export_task(task): raise RuntimeError('Texture export failed '+source)
    report['assets'].append({'file':name+'.png','source':source,'bytes':Path(task.filename).stat().st_size})

world=unreal.EditorLoadingAndSavingUtils.load_map('/Game/_MyGame/Maps/Level_01_Mall')
actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
selected=[]
for actor in actors:
    component=actor.get_component_by_class(unreal.StaticMeshComponent)
    mesh=component.get_editor_property('static_mesh') if component else None
    if not mesh: continue
    name=mesh.get_name().lower()
    position=actor.get_actor_location()
    if name=='sm_mainfloor' or (any(key in name for key in ['fountain','bench','bridge','tree_a','lamp']) and abs(position.x+350)<1600 and abs(position.y)<1600):
        selected.append(actor)
if not selected: raise RuntimeError('Mall selection was empty; refusing full-world export')
report['mall_selection']=[actor.get_actor_label() for actor in selected]
export_glb(world,'mall-slice',selected)
(OUT/'asset-manifest.json').write_text(json.dumps(report,indent=2))
unreal.log('PSX_WEB_EXPORT_COMPLETE')
