"""Prepare source FBXs without changing them; Blender 5.2 background script."""
import bpy, math, json, os, shutil, sys
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(os.environ.get('PNT_DIRETIDE_SOURCE',r'F:\PROJECTS\PS_3D\Assets\3D\01_Maps\Diretide\grassfield'))
(ROOT/'.local').mkdir(exist_ok=True)
OUT=ROOT/'assets/pnt/arenas'; OUT.mkdir(parents=True,exist_ok=True)
def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)
def material(texture):
 m=bpy.data.materials.new('Diretide atlas');m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.85
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(SOURCE/texture));m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);return m
def apply_material(meshes,mat):
 for o in meshes:
  o.data.materials.clear();o.data.materials.append(mat)
  for p in o.data.polygons:p.material_index=0

def render(path,target,location,ortho):
 for old in list(bpy.context.scene.objects):
  if old.type in ['LIGHT','CAMERA']:bpy.data.objects.remove(old,do_unlink=True)
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
 scene.render.resolution_x=1000;scene.render.resolution_y=760;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.28,.32,.42,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
 bpy.ops.object.light_add(type='AREA',location=(0,-8,25));bpy.context.object.data.energy=5000;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=20
 bpy.ops.object.camera_add(location=location);cam=bpy.context.object;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=ortho;scene.camera=cam
 scene.view_settings.view_transform='Standard';scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
if '--boss-only' not in sys.argv:
 reset();bpy.ops.import_scene.fbx(filepath=str(SOURCE/'grassfield.fbx'),use_anim=False)
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 # The authored ground faces -Y after FBX import. -90 degrees about X makes it +Z.
 transform=Matrix.Translation(Vector((-10.5,16.55,0))) @ Matrix.Rotation(-math.pi/2,4,'X')
 worlds={o:o.matrix_world.copy() for o in meshes}
 for o in meshes:o.parent=None;o.matrix_world=transform@worlds[o]
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
 apply_material(meshes,material('bgr_grassfield_beach_tex.png'));bpy.context.view_layer.update()
 # Sample the central grass field; solids above it are blocked, never traversed as roofs.
 deps=bpy.context.evaluated_depsgraph_get();trees=[(o,BVHTree.FromObject(o,deps)) for o in meshes]
 step=.4;minx=-9;minz=-14;nx=46;nz=71;heights=[];blocked=[]
 for iz in range(nz):
  for ix in range(nx):
   x=minx+ix*step;z=minz+iz*step;hits=[]
   for o,tree in trees:
    inv=o.matrix_world.inverted();p=inv@Vector((x,-z,20));d=(inv.to_3x3()@Vector((0,0,-1))).normalized();hit,n,idx,dist=tree.ray_cast(p,d,60)
    if hit is not None:
     w=o.matrix_world@hit;normal=(o.matrix_world.to_3x3().inverted().transposed()@n).normalized()
     if normal.z>.4:hits.append((w.z,o.name))
   tops=sorted(hits,reverse=True);floor=[h for h,n in tops if 'grassfield_top' in n or 'ground_plane' in n or 'brawl_ball_left' in n]
   y=max(floor) if floor else None;heights.append(round(y,4) if y is not None else None);blocked.append(1 if y is None or tops and tops[0][0]>y+.48 else 0)
 def near(x,z):
  choices=[(minx+i%nx*step,minz+i//nx*step,h) for i,h in enumerate(heights) if h is not None and not blocked[i]]
  a,b,h=min(choices,key=lambda p:(p[0]-x)**2+(p[1]-z)**2);return [round(a,3),h,round(b,3)]
 spawns=[near(-6,-10),near(6,-10),near(6,10),near(-6,10)]
 wells=[{'id':i,'owner':i,'position':near(x,z)} for i,(x,z) in enumerate([(-6,-11),(6,-11),(6,11),(-6,11)])]
 caches=[{'id':i,'position':near(x,z),'amount':40} for i,(x,z) in enumerate([(-3,-4),(3,-4),(3,4),(-3,4)])]
 meta={'id':'grassfield','name':'GRASSFIELD','origin':[0,0,0],'spawns':spawns,'wells':wells,'caches':caches,'bossSpawn':near(0,0)}
 meta['candySpawns']=[[round(minx+ix*step,3),heights[iz*nx+ix],round(minz+iz*step,3)] for iz in range(3,nz-3,3) for ix in range(3,nx-3,3) if heights[iz*nx+ix] is not None and not blocked[iz*nx+ix] and all(math.hypot(minx+ix*step-w['position'][0],minz+iz*step-w['position'][2])>=2.2 for w in wells)]
 (OUT/'grassfield.json').write_text(json.dumps(meta))
 (OUT/'grassfield.nav.json').write_text(json.dumps({'nx':nx,'nz':nz,'step':step,'minX':minx,'minZ':minz,'heights':heights}))
 (OUT/'grassfield.collision.json').write_text(json.dumps({'blocked':blocked,'edges':[0]*len(heights)}))
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/'grassfield.glb'),export_format='GLB',use_selection=True,export_animations=False)
 render(ROOT/'.local/diretide-map.png',(0,0,0),(27,-30,38),45)
 shutil.copyfile(ROOT/'.local/diretide-map.png',ROOT/'assets/pnt/maps/grassfield.png')
reset();bpy.ops.import_scene.fbx(filepath=str(SOURCE/'buzz_patrick_geo_FIX.fbx'),use_anim=False)
bpy.context.scene.render.fps=30;bpy.context.scene.render.fps_base=1.0
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and 'body' in o.name.lower())
for o in list(bpy.context.scene.objects):
 if o not in [body,arm]:bpy.data.objects.remove(o,do_unlink=True)
