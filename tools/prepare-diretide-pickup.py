"""Convert the supplied burger FBX to a centred, embedded-texture runtime GLB."""
import bpy,math,shutil,os
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];SOURCE=Path(os.environ.get('PNT_DIRETIDE_PICKUP_SOURCE',r'F:\PROJECTS\PS_3D\Assets\3D\01_Maps\Diretide'))
OUT=ROOT/'assets/pnt/props';OUT.mkdir(parents=True,exist_ok=True);(ROOT/'.local').mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.fbx(filepath=str(SOURCE/'sm_krabbypatty.fbx'),use_anim=False)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert meshes,'No burger mesh'
points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box];low=Vector([min(p[i] for p in points) for i in range(3)]);high=Vector([max(p[i] for p in points) for i in range(3)]);center=(low+high)/2;scale=2/max(high.x-low.x,high.y-low.y)
worlds={o:o.matrix_world.copy() for o in meshes}
for o in meshes:
 o.parent=None;o.matrix_world=Matrix.Scale(scale,4)@Matrix.Translation(-center)@worlds[o]
 for material in o.data.materials:
  if not material or not material.use_nodes:continue
  shader=material.node_tree.nodes.get('Principled BSDF')
  if shader:
   for name,value in [('Metallic',0),('Roughness',.85),('Alpha',1)]:
    socket=shader.inputs[name]
    for link in list(socket.links):material.node_tree.links.remove(link)
    socket.default_value=value
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'krabbypatty.glb'),export_format='GLB',use_selection=True,export_animations=False)
shutil.copyfile(SOURCE/'ui_krabbypatty.png',ROOT/'assets/pnt/ui/krabbypatty.png')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('PreviewWorld');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.28,.35,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
bpy.ops.object.light_add(type='AREA',location=(-3,-4,6));bpy.context.object.data.energy=600;bpy.context.object.data.size=5
bpy.ops.object.camera_add(location=(3,-4,3));camera=bpy.context.object;camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=3;scene.camera=camera;scene.view_settings.view_transform='Standard';scene.render.filepath=str(ROOT/'.local/krabbypatty-preview.png');bpy.ops.render.render(write_still=True)
print('BURGER_READY',len(meshes),flush=True)
