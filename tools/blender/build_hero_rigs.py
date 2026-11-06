"""Build editable Blender hero rigs and bake their evaluated actions for the browser."""

import argparse
import base64
import json
import math
from pathlib import Path
import sys
import struct

import bpy
from mathutils import Matrix, Quaternion, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True
from hero_poses import (
    IDLE, JOINTS, LOBBY_FEET, NIGHTBLADE_RETREAT, NIGHTBLADE_STANCE, RELEASE, SPEAR_ADVANCE, SPEAR_STANCE, actions_for,
)

ATTACK_STANCES = {"warrior": SPEAR_STANCE, "assassin": NIGHTBLADE_STANCE}

GAME_TO_BLENDER = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
BASIS = GAME_TO_BLENDER.to_quaternion()
INVERSE_BASIS = BASIS.inverted()
FPS = 30
RUN_DISTANCE = {"warrior": 7.7 / 2.46, "mage": 8.0 / 2.62, "assassin": 9.4 / 2.92}
ROLES = {"warrior": "Brynhildr", "mage": "Celestia", "assassin": "Akatsuki"}
BONE_ORDER = tuple(JOINTS.values())
CASTING_JOINTS = tuple(
    f"{digit}{segment}.L"
    for digit in ("Index", "Middle", "Ring", "Little", "Thumb")
    for segment in ("", ".Tip")
)
CASTING_GESTURES = {
    # Flexion at the knuckles, curl at the pads, and the fan across the palm.
    "rest": ((-23, -31, -39, -42, -12), (-26, -31, -39, -43, -13), 2),
    "gather": ((-38, -51, -58, -61, -23), (-39, -49, -56, -58, -18), 6),
    "offer": ((8, 2, -12, -19, 8), (7, 3, -16, -20, 6), -10),
    "flare": ((13, 11, 7, 4, 13), (7, 9, 5, 2, 10), -15),
    "ward": ((-5, -5, -12, -21, 11), (-1, -4, -9, -16, 8), -9),
}
FOLD_SOURCES = {
    f"{hinge}.{side}": f"{control}.{side}"
    for hinge, control in (("Elbow", "Forearm"), ("Knee", "Shin"))
    for side in ("L", "R")
}
SHOULDER_FOLLOW = {"warrior": .78, "mage": .83, "assassin": .87}
LABELS = {
    "idle": "Idle guard", "run": "Run cycle", "evade": "Evade", "hit": "Hit reaction",
    "lobby": "Lobby idle",
    "thrust": "Combo 1", "reverse": "Combo 2", "sweep": "Combo 3",
    "skill1": "Skill 1", "skill2": "Skill 2", "charge": "Eclipse anticipation", "eclipse": "Eclipse release",
}


def game_rotation(angles):
    x, y, z = map(math.radians, angles)
    # Three.js uses intrinsic XYZ. Compose the same basis explicitly.
    return Quaternion((1, 0, 0), x) @ Quaternion((0, 1, 0), y) @ Quaternion((0, 0, 1), z)


def local_rotation(bone, rotation):
    rest = bone.bone.matrix_local.to_quaternion()
    return rest.inverted() @ BASIS @ rotation @ INVERSE_BASIS @ rest


def current_rotation(bone):
    rest = bone.bone.matrix_local.to_quaternion()
    return INVERSE_BASIS @ rest @ bone.rotation_quaternion.normalized() @ rest.inverted() @ BASIS


def bake_hem_drag(scene, armature, clip, start, end):
    """Let the weighted hem follow the upper coat with a short delay."""
    coat = armature.pose.bones["Coat"]
    hem = armature.pose.bones["Coat.Hem"]
    rotations = []
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        rotations.append(current_rotation(coat))
    follow = rotations[0]
    loop = clip in ("idle", "lobby", "run")
    if loop:
        for rotation in rotations[:-1] * 3:
            follow = follow.slerp(rotation, .36)
    first = None
    last = Quaternion()
    for frame, rotation in enumerate(rotations, start):
        follow = follow.slerp(rotation, .36)
        delta = rotation.inverted() @ follow
        if delta.w < 0:
            delta.negate()
        if delta.angle > math.radians(32):
            delta = Quaternion().slerp(delta, math.radians(32) / delta.angle)
        if frame == end and loop:
            delta = first
        elif not loop:
            # Settle into the next stance during the final recovery frames.
            delta = Quaternion().slerp(delta, min(1, (end - frame) / 4))
        if frame == start:
            first = delta.copy()
        pose = local_rotation(hem, delta)
        if last.dot(pose) < 0:
            pose.negate()
        last = pose
        hem.rotation_quaternion = pose
        hem.keyframe_insert("rotation_quaternion", frame=frame, group=hem.name)


