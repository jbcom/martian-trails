# Blender headless FBX→GLB converter.
# Usage: blender --background --python scripts/fbx-to-glb.py -- <in.fbx> <out.glb>
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
src, dst = argv[0], argv[1]

# Clean the default scene.
bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.fbx(filepath=src)

# Export as a self-contained binary glTF (textures embedded).
bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
)
print(f"converted {src} -> {dst}")
