// maps.js — the two battlegrounds. Each builder returns merged render geometry plus the collision boxes the game and the bots use.
(function () {
  var T = THREE, PI = Math.PI;
  var C = { rust: 0x8a4420, teal: 0x2b5661, sand: 0x8c7d58, red: 0x7e2f24, navy: 0x24344a, white: 0x8f8c84, conc: 0x3d4347, wall: 0x4a5258, wood: 0x7c6038,
    dark: 0x1d2225, yellow: 0xb88a2a, olive: 0x44523a, steel: 0x444d54, water: 0x10262f, lamp: 0xffd9a0, sky: 0xbfd4e0 };

  function Builder() {
    var P = [], N = [], Cc = [], GP = [], GC = [], RP = [], RN = [], RC = [], col = new T.Color();
    function push(geo, c, arrP, arrN, arrC, vary) {
      var g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position.array, n = g.attributes.normal.array, k = vary ? .9 + Math.random() * .2 : 1; col.setHex(c);
      for (var i = 0; i < p.length; i += 3) { arrP.push(p[i], p[i + 1], p[i + 2]); if (arrN) arrN.push(n[i], n[i + 1], n[i + 2]); arrC.push(col.r * k, col.g * k, col.b * k); }
      geo.dispose(); if (g !== geo) g.dispose();
    }
    var b = {
      boxes: [], spawns: { A: [], B: [] },
      box: function (x, z, w, d, h, c, y0, solid) {
        y0 = y0 || 0; var g = new T.BoxGeometry(w, h, d); g.translate(x, y0 + h / 2, z); push(g, c, P, N, Cc, true);
        if (solid !== false) b.boxes.push({ minx: x - w / 2, maxx: x + w / 2, miny: y0, maxy: y0 + h, minz: z - d / 2, maxz: z + d / 2 });
      },
      cyl: function (x, z, r, h, c, y0) {
        y0 = y0 || 0; var g = new T.CylinderGeometry(r, r, h, 10); g.translate(x, y0 + h / 2, z); push(g, c, P, N, Cc, true);
        b.boxes.push({ minx: x - r * .85, maxx: x + r * .85, miny: y0, maxy: y0 + h, minz: z - r * .85, maxz: z + r * .85 });
      },
      solid: function (x, z, w, d, h, y0) { y0 = y0 || 0; b.boxes.push({ minx: x - w / 2, maxx: x + w / 2, miny: y0, maxy: y0 + h, minz: z - d / 2, maxz: z + d / 2 }); },
      glow: function (x, y, z, w, h, d, c) { var g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); push(g, c, GP, null, GC, false); },
      roof: function (x, z, w, d, y, c) { var g = new T.BoxGeometry(w, .3, d); g.translate(x, y, z); push(g, c, RP, RN, RC, false); },
      cont: function (x, z, rot, c, level, len) {           // shipping container with corrugation ribs and a door end
        len = len || 6.1; var y = (level || 0) * 2.5, w = rot ? 2.5 : len, d = rot ? len : 2.5, i;
        b.box(x, z, w, d, 2.5, c, y);
        for (i = -len / 2 + .5; i < len / 2 - .2; i += .62) {
          if (rot) { b.box(x + 1.27, z + i, .05, .2, 2.2, c, y + .15, false); b.box(x - 1.27, z + i, .05, .2, 2.2, c, y + .15, false); }
          else { b.box(x + i, z + 1.27, .2, .05, 2.2, c, y + .15, false); b.box(x + i, z - 1.27, .2, .05, 2.2, c, y + .15, false); }
        }
        if (rot) b.box(x, z + len / 2 + .02, 2.3, .05, 2.3, C.dark, y + .1, false); else b.box(x + len / 2 + .02, z, .05, 2.3, 2.3, C.dark, y + .1, false);
      },
      wallZ: function (x, z0, z1, h, c) { b.box(x, (z0 + z1) / 2, .4, z1 - z0, h, c || C.wall); },
      wallX: function (z, x0, x1, h, c) { b.box((x0 + x1) / 2, z, x1 - x0, .4, h, c || C.wall); },
      spawn: function (team, x, z) { for (var i = -2; i <= 2; i++) b.spawns[team].push({ x: x, z: z + i * 1.7 }); },
      lamp: function (x, z, h) { b.box(x, z, .18, .18, h, C.dark, 0, false); b.glow(x, h + .1, z, .7, .16, .7, C.lamp); },
      finish: function () {
        function geo(p, n, c) { var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); if (n) g.setAttribute('normal', new T.Float32BufferAttribute(n, 3)); g.setAttribute('color', new T.Float32BufferAttribute(c, 3)); return g; }
        var grp = new T.Group(), m = new T.Mesh(geo(P, N, Cc), SV.litMat); m.castShadow = true; m.receiveShadow = true; grp.add(m);
        if (GP.length) grp.add(new T.Mesh(geo(GP, null, GC), new T.MeshBasicMaterial({ vertexColors: true, fog: false })));
        if (RP.length) { var r = new T.Mesh(geo(RP, RN, RC), SV.litMat); grp.add(r); }
        return grp;
      }
    };
    return b;
  }

  // 01 컨테이너 부두 — 72 x 44 m of playable quay, water to the south.
  function dock() {
    var b = Builder(), i;
    b.box(0, -21.6, 160, 84, .4, C.conc, -.4, false);                                   // apron (extends past the fences)
    for (i = -34; i <= 34; i += 4) b.box(i, 15.5, 2, .15, .02, C.yellow, 0, false);   // quay lane markings
    for (i = -34; i <= 34; i += 4) b.box(i, -13.6, 2, .15, .02, 0x7d8388, 0, false);
    b.box(0, 60, 240, 80, .2, C.water, -1.5, false);
    b.box(0, 20.2, 72, .6, .5, C.yellow, 0, false); b.solid(0, 20.4, 80, .8, 6);       // quay edge + invisible rail
    for (i = -33; i <= 33; i += 6) b.cyl(i, 19, .3, .7, C.dark);
    b.box(2, 27, 54, 8, 5.5, C.navy, -1.2, false); b.box(2, 27, 54.4, 8.4, .5, C.red, 0, false);
    b.box(22, 27, 7, 6, 6, C.white, 4.3, false); b.box(22, 27, 3, 3, 2.4, C.dark, 10.3, false);
    b.glow(22, 8.6, 23.95, 5, .5, .1, C.lamp); b.glow(22, 6.6, 23.95, 5, .5, .1, C.lamp);
    b.cont(-8, 27, 0, C.rust, 1.75); b.cont(-1, 27, 0, C.teal, 1.75); b.cont(6, 27, 0, C.sand, 1.75);
    [[-11, 4], [-11, 16], [1, 4], [1, 16]].forEach(function (p) { b.box(p[0], p[1], .9, .9, 17, C.yellow); });
    b.box(-11, 13, 1.1, 34, 1.3, C.yellow, 17, false); b.box(1, 13, 1.1, 34, 1.3, C.yellow, 17, false);
    b.box(-5, -3.5, 13, 1, 1, C.yellow, 17.1, false); b.box(-5, 29.5, 13, 1, 1, C.yellow, 17.1, false); b.box(-5, 4, 13, .6, .6, C.yellow, 12, false);
    b.box(-5, 22, 3, 3, 2.4, C.white, 14.6, false); b.box(-5, 22, .2, .2, 6, C.dark, 8.6, false); b.cont(-5, 22, 0, C.red, 2.4);
    b.glow(-11, 16.9, 4, .5, .2, .5, 0xff5a40); b.glow(1, 16.9, 16, .5, .2, .5, 0xff5a40);
    // container lanes
    b.cont(-25, -18, 0, C.rust); b.cont(-18.5, -18, 0, C.teal); b.cont(-18.5, -18, 0, C.sand, 1); b.cont(-12, -18, 0, C.navy);
    b.cont(7, -18, 0, C.sand); b.cont(13.5, -18, 0, C.rust); b.cont(13.5, -18, 0, C.navy, 1); b.cont(20, -18, 0, C.teal);
    b.cont(-13, -10, 0, C.red, 0, 12.2); b.cont(11, -10, 0, C.teal, 0, 12.2); b.cont(11, -10, 0, C.rust, 1, 12.2);
    b.cont(0, -3, 1, C.navy); b.cont(0, -3, 1, C.sand, 1); b.cont(-2.7, 4.5, 0, C.rust);
    b.cont(-23, 3, 0, C.teal); b.cont(-16.5, 3, 0, C.sand); b.cont(-23, 3, 0, C.red, 1);
    b.cont(17, 3, 0, C.rust); b.cont(23.5, 3, 0, C.navy); b.cont(23.5, 3, 0, C.sand, 1);
    b.cont(-24, 12, 0, C.navy); b.cont(21, 12, 0, C.red); b.cont(-20, -4.5, 1, C.sand); b.cont(20, -4.5, 1, C.teal);
    b.cont(8, 10, 1, C.sand); b.cont(-8, -15, 1, C.rust);
    b.box(0, -21.5, 12, 4, 3.2, C.white); b.box(0, -21.5, 12.6, 4.6, .3, C.dark, 3.2, false);
    b.glow(-3, 1.9, -19.45, 1.6, .9, .06, C.lamp); b.glow(3, 1.9, -19.45, 1.6, .9, .06, C.lamp);
    [[-9, 9], [5, -7], [-6, -6], [14, 14], [-15, 9], [9, 4], [26, -11], [-27, -11]].forEach(function (p) { b.box(p[0], p[1], 1.4, 1.4, 1.3, C.wood); });
    [[-27, -8], [-27, 6], [27, -8], [27, 6]].forEach(function (p) { b.box(p[0], p[1], .6, 3, 1.1, 0x6a7074); });
    // fences on three sides
    b.wallX(-24, -36.2, 36.2, 3.2, C.steel); b.wallZ(-36, -24, 20.4, 3.2, C.steel); b.wallZ(36, -24, 20.4, 3.2, C.steel);
    [[-30, -22], [-10, -22.6], [16, -22.6], [30, -22], [-34, 8], [34, 8], [-18, 17.5], [10, 17.5], [28, 17.5], [-3, -8], [14, -2], [-14, -2]].forEach(function (p) { b.lamp(p[0], p[1], 6); });
    b.spawn('A', -32.5, -2); b.spawn('B', 32.5, -2);
    return { name: '컨테이너 부두', b: b, bounds: { minx: -36, maxx: 36, minz: -24, maxz: 20 }, bg: 0x0d1418, fog: [18, 85], hemi: [0x9fb3c3, 0x2a2620, .85], sun: [0xbfd0e6, .55, [30, 60, 24]], rain: true };
  }

  // 02 물류 창고 — 38 x 26 m, one hall under a roof.
  function warehouse() {
    var b = Builder(), h = 6, i;
    b.box(0, 0, 40, 28, .4, 0x2b3034, -.4, false);
    for (i = -15; i <= 15; i += 5) b.box(i, 0, .12, 24, .02, C.yellow, 0, false);
    b.wallX(-13, -19.2, 19.2, h); b.wallX(13, -19.2, 19.2, h); b.wallZ(-19, -13, 13, h); b.wallZ(19, -13, 13, h);
    [-13.5, 13.5].forEach(function (x) { b.wallZ(x, -12.8, -9, 4, 0x5d666d); b.wallZ(x, -5, 5, 4, 0x5d666d); b.wallZ(x, 9, 12.8, 4, 0x5d666d); b.box(x, 0, .46, 10, .5, C.yellow, 1.1, false); b.box(x, 0, .46, 3, 1.2, C.dark, 2, false); });
    b.box(-7, -5.5, 1.2, 8, 3.2, C.steel); b.box(-7, 6, 1.2, 6, 3.2, C.steel); b.box(7, 5.5, 1.2, 8, 3.2, C.steel); b.box(7, -6, 1.2, 6, 3.2, C.steel);
    [-7, 7].forEach(function (x) { [-8, -5.5, -3, 4.5, 7].forEach(function (z, n) { b.box(x, x < 0 ? z : -z, 1.5, 1.6, .9, n % 2 ? C.wood : C.sand, 3.2, false); }); });
    b.box(0, 0, 4, 4, 2.5, C.wood); b.box(.4, -.3, 2, 2, 1.3, C.sand, 2.5, false);
    [[-10.5, 0], [10.5, 0], [-3, -10], [3, 10], [-3, 9.5], [3, -9.5], [-10, -9], [10, 9]].forEach(function (p, n) { b.box(p[0], p[1], 1.6, 1.6, n < 2 ? 1.6 : 1.2, n % 2 ? C.wood : C.olive); });
    b.box(-2.5, 4.5, 3, .5, 1.1, 0x6a7074); b.box(2.5, -4.5, 3, .5, 1.1, 0x6a7074);
    // catwalk along the north wall, stairs at both ends
    b.box(0, -11.7, 18, 2.2, .2, C.steel, 2.8); b.box(0, -10.62, 18, .06, .9, C.yellow, 3, false);
    [-8, 0, 8].forEach(function (x) { b.box(x, -10.8, .2, .2, 2.8, C.steel, 0, false); });
    for (i = 0; i < 7; i++) { b.box(-9.3 - i * .6, -11.7, .6, 2.2, .2, C.steel, 2.4 - i * .4); b.box(9.3 + i * .6, -11.7, .6, 2.2, .2, C.steel, 2.4 - i * .4); }
    [-6, 0, 6].forEach(function (x) { b.box(x, 12.75, 3.4, .15, 3.4, C.yellow, 0, false); });
    b.box(-3.5, -1.5, 1.2, 2.2, 1.3, C.yellow); b.box(-3.5, -1.2, 1.1, .9, 1, C.dark, 1.3, false);
    b.roof(0, 0, 39, 27, h + .15, 0x2a2f33);
    for (i = -14; i <= 14; i += 7) { b.glow(i, h - .05, -5, 1.4, .08, 5, C.sky); b.glow(i, h - .05, 6, 1.4, .08, 5, C.sky); }
    [[-16.5, -8], [-16.5, 8], [16.5, -8], [16.5, 8], [0, -6.5], [0, 6.5]].forEach(function (p) { b.glow(p[0], h - .5, p[1], .5, .12, .5, C.lamp); b.box(p[0], p[1], .05, .05, .5, C.dark, h - .5, false); });
    b.spawn('A', -16.3, 0); b.spawn('B', 16.3, 0);
    return { name: '물류 창고', b: b, bounds: { minx: -19, maxx: 19, minz: -13, maxz: 13 }, bg: 0x101315, fog: [25, 70], hemi: [0xc4ccd2, 0x3a342b, .95], sun: [0xfff1dc, .35, [8, 30, 6]], rain: false, indoor: true };
  }

  var MAKERS = [dock, warehouse];
  SV.MAPS = [{ name: '컨테이너 부두', info: '중형 · 72 × 44 m', hint: '통로가 얽힌 야간 부두' }, { name: '물류 창고', info: '소형 · 38 × 26 m', hint: '실내 근접전' }];
  SV.buildMap = function (i) { var m = MAKERS[i](); m.group = m.b.finish(); m.boxes = m.b.boxes; m.spawns = m.b.spawns; return m; };
})();
