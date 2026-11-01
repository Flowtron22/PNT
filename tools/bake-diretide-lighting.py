"""Bake Grassfield floor contact AO using the same recipe as Mall."""
import bpy,math,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/pnt/arenas'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/'grassfield.glb'))
scene=bpy.context.scene;meshes=[o for o in scene.objects if o.type=='MESH']
receivers=[o for o in meshes if any(s in o.name for s in ['bgr_grassfield_top','ground_plane','bgr_island_brawl_ball_left'])]
assert len(receivers)==3,[o.name for o in receivers]
original={};bpy.ops.object.select_all(action='DESELECT')
for o in receivers:
 o.data=o.data.copy();original[o.name]=(list(o.data.materials),[p.material_index for p in o.data.polygons]);o.data.uv_layers.new(name='GroundContact');o.data.uv_layers.active_index=1;o.select_set(True)
bpy.context.view_layer.objects.active=receivers[0];bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.003,area_weight=.5,scale_to_bounds=True);bpy.ops.object.mode_set(mode='OBJECT')
image=bpy.data.images.new('Grassfield_GroundContact',width=2048,height=2048,alpha=False);image.generated_color=(1,1,1,1);image.colorspace_settings.name='Non-Color'
material=bpy.data.materials.new('FloorContactAO');material.use_nodes=True;nodes=material.node_tree.nodes;nodes.clear();links=material.node_tree.links
output=nodes.new('ShaderNodeOutputMaterial');emission=nodes.new('ShaderNodeEmission');links.new(emission.outputs[0],output.inputs['Surface'])
ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.4
geometry=nodes.new('ShaderNodeNewGeometry');separate=nodes.new('ShaderNodeSeparateXYZ');links.new(geometry.outputs['True Normal'],separate.inputs[0]);links.new(geometry.outputs['True Normal'],ao.inputs['Normal'])
up=nodes.new('ShaderNodeMath');up.operation='GREATER_THAN';up.inputs[1].default_value=.8;links.new(separate.outputs['Z'],up.inputs[0])
strength=nodes.new('ShaderNodeMath');strength.operation='MULTIPLY';strength.inputs[1].default_value=.65;links.new(up.outputs[0],strength.inputs[0])
mix=nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(1,1,1,1);links.new(strength.outputs[0],mix.inputs[0]);links.new(ao.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],emission.inputs['Color'])
texture=nodes.new('ShaderNodeTexImage');texture.image=image;nodes.active=texture
for o in receivers:
 for i in range(len(o.data.materials)):o.data.materials[i]=material
# A temporary joined receiver avoids separate full-image passes; scenery remains
# an occluder with its original materials and is never baked or re-unwrapped.
proxies=[]
for o in receivers:
 p=o.copy();p.data=o.data.copy();scene.collection.objects.link(p);proxies.append(p);o.hide_render=True;o.select_set(False);p.select_set(True)
bpy.context.view_layer.objects.active=proxies[0];bpy.ops.object.join();proxy=bpy.context.view_layer.objects.active
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.bake.margin=8;scene.render.bake.use_clear=False
print('CONTACT_START',[o.name for o in receivers],flush=True);bpy.ops.object.bake(type='EMIT')
image.filepath_raw=str(OUT/'grassfield-contact-ao.png');image.file_format='PNG';image.save();bpy.data.objects.remove(proxy,do_unlink=True)
for o in receivers:
 o.hide_render=False;mats,indices=original[o.name];o.data.materials.clear()
 for m in mats:o.data.materials.append(m)
 for p,index in zip(o.data.polygons,indices):p.material_index=index
 o.data.uv_layers.active_index=0
for o in meshes:
 if o.data.uv_layers:o.data.uv_layers[0].active_render=True
 o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'grassfield-lit.glb'),export_format='GLB',use_selection=True,export_texcoords=True,export_cameras=False,export_lights=False)
(OUT/'grassfield-contact-ao.json').write_text(json.dumps({'radius':.4,'strength':.65,'upwardNormalThreshold':.8,'receivers':[o.name for o in receivers],'resolution':2048,'samples':24,'type':'floor contact AO only','source':'grassfield.glb'},indent=2))
print('CONTACT_DONE',flush=True)