def key_leg_to(armature, frame, side, ankle, pitch, yaw=0):
    """Solve a two-segment leg and bake the three joint rotations."""
    hips = armature.pose.bones["Hips"]
    thigh, shin, foot = (armature.pose.bones[f"{joint}.{side}"] for joint in ("Thigh", "Shin", "Foot"))
    hip = GAME_TO_BLENDER.transposed() @ thigh.head
    direction = (ankle - hip).normalized()
    distance = min((ankle - hip).length, .739)
    bend = Vector((math.sin(math.radians(yaw)), 0, math.cos(math.radians(yaw))))
    bend = (bend - direction * direction.dot(bend)).normalized()
    knee = hip + direction * distance * .5 + bend * math.sqrt(.37**2 - (distance * .5)**2)
    ankle = hip + direction * distance
    down = Vector((0, -1, 0))
    upper = down.rotation_difference((knee - hip).normalized())
    lower = down.rotation_difference((ankle - knee).normalized())
    for bone, rotation in ((thigh, current_rotation(hips).inverted() @ upper),
                           (shin, upper.inverted() @ lower),
                           (foot, lower.inverted() @ game_rotation((0, yaw, 0)) @ game_rotation((pitch, 0, 0)))):
        result = local_rotation(bone, rotation)
        if result.dot(bone.rotation_quaternion) < 0:
            result.negate()
        bone.rotation_quaternion = result
        bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)


def key_run_contact(armature, frame, role, start, end):
    """Bake a stationary stance foot into the in-place run at nominal movement speed."""
    for side, half_cycle in (("L", 0), ("R", .5)):
        phase = ((frame - start) / (end - start) + half_cycle) % 1
        stance = .235
        half_step = RUN_DISTANCE[role] * stance / 2
        if phase <= stance:
            ankle = Vector((-.155 if side == "L" else .155, .067, half_step - phase * RUN_DISTANCE[role]))
            pitch = 0
        else:
            swing = (phase - stance) / (1 - stance)
            travel = swing * swing * (3 - 2 * swing)
            lift = math.sin(math.pi * swing) ** 1.15
            ankle = Vector((-.155 if side == "L" else .155, .067 + lift * (.51 if role == "assassin" else .39),
                            -half_step + 2 * half_step * travel))
            pitch = 35 * math.sin(2 * math.pi * swing)
        key_leg_to(armature, frame, side, ankle, pitch)