apply_material([body],material('buzz_patrics_tex_highres.png'))
for b in arm.pose.bones:b.rotation_mode='QUATERNION'
def rotate(name,axis,angle):
 b=arm.pose.bones.get(name)
 if b:b.rotation_quaternion=Quaternion(b.bone.matrix_local.to_3x3().inverted()@Vector(axis),angle)
for clip,duration in [('idle',2.4),('jumpingJack',1.6),('walk',1.2),('smash',1.8),('celebrate',2)]:
 arm.animation_data_clear();arm.animation_data_create();action=bpy.data.actions.new(clip);arm.animation_data.action=action
 for f in range(round(duration*30)+1):
  t=f/30;phase=t/duration*math.tau
  for b in arm.pose.bones:b.rotation_quaternion=Quaternion();b.location=(0,0,0)
  for side,sign in [('L',1),('R',-1)]:rotate(side+'_shoulder_s',(0,1,0),sign*.75)
  if clip=='idle':rotate('chest_s',(1,0,0),.025*math.sin(phase));rotate('head_s',(0,0,1),.04*math.sin(phase))
  if clip=='jumpingJack':
   # Two hops per loop: open arms/legs on the first, close them on the second.
   half=t/duration*2;part=half%1;ease=min(1,part*2);ease=ease*ease*(3-2*ease)
   opened=0 if f==round(duration*30) else ease if half<1 else 1-ease
   hop=math.sin(math.pi*part)**2
   for side,sign in [('L',1),('R',-1)]:
    rotate(side+'_shoulder_s',(0,1,0),sign*(.75-2.45*opened))
    rotate(side+'_upperLeg_s',(0,1,0),-sign*.65*opened)
    thigh=arm.pose.bones[side+'_upperLeg_s'];thigh.location=thigh.bone.matrix_local.to_3x3().inverted() @ Vector((sign*.45*opened,0,0))
    rotate(side+'_lowerLeg_s',(1,0,0),.18*hop)
   # Bone-local translation is derived from armature-up, never a guessed axis.
   root=arm.pose.bones['Root'];height=.85*hop-1.15*(1-math.cos(.65*opened))
   root.location=root.bone.matrix_local.to_3x3().inverted() @ Vector((0,0,height))
   rotate('chest_s',(1,0,0),.025*math.sin(phase*2));rotate('head_s',(0,0,1),.035*math.sin(phase*2))
  if clip=='walk':
   for side,sign in [('L',1),('R',-1)]:
    rotate(side+'_upperLeg_s',(1,0,0),sign*.38*math.sin(phase));rotate(side+'_lowerLeg_s',(1,0,0),.25*max(0,-sign*math.sin(phase)))
    rotate(side+'_shoulder_s',(0,1,0),sign*(.75+.12*math.sin(phase)))
   rotate('hips_s',(0,1,0),.06*math.sin(phase));rotate('chest_s',(0,0,1),.06*math.sin(phase))
  if clip=='smash':
   # Anticipation, held overhead pose, fast strike at 65%, then recovery.
   u=t/duration;lift=min(1,u/.42) if u<.6 else max(0,1-(u-.6)/.12) if u<.72 else 0
   impact=max(0,1-abs(u-.72)/.25)
   for side,sign in [('L',1),('R',-1)]:
    bone=arm.pose.bones[side+'_shoulder_s'];basis=bone.bone.matrix_local.to_quaternion()
    # Lift overhead, then swing both hands forward toward the well at impact.
    raise_angle=sign*(.75-2.5*max(lift,impact*.72))
    world_rotation=Quaternion(Vector((1,0,0)),1.35*impact) @ Quaternion(Vector((0,1,0)),raise_angle)
    bone.rotation_quaternion=basis.inverted() @ world_rotation @ basis
    rotate(side+'_elbow_s',(1,0,0),-.35*lift)
   rotate('chest_s',(1,0,0),-.16*lift+.48*impact);rotate('head_s',(1,0,0),.12*impact)
  if clip=='celebrate':
   rotate('chest_s',(0,0,1),.12*math.sin(phase*2));rotate('head_s',(1,0,0),.1*math.sin(phase*2))
  for b in arm.pose.bones:
   b.keyframe_insert(data_path='rotation_quaternion',frame=f)
   if clip=='jumpingJack' and b.name in ['Root','L_upperLeg_s','R_upperLeg_s']:b.keyframe_insert(data_path='location',frame=f)
 # Keep every authored action available to the glTF ACTIONS exporter.
 action.use_fake_user=True
# Export actions individually rather than NLA tracks, all targeting the same armature.
arm.animation_data_clear();arm.animation_data_create();arm.animation_data.action=bpy.data.actions.get('idle');bpy.context.scene.frame_set(0)
bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.gltf(filepath=str(OUT/'patrics.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True)
render(ROOT/'.local/diretide-patrics.png',(0,0,4.5),(12,-20,10),17)
arm.animation_data.action=bpy.data.actions.get('smash');bpy.context.scene.frame_set(36)
render(ROOT/'.local/diretide-patrics-smash.png',(0,0,4.5),(12,-20,10),17)
arm.animation_data.action=bpy.data.actions.get('jumpingJack')
for frame in [0,12,24,36]:
 bpy.context.scene.frame_set(frame)
 render(ROOT/('.local/patrics-jumping-jack-'+str(frame)+'.png'),(0,0,4.5),(0,-24,7),18)
print('DIRETIDE BOSS READY' if '--boss-only' in sys.argv else 'DIRETIDE READY',flush=True)
