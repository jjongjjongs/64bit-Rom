// assets.js — scanned textures, prop models and the soldier, loaded once before the first match.
// The files live next to the page under a/ (see web/fetch_assets.py). If they are missing (a browser preview, a broken
// download) everything falls back to the painted textures and built shapes, so the game still runs.
(function () {
  var T = THREE, A = SV.assets = { tex: {}, model: {}, box: {}, hdr: {}, art: {}, soldier: null, hand: null, scan: null, ready: false, base: 'a/' };
  SV.preload = function (onProg, done) {
    if (!T.GLTFLoader) { A.ready = true; done(); return; }
    var fl = new T.FileLoader(), tl = new T.TextureLoader(), gl = new T.GLTFLoader(), total = 1, got = 0, fin = false;
    function step() { got++; if (onProg) onProg(Math.min(1, got / total)); if (got >= total && !fin) { fin = true; A.ready = true; done(); } }
    fl.load(A.base + 'manifest.json', function (txt) {
      var m = JSON.parse(txt), k;
      for (k in m.tex) (function (k, t) {
        var o = A.tex[k] = {};
        ['diff', 'nor', 'arm'].forEach(function (w) { if (!t[w]) return; total++; o[w] = tl.load(A.base + t[w], step, undefined, function () { delete o[w]; step(); }); o[w].wrapS = o[w].wrapT = T.RepeatWrapping; o[w].anisotropy = 8; if (w === 'diff') o[w].encoding = T.sRGBEncoding; });
      })(k, m.tex[k]);
      for (k in m.model) (function (k) { total++; gl.load(A.base + m.model[k], function (g) { g.scene.updateMatrixWorld(true); A.model[k] = g.scene; A.box[k] = new T.Box3().setFromObject(g.scene); step(); }, undefined, step); })(k);
      if (T.RGBELoader) for (k in (m.hdr || {})) (function (k) { total++; new T.RGBELoader().setDataType(T.HalfFloatType).load(A.base + m.hdr[k], function (tx) { tx.minFilter = tx.magFilter = T.LinearFilter; tx.wrapS = T.RepeatWrapping; tx.generateMipmaps = false; A.hdr[k] = tx; step(); }, undefined, step); })(k);
      // the soldier's repainted skins (camouflage per team) and the model's own normal map; glTF textures are not flipped
      ['soldier_A', 'soldier_B', 'soldier_nrm'].forEach(function (n) { total++; var t = tl.load(A.base + 'art/' + n + '.jpg', function () { A.art[n] = t; step(); }, undefined, step); t.flipY = false; t.anisotropy = 4; if (n !== 'soldier_nrm') t.encoding = T.sRGBEncoding; });
      total++; gl.load(A.base + 'soldier.glb', function (g) { A.soldier = g; step(); }, undefined, step);
      /* first-person arms and gun in one animated model each ("fps animated ..." packs by DJMaesen, CC BY 4.0, as prepared for Bayou Protocol) */
      total++; gl.load(A.base + 'art/tp/anim.glb', function (g) { A.tpAnim = g; step(); }, undefined, step);   /* soldiers' rifle-holding motions */
      A.fp = {}; if (window.MeshoptDecoder) { gl.setMeshoptDecoder(MeshoptDecoder); ['carbine', 'hornet', 'sniper', 'mauler', 'striker', 'kestrel', 'kodiak'].forEach(function (n) { total++; gl.load(A.base + 'art/fp/' + n + '.glb', function (g) { A.fp[n] = g; step(); }, undefined, step); }); }
      total++; gl.load(A.base + 'art/hand.glb', function (g) { A.hand = g; step(); }, undefined, step);   // a real hand mesh for the first-person gloves
      step();
    }, undefined, function () { A.ready = true; done(); });
  };
})();