def bake_contact(armature, actor, role, clip, start, end):
    scene = bpy.context.scene
    if clip == "lobby":
        for frame in range(start, end + 1):
            scene.frame_set(frame)
            for side, (x, z, yaw) in zip(("L", "R"), LOBBY_FEET[role]):
                key_leg_to(armature, frame, side, Vector((x, .067, z)), 0, yaw)
        return
    stance = ATTACK_STANCES.get(role, {}).get(clip)
    if stance:
        release = RELEASE[role][clip]
        advance = SPEAR_ADVANCE.get(clip, 0) if role == "warrior" else 0
        first_travel = start + (release - start) * .20
        for frame in range(start, end + 1):
            scene.frame_set(frame)
            travel = min(1, max(0, (frame - first_travel) / (release - first_travel)))
            travel = advance * travel * travel * (3 - 2 * travel)
            for side, marks in stance.items():
                left, right = next((a, b) for a, b in zip(marks, marks[1:]) if frame <= b[0])
                phase = (frame - left[0]) / (right[0] - left[0])
                t = phase * phase * (3 - 2 * phase)
                x, z, lift, yaw = (a + (b - a) * t for a, b in zip(left[1:], right[1:]))
                key_leg_to(armature, frame, side, Vector((x, .067 + lift, z - travel)), 0, yaw)
        return
    hips = armature.pose.bones["Hips"]
    sole = {}
    for side in ("L", "R"):
        foot = armature.pose.bones[f"Foot.{side}"]
        index = actor.vertex_groups[foot.name].index
        bind_inverse = foot.bone.matrix_local.inverted()
        sole[foot] = [bind_inverse @ vertex.co for vertex in actor.data.vertices
                      if vertex.co.z < .04 and any(g.group == index for g in vertex.groups)]
    grounded = {"hit"}
    if role == "warrior":
        grounded.add("evade")
    elif role == "mage":
        grounded.update(("thrust", "reverse", "sweep"))
    # Collect corrections against the authored curves before inserting keys.
    hip_locations = []
    idle_ankles = {}
    drop = {"warrior": .049, "mage": .038, "assassin": .078}[role] if clip == "idle" else {
        "warrior": .083, "mage": .078, "assassin": .101,
    }[role]
    if clip == "idle":
        scene.frame_set(start)
        for side in ("L", "R"):
            foot = armature.pose.bones[f"Foot.{side}"]
            idle_ankles[side] = Vector((foot.head.x, .067, -foot.head.y))
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        if clip in ("idle", "run"):
            shift = hips.bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, -drop))
            hip_locations.append((frame, hips.location + shift))
            continue
        bottom = min((foot.matrix @ point).z for foot, vertices in sole.items() for point in vertices)
        nightblade_landing = role == "assassin" and clip == "sweep" and frame >= NIGHTBLADE_RETREAT[1]
        lift = -bottom if clip in grounded or nightblade_landing else max(0, -bottom)
        local_shift = hips.bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, lift))
        hip_locations.append((frame, hips.location + local_shift))
    for frame, location in hip_locations:
        hips.location = location
        hips.keyframe_insert("location", frame=frame, group=hips.name)
    if clip in ("idle", "run"):
        for frame in range(start, end + 1):
            scene.frame_set(frame)
            if clip == "run":
                key_run_contact(armature, frame, role, start, end)
            else:
                for side, target in idle_ankles.items():
                    key_leg_to(armature, frame, side, target, 0)


def material_from_colors():
    material = bpy.data.materials.new("Astral · character paint")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    paint = nodes.new("ShaderNodeVertexColor")
    paint.layer_name = "Paint"
    shader = nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = .76
    material.node_tree.links.new(paint.outputs["Color"], shader.inputs["Base Color"])
    return material


def add_facial_controls(collection, armature, title, source, paint):
    xyz = source["positions"]
    positions = [GAME_TO_BLENDER @ Vector(xyz[i:i+3]) for i in range(0, len(xyz), 3)]
    indices = source["indices"]
    mesh = bpy.data.meshes.new(f"{title} · facial features")
    mesh.from_pydata(positions, [], [indices[i:i+3] for i in range(0, len(indices), 3)])
    mesh.update()
    rgb = source["colors"]
    layer = mesh.color_attributes.new(name="Paint", type="FLOAT_COLOR", domain="POINT")
    layer.data.foreach_set("color", [value for i in range(0, len(rgb), 3) for value in (*rgb[i:i+3], 1.0)])
    face = bpy.data.objects.new(f"{title} · expression controls", mesh)
    collection.objects.link(face)
    face.parent = armature
    face.data.materials.append(paint)
    face.shape_key_add(name="Basis", from_mix=False)
    for morph in source["morphs"]:
        offsets = morph["deltas"]
        if not any(offsets):
            continue
        key = face.shape_key_add(name=morph["name"], from_mix=False)
        key.value = 0
        if key.name == "Gaze":
            key.slider_min = -1
        coords = [value for i, point in enumerate(positions)
                  for value in point + GAME_TO_BLENDER @ Vector(offsets[3*i:3*i+3])]
        key.data.foreach_set("co", coords)
    group = face.vertex_groups.new(name="Head")
    group.add(list(range(len(positions))), 1.0, "REPLACE")
    modifier = face.modifiers.new("Hero skeleton", "ARMATURE")
    modifier.object = armature


