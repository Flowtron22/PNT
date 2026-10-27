"""Offline preview of the exported lightmap multiplied by the original colors."""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/pnt/arenas/mall-lit.glb'))
contact='--contact' in sys.argv
receivers=json.loads((ROOT/'assets/pnt/arenas/mall-contact-ao.json').read_text())['receivers'] if contact else []
light=bpy.data.images.load(str(ROOT/('assets/pnt/arenas/mall-contact-ao.png' if contact else 'assets/pnt/arenas/mall-lightmap.png')))
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
  if len(o.data.uv_layers)>1 and (not contact or o.name in receivers):
   uv=nodes.new('ShaderNodeUVMap');uv.uv_map=o.data.uv_layers[1].name;texture=nodes.new('ShaderNodeTexImage');texture.image=light;links.new(uv.outputs[0],texture.inputs['Vector']);links.new(texture.outputs['Color'],mix.inputs[2])
  else:mix.inputs[2].default_value=(1,1,1,1) if contact else (.75,.75,.75,1)
  links.new(mix.outputs[0],emission.inputs['Color']);output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');links.new(emission.outputs[0],output.inputs['Surface'])
data=json.loads((ROOT/'assets/pnt/arenas/mall.json').read_text());points=data['spawns']+[c['position'] for c in data['caches']]
x=(min(p[0] for p in points)+max(p[0] for p in points))/2+data['origin'][0];z=(min(p[2] for p in points)+max(p[2] for p in points))/2+data['origin'][2]
target=Vector((x,-z,data['origin'][1]+.5));camera_data=bpy.data.cameras.new('Preview');camera=bpy.data.objects.new('Preview',camera_data);bpy.context.collection.objects.link(camera)
camera.location=target+Vector((-22,0,37));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.ortho_scale=36
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES';scene.cycles.samples=8
scene.world.color=(.02,.02,.02);scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.filepath=str(ROOT/('.local/mall-contact-preview.png' if contact else '.local/mall-baked-preview.png'));bpy.ops.render.render(write_still=True)
