hand.glb — "generic-hand" from @webxr-input-profiles/assets (MIT License, Copyright (c) 2019 Amazon).
           https://github.com/immersive-web/webxr-input-profiles
soldier_*.jpg — repainted skins for the three.js example soldier.
fp/*.glb — first-person arms and guns with their animations: the "fps animated ..." models by DJMaesen
           (https://sketchfab.com/bumstrum), CC BY 4.0, in the compressed form prepared for the Bayou Protocol project
           (https://github.com/houstoncardinal/bayou-protocol).

fp/kodiak.glb — "FPS Character Animation Pack Ak-47" by Cristian David Duque Camacho (https://sketchfab.com/DuqueCD7), CC BY 4.0.
  https://sketchfab.com/3d-models/fps-character-animation-pack-ak-47-b95778a564094fc3a49d1d6a3b6a30ab
  Compressed copy (meshopt, WebP textures) taken from the Bayou Protocol project (public/game/models/rig-kodiak-arms.glb).

tp/anim.glb — soldier motions holding a rifle (aim idle, run, walk, fire, reload and others), from Mixamo (Adobe), https://www.mixamo.com.
  Copy taken from the Bayou Protocol project (public/game/characters/animations.glb), which lists them under Mixamo's terms of use.

ui/bg1.jpg, ui/bg2.jpg — menu backdrops: pictures taken inside this game (its own map and soldiers).

maps/resoforge.glb — the "오렌지 야드" map: "Lowpoly FPS TDM Game Map by Resoforge" by Space_One, CC BY 4.0.
  https://sketchfab.com/3d-models/lowpoly-fps-tdm-game-map-by-resoforge-d41a19f699ea421a9aa32b407cb7537b
  Used whole; the game repaints it with its own textures and builds collision from its meshes.

maps/junkyard.glb — the "폐차 야적장" map: "Lowpoly Map Asset by Resoforge" (Sketchfab download "lowpoly-map-asset-by-resoforge").
  Reduced for phones with web/tools/junkyard_prep.js (glTF-Transform): normals and UVs dropped, vertices welded, meshoptimizer simplify
  (1% error; 0.05% for containers and cars), duplicates merged, and the oversized cars shrunk to 0.63 (each pile about its own footing).
  The game draws the yard at 3/4 size and repaints the cars as wrecks (faded paint, rust, dark glass, black tyres).
maps/junkyard.boxes.json — its collision boxes, worked out ahead of time from the reduced model at 3/4 size: a box turned about the
  vertical per small connected part, column boxes (0.4 m) for the big parts, fine columns (0.125 m) for flights of steps, nothing beyond the fence.

ui/maps/m<N>.jpg — the match screen's map pictures, one per entry of SV.MAPS (same order): a view from above taken inside this game
  (walls cut at 2.75 m so rooms show), by the scratch tool that drives the game page. Re-take them when a map changes or moves.

c4.glb — the bomb: "C4 Explosive Device & Detonator Pack" by Fevzi_Beydili (https://sketchfab.com/Fevzi_Beydili), CC BY 4.0.
  https://sketchfab.com/3d-models/c4-explosive-device-detonator-pack-595e719f03d84412b34dc720f31233ef
  Made from the USDZ download with web/tools/c4_usd2glb.py: only the three-charge pack ("Cs_go") is kept; it is laid flat (keypad up),
  scaled so each charge is 28 cm long (an M112 block), textures reduced to 1024/512 px, and the display glass, the lamp button and a short
  piece of each of the three top wires are split off so the game can drive the display, blink the lamp and show wires being cut.

lmg.glb — LM-01, an FN Minimi (M249) light machine gun: model supplied by the player as lmg.zip (FBX + PBR textures, no licence file).
  Its source and licence are still to be confirmed before release. Converted with web/tools/lmg_fbx2glb (textures 1024 px, AO baked in).
