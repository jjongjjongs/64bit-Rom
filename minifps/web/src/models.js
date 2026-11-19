// models.js — weapons and soldiers assembled from boxes and cylinders, then merged into one vertex-coloured geometry each.
var SV = window.SV = window.SV || {};
(function () {
  var T = THREE, PI = Math.PI;
  function mk(c) { return new T.MeshBasicMaterial({ color: c }); }
  function camo(a, b, c) { var m = mk(a); m.userData.camo = [new T.Color(a), new T.Color(b), new T.Color(c)]; return m; }
  var MAT = { steel: mk(0x2c3136), dark: mk(0x15181b), bright: mk(0x6f7a82), poly: mk(0x2b3035), poly2: mk(0x1a1d20), rubber: mk(0x0e1012),
    wood: mk(0x7a4a26), wood2: mk(0x5c3619), accent: mk(0xffb347), brass: mk(0xb08a3c), red: mk(0xb23a2a), lens: mk(0xffb347), glass: mk(0x1c4a60),
    olive: mk(0x4b5a3a), glove: mk(0x2a2823), fde: mk(0x8a7858), fde2: mk(0x6e5f45), band: mk(0xc9a227), skin: mk(0xb98a66),
    sleeveA: camo(0x8a7a58, 0x6b5d40, 0x4d4733), sleeveB: camo(0x5d6a70, 0x44525a, 0x2c363d) };

  function kit(g) {
    function add(geo, mat, x, y, z, rx, ry, rz) { var m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; }
    return {
      b: function (w, h, d, mat, x, y, z, rx, ry, rz) { return add(new T.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz); },
      cx: function (r, len, mat, x, y, z, seg, r2) { return add(new T.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 8), mat, x, y, z, 0, 0, -PI / 2); },
      cy: function (r, len, mat, x, y, z, seg) { return add(new T.CylinderGeometry(r, r, len, seg || 8), mat, x, y, z); },
      cz: function (r, len, mat, x, y, z, seg) { return add(new T.CylinderGeometry(r, r, len, seg || 8), mat, x, y, z, PI / 2, 0, 0); },
      s: function (r, mat, x, y, z, sx, sy, sz, seg) { var m = add(new T.SphereGeometry(r, seg || 10, 8), mat, x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); return m; },
      add: add
    };
  }
  function rail(k, x0, x1, y, w) { k.b(x1 - x0, .008, w, MAT.dark, (x0 + x1) / 2, y, 0); for (var x = x0 + .01; x < x1; x += .03) k.b(.014, .007, w + .004, MAT.steel, x, y + .007, 0); }
  function guard(k, x, y) { k.b(.07, .006, .016, MAT.dark, x, y - .045, 0); k.b(.006, .045, .016, MAT.dark, x + .035, y - .024, 0); k.b(.008, .03, .008, MAT.bright, x - .008, y - .02, 0, 0, 0, .25); }

  // every gun: +X is the muzzle, +Y up. `grip` and `fore` are hand positions, `muzzle` the barrel tip, `sight` the aiming line height.
  var GUN = {};
  GUN.rifle = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    k.b(.27, .058, .048, m.steel, 0, .03, 0); k.b(.21, .05, .044, m.poly, -.02, -.022, 0); k.b(.07, .028, .003, m.dark, .03, .034, .0245);
    k.b(.04, .016, .05, m.dark, -.125, .062, 0); k.b(.3, .058, .056, m.poly, .285, .03, 0);
    for (var i = 0; i < 6; i++) k.b(.028, .012, .06, m.dark, .17 + i * .045, .03, 0);
    rail(k, -.13, .43, .064, .026);
    k.cx(.011, .2, m.steel, .53, .03, 0); k.b(.022, .05, .024, m.dark, .47, .05, 0); k.b(.006, .03, .006, m.bright, .47, .088, 0); k.cx(.017, .055, m.dark, .655, .03, 0);
    k.b(.07, .014, .034, m.dark, 0, .08, 0); k.b(.06, .008, .05, m.dark, 0, .135, 0); k.b(.06, .05, .006, m.dark, 0, .11, .022); k.b(.06, .05, .006, m.dark, 0, .11, -.022);
    k.b(.06, .1, .028, m.poly2, .045, -.095, 0, 0, 0, .12); k.b(.06, .09, .028, m.poly2, .064, -.18, 0, 0, 0, .3); k.b(.066, .012, .032, m.fde, .078, -.226, 0, 0, 0, .3);
    k.b(.046, .115, .036, m.rubber, -.105, -.095, 0, 0, 0, -.32); guard(k, -.045, -.04);
    k.cx(.017, .2, m.steel, -.235, .03, 0); k.b(.17, .075, .04, m.poly, -.29, .008, 0); k.b(.022, .125, .046, m.rubber, -.385, -.005, 0); k.b(.05, .012, .042, m.fde, -.25, .048, 0);
    // ejection port, charging handle, bolt release, angled foregrip, light, ported brake, sling loop
    k.b(.06, .024, .003, m.rubber, .01, .034, -.0245); k.b(.034, .012, .034, m.dark, -.148, .052, 0); k.b(.014, .02, .004, m.bright, -.03, .012, .0245);
    k.b(.1, .034, .03, m.poly2, .27, -.012, 0, 0, 0, -.2); k.cx(.015, .075, m.dark, .385, .03, .046, 10); k.cx(.016, .006, m.bright, .424, .03, .046, 10); k.b(.03, .014, .02, m.dark, .385, .03, .03);
    k.b(.01, .012, .04, m.rubber, .64, .03, 0); k.b(.01, .012, .04, m.rubber, .665, .03, 0); k.b(.012, .03, .006, m.steel, -.2, -.02, .022);
    k.cx(.033, .3, m.poly, .285, .03, 0, 8); k.b(.06, .02, .05, m.fde2, -.3, -.03, 0);
    return { g: g, grip: [-.105, -.11], fore: [.27, -.02], muzzle: [.69, .03], sight: .11 };
  };
  GUN.smg = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    k.b(.3, .07, .046, m.poly, 0, .02, 0); k.b(.3, .02, .05, m.steel, 0, .058, 0); k.b(.06, .024, .003, m.dark, .02, .03, .0235); rail(k, -.13, .13, .072, .024);
    k.cx(.02, .11, m.dark, .205, .028, 0); for (var i = 0; i < 3; i++) k.b(.016, .044, .02, m.steel, .17 + i * .03, .028, 0); k.cx(.009, .05, m.steel, .28, .028, 0);
    k.b(.012, .02, .005, m.dark, -.1, .093, .011); k.b(.012, .02, .005, m.dark, -.1, .093, -.011); k.b(.006, .03, .005, m.bright, .11, .098, 0);
    k.b(.036, .2, .026, m.poly2, .05, -.115, 0); k.b(.042, .012, .03, m.fde, .05, -.22, 0); k.b(.044, .11, .034, m.rubber, -.07, -.07, 0, 0, 0, -.22); guard(k, -.01, -.015);
    k.b(.034, .085, .03, m.rubber, .165, -.05, 0);
    k.b(.2, .01, .01, m.steel, -.25, .045, .016); k.b(.2, .01, .01, m.steel, -.25, .045, -.016); k.b(.012, .11, .046, m.rubber, -.352, 0, 0);
    k.b(.05, .02, .003, m.rubber, .03, .034, -.0235); k.b(.02, .014, .012, m.bright, -.06, .05, .026); k.b(.01, .014, .004, m.bright, -.02, .0, .0235);
    k.b(.05, .012, .05, m.rubber, -.352, .05, 0); k.b(.05, .012, .05, m.rubber, -.352, -.05, 0);
    return { g: g, grip: [-.07, -.085], fore: [.165, -.07], muzzle: [.31, .028], sight: .118 };
  };
  GUN.sniper = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    k.b(.42, .06, .05, m.poly, 0, 0, 0); k.b(.3, .04, .044, m.steel, .03, .045, 0); k.b(.3, .03, .056, m.poly2, .33, -.008, 0);
    k.cx(.014, .62, m.steel, .52, .045, 0, 8, .011); k.b(.07, .034, .04, m.dark, .86, .045, 0);
    k.cz(.007, .05, m.bright, -.1, .04, -.06); k.add(new T.IcosahedronGeometry(.016, 0), m.dark, -.1, .03, -.09);
    rail(k, -.1, .16, .07, .024); k.b(.02, .04, .03, m.dark, -.04, .095, 0); k.b(.02, .04, .03, m.dark, .09, .095, 0);
    k.cx(.02, .3, m.dark, .03, .125, 0, 10); k.cx(.02, .08, m.dark, .21, .125, 0, 10, .034); k.cx(.03, .06, m.dark, -.15, .125, 0, 10, .02);
    k.cx(.03, .004, m.glass, .252, .125, 0, 10); k.cy(.014, .03, m.steel, .03, .158, 0);
    k.b(.05, .075, .03, m.poly2, .06, -.065, 0); guard(k, -.06, -.02); k.b(.046, .12, .036, m.rubber, -.13, -.085, 0, 0, 0, -.28);
    k.b(.26, .03, .04, m.poly, -.33, .01, 0); k.b(.22, .028, .036, m.poly, -.33, -.085, 0, 0, 0, .12); k.b(.026, .14, .046, m.rubber, -.47, -.03, 0); k.b(.13, .03, .042, m.fde, -.32, .04, 0);
    k.cx(.008, .2, m.dark, .47, -.05, .02, 6); k.cx(.008, .2, m.dark, .47, -.05, -.02, 6); k.b(.03, .03, .06, m.dark, .38, -.035, 0);   // folded bipod
    k.cz(.012, .03, m.steel, .03, .125, .03); k.b(.012, .02, .05, m.rubber, .86, .045, 0); k.b(.012, .02, .05, m.rubber, .885, .045, 0); k.b(.1, .012, .044, m.rubber, -.33, .032, 0);
    return { g: g, grip: [-.13, -.1], fore: [.3, -.04], muzzle: [.9, .045], sight: .125 };
  };
  GUN.shotgun = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    k.b(.24, .075, .044, m.steel, 0, 0, 0); k.b(.09, .03, .003, m.dark, .01, .005, .0225);
    k.cx(.015, .52, m.steel, .38, .02, 0); k.cx(.013, .4, m.dark, .32, -.016, 0); k.b(.02, .05, .03, m.dark, .5, .003, 0); k.b(.008, .014, .008, m.brass, .625, .04, 0);
    k.b(.17, .05, .052, m.wood, .25, -.016, 0); for (var i = 0; i < 6; i++) k.b(.008, .054, .056, m.wood2, .185 + i * .026, -.016, 0);
    guard(k, -.08, -.02); k.b(.1, .06, .04, m.wood, -.16, -.03, 0, 0, 0, .35); k.b(.22, .075, .04, m.wood, -.31, -.055, 0, 0, 0, .12); k.b(.024, .13, .046, m.rubber, -.43, -.075, 0, 0, 0, .12);
    k.b(.13, .04, .008, m.poly2, 0, 0, -.027); for (var j = 0; j < 4; j++) k.cy(.011, .05, m.red, -.045 + j * .03, .005, -.04, 6);
    k.b(.3, .012, .04, m.dark, .33, .04, 0); for (var q = 0; q < 7; q++) k.b(.016, .014, .004, m.rubber, .21 + q * .04, .04, .0205); k.b(.012, .03, .006, m.steel, .52, -.03, 0); k.b(.012, .03, .006, m.steel, -.36, -.11, 0);
    return { g: g, grip: [-.15, -.06], fore: [.25, -.04], muzzle: [.65, .02], sight: .054 };
  };
  GUN.pistol = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    k.b(.2, .034, .03, m.steel, .02, .03, 0); for (var i = 0; i < 6; i++) k.b(.006, .028, .033, m.dark, -.06 + i * .011, .03, 0);
    k.b(.175, .024, .028, m.poly, .02, .003, 0); k.b(.06, .01, .022, m.dark, .08, -.014, 0); k.cx(.007, .012, m.bright, .125, .03, 0);
    k.b(.008, .01, .005, m.bright, .11, .052, 0); k.b(.008, .012, .005, m.dark, -.07, .052, .008); k.b(.008, .012, .005, m.dark, -.07, .052, -.008);
    k.b(.048, .12, .03, m.poly, -.045, -.065, 0, 0, 0, -.22); k.b(.05, .012, .034, m.fde, -.062, -.128, 0, 0, 0, -.22); guard(k, .012, 0);
    k.b(.045, .016, .003, m.rubber, .04, .036, -.0155); k.b(.07, .008, .024, m.dark, .075, -.02, 0); k.b(.012, .02, .012, m.dark, -.085, .04, 0); k.b(.004, .02, .006, m.bright, .005, -.014, 0, 0, 0, .3);
    for (var q = 0; q < 5; q++) k.b(.036, .004, .032, m.rubber, -.05 - q * .004, -.035 - q * .018, 0, 0, 0, -.22);
    return { g: g, grip: [-.045, -.08], fore: [-.03, -.1], muzzle: [.13, .03], sight: .063 };
  };
  GUN.knife = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    var sh = new T.Shape(); sh.moveTo(0, -.016); sh.lineTo(.12, -.018); sh.lineTo(.17, -.004); sh.lineTo(.185, .012); sh.lineTo(.13, .018); sh.lineTo(0, .016); sh.lineTo(0, -.016);
    var blade = new T.ExtrudeGeometry(sh, { depth: .004, bevelEnabled: false }); blade.translate(0, 0, -.002);
    k.add(blade, m.bright, .012, 0, 0); k.b(.012, .056, .014, m.steel, .006, 0, 0); k.cx(.014, .105, m.rubber, -.052, 0, 0); k.cx(.015, .012, m.steel, -.11, 0, 0);
    return { g: g, grip: [-.05, 0], fore: null, muzzle: [.2, 0], sight: .03 };
  };
  GUN.grenade = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    var body = k.add(new T.IcosahedronGeometry(.034, 1), m.olive, 0, 0, 0); body.scale.set(1, 1.18, 1);
    k.cy(.012, .02, m.steel, 0, .048, 0); k.b(.026, .016, .022, m.steel, 0, .064, 0); k.b(.004, .085, .016, m.bright, .034, .03, 0, 0, 0, .16); k.cy(.035, .006, m.band, 0, -.004, 0, 10);
    return { g: g };
  };

  // Flatten a group into one geometry: positions, normals and a colour per vertex.
  function merge(root, shade) {
    root.updateMatrixWorld(true); var P = [], N = [], Cc = [];
    root.traverse(function (o) {
      if (!o.isMesh) return;
      var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      var p = g.attributes.position.array, n = g.attributes.normal.array, c = o.material.color, cm = o.material.userData.camo, k = shade ? .92 + Math.random() * .16 : 1, v;
      for (var i = 0; i < p.length; i += 3) {
        P.push(p[i], p[i + 1], p[i + 2]); N.push(n[i], n[i + 1], n[i + 2]);
        if (cm) { v = Math.sin(p[i] * 23 + p[i + 1] * 31) + Math.sin(p[i + 1] * 27 + p[i + 2] * 37 + 1.3) + Math.sin(p[i + 2] * 21 - p[i] * 29 + 2.1); c = cm[v > .7 ? 1 : v < -.9 ? 2 : 0]; }
        Cc.push(c.r * k, c.g * k, c.b * k);
      }
      g.dispose();
    });
    var out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); out.setAttribute('color', new T.Float32BufferAttribute(Cc, 3));
    return out;
  }
  SV.merge = merge; SV.GUN = GUN; SV.kit = kit; SV.mk = mk;
  SV.litMat = new T.MeshLambertMaterial({ vertexColors: true });

  // A limb: a tapered tube between two points with a ball at the far joint.
  function tube(g, a, b, r0, r1, mat) {
    var dir = new T.Vector3().subVectors(b, a), len = dir.length(), mesh = new T.Mesh(new T.CylinderGeometry(r1, r0, len, 10, 4), mat);
    mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize()); g.add(mesh);
  }
  function ball(g, p, r, mat, sx, sy, sz) { var m = new T.Mesh(new T.SphereGeometry(r, 12, 9), mat); m.position.copy(p); m.scale.set(sx || 1, sy || 1, sz || 1); g.add(m); return m; }

  // First-person weapon: the gun plus two gloved hands and sleeves.
  SV.viewModel = function (id, team) {
    var d = GUN[id](), g = d.g, k = kit(g), sl = team === 'A' ? MAT.sleeveA : MAT.sleeveB, V = function (x, y, z) { return new T.Vector3(x, y, z); }, i;
    var h1 = V(d.grip[0], d.grip[1], .012); ball(g, V(h1.x - .012, h1.y, h1.z + .012), .036, MAT.glove, 1, 1.25, .8);                      // palm behind the grip
    for (i = 0; i < 4; i++) k.cz(.0105, .062, MAT.glove, h1.x + .026 - i * .004, h1.y + .032 - i * .021, h1.z - .012, 6);                   // fingers round the front
    tube(g, V(h1.x - .02, h1.y + .04, h1.z + .02), V(h1.x + .03, h1.y + .055, h1.z - .005), .012, .011, MAT.glove); k.b(.03, .05, .012, MAT.poly2, h1.x - .03, h1.y + .01, h1.z + .034);   // thumb, knuckle guard
    tube(g, V(h1.x - .02, h1.y - .02, h1.z + .03), V(h1.x - .1, h1.y - .13, h1.z + .3), .038, .052, sl); tube(g, V(h1.x - .016, h1.y - .012, h1.z + .026), V(h1.x - .034, h1.y - .04, h1.z + .08), .04, .041, MAT.glove);
    if (d.fore) {
      var h2 = V(d.fore[0], d.fore[1], -.01); ball(g, V(h2.x, h2.y - .012, h2.z), .036, MAT.glove, 1.35, .7, 1);                               // palm under the fore-end
      for (i = 0; i < 4; i++) k.cy(.0105, .06, MAT.glove, h2.x + .034 - i * .022, h2.y + .022, h2.z + .034, 6);                               // fingers up the far side
      tube(g, V(h2.x - .01, h2.y, h2.z - .02), V(h2.x + .03, h2.y + .035, h2.z - .034), .012, .011, MAT.glove);
      tube(g, V(h2.x - .03, h2.y - .02, h2.z - .03), V(h2.x - .22, h2.y - .12, h2.z - .3), .038, .052, sl); tube(g, V(h2.x - .024, h2.y - .016, h2.z - .024), V(h2.x - .06, h2.y - .036, h2.z - .08), .04, .041, MAT.glove);
    }
    var mesh = new T.Mesh(merge(g), SV.litMat); mesh.userData = { muzzle: d.muzzle, sight: d.sight }; return mesh;
  };

  // Third-person soldier, built from tubes and balls so limbs and helmet read as round. Faces +Z, feet at y = 0.
  // Returns { root, legL, legR } with the legs pivoting at the hip.
  function arm(g, S, Tg, bend, cloth, glove, band) {
    var L = .31, v = new T.Vector3().subVectors(Tg, S), d = Math.min(v.length(), L * 2 - .01); v.normalize();
    var h = Math.sqrt(Math.max(L * L - d * d / 4, 0)), perp = bend.clone().addScaledVector(v, -bend.dot(v)).normalize();
    var E = S.clone().addScaledVector(v, d / 2).addScaledVector(perp, h), H = S.clone().addScaledVector(v, d);
    ball(g, S, .078, cloth, 1, 1, 1); tube(g, S, E, .064, .052, cloth); ball(g, E, .054, cloth); tube(g, E, H, .05, .04, cloth);
    tube(g, S.clone().lerp(E, .3), S.clone().lerp(E, .48), .066, .063, band);                                   // team armband
    ball(g, E, .05, glove, 1.1, 1.1, .8); tube(g, E.clone().lerp(H, .8), H, .043, .044, glove); ball(g, H, .046, glove, 1, 1.15, 1.2);   // elbow pad, cuff, glove
  }
  var cache = {};
  SV.soldier = function (team, gunId) {
    var key = team + gunId, c = cache[key];
    if (!c) {
      var A = team === 'A', tc = A ? 0xffb347 : 0x6cc4e0, cloth = A ? camo(0x8a7a58, 0x6b5d40, 0x4d4733) : camo(0x5d6a70, 0x44525a, 0x2c363d), cloth2 = A ? camo(0x7b6c4c, 0x5e5239, 0x433d2c) : camo(0x525e64, 0x3c4950, 0x283137);
      var gear = mk(A ? 0x5a4f3a : 0x2d3338), gear2 = mk(A ? 0x463d2d : 0x202529), pad = mk(0x1a1c1e), teamM = mk(tc), skin = MAT.skin, hood = mk(0x1d2022), body = new T.Group(), k = kit(body), legs = [new T.Group(), new T.Group()], V = function (x, y, z) { return new T.Vector3(x, y, z); };
      [-1, 1].forEach(function (sx, n) {
        var x = sx * .1, l = legs[n], lk = kit(l);
        tube(l, V(x, .94, 0), V(x, .52, .012), .098, .074, cloth2); ball(l, V(x, .52, .012), .074, cloth2); ball(l, V(x, .52, .055), .066, pad, 1.05, 1.3, .6);            // thigh, knee, knee pad
        lk.b(.075, .11, .05, gear, x + sx * .085, .76, .01);                                                                                                              // cargo pocket
        tube(l, V(x, .52, .012), V(x, .17, 0), .07, .052, cloth2); tube(l, V(x, .24, 0), V(x, .07, 0), .056, .06, pad);                                                    // shin, boot shaft
        ball(l, V(x, .06, .06), .058, pad, 1, .85, 2.1); lk.b(.105, .028, .27, MAT.rubber, x, .014, .05); lk.b(.09, .02, .06, MAT.rubber, x, .034, -.06);                  // boot, sole, heel
        if (sx < 0) { lk.b(.05, .15, .09, gear2, x - .105, .78, .02); lk.b(.03, .05, .05, MAT.steel, x - .11, .87, 0); lk.b(.012, .03, .2, gear2, x - .09, .84, 0); }        // drop-leg holster
        lk = null;
      });
      k.s(.165, cloth2, 0, .96, 0, 1.05, .62, .74); var belt = k.add(new T.CylinderGeometry(.185, .185, .055, 14), gear2, 0, 1.01, 0); belt.scale.z = .72;                    // hips, belt
      k.b(.07, .09, .05, gear, .15, .99, .07); k.b(.06, .1, .05, gear, -.03, .985, -.135); k.b(.09, .08, .05, gear, .09, .985, -.125);                                        // belt pouches
      var torso = k.add(new T.CylinderGeometry(.2, .168, .5, 14, 5), cloth, 0, 1.24, 0); torso.scale.z = .62; k.s(.17, cloth, 0, 1.43, 0, 1.28, .46, .76);                    // torso, shoulders
      var cb = k.add(new T.CylinderGeometry(.205, .19, .24, 14), gear, 0, 1.17, 0); cb.scale.z = .68;                                                                        // cummerbund
      k.b(.27, .3, .045, gear, 0, 1.27, .125); k.s(.135, gear, 0, 1.41, .118, 1, .34, .2); k.b(.27, .3, .045, gear, 0, 1.27, -.125); k.s(.135, gear, 0, 1.41, -.118, 1, .34, .2);   // front and back plates
      [-1, 1].forEach(function (sx) { k.b(.055, .03, .26, gear2, sx * .1, 1.455, 0); });                                                                                     // shoulder straps
      for (var i = -1; i <= 1; i++) { k.b(.072, .13, .04, gear2, i * .085, 1.14, .162); k.b(.05, .04, .026, MAT.dark, i * .085, 1.22, .162); k.b(.072, .014, .044, pad, i * .085, 1.19, .164); }   // magazine pouches, magazines, retention straps
      k.b(.13, .07, .03, gear2, -.04, 1.345, .158); k.b(.062, .04, .008, teamM, .085, 1.35, .152);                                                                           // admin pouch, chest team patch
      k.b(.05, .13, .045, MAT.poly2, .15, 1.3, -.15); k.cy(.006, .3, MAT.dark, .165, 1.5, -.16, 5);                                                                           // radio and antenna
      k.b(.22, .3, .075, gear2, -.02, 1.27, -.185); k.b(.2, .05, .08, gear, -.02, 1.3, -.19); k.b(.12, .06, .008, teamM, -.02, 1.36, -.226);                                  // pack, strap, back team patch
      k.cy(.052, .08, hood, 0, 1.47, 0, 10); k.s(.098, hood, 0, 1.585, 0, .96, 1.14, 1.04);                                                                                    // neck, balaclava
      k.s(.06, skin, 0, 1.6, .058, 1.15, .42, .6); k.b(.13, .03, .02, MAT.poly2, 0, 1.605, .094); k.b(.052, .024, .008, MAT.glass, -.032, 1.605, .105); k.b(.052, .024, .008, MAT.glass, .032, 1.605, .105);   // eyes, glasses
      var helm = k.add(new T.SphereGeometry(.128, 16, 8, 0, PI * 2, 0, PI * .5), cloth2, 0, 1.615, -.008); helm.scale.set(1.02, 1.02, 1.16);
      var hb = k.add(new T.CylinderGeometry(.131, .131, .02, 16), teamM, 0, 1.628, -.008); hb.scale.z = 1.16;                                                                 // helmet band in the team colour
      k.b(.016, .055, .05, cloth2, -.118, 1.6, -.07); k.b(.016, .055, .05, cloth2, .118, 1.6, -.07); k.b(.012, .018, .11, MAT.dark, -.132, 1.625, 0); k.b(.012, .018, .11, MAT.dark, .132, 1.625, 0);   // back of the shell, side rails
      [-1, 1].forEach(function (sx) { k.cx(.042, .04, gear2, sx * .11, 1.575, .005, 10); }); k.b(.24, .012, .02, gear2, 0, 1.69, .0);                                           // headset
      k.b(.046, .04, .03, MAT.dark, 0, 1.69, .128); k.b(.012, .1, .008, pad, -.085, 1.53, .06); k.b(.012, .1, .008, pad, .085, 1.53, .06); k.b(.05, .02, .03, pad, 0, 1.49, .085);   // NVG shroud, chin strap
      // shouldered: the stock sits in the right shoulder (-X), right hand on the grip, left hand under the fore-end
      var d = GUN[gunId](), gx = -.13, gy = 1.385, gz = .3; d.g.rotation.y = -PI / 2; d.g.position.set(gx, gy, gz); body.add(d.g);
      arm(body, V(-.215, 1.4, .01), V(gx - .01, gy + d.grip[1] + .02, gz + d.grip[0]), V(-.5, -1, -.35), cloth, gear2, teamM);
      if (d.fore) arm(body, V(.215, 1.4, .02), V(gx + .01, gy + d.fore[1] - .005, gz + d.fore[0]), V(.25, -1, .1), cloth, gear2, teamM);
      else arm(body, V(.215, 1.4, .02), V(.2, 1.0, .12), V(.3, 0, -1), cloth, gear2, teamM);
      var lg = legs.map(function (l) { var gm = merge(l); gm.translate(0, -.92, 0); return gm; });
      c = cache[key] = { body: merge(body), legL: lg[0], legR: lg[1], muzzle: new T.Vector3(gx, gy + d.muzzle[1], gz + d.muzzle[0]) };
    }
    var root = new T.Group(), b = new T.Mesh(c.body, SV.litMat), l = new T.Mesh(c.legL, SV.litMat), r = new T.Mesh(c.legR, SV.litMat);
    l.position.y = r.position.y = .92; root.add(b); root.add(l); root.add(r);
    return { root: root, legL: l, legR: r, muzzle: c.muzzle };
  };
})();
