// models.js — weapons and soldiers assembled from boxes and cylinders, then merged into one vertex-coloured geometry each.
var SV = window.SV = window.SV || {};
(function () {
  var T = THREE, PI = Math.PI;
  function mk(c) { return new T.MeshBasicMaterial({ color: c }); }
  function camo(a, b, c) { var m = mk(a); m.userData.camo = [new T.Color(a).convertSRGBToLinear(), new T.Color(b).convertSRGBToLinear(), new T.Color(c).convertSRGBToLinear()]; return m; }
  var MAT = { steel: mk(0x2c3136), dark: mk(0x15181b), bright: mk(0x6f7a82), poly: mk(0x2b3035), poly2: mk(0x1a1d20), rubber: mk(0x0e1012),
    wood: mk(0x432a18), wood2: mk(0x332012), accent: mk(0xffb347), brass: mk(0xb08a3c), red: mk(0xb23a2a), lens: mk(0xffb347), glass: mk(0x0e1c24),
    olive: mk(0x4b5a3a), olive2: mk(0x2f3724), sand: mk(0x6f6046), sand2: mk(0x5a4d38), bronze: mk(0x9a7440), mark: mk(0xc9ccc8), yel: mk(0xd1a82a), blade: mk(0x3b4147), edge: mk(0x8c959c), glove: mk(0x2c2d2e), glove2: mk(0x1b1c1e), fde: mk(0x8a7858), fde2: mk(0x6e5f45), band: mk(0xc9a227), skin: mk(0xb98a66),
    sleeveA: camo(0x8a7a58, 0x6b5d40, 0x4d4733), sleeveB: camo(0x5d6a70, 0x44525a, 0x2c363d) };

  ['poly', 'poly2', 'rubber', 'wood', 'wood2', 'olive', 'olive2', 'glove', 'glove2', 'fde', 'fde2', 'sand', 'sand2', 'skin', 'sleeveA', 'sleeveB'].forEach(function (n) { MAT[n].userData.soft = true; });

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

  // Hard-surface parts are drawn as a side profile and pushed out sideways with bevelled edges, the way a receiver is milled
  // from a block; round parts are turned on a lathe. Edges that catch the light are most of what makes a gun read as metal.
  function shape(pts, holes) { var sh = new T.Shape(pts.map(function (p) { return new T.Vector2(p[0], p[1]); })); (holes || []).forEach(function (h) { sh.holes.push(new T.Path(h.map(function (p) { return new T.Vector2(p[0], p[1]); }))); }); return sh; }
  function exg(pts, a, b, bv, holes) { var g = new T.ExtrudeGeometry(shape(pts, holes), { depth: b - a - 2 * bv, bevelEnabled: bv > 0, bevelSize: bv, bevelThickness: bv, bevelSegments: 1, curveSegments: 3 }); g.translate(0, 0, a + bv); return g; }
  // profile in the side view (x forward, y up), from z = a to z = b
  function ex(k, pts, a, b, mat, bv, holes) { return k.add(exg(pts, a, b, bv || 0, holes), mat, 0, 0, 0); }
  // profile seen from the front (z across, y up), from x = a to x = b: sight hoods, optic bodies
  function exX(k, pts, a, b, mat, bv, holes) { var g = exg(pts, 0, b - a, bv || 0, holes); g.rotateY(PI / 2); return k.add(g, mat, a, 0, 0); }
  // turned part along the barrel axis: [[x, radius], ...]
  function lx(k, prof, mat, y, z, seg) { var g = new T.LatheGeometry(prof.map(function (p) { return new T.Vector2(p[1], p[0]); }), seg || 14); g.rotateZ(-PI / 2); return k.add(g, mat, 0, y, z || 0); }
  function teeth(k, x0, n, y, w, mat) { for (var i = 0; i < n; i++) k.b(.0052, .0065, w, mat, x0 + i * .01, y, 0); }
  function trig(k, x, y, mat, gm) {   // trigger guard (a loop) and the trigger inside it
    ex(k, [[x - .042, y], [x + .04, y], [x + .04, y - .034], [x - .03, y - .038], [x - .046, y - .02]], -.0075, .0075, gm, .001, [[[x - .037, y - .004], [x + .035, y - .004], [x + .035, y - .029], [x - .028, y - .033], [x - .041, y - .02]]]);
    ex(k, [[x - .006, y], [x + .002, y], [x, y - .014], [x + .006, y - .025], [x + .002, y - .027], [x - .007, y - .016]], -.003, .003, mat, 0);
  }

  // every gun: +X is the muzzle, +Y up. `grip` and `fore` are hand positions, `muzzle` the barrel tip, `sight` the aiming line height.
  var GUN = {};
  // details the whole arsenal shares: a boxed optic you aim through, bare metal along worn edges, a made-up maker's mark and serial
  function optic(k, x0, x1, y0, hh, hw, m) { k.b(x1 - x0 + .02, .012, hw * 1.5, m.dark, (x0 + x1) / 2, y0 - .006, 0); exX(k, [[-hw, y0], [hw, y0], [hw, y0 + hh - .008], [hw - .006, y0 + hh], [-hw + .006, y0 + hh], [-hw, y0 + hh - .008]], x0, x1, m.dark, .0015, [[[-hw + .005, y0 + .006], [hw - .005, y0 + .006], [hw - .005, y0 + hh - .01], [hw - .009, y0 + hh - .005], [-hw + .009, y0 + hh - .005], [-hw + .005, y0 + hh - .01]]]); k.cz(.005, .008, m.steel, (x0 + x1) / 2, y0 + hh * .5, hw + .004, 8); k.s(.0022, m.accent, x0 + .004, y0 + hh * .52, 0); }
  function wear(k, x0, x1, y, z, m) { [-z, z].forEach(function (zz) { k.b(x1 - x0, .0016, .0016, m.bright, (x0 + x1) / 2, y, zz); }); }
  function stamp(k, x, y, z, m) { [-1, 1].forEach(function (sd) { k.b(.012, .002, .0008, m.mark, x, y + .006, sd * z); k.b(.008, .002, .0008, m.mark, x, y + .002, sd * z); k.b(.004, .002, .0008, m.mark, x, y - .002, sd * z); k.b(.034, .003, .0008, m.mark, x + .04, y, sd * z); }); }
  function stripes(k, x, y, z, m, mat) { [-1, 1].forEach(function (sd) { k.b(.011, .05, .0008, mat, x, y, sd * z, 0, 0, -.5); k.b(.006, .05, .0008, mat, x + .02, y, sd * z, 0, 0, -.5); }); }
  // a curved box magazine: the profile follows an arc (angle from straight down grows from a0 to a1), with pressed ribs and a floor plate
  function mag(k, x, y, w, len, a0, a1, hw, mat, rib, n) {
    var F = [], R = [], cx = x, cy = y, i, N = 6, a, c = [];
    for (i = 0; i <= N; i++) { a = a0 + (a1 - a0) * i / N; var dx = Math.cos(a), dy = Math.sin(a); F.push([cx + dx * w / 2, cy + dy * w / 2]); R.push([cx - dx * w / 2, cy - dy * w / 2]); c.push([cx, cy, a]); cx += Math.sin(a) * len / N; cy -= Math.cos(a) * len / N; }
    ex(k, F.concat(R.reverse()), -hw, hw, mat, .002).userData.mag = true;
    for (i = 1; i <= (n || 3); i++) { var q = c[Math.round(i * (N - 1) / ((n || 3) + .4))]; k.b(w * .82, .0035, hw * 2 + .002, rib, q[0], q[1], 0, 0, 0, q[2]).userData.mag = true; }
    var e = c[N]; k.b(w + .006, .007, hw * 2 + .003, rib, e[0] - Math.sin(e[2]) * .002, e[1] + Math.cos(e[2]) * .002, 0, 0, 0, e[2]).userData.mag = true;
  }
  // the small working parts on the side of a rifle receiver that make it read as a machine: ejection port with its cover and the
  // bolt showing, case deflector, forward assist, selector lever, bolt release, magazine button, charging handle
  function parts(k, m, z) {
    [-1, 1].forEach(function (sd) { var zz = sd * z;
      if (sd < 0) { k.b(.066, .022, .002, m.rubber, .02, .034, zz); k.b(.05, .011, .003, m.bright, .016, .036, zz + .0006); k.b(.07, .004, .004, m.dark, .02, .022, zz - .001); k.b(.014, .016, .008, m.steel, -.022, .034, zz - .002, 0, 0, .5); k.cz(.006, .012, m.dark, -.05, .036, zz - .004, 10); }
      k.cz(.0055, .004, m.dark, -.075, -.006, zz, 10); k.b(.022, .005, .003, m.dark, -.066, -.004, zz + sd * .002, 0, 0, sd * .5);                 // selector
      if (sd < 0) k.b(.012, .026, .003, m.dark, .058, -.002, zz - .001); else k.cz(.0045, .004, m.dark, .03, -.012, zz, 10);                    // bolt release / magazine button
    });
    k.b(.022, .007, .038, m.dark, -.134, .058, 0); k.b(.012, .01, .016, m.dark, -.14, .058, 0);                                                    // charging handle
  }
  // a slotted flash hider on the muzzle
  function hider(k, x, y, r, len, m) { lx(k, [[x, 0], [x, r * .8], [x + .006, r], [x + len - .004, r], [x + len, r * .8], [x + len, 0]], m.dark, y, 0, 12); k.b(len * .6, .0035, r * 2 + .0012, m.rubber, x + len * .55, y, 0); k.b(len * .6, r * 2 + .0012, .0035, m.rubber, x + len * .55, y, 0); }
  // AR-01 "Valkyrie": the all-round rifle. Long slotted metal handguard, optic on top, angular adjustable stock, sand panels on gunmetal.
  GUN.rifle = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i, sl = [];
    ex(k, [[-.14, .002], [.13, .002], [.13, .056], [.122, .064], [-.132, .064], [-.14, .052]], -.021, .021, m.steel, .003);
    ex(k, [[-.14, 0], [.1, 0], [.1, -.04], [.04, -.052], [.036, -.03], [-.03, -.03], [-.05, -.022], [-.14, -.022]], -.019, .019, m.steel, .0025);
    parts(k, m, .0222); k.cz(.0042, .045, m.bright, -.12, -.012, 0, 8); k.cz(.0042, .045, m.bright, .085, -.01, 0, 8);
    for (i = 0; i < 7; i++) { sl.push([[.15 + i * .044, .037], [.182 + i * .044, .037], [.182 + i * .044, .047], [.15 + i * .044, .047]]); sl.push([[.15 + i * .044, .015], [.182 + i * .044, .015], [.182 + i * .044, .025], [.15 + i * .044, .025]]); }
    ex(k, [[.13, 0], [.46, 0], [.47, .01], [.47, .056], [.46, .064], [.13, .064]], -.023, .023, m.sand, .003, sl); k.b(.33, .003, .03, m.steel, .3, .0655, 0);
    k.cx(.0085, .5, m.dark, .38, .03, 0, 12); hider(k, .622, .03, .0118, .058, m); k.b(.03, .03, .03, m.dark, .5, .034, 0); k.b(.008, .03, .006, m.dark, .5, .062, 0);
    teeth(k, -.128, 60, .0675, .021, m.steel); optic(k, .0, .05, .078, .04, .018, m);
    ex(k, [[-.09, -.02], [-.045, -.02], [-.058, -.07], [-.08, -.145], [-.128, -.138], [-.108, -.07]], -.014, .014, m.sand2, .005); trig(k, -.005, -.03, m.bright, m.steel);
    mag(k, .069, -.04, .05, .175, .1, .5, .0122, m.sand, m.sand2, 4);
    ex(k, [[.236, 0], [.276, 0], [.273, -.095], [.239, -.095]], -.013, .013, m.poly2, .005); for (i = 0; i < 5; i++) k.b(.04, .004, .028, m.rubber, .256, -.02 - i * .016, 0);
    k.cx(.0145, .2, m.steel, -.235, .03, 0, 12); k.cx(.0185, .012, m.steel, -.142, .03, 0, 12);
    ex(k, [[-.2, .054], [-.37, .054], [-.39, .04], [-.39, -.075], [-.368, -.082], [-.31, -.03], [-.2, .002]], -.019, .019, m.sand, .004, [[[-.33, 0], [-.368, 0], [-.368, -.05], [-.33, -.02]]]); k.b(.02, .13, .044, m.rubber, -.4, -.014, 0);
    wear(k, -.13, .12, .0645, .0205, m); wear(k, .14, .46, .0645, .0225, m); stamp(k, -.11, .03, .0216, m);
    return { g: g, grip: [-.105, -.1], fore: [.256, -.058], vgrip: true, muzzle: [.68, .03], sight: .099 };
  };
  // AR-02 "Raven": shorter and meaner. All black, big open slots, red stripes, short stock, small optic.
  GUN.rifle2 = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i, sl = [];
    ex(k, [[-.14, .002], [.13, .002], [.13, .056], [.122, .064], [-.132, .064], [-.14, .052]], -.021, .021, m.steel, .003);
    ex(k, [[-.14, 0], [.1, 0], [.1, -.04], [.04, -.052], [.036, -.03], [-.03, -.03], [-.05, -.022], [-.14, -.022]], -.019, .019, m.dark, .0025);
    parts(k, m, .0222); k.cz(.0042, .045, m.bright, -.12, -.012, 0, 8); k.cz(.0042, .045, m.bright, .085, -.01, 0, 8);
    for (i = 0; i < 3; i++) sl.push([[.158 + i * .072, .014], [.214 + i * .072, .014], [.204 + i * .072, .05], [.148 + i * .072, .05]]);
    ex(k, [[.13, -.004], [.36, -.004], [.372, .01], [.372, .056], [.362, .066], [.13, .066]], -.026, .026, m.poly, .004, sl);
    k.cx(.0095, .4, m.dark, .33, .03, 0, 12); hider(k, .478, .03, .013, .052, m);
    teeth(k, -.128, 50, .0675, .021, m.steel); optic(k, .0, .042, .078, .036, .017, m);
    ex(k, [[-.09, -.02], [-.045, -.02], [-.058, -.07], [-.08, -.145], [-.128, -.138], [-.108, -.07]], -.014, .014, m.poly2, .005); trig(k, -.005, -.03, m.bright, m.dark);
    mag(k, .069, -.04, .05, .15, .08, .42, .0122, m.poly2, m.rubber, 3);
    ex(k, [[.19, -.004], [.3, -.004], [.286, -.032], [.226, -.048], [.198, -.032]], -.014, .014, m.poly2, .004);
    k.cx(.0145, .14, m.steel, -.205, .03, 0, 12);
    ex(k, [[-.2, .054], [-.3, .054], [-.318, .04], [-.318, -.062], [-.296, -.068], [-.255, -.022], [-.2, .002]], -.019, .019, m.poly, .004); k.b(.018, .116, .044, m.rubber, -.327, -.008, 0);
    stripes(k, -.085, .031, .0216, m, m.red); stripes(k, .34, .03, .0266, m, m.red); wear(k, -.13, .12, .0645, .0205, m); stamp(k, -.03, .012, .0216, m);
    return { g: g, grip: [-.105, -.1], fore: [.25, -.035], cup: [.25, .03, .037], muzzle: [.53, .03], sight: .097 };
  };
  // SM-01 "Silence": short and thick; receiver and handguard are one block, long narrow magazine, vertical grip, slim stock, dot sight, yellow marks.
  GUN.smg = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i, sl = [];
    for (i = 0; i < 3; i++) sl.push([[.118 + i * .03, .02], [.138 + i * .03, .02], [.138 + i * .03, .046], [.118 + i * .03, .046]]);
    ex(k, [[-.15, -.014], [.2, -.014], [.212, 0], [.212, .05], [.2, .066], [-.14, .066], [-.15, .056]], -.024, .024, m.steel, .003, sl);
    k.b(.06, .022, .003, m.rubber, .0, .036, -.0255); k.cz(.006, .018, m.bright, -.06, .05, -.031, 8); k.cz(.004, .052, m.bright, -.12, 0, 0, 8); k.cz(.004, .052, m.bright, .09, 0, 0, 8);
    k.cx(.0095, .16, m.dark, .2, .03, 0, 12); hider(k, .262, .03, .013, .05, m); k.b(.05, .018, .002, m.rubber, .0, .04, -.0255); k.b(.036, .008, .003, m.bright, -.004, .041, -.0252); k.cz(.005, .004, m.dark, -.05, .004, -.0245, 10); k.b(.02, .005, .003, m.dark, -.042, .006, -.026, 0, 0, -.5);
    teeth(k, -.13, 33, .069, .022, m.steel); optic(k, -.01, .03, .08, .034, .016, m);
    ex(k, [[-.1, -.014], [-.045, -.014], [-.055, -.07], [-.07, -.135], [-.115, -.13], [-.1, -.07]], -.015, .015, m.poly2, .005); trig(k, -.006, -.016, m.bright, m.steel);
    ex(k, [[.028, -.014], [.062, -.014], [.06, -.235], [.026, -.235]], -.011, .011, m.dark, .002).userData.mag = true; k.b(.04, .012, .025, m.yel, .043, -.215, 0).userData.mag = true; k.b(.04, .008, .026, m.poly2, .043, -.238, 0).userData.mag = true;
    ex(k, [[.15, -.014], [.19, -.014], [.186, -.1], [.154, -.1]], -.014, .014, m.poly2, .005); for (i = 0; i < 4; i++) k.b(.04, .004, .03, m.rubber, .17, -.03 - i * .017, 0);
    k.cx(.005, .21, m.steel, -.25, .045, .017, 8); k.cx(.005, .21, m.steel, -.25, .045, -.017, 8); ex(k, [[-.345, .066], [-.362, .066], [-.362, -.06], [-.345, -.06]], -.024, .024, m.rubber, .003);
    k.cz(.0065, .02, m.dark, .13, .052, -.032, 10); k.b(.03, .004, .003, m.rubber, .13, .052, -.0252); for (i = 0; i < 3; i++) k.b(.03, .003, .0235, m.rubber, .044, -.06 - i * .045, 0).userData.mag = true; k.b(.02, .03, .05, m.dark, -.155, .04, 0); k.b(.008, .012, .012, m.dark, -.12, .074, 0);
    [-1, 1].forEach(function (sd) { k.b(.03, .006, .0008, m.yel, .06, .054, sd * .0246); k.b(.012, .006, .0008, m.yel, .1, .054, sd * .0246); }); wear(k, -.13, .19, .0665, .0228, m); stamp(k, -.11, .03, .0246, m);
    return { g: g, grip: [-.075, -.085], fore: [.17, -.07], vgrip: true, muzzle: [.312, .03], sight: .098 };
  };
  // SR-01 "Orion": the long, heavy one. Sand chassis and stock on dark metal, big scope, thick butt, folded bipod under the fore-end.
  GUN.sniper = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i;
    ex(k, [[-.2, -.03], [.5, -.03], [.5, 0], [.2, .012], [.2, .03], [-.2, .03]], -.024, .024, m.sand, .004, [0, 1, 2, 3, 4].map(function (n) { return [[.235 + n * .052, -.024], [.27 + n * .052, -.024], [.27 + n * .052, -.006], [.235 + n * .052, -.006]]; }));                                                    // chassis and fore-end
    k.cx(.021, .3, m.steel, .03, .045, 0, 14); k.b(.07, .014, .004, m.rubber, .05, .05, -.019); k.cx(.022, .02, m.dark, -.125, .045, 0, 14);                     // action, port, bolt shroud
    k.cz(.006, .05, m.bright, -.1, .04, -.045, 8); k.s(.013, m.dark, -.1, .036, -.075);                                                                         // bolt handle
    lx(k, [[.18, 0], [.18, .016], [.3, .0135], [.82, .0105], [.82, 0]], m.steel, .045, 0, 14);                                                                 // tapered barrel
    lx(k, [[.82, 0], [.82, .0125], [.83, .0175], [.893, .0175], [.9, .0135], [.9, 0]], m.dark, .045, 0, 14); for (i = 0; i < 3; i++) k.b(.011, .013, .037, m.rubber, .845 + i * .018, .045, 0);   // brake with side ports
    k.b(.4, .0026, .0262, m.dark, .52, .045, 0); k.b(.4, .0262, .0026, m.dark, .52, .045, 0);                                                                   // barrel flutes
    teeth(k, -.1, 27, .0705, .02, m.steel); k.b(.27, .006, .022, m.steel, .03, .066, 0);
    [-.04, .09].forEach(function (x) { k.b(.022, .03, .03, m.dark, x, .088, 0); k.cx(.0245, .022, m.dark, x, .125, 0, 14); });                                  // scope rings
    lx(k, [[-.2, 0], [-.2, .019], [-.17, .0215], [-.13, .0215], [-.11, .015], [.12, .015], [.16, .026], [.25, .026], [.25, 0]], m.dark, .125, 0, 16);            // scope
    k.cx(.0235, .003, m.rubber, .2515, .125, 0, 16); k.cx(.0185, .003, m.rubber, -.2015, .125, 0, 16); k.cy(.014, .028, m.steel, .03, .152, 0, 12); k.cz(.014, .028, m.steel, .03, .125, .028, 12);
    ex(k, [[.02, -.03], [.1, -.03], [.095, -.092], [.025, -.092]], -.014, .014, m.poly2, .002).userData.mag = true;                                                                // magazine
    ex(k, [[-.16, -.03], [-.1, -.03], [-.115, -.08], [-.14, -.15], [-.185, -.145], [-.165, -.08]], -.015, .015, m.rubber, .005); trig(k, -.055, -.03, m.bright, m.poly);
    ex(k, [[-.2, .03], [-.47, .03], [-.48, .02], [-.48, -.1], [-.46, -.105], [-.36, -.03], [-.2, -.03]], -.021, .021, m.sand, .004, [[[-.4, 0], [-.45, 0], [-.45, -.07], [-.4, -.03]]]);   // skeleton stock
    ex(k, [[-.26, .03], [-.39, .03], [-.39, .05], [-.38, .056], [-.27, .056], [-.26, .05]], -.018, .018, m.poly2, .003); k.b(.022, .13, .046, m.rubber, -.492, -.04, 0);   // cheek rest, butt pad
    k.cx(.007, .2, m.dark, .4, -.042, .02, 8); k.cx(.007, .2, m.dark, .4, -.042, -.02, 8); k.b(.03, .024, .06, m.dark, .49, -.036, 0);                           // folded bipod
    k.cx(.0225, .0016, m.glass, .2495, .125, 0, 16); k.cx(.0175, .0016, m.glass, -.2, .125, 0, 16); k.cz(.007, .05, m.dark, -.33, .043, 0, 10); k.cz(.007, .05, m.dark, -.3, .043, 0, 10); k.cz(.004, .05, m.bright, -.19, -.02, 0, 8); k.cz(.004, .05, m.bright, .15, -.02, 0, 8); k.b(.12, .006, .02, m.dark, .32, -.033, 0);
    wear(k, -.19, .49, .0305, .0235, m); wear(k, -.46, -.21, .0305, .0205, m); stamp(k, -.12, .0, .0246, m); k.b(.03, .1, .048, m.rubber, -.5, -.04, 0);
    return { g: g, grip: [-.14, -.1], fore: [.3, -.05], muzzle: [.9, .045], sight: .125 };
  };
  // SG-01 "Hound": heavy and thick up front. Ribbed fore-end, short solid stock, red stripes and a row of red shells on the side.
  GUN.shotgun = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i;
    ex(k, [[-.12, -.04], [.12, -.04], [.12, .03], [.11, .04], [-.1, .04], [-.12, .02]], -.021, .021, m.steel, .003);                                           // receiver
    k.b(.075, .022, .003, m.rubber, .02, .012, -.0225); k.b(.09, .004, .03, m.rubber, .02, -.0405, 0); k.cz(.004, .046, m.bright, -.08, -.02, 0, 8);            // ejection port, loading port, pin
    k.cx(.014, .54, m.steel, .39, .022, 0, 14); k.cx(.0125, .44, m.dark, .33, -.014, 0, 14); k.cx(.0145, .02, m.steel, .56, -.014, 0, 14); k.b(.02, .056, .034, m.dark, .5, .004, 0);   // barrel, magazine tube, cap, clamp
    k.s(.0045, m.brass, .652, .039, 0); k.b(.3, .0035, .032, m.dark, .33, .0385, 0); for (i = 0; i < 9; i++) k.b(.016, .004, .012, m.rubber, .21 + i * .03, .039, 0);   // bead, vented heat shield
    k.cx(.027, .17, m.poly, .25, -.014, 0, 12); for (i = 0; i < 6; i++) k.cx(.0278, .006, m.rubber, .185 + i * .026, -.014, 0, 12);                               // ribbed fore-end
    ex(k, [[-.12, .03], [-.165, .027], [-.21, .008], [-.27, .004], [-.44, -.012], [-.44, -.125], [-.3, -.086], [-.245, -.07], [-.218, -.086], [-.205, -.108], [-.168, -.102], [-.152, -.06], [-.12, -.04]], -.02, .02, m.poly, .007); k.b(.022, .115, .044, m.rubber, -.452, -.075, 0);   // stock, pad
    trig(k, -.06, -.04, m.bright, m.steel); k.b(.052, .012, .003, m.bright, .012, .013, -.0226); k.cz(.005, .046, m.dark, -.085, .01, 0, 10); k.cx(.0158, .014, m.steel, .652, .022, 0, 14); k.cz(.0035, .04, m.bright, .09, .0, 0, 8); k.b(.012, .014, .006, m.dark, -.36, -.118, 0);
    stripes(k, .03, -.002, .0222, m, m.red); k.b(.1, .036, .006, m.poly2, -.27, -.03, -.0225); for (i = 0; i < 5; i++) { k.cy(.0085, .036, m.red, -.31 + i * .02, -.024, -.031, 8); k.cy(.0088, .009, m.brass, -.31 + i * .02, -.044, -.031, 8); }
    k.cx(.0315, .2, m.poly2, .25, -.014, 0, 12); for (i = 0; i < 9; i++) k.cx(.0328, .008, m.rubber, .17 + i * .02, -.014, 0, 12); wear(k, -.1, .11, .0405, .0195, m); stamp(k, -.07, .01, .0222, m);
    return { g: g, grip: [-.17, -.05], fore: [.25, -.04], muzzle: [.66, .022], sight: .054 };
  };
  // HG-01 "Saber": the plain service pistol. Angular slide with milled slots, thick textured grip.
  GUN.pistol = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i;
    ex(k, [[-.085, .014], [.125, .014], [.125, .04], [.118, .047], [-.08, .047], [-.085, .042]], -.0145, .0145, m.steel, .002, [0, 1, 2, 3].map(function (n) { return [[.052 + n * .017, .023], [.062 + n * .017, .023], [.066 + n * .017, .04], [.056 + n * .017, .04]]; })); k.cx(.0052, .19, m.bright, .025, .031, 0, 10);   // slide with milled slots, the barrel shows through
    for (i = 0; i < 7; i++) k.b(.003, .024, .0305, m.dark, -.072 + i * .007, .03, 0); k.b(.04, .012, .014, m.rubber, .03, .042, -.008);                         // serrations, ejection port
    k.cx(.006, .006, m.bright, .1275, .032, 0, 12); k.cx(.004, .004, m.dark, .1265, .02, 0, 10);                                                                // muzzle, guide rod
    ex(k, [[-.082, .014], [.112, .014], [.112, -.004], [.045, -.01], [-.018, -.01], [-.03, -.026], [-.034, -.05], [-.04, -.09], [-.048, -.125], [-.1, -.118], [-.094, -.085], [-.09, -.05], [-.09, -.02], [-.094, -.004], [-.104, .006], [-.1, .013]], -.0135, .0135, m.poly, .0045);   // frame and grip
    k.b(.05, .006, .022, m.dark, .075, -.008, 0); for (i = 0; i < 3; i++) k.b(.004, .008, .024, m.rubber, .06 + i * .014, -.009, 0);                             // accessory rail
    trig(k, .003, -.01, m.bright, m.poly);
    k.b(.006, .008, .004, m.bright, .112, .051, 0); k.b(.008, .01, .005, m.dark, -.072, .052, .008); k.b(.008, .01, .005, m.dark, -.072, .052, -.008); k.b(.006, .03, .026, m.dark, -.087, .03, 0);   // sights, back plate
    for (i = 0; i < 6; i++) k.b(.034, .004, .0285, m.rubber, -.056 - i * .0015, -.04 - i * .013, 0, 0, 0, -.12); k.b(.054, .008, .03, m.dark, -.071, -.124, 0, 0, 0, -.12).userData.mag = true; k.b(.03, .1, .019, m.steel, -.064, -.07, 0, 0, 0, -.12).userData.mag = true;   // grip panels, magazine floor, the magazine itself inside the grip
    wear(k, -.075, .115, .0475, .0135, m); stamp(k, -.03, .003, .0142, m);
    return { g: g, grip: [-.06, -.07], fore: [-.045, -.095], muzzle: [.13, .03], sight: .063 };
  };
  // HG-02 "Specter": the finer sidearm. Long smooth slide, slim frame, bronze details.
  GUN.pistol2 = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i;
    ex(k, [[-.085, .014], [.148, .014], [.15, .034], [.14, .046], [-.08, .046], [-.085, .041]], -.0135, .0135, m.dark, .003);
    for (i = 0; i < 6; i++) k.b(.0025, .022, .0285, m.steel, -.072 + i * .006, .03, 0); k.b(.04, .011, .013, m.rubber, .03, .041, -.0075);
    k.cx(.006, .008, m.bronze, .153, .031, 0, 12); k.cx(.004, .004, m.dark, .1505, .02, 0, 10);
    ex(k, [[-.082, .014], [.13, .014], [.13, -.002], [.045, -.01], [-.018, -.01], [-.03, -.026], [-.034, -.05], [-.039, -.09], [-.046, -.125], [-.097, -.118], [-.092, -.085], [-.088, -.05], [-.088, -.02], [-.092, -.004], [-.102, .006], [-.098, .013]], -.0125, .0125, m.poly2, .0045);
    trig(k, .003, -.01, m.bronze, m.poly2); k.b(.03, .004, .001, m.bronze, .06, .006, -.013); k.b(.03, .004, .001, m.bronze, .06, .006, .013); k.cz(.0075, .0275, m.bronze, -.066, -.07, 0, 12);
    k.b(.006, .008, .004, m.bronze, .135, .05, 0); k.b(.008, .01, .005, m.dark, -.072, .051, .007); k.b(.008, .01, .005, m.dark, -.072, .051, -.007);
    for (i = 0; i < 9; i++) k.b(.03, .0022, .0262, m.rubber, -.055 - i * .0012, -.036 - i * .009, 0, 0, 0, -.12); k.b(.052, .008, .028, m.bronze, -.07, -.124, 0, 0, 0, -.12).userData.mag = true; k.b(.03, .1, .018, m.steel, -.063, -.07, 0, 0, 0, -.12).userData.mag = true;
    wear(k, -.075, .135, .0465, .0125, m);
    return { g: g, grip: [-.06, -.07], fore: [-.045, -.095], muzzle: [.156, .031], sight: .062 };
  };
  // KN-01 "Storm": a slim fighting knife. The blade is ground like a real one (flat sides down to a grind line, then a bevel to
  // the edge) and tapers to a clip point; thin cross-guard, oval ringed handle, steel pommel.
  function bladeGeo(st) {
    var F = [], B = [], i;
    function quad(L, a, b, c, d, out) { var n = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(d, a)); if (n.dot(out) < 0) { var t = b; b = d; d = t; } [a, b, c, a, c, d].forEach(function (v) { L.push(v.x, v.y, v.z); }); }
    function sec(q) { var yG = q[2] + (q[1] - q[2]) * .52, h = q[3] / 2; return { tl: new T.Vector3(q[0], q[1], -h), tr: new T.Vector3(q[0], q[1], h), gl: new T.Vector3(q[0], yG, -h), gr: new T.Vector3(q[0], yG, h), e: new T.Vector3(q[0], q[2], 0) }; }
    for (i = 0; i < st.length - 1; i++) { var a = sec(st[i]), b = sec(st[i + 1]);
      quad(F, a.tl, a.tr, b.tr, b.tl, new T.Vector3(0, 1, 0)); quad(F, a.tl, b.tl, b.gl, a.gl, new T.Vector3(0, 0, -1)); quad(F, a.tr, b.tr, b.gr, a.gr, new T.Vector3(0, 0, 1));
      quad(B, a.gl, b.gl, b.e, a.e, new T.Vector3(0, -.2, -1)); quad(B, a.gr, b.gr, b.e, a.e, new T.Vector3(0, -.2, 1)); }
    return [F, B].map(function (L) { var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(L, 3)); g.computeVertexNormals(); return g; });
  }
  GUN.knife = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i, T0 = .0125, B0 = -.0135;
    var bg = bladeGeo([[0, T0, B0, .0042], [.12, T0, B0, .0042], [.14, .0115, -.013, .004], [.155, .009, -.0115, .0036], [.17, .005, -.009, .003], [.18, .0015, -.0065, .0022], [.19, -.003, -.003, .0003]]);
    k.add(bg[0], m.blade, .008, 0, 0); k.add(bg[1], m.edge, .008, 0, 0);
    k.b(.078, .0032, .0046, m.dark, .068, .004, 0); for (i = 0; i < 8; i++) k.b(.0018, .0016, .0044, m.dark, .02 + i * .0045, T0 - .0004, 0);          // fuller, thumb jimping on the spine
    ex(k, [[0, -.021], [.004, -.026], [.0105, -.027], [.0115, -.023], [.0075, -.019], [.0075, .019], [.0115, .023], [.0105, .027], [.004, .026], [0, .021]], -.0072, .0072, m.steel, .002);   // cross-guard, tips curled forward
    var h = lx(k, [[-.105, .0105], [-.1, .0125], [-.09, .0128], [-.086, .0118], [-.082, .0128], [-.068, .0131], [-.064, .012], [-.06, .0131], [-.046, .0131], [-.042, .012], [-.038, .0131], [-.024, .0128], [-.02, .0118], [-.016, .0125], [-.004, .012], [0, .011]], m.rubber, 0, 0, 16); h.scale.z = .82;
    var pm = lx(k, [[-.119, 0], [-.119, .0102], [-.115, .0124], [-.105, .0124], [-.105, 0]], m.steel, 0, 0, 16); pm.scale.z = .84;
    return { g: g, grip: [-.05, 0], fore: null, muzzle: [.2, 0], sight: .03 };
  };
  // The bomb: three wrapped charges taped together, a control unit on top with a display and keypad, an aerial, and three
  // coloured wires running from the unit down to the charges. Lies flat: width along X, top face up, the display reads from +Z.
  GUN.bomb = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i, c, r;
    for (i = -1; i <= 1; i++) { k.b(.07, .045, .13, m.olive, i * .075, .0225, 0); k.b(.05, .0012, .05, m.sand, i * .075, .0457, .03); }
    [-.047, .05].forEach(function (z) { k.b(.232, .0475, .014, m.dark, 0, .0238, z); });
    k.b(.124, .02, .072, m.poly2, 0, .0555, -.008); k.b(.066, .003, .032, m.dark, -.024, .066, -.016);
    for (c = 0; c < 3; c++) for (r = 0; r < 4; r++) k.b(.0095, .0035, .0085, r === 3 && c !== 1 ? m.red : m.bright, .024 + c * .0125, .0668, -.03 + r * .0118);
    k.cy(.0028, .06, m.dark, .054, .09, -.036, 6); k.cy(.005, .006, m.dark, -.05, .0665, .018, 8); k.b(.03, .004, .012, m.yel, .0, .0658, .02);
    return { g: g, grip: [0, 0], fore: null, muzzle: [0, 0], sight: 0, screen: [-.024, .0678, -.016, .058, .026], led: [-.05, .0715, .018] };
  };
  // wire cutters for defusing: steel jaws, red dipped handles
  GUN.kit = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    ex(k, [[0, -.004], [.05, -.004], [.075, -.001], [.075, .0], [.05, .003], [0, .003]], -.004, .004, m.bright, .001); ex(k, [[0, .004], [.05, .004], [.075, .001], [.075, .0], [.05, -.003], [0, -.003]], -.004, .004, m.steel, .001);
    k.cz(.006, .011, m.dark, .004, 0, 0, 10); k.b(.105, .011, .009, m.red, -.055, .012, 0, 0, 0, -.1); k.b(.105, .011, .009, m.red, -.055, -.012, 0, 0, 0, .1);
    return { g: g, grip: [-.06, 0], fore: null, muzzle: [.075, 0], sight: 0 };
  };
  // the bomb ready to place in a scene: merged body, a live display, a lamp and three wires that can be cut one by one
  var bombCv = document.createElement('canvas'), bombTex = null, bombStr = null; bombCv.width = 128; bombCv.height = 56;
  SV.bombText = function (str, col) {
    if (str + col === bombStr) return; bombStr = str + col; var x = bombCv.getContext('2d'); x.fillStyle = '#0b1210'; x.fillRect(0, 0, 128, 56); x.fillStyle = col || '#ff4a2e'; x.font = '900 34px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(str, 64, 30);
    if (!bombTex) { bombTex = new T.CanvasTexture(bombCv); bombTex.encoding = T.sRGBEncoding; } bombTex.needsUpdate = true;
  };
  SV.bombParts = function () {
    SV.bombText('--:--'); var d = GUN.bomb(), out = new T.Group(), sc = d.screen;
    out.add(new T.Mesh(merge(d.g, false, function (m) { return !m.userData.soft; }), SV.gunMetal)); out.add(new T.Mesh(merge(d.g, false, function (m) { return !!m.userData.soft; }), SV.gunSoft));
    var scr = new T.Mesh(new T.PlaneGeometry(sc[3], sc[4]), new T.MeshBasicMaterial({ map: bombTex, fog: false })); scr.rotation.x = -PI / 2; scr.position.set(sc[0], sc[1], sc[2]); out.add(scr);
    var led = new T.Mesh(new T.SphereGeometry(.0055, 8, 6), new T.MeshBasicMaterial({ color: new T.Color(3, .35, .2), fog: false })); led.position.set(d.led[0], d.led[1], d.led[2]); out.add(led);
    var wires = [0xc2372b, 0xd9b02a, 0x2a6fc2].map(function (col, i) {
      var x0 = -.03 + i * .03, x1 = (i - 1) * .075, cv = new T.CatmullRomCurve3([new T.Vector3(x0, .058, .028), new T.Vector3(x0, .07, .045), new T.Vector3((x0 + x1) / 2, .066, .066), new T.Vector3(x1, .04, .072), new T.Vector3(x1, .012, .066)]), pts = cv.getPoints(24),
        mat = new T.MeshStandardMaterial({ color: col, roughness: .55 }), w = new T.Group();
      [[0, 10], [10, 14], [14, 24]].forEach(function (q, n) { var seg = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.slice(q[0], q[1] + 1)), 8, .0026, 6), mat); if (n === 1) w.userData.mid = seg; w.add(seg); });
      out.add(w); return w;
    });
    out.userData = { led: led, wires: wires, cut: function (n) { wires.forEach(function (w, i) { w.userData.mid.visible = i >= n; }); } };
    return out;
  };
  // first person, planting: the bomb held flat in both hands, tilted up so the display and keypad face the eye
  SV.bombVM = function (team) {
    var out = new T.Group(), hold = new T.Group(), b = SV.bombParts(), sl = sleeveMat(team), V = function (x, y, z) { return new T.Vector3(x, y, z); };
    b.rotation.y = -PI / 2; hold.add(b); hold.rotation.z = .95; out.add(hold); hold.updateMatrixWorld(true);
    [[-1, -.118], [1, .118]].forEach(function (q) { var hh = new T.Group(), O = hold.localToWorld(V(.005, .02, q[1])), ax = V(1, 0, 0).applyEuler(hold.rotation); hand(hh, O, ax, V(0, 0, q[0]), q[0], .022, V(O.x - .3, O.y - .2, q[0] * .26), sl, MAT.glove, { pad: MAT.poly2, thumbWrap: true, yaw: .5 });
      var hm = new T.Group(); hm.add(new T.Mesh(merge(hh, false, function (m) { return !!m.userData.soft && !m.userData.sleeve; }), SV.gunSoft)); hm.add(new T.Mesh(mergeUV(hh, function (m) { return !!m.userData.sleeve; }), sl)); out.add(hm); if (q[0] > 0) out.userData.tap = hm; });
    out.userData.muzzle = [0, 0]; out.userData.sight = 0; out.userData.parts = b; return out;
  };
  // GR-01 "Frag": a round, panelled body, yellow band, lever and ring on top. An icon, not a mechanism.
  GUN.grenade = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i;
    k.add(new T.SphereGeometry(.036, 12, 9), m.dark, 0, 0, 0); for (i = 0; i < 6; i++) k.add(new T.TorusGeometry(.0362, .002, 5, 18), m.steel, 0, 0, 0, 0, i * PI / 6, 0);
    k.cy(.0368, .007, m.yel, 0, -.004, 0, 16); k.cy(.012, .02, m.steel, 0, .044, 0); k.b(.026, .016, .022, m.steel, 0, .062, 0); k.b(.004, .085, .016, m.bright, .036, .028, 0, 0, 0, .18);
    k.add(new T.TorusGeometry(.011, .0022, 6, 14), m.bright, -.022, .066, 0); k.b(.014, .012, .001, m.mark, 0, .013, .0362); k.b(.014, .012, .001, m.mark, 0, .013, -.0362);
    return { g: g };
  };
  // GR-02 "Smoke": tall and cylindrical so it never reads as the frag. Yellow bands, a pale label, metal cap.
  GUN.smoke = function () {
    var g = new T.Group(), k = kit(g), m = MAT;
    k.cy(.03, .105, m.steel, 0, 0, 0, 16); k.cy(.0306, .012, m.yel, 0, -.032, 0, 16); k.cy(.0306, .006, m.yel, 0, .036, 0, 16); k.cy(.0312, .008, m.dark, 0, .0565, 0, 16); k.cy(.0312, .006, m.dark, 0, -.0555, 0, 16);
    k.cy(.011, .018, m.steel, 0, .069, 0); k.b(.004, .075, .014, m.bright, .031, .04, 0, 0, 0, .1); k.add(new T.TorusGeometry(.011, .0022, 6, 14), m.bright, -.02, .074, 0);
    k.b(.034, .014, .001, m.mark, 0, .004, .0302); k.b(.034, .014, .001, m.mark, 0, .004, -.0302);
    return { g: g };
  };

  // Scanned weapons (Poly Haven, CC0) stand in for the built ones when the files are there. `skip` drops loose parts of
  // the scan (spare magazines, cartridges); dx/dy move it so the trigger sits where the built guns have theirs.
  function scan(id, skip, dx, dy, tone) {
    var src = SV.assets && SV.assets.model[id]; if (!src) return null;
    var g = new T.Group(), o = src.clone(true), kill = [];
    o.traverse(function (q) { if (q.isMesh) { if (skip && skip.test(q.name)) kill.push(q); else if (tone && !q.material.userData.toned) { q.material = q.material.clone(); q.material.color.multiplyScalar(tone); q.material.userData.toned = 1; } } });
    kill.forEach(function (q) { q.parent.remove(q); }); o.position.set(dx, dy, 0); g.add(o); return g;
  }
  SV.scanOf = function (id) { var d = GUN[id](); return d.scan || null; };

  // Flatten a group into one geometry: positions, normals and a colour per vertex.
  var lin = new T.Color();
  function merge(root, shade, pick) {
    root.updateMatrixWorld(true); var P = [], N = [], Cc = [];
    root.traverse(function (o) {
      if (!o.isMesh || (pick && !pick(o.material))) return;
      var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      var p = g.attributes.position.array, n = g.attributes.normal.array, c = lin.copy(o.material.color).convertSRGBToLinear(), cm = o.material.userData.camo, k = shade ? .92 + Math.random() * .16 : 1, v;
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
  SV.merge = merge; SV.GUN = GUN; SV.kit = kit; SV.mk = mk; SV.exg = exg;
  SV.litMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .3, envMapIntensity: .55 });
  SV.gunMetal = new T.MeshStandardMaterial({ vertexColors: true, roughness: .42, metalness: .55, envMapIntensity: 1.1, side: T.DoubleSide });
  SV.gunSoft = new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, envMapIntensity: .4, side: T.DoubleSide });
  SV.clothMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0, envMapIntensity: .35 });   // fabric and webbing: no shine
  // Fine surface detail without UVs: a small tiling texture is projected along whichever axis the surface faces, and its value
  // nudges colour, roughness and the shading normal. Metal gets scratches and handling marks, fabric gets a weave.
  function detTex(fn) { var c = document.createElement('canvas'); c.width = c.height = 256; var x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256); fn(x); var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; }
  var tMetal = detTex(function (x) { var i, v; for (i = 0; i < 2600; i++) { v = Math.random() < .5 ? 40 : 215; x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + Math.random() * .22 + ')'; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1); }
    for (i = 0; i < 90; i++) { v = Math.random() < .65 ? 235 : 30; x.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (.12 + Math.random() * .3) + ')'; x.lineWidth = .6 + Math.random(); var px = Math.random() * 256, py = Math.random() * 256, a = (Math.random() - .5) * .7, l = 8 + Math.random() * 60; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
    for (i = 0; i < 14; i++) { var bx = Math.random() * 256, by = Math.random() * 256, r = 14 + Math.random() * 30, g = x.createRadialGradient(bx, by, 0, bx, by, r); v = Math.random() < .5 ? 50 : 200; g.addColorStop(0, 'rgba(' + v + ',' + v + ',' + v + ',.2)'); g.addColorStop(1, 'rgba(128,128,128,0)'); x.fillStyle = g; x.fillRect(bx - r, by - r, r * 2, r * 2); } });
  var tCloth = detTex(function (x) { var i, j; for (j = 0; j < 256; j += 4) for (i = 0; i < 256; i += 4) { var o = ((i + j) >> 2) % 3; x.fillStyle = o === 0 ? 'rgba(30,30,30,.45)' : o === 1 ? 'rgba(220,220,220,.3)' : 'rgba(110,110,110,.2)'; x.fillRect(i, j, 3, 3); x.fillStyle = 'rgba(20,20,20,.35)'; x.fillRect(i + 3, j, 1, 4); x.fillRect(i, j + 3, 4, 1); }
    for (i = 0; i < 20; i++) { var bx = Math.random() * 256, by = Math.random() * 256, r = 20 + Math.random() * 40, g = x.createRadialGradient(bx, by, 0, bx, by, r), v = Math.random() < .5 ? 60 : 190; g.addColorStop(0, 'rgba(' + v + ',' + v + ',' + v + ',.18)'); g.addColorStop(1, 'rgba(128,128,128,0)'); x.fillStyle = g; x.fillRect(bx - r, by - r, r * 2, r * 2); } });
  function detail(mat, tex, scale, albedo, rough, bump) {
    var U = mat.userData.det = { tDet: { value: tex }, uDet: { value: new T.Vector4(scale, albedo, rough, bump) }, uDetM: { value: new T.Vector2(.5, 1) } };   // uDetM: the texture's mean brightness and a gain
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.tDet = U.tDet; sh.uniforms.uDet = U.uDet; sh.uniforms.uDetM = U.uDetM;
      sh.vertexShader = 'varying vec3 vOP; varying vec3 vON;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position; vON = normal;');
      sh.fragmentShader = 'uniform sampler2D tDet; uniform vec4 uDet; uniform vec2 uDetM; varying vec3 vOP; varying vec3 vON;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n vec3 dW = abs(vON); vec2 dUv = (dW.x > dW.y && dW.x > dW.z ? vOP.zy : (dW.y > dW.z ? vOP.xz : vOP.xy)) * uDet.x; float dH = clamp(.5 + (dot(texture2D(tDet, dUv).rgb, vec3(.3333)) - uDetM.x) * uDetM.y, 0., 1.); diffuseColor.rgb *= 1. + (dH - .5) * uDet.y;')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor + (dH - .5) * uDet.z, .05, 1.);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n { vec3 dSx = dFdx(-vViewPosition), dSy = dFdy(-vViewPosition), dR1 = cross(dSy, normal), dR2 = cross(normal, dSx); float dFd = dot(dSx, dR1); vec3 dGr = sign(dFd) * (dFdx(dH) * dR1 + dFdy(dH) * dR2) * uDet.w; normal = normalize(abs(dFd) * normal - dGr); }');
    };
  }
  detail(SV.gunMetal, tMetal, 9, .5, .55, .0011); detail(SV.gunSoft, tCloth, 60, .32, .25, .0007); detail(SV.clothMat, tCloth, 34, .5, .2, .0016); detail(SV.litMat, tMetal, 9, .4, .5, .0008);
  // Once the photographed sets are loaded, weapons take their wear from scanned steel and their grips and gloves from scanned
  // leather instead of the drawn patterns above. Brightness is measured from the picture so the gun's own colours stay as they are.
  var scanned2 = false;
  function useScans() {
    if (scanned2 || !SV.assets || !SV.assets.tex) return; scanned2 = true;
    [[SV.gunMetal, 'gunmetal', 1.7, .55, .5, .00025, 2.2], [SV.litMat, 'gunmetal', 1.7, .45, .45, .0002, 2.2], [SV.gunSoft, 'gunsoft', 3.2, .4, .3, .0003, 2.6]].forEach(function (q) {
      var t = SV.assets.tex[q[1]], tx = t && t.diff; if (!tx || !tx.image) return;
      var c = document.createElement('canvas'), x, d, i, sum = 0; c.width = c.height = 32; x = c.getContext('2d'); x.drawImage(tx.image, 0, 0, 32, 32); d = x.getImageData(0, 0, 32, 32).data; for (i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
      var U = q[0].userData.det; U.tDet.value = tx; U.uDet.value.set(q[2], q[3], q[4], q[5]); U.uDetM.value.set(sum / (d.length / 4 * 3) / 255, q[6]);
    });
  }

  // A limb: a tapered tube between two points with a ball at the far joint.
  function tube(g, a, b, r0, r1, mat) {
    var dir = new T.Vector3().subVectors(b, a), len = dir.length(), mesh = new T.Mesh(new T.CylinderGeometry(r1, r0, len, 10, 4), mat);
    mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize()); g.add(mesh);
  }
  function ball(g, p, r, mat, sx, sy, sz) { var m = new T.Mesh(new T.SphereGeometry(r, 12, 9), mat); m.position.copy(p); m.scale.set(sx || 1, sy || 1, sz || 1); g.add(m); return m; }

  // Printed camouflage cloth for the first-person sleeves: the same blotch pattern as the soldiers' uniforms, drawn once.
  var sleeveMats = {};
  function sleeveMat(team) {
    if (sleeveMats[team]) return sleeveMats[team];
    var pal = team === 'A' ? [[70, 68, 46], [96, 86, 62], [48, 56, 38], [32, 30, 24]] : [[50, 55, 60], [72, 77, 82], [33, 37, 41], [19, 21, 24]], S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
    var x2 = cv.getContext('2d'), im = x2.createImageData(S, S), d = im.data, x, y, i = 0;
    function hs(a, b, s) { var n = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }
    function vn(a, b, s, per) { var xi = Math.floor(a), yi = Math.floor(b), xf = a - xi, yf = b - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = function (p, q) { return hs(((p % per) + per) % per, ((q % per) + per) % per, s); }; return (w(xi, yi) * (1 - u) + w(xi + 1, yi) * u) * (1 - v) + (w(xi, yi + 1) * (1 - u) + w(xi + 1, yi + 1) * u) * v; }
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      var a = vn(x / 32, y / 32, 1, 8) * .65 + vn(x / 16, y / 16, 2, 16) * .35, b = vn(x / 32 + 3, y / 32 + 5, 3, 8) * .6 + vn(x / 8, y / 8, 4, 32) * .4, c = vn(x / 16 + 3, y / 16 + 7, 5, 16), col = b > .63 ? pal[3] : a > .58 ? pal[1] : c > .6 ? pal[2] : pal[0], wv = .9 + .1 * ((x + y) % 3 === 0 ? 1 : .6) + hs(x, y, 9) * .08;
      d[i++] = col[0] * wv; d[i++] = col[1] * wv; d[i++] = col[2] * wv; d[i++] = 255;
    }
    x2.putImageData(im, 0, 0); var t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 2.5); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    var m = new T.MeshStandardMaterial({ map: t, roughness: .92, metalness: 0, envMapIntensity: .3 }); m.userData.sleeve = true; m.userData.soft = true; return sleeveMats[team] = m;
  }
  // join meshes into one geometry keeping their texture coordinates
  function mergeUV(root, pick) {
    root.updateMatrixWorld(true); var P = [], N = [], U = [];
    root.traverse(function (o) { if (!o.isMesh || !pick(o.material)) return; var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); P.push.apply(P, g.attributes.position.array); N.push.apply(N, g.attributes.normal.array); U.push.apply(U, g.attributes.uv.array); g.dispose(); });
    var out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); out.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); return out;
  }
  // A gloved hand closed round a handle, the way first-person shooters show it: the back of the hand and knuckles toward the
  // camera, fingers wrapped round the far side, thumb lying along the near side, wrist and sleeve running off-screen to E.
  // O: where it grips, ax: along the handle from little finger to index, pn: from the handle out through the palm,
  // sg: which way the fingers wrap (+1 / -1), r: handle radius.
  // The hand itself: a real hand mesh (see art/README.txt) with its fingers closed by bending the joints, then baked to
  // plain geometry. The model's joints are not linked to each other, so a bend carries the rest of that finger by hand.
  var HR = null;
  function handRest() {
    if (HR) return HR; var sc = SV.assets.hand.scene, sm = null; sc.updateMatrixWorld(true); sc.traverse(function (o) { if (o.isSkinnedMesh) sm = o; });
    var H = { sm: sm, pos: [], quat: [], ix: {} }, s = new T.Vector3();
    sm.skeleton.bones.forEach(function (b, i) { var p = new T.Vector3(), q = new T.Quaternion(); b.matrixWorld.decompose(p, q, s); H.pos.push(p); H.quat.push(q); H.ix[b.name] = i; });
    function J(n) { return H.pos[H.ix[n]]; }
    H.ez = J('pinky-finger-phalanx-proximal').clone().sub(J('index-finger-phalanx-proximal')).normalize();          // across the knuckles, index to little finger
    H.ex = new T.Vector3(1, 0, 0).addScaledVector(H.ez, -H.ez.x).normalize(); H.ey = new T.Vector3().crossVectors(H.ez, H.ex);   // out of the back of the hand; from the fingers to the wrist
    H.mid = J('index-finger-phalanx-proximal').clone().add(J('pinky-finger-phalanx-proximal')).multiplyScalar(.5);
    var v = new T.Vector3(), pa = sm.geometry.attributes.position, k, lo = 1e9, d = new T.Vector3();
    for (k = 0; k < pa.count; k++) { v.fromBufferAttribute(pa, k).applyMatrix4(sm.bindMatrix); d.subVectors(v, H.mid); if (Math.abs(d.dot(H.ez)) < .012 && d.dot(H.ey) > .01 && d.dot(H.ey) < .03) lo = Math.min(lo, d.dot(H.ex)); }
    H.palm = lo;   // how far the palm's surface lies from the knuckle line, along ex
    return HR = H;
  }
  // curl: bend of each finger's three joints (radians), th: thumb [swing toward the palm, bend, bend], aim: where the forearm goes (model space)
  function handBake(curl, th, aim, spread) {
    var H = handRest(), pos = H.pos.map(function (p) { return p.clone(); }), quat = H.quat.map(function (q) { return q.clone(); }), R = new T.Quaternion(), i, k;
    function bend(ch, j, axis, ang) { R.setFromAxisAngle(axis, ang); var p = pos[H.ix[ch[j]]].clone(); for (var m = j; m < ch.length; m++) { var b = H.ix[ch[m]]; pos[b].sub(p).applyQuaternion(R).add(p); quat[b].premultiply(R); } }
    ['index', 'middle', 'ring', 'pinky'].forEach(function (f, n) {
      var ch = ['phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'].map(function (j) { return f + '-finger-' + j; }), c = curl[n] && curl[n].length ? curl[n] : curl;
      if (spread) bend(ch, 0, H.ex, (n - 1.5) * spread);
      for (k = 0; k < 3; k++) bend(ch, k, H.ez, -c[k]);
    });
    var tc = ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'], td = pos[H.ix['thumb-tip']].clone().sub(pos[H.ix['thumb-metacarpal']]).normalize(), tax = new T.Vector3().crossVectors(td, H.ex).normalize();
    bend(tc, 0, H.ez, th[0]); if (th[3]) bend(tc, 0, H.ex, th[3]); bend(tc, 1, tax, th[1]); bend(tc, 2, tax, th[2]);
    var wi = H.ix.wrist, wq = new T.Quaternion();
    if (aim) { var a = aim.clone().normalize(), ang = Math.min(H.ey.angleTo(a), .7), axw = new T.Vector3().crossVectors(H.ey, a); if (axw.lengthSq() > 1e-8) { wq.setFromAxisAngle(axw.normalize(), ang); quat[wi].premultiply(wq); } }
    var sm = H.sm, geo = sm.geometry, pa = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, inv = sm.skeleton.boneInverses, one = new T.Vector3(1, 1, 1),
      M = pos.map(function (p, b) { return new T.Matrix4().compose(p, quat[b], one).multiply(inv[b]); }), out = new Float32Array(pa.count * 3), v = new T.Vector3(), t = new T.Vector3(), acc = new T.Vector3();
    for (i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(sm.bindMatrix); acc.set(0, 0, 0);
      for (k = 0; k < 4; k++) { var w = sw.array[i * 4 + k]; if (w) acc.addScaledVector(t.copy(v).applyMatrix4(M[si.array[i * 4 + k]]), w); }
      out[i * 3] = acc.x; out[i * 3 + 1] = acc.y; out[i * 3 + 2] = acc.z;
    }
    var bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(out, 3)); bg.setIndex(geo.index.clone()); bg.computeVertexNormals();
    return { geo: bg, wrist: pos[wi].clone(), arm: H.ey.clone().applyQuaternion(wq), H: H };
  }
  function realHand(g, O, ax, pn, wv, sg, r, E, sleeve, glove, o) {
    if (o.off) O = O.clone().add(new T.Vector3(o.off[0], o.off[1], o.off[2]));
    var top = o.top == null ? .033 : o.top, H = handRest(), pad = o.pad || MAT.poly2, re = o.re || r, rho = re + .01, a = o.up == null ? .02 : o.up, tight = o.tight || 0,
      // a finger laid round a cylinder is a chain of straight bones each touching it at its middle: that fixes the three bends
      b0 = Math.atan(a / rho) + Math.atan(.0225 / rho) + tight, b1 = Math.atan(.0225 / rho) + Math.atan(.013 / rho) + tight, b2 = Math.atan(.013 / rho) + Math.atan(.012 / rho),
      curl = o.curl || [[b0 - .06, b1, b2], [b0, b1, b2], [b0 + .04, b1 + .03, b2], [b0 + .1, b1 + .08, b2]],
      th = o.thumb || (o.thumbWrap ? [-.7, -.3, -.6, -.8] : [-.2, .2, .2, -.5]),
      G = H.mid.clone().addScaledVector(H.ex, H.palm - re + (o.sink == null ? .006 : o.sink)).addScaledVector(H.ey, a),   // the handle's axis in the model: in front of the palm, a little behind the knuckles
      hz = top - 1.5 * .0205, B = new T.Matrix4().makeBasis(pn, wv.clone().multiplyScalar(-sg), ax.clone().negate()), Bi = new T.Matrix4().makeBasis(H.ex, H.ey, H.ez).transpose();
    // model -> grip: back of the hand to +pn, fingers-to-wrist to -sg*wv, index-to-little-finger down the handle
    var X = new T.Matrix4().makeTranslation(O.x + ax.x * hz, O.y + ax.y * hz, O.z + ax.z * hz).multiply(B).multiply(Bi).multiply(new T.Matrix4().makeTranslation(-G.x, -G.y, -G.z));
    if (o.yaw) {   // turn the hand flat on its palm so it runs on in line with the forearm, as far as o.yaw allows
      var Pc = O.clone().addScaledVector(pn, re), f0 = wv.clone().multiplyScalar(-sg), tg = new T.Vector3().subVectors(E, Pc); tg.addScaledVector(pn, -tg.dot(pn)).normalize();
      var ya = Math.atan2(new T.Vector3().crossVectors(f0, tg).dot(pn), f0.dot(tg)); ya = Math.max(-o.yaw, Math.min(o.yaw, ya));
      X.premultiply(new T.Matrix4().makeTranslation(-Pc.x, -Pc.y, -Pc.z)).premultiply(new T.Matrix4().makeRotationAxis(pn, ya)).premultiply(new T.Matrix4().makeTranslation(Pc.x, Pc.y, Pc.z));
    }
    var Wr = H.pos[H.ix.wrist].clone().applyMatrix4(X), aimW = new T.Vector3().subVectors(E, Wr).normalize(), aim = aimW.clone().applyMatrix4(new T.Matrix4().extractRotation(X).transpose());
    var bk = handBake(curl, th, aim, o.spread), geo = bk.geo; geo.applyMatrix4(X);
    if (sg < 0) { var ix = geo.index.array, q; for (q = 0; q < ix.length; q += 3) { var s0 = ix[q]; ix[q] = ix[q + 1]; ix[q + 1] = s0; } geo.computeVertexNormals(); }   // mirrored into a left hand
    g.add(new T.Mesh(geo, MAT.glove2));
    var d = bk.arm.clone().transformDirection(X), Wp = Wr.clone().addScaledVector(d, .006), d2 = new T.Vector3().subVectors(E, Wp).normalize();
    limb(g, Wp.clone().addScaledVector(d2, -.012), Wp.clone().addScaledVector(d2, .012), [[0, .0325], [.15, .034], [.85, .034], [1, .0325]], pad, 16);          // wrist strap
    limb(g, Wp.clone().addScaledVector(d2, .008), Wp.clone().addScaledVector(d2, .05), [[0, .033], [.2, .037], [1, .038]], glove, 16);                                   // cuff
    limb(g, Wp.clone().addScaledVector(d2, .042), E, [[0, .042], [.04, .049], [.1, .051], [.5, .057], [1, .066]], sleeve, 18);
  }
  function hand(g, O, ax, pn, sg, r, E, sleeve, glove, o) {
    o = o || {}; ax = ax.clone().normalize(); pn = pn.clone().addScaledVector(ax, -pn.dot(ax)).normalize(); var wv = new T.Vector3().crossVectors(ax, pn), pad = o.pad || MAT.poly2, i, j;
    if (SV.assets && SV.assets.hand) { realHand(g, O, ax, pn, wv, sg, r, E, sleeve, glove, o); return; }
    function P(deg, rad, h) { var t = deg * PI / 180; return O.clone().addScaledVector(pn, Math.cos(t) * rad).addScaledVector(wv, Math.sin(t) * sg * rad).addScaledVector(ax, h); }
    // a curved slab wrapped round the handle: from angle a0 to a1, between two radii, between two heights along the handle
    function band(a0, a1, r0, r1, h0, h1, mat, bv) {
      var pts = [], n = Math.max(3, Math.ceil(Math.abs(a1 - a0) / 5)), k, t;
      for (k = 0; k <= n; k++) { t = (a0 + (a1 - a0) * k / n) * PI / 180; pts.push(new T.Vector2(Math.cos(t) * r1, Math.sin(t) * sg * r1)); }
      for (k = n; k >= 0; k--) { t = (a0 + (a1 - a0) * k / n) * PI / 180; pts.push(new T.Vector2(Math.cos(t) * r0, Math.sin(t) * sg * r0)); }
      var geo = new T.ExtrudeGeometry(new T.Shape(pts), { depth: h1 - h0 - 2 * bv, bevelEnabled: true, bevelSize: bv, bevelThickness: bv, bevelSegments: 2, curveSegments: 1 }), m = new T.Mesh(geo, mat);
      m.matrixAutoUpdate = false; m.matrix.makeBasis(pn, wv, ax).setPosition(O.clone().addScaledVector(ax, h0 + bv)); m.matrixWorldNeedsUpdate = true; g.add(m);
    }
    var top = o.top == null ? .033 : o.top, n = o.fingers || 4, A = o.wrap || [50, 112, 168, 212], R = [.024, .0135, .011, .0105], step = .0205, hTop = top + .0115, hBot = top - (n - 1) * step - .0115;
    band(-40, 46, r + .007, r + .026, hBot + .003, hTop - .003, glove, .007);                                   // the palm, wrapped round the handle
    band(-22, 20, r + .0325, r + .0345, hBot + .012, hTop - .011, MAT.poly, .002);                // stitched panel on the back of the hand
    for (i = 0; i < n; i++) { var kb = ball(g, P(44, r + .0295, top - i * step), .0108, pad, 1, .86, .62); kb.lookAt(P(44, r + .2, top - i * step)); }   // a hard cap over each knuckle
    for (i = 0; i < n; i++) {                                                                     // fingers: three joints each, tapering, closed round the far side
      var h = top - i * step, sh = i === 3 ? .92 : i === 0 ? 1.02 : 1, rr = i === 3 ? .0086 : .0098, pts = A.map(function (a, k) { return P(k ? a * sh : a, r + R[k], h); });
      for (j = 0; j < 3; j++) { limb(g, pts[j], pts[j + 1], [[0, rr * (1 - j * .08)], [1, rr * (.93 - j * .08)]], glove, 10); ball(g, pts[j + 1], rr * (.96 - j * .08), glove); }
      limb(g, pts[1].clone().lerp(pts[2], .25), pts[1].clone().lerp(pts[2], .75), [[0, rr * 1.06], [1, rr * 1.0]], pad, 10);   // a reinforced strip on each finger
    }
    var t0 = P(o.thumbAt || -38, r + .02, top + .002), td = o.thumbDir, t1 = td ? t0.clone().addScaledVector(td, .03) : o.thumbWrap ? P(-84, r + .013, top + .01) : P(-78, r + .013, top + .026), t2 = td ? t1.clone().addScaledVector(td, .024).addScaledVector(pn, -.004) : o.thumbWrap ? P(-128, r + .011, top + .012) : P(-118, r + .011, top + .04);
    ball(g, t0, .0165, glove); limb(g, t0, t1, [[0, .0128], [1, .0112]], glove, 10); ball(g, t1, .0112, glove); limb(g, t1, t2, [[0, .0108], [1, .009]], glove, 10); ball(g, t2, .009, glove);
    // wrist, strap, cuff and sleeve
    var Hh = P(-8, r + .022, (hTop + hBot) / 2 - .008), d = new T.Vector3().subVectors(E, Hh).normalize(), Wp = Hh.clone().addScaledVector(d, .05);
    limb(g, Hh.clone().addScaledVector(d, -.012), Wp, [[0, .026], [.4, .0285], [1, .029]], glove, 14); limb(g, Wp.clone().addScaledVector(d, -.014), Wp.clone().addScaledVector(d, .008), [[0, .0305], [.15, .032], [.85, .032], [1, .0305]], pad, 14);
    limb(g, Wp, Wp.clone().addScaledVector(d, .04), [[0, .031], [.2, .036], [1, .037]], glove, 14);
    limb(g, Wp.clone().addScaledVector(d, .035), E, [[0, .041], [.04, .048], [.1, .05], [.5, .056], [1, .066]], sleeve, 18);
  }

  // First-person weapon: the gun plus two gloved hands and sleeves.
  // gun space: +X is the muzzle, +Y up, +Z the shooter's right; the camera looks along +X from behind.
  // A weapon shown as one picture (arms and gun cut out of a painted first-person frame) instead of a model. All numbers are
  // pixels in that picture: its size, where the muzzle is, and the middle of the optic window that aiming brings to the crosshair.
  // `frame` is the height of the frame the picture was cut from (so it keeps its size on screen), `gain` evens out how
  // brightly each picture was lit.
  var ART = { rifle: { key: 'fp_rifle', w: 990, h: 509, frame: 864, muzzle: [400, 92], eye: [607, 50], zoom: 1.45, gain: 1 },
    smg: { key: 'fp_smg', w: 822, h: 568, frame: 900, muzzle: [346, 71], eye: [678, 46], zoom: 1.3, gain: .8 },
    shotgun: { key: 'fp_shotgun', w: 760, h: 557, frame: 900, muzzle: [269, 23], eye: [356, 45], zoom: 1.25, gain: .8 },
    sniper: { key: 'fp_sniper', w: 790, h: 629, frame: 900, muzzle: [316, 90], eye: [686, 130], zoom: 1.5, gain: .8 },
    pistol: { key: 'fp_pistol', w: 686, h: 601, frame: 900, muzzle: [262, 42], eye: [412, 43], zoom: 1.3, gain: .8 },
    knife: { key: 'fp_knife', w: 635, h: 686, frame: 900, muzzle: [0, 0], eye: [317, 343], zoom: 1, gain: .8 } };
  function pictureVM(a, tex) {
    var m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false })), g = new T.Group();
    m.renderOrder = 5; g.add(m); g.userData = { art: a, muzzle: [0, 0], sight: 0 }; return g;
  }
  SV.viewModel = function (id0, team) {
    useScans();
    var id = id0.replace(/2$/, '');   // rifle2 and pistol2 are held like their kind
    if (ART[id0] && SV.assets && SV.assets.art[ART[id0].key]) return pictureVM(ART[id0], SV.assets.art[ART[id0].key]);
    var d = GUN[id0](), g = d.g, bx = new T.Box3(), cut = [];
    // the stock sits against the shoulder, beside and behind the eye: in first person it only shows up as a stray block, so leave it out
    if (id !== 'pistol' && id !== 'knife' && id !== 'shotgun') { g.updateMatrixWorld(true); g.children.forEach(function (c) { bx.setFromObject(c); if ((bx.min.x + bx.max.x) / 2 < -.2) cut.push(c); }); cut.forEach(function (c) { g.remove(c); }); }
    var stG = new T.Group(); cut.forEach(function (c) { stG.add(c); });   /* kept aside: shown while the gun is turned over for a reload, when its back end comes into view */
    var sl = sleeveMat(team), gl = MAT.glove, V = function (x, y, z) { return new T.Vector3(x, y, z); }, pad = { pad: MAT.poly2 }, oh = new T.Group(), mgG = new T.Group();
    g.children.filter(function (c) { return c.userData.mag; }).forEach(function (c) { mgG.add(c); });   /* reloading moves the magazine and the supporting hand apart from the gun */
    if (id === 'knife' || id === 'kit') {
      // Held as in the reference picture: blade up and to the left, the palm on the right of the handle so the back of the
      // hand shows on the right, fingers wrapped round to the left, forearm coming up from the lower right in line with the hand.
      // (gun space here: -X is toward the eye, +Z is screen right, +Y is up)
      var ax = id === 'kit' ? V(.82, -.42, -.38).normalize() : V(.35, .75, -.55).normalize(), eye = V(-1, 0, 0), nn = eye.clone().addScaledVector(ax, -eye.dot(ax)).normalize(), yy = new T.Vector3().crossVectors(nn, ax), hold = new T.Group();
      g.matrixAutoUpdate = false; g.matrix.makeBasis(ax, yy, nn); hold.add(g); g = hold;
      var kc = ax.clone().multiplyScalar(d.grip[0]); hand(g, kc, ax, V(-.5, 0, .87), 1, .0125, kc.clone().add(V(-.17, -.44, .18)), sl, gl, { pad: MAT.poly2, thumbWrap: true, wrap: [58, 110, 158, 196], yaw: .3, top: .018, thumb: [-.6, .2, .5, -.6] });
    }
    else if (id === 'pistol') {
      var c = V(d.grip[0], d.grip[1] + .005, 0), up = V(.2, 1, 0);
      hand(g, c, up, V(-.55, 0, .85), 1, .017, V(c.x - .38, c.y - .2, .2), sl, gl, { top: .03, pad: MAT.poly2, thumbDir: V(.97, .22, -.12), off: [.014, 0, 0], re: .022 });
      hand(oh, c.clone().add(V(.004, -.012, 0)), up, V(-.5, 0, -.87), -1, .03, V(c.x - .36, c.y - .24, -.26), sl, gl, { top: .026, pad: MAT.poly2, thumbDir: V(.97, .2, .12), off: [.014, 0, 0], tight: .15 });
    } else {
      hand(g, V(d.grip[0] + .004, d.grip[1] + .012, 0), V(.28, 1, 0), V(-.55, 0, .85), 1, .018, V(d.grip[0] - .36, d.grip[1] - .2, .17), sl, gl, { top: .03, pad: MAT.poly2, off: [.02, 0, 0], re: .024, sink: .008 });
      var cup = d.cup || (d.fore ? [d.fore[0], d.fore[1] + .028, .027] : null);   // [x, y of the part's axis, its radius]
      if (d.vgrip) hand(oh, V(d.fore[0], d.fore[1] + .015, 0), V(.05, 1, 0), V(-.5, 0, -.87), -1, .017, V(d.fore[0] - .3, d.fore[1] - .22, -.3), sl, gl, { top: .028, pad: MAT.poly2, thumbWrap: true });   // a vertical foregrip is held like a second pistol grip
      else if (cup) hand(oh, V(cup[0], cup[1], 0), V(1, 0, 0), V(0, -.8, -.6), -1, cup[2], V(cup[0] - .3, cup[1] - .27, -.3), sl, gl, { pad: MAT.poly2, thumbDir: V(1, .04, .02), thumbAt: -75, wrap: [40, 85, 125, 160], yaw: .85 });
    }
    // two meshes, so steel can shine while polymer, wood, gloves and sleeves stay dull
    var out = new T.Group(); out.add(new T.Mesh(merge(g, false, function (m) { return !m.userData.soft; }), SV.gunMetal)); out.add(new T.Mesh(merge(g, false, function (m) { return !!m.userData.soft && !m.userData.sleeve; }), SV.gunSoft));
    out.add(new T.Mesh(mergeUV(g, function (m) { return !!m.userData.sleeve; }), sl));
    if (d.scan) out.add(d.scan); out.userData = { muzzle: d.muzzle, sight: d.sight, grip: d.grip };
    if (oh.children.length) { var og = new T.Group(); og.add(new T.Mesh(merge(oh, false, function (m) { return !!m.userData.soft && !m.userData.sleeve; }), SV.gunSoft)); og.add(new T.Mesh(mergeUV(oh, function (m) { return !!m.userData.sleeve; }), sl)); out.add(og); out.userData.off = og; }
    if (stG.children.length) { var sg3 = new T.Group(); sg3.add(new T.Mesh(merge(stG, false, function (m) { return !m.userData.soft; }), SV.gunMetal)); sg3.add(new T.Mesh(merge(stG, false, function (m) { return !!m.userData.soft; }), SV.gunSoft)); sg3.visible = false; out.add(sg3); out.userData.stock = sg3; }
    if (mgG.children.length) { var mg = new T.Group(); mg.add(new T.Mesh(merge(mgG, false, function (m) { return !m.userData.soft; }), SV.gunMetal)); mg.add(new T.Mesh(merge(mgG, false, function (m) { return !!m.userData.soft; }), SV.gunSoft)); out.add(mg); out.userData.mag = mg; }
    if (id === 'knife') out.userData.blade = [ax.clone().multiplyScalar(.012), ax.clone().multiplyScalar(.198)];   /* base and tip of the blade, for the swing trail */
    return out;
  };
  // where each weapon sits on screen at the hip: [x, y, z, pitch, yaw, roll] — low right, muzzle turned in toward the crosshair
  // Framing after Call of Duty 4: a wide view-model lens, the gun big in the lower right and held almost parallel to the
  // line of sight (no roll), so you look along its left side and top; x/y place the sight line, z the rear sight's distance.
  SV.VMFOV = 50;
  // sx, sy: where the sight line sits right of and below the eye; d: how far ahead the rear sight is
  function hip(sight, rear, sx, sy, d, yaw) { return [sx, sy - sight, -(d - rear), 0, yaw == null ? .03 : yaw, 0]; }
  // placed after the reference pictures: gun up out of the corner and turned in, so the support arm's sleeve and glove show
  var POSE = { rifle: hip(.099, -.12, .15, -.05, .26, .09), rifle2: hip(.097, -.12, .15, -.05, .26, .09), smg: hip(.098, -.1, .15, -.05, .27, .09), sniper: hip(.085, -.1, .15, -.07, .34, .09), shotgun: hip(.054, -.1, .15, -.045, .3, .09),
    pistol: hip(.05, -.08, .1, -.05, .44, .06), pistol2: hip(.05, -.08, .1, -.05, .44, .06), knife: [.12, -.055, -.34, 0, 0, 0] };
  SV.vmPose = function (id) { return POSE[id] || POSE.rifle; };

  // Third-person soldier, built from tubes and balls so limbs and helmet read as round. Faces +Z, feet at y = 0.
  // Returns { root, legL, legR } with the legs pivoting at the hip.
  // A limb or strap turned on a lathe between two points: [[fraction along, radius], ...]
  function limb(g, a, b, prof, mat, seg) {
    var dir = new T.Vector3().subVectors(b, a), len = dir.length(), geo = new T.LatheGeometry(prof.map(function (p) { return new T.Vector2(p[1], p[0] * len); }), seg || 12), m = new T.Mesh(geo, mat);
    m.position.copy(a); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize()); g.add(m); return m;
  }
  // a bevelled slab: outline in x-y, thickness along z, then placed and turned
  function slab(k, pts, depth, bv, mat, x, y, z, rx, ry, rz) { var g = exg(pts, -depth / 2, depth / 2, bv); return k.add(g, mat, x, y, z, rx, ry, rz); }
  function rect(w, h) { return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]; }
  var UP = [[0, .066], [.12, .074], [.45, .07], [1, .054]], FORE = [[0, .054], [.25, .06], [.7, .046], [1, .04]];
  function arm(g, S, Tg, bend, cloth, glove, band, pad, bare) {
    var L = .31, v = new T.Vector3().subVectors(Tg, S), d = Math.min(v.length(), L * 2 - .01); v.normalize();
    var h = Math.sqrt(Math.max(L * L - d * d / 4, 0)), perp = bend.clone().addScaledVector(v, -bend.dot(v)).normalize();
    var E = S.clone().addScaledVector(v, d / 2).addScaledVector(perp, h), H = S.clone().addScaledVector(v, d), k = kit(g), i;
    if (!bare) ball(g, S, .08, cloth, 1.05, .95, 1); limb(g, S, E, UP, cloth); ball(g, E, .055, cloth); limb(g, E, H, FORE, cloth);
    if (!bare) { limb(g, S.clone().lerp(E, .3), S.clone().lerp(E, .5), [[0, .0725], [1, .067]], band); limb(g, S.clone().lerp(E, .12), S.clone().lerp(E, .26), [[0, .076], [1, .075]], pad); }   // team armband, shoulder pocket
    var ep = ball(g, E, .052, pad, 1.15, 1.25, .8); ep.lookAt(S);                                                                    // elbow pad
    limb(g, E.clone().lerp(H, .78), E.clone().lerp(H, .97), [[0, .044], [.5, .047], [1, .045]], glove);                              // glove cuff
    // hand: a palm and four fingers curled round whatever it holds
    var f = new T.Vector3().subVectors(H, E).normalize(), side = new T.Vector3().crossVectors(f, new T.Vector3(0, 1, 0)).normalize(), up = new T.Vector3().crossVectors(side, f).normalize();
    var palm = ball(g, H.clone().addScaledVector(f, .03), .042, glove, 1, 1.25, .62); palm.lookAt(H.clone().add(side));
    for (i = 0; i < 4; i++) { var b0 = H.clone().addScaledVector(f, .06).addScaledVector(up, .036 - i * .024), b1 = b0.clone().addScaledVector(f, .03).addScaledVector(side, -.045), b2 = b1.clone().addScaledVector(f, -.03).addScaledVector(side, -.022); limb(g, b0, b1, [[0, .0115], [1, .0105]], glove, 6); limb(g, b1, b2, [[0, .0105], [1, .009]], glove, 6); ball(g, b1, .0115, glove); }
    limb(g, H.clone().addScaledVector(f, .02).addScaledVector(up, .04), H.clone().addScaledVector(f, .075).addScaledVector(up, .05).addScaledVector(side, -.02), [[0, .013], [1, .011]], glove, 6);   // thumb
    k.add(new T.BoxGeometry(.05, .03, .012), pad, 0, 0, 0).position.copy(H).addScaledVector(f, .04).addScaledVector(side, .03);                                                               // knuckle guard
  }
  var cache = {}, HIP = .93, KNEE = .52, blob = new T.CircleGeometry(.5, 20), blobMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .42, depthWrite: false });
  blob.rotateX(-PI / 2); (function () { var p = blob.attributes.position, c = [], i; for (i = 0; i < p.count; i++) { var k = 1 - .62 * Math.pow(1 - Math.min(1, Math.hypot(p.getX(i), p.getZ(i)) / .5), 1.4); c.push(k, k, k); } blob.setAttribute('color', new T.Float32BufferAttribute(c, 3)); })();
  blobMat.vertexColors = true; blobMat.blending = T.MultiplyBlending; blobMat.color.set(0xffffff); blobMat.opacity = 1;
  // The downloaded soldier: a skinned mesh with idle and run cycles. The weapon is fixed in front of the chest and both arms
  // are solved onto it every frame (see SV.poseArms); the rest of the body follows the animation.
  var gunCache = {}, teamMats = {};
  function heldGun(gunId, gx, gy, gz) {
    var c = gunCache[gunId]; if (c) return c; var d = GUN[gunId](), gg = new T.Group(), sg = null; d.g.rotation.y = -PI / 2; d.g.position.set(gx, gy, gz); gg.add(d.g);
    if (d.scan) { sg = new T.Group(); d.scan.rotation.y = -PI / 2; d.scan.position.set(gx, gy, gz); sg.add(d.scan); }
    return gunCache[gunId] = { scan: sg, geo: merge(gg), grip: new T.Vector3(gx, gy + d.grip[1] + .03, gz + d.grip[0]), fore: d.fore ? new T.Vector3(gx + .02, gy + d.fore[1], gz + d.fore[0]) : null, muzzle: new T.Vector3(gx, gy + d.muzzle[1], gz + d.muzzle[0]) };
  }
  function skinned(team, gunId) {
    var src = SV.assets.soldier, model = T.SkeletonUtils.clone(src.scene), root = new T.Group(), up = new T.Group(), bones = {}, tm = teamMats[team] || (teamMats[team] = {});
    model.rotation.y = PI; up.add(model); root.add(up);   // the file faces -Z, the game's rig faces +Z
    model.traverse(function (o) {
      if (o.isBone) bones[o.name.replace('mixamorig', '')] = o;
      if (o.isMesh) { var k = o.material.name; if (!tm[k]) { tm[k] = o.material.clone(); var skin = SV.assets.art['soldier_' + team], nm = SV.assets.art.soldier_nrm;
        if (skin) { tm[k].map = skin; tm[k].color.set(k.indexOf('Visor') < 0 ? 0xffffff : 0x8a8f94); if (nm) { tm[k].normalMap = nm; tm[k].normalScale.set(1, 1); } tm[k].roughness = .82; tm[k].envMapIntensity = .6; }
        else { if (k.indexOf('Visor') < 0) tm[k].color.set(team === 'A' ? 0xd2ad74 : 0x56708f); tm[k].roughness = Math.max(tm[k].roughness, .6); } } o.material = tm[k]; o.frustumCulled = false; }
    });
    var mixer = new T.AnimationMixer(model), acts = {}; ['Idle', 'Run', 'Walk'].forEach(function (n) { var cl = T.AnimationClip.findByName(src.animations, n); acts[n] = mixer.clipAction(cl); acts[n].play(); acts[n].setEffectiveWeight(n === 'Idle' ? 1 : 0); }); mixer.update(Math.random());
    var hg = heldGun(gunId, -.14, 1.38, .46), gun = new T.Mesh(hg.geo, SV.litMat); up.add(gun); if (hg.scan) gun.add(hg.scan.clone(true));
    var sh = new T.Mesh(blob, blobMat); sh.position.y = .025; sh.scale.setScalar(1.25); sh.renderOrder = 1; root.add(sh);
    return { root: root, up: up, skinned: true, mixer: mixer, acts: acts, bones: bones, gun: gun, grip: hg.grip, fore: hg.fore, shadow: sh, muzzle: hg.muzzle };
  }
  // A soldier generated from a single picture has no skeleton, so it is fitted onto the animated one: scaled to the same
  // height, legs sheared onto the leg bones and weighted to thigh / shin / foot, everything above the hips carried rigidly by
  // the chest (it already holds its rifle), the head by the head bone. Bind space is centimetres, Z up, +Y forward, left = -X.
  var scanGeo = null;
  function sstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function fitScan(sk) {
    if (scanGeo) return scanGeo; var src = null; SV.assets.scan.scene.traverse(function (o) { if (o.isMesh && !src) src = o; });
    var g = src.geometry.clone(), P = g.attributes.position, n = P.count, i, bi = {}, bp = {};
    sk.bones.forEach(function (b, k) { var nm = b.name.replace('mixamorig', ''); bi[nm] = k; bp[nm] = new T.Vector3().setFromMatrixPosition(sk.boneInverses[k].clone().invert()); });
    g.computeBoundingBox(); var bb = g.boundingBox, K = 181 / (bb.max.y - bb.min.y), y0 = bb.min.y, sx = 0, sz = 0, c = 0, ax = [0, 0], ac = [0, 0];
    for (i = 0; i < n; i++) { var h = (P.getY(i) - y0) * K; if (h > 20 && h < 50) { sx += P.getX(i); sz += P.getZ(i); c++; } } sx /= c; sz /= c;   // the shins mark the body's centre line
    for (i = 0; i < n; i++) { var hh = (P.getY(i) - y0) * K, xx = -(P.getX(i) - sx) * K; if (hh > 12 && hh < 24) { var s = xx < 0 ? 0 : 1; ax[s] += xx; ac[s]++; } }
    var ankle = [ax[0] / ac[0], ax[1] / ac[1]], hipZ = bp.LeftUpLeg.z, kneeZ = bp.LeftLeg.z, ankZ = bp.LeftFoot.z, legX = Math.abs(bp.LeftUpLeg.x);
    var SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
    for (i = 0; i < n; i++) {
      var x = -(P.getX(i) - sx) * K, y = (P.getZ(i) - sz) * K + 1, z = (P.getY(i) - y0) * K, side = x < 0 ? 0 : 1, L = side ? 'Right' : 'Left', w = [];
      var down = Math.max(0, Math.min(1, (hipZ - z) / (hipZ - ankZ))), lx = ankle[side] + (side ? legX : -legX - 0) * 0, cxLeg = (side ? 1 : -1) * legX + (ankle[side] - (side ? 1 : -1) * legX) * down;   // where this leg's axis is at this height
      var low = z < kneeZ - 10, isLeg = z < hipZ + 4 && Math.abs(x - cxLeg) < (low ? 22 : 15) && y < (low ? 40 : 15) && y > (low ? -28 : -17);   // boots reach further forward than thighs do
      if (isLeg) {
        x -= (ankle[side] - (side ? 1 : -1) * legX) * down;   // bring the leg under its bone
        var up = sstep(hipZ - 12, hipZ + 4, z), kn = sstep(kneeZ - 7, kneeZ + 7, z), an = sstep(ankZ - 4, ankZ + 5, z);
        w.push(['Hips', up], [L + 'UpLeg', (1 - up) * kn], [L + 'Leg', (1 - kn) * an], [L + 'Foot', 1 - an]);
      } else if (z < hipZ + 8) w.push(['Hips', 1 - sstep(hipZ - 4, hipZ + 8, z)], ['Spine1', sstep(hipZ - 4, hipZ + 8, z)]);
      else { var hd = sstep(bp.Neck.z - 3, bp.Neck.z + 5, z); w.push(['Spine1', 1 - hd], ['Head', hd]); }
      P.setXYZ(i, x, y, z); w.sort(function (a, b) { return b[1] - a[1]; });
      for (var j = 0; j < 4; j++) { SI[i * 4 + j] = w[j] ? bi[w[j][0]] : 0; SW[i * 4 + j] = w[j] ? w[j][1] : 0; }
    }
    g.setAttribute('skinIndex', new T.BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new T.BufferAttribute(SW, 4)); g.computeVertexNormals(); g.computeBoundingSphere();
    var mat = src.material, tex = mat.map; scanGeo = { geo: g, tex: tex }; return scanGeo;
  }
  var scanMats = {};
  function scanned(team, gunId) {
    var srcS = SV.assets.soldier, model = T.SkeletonUtils.clone(srcS.scene), root = new T.Group(), up = new T.Group(), bones = {}, old = null;
    model.rotation.y = PI; up.add(model); root.add(up);
    model.traverse(function (o) { if (o.isBone) bones[o.name.replace('mixamorig', '')] = o; if (o.isSkinnedMesh) { if (!old) old = o; o.visible = false; } });
    var f = fitScan(old.skeleton), mat = scanMats[team] || (scanMats[team] = new T.MeshStandardMaterial({ map: f.tex, roughness: .85, metalness: 0, skinning: true, envMapIntensity: .5, color: team === 'A' ? 0xfff0d6 : 0xb4c6e2, emissive: 0xffffff, emissiveMap: f.tex, emissiveIntensity: .12 }));   // team tint: warm for A, cool for B; a little self-light so the dark kit never goes black
    var mesh = new T.SkinnedMesh(f.geo, mat); mesh.frustumCulled = false; old.parent.add(mesh); mesh.bind(old.skeleton, old.bindMatrix);
    var mixer = new T.AnimationMixer(model), acts = {}; ['Idle', 'Run', 'Walk'].forEach(function (nm) { var cl = T.AnimationClip.findByName(srcS.animations, nm); acts[nm] = mixer.clipAction(cl); acts[nm].play(); acts[nm].setEffectiveWeight(nm === 'Idle' ? 1 : 0); }); mixer.update(Math.random());
    var sh = new T.Mesh(blob, blobMat); sh.position.y = .025; sh.scale.setScalar(1.25); sh.renderOrder = 1; root.add(sh);
    var gun = new T.Group(); up.add(gun);
    return { root: root, up: up, skinned: true, rigid: true, mixer: mixer, acts: acts, bones: bones, gun: gun, grip: null, fore: null, shadow: sh, muzzle: new T.Vector3(-.14, 1.3, .7) };
  }
  // put one arm's hand on a point given in the soldier's own space, elbow pushed toward `hint`
  var vS = new T.Vector3(), vT = new T.Vector3(), vE = new T.Vector3(), vHd = new T.Vector3(), vDir = new T.Vector3(), vHint = new T.Vector3(), qP = new T.Quaternion(), q1 = new T.Quaternion(), q2 = new T.Quaternion(), YY = new T.Vector3(0, 1, 0), vSc = new T.Vector3();
  function reach(m, side, target, hx, hy, hz) {
    var A = m.bones[side + 'Arm'], F = m.bones[side + 'ForeArm'], Hn = m.bones[side + 'Hand']; if (!A || !F || !Hn) return;
    A.parent.updateWorldMatrix(true, false); A.getWorldPosition(vS); A.getWorldScale(vSc); vT.copy(target).add(m.gun.position).applyMatrix4(m.up.matrixWorld);
    var L1 = F.position.length() * vSc.x, L2 = Hn.position.length() * vSc.x, d = Math.min(vDir.subVectors(vT, vS).length(), L1 + L2 - .002); vDir.normalize();
    var a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
    vHint.set(hx, hy, hz).transformDirection(m.up.matrixWorld); vHint.addScaledVector(vDir, -vHint.dot(vDir)).normalize();
    vE.copy(vS).addScaledVector(vDir, a).addScaledVector(vHint, h); vHd.copy(vS).addScaledVector(vDir, d);
    A.parent.getWorldQuaternion(qP); q1.setFromUnitVectors(YY, vDir.subVectors(vE, vS).normalize()); A.quaternion.copy(qP.invert()).multiply(q1);
    q2.setFromUnitVectors(YY, vDir.subVectors(vHd, vE).normalize()); F.quaternion.copy(q1.invert()).multiply(q2); Hn.quaternion.set(0, 0, 0, 1);
  }
  SV.poseArms = function (m) { if (m.rigid) return; m.root.updateMatrixWorld(true); reach(m, 'Right', m.grip, -.5, -1, -.2); reach(m, 'Left', m.fore || m.grip, .6, -1, .1); };
  SV.soldier = function (team, gunId) {
    if (SV.assets && SV.assets.soldier && SV.assets.scan && T.SkeletonUtils) return scanned(team, gunId);
    if (SV.assets && SV.assets.soldier && T.SkeletonUtils) return skinned(team, gunId);
    var key = team + gunId, c = cache[key];
    if (!c) {
      var A = team === 'A', tc = A ? 0xffb347 : 0x6cc4e0, cloth = A ? camo(0x8a7a58, 0x6b5d40, 0x4d4733) : camo(0x5d6a70, 0x44525a, 0x2c363d), cloth2 = A ? camo(0x7b6c4c, 0x5e5239, 0x433d2c) : camo(0x525e64, 0x3c4950, 0x283137);
      var gear = mk(A ? 0x5f543d : 0x30363b), gear2 = mk(A ? 0x4a402f : 0x22272b), pad = mk(0x1a1c1e), boot = mk(A ? 0x55452f : 0x1c1e20), teamM = mk(tc), skin = MAT.skin, hood = mk(0x1d2022), strap = mk(A ? 0x3a3326 : 0x15181b);
      var body = new T.Group(), k = kit(body), legs = [new T.Group(), new T.Group()], shins = [new T.Group(), new T.Group()], V = function (x, y, z) { return new T.Vector3(x, y, z); }, i;
      [-1, 1].forEach(function (sx, n) {
        var x = sx * .1, l = legs[n], sh = shins[n], lk = kit(l), sk = kit(sh), q;
        limb(l, V(x, .95, 0), V(x, .52, .012), [[0, .1], [.2, .106], [.65, .09], [1, .078]], cloth2, 14);                                                   // thigh
        slab(lk, rect(.11, .15), .05, .014, gear, x + sx * .092, .74, .01, 0, PI / 2, 0); slab(lk, rect(.118, .05), .056, .01, gear2, x + sx * .094, .8, .01, 0, PI / 2, 0); lk.b(.012, .012, .012, pad, x + sx * .125, .785, .01);   // cargo pocket, flap, snap
        if (sx < 0) {   // drop-leg holster with a pistol in it
          slab(lk, [[-.04, -.1], [.04, -.1], [.05, .02], [.03, .07], [-.05, .07]], .045, .01, gear2, x - .115, .78, .015, 0, PI / 2, 0); slab(lk, [[-.02, 0], [.03, 0], [.045, .07], [-.01, .08]], .03, .006, MAT.poly, x - .118, .86, .0, 0, PI / 2, 0);
          limb(l, V(x, .86, 0), V(x, .835, .002), [[0, .104], [1, .103]], strap); limb(l, V(x, .72, .004), V(x, .695, .006), [[0, .096], [1, .094]], strap); lk.b(.03, .1, .012, strap, x - .1, .93, .0);
        }
        ball(sh, V(x, .52, .012), .078, cloth2);
        q = slab(sk, [[-.062, -.07], [.062, -.07], [.072, .01], [.05, .085], [-.05, .085], [-.072, .01]], .04, .016, pad, x, .515, .078); limb(sh, V(x, .56, .012), V(x, .545, .012), [[0, .082], [1, .081]], strap); limb(sh, V(x, .47, .012), V(x, .455, .012), [[0, .079], [1, .078]], strap);   // knee pad and straps
        limb(sh, V(x, .52, .012), V(x, .2, 0), [[0, .078], [.22, .086], [.6, .07], [1, .058]], cloth2, 14);                                                // calf
        limb(sh, V(x, .2, 0), V(x, .29, 0), [[0, .062], [.6, .067], [1, .06]], cloth2);                                                                     // trouser bloused over the boot
        // boot: upper and sole cut from side profiles, with a toe cap and laces
        var up = exg([[-.085, .03], [.17, .03], [.185, .06], [.16, .095], [.09, .115], [.045, .15], [.04, .27], [-.065, .27], [-.085, .12]], -.048, .048, .014), so = exg([[-.095, 0], [.185, 0], [.195, .02], [.19, .034], [-.095, .034]], -.054, .054, .006);
        up.rotateY(-PI / 2); so.rotateY(-PI / 2); sk.add(up, boot, x, 0, 0); sk.add(so, MAT.rubber, x, 0, 0); sk.b(.11, .012, .05, MAT.rubber, x, .012, -.065);
        for (i = 0; i < 5; i++) sk.b(.05, .007, .01, pad, x, .13 + i * .028, .049 - i * .002); sk.b(.02, .05, .01, pad, x, .2, -.07);
      });
      // pelvis, belt and what hangs on it
      var hip = k.add(new T.LatheGeometry([[0, .86], [.1, .87], [.165, .92], [.175, .98], [.17, 1.03]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 16), cloth2, 0, 0, 0); hip.scale.z = .72;
      var belt = k.add(new T.LatheGeometry([[.182, .985], [.19, .99], [.19, 1.04], [.182, 1.045]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 18), gear2, 0, 0, 0); belt.scale.z = .73;
      slab(k, rect(.05, .045), .012, .004, MAT.steel, 0, 1.015, .14); slab(k, rect(.085, .11), .05, .014, gear, .15, .985, .075, 0, .9, 0); slab(k, rect(.07, .12), .05, .014, gear, -.02, .98, -.14); slab(k, rect(.1, .1), .055, .016, gear, .1, .98, -.125, 0, -.5, 0); slab(k, rect(.06, .07), .04, .01, MAT.red, -.15, .99, -.07, 0, -1, 0);
      // torso
      var torso = k.add(new T.LatheGeometry([[.168, 1.0], [.172, 1.08], [.168, 1.16], [.185, 1.28], [.2, 1.38], [.19, 1.44], [.12, 1.49], [.06, 1.5]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 18), cloth, 0, 0, 0); torso.scale.z = .66;
      // plate carrier: plates with clipped corners, cummerbund with webbing rows, shoulder straps
      var plate = [[-.135, -.17], [.135, -.17], [.14, .1], [.09, .18], [-.09, .18], [-.14, .1]];
      slab(k, plate, .042, .014, gear, 0, 1.26, .128, -.06, 0, 0); slab(k, plate, .042, .014, gear, 0, 1.26, -.128, .05, 0, 0);
      var cb = k.add(new T.LatheGeometry([[.196, 1.07], [.203, 1.075], [.208, 1.25], [.2, 1.255]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 18), gear, 0, 0, 0); cb.scale.z = .69;
      for (i = 0; i < 4; i++) { var mo = k.add(new T.LatheGeometry([[.209, 1.09 + i * .042], [.212, 1.093 + i * .042], [.212, 1.112 + i * .042], [.209, 1.115 + i * .042]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 18), strap, 0, 0, 0); mo.scale.z = .69; }
      for (i = 0; i < 4; i++) { k.b(.24, .018, .008, strap, 0, 1.3 + i * .035, .153, -.06); k.b(.24, .018, .008, strap, 0, 1.24 + i * .04, -.152, .05); }
      [-1, 1].forEach(function (sx) { slab(k, [[-.14, 0], [-.1, .045], [0, .062], [.1, .045], [.14, 0], [.14, -.02], [-.14, -.02]], .06, .01, gear2, sx * .1, 1.44, 0, 0, PI / 2, 0); k.b(.05, .02, .03, strap, sx * .1, 1.41, .12); });
      // three magazine pouches with flaps and the magazines showing, an admin pouch, radio
      for (i = -1; i <= 1; i++) { slab(k, rect(.074, .13), .04, .012, gear2, i * .086, 1.135, .168, -.06, 0, 0); slab(k, [[-.03, 0], [.03, 0], [.026, .05], [-.022, .05]], .022, .003, MAT.dark, i * .086 + .004, 1.2, .166, -.06, 0, .08); slab(k, rect(.076, .03), .046, .008, strap, i * .086, 1.185, .17, -.06, 0, 0); k.b(.02, .02, .01, pad, i * .086, 1.175, .196); }
      slab(k, rect(.15, .075), .03, .01, gear2, -.03, 1.35, .16, -.06, 0, 0); slab(k, rect(.065, .042), .006, .001, teamM, .09, 1.355, .156, -.06, 0, 0); k.b(.04, .03, .012, MAT.poly2, -.09, 1.4, .165);
      slab(k, rect(.06, .14), .05, .012, MAT.poly2, .168, 1.27, -.1, 0, .6, 0); k.cy(.006, .34, MAT.dark, .185, 1.5, -.115, 6); k.cy(.01, .03, MAT.dark, .185, 1.34, -.115, 6);
      limb(body, V(.17, 1.3, -.06), V(.11, 1.43, .1), [[0, .006], [1, .006]], MAT.dark, 5); k.b(.03, .04, .02, MAT.dark, .1, 1.42, .12);                                               // radio cable and push-to-talk
      // assault pack with straps and a carry handle
      slab(k, [[-.13, -.17], [.13, -.17], [.145, .1], [.1, .17], [-.1, .17], [-.145, .1]], .1, .024, gear2, 0, 1.26, -.215); slab(k, rect(.2, .1), .05, .016, gear, 0, 1.16, -.275); slab(k, rect(.12, .062), .006, .001, teamM, 0, 1.33, -.269);
      [-.07, .07].forEach(function (x) { k.b(.02, .3, .008, strap, x, 1.26, -.268); k.b(.03, .02, .014, pad, x, 1.3, -.27); }); limb(body, V(-.04, 1.44, -.2), V(.04, 1.44, -.2), [[0, .008], [.5, .012], [1, .008]], strap, 6);
      // neck, head, face
      limb(body, V(0, 1.44, 0), V(0, 1.53, .005), [[0, .058], [1, .052]], hood); k.s(.1, hood, 0, 1.59, 0, .95, 1.14, 1.04);
      k.s(.075, skin, 0, 1.6, .042, 1.05, .5, .8); [-1, 1].forEach(function (sx) { k.s(.011, MAT.dark, sx * .034, 1.607, .097, 1.3, .8, .6); k.b(.03, .006, .01, hood, sx * .034, 1.622, .098); });   // eyes area, nose, eyes, brows
      slab(k, [[-.07, -.018], [.07, -.018], [.074, .01], [.05, .02], [.012, .014], [0, .006], [-.012, .014], [-.05, .02], [-.074, .01]], .012, .003, MAT.glass, 0, 1.606, .108); [-1, 1].forEach(function (sx) { k.b(.008, .008, .1, MAT.poly2, sx * .076, 1.61, .06); });   // ballistic glasses
      // helmet: lathed shell, band in the team colour, shroud, rails, counterweight, chin strap
      var helm = k.add(new T.LatheGeometry([[0, .138], [.045, .134], [.09, .112], [.12, .07], [.131, .02], [.131, -.02], [.127, -.03]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 20), cloth2, 0, 1.612, -.008); helm.scale.set(1.03, 1, 1.17);
      var hb = k.add(new T.LatheGeometry([[.1325, .002], [.1345, .004], [.1345, .022], [.1325, .024]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 20), teamM, 0, 1.612, -.008); hb.scale.set(1.03, 1, 1.17);
      slab(k, [[-.03, -.03], [.03, -.03], [.03, .02], [.018, .03], [-.018, .03], [-.03, .02]], .02, .005, MAT.dark, 0, 1.672, .146, -.25, 0, 0); k.b(.024, .016, .02, MAT.steel, 0, 1.66, .158);
      [-1, 1].forEach(function (sx) { slab(k, [[-.06, -.01], [.06, -.01], [.065, 0], [.06, .01], [-.06, .01]], .012, .003, MAT.dark, sx * .137, 1.625, -.005, 0, PI / 2, 0); for (var q = 0; q < 4; q++) k.b(.014, .012, .008, MAT.steel, sx * .143, 1.625, -.04 + q * .024);
        var cup = k.add(new T.LatheGeometry([[0, .03], [.03, .028], [.046, .012], [.048, -.012], [.04, -.02]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 12), gear2, sx * .112, 1.572, .002, 0, 0, -sx * PI / 2); cup.scale.y = .9;
        limb(body, V(sx * .11, 1.6, .0), V(sx * .105, 1.67, -.01), [[0, .008], [1, .008]], gear2, 5); limb(body, V(sx * .1, 1.56, .03), V(sx * .06, 1.492, .07), [[0, .006], [1, .006]], pad, 5); });
      limb(body, V(-.06, 1.492, .07), V(.06, 1.492, .07), [[0, .006], [1, .006]], pad, 5); slab(k, rect(.05, .028), .03, .008, pad, 0, 1.488, .085);                                     // chin strap and cup
      limb(body, V(-.115, 1.565, .03), V(-.06, 1.535, .105), [[0, .005], [1, .005]], MAT.dark, 5); k.s(.012, MAT.dark, -.055, 1.533, .108);                                             // microphone boom
      slab(k, rect(.07, .05), .03, .008, gear2, 0, 1.63, -.165, .3, 0, 0); slab(k, rect(.06, .06), .004, .001, MAT.dark, 0, 1.752, -.01, PI / 2, 0, 0);                                   // counterweight, top patch
      // shouldered weapon; the sling crosses the chest
      var d = GUN[gunId](), gx = -.13, gy = 1.385, gz = .3, gg = new T.Group(); d.g.rotation.y = -PI / 2; d.g.position.set(gx, gy, gz); gg.add(d.g);
      limb(body, V(.12, 1.44, -.1), V(-.14, 1.3, .14), [[0, .011], [1, .011]], strap, 5); limb(body, V(-.14, 1.3, .14), V(gx, gy - .03, gz - .2), [[0, .009], [1, .009]], strap, 5);
      arm(body, V(-.215, 1.4, .01), V(gx - .01, gy + d.grip[1] + .02, gz + d.grip[0]), V(-.5, -1, -.35), cloth, gear2, teamM, pad);
      if (d.fore) arm(body, V(.215, 1.4, .02), V(gx + .01, gy + d.fore[1] - .005, gz + d.fore[0]), V(.25, -1, .1), cloth, gear2, teamM, pad);
      else arm(body, V(.215, 1.4, .02), V(.2, 1.0, .12), V(.3, 0, -1), cloth, gear2, teamM, pad);
      var lg = legs.map(function (l) { var gm = merge(l); gm.translate(0, -HIP, 0); return gm; }), sg = shins.map(function (l) { var gm = merge(l); gm.translate(0, -KNEE, -.012); return gm; });
      c = cache[key] = { body: merge(body), gun: merge(gg), legL: lg[0], legR: lg[1], shinL: sg[0], shinR: sg[1], muzzle: new T.Vector3(gx, gy + d.muzzle[1], gz + d.muzzle[0]) };
    }
    // root > upper (body + weapon), thighs pivoting at the hip, shins pivoting at the knee, and a soft shadow on the ground
    var root = new T.Group(), up = new T.Group(), b = new T.Mesh(c.body, SV.clothMat), g = new T.Mesh(c.gun, SV.litMat), l = new T.Mesh(c.legL, SV.clothMat), r = new T.Mesh(c.legR, SV.clothMat), sl = new T.Mesh(c.shinL, SV.clothMat), sr = new T.Mesh(c.shinR, SV.clothMat);
    l.position.y = r.position.y = HIP; sl.position.set(0, KNEE - HIP, .012); sr.position.set(0, KNEE - HIP, .012); l.add(sl); r.add(sr); up.add(b); up.add(g); root.add(up); root.add(l); root.add(r);
    var sh = new T.Mesh(blob, blobMat); sh.position.y = .025; sh.renderOrder = 1; root.add(sh);
    return { root: root, up: up, legL: l, legR: r, shinL: sl, shinR: sr, shadow: sh, muzzle: c.muzzle };
  };
})();
