"""Offline preview of the exported lightmap multiplied by the original colors."""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
arena=next((arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--arena=')),'mall')
bpy.ops.import_scene.gltf(filepath=str(ROOT/f'assets/pnt/arenas/{arena}-lit.glb'))
contact='--contact' in sys.argv
receivers=json.loads((ROOT/f'assets/pnt/arenas/{arena}-contact-ao.json').read_text())['receivers'] if contact else []
light=bpy.data.images.load(str(ROOT/(f'assets/pnt/arenas/{arena}-contact-ao.png' if contact else 'assets/pnt/arenas/mall-lightmap.png')))
if contact:light.colorspace_settings.name='Non-Color'
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 for slot in o.material_slots:
  if not slot.material:continue
  material=slot.material.copy();slot.material=material;material.use_nodes=True;nodes=material.node_tree.nodes;links=material.node_tree.links
  bsdf=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
  if not bsdf:continue
  emission=nodes.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=1.6
  base=bsdf.inputs['Base Color'];mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
  if base.is_linked:links.new(base.links[0].from_socket,mix.inputs[1])
  else:mix.inputs[1].default_value=base.default_value
  # Preserve glTF emissive floors (Iceberg) and invisible collision materials.
  emitted=bsdf.inputs.get('Emission Color')
  emission_strength=bsdf.inputs.get('Emission Strength')
  if emitted and (not emission_strength or emission_strength.default_value>0) and (emitted.is_linked or max(emitted.default_value[:3])>0):
   add=nodes.new('ShaderNodeMixRGB');add.blend_type='ADD';add.inputs[0].default_value=1
   if base.is_linked:links.new(base.links[0].from_socket,add.inputs[1])
   else:add.inputs[1].default_value=base.default_value
   if emitted.is_linked:links.new(emitted.links[0].from_socket,add.inputs[2])
   else:add.inputs[2].default_value=emitted.default_value
   links.new(add.outputs[0],mix.inputs[1])
  if len(o.data.uv_layers)>1 and (not contact or o.name in receivers):
   uv=nodes.new('ShaderNodeUVMap');uv.uv_map=o.data.uv_layers[1].name;texture=nodes.new('ShaderNodeTexImage');texture.image=light;links.new(uv.outputs[0],texture.inputs['Vector'])
   if contact:
    contrast=nodes.new('ShaderNodeMath');contrast.operation='POWER';contrast.inputs[1].default_value=2.3;links.new(texture.outputs['Color'],contrast.inputs[0]);links.new(contrast.outputs[0],mix.inputs[2])
   else:links.new(texture.outputs['Color'],mix.inputs[2])
  else:mix.inputs[2].default_value=(1,1,1,1) if contact else (.75,.75,.75,1)
  links.new(mix.outputs[0],emission.inputs['Color']);output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');alpha=bsdf.inputs['Alpha']
  if alpha.is_linked or alpha.default_value<.999:
   transparent=nodes.new('ShaderNodeBsdfTransparent');surface=nodes.new('ShaderNodeMixShader');links.new(transparent.outputs[0],surface.inputs[1]);links.new(emission.outputs[0],surface.inputs[2])
   if alpha.is_linked:links.new(alpha.links[0].from_socket,surface.inputs[0])
   else:surface.inputs[0].default_value=alpha.default_value
   links.new(surface.outputs[0],output.inputs['Surface'])
  else:links.new(emission.outputs[0],output.inputs['Surface'])
data=json.loads((ROOT/f'assets/pnt/arenas/{arena}.json').read_text());points=data['spawns']+[c['position'] for c in data['caches']]
x=(min(p[0] for p in points)+max(p[0] for p in points))/2+data['origin'][0];z=(min(p[2] for p in points)+max(p[2] for p in points))/2+data['origin'][2]
target=Vector((x,-z,data['origin'][1]+.5));camera_data=bpy.data.cameras.new('Preview');camera=bpy.data.objects.new('Preview',camera_data);bpy.context.collection.objects.link(camera)
camera.location=target+Vector((-22,0,37));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.ortho_scale=36
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES';scene.cycles.samples=8
scene.world.color=(.02,.02,.02);scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.filepath=str(ROOT/(f'.local/{arena}-contact-preview.png' if contact else '.local/mall-baked-preview.png'));bpy.ops.render.render(write_still=True)
