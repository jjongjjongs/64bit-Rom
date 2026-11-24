LM-01 (FN Minimi) model: the player's upload (lmg.zip: source/minimi.fbx + textures/minimi*.png, made in Cinema 4D R23).
1. Textures to 1024 px: c.jpg = Color x AO, mr.jpg = (255, Roughness, Metallic), n.jpg = Normal.
2. Serve this folder with three.min.js, fflate.min.js, NURBSUtils.js, NURBSCurve.js, FBXLoader.js, GLTFExporter.js (three r128
   examples/js), minimi.fbx and tex/, then run conv.py <out.glb>: it loads the FBX, turns it into gun space (+X muzzle, +Y up,
   +Z the gun's right, metres) and exports glb with the part names kept.
