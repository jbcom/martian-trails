# Finalize a meshy/high-res GLB for the web: downscale textures, recenter on
# X/Z + drop to ground Z==0, re-export a compact JPEG-textured GLB.
#
# Usage: blender --background --python scripts/finalize-glb.py -- <in.glb> <out.glb> [max_tex]
import sys

import bpy
import mathutils

argv = sys.argv[sys.argv.index("--") + 1 :]
src, dst = argv[0], argv[1]
max_tex = int(argv[2]) if len(argv) > 2 else 512

bpy.ops.wm.read_homefile(use_empty=True, use_factory_startup=True)
bpy.ops.import_scene.gltf(filepath=src)

# Downscale textures for web weight + the low-res PSX look.
for img in bpy.data.images:
    if img.size[0] > max_tex or img.size[1] > max_tex:
        img.scale(min(img.size[0], max_tex), min(img.size[1], max_tex))

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]

# Recenter on X/Y, drop the lowest point to Z==0 (Blender Z-up).
mn = [1e30] * 3
mx = [-1e30] * 3
for o in meshes:
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c)
        for i in range(3):
            mn[i] = min(mn[i], w[i])
            mx[i] = max(mx[i], w[i])
shift = mathutils.Vector((-(mn[0] + mx[0]) / 2, -(mn[1] + mx[1]) / 2, -mn[2]))
for o in bpy.context.scene.objects:
    if o.parent is None:
        o.location += shift
bpy.context.view_layer.update()

# The glTF exporter reads context.active_object; set it explicitly (headless).
if meshes:
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_image_format="JPEG",
)
import os

print(f"finalized {dst} ({round(os.path.getsize(dst) / 1024)} KB)")
