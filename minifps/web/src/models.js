// models.js — weapons and soldiers assembled from boxes and cylinders, then merged into one vertex-coloured geometry each.
var SV = window.SV = window.SV || {};
(function () {
  var T = THREE, PI = Math.PI;
  function mk(c) { return new T.MeshBasicMaterial({ color: c }); }
  var MAT = { steel: mk(0x2c3136), dark: mk(0x15181b), bright: mk(0x6f7a82), poly: mk(0x2b3035), poly2: mk(0x1a1d20), rubber: mk(0x0e1012),
    wood: mk(0x7a4a26), wood2: mk(0x5c3619), accent: mk(0xffb347), brass: mk(0xb08a3c), red: mk(0xb23a2a), lens: mk(0xffb347), glass: mk(0x1c4a60),
    olive: mk(0x4b5a3a), glove: mk(0x121416), sleeveA: mk(0x3d3528), sleeveB: mk(0x26333b) };

  function kit(g) {
    function add(geo, mat, x, y, z, rx, ry, rz) { var m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; }
    return {
      b: function (w, h, d, mat, x, y, z, rx, ry, rz) { return add(new T.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz); },
      cx: function (r, len, mat, x, y, z, seg, r2) { return add(new T.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 8), mat, x, y, z, 0, 0, -PI / 2); },
      cy: function (r, len, mat, x, y, z, seg) { return add(new T.CylinderGeometry(r, r, len, seg || 8), mat, x, y, z); },
      cz: function (r, len, mat, x, y, z, seg) { return add(new T.CylinderGeometry(r, r, len, seg || 8), mat, x, y, z, PI / 2, 0, 0); },
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
    k.b(.06, .1, .028, m.poly2, .045, -.095, 0, 0, 0, .12); k.b(.06, .09, .028, m.poly2, .064, -.18, 0, 0, 0, .3); k.b(.066, .012, .032, m.accent, .078, -.226, 0, 0, 0, .3);
    k.b(.046, .115, .036, m.rubber, -.105, -.095, 0, 0, 0, -.32); guard(k, -.045, -.04);
    k.cx(.017, .2, m.steel, -.235, .03, 0); k.b(.17, .075, .04, m.poly, -.29, .008, 0); k.b(.022, .125, .046, m.rubber, -.385, -.005, 0); k.b(.05, .012, .042, m.accent, -.25, .048, 0);
    return { g: g, grip: [-.105, -.11], fore: [.27, -.02], muzzle: [.69, .03], sight: .11 };
  };
  GUN.smg = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    k.b(.3, .07, .046, m.poly, 0, .02, 0); k.b(.3, .02, .05, m.steel, 0, .058, 0); k.b(.06, .024, .003, m.dark, .02, .03, .0235); rail(k, -.13, .13, .072, .024);
    k.cx(.02, .11, m.dark, .205, .028, 0); for (var i = 0; i < 3; i++) k.b(.016, .044, .02, m.steel, .17 + i * .03, .028, 0); k.cx(.009, .05, m.steel, .28, .028, 0);
    k.b(.012, .034, .03, m.dark, -.1, .1, 0); k.b(.012, .03, .008, m.bright, .11, .098, 0);
    k.b(.036, .2, .026, m.poly2, .05, -.115, 0); k.b(.042, .012, .03, m.accent, .05, -.22, 0); k.b(.044, .11, .034, m.rubber, -.07, -.07, 0, 0, 0, -.22); guard(k, -.01, -.015);
    k.b(.034, .085, .03, m.rubber, .165, -.05, 0);
    k.b(.2, .01, .01, m.steel, -.25, .045, .016); k.b(.2, .01, .01, m.steel, -.25, .045, -.016); k.b(.012, .11, .046, m.rubber, -.352, 0, 0);
    return { g: g, grip: [-.07, -.085], fore: [.165, -.07], muzzle: [.31, .028], sight: .105 };
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
    k.b(.26, .03, .04, m.poly, -.33, .01, 0); k.b(.22, .028, .036, m.poly, -.33, -.085, 0, 0, 0, .12); k.b(.026, .14, .046, m.rubber, -.47, -.03, 0); k.b(.13, .03, .042, m.accent, -.32, .04, 0);
    return { g: g, grip: [-.13, -.1], fore: [.3, -.04], muzzle: [.9, .045], sight: .125 };
  };
  GUN.shotgun = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    k.b(.24, .075, .044, m.steel, 0, 0, 0); k.b(.09, .03, .003, m.dark, .01, .005, .0225);
    k.cx(.015, .52, m.steel, .38, .02, 0); k.cx(.013, .4, m.dark, .32, -.016, 0); k.b(.02, .05, .03, m.dark, .5, .003, 0); k.b(.008, .014, .008, m.brass, .625, .04, 0);
    k.b(.17, .05, .052, m.wood, .25, -.016, 0); for (var i = 0; i < 6; i++) k.b(.008, .054, .056, m.wood2, .185 + i * .026, -.016, 0);
    guard(k, -.08, -.02); k.b(.1, .06, .04, m.wood, -.16, -.03, 0, 0, 0, .35); k.b(.22, .075, .04, m.wood, -.31, -.055, 0, 0, 0, .12); k.b(.024, .13, .046, m.rubber, -.43, -.075, 0, 0, 0, .12);
    k.b(.13, .04, .008, m.poly2, 0, 0, -.027); for (var j = 0; j < 4; j++) k.cy(.011, .05, m.red, -.045 + j * .03, .005, -.04, 6);
    return { g: g, grip: [-.15, -.06], fore: [.25, -.04], muzzle: [.65, .02], sight: .05 };
  };
  GUN.pistol = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    k.b(.2, .034, .03, m.steel, .02, .03, 0); for (var i = 0; i < 6; i++) k.b(.006, .028, .033, m.dark, -.06 + i * .011, .03, 0);
    k.b(.175, .024, .028, m.poly, .02, .003, 0); k.b(.06, .01, .022, m.dark, .08, -.014, 0); k.cx(.007, .012, m.bright, .125, .03, 0);
    k.b(.008, .01, .006, m.bright, .11, .052, 0); k.b(.008, .012, .022, m.dark, -.07, .052, 0);
    k.b(.048, .12, .03, m.poly, -.045, -.065, 0, 0, 0, -.22); k.b(.05, .012, .034, m.accent, -.062, -.128, 0, 0, 0, -.22); guard(k, .012, 0);
    return { g: g, grip: [-.045, -.08], fore: [-.03, -.1], muzzle: [.13, .03], sight: .056 };
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
    k.cy(.012, .02, m.steel, 0, .048, 0); k.b(.026, .016, .022, m.steel, 0, .064, 0); k.b(.004, .085, .016, m.bright, .034, .03, 0, 0, 0, .16); k.cy(.035, .006, m.accent, 0, -.004, 0, 10);
    return { g: g };
  };

  // Flatten a group into one geometry: positions, normals and a colour per vertex.
  function merge(root, shade) {
    root.updateMatrixWorld(true); var P = [], N = [], Cc = [];
    root.traverse(function (o) {
      if (!o.isMesh) return;
      var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      var p = g.attributes.position.array, n = g.attributes.normal.array, c = o.material.color, k = shade ? .92 + Math.random() * .16 : 1;
      for (var i = 0; i < p.length; i += 3) { P.push(p[i], p[i + 1], p[i + 2]); N.push(n[i], n[i + 1], n[i + 2]); Cc.push(c.r * k, c.g * k, c.b * k); }
      g.dispose();
    });
    var out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); out.setAttribute('color', new T.Float32BufferAttribute(Cc, 3));
    return out;
  }
  SV.merge = merge; SV.GUN = GUN; SV.kit = kit; SV.mk = mk;
  SV.litMat = new T.MeshLambertMaterial({ vertexColors: true });

  // First-person weapon: the gun plus two gloved hands and sleeves.
  SV.viewModel = function (id, team) {
    var d = GUN[id](), k = kit(d.g), sl = team === 'A' ? MAT.sleeveA : MAT.sleeveB;
    k.b(.06, .07, .07, MAT.glove, d.grip[0], d.grip[1], .005);
    k.b(.07, .07, .26, sl, d.grip[0] - .04, d.grip[1] - .06, .15, .35, 0, 0);
    if (d.fore) { k.b(.07, .06, .07, MAT.glove, d.fore[0], d.fore[1], -.005); k.b(.07, .07, .3, sl, d.fore[0] - .12, d.fore[1] - .07, -.14, -.3, .5, 0); }
    var mesh = new T.Mesh(merge(d.g), SV.litMat); mesh.userData = { muzzle: d.muzzle, sight: d.sight }; return mesh;
  };

  // Third-person soldier. Faces +Z, feet at y = 0. Returns { root, legL, legR } with legs pivoting at the hip.
  function seg(g, a, b, w, dd, mat) {
    var dir = new T.Vector3().subVectors(b, a), len = dir.length(), mesh = new T.Mesh(new T.BoxGeometry(w, len, dd), mat);
    mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize()); g.add(mesh);
  }
  function arm(g, S, Tg, bend, cloth, glove) {
    var L = .34, v = new T.Vector3().subVectors(Tg, S), d = Math.min(v.length(), L * 2 - .01); v.normalize();
    var h = Math.sqrt(Math.max(L * L - d * d / 4, 0)), perp = bend.clone().addScaledVector(v, -bend.dot(v)).normalize();
    var E = S.clone().addScaledVector(v, d / 2).addScaledVector(perp, h), H = S.clone().addScaledVector(v, d);
    seg(g, S, E, .105, .115, cloth); seg(g, E, H, .09, .1, cloth);
    var hand = new T.Mesh(new T.BoxGeometry(.095, .1, .11), glove); hand.position.copy(H); g.add(hand);
  }
  var cache = {};
  SV.soldier = function (team, gunId) {
    var key = team + gunId, c = cache[key];
    if (!c) {
      var tc = team === 'A' ? 0xffb347 : 0x6cc4e0, cloth = mk(team === 'A' ? 0x7a6646 : 0x3f6272), cloth2 = mk(team === 'A' ? 0x5a4a32 : 0x2e4a57);
      var gear = mk(0x2a2f33), pad = mk(0x1a1d20), teamM = mk(tc), body = new T.Group(), k = kit(body), legs = [new T.Group(), new T.Group()];
      [-1, 1].forEach(function (sx, n) {
        var x = sx * .11, kl = kit(legs[n]);
        kl.b(.12, .09, .27, pad, x, .045, .035); kl.b(.125, .4, .135, cloth, x, .29, 0); kl.b(.135, .1, .06, pad, x, .5, .065); kl.b(.155, .4, .165, cloth2, x, .7, 0);
        k.b(.14, .075, .18, teamM, sx * .275, 1.42, 0); k.b(.05, .09, .1, gear, sx * .118, 1.585, 0);
      });
      k.b(.39, .15, .21, cloth2, 0, .95, 0); k.b(.41, .05, .225, gear, 0, .99, 0); k.b(.4, .42, .22, cloth, 0, 1.22, 0); k.b(.37, .34, .27, gear, 0, 1.2, 0);
      k.b(.27, .2, .03, pad, 0, 1.27, .145); for (var i = -1; i <= 1; i++) k.b(.075, .13, .045, gear, i * .09, 1.1, .155);
      k.b(.12, .06, .012, teamM, .08, 1.31, .162); k.b(.29, .32, .11, gear, 0, 1.24, -.18); k.b(.2, .12, .012, teamM, 0, 1.3, -.238);
      k.b(.11, .07, .11, cloth2, 0, 1.455, 0); k.b(.185, .2, .2, pad, 0, 1.575, 0); k.b(.175, .06, .03, teamM, 0, 1.6, .1);
      k.b(.23, .1, .26, cloth2, 0, 1.69, -.005); k.b(.2, .04, .22, cloth2, 0, 1.755, -.005); k.b(.05, .104, .264, teamM, 0, 1.69, -.005);
      var d = GUN[gunId](), gx = -.2, gy = 1.3, gz = .36; d.g.rotation.y = -PI / 2; d.g.position.set(gx, gy, gz); body.add(d.g);
      arm(body, new T.Vector3(-.275, 1.36, 0), new T.Vector3(gx, gy + d.grip[1] + .02, gz + d.grip[0]), new T.Vector3(-.6, -1, -.2), cloth, pad);
      if (d.fore) arm(body, new T.Vector3(.275, 1.36, 0), new T.Vector3(gx + .01, gy + d.fore[1] + .02, gz + d.fore[0]), new T.Vector3(.5, -1, 0), cloth, pad);
      var lg = legs.map(function (l) { var gm = merge(l); gm.translate(0, -.92, 0); return gm; });
      c = cache[key] = { body: merge(body), legL: lg[0], legR: lg[1], muzzle: new T.Vector3(gx, gy + d.muzzle[1], gz + d.muzzle[0]) };
    }
    var root = new T.Group(), b = new T.Mesh(c.body, SV.litMat), l = new T.Mesh(c.legL, SV.litMat), r = new T.Mesh(c.legR, SV.litMat);
    l.position.y = r.position.y = .92; root.add(b); root.add(l); root.add(r);
    return { root: root, legL: l, legR: r, muzzle: c.muzzle };
  };
})();
