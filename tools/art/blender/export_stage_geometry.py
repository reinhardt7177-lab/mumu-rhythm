"""Blender headless exporter for MUMU runtime stage geometry.

Blender is used as a spatial design tool only. The script builds a real 3D
scene (camera, floor rails, tunnel rings, star layers and a city block field),
projects it through Blender's camera model and writes the resulting numbers to
``src/content/stageGeometry.generated.ts``. No image, .blend or render output
is produced; the browser draws everything from these numbers at runtime.

Run:  blender --background --factory-startup --python tools/art/blender/export_stage_geometry.py
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / "src" / "content" / "stageGeometry.generated.ts"
SEED = 7031
STAGE_RES = (1080, 1920)  # 9:16 portrait stage
MV_RES = (1200, 1200)  # square MV reference frame, remapped per side panel
RING_POINTS = 32
RING_COUNT = 14
RING_SPACING = 4.0
RUNG_COUNT = 22
RUNG_SPACING = 2.5
HIT_LINE_Y = 0.9  # stage-normalized y (top = 0) of the beat line
LANE_SPAN = (0.045, 0.955)  # stage-normalized x span of the five lanes


def r4(value: float) -> float:
    return round(float(value), 4)


def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def add_camera(name: str, location: tuple[float, float, float], target: tuple[float, float, float], lens: float):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.sensor_fit = "VERTICAL"
    data.sensor_height = 36.0
    data.clip_start = 0.1
    data.clip_end = 400.0
    cam = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = location
    direction = Vector(target) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return cam


def project(scene, cam, point) -> tuple[float, float, float]:
    """Project a world point to (x, y_top_down, view_depth) normalized coords."""
    co = world_to_camera_view(scene, cam, Vector(point))
    return co.x, 1.0 - co.y, co.z


def floor_y_for_screen(scene, cam, screen_y: float) -> float:
    """Bisect the world floor distance whose projection lands on screen_y."""
    near, far = -20.0, 200.0
    for _ in range(60):
        mid = (near + far) / 2
        _, y, _ = project(scene, cam, (0.0, mid, 0.0))
        if y > screen_y:
            near = mid
        else:
            far = mid
    return (near + far) / 2


def floor_x_for_screen(scene, cam, world_y: float, screen_x: float) -> float:
    left, right = -60.0, 60.0
    for _ in range(60):
        mid = (left + right) / 2
        x, _, _ = project(scene, cam, (mid, world_y, 0.0))
        if x < screen_x:
            left = mid
        else:
            right = mid
    return (left + right) / 2


def build_stage(scene) -> dict:
    scene.render.resolution_x, scene.render.resolution_y = STAGE_RES
    scene.render.resolution_percentage = 100
    cam = add_camera("StageCamera", (0.0, -6.0, 6.5), (0.0, 10.0, 0.0), 24.0)
    scene.camera = cam
    bpy.context.view_layer.update()

    fov_y = 2 * math.degrees(math.atan(cam.data.sensor_height / 2 / cam.data.lens))
    horizon_x, horizon_y, _ = project(scene, cam, (0.0, 5000.0, 0.0))

    # Fit the Blender floor so the five lanes span LANE_SPAN at the hit line.
    hit_world_y = floor_y_for_screen(scene, cam, HIT_LINE_Y)
    left_world = floor_x_for_screen(scene, cam, hit_world_y, LANE_SPAN[0])
    right_world = floor_x_for_screen(scene, cam, hit_world_y, LANE_SPAN[1])
    lane_width = (right_world - left_world) / 5

    # Real floor rail meshes: six lane boundaries running into depth.
    rails = []
    far_y = hit_world_y + 70.0
    mesh = bpy.data.meshes.new("Rails")
    verts, edges = [], []
    for index in range(6):
        x = left_world + lane_width * index
        near = (x, hit_world_y - 2.0, 0.0)
        far = (x, far_y, 0.0)
        verts.extend([near, far])
        edges.append((index * 2, index * 2 + 1))
        x0, y0, _ = project(scene, cam, near)
        x1, y1, _ = project(scene, cam, far)
        rails.append({"x0": r4(x0), "y0": r4(y0), "x1": r4(x1), "y1": r4(y1)})
    mesh.from_pydata(verts, edges, [])
    rail_obj = bpy.data.objects.new("Rails", mesh)
    scene.collection.objects.link(rail_obj)

    # Floor rungs at uniform world spacing; renderer scrolls between them.
    rungs = []
    for index in range(RUNG_COUNT):
        world_y = hit_world_y + index * RUNG_SPACING
        lx, ly, depth = project(scene, cam, (left_world, world_y, 0.0))
        rx, _, _ = project(scene, cam, (right_world, world_y, 0.0))
        rungs.append({"y": r4(ly), "left": r4(lx), "right": r4(rx), "depth": r4(depth)})

    # Tunnel rings: real torus objects on the corridor, sampled as polygons.
    ring_center_z = 4.2
    ring_radius = (right_world - left_world) * 0.62
    rings = []
    for index in range(RING_COUNT):
        world_y = hit_world_y + 6.0 + index * RING_SPACING
        bpy.ops.mesh.primitive_torus_add(
            major_radius=ring_radius,
            minor_radius=0.05,
            major_segments=RING_POINTS,
            minor_segments=6,
            location=(0.0, world_y, ring_center_z),
            rotation=(math.radians(90), 0.0, 0.0),
        )
        points = []
        depth = 0.0
        for step in range(RING_POINTS):
            angle = step / RING_POINTS * math.tau
            world = (math.cos(angle) * ring_radius, world_y, ring_center_z + math.sin(angle) * ring_radius)
            x, y, depth = project(scene, cam, world)
            points.extend([r4(x), r4(y)])
        rings.append({"depth": r4(depth), "points": points})

    # Space layers: star fields at three depth bands behind the stage.
    rng = random.Random(SEED)
    layers = []
    for name, near_d, far_d, parallax, count in (
        ("near", 18.0, 34.0, 1.0, 26),
        ("mid", 34.0, 70.0, 0.55, 40),
        ("far", 70.0, 160.0, 0.22, 56),
    ):
        points = []
        for _ in range(count):
            wy = hit_world_y + rng.uniform(near_d, far_d)
            wx = rng.uniform(-1.0, 1.0) * wy * 0.55
            wz = rng.uniform(1.5, wy * 0.9)
            x, y, depth = project(scene, cam, (wx, wy, wz))
            if 0.0 <= x <= 1.0 and 0.0 <= y <= HIT_LINE_Y:
                size = max(0.35, min(2.6, 34.0 / depth))
                points.extend([r4(x), r4(y), r4(size)])
        layers.append({"name": name, "parallax": parallax, "points": points})

    return {
        "camera": {
            "lensMm": cam.data.lens,
            "sensorHeightMm": cam.data.sensor_height,
            "fovYDeg": r4(fov_y),
            "position": [r4(v) for v in cam.location],
            "target": [0.0, 10.0, 0.0],
            "horizon": [r4(horizon_x), r4(horizon_y)],
        },
        "hitLineY": HIT_LINE_Y,
        "laneSpan": list(LANE_SPAN),
        "rails": rails,
        "rungs": rungs,
        "rings": rings,
        "layers": layers,
    }


def build_mv(scene) -> dict:
    """City block field seen from an MV camera; exported as silhouettes."""
    scene.render.resolution_x, scene.render.resolution_y = MV_RES
    cam = add_camera("MvCamera", (0.0, -14.0, 3.2), (0.0, 30.0, 5.0), 30.0)
    scene.camera = cam
    bpy.context.view_layer.update()
    rng = random.Random(SEED + 1)
    towers = []
    for row, (distance, count) in enumerate(((22.0, 9), (36.0, 12), (58.0, 15))):
        spread = distance * 0.72
        for index in range(count):
            x = -spread + (index + 0.5) * (spread * 2 / count) + rng.uniform(-0.6, 0.6)
            width = spread * 2 / count * rng.uniform(0.55, 0.85)
            height = rng.uniform(2.0, 7.5) * (1.0 + row * 0.55)
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x, distance, height / 2))
            bpy.context.object.scale = (width, 1.5, height)
            lx, base, depth = project(scene, cam, (x - width / 2, distance, 0.0))
            rx, _, _ = project(scene, cam, (x + width / 2, distance, 0.0))
            _, top, _ = project(scene, cam, (x, distance, height))
            towers.append({
                "x": r4((lx + rx) / 2),
                "w": r4(rx - lx),
                "top": r4(top),
                "base": r4(base),
                "layer": row,
                "depth": r4(depth),
            })
    towers.sort(key=lambda item: -item["depth"])
    _, horizon_y, _ = project(scene, cam, (0.0, 5000.0, 0.0))
    return {"horizonY": r4(horizon_y), "towers": towers[:36]}


def main() -> None:
    random.seed(SEED)
    clear_scene()
    scene = bpy.context.scene
    stage = build_stage(scene)
    mv = build_mv(scene)
    payload = {
        "version": 7,
        "generator": f"Blender {bpy.app.version_string} headless",
        "seed": SEED,
        "aspect": STAGE_RES[0] / STAGE_RES[1],
        "stage": stage,
        "mv": mv,
    }
    body = json.dumps(payload, ensure_ascii=False, indent=1)
    OUTPUT.write_text(
        "// Generated by tools/art/blender/export_stage_geometry.py (Blender headless). Do not edit by hand.\n"
        "// Numeric camera/perspective data only. The runtime renderers draw these shapes in code.\n"
        f"export const stageGeometry = {body} as const;\n"
        "export type StageGeometry = typeof stageGeometry;\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