def build_rig(hero, paint):
    role = hero["role"]
    title = ROLES[role]
    collection = bpy.data.collections.new(title)
    bpy.context.scene.collection.children.link(collection)
    data = bpy.data.armatures.new(f"{title} · skeleton")
    armature = bpy.data.objects.new(f"{title} Rig", data)
    collection.objects.link(armature)
    armature["astral_role"] = role
    armature.show_in_front = True
    data.display_type = "OCTAHEDRAL"
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")

    heads = {part["name"]: GAME_TO_BLENDER @ Vector(part["head"]) for part in hero["bones"]}
    for part in hero["bones"]:
        name = part["name"]
        bone = data.edit_bones.new(name)
        bone.head = heads[name]
        if name.startswith(("UpperArm", "Thigh")):
            next_part = name.replace("UpperArm", "Forearm").replace("Thigh", "Shin")
            bone.tail = heads[next_part]
        elif name.startswith("ShoulderPlate"):
            bone.tail = heads[name.replace("ShoulderPlate", "Forearm")]
        elif name == "Hips":
            bone.tail = bone.head + Vector((0, 0, .51))
        elif name == "Head":
            bone.tail = bone.head + Vector((0, 0, .24))
        elif name == "Weapon.L" and role == "mage":
            bone.tail = bone.head + Vector((0, 0, -.073))
        elif name.startswith("Weapon"):
            bone.tail = bone.head + Vector((0, -.55, 0))
        elif name in CASTING_JOINTS:
            if ".Tip." in name:
                base = heads[name.replace(".Tip", "")]
                bone.tail = bone.head + (bone.head - base).normalized() * .041
            else:
                bone.tail = heads[name.replace(".L", ".Tip.L")]
        elif name.startswith("Foot."):
            bone.tail = bone.head + Vector((0, -.16, 0))
        elif name.startswith(("Forearm", "Shin")) or name in FOLD_SOURCES:
            bone.tail = bone.head + Vector((0, 0, -.29))
        elif name in ("Coat", "Coat.Hem", "Hair"):
            bone.tail = bone.head + Vector((0, .12, -.31))
        else:
            raise ValueError(f"No bone tip for {name}")
    for part in hero["bones"]:
        if part["parent"]:
            data.edit_bones[part["name"]].parent = data.edit_bones[part["parent"]]
    bpy.ops.object.mode_set(mode="OBJECT")

    vertices, normals, faces, colors, weights = [], [], [], [], {}
    for part in hero["bones"]:
        for mesh in part["meshes"]:
            if mesh.get("morphs"):
                add_facial_controls(collection, armature, title, mesh, paint)
                continue
            start = len(vertices)
            xyz = mesh["positions"]
            normal_data = mesh["normals"]
            rgb = mesh["colors"]
            vertices.extend(GAME_TO_BLENDER @ Vector(xyz[i:i+3]) for i in range(0, len(xyz), 3))
            normals.extend(GAME_TO_BLENDER @ Vector(normal_data[i:i+3]) for i in range(0, len(normal_data), 3))
            colors.extend((*rgb[i:i+3], 1.0) for i in range(0, len(rgb), 3))
            skin = mesh.get("skin")
            if skin:
                entries = skin["weights"]
                for i in range(0, len(entries), 4):
                    for slot in (i, i + 2):
                        influence = entries[slot + 1]
                        if influence > 0:
                            bone = skin["bones"][entries[slot]]
                            weights.setdefault((bone, influence), []).append(start + i // 4)
            else:
                weights.setdefault((part["name"], 1.0), []).extend(range(start, len(vertices)))
            indices = mesh["indices"] or range(len(xyz) // 3)
            faces.extend(tuple(start + index for index in indices[i:i+3]) for i in range(0, len(indices), 3))

    mesh = bpy.data.meshes.new(f"{title} · game model")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.polygons.foreach_set("use_smooth", [True] * len(faces))
    mesh.normals_split_custom_set_from_vertices(normals)
    color = mesh.color_attributes.new(name="Paint", type="FLOAT_COLOR", domain="POINT")
    color.data.foreach_set("color", [channel for rgba in colors for channel in rgba])
    actor = bpy.data.objects.new(f"{title} · weighted mesh", mesh)
    collection.objects.link(actor)
    actor.parent = armature
    actor.data.materials.append(paint)
    for (bone, influence), vertex_indices in weights.items():
        group = actor.vertex_groups.get(bone) or actor.vertex_groups.new(name=bone)
        group.add(vertex_indices, influence, "REPLACE")
    modifier = actor.modifiers.new("Hero skeleton", "ARMATURE")
    modifier.object = armature

    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"
        bone.bone.color.palette = "THEME04" if bone.name.startswith(("Hair", "Coat", "Weapon")) else "THEME03"
    followers = [(hinge, control, .5) for hinge, control in FOLD_SOURCES.items()]
    followers.extend((f"ShoulderPlate.{side}", f"UpperArm.{side}", SHOULDER_FOLLOW[role]) for side in ("L", "R"))
    for hinge, control, amount in followers:
        fold = armature.pose.bones[hinge].constraints.new("COPY_ROTATION")
        fold.name = "Follow limb rotation"
        fold.target = armature
        fold.subtarget = control
        fold.target_space = "LOCAL"
        fold.owner_space = "LOCAL"
        fold.influence = amount

    armature.animation_data_create()
    for clip, keys in actions_for(role).items():
        action = bpy.data.actions.new(f"{title} · {LABELS[clip]}")
        action["astral_role"] = role
        action["astral_clip"] = clip
        if role == "warrior" and clip in SPEAR_ADVANCE:
            action["astral_advance"] = SPEAR_ADVANCE[clip]
        if role == "warrior" and clip == "eclipse":
            action["astral_height_scale"] = 3
        if role == "assassin" and clip == "sweep":
            action["astral_retreat"], landing = NIGHTBLADE_RETREAT
            action.pose_markers.new("Land").frame = landing
        action.use_fake_user = True
        action.use_frame_range = True
        action.frame_start = keys[0][0]
        action.frame_end = keys[-1][0]
        armature.animation_data.action = action
        if clip in RELEASE[role]:
            marker = action.pose_markers.new("Release")
            marker.frame = RELEASE[role][clip]
        last = {}
        for frame, shift, overrides in keys:
            for channel, name in JOINTS.items():
                bone = armature.pose.bones[name]
                authored = game_rotation(overrides.get(channel, IDLE[role].get(channel, (0, 0, 0))))
                aim = overrides.get({"weapon": "aim", "offhand": "offhand_aim"}.get(channel))
                if aim is not None:
                    side = "right" if channel == "weapon" else "left"
                    parent = game_rotation(overrides.get("hips", IDLE[role]["hips"]))
                    arm, elbow = f"{side}_arm", f"{side}_elbow"
                    parent = parent @ game_rotation(overrides.get(arm, IDLE[role][arm]))
                    parent = parent @ game_rotation(overrides.get(elbow, IDLE[role][elbow]))
                    desired = parent.inverted() @ Vector(aim).normalized()
                    shaft = authored @ Vector((0, 0, 1))
                    authored = shaft.rotation_difference(desired) @ authored
                local = local_rotation(bone, authored)
                if name in last and local.dot(last[name]) < 0:
                    local.negate()
                last[name] = local.copy()
                bone.rotation_quaternion = local
                bone.keyframe_insert("rotation_quaternion", frame=frame, group=name)
                if channel == "hips":
                    rest = bone.bone.matrix_local.to_quaternion()
                    bone.location = rest.inverted() @ (GAME_TO_BLENDER @ Vector(shift))
                    bone.keyframe_insert("location", frame=frame, group=name)
            if role == "mage":
                flex, pad, spread = CASTING_GESTURES[overrides.get("gesture", "rest")]
                for i, (bend, curl) in enumerate(zip(flex, pad)):
                    for segment, angles in enumerate(((bend, 0, (i - 1.5) * spread if i < 4 else -spread),
                                                        (curl, 0, 0))):
                        bone = armature.pose.bones[CASTING_JOINTS[2 * i + segment]]
                        bone.rotation_quaternion = local_rotation(bone, game_rotation(angles))
                        bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
        bake_contact(armature, actor, role, clip, keys[0][0], keys[-1][0])
        bake_hem_drag(bpy.context.scene, armature, clip, keys[0][0], keys[-1][0])
    return armature


def set_action(armature, action):
    armature.animation_data_create()
    armature.animation_data.action = action
    if action.slots:
        armature.animation_data.action_slot = action.slots[0]


def bake_library(scene, armatures):
    library = {}
    for role, armature in armatures.items():
        clips = {}
        joint_order = (*BONE_ORDER, *CASTING_JOINTS) if role == "mage" else BONE_ORDER
        for action in bpy.data.actions:
            if action.get("astral_role") != role:
                continue
            name = action["astral_clip"]
            set_action(armature, action)
            start, end = action.frame_range
            height_scale = float(action.get("astral_height_scale", 1))
            samples = []
            for frame in range(round(start), round(end) + 1):
                scene.frame_set(frame)
                hips = armature.pose.bones["Hips"]
                shift = GAME_TO_BLENDER.transposed() @ (hips.bone.matrix_local.to_3x3() @ hips.location)
                row = [shift.x, shift.y / height_scale, shift.z]
                for bone_name in joint_order:
                    bone = armature.pose.bones[bone_name]
                    rest = bone.bone.matrix_local.to_quaternion()
                    local = bone.rotation_quaternion.normalized()
                    rotation = INVERSE_BASIS @ rest @ local @ rest.inverted() @ BASIS
                    row.extend((rotation.x, rotation.y, rotation.z, rotation.w))
                if any(abs(component) > 1.00001 for component in row):
                    raise ValueError(f"{action.name} has an animation channel outside the export range")
                samples.extend(round(max(-1, min(1, component)) * 32767) for component in row)
            packed = struct.pack(f"<{len(samples)}h", *samples)
            clips[name] = {"seconds": round((end - start) / FPS, 4), "samples": base64.b64encode(packed).decode("ascii")}
            if height_scale != 1:
                clips[name]["heightScale"] = height_scale
            marker = action.pose_markers.get("Release")
            if marker:
                if not start < marker.frame < end:
                    raise ValueError(f"{action.name} release must be between the first and last frames")
                clips[name]["release"] = round((marker.frame - start) / (end - start), 6)
            if "astral_advance" in action:
                clips[name]["advance"] = float(action["astral_advance"])
            if "astral_retreat" in action:
                land = action.pose_markers.get("Land")
                if not marker or not land or not marker.frame < land.frame <= end:
                    raise ValueError(f"{action.name} needs a Land marker after Release")
                clips[name]["retreat"] = {
                    "distance": float(action["astral_retreat"]),
                    "landAt": round((land.frame - start) / (end - start), 6),
                }
            stance = ATTACK_STANCES.get(role, {}).get(name)
            if stance:
                clips[name]["plants"] = [
                    [{"start": round((a[0] - start) / (end - start), 6),
                      "end": round((b[0] - start) / (end - start), 6)}
                     for a, b in zip(marks, marks[1:]) if a[1:4] == b[1:4] and a[3] == 0]
                    for marks in (stance[side] for side in ("L", "R"))
                ]
        library[role] = clips
    return {"joints": BONE_ORDER, "castingJoints": CASTING_JOINTS, "roles": library}


def add_preview(scene, armatures):
    for i, armature in enumerate(armatures.values()):
        armature.location.x = (i - 1) * 2.3
    camera_data = bpy.data.cameras.new("Rig lineup camera")
    camera = bpy.data.objects.new("Rig lineup camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0.35, -9.5, 3.1)
    camera.rotation_euler = (Vector((0, 0, 1.13)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 7.8
    scene.camera = camera
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "VERTEX"
    scene.display.shading.show_cavity = True
    scene.display.shading.show_shadows = True
    scene.display.shading.show_object_outline = True
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.shading.color_type = "VERTEX"
                area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
                area.spaces.active.region_3d.view_distance = 7.1
                area.spaces.active.region_3d.view_location = (0, 0, 1.05)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--meshes", type=Path)
    parser.add_argument("--blend", type=Path)
    parser.add_argument("--clips", required=True, type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    if args.meshes:
        if not args.blend:
            parser.error("--blend is required when building the rigs")
        bpy.ops.wm.read_factory_settings(use_empty=True)
        paint = material_from_colors()
        armatures = {hero["role"]: build_rig(hero, paint) for hero in json.loads(args.meshes.read_text(encoding="utf-8"))}
    else:
        armatures = {obj["astral_role"]: obj for obj in bpy.data.objects if obj.type == "ARMATURE" and "astral_role" in obj}

    if set(armatures) != set(ROLES):
        raise ValueError("Expected all three Astral armatures")
    scene = bpy.context.scene
    scene.render.fps = FPS
    payload = bake_library(scene, armatures)
    for role, armature in armatures.items():
        expected = set(actions_for(role))
        if set(payload["roles"][role]) != expected:
            raise ValueError(f"Missing actions in {role}: {expected - set(payload['roles'][role])}")
        idle = next(action for action in bpy.data.actions if action.get("astral_role") == role and action.get("astral_clip") == "idle")
        set_action(armature, idle)

    scene.frame_start = 1
    scene.frame_end = 49
    scene.frame_set(1)
    args.clips.parent.mkdir(parents=True, exist_ok=True)
    args.clips.write_text(json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")
    if args.blend:
        add_preview(scene, armatures)
        args.blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=str(args.blend), compress=True)


if __name__ == "__main__":
    main()
