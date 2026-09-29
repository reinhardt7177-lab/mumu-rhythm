from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
PNG_OUTPUT = ROOT / "tmp" / "blender" / "neon-run-stage.png"
BLEND_OUTPUT = ROOT / "tmp" / "blender" / "neon-run-stage.blend"
COLORS = [
    (0.08, 1.0, 0.84, 1),
    (1.0, 0.14, 0.56, 1),
    (1.0, 0.76, 0.08, 1),
    (0.28, 1.0, 0.32, 1),
    (0.28, 0.42, 1.0, 1),
]


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for data in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for item in list(data):
            if item.users == 0:
                data.remove(item)


def material(name: str, color: tuple[float, float, float, float], emission: float = 0, metallic: float = 0.25, roughness: float = 0.3):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = color
    metallic_input = node.inputs.get("Metallic IOR Level") or node.inputs.get("Metallic")
    if metallic_input:
        metallic_input.default_value = metallic
    node.inputs["Roughness"].default_value = roughness
    if emission > 0:
        emission_color = node.inputs.get("Emission Color") or node.inputs.get("Emission")
        emission_strength = node.inputs.get("Emission Strength")
        if emission_color:
            emission_color.default_value = color
        if emission_strength:
            emission_strength.default_value = emission
    return mat


def cube(name: str, location, scale, mat, bevel: float = 0.08):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Soft bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    obj.data.materials.append(mat)
    return obj


def look_at(obj, target) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_world() -> None:
    world = bpy.data.worlds.new("Neon World")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.002, 0.014, 0.02, 1)
    background.inputs["Strength"].default_value = 0.2
    bpy.context.scene.world = world


def build_scene() -> None:
    clear_scene()
    setup_world()

    dark = material("Obsidian stage", (0.006, 0.012, 0.025, 1), metallic=0.82, roughness=0.18)
    rail_materials = [material(f"Lane {index}", color, emission=3.2, metallic=0.18, roughness=0.2) for index, color in enumerate(COLORS)]
    white = material("Portal gold", (1.0, 0.68, 0.08, 1), emission=4.2, metallic=0.15, roughness=0.16)
    violet = material("Portal cyan", (0.02, 0.62, 1.0, 1), emission=4.0, metallic=0.25, roughness=0.18)
    magenta = material("Portal coral", (1.0, 0.04, 0.34, 1), emission=4.0, metallic=0.2, roughness=0.2)

    cube("Runway", (0, 4.7, -0.18), (5.6, 9.3, 0.18), dark, 0.02)
    for lane, x in enumerate((-4.2, -2.1, 0, 2.1, 4.2)):
        cube(f"Lane rail {lane}", (x, 4.7, 0.04), (0.035, 9.2, 0.035), rail_materials[lane], 0.02)
        cube(f"Lane edge {lane}", (x, -4.3, 0.12), (0.78, 0.06, 0.04), rail_materials[lane], 0.025)

    # Falling note sculptures form a readable five-lane rhythm pattern.
    note_specs = [
        (-4.2, -1.6, 0), (-2.1, 0.1, 1), (0, 1.4, 2), (2.1, 2.8, 3),
        (4.2, 4.0, 4), (2.1, 5.3, 3), (0, 6.2, 2), (-2.1, 7.4, 1),
        (4.2, 8.5, 4), (-4.2, 9.1, 0), (0, 10.0, 2),
    ]
    for index, (x, y, lane) in enumerate(note_specs):
        note = cube(f"Note {index}", (x, y, 0.42 + index * 0.035), (0.74, 0.22, 0.12), rail_materials[lane], 0.12)
        note.rotation_euler.z = math.radians((-1) ** index * 4)

    # Concentric portals anchor the distant stage.
    for index, (major, mat) in enumerate(((4.0, violet), (3.35, magenta), (2.72, white))):
        bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=0.065 + index * 0.012, major_segments=96, minor_segments=12, location=(0, 12.4, 4.5))
        portal = bpy.context.object
        portal.name = f"Portal {index}"
        portal.rotation_euler.x = math.radians(90)
        portal.data.materials.append(mat)

    # A central holographic star made from crossed beams.
    for rotation in (0, 60, 120):
        beam = cube(f"Star beam {rotation}", (0, 12.15, 4.5), (1.32, 0.045, 0.065), white, 0.04)
        beam.rotation_euler.y = math.radians(rotation)

    # Layered skyline and side pylons give the still a Blender-authored 3D silhouette.
    for side in (-1, 1):
        for index in range(8):
            height = 0.8 + (index % 4) * 0.62
            x = side * (6.5 + index * 0.55)
            tower = cube(f"Tower {side} {index}", (x, 8.5 + index * 0.36, height / 2), (0.38, 0.38, height / 2), dark, 0.06)
            strip = cube(f"Tower light {side} {index}", (x - side * 0.39, 8.15 + index * 0.36, height * 0.62), (0.018, 0.04, height * 0.22), rail_materials[(index + (0 if side < 0 else 2)) % 5], 0.01)
            strip.parent = tower

    # Tiny emissive stars are real scene objects, not a post-process texture.
    for index in range(70):
        angle = index * 2.399963
        radius = 3.5 + (index % 13) * 0.63
        x = math.cos(angle) * radius
        z = 1.3 + (index * 17 % 59) / 8
        y = 9.5 + (index % 7) * 0.75
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.025 + (index % 3) * 0.012, location=(x, y, z))
        bpy.context.object.data.materials.append(rail_materials[index % 5])

    bpy.ops.object.light_add(type="AREA", location=(0, -2.5, 8.5))
    key = bpy.context.object
    key.data.energy = 1600
    key.data.shape = "DISK"
    key.data.size = 8
    key.data.color = (0.28, 0.45, 1.0)
    look_at(key, (0, 4, 0))

    bpy.ops.object.camera_add(location=(0, -16.5, 7.2))
    camera = bpy.context.object
    camera.data.lens = 31
    camera.data.sensor_width = 36
    look_at(camera, (0, 4.9, 1.3))
    bpy.context.scene.camera = camera


def configure_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = str(PNG_OUTPUT)
    scene.render.film_transparent = False
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"

def main() -> None:
    PNG_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    build_scene()
    configure_render()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUTPUT))
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {PNG_OUTPUT}")


if __name__ == "__main__":
    main()
