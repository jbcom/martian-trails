# Blender headless FBX->GLB converter for the PSX asset pipeline.
#
# Usage:
#   blender --background --python scripts/fbx-to-glb.py -- <in.fbx> <out.glb> [texture.png]
#
# PSX FBX packs ship the model and its texture separately (model in Assets/,
# texture in a sibling Textures/ folder), and the FBX material rarely resolves the
# texture path, so a plain import comes in untextured (flat grey). When a texture
# path is given we BUILD a material with that image as the unlit base color (PSX
# look: textures carry all the shading), unlit + nearest-neighbour filtering for
# the crunchy retro feel. Textures are embedded in the exported GLB.
#
# We also normalise each prop: PSX packs author props at arbitrary scene offsets,
# so we recentre on X/Y and drop the lowest point to Z==0 (rests on the ground).
import sys

import bpy
import mathutils

argv = sys.argv[sys.argv.index("--") + 1 :]
src, dst = argv[0], argv[1]
texture = argv[2] if len(argv) > 2 else None

# Clean the default scene.
bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.fbx(filepath=src)
bpy.context.view_layer.update()

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]

# Build + assign a textured material when a texture file is supplied.
if texture:
    img = bpy.data.images.load(texture, check_existing=True)
    mat = bpy.data.materials.new(name="psx")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    tex = nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Closest"  # nearest-neighbour — crunchy PSX texels

    # Emission so the low-res texture reads at full strength regardless of scene
    # lighting (PSX models bake their look into the texture).
    emit = nodes.new("ShaderNodeEmission")
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(tex.outputs["Color"], emit.inputs["Color"])
    links.new(emit.outputs["Emission"], out.inputs["Surface"])

    for obj in meshes:
        obj.data.materials.clear()
        obj.data.materials.append(mat)

# Recentre on X/Y and drop the lowest point to Z==0 (Blender Z-up).
mins = [1e30, 1e30, 1e30]
maxs = [-1e30, -1e30, -1e30]
for obj in meshes:
    for corner in obj.bound_box:
        world = obj.matrix_world @ mathutils.Vector(corner)
        for i in range(3):
            mins[i] = min(mins[i], world[i])
            maxs[i] = max(maxs[i], world[i])

shift = mathutils.Vector(
    (-(mins[0] + maxs[0]) / 2.0, -(mins[1] + maxs[1]) / 2.0, -mins[2])
)
for obj in bpy.context.scene.objects:
    if obj.parent is None:
        obj.location += shift

bpy.context.view_layer.update()

# Export a self-contained binary glTF (textures embedded), Y-up for the web.
bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
)
print(f"converted {src} -> {dst}" + (f" [tex {texture}]" if texture else " [no tex]"))
