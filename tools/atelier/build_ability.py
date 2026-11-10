"""Original Astral Bloom performance on the canonical Celestia rig.
Editable Blender action + packed samples for the existing HeroMotion player.
No gameplay clock, root-motion authority or alternate skeleton is introduced.
"""
import bpy,sys,os,json,math,subprocess,tempfile
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/blender'))
from build_hero_rigs import (game_rotation,local_rotation,set_action,key_leg_to,bake_hem_drag,bake_library,GAME_TO_BLENDER,CASTING_JOINTS,CASTING_GESTURES,build_rig,material_from_colors)
from hero_poses import JOINTS,IDLE,key
# Rebuild from the canonical mesh/joint contract instead of requiring the
# repository's Blender 5.2 file to open in an older supported Blender.
with tempfile.TemporaryDirectory(prefix='astral-ability-') as temporary:
 path=Path(temporary)/'heroes.json';env=dict(os.environ,ASTRAL_HERO_MESH_DUMP=str(path))
 subprocess.run(['node','node_modules/vite-node/vite-node.mjs','tools/blender/export-hero-meshes.ts'],cwd=ROOT,env=env,check=True)
 hero=next(h for h in json.loads(path.read_text()) if h['role']=='mage')
bpy.ops.wm.read_factory_settings(use_empty=True)
rig=build_rig(hero,material_from_colors())
scene=bpy.context.scene
idle=next(a for a in bpy.data.actions if a.get('astral_role')=='mage' and a.get('astral_clip')=='idle')
set_action(rig,idle);scene.frame_set(1)
ankles={s:Vector((rig.pose.bones['Foot.'+s].head.x,.067,-rig.pose.bones['Foot.'+s].head.y)) for s in ['L','R']}
keys=[
 key(1,(0,-.038,0)),
 key(9,(-.018,-.065,-.035),hips=(-8,22,8),head=(-3,-17,-4),left_arm=(-83,-21,-30),left_elbow=(-91,0,0),offhand=(-12,4,-9),gesture='gather',right_arm=(-23,9,34),right_elbow=(-55,0,0),weapon=(-28,12,14),coat=(12,-12,8),hair=(14,-8,7)),
 key(18,(-.025,-.090,-.06),hips=(-12,36,12),head=(-6,-29,-8),left_arm=(-98,-18,-35),left_elbow=(-105,0,0),offhand=(-18,6,-14),gesture='gather',right_arm=(-72,12,27),right_elbow=(-89,0,0),weapon=(-37,18,26),coat=(20,-19,12),hair=(20,-12,11)),
 key(24,(-.025,-.092,-.062),hips=(-11,37,12),head=(-8,-29,-8),left_arm=(-101,-17,-36),left_elbow=(-101,0,0),offhand=(-13,7,-14),gesture='gather',right_arm=(-75,13,28),right_elbow=(-86,0,0),weapon=(-39,19,27),coat=(22,-20,14),hair=(22,-14,12)),
 key(29,(.018,-.046,.105),hips=(16,-24,-9),head=(-10,22,5),left_arm=(-81,8,-20),left_elbow=(-12,0,0),offhand=(12,0,-8),gesture='flare',right_arm=(-29,8,38),right_elbow=(-42,0,0),weapon=(-18,10,-22),coat=(-24,20,-17),hair=(-24,16,-10)),
 key(34,(.012,-.053,.08),hips=(12,-21,-6),head=(-8,20,4),left_arm=(-79,5,-23),left_elbow=(-18,0,0),offhand=(9,0,-7),gesture='ward',right_arm=(-24,12,33),right_elbow=(-49,0,0),weapon=(-14,15,-10),coat=(-32,24,-20),hair=(-30,18,-13)),
 key(42,(0,-.046,.025),hips=(4,-13,-3),head=(-2,12,2),left_arm=(-45,-5,-24),left_elbow=(-53,0,0),gesture='rest',coat=(-6,9,-6),hair=(-5,6,-4)),
 key(49,(0,-.038,0)),
]
action=bpy.data.actions.new('Celestia · Astral Bloom / gather, rupture, settle');action['astral_role']='mage';action['astral_clip']='skill1';action.use_fake_user=True;action.use_frame_range=True;action.frame_start=1;action.frame_end=49;action.pose_markers.new('Release').frame=29
set_action(rig,action);last={}
for frame,shift,overrides in keys:
 for channel,name in JOINTS.items():
  bone=rig.pose.bones[name];q=local_rotation(bone,game_rotation(overrides.get(channel,IDLE['mage'].get(channel,(0,0,0)))))
  if name in last and q.dot(last[name])<0:q.negate()
  last[name]=q.copy();bone.rotation_quaternion=q;bone.keyframe_insert('rotation_quaternion',frame=frame,group=name)
  if channel=='hips':
   bone.location=bone.bone.matrix_local.to_quaternion().inverted()@(GAME_TO_BLENDER@Vector(shift));bone.keyframe_insert('location',frame=frame,group=name)
 flex,pad,spread=CASTING_GESTURES[overrides.get('gesture','rest')]
 for i,(bend,curl) in enumerate(zip(flex,pad)):
  for segment,angles in enumerate(((bend,0,(i-1.5)*spread if i<4 else -spread),(curl,0,0))):
   bone=rig.pose.bones[CASTING_JOINTS[2*i+segment]];bone.rotation_quaternion=local_rotation(bone,game_rotation(angles));bone.keyframe_insert('rotation_quaternion',frame=frame,group=bone.name)
# Two-bone IK is baked offline, preserving a grounded, widening stance.
for frame in range(1,50):
 scene.frame_set(frame)
 t=min(1,(frame-1)/8) if frame<36 else max(0,(49-frame)/13);t=t*t*(3-2*t)
 for side in ['L','R']:
  target=Vector((-.15 if side=='L' else .15,.067,.10 if side=='L' else -.13))
  key_leg_to(rig,frame,side,ankles[side].lerp(target,t),0,-9*t if side=='L' else 12*t)
bake_hem_drag(scene,rig,'skill1',1,49)
# Only export the new action; canonical library and .blend are never modified.
for a in list(bpy.data.actions):
 if a!=action:bpy.data.actions.remove(a)
payload=bake_library(scene,{'mage':rig});clip=payload['roles']['mage']['skill1']
result={'schemaVersion':1,'joints':payload['joints'],'castingJoints':payload['castingJoints'],'clip':clip}
(ROOT/'src/data/observatoryAbility.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
# Editable performance source contains just the original rig/action.
for o in list(bpy.data.objects):
 if o!=rig:bpy.data.objects.remove(o,do_unlink=True)
rig.location=(0,0,0);scene.frame_start=1;scene.frame_end=49;scene.frame_set(18)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/atelier/CelestiaAstralBloom.blend'),compress=True)
print('ATELIER: 49-frame original performance, release',clip['release'])
