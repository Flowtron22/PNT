"""Blender: bake floor-only AO and UV1 for Sunken/Iceberg, keeping originals."""
import bpy,math,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/pnt/arenas'
name=sys.argv[sys.argv.index('--')+1]
receiver_names={'sunken':{'SunkenShip'},'iceberg':{'sm_ib_icefloor'}}[name]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/(name+'.glb')))
scene=bpy.context.scene;meshes=[o for o in scene.objects if o.type=='MESH']
receivers=[o for o in meshes if o.name in receiver_names]
assert len(receivers)==len(receiver_names),'Missing receiver'
original={};indices={}
bpy.ops.object.select_all(action='DESELECT')
for o in receivers:
 o.data=o.data.copy();original[o.name]=list(o.data.materials);indices[o.name]=[p.material_index for p in o.data.polygons]
 o.data.uv_layers.new(name='GroundContact');o.data.uv_layers.active_index=1;o.select_set(True)
bpy.context.view_layer.objects.active=receivers[0]
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.003,area_weight=.5,scale_to_bounds=True)
bpy.ops.object.mode_set(mode='OBJECT')
# Hide water and collision-only scenery from AO rays, not from the export.
for o in meshes:
 if o.name in {'waterplane','ucx','sm_ib_frozendeep'}:o.hide_render=True
image=bpy.data.images.new(name+'_GroundContact',width=2048,height=2048,alpha=False)
image.generated_color=(1,1,1,1);image.colorspace_settings.name='Non-Color'
material=bpy.data.materials.new('GroundContactBake');material.use_nodes=True
nodes=material.node_tree.nodes;nodes.clear();links=material.node_tree.links
output=nodes.new('ShaderNodeOutputMaterial');emission=nodes.new('ShaderNodeEmission');links.new(emission.outputs[0],output.inputs['Surface'])
ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.4
geometry=nodes.new('ShaderNodeNewGeometry');separate=nodes.new('ShaderNodeSeparateXYZ');links.new(geometry.outputs['Normal'],separate.inputs[0])
up=nodes.new('ShaderNodeMath');up.operation='GREATER_THAN';up.inputs[1].default_value=.8;links.new(separate.outputs['Z'],up.inputs[0])
strength=nodes.new('ShaderNodeMath');strength.operation='MULTIPLY';strength.inputs[1].default_value=.65;links.new(up.outputs[0],strength.inputs[0])
mix=nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(1,1,1,1);links.new(strength.outputs[0],mix.inputs[0]);links.new(ao.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],emission.inputs['Color'])
texture=nodes.new('ShaderNodeTexImage');texture.image=image;nodes.active=texture
for o in receivers:
 for i in range(len(o.data.materials)):o.data.materials[i]=material
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.bake.margin=8;scene.render.bake.use_clear=False
print('CONTACT_START',name,flush=True);bpy.ops.object.bake(type='EMIT')
image.filepath_raw=str(OUT/(name+'-contact-ao.png'));image.file_format='PNG';image.save()
for o in receivers:
 o.data.materials.clear()
 for m in original[o.name]:o.data.materials.append(m)
 for p,index in zip(o.data.polygons,indices[o.name]):p.material_index=index
 o.data.uv_layers.active_index=0
for o in scene.objects:o.hide_render=False;o.select_set(o.type in {'MESH','EMPTY','ARMATURE'})
bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'-lit.glb')),export_format='GLB',use_selection=True,export_texcoords=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
(OUT/(name+'-contact-ao.json')).write_text(json.dumps({'radius':.4,'strength':.65,'upwardNormalThreshold':.8,'receivers':sorted(receiver_names),'resolution':2048,'type':'floor contact AO only'},indent=2))
print('CONTACT_DONE',name,flush=True)
