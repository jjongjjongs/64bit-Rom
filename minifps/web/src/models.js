// models.js — weapons and soldiers assembled from boxes and cylinders, then merged into one vertex-coloured geometry each.
var SV = window.SV = window.SV || {};
(function () {
  var T = THREE, PI = Math.PI;
  function mk(c) { return new T.MeshBasicMaterial({ color: c }); }
  function camo(a, b, c) { var m = mk(a); m.userData.camo = [new T.Color(a).convertSRGBToLinear(), new T.Color(b).convertSRGBToLinear(), new T.Color(c).convertSRGBToLinear()]; return m; }
  var MAT = { steel: mk(0x2c3136), dark: mk(0x15181b), bright: mk(0x6f7a82), poly: mk(0x2b3035), poly2: mk(0x1a1d20), rubber: mk(0x0e1012),
    wood: mk(0x7a4a26), wood2: mk(0x5c3619), accent: mk(0xffb347), brass: mk(0xb08a3c), red: mk(0xb23a2a), lens: mk(0xffb347), glass: mk(0x1c4a60),
    olive: mk(0x4b5a3a), glove: mk(0x2a2823), fde: mk(0x8a7858), fde2: mk(0x6e5f45), band: mk(0xc9a227), skin: mk(0xb98a66),
    sleeveA: camo(0x8a7a58, 0x6b5d40, 0x4d4733), sleeveB: camo(0x5d6a70, 0x44525a, 0x2c363d) };

  ['poly', 'poly2', 'rubber', 'wood', 'wood2', 'olive', 'glove', 'fde', 'fde2', 'skin', 'sleeveA', 'sleeveB'].forEach(function (n) { MAT[n].userData.soft = true; });

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
  GUN.rifle = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i;
    ex(k, [[-.14, .002], [.13, .002], [.13, .056], [.122, .064], [-.132, .064], [-.14, .052]], -.021, .021, m.steel, .003);                                    // upper receiver
    ex(k, [[-.14, 0], [.1, 0], [.1, -.04], [.04, -.052], [.036, -.03], [-.03, -.03], [-.05, -.022], [-.14, -.022]], -.019, .019, m.steel, .0025);              // lower receiver and magazine well
    k.b(.062, .02, .003, m.rubber, .02, .034, -.0225); k.b(.066, .006, .006, m.dark, .02, .021, -.0235); k.cz(.007, .014, m.dark, -.09, .04, -.026, 10);        // ejection port, its cover hinge, forward assist
    k.b(.012, .022, .004, m.dark, -.03, .012, .0215); k.cz(.005, .006, m.dark, .03, -.012, -.0205, 10); k.cz(.0042, .045, m.bright, -.12, -.012, 0, 8); k.cz(.0042, .045, m.bright, .085, -.01, 0, 8); k.b(.016, .008, .006, m.dark, -.07, -.006, .021);   // bolt release, magazine button, take-down pins, selector
    ex(k, [[-.168, .05], [-.13, .05], [-.13, .062], [-.168, .062]], -.016, .016, m.dark, .002);                                                               // charging handle
    teeth(k, -.128, 56, .0675, .021, m.steel);
    var hg = k.cx(.031, .3, m.steel, .28, .03, 0, 8); hg.rotation.x = PI / 8;                                                                                   // free-float handguard, slotted on three faces
    for (i = 0; i < 6; i++) { k.b(.032, .003, .009, m.rubber, .16 + i * .048, .0002, 0); k.b(.032, .009, .003, m.rubber, .16 + i * .048, .03, .0298); k.b(.032, .009, .003, m.rubber, .16 + i * .048, .03, -.0298); }
    k.cx(.0085, .2, m.dark, .52, .03, 0, 12); k.cx(.0125, .03, m.steel, .45, .03, 0, 12);                                                                       // barrel, gas block
    lx(k, [[.6, 0], [.6, .0125], [.612, .0138], [.66, .0138], [.668, .011], [.668, 0]], m.dark, .03); for (i = 0; i < 3; i++) k.b(.007, .009, .03, m.rubber, .622 + i * .014, .03, 0);   // muzzle brake and its ports
    k.b(.075, .012, .03, m.dark, .003, .074, 0); k.b(.02, .012, .034, m.steel, -.02, .076, 0); k.b(.02, .012, .034, m.steel, .026, .076, 0);                    // optic mount and clamps
    exX(k, [[-.023, .082], [.023, .082], [.023, .13], [.017, .138], [-.017, .138], [-.023, .13]], -.03, .036, m.dark, .0015, [[[-.018, .09], [.018, .09], [.018, .128], [.014, .132], [-.014, .132], [-.018, .128]]]);   // reflex sight: you aim through the window
    k.cz(.006, .008, m.steel, .0, .1, .027, 8); k.cy(.005, .006, m.steel, .0, .141, 0, 8);
    ex(k, [[-.09, -.02], [-.045, -.02], [-.058, -.07], [-.08, -.145], [-.128, -.138], [-.108, -.07]], -.014, .014, m.fde, .005); trig(k, -.005, -.03, m.bright, m.steel);   // pistol grip, trigger
    ex(k, [[.04, -.04], [.094, -.034], [.104, -.12], [.122, -.2], [.07, -.214], [.055, -.13]], -.0125, .0125, m.poly2, .002);                                  // curved magazine, ribs, floor plate
    for (i = 0; i < 4; i++) k.b(.05, .004, .0275, m.dark, .083 + i * .007, -.072 - i * .036, 0, 0, 0, .2); k.b(.06, .01, .03, m.fde, .097, -.212, 0, 0, 0, .27);
    ex(k, [[.2, 0], [.32, 0], [.3, -.03], [.24, -.042], [.21, -.03]], -.014, .014, m.fde, .004);                                                               // angled foregrip
    k.cx(.0145, .07, m.dark, .38, .03, .047, 12); k.cx(.0168, .014, m.dark, .42, .03, .047, 12); k.cx(.013, .003, m.bright, .4275, .03, .047, 12); k.b(.03, .012, .018, m.dark, .38, .03, .034);   // weapon light
    k.cx(.0145, .2, m.steel, -.235, .03, 0, 12); k.cx(.0185, .012, m.steel, -.142, .03, 0, 12);                                                                 // buffer tube, castle nut
    ex(k, [[-.21, .052], [-.37, .052], [-.385, .04], [-.385, -.07], [-.365, -.078], [-.3, -.028], [-.21, .004]], -.019, .019, m.fde, .004, [[[-.33, 0], [-.365, 0], [-.365, -.05], [-.33, -.02]]]);   // skeleton stock
    k.b(.02, .13, .044, m.rubber, -.397, -.012, 0); k.b(.012, .03, .006, m.steel, -.2, -.012, .021);
    return { g: g, grip: [-.105, -.1], fore: [.265, -.035], muzzle: [.67, .03], sight: .11 };
  };
  GUN.smg = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i;
    ex(k, [[-.15, -.012], [.15, -.012], [.15, .05], [.14, .066], [-.14, .066], [-.15, .056]], -.022, .022, m.poly, .003);                                       // receiver
    k.b(.06, .022, .003, m.rubber, .03, .036, -.0235); k.cz(.006, .018, m.bright, -.04, .05, .029, 8); k.b(.016, .008, .006, m.dark, -.06, .012, .0225); k.cz(.004, .048, m.bright, -.12, .0, 0, 8); k.cz(.004, .048, m.bright, .1, .0, 0, 8);
    teeth(k, -.125, 26, .069, .02, m.steel);
    k.cx(.019, .1, m.steel, .2, .028, 0, 12); for (i = 0; i < 4; i++) { k.b(.012, .042, .008, m.rubber, .165 + i * .022, .028, 0); k.b(.012, .008, .042, m.rubber, .165 + i * .022, .028, 0); }   // vented shroud
    k.cx(.0095, .06, m.dark, .28, .028, 0, 12); lx(k, [[.295, .0095], [.295, .012], [.31, .012], [.31, 0]], m.dark, .028);
    k.b(.012, .034, .005, m.dark, -.1, .089, .011); k.b(.012, .034, .005, m.dark, -.1, .089, -.011); k.b(.014, .012, .03, m.dark, -.1, .076, 0);                // rear notch
    exX(k, [[-.013, .072], [.013, .072], [.013, .104], [.008, .112], [-.008, .112], [-.013, .104]], .1, .118, m.dark, .001, [[[-.009, .078], [.009, .078], [.009, .102], [.006, .107], [-.006, .107], [-.009, .102]]]); k.b(.004, .026, .004, m.bright, .109, .09, 0);   // hooded front post
    ex(k, [[-.1, -.012], [-.045, -.012], [-.055, -.07], [-.07, -.135], [-.115, -.13], [-.1, -.07]], -.015, .015, m.poly2, .005); trig(k, -.006, -.014, m.bright, m.poly);
    ex(k, [[.032, -.012], [.07, -.012], [.068, -.21], [.03, -.21]], -.012, .012, m.steel, .002); k.b(.046, .01, .03, m.dark, .049, -.213, 0); for (i = 0; i < 5; i++) k.b(.003, .16, .0255, m.dark, .04 + i * .006, -.11, 0);   // stick magazine
    ex(k, [[.145, -.012], [.19, -.012], [.186, -.1], [.15, -.1]], -.014, .014, m.poly2, .005);                                                                 // vertical foregrip
    k.cx(.005, .21, m.steel, -.25, .045, .016, 8); k.cx(.005, .21, m.steel, -.25, .045, -.016, 8); ex(k, [[-.345, .066], [-.362, .066], [-.362, -.06], [-.345, -.06]], -.023, .023, m.rubber, .003);   // wire stock
    return { g: g, grip: [-.075, -.085], fore: [.167, -.07], muzzle: [.31, .028], sight: .118 };
  };
  GUN.sniper = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i;
    ex(k, [[-.2, -.03], [.5, -.03], [.5, 0], [.2, .012], [.2, .03], [-.2, .03]], -.024, .024, m.poly, .004);                                                    // chassis and fore-end
    k.cx(.021, .3, m.steel, .03, .045, 0, 14); k.b(.07, .014, .004, m.rubber, .05, .05, -.019); k.cx(.022, .02, m.dark, -.125, .045, 0, 14);                     // action, port, bolt shroud
    k.cz(.006, .05, m.bright, -.1, .04, -.045, 8); k.s(.013, m.dark, -.1, .036, -.075);                                                                         // bolt handle
    lx(k, [[.18, 0], [.18, .016], [.3, .0135], [.82, .0105], [.82, 0]], m.steel, .045, 0, 14);                                                                 // tapered barrel
    k.b(.075, .03, .036, m.dark, .857, .045, 0); for (i = 0; i < 3; i++) k.b(.012, .02, .04, m.rubber, .835 + i * .022, .045, 0);                               // brake
    teeth(k, -.1, 27, .0705, .02, m.steel); k.b(.27, .006, .022, m.steel, .03, .066, 0);
    [-.04, .09].forEach(function (x) { k.b(.022, .03, .03, m.dark, x, .088, 0); k.cx(.0245, .022, m.dark, x, .125, 0, 14); });                                  // scope rings
    lx(k, [[-.2, 0], [-.2, .019], [-.17, .0215], [-.13, .0215], [-.11, .015], [.12, .015], [.16, .026], [.25, .026], [.25, 0]], m.dark, .125, 0, 16);            // scope
    k.cx(.0235, .003, m.glass, .2515, .125, 0, 16); k.cx(.0185, .003, m.glass, -.2015, .125, 0, 16); k.cy(.014, .028, m.steel, .03, .152, 0, 12); k.cz(.014, .028, m.steel, .03, .125, .028, 12);
    ex(k, [[.02, -.03], [.1, -.03], [.095, -.092], [.025, -.092]], -.014, .014, m.poly2, .002);                                                                // magazine
    ex(k, [[-.16, -.03], [-.1, -.03], [-.115, -.08], [-.14, -.15], [-.185, -.145], [-.165, -.08]], -.015, .015, m.rubber, .005); trig(k, -.055, -.03, m.bright, m.poly);
    ex(k, [[-.2, .03], [-.47, .03], [-.48, .02], [-.48, -.1], [-.46, -.105], [-.36, -.03], [-.2, -.03]], -.021, .021, m.poly, .004, [[[-.4, 0], [-.45, 0], [-.45, -.07], [-.4, -.03]]]);   // skeleton stock
    ex(k, [[-.26, .03], [-.39, .03], [-.39, .05], [-.38, .056], [-.27, .056], [-.26, .05]], -.018, .018, m.fde, .003); k.b(.022, .13, .046, m.rubber, -.492, -.04, 0);   // cheek rest, butt pad
    k.cx(.007, .2, m.dark, .4, -.042, .02, 8); k.cx(.007, .2, m.dark, .4, -.042, -.02, 8); k.b(.03, .024, .06, m.dark, .49, -.036, 0);                           // folded bipod
    return { g: g, grip: [-.14, -.1], fore: [.3, -.05], muzzle: [.9, .045], sight: .125 };
  };
  GUN.shotgun = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i;
    ex(k, [[-.12, -.04], [.12, -.04], [.12, .03], [.11, .04], [-.1, .04], [-.12, .02]], -.021, .021, m.steel, .003);                                           // receiver
    k.b(.075, .022, .003, m.rubber, .02, .012, -.0225); k.b(.09, .004, .03, m.rubber, .02, -.0405, 0); k.cz(.004, .046, m.bright, -.08, -.02, 0, 8);            // ejection port, loading port, pin
    k.cx(.014, .54, m.steel, .39, .022, 0, 14); k.cx(.0125, .44, m.dark, .33, -.014, 0, 14); k.cx(.0145, .02, m.steel, .56, -.014, 0, 14); k.b(.02, .056, .034, m.dark, .5, .004, 0);   // barrel, magazine tube, cap, clamp
    k.s(.0045, m.brass, .652, .039, 0); k.b(.3, .0035, .032, m.dark, .33, .0385, 0); for (i = 0; i < 9; i++) k.b(.016, .004, .012, m.rubber, .21 + i * .03, .039, 0);   // bead, vented heat shield
    k.cx(.027, .17, m.wood, .25, -.014, 0, 12); for (i = 0; i < 6; i++) k.cx(.0278, .006, m.wood2, .185 + i * .026, -.014, 0, 12);                               // ribbed fore-end
    ex(k, [[-.12, .03], [-.2, .025], [-.44, -.02], [-.44, -.13], [-.25, -.07], [-.19, -.062], [-.12, -.04]], -.02, .02, m.wood, .006); k.b(.022, .115, .044, m.rubber, -.452, -.075, 0);   // stock, pad
    trig(k, -.06, -.04, m.bright, m.steel);
    k.b(.13, .04, .006, m.poly2, 0, 0, -.026); for (i = 0; i < 4; i++) { k.cy(.011, .05, m.red, -.045 + i * .03, .005, -.04, 10); k.cy(.0112, .012, m.brass, -.045 + i * .03, -.02, -.04, 10); }   // side saddle
    return { g: g, grip: [-.17, -.05], fore: [.25, -.04], muzzle: [.66, .022], sight: .054 };
  };
  GUN.pistol = function () {
    var g = new T.Group(), k = kit(g), m = MAT, i;
    ex(k, [[-.085, .014], [.125, .014], [.125, .04], [.118, .047], [-.08, .047], [-.085, .042]], -.0145, .0145, m.steel, .002);                                 // slide
    for (i = 0; i < 7; i++) k.b(.003, .024, .0305, m.dark, -.072 + i * .007, .03, 0); k.b(.04, .012, .014, m.rubber, .03, .042, -.008);                         // serrations, ejection port
    k.cx(.006, .006, m.bright, .1275, .032, 0, 12); k.cx(.004, .004, m.dark, .1265, .02, 0, 10);                                                                // muzzle, guide rod
    ex(k, [[-.08, .014], [.112, .014], [.112, -.004], [.045, -.01], [-.02, -.01], [-.035, -.03], [-.045, -.125], [-.095, -.118], [-.085, -.03]], -.0135, .0135, m.poly, .003);   // frame and grip
    k.b(.05, .006, .022, m.dark, .075, -.008, 0); for (i = 0; i < 3; i++) k.b(.004, .008, .024, m.rubber, .06 + i * .014, -.009, 0);                             // accessory rail
    trig(k, .003, -.01, m.bright, m.poly);
    k.b(.006, .008, .004, m.bright, .112, .051, 0); k.b(.008, .01, .005, m.dark, -.072, .052, .008); k.b(.008, .01, .005, m.dark, -.072, .052, -.008); k.b(.006, .03, .026, m.dark, -.087, .03, 0);   // sights, back plate
    for (i = 0; i < 6; i++) k.b(.034, .004, .0285, m.rubber, -.056 - i * .0015, -.04 - i * .013, 0, 0, 0, -.12); k.b(.054, .008, .03, m.dark, -.071, -.124, 0, 0, 0, -.12);   // grip panels, magazine floor
    return { g: g, grip: [-.06, -.07], fore: [-.045, -.095], muzzle: [.13, .03], sight: .063 };
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
  SV.merge = merge; SV.GUN = GUN; SV.kit = kit; SV.mk = mk;
  SV.litMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .3, envMapIntensity: .55 });
  SV.gunMetal = new T.MeshStandardMaterial({ vertexColors: true, roughness: .34, metalness: .88, envMapIntensity: 1.25, side: T.DoubleSide });
  SV.gunSoft = new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, envMapIntensity: .4, side: T.DoubleSide });
  SV.clothMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0, envMapIntensity: .35 });   // fabric and webbing: no shine

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
    // two meshes, so steel can shine while polymer, wood, gloves and sleeves stay dull
    var out = new T.Group(); out.add(new T.Mesh(merge(g, false, function (m) { return !m.userData.soft; }), SV.gunMetal)); out.add(new T.Mesh(merge(g, false, function (m) { return !!m.userData.soft; }), SV.gunSoft));
    out.userData = { muzzle: d.muzzle, sight: d.sight }; return out;
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
  var cache = {}, HIP = .93, KNEE = .52, blob = new T.CircleGeometry(.5, 20), blobMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .42, depthWrite: false });
  blob.rotateX(-PI / 2); (function () { var p = blob.attributes.position, c = [], i; for (i = 0; i < p.count; i++) { var k = 1 - .62 * Math.pow(1 - Math.min(1, Math.hypot(p.getX(i), p.getZ(i)) / .5), 1.4); c.push(k, k, k); } blob.setAttribute('color', new T.Float32BufferAttribute(c, 3)); })();
  blobMat.vertexColors = true; blobMat.blending = T.MultiplyBlending; blobMat.color.set(0xffffff); blobMat.opacity = 1;
  SV.soldier = function (team, gunId) {
    var key = team + gunId, c = cache[key];
    if (!c) {
      var A = team === 'A', tc = A ? 0xffb347 : 0x6cc4e0, cloth = A ? camo(0x8a7a58, 0x6b5d40, 0x4d4733) : camo(0x5d6a70, 0x44525a, 0x2c363d), cloth2 = A ? camo(0x7b6c4c, 0x5e5239, 0x433d2c) : camo(0x525e64, 0x3c4950, 0x283137);
      var gear = mk(A ? 0x5a4f3a : 0x2d3338), gear2 = mk(A ? 0x463d2d : 0x202529), pad = mk(0x1a1c1e), boot = mk(A ? 0x4a3d2a : 0x1c1e20), teamM = mk(tc), skin = MAT.skin, hood = mk(0x1d2022), body = new T.Group(), k = kit(body), legs = [new T.Group(), new T.Group()], V = function (x, y, z) { return new T.Vector3(x, y, z); };
      var shins = [new T.Group(), new T.Group()];
      [-1, 1].forEach(function (sx, n) {
        var x = sx * .1, l = legs[n], sh = shins[n], lk = kit(l), sk = kit(sh);
        tube(l, V(x, .94, 0), V(x, .52, .012), .098, .076, cloth2); lk.b(.075, .11, .05, gear, x + sx * .085, .76, .01); lk.b(.078, .014, .054, gear2, x + sx * .085, .8, .01);   // thigh, cargo pocket and flap
        if (sx < 0) { lk.b(.05, .15, .09, gear2, x - .105, .78, .02); lk.b(.03, .05, .05, MAT.steel, x - .11, .87, 0); lk.b(.012, .03, .2, gear2, x - .09, .84, 0); lk.b(.012, .03, .2, gear2, x - .09, .72, 0); }   // drop-leg holster, straps
        ball(sh, V(x, .52, .012), .076, cloth2); ball(sh, V(x, .52, .055), .068, pad, 1.05, 1.3, .62); sk.b(.11, .016, .1, pad, x, .47, .02);                                 // knee, knee pad, strap
        tube(sh, V(x, .52, .012), V(x, .2, 0), .072, .056, cloth2); tube(sh, V(x, .21, 0), V(x, .3, 0), .06, .058, cloth2);                                                     // shin, bloused cuff
        tube(sh, V(x, .26, 0), V(x, .07, 0), .054, .06, boot); for (var q = 0; q < 4; q++) sk.b(.05, .008, .012, pad, x, .11 + q * .04, .056);                                 // boot shaft, laces
        ball(sh, V(x, .06, .06), .058, boot, 1, .85, 2.1); ball(sh, V(x, .07, .14), .05, boot, 1.05, .8, 1); sk.b(.105, .028, .27, MAT.rubber, x, .014, .05); sk.b(.09, .022, .06, MAT.rubber, x, .036, -.06);   // boot, toe cap, sole, heel
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
      var d = GUN[gunId](), gx = -.13, gy = 1.385, gz = .3, gg = new T.Group(); d.g.rotation.y = -PI / 2; d.g.position.set(gx, gy, gz); gg.add(d.g);   // the weapon keeps its own (metal) material
      k.b(.2, .012, .008, gear2, .02, 1.26, .15, 0, 0, .5); k.b(.03, .5, .012, gear2, -.12, 1.3, -.02, .5, 0, .2);                                                              // sling
      arm(body, V(-.215, 1.4, .01), V(gx - .01, gy + d.grip[1] + .02, gz + d.grip[0]), V(-.5, -1, -.35), cloth, gear2, teamM);
      if (d.fore) arm(body, V(.215, 1.4, .02), V(gx + .01, gy + d.fore[1] - .005, gz + d.fore[0]), V(.25, -1, .1), cloth, gear2, teamM);
      else arm(body, V(.215, 1.4, .02), V(.2, 1.0, .12), V(.3, 0, -1), cloth, gear2, teamM);
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
