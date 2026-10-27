"""Bake only short-range contact AO on Mall floor receivers, using existing UV1."""
import bpy,math,re,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/pnt/arenas'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'mall-lit.glb'))
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=='MESH']
receivers=[o for o in meshes if re.match(r'^(sm_mainfloor|sm_boutiqeuA_floor|sm_cafeA_floor|sm_cafeB_floor|SM_bridge2)$',o.name)]
for o in meshes:o.hide_render=o.name.startswith(('BP_CoffeeChair','BP_CoffeeTable'))
image=bpy.data.images.new('Mall_GroundContact',width=2048,height=2048,alpha=False)
image.generated_color=(1,1,1,1);image.colorspace_settings.name='Non-Color'
material=bpy.data.materials.new('Contact_AO');material.use_nodes=True
nodes=material.node_tree.nodes;nodes.clear();links=material.node_tree.links
output=nodes.new('ShaderNodeOutputMaterial');emission=nodes.new('ShaderNodeEmission');links.new(emission.outputs[0],output.inputs['Surface'])
ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.4
geometry=nodes.new('ShaderNodeNewGeometry');separate=nodes.new('ShaderNodeSeparateXYZ');links.new(geometry.outputs['Normal'],separate.inputs[0])
up=nodes.new('ShaderNodeMath');up.operation='GREATER_THAN';up.inputs[1].default_value=.8;links.new(separate.outputs['Z'],up.inputs[0])
strength=nodes.new('ShaderNodeMath');strength.operation='MULTIPLY';strength.inputs[1].default_value=.65;links.new(up.outputs[0],strength.inputs[0])
mix=nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(1,1,1,1);links.new(strength.outputs[0],mix.inputs[0]);links.new(ao.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],emission.inputs['Color'])
texture=nodes.new('ShaderNodeTexImage');texture.image=image;nodes.active=texture
bpy.ops.object.select_all(action='DESELECT')
for o in receivers:
 o.select_set(True);o.data.uv_layers.active_index=1
 for i in range(len(o.data.materials)):o.data.materials[i]=material
bpy.context.view_layer.objects.active=receivers[0]
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.bake.margin=8;scene.render.bake.use_clear=False
print('CONTACT_BAKE_START',[o.name for o in receivers],flush=True)
bpy.ops.object.bake(type='EMIT')
image.filepath_raw=str(OUT/'mall-contact-ao.png');image.file_format='PNG';image.save()
(OUT/'mall-contact-ao.json').write_text(json.dumps({'radius':.4,'strength':.65,'upwardNormalThreshold':.8,'receivers':[o.name for o in receivers],'resolution':2048,'type':'floor contact AO only'},indent=2))
print('CONTACT_BAKE_DONE',flush=True)
