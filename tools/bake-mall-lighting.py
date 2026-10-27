"""Blender background bake. Reads exported Mall only; never opens Unreal files.
Run: blender --background --factory-startup --python tools/bake-mall-lighting.py
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/pnt/arenas'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'mall.glb'))
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=='MESH']
fixed=[o for o in meshes if not o.name.startswith(('BP_CoffeeChair','BP_CoffeeTable'))]
moving=[o for o in meshes if o not in fixed]
# Instances need independent lightmap coordinates, while names/transforms remain intact.
original={};material_indices={}
for o in meshes:
 o.data=o.data.copy();original[o.name]=list(o.data.materials);material_indices[o.name]=[p.material_index for p in o.data.polygons]
for o in moving:o.hide_render=True
bpy.ops.object.select_all(action='DESELECT')
for o in fixed:
 o.select_set(True);o.data.uv_layers.new(name='BakedLight');o.data.uv_layers.active_index=1
bpy.context.view_layer.objects.active=fixed[0]
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.003,area_weight=.5,scale_to_bounds=True)
bpy.ops.object.mode_set(mode='OBJECT')
image=bpy.data.images.new('Mall_BakedLight',width=2048,height=2048,alpha=False,float_buffer=True)
material=bpy.data.materials.new('Bake_White');material.use_nodes=True
nodes=material.node_tree.nodes;nodes.clear();links=material.node_tree.links
output=nodes.new('ShaderNodeOutputMaterial');diffuse=nodes.new('ShaderNodeBsdfDiffuse');diffuse.inputs['Roughness'].default_value=1
ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=1.6
mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX';mix.inputs[0].default_value=.65;mix.inputs[1].default_value=(1,1,1,1)
links.new(ao.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],diffuse.inputs['Color']);links.new(diffuse.outputs[0],output.inputs['Surface'])
texture=nodes.new('ShaderNodeTexImage');texture.image=image;nodes.active=texture
for o in fixed:
 for i in range(len(o.data.materials)):o.data.materials[i]=material
 if not o.data.materials:o.data.materials.append(material)
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.82,.9,1,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
sun_data=bpy.data.lights.new('Bake_Sun','SUN');sun_data.energy=1.5;sun_data.angle=math.radians(6)
sun=bpy.data.objects.new('Bake_Sun',sun_data);scene.collection.objects.link(sun)
sun.rotation_euler=Vector((-8,7,-16)).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.cycles.max_bounces=3;scene.cycles.diffuse_bounces=2
scene.render.bake.margin=8;scene.render.bake.use_clear=True
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
print('BAKE_START',len(fixed),'static objects',flush=True)
bpy.ops.object.bake(type='COMBINED')
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.image_settings.color_depth='8'
image.save_render(str(OUT/'mall-lightmap.png'),scene=scene)
for o in meshes:
 o.hide_render=False;o.data.materials.clear()
 for m in original[o.name]:o.data.materials.append(m)
 for polygon,index in zip(o.data.polygons,material_indices[o.name]):polygon.material_index=index
 o.data.uv_layers.active_index=0;o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'mall-lit.glb'),export_format='GLB',use_selection=True,export_texcoords=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
(OUT/'mall-lightmap.json').write_text(json.dumps({'resolution':2048,'staticMeshes':[o.name for o in fixed],'excludedMovableMeshes':[o.name for o in moving],'samples':48,'source':'mall.glb'},indent=2))
print('BAKE_DONE',flush=True)
