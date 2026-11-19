// maps.js — the three battlegrounds. Each builder returns render meshes (grouped by surface texture) plus the collision boxes
// that movement, bullets and the bots' navigation grid use. All textures are painted on canvases at load.
(function () {
  var T = THREE, PI = Math.PI;
  var C = { rust: 0xa5532a, teal: 0x35707e, sand: 0xa8966a, red: 0x963a2c, navy: 0x2f4763, white: 0xb5b2a8, conc: 0x8d9296, wall: 0x9aa0a4, wood: 0xb08a55,
    dark: 0x24292d, yellow: 0xd6a233, olive: 0x5d6e4c, steel: 0x6b767e, water: 0x10262f, lamp: 0xffd9a0, sky: 0xbfd4e0, blue: 0x3a63a8, green: 0x3f7a52, orange: 0xd9692a };
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // ---------- painted textures ----------
  function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function speck(x, w, h, n, a) { for (var i = 0; i < n; i++) { var v = Math.random() < .5 ? 20 : 250; x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (Math.random() * a) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
  function blot(x, w, h, n, col, r0, r1) { for (var i = 0; i < n; i++) { var px = Math.random() * w, py = Math.random() * h, r = rnd(r0, r1), g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); } }
  var PAINT = {
    conc: function () {
      var a = cv(512, 512), c = a[0], x = a[1], i, j; x.fillStyle = '#cfcfca'; x.fillRect(0, 0, 512, 512); speck(x, 512, 512, 9000, .22); blot(x, 512, 512, 22, 'rgba(50,45,40,.16)', 30, 110); blot(x, 512, 512, 10, 'rgba(255,255,255,.1)', 30, 90);
      x.strokeStyle = 'rgba(30,30,30,.4)'; x.lineWidth = 1; for (i = 0; i < 7; i++) { var px = Math.random() * 512, py = Math.random() * 512; x.beginPath(); x.moveTo(px, py); for (j = 0; j < 9; j++) { px += rnd(-28, 28); py += rnd(-28, 28); x.lineTo(px, py); } x.stroke(); }
      x.strokeStyle = 'rgba(25,25,25,.55)'; x.lineWidth = 4; x.strokeRect(0, 0, 512, 512); return c;
    },
    floor: function () {
      var a = cv(512, 512), c = a[0], x = a[1]; x.fillStyle = '#c4c6c4'; x.fillRect(0, 0, 512, 512); speck(x, 512, 512, 5000, .12); blot(x, 512, 512, 16, 'rgba(255,255,255,.12)', 40, 140); blot(x, 512, 512, 14, 'rgba(40,36,30,.14)', 20, 80);
      x.strokeStyle = 'rgba(20,20,20,.25)'; x.lineWidth = 2; for (var i = 0; i < 14; i++) { x.beginPath(); var px = Math.random() * 512, py = Math.random() * 512; x.moveTo(px, py); x.quadraticCurveTo(px + rnd(-80, 80), py + rnd(-80, 80), px + rnd(-160, 160), py + rnd(-160, 160)); x.stroke(); }
      x.strokeStyle = 'rgba(25,25,25,.45)'; x.lineWidth = 3; x.strokeRect(0, 0, 512, 512); return c;
    },
    corr: function () {
      var a = cv(256, 256), c = a[0], x = a[1], i; for (i = 0; i < 256; i++) { var ph = (i / 256 * 5) % 1, b = Math.round(196 + 52 * Math.sin(ph * 2 * PI)); x.fillStyle = 'rgb(' + b + ',' + b + ',' + b + ')'; x.fillRect(i, 0, 1, 256); }
      speck(x, 256, 256, 1600, .14);
      for (i = 0; i < 22; i++) { var px = Math.random() * 256, len = rnd(30, 190), w = rnd(2, 6), g = x.createLinearGradient(0, 10, 0, 10 + len); g.addColorStop(0, 'rgba(110,50,15,.5)'); g.addColorStop(1, 'rgba(110,50,15,0)'); x.fillStyle = g; x.fillRect(px, 10, w, len); }
      var gr = x.createLinearGradient(0, 180, 0, 256); gr.addColorStop(0, 'rgba(25,20,15,0)'); gr.addColorStop(1, 'rgba(25,20,15,.45)'); x.fillStyle = gr; x.fillRect(0, 180, 256, 76);
      x.fillStyle = 'rgba(30,30,30,.6)'; x.fillRect(0, 0, 256, 11); x.fillRect(0, 246, 256, 10); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 11, 256, 2);
      x.strokeStyle = 'rgba(255,255,255,.22)'; for (i = 0; i < 14; i++) { x.beginPath(); var sx = Math.random() * 256, sy = Math.random() * 256; x.moveTo(sx, sy); x.lineTo(sx + rnd(-30, 30), sy + rnd(-6, 6)); x.stroke(); }
      return c;
    },
    panel: function () {
      var a = cv(256, 256), c = a[0], x = a[1], i, j; x.fillStyle = '#d2d4d2'; x.fillRect(0, 0, 256, 256); speck(x, 256, 256, 1400, .1);
      for (i = 0; i < 256; i += 16) { x.fillStyle = 'rgba(0,0,0,.07)'; x.fillRect(i, 0, 3, 256); x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(i + 3, 0, 2, 256); }
      for (i = 0; i < 3; i++) { x.fillStyle = 'rgba(20,20,20,.5)'; x.fillRect(i * 85, 0, 2, 256); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(i * 85 + 2, 0, 1, 256); }
      x.fillStyle = 'rgba(20,20,20,.45)'; x.fillRect(0, 126, 256, 2); x.fillRect(0, 0, 256, 2);
      x.fillStyle = 'rgba(40,40,40,.7)'; for (i = 0; i < 3; i++) for (j = 0; j < 8; j++) { x.fillRect(i * 85 + 6, j * 32 + 8, 3, 3); }
      for (i = 0; i < 12; i++) { var px = Math.random() * 256, len = rnd(20, 120), g = x.createLinearGradient(0, 128, 0, 128 + len); g.addColorStop(0, 'rgba(60,45,30,.35)'); g.addColorStop(1, 'rgba(60,45,30,0)'); x.fillStyle = g; x.fillRect(px, 128, rnd(2, 5), len); }
      var gr = x.createLinearGradient(0, 200, 0, 256); gr.addColorStop(0, 'rgba(20,18,14,0)'); gr.addColorStop(1, 'rgba(20,18,14,.4)'); x.fillStyle = gr; x.fillRect(0, 200, 256, 56); return c;
    },
    block: function () {
      var a = cv(256, 256), c = a[0], x = a[1], r, k; x.fillStyle = '#84857f'; x.fillRect(0, 0, 256, 256);
      for (r = 0; r < 8; r++) for (k = -1; k < 4; k++) { var v = Math.round(rnd(178, 214)); x.fillStyle = 'rgb(' + v + ',' + v + ',' + (v - 4) + ')'; x.fillRect(k * 64 + (r % 2 ? 32 : 0) + 2, r * 32 + 2, 60, 28); }
      speck(x, 256, 256, 2600, .16); blot(x, 256, 256, 8, 'rgba(40,35,30,.16)', 20, 70); return c;
    },
    metal: function () {
      var a = cv(256, 256), c = a[0], x = a[1], i; x.fillStyle = '#d8d8d6'; x.fillRect(0, 0, 256, 256); speck(x, 256, 256, 1800, .12);
      for (i = 0; i < 70; i++) { x.strokeStyle = Math.random() < .5 ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.22)'; x.beginPath(); var sx = Math.random() * 256, sy = Math.random() * 256; x.moveTo(sx, sy); x.lineTo(sx + rnd(-26, 26), sy + rnd(-26, 26)); x.stroke(); }
      blot(x, 256, 256, 26, 'rgba(70,35,15,.5)', 3, 12); blot(x, 256, 256, 6, 'rgba(30,30,30,.2)', 20, 60); return c;
    },
    crate: function () {
      var a = cv(256, 256), c = a[0], x = a[1], i; x.fillStyle = '#c9c1b2'; x.fillRect(0, 0, 256, 256);
      for (i = 0; i < 6; i++) { var v = Math.round(rnd(188, 226)); x.fillStyle = 'rgb(' + v + ',' + (v - 6) + ',' + (v - 16) + ')'; x.fillRect(0, i * 43, 256, 41); x.fillStyle = 'rgba(40,25,10,.5)'; x.fillRect(0, i * 43 + 41, 256, 2); }
      x.strokeStyle = 'rgba(70,45,20,.22)'; for (i = 0; i < 90; i++) { var sy = Math.random() * 256; x.beginPath(); x.moveTo(Math.random() * 200, sy); x.lineTo(Math.random() * 256, sy + rnd(-3, 3)); x.stroke(); }
      x.fillStyle = 'rgba(120,95,60,.9)'; x.fillRect(0, 0, 256, 26); x.fillRect(0, 230, 256, 26); x.fillRect(0, 0, 26, 256); x.fillRect(230, 0, 26, 256);
      x.save(); x.translate(128, 128); x.rotate(-PI / 4); x.fillRect(-170, -13, 340, 26); x.restore();
      x.strokeStyle = 'rgba(30,20,10,.5)'; x.lineWidth = 2; x.strokeRect(26, 26, 204, 204); x.strokeRect(1, 1, 254, 254);
      x.fillStyle = 'rgba(30,25,20,.8)'; [[10, 10], [246, 10], [10, 246], [246, 246], [128, 10], [128, 246]].forEach(function (p) { x.fillRect(p[0] - 2, p[1] - 2, 4, 4); }); speck(x, 256, 256, 900, .12); return c;
    },
    door: function () {
      var a = cv(256, 256), c = a[0], x = a[1], i; for (i = 0; i < 256; i++) { var ph = (i / 256 * 10) % 1, b = Math.round(205 + 30 * Math.sin(ph * 2 * PI)); x.fillStyle = 'rgb(' + b + ',' + b + ',' + b + ')'; x.fillRect(i, 0, 1, 256); }
      x.fillStyle = 'rgba(25,25,25,.7)'; x.fillRect(0, 0, 256, 9); x.fillRect(0, 247, 256, 9); x.fillRect(0, 0, 8, 256); x.fillRect(248, 0, 8, 256); x.fillRect(126, 0, 4, 256);
      [40, 92, 164, 216].forEach(function (px) { x.fillStyle = '#e9e9e6'; x.fillRect(px - 3, 12, 6, 232); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + 3, 12, 2, 232); x.fillStyle = '#5a5f63'; [30, 128, 222].forEach(function (py) { x.fillRect(px - 8, py - 5, 16, 10); }); x.fillStyle = '#e9e9e6'; x.fillRect(px - 16, 150, 16, 5); });
      x.fillStyle = '#f2f0e8'; x.fillRect(140, 60, 44, 30); x.fillStyle = '#222'; x.fillRect(146, 68, 32, 3); x.fillRect(146, 76, 22, 3); speck(x, 256, 256, 900, .12);
      var gr = x.createLinearGradient(0, 190, 0, 256); gr.addColorStop(0, 'rgba(25,20,15,0)'); gr.addColorStop(1, 'rgba(25,20,15,.4)'); x.fillStyle = gr; x.fillRect(0, 190, 256, 66); return c;
    },
    shutter: function () {
      var a = cv(256, 256), c = a[0], x = a[1], i; for (i = 0; i < 256; i++) { var ph = (i / 256 * 16) % 1, b = Math.round(170 + 40 * Math.sin(ph * 2 * PI)); x.fillStyle = 'rgb(' + b + ',' + b + ',' + (b + 4) + ')'; x.fillRect(0, i, 256, 1); }
      x.fillStyle = '#d6a233'; x.fillRect(0, 226, 256, 30); x.fillStyle = '#1b1b1b'; for (i = -2; i < 12; i++) { x.beginPath(); x.moveTo(i * 28, 256); x.lineTo(i * 28 + 14, 256); x.lineTo(i * 28 + 44, 226); x.lineTo(i * 28 + 30, 226); x.fill(); }
      x.fillStyle = 'rgba(20,20,20,.7)'; x.fillRect(0, 0, 8, 256); x.fillRect(248, 0, 8, 256); x.fillRect(0, 0, 256, 10); speck(x, 256, 256, 900, .1); return c;
    },
    hazard: function () { var a = cv(128, 128), c = a[0], x = a[1], i; x.fillStyle = '#d6a233'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#1b1b1b'; for (i = -4; i < 8; i++) { x.beginPath(); x.moveTo(i * 32, 128); x.lineTo(i * 32 + 16, 128); x.lineTo(i * 32 + 144, 0); x.lineTo(i * 32 + 128, 0); x.fill(); } speck(x, 128, 128, 500, .2); return c; },
    chain: function () { var a = cv(64, 64), c = a[0], x = a[1]; x.strokeStyle = '#aab3b8'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 32); x.lineTo(32, 0); x.lineTo(64, 32); x.lineTo(32, 64); x.closePath(); x.stroke(); return c; },
    pool: function () { var a = cv(128, 128), c = a[0], x = a[1], g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,214,150,.55)'); g.addColorStop(.5, 'rgba(255,200,130,.2)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c; },
    puddle: function () {
      var a = cv(128, 128), c = a[0], x = a[1], i; x.fillStyle = 'rgba(8,14,18,.62)'; x.beginPath(); for (i = 0; i <= 24; i++) { var t = i / 24 * 2 * PI, r = 46 + Math.sin(t * 3) * 8 + Math.cos(t * 5) * 5; if (i) x.lineTo(64 + Math.cos(t) * r, 64 + Math.sin(t) * r * .7); else x.moveTo(64 + r, 64); } x.fill();
      x.fillStyle = 'rgba(190,210,225,.2)'; x.beginPath(); x.ellipse(52, 56, 26, 6, -.3, 0, 7); x.fill(); return c;
    }
  };
  var texCache = {};
  function tex(key, make) {
    if (texCache[key]) return texCache[key];
    var t = new T.CanvasTexture((make || PAINT[key])()); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return texCache[key] = t;
  }
  function label(text, fg, bg, w, h) {
    return function () { var a = cv(w || 256, h || 128), c = a[0], x = a[1]; if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); } x.fillStyle = fg; x.font = '900 ' + Math.round(c.height * .62) + 'px "Big Shoulders Display","Arial Narrow",sans-serif-condensed,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, c.width / 2, c.height / 2 + 4, c.width - 16); if (bg) speck(x, c.width, c.height, 500, .15); return c; };
  }
  var TS = { conc: [4, 4], floor: [5, 5], corr: [1.2, 2.5], panel: [3, 3], block: [1.6, 1.6], metal: [2, 2], plain: [1, 1], hazard: [1, 1] };

  function Builder() {
    var L = {}, Q = {}, col = new T.Color();
    function lay(store, k) { return store[k] || (store[k] = { P: [], N: [], C: [], U: [] }); }
    // append a transformed geometry to a layer. World-space UVs by default, the geometry's own UVs when opt.fit.
    function push(geo, c, t, opt, store) {
      opt = opt || {}; var g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position.array, n = g.attributes.normal.array, uv = g.attributes.uv ? g.attributes.uv.array : null, l = lay(store || L, t), ts = TS[t] || TS.plain;
      var k = opt.flat ? 1 : .9 + Math.random() * .2, y0 = opt.y0 == null ? 1e9 : opt.y0, rep = opt.rep || [1, 1], i; col.setHex(c);
      for (i = 0; i < p.length / 3; i++) {
        var px = p[i * 3], py = p[i * 3 + 1], pz = p[i * 3 + 2], nx = n[i * 3], ny = n[i * 3 + 1], q = k;
        l.P.push(px, py, pz); l.N.push(nx, ny, n[i * 3 + 2]);
        if (opt.fit && uv) l.U.push(uv[i * 2] * rep[0], uv[i * 2 + 1] * rep[1]);
        else if (Math.abs(ny) > .6) l.U.push(px / ts[0], pz / ts[0]); else if (Math.abs(nx) > .6) l.U.push(pz / ts[0], py / ts[1]); else l.U.push(px / ts[0], py / ts[1]);
        if (Math.abs(ny) < .6 && py < y0 + .05) q *= .66;           // darken the foot of walls: cheap contact shadow
        l.C.push(col.r * q, col.g * q, col.b * q);
      }
      geo.dispose(); if (g !== geo) g.dispose();
    }
    function coll(x, z, w, d, h, y0) { b.boxes.push({ minx: x - w / 2, maxx: x + w / 2, miny: y0, maxy: y0 + h, minz: z - d / 2, maxz: z + d / 2 }); }
    var b = {
      boxes: [], spawns: { A: [], B: [] },
      box: function (x, z, w, d, h, c, y0, solid, t, fit) { y0 = y0 || 0; var g = new T.BoxGeometry(w, h, d); g.translate(x, y0 + h / 2, z); push(g, c, t || 'plain', { y0: y0 < .05 ? y0 : null, fit: fit }); if (solid !== false) coll(x, z, w, d, h, y0); },
      cyl: function (x, z, r, h, c, y0, solid, t, r2, seg) { y0 = y0 || 0; var g = new T.CylinderGeometry(r2 == null ? r : r2, r, h, seg || 12); g.translate(x, y0 + h / 2, z); push(g, c, t || 'plain', { y0: y0 < .05 ? y0 : null }); if (solid !== false) coll(x, z, r * 1.7, r * 1.7, h, y0); },
      geo: function (g, c, t, opt) { push(g, c, t || 'plain', opt); },
      solid: function (x, z, w, d, h, y0, soft) { coll(x, z, w, d, h, y0 || 0); if (soft) b.boxes[b.boxes.length - 1].soft = true; },   // soft: stops people, not bullets
      seg: function (x0, y0, z0, x1, y1, z1, w, c, t) {              // a beam between two points
        var a = new T.Vector3(x0, y0, z0), e = new T.Vector3(x1, y1, z1), dir = e.clone().sub(a), len = dir.length(), g = new T.BoxGeometry(w, len, w), m = new T.Matrix4();
        m.compose(a.add(e).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize()), new T.Vector3(1, 1, 1)); g.applyMatrix4(m); push(g, c, t || 'metal');
      },
      glow: function (x, y, z, w, h, d, c) { var g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); push(g, c, 'glow', { flat: true }); },
      // a textured rectangle: upright (ry = facing angle) or lying on the ground (flat)
      quad: function (key, x, y, z, w, h, ry, o) {
        o = o || {}; var g = new T.PlaneGeometry(w, h); if (o.flat) g.rotateX(-PI / 2); g.rotateY(ry || 0); g.translate(x, y, z);
        if (!Q[key]) Q[key] = { P: [], N: [], C: [], U: [], mode: o.mode || 'opaque', tex: tex(key, o.make) };
        push(g, o.color == null ? 0xffffff : o.color, key, { fit: true, flat: true, rep: o.rep }, Q);
      },
      cont: function (x, z, rot, c, level, len, deco) {
        len = len || 6.1; var y = (level || 0) * 2.5, w = rot ? 2.5 : len, d = rot ? len : 2.5, sx, sz;
        b.box(x, z, w, d, 2.5, c, y, true, 'corr');
        for (sx = -1; sx <= 1; sx += 2) for (sz = -1; sz <= 1; sz += 2) b.box(x + sx * (w / 2 - .06), z + sz * (d / 2 - .06), .16, .16, 2.52, 0x33383c, y - .01, false, 'metal');
        if (deco === false) return;
        if (rot) b.quad('door', x, y + 1.25, z + len / 2 + .015, 2.4, 2.4, 0, { color: c }); else b.quad('door', x + len / 2 + .015, y + 1.25, z, 2.4, 2.4, PI / 2, { color: c });
      },
      mark: function (text, x, y, z, w, h, ry, fg, flat) { b.quad('m:' + text + fg, x, y, z, w, h, ry, { mode: 'alpha', make: label(text, fg || '#ecebe4'), flat: flat }); },
      crate: function (x, z, s, c, y0, h) { b.box(x, z, s, s, h || s, c || C.wood, y0 || 0, !(y0 > .5), 'crate', true); },
      barrel: function (x, z, c, y0) { y0 = y0 || 0; b.cyl(x, z, .29, .88, c, y0, y0 < .5, 'metal', .29, 14); b.cyl(x, z, .305, .04, 0x2a2e31, y0 + .28, false, 'plain', .305, 14); b.cyl(x, z, .305, .04, 0x2a2e31, y0 + .58, false, 'plain', .305, 14); b.cyl(x, z, .25, .02, 0x1c1f22, y0 + .875, false, 'plain', .25, 14); },
      tires: function (x, z, n) { for (var i = 0; i < n; i++) { var g = new T.TorusGeometry(.3, .13, 6, 14); g.rotateX(PI / 2); g.translate(x + rnd(-.03, .03), .13 + i * .25, z + rnd(-.03, .03)); push(g, 0x17191b, 'plain', {}); } coll(x, z, .8, .8, n * .25, 0); },
      cone: function (x, z) { var g = new T.CylinderGeometry(.03, .16, .5, 10); g.translate(x, .27, z); push(g, C.orange, 'plain', {}); g = new T.CylinderGeometry(.075, .11, .12, 10); g.translate(x, .3, z); push(g, 0xf0efe8, 'plain', { flat: true }); b.box(x, z, .36, .36, .03, C.orange, 0, false); },
      pallet: function (x, z, y0, rot) { y0 = y0 || 0; var w = rot ? 1 : 1.2, d = rot ? 1.2 : 1, i; b.box(x, z, w, d, .03, C.wood, y0 + .11, false, 'crate', true); for (i = -1; i <= 1; i++) { if (rot) b.box(x, z + i * .5, 1, .1, .11, 0x8a6a3c, y0, false); else b.box(x + i * .5, z, .1, 1, .11, 0x8a6a3c, y0, false); } },
      jersey: function (x, z, len, rot) {                                // concrete road barrier with a sloped profile
        var s = new T.Shape(); s.moveTo(-.3, 0); s.lineTo(-.3, .16); s.lineTo(-.11, .46); s.lineTo(-.08, 1.02); s.lineTo(.08, 1.02); s.lineTo(.11, .46); s.lineTo(.3, .16); s.lineTo(.3, 0); s.lineTo(-.3, 0);
        var g = new T.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); if (!rot) g.rotateY(PI / 2); g.translate(x, 0, z); push(g, 0xa9aba6, 'conc', { y0: 0 });
        coll(x, z, rot ? .5 : len, rot ? len : .5, 1.02, 0);
      },
      lamp: function (x, z, h, ax, az) {                                 // street light: pole, arm, head and its pool of light
        b.cyl(x, z, .09, h, 0x3a4045, 0, false, 'metal', .06, 8); b.cyl(x, z, .16, .5, 0x3a4045, 0, false, 'metal', .12, 8); ax = ax || 0; az = az || 0;
        var hx = x + ax * 1.6, hz = z + az * 1.6; b.seg(x, h - .1, z, hx, h + .25, hz, .09, 0x3a4045, 'metal'); b.box(hx, hz, ax ? .7 : .34, az ? .7 : .34, .12, 0x2a2e31, h + .2, false);
        b.glow(hx, h + .17, hz, ax ? .56 : .24, .05, az ? .56 : .24, C.lamp); b.quad('pool', hx, .03, hz, 13, 13, 0, { flat: true, mode: 'add' });
      },
      fence: function (x0, z0, x1, z1, h) {                               // chain-link fence on a concrete kerb
        var len = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), n = Math.round(len / 3), i;
        b.box(mx, mz, alongX ? len : .3, alongX ? .3 : len, .35, 0x9a9c97, 0, false, 'conc'); coll(mx, mz, alongX ? len : .4, alongX ? .4 : len, 6, 0);
        for (i = 0; i <= n; i++) { var t = i / n; b.cyl(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, .05, h, 0x596268, 0, false, 'metal', .05, 6); }
        b.seg(x0, h, z0, x1, h, z1, .06, 0x596268, 'metal'); b.quad('chain', mx, .35 + (h - .35) / 2, mz, len, h - .35, alongX ? 0 : PI / 2, { mode: 'alpha', rep: [len / .16, (h - .35) / .16], color: 0xc4ccd0 });
      },
      wallZ: function (x, z0, z1, h, c, t) { b.box(x, (z0 + z1) / 2, .4, z1 - z0, h, c || C.wall, 0, true, t || 'block'); },
      wallX: function (z, x0, x1, h, c, t) { b.box((x0 + x1) / 2, z, x1 - x0, .4, h, c || C.wall, 0, true, t || 'block'); },
      spawn: function (team, x, z) { for (var i = -2; i <= 2; i++) b.spawns[team].push({ x: x, z: z + i * 1.7 }); },
      finish: function () {
        var grp = new T.Group(), k;
        function geo(l) { var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(l.P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(l.N, 3)); g.setAttribute('color', new T.Float32BufferAttribute(l.C, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(l.U, 2)); return g; }
        for (k in L) {
          var mat = k === 'glow' ? new T.MeshBasicMaterial({ vertexColors: true, fog: false }) : k === 'plain' ? SV.litMat : new T.MeshLambertMaterial({ vertexColors: true, map: tex(k) });
          var m = new T.Mesh(geo(L[k]), mat); if (k !== 'glow') { m.castShadow = true; m.receiveShadow = true; } grp.add(m);
        }
        for (k in Q) {
          var q = Q[k], qm = q.mode === 'add' ? new T.MeshBasicMaterial({ map: q.tex, blending: T.AdditiveBlending, transparent: true, depthWrite: false, vertexColors: true })
            : q.mode === 'alpha' ? new T.MeshLambertMaterial({ map: q.tex, vertexColors: true, transparent: true, alphaTest: .25, side: T.DoubleSide })
            : q.mode === 'lit' ? new T.MeshBasicMaterial({ map: q.tex, vertexColors: true, fog: false }) : new T.MeshLambertMaterial({ map: q.tex, vertexColors: true });
          var qq = new T.Mesh(geo(q), qm); qq.receiveShadow = q.mode !== 'add' && q.mode !== 'lit'; qq.renderOrder = q.mode === 'add' ? 2 : 1; grp.add(qq);
        }
        return grp;
      }
    };
    return b;
  }
  function skyDome(top, horizon) {
    var g = new T.SphereGeometry(300, 16, 10), p = g.attributes.position, c = [], a = new T.Color(top), h = new T.Color(horizon), i;
    for (i = 0; i < p.count; i++) { var t = Math.max(0, Math.min(1, p.getY(i) / 110)), k = Math.pow(t, .6); c.push(h.r + (a.r - h.r) * k, h.g + (a.g - h.g) * k, h.b + (a.b - h.b) * k); }
    g.setAttribute('color', new T.Float32BufferAttribute(c, 3)); return new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
  }

  // 01 컨테이너 부두 — 72 x 44 m of playable quay at night, water to the south.
  function dock() {
    var b = Builder(), i, COL = [C.rust, C.teal, C.sand, C.red, C.navy, C.blue, C.green];
    b.box(0, -21.6, 170, 84, .4, 0x626970, -.4, false, 'conc');
    for (i = -34; i <= 34; i += 4) { b.box(i, 15.5, 2, .15, .02, C.yellow, 0, false); b.box(i, -13.6, 2, .15, .02, 0xd8d8d2, 0, false); }
    b.box(0, 19.2, 72, .3, .02, C.yellow, 0, false);
    [[-28, 15.5], [-6, -13.6], [22, 15.5], [14, -5.5], [-14, 7.5]].forEach(function (p, n) { b.mark(['A1', 'B4', 'C2', '07', '12'][n], p[0], .03, p[1] - 1.6, 2.6, 1.3, 0, '#d8d8d2'); });
    [[-30, 9], [-6, 16.5], [12, -6.5], [25, -14], [3, 9], [-18, -8], [30, 14]].forEach(function (p) { b.quad('puddle', p[0], .025, p[1], rnd(3, 5.5), rnd(2.4, 4), rnd(0, 3), { flat: true, mode: 'alpha' }); });
    b.box(0, 70, 300, 100, .2, C.water, -1.5, false);
    b.box(0, 20.25, 72, .7, .5, 0x9a9c97, 0, false, 'conc'); b.quad('hazard', 0, .51, 20.25, 72, .7, 0, { flat: true, rep: [72, 1] }); b.solid(0, 20.5, 80, .8, 6);
    for (i = -33; i <= 33; i += 6) { b.cyl(i, 19, .32, .55, C.dark, 0, true, 'metal', .2, 10); b.cyl(i, 19, .3, .12, C.dark, .55, false, 'metal', .34, 10); }
    // moored ship
    b.box(2, 27.4, 58, 8.6, 5.6, C.navy, -1.4, false, 'metal'); b.box(2, 27.4, 58.4, 9, .5, C.red, -.2, false, 'metal'); b.box(2, 23.4, 58, .2, 1, C.navy, 4.2, false, 'metal');
    b.box(23, 27.6, 8, 6.4, 6.4, C.white, 4.2, false, 'panel'); b.box(23, 27.6, 5, 4, 2.6, C.white, 10.6, false, 'panel'); b.cyl(25, 28.5, .9, 3, C.red, 13.2, false, 'metal', .7, 12);
    for (i = 0; i < 5; i++) { b.glow(19.8 + i * 1.6, 9, 24.38, 1, .6, .06, C.lamp); b.glow(19.8 + i * 1.6, 6.6, 24.38, 1, .6, .06, i % 2 ? C.lamp : 0x3a4a55); } b.glow(23, 12, 25.58, 4, .7, .06, 0x9fd0e0);
    for (i = 0; i < 6; i++) { b.cont(-22 + i * 6.3, 27, 0, COL[i % 7], 1.7, 6.1, false); if (i % 2) b.cont(-22 + i * 6.3, 27, 0, COL[(i + 3) % 7], 2.7, 6.1, false); }
    // gantry crane: legs with bracing, twin girders, trolley, cab
    [[-11, 4], [-11, 16], [1, 4], [1, 16]].forEach(function (p) { b.box(p[0], p[1], .9, .9, 17, C.yellow, 0, true, 'metal'); b.box(p[0], p[1], 1.6, 2.6, .8, 0x33383c, 0, false, 'metal'); });
    [-11, 1].forEach(function (x) { b.seg(x, .9, 4, x, 8.5, 16, .3, C.yellow); b.seg(x, .9, 16, x, 8.5, 4, .3, C.yellow); b.seg(x, 8.5, 4, x, 16.5, 16, .3, C.yellow); b.seg(x, 8.5, 16, x, 16.5, 4, .3, C.yellow); b.box(x, 10, .5, 12.6, .5, C.yellow, 8.3, false, 'metal'); b.box(x, 13, 1.1, 36, 1.4, C.yellow, 17, false, 'metal'); });
    [4, 16].forEach(function (z) { b.box(-5, z, 12.6, .5, .5, C.yellow, 12, false, 'metal'); b.seg(-11, 12.2, z, 1, 17, z, .25, C.yellow); b.seg(1, 12.2, z, -11, 17, z, .25, C.yellow); });
    b.box(-5, -4.6, 13, 1, 1, C.yellow, 17.2, false, 'metal'); b.box(-5, 30.6, 13, 1, 1, C.yellow, 17.2, false, 'metal');
    b.box(-5, 22, 4, 3.4, 1, 0x33383c, 16.6, false, 'metal'); b.box(-2.2, 21, 2, 2.2, 2.2, C.white, 14.3, false, 'panel'); b.glow(-2.2, 15.6, 19.88, 1.5, 1, .05, 0x9fd0e0);
    [[-6.2, 21], [-3.8, 21], [-6.2, 23], [-3.8, 23]].forEach(function (p) { b.seg(p[0], 16.6, p[1], p[0], 11.7, p[1], .05, C.dark, 'plain'); }); b.box(-5, 22, 6.3, 2.7, .25, C.yellow, 11.5, false, 'metal'); b.cont(-5, 22, 0, C.red, 3.6, 6.1, false);
    b.glow(-11, 18.6, -4.6, .4, .3, .4, 0xff4a30); b.glow(1, 18.6, 30.6, .4, .3, .4, 0xff4a30);
    // container lanes
    var lanes = [[-25, -18, 0, 0], [-18.5, -18, 0, 1], [-18.5, -18, 0, 2, 1], [-12, -18, 0, 4], [7, -18, 0, 2], [13.5, -18, 0, 0], [13.5, -18, 0, 4, 1], [20, -18, 0, 5],
      [-13, -10, 0, 3, 0, 12.2], [11, -10, 0, 1, 0, 12.2], [11, -10, 0, 0, 1, 12.2], [0, -3, 1, 4], [0, -3, 1, 2, 1], [-2.7, 4.5, 0, 6], [-23, 3, 0, 1], [-16.5, 3, 0, 2], [-23, 3, 0, 3, 1],
      [17, 3, 0, 0], [23.5, 3, 0, 4], [23.5, 3, 0, 2, 1], [-24, 12, 0, 5], [21, 12, 0, 3], [-20, -4.5, 1, 2], [20, -4.5, 1, 6], [8, 10, 1, 2], [-8, -15, 1, 0]];
    lanes.forEach(function (l) { b.cont(l[0], l[1], l[2], COL[l[3]], l[4] || 0, l[5]); });
    [['HANA LINE', -13, 1.5, -8.72, 5, 1, 0], ['SEOHAE', 11, 1.5, -8.72, 4, 1, 0], ['K·PORT', -23, 1.5, 4.28, 3, .8, 0], ['HANA LINE', 17, 1.5, 4.28, 3.6, .8, 0], ['SEOHAE', -24, 1.5, 13.28, 3, .8, 0], ['K·PORT', 20, 1.5, -16.72, 3, .8, 0], ['TGHU 4417', 7, 2.1, -16.72, 2.4, .4, 0], ['MSKU 9021', -12, 2.1, -16.72, 2.4, .4, 0]]
      .forEach(function (m) { b.mark(m[0], m[1], m[2], m[3], m[4], m[5], m[6], '#ecebe4'); });
    // port office
    b.box(0, -21.5, 12, 4, 3.2, 0xb9b6ac, 0, true, 'block'); b.box(0, -21.3, 12.8, 5, .25, 0x33383c, 3.2, false, 'metal'); b.box(0, -19.3, 12.8, .12, .5, C.blue, 3.2, false, 'metal');
    [-4, -1.4, 2.6].forEach(function (x) { b.glow(x, 1.9, -19.46, 1.7, 1, .05, C.lamp); b.box(x, -19.46, 1.9, .08, 1.2, 0x2a2e31, 1.3, false); b.box(x, -19.42, .08, .08, 1, 0x2a2e31, 1.4, false); });
    b.box(4.9, -19.44, 1, .1, 2.1, 0x4a5a64, 0, false, 'metal'); b.box(-5.3, -19.2, .8, .5, .7, 0x9a9c97, 2.2, false, 'metal'); b.mark('PORT OFFICE', 0, 2.85, -19.44, 4.6, .5, 0, '#f1efe6');
    // working clutter: crates on pallets, drums, tyres, cones, barriers, a forklift
    [[-9, 9, 1.3], [5, -7, 1.2], [-6, -6, 1.4], [14, 14, 1.3], [-15, 9, 1.2], [9, 4, 1.4], [26, -11, 1.3], [-27, -11, 1.3]].forEach(function (p) { b.pallet(p[0], p[1], 0); b.crate(p[0], p[1], p[2] * .82, 0xc9a66e, .14, p[2]); b.solid(p[0], p[1], 1.2, 1.1, .15); });
    b.crate(-9, 9, .7, 0xb89358, 1.44); b.crate(14.2, 13.9, .7, 0xb89358, 1.44);
    [[-28.5, 15.5, C.blue], [-27.8, 15.9, C.red], [-28.2, 16.4, C.blue], [28.6, 15.2, C.red], [29.3, 15.6, C.blue], [3.6, -15.2, C.olive], [4.2, -14.7, C.olive], [-17, 16.4, C.red], [16.2, -1.2, C.blue], [-12.2, -3.4, C.olive]].forEach(function (p) { b.barrel(p[0], p[1], p[2]); });
    b.tires(30.5, -16, 4); b.tires(31.4, -15.4, 3); b.tires(-31, 13.5, 4); b.tires(6.4, 16.8, 3);
    [[-4, 15], [-2.6, 15.6], [10, 16.2], [18, -12.2], [-20, 8.2], [26, 9.5]].forEach(function (p) { b.cone(p[0], p[1]); });
    [[-27, -8], [-27, 6], [27, -8], [27, 6]].forEach(function (p) { b.jersey(p[0], p[1], 3.2, true); }); b.jersey(-5, 17.3, 3.2, false); b.jersey(12, -12.2, 3.2, false);
    (function (x, z) { b.box(x, z, 1.2, 2.2, .7, C.yellow, .25, true, 'metal'); b.box(x, z + .35, 1.1, 1, .9, 0x2a2e31, .95, false); b.box(x, z - .4, 1.15, 1.2, .06, 0x2a2e31, 2.05, false); [[-.5, -.9], [.5, -.9], [-.5, .1], [.5, .1]].forEach(function (q) { b.box(x + q[0], z + q[1], .06, .06, 1.15, 0x2a2e31, .95, false); }); b.box(x - .3, z - 1.25, .1, .1, 2, 0x2a2e31, .1, false); b.box(x + .3, z - 1.25, .1, .1, 2, 0x2a2e31, .1, false); b.box(x - .3, z - 1.8, .1, 1.1, .05, 0x55595c, .14, false); b.box(x + .3, z - 1.8, .1, 1.1, .05, 0x55595c, .14, false); [[-.6, -.6], [.6, -.6], [-.6, .7], [.6, .7]].forEach(function (q) { var g = new T.CylinderGeometry(.28, .28, .22, 10); g.rotateZ(PI / 2); g.translate(x + q[0], .28, z + q[1]); b.geo(g, 0x17191b); }); })(15.5, -13.5);
    // perimeter fences, lights
    b.fence(-36.2, -24, 36.2, -24, 3.4); b.fence(-36, -24, -36, 20.4, 3.4); b.fence(36, -24, 36, 20.4, 3.4);
    [[-30, -23, 0, 1], [-10, -23, 0, 1], [16, -23, 0, 1], [30, -23, 0, 1], [-35, 8, 1, 0], [35, 8, -1, 0], [-18, 18.2, 0, -1], [10, 18.2, 0, -1], [28, 18.2, 0, -1], [-3, -8, 1, 0], [14, -1, 0, 1], [-14, -1, 0, 1], [-35, -12, 1, 0], [35, -12, -1, 0]].forEach(function (p) { b.lamp(p[0], p[1], 7, p[2], p[3]); });
    // beyond the fence: stacked yards, sheds, far cranes, harbour lights
    for (i = 0; i < 11; i++) { var cx = -33 + i * 6.6; b.cont(cx, -31, 0, COL[i % 7], 0, 6.1, false); b.cont(cx, -31, 0, COL[(i + 2) % 7], 1, 6.1, false); if (i % 3) b.cont(cx, -31, 0, COL[(i + 4) % 7], 2, 6.1, false); b.cont(cx + 1, -35, 0, COL[(i + 5) % 7], 0, 6.1, false); b.cont(cx + 1, -35, 0, COL[(i + 1) % 7], 1, 6.1, false); }
    b.box(-52, -4, 18, 40, 9, 0x6f777d, 0, false, 'panel'); b.box(52, -6, 18, 44, 10, 0x6f777d, 0, false, 'panel');
    for (i = 0; i < 6; i++) { b.glow(-42.95, 5.5, -18 + i * 6.5, .06, 1, 2.4, i % 3 ? C.lamp : 0x35414a); b.glow(42.95, 6, -20 + i * 7, .06, 1, 2.4, i % 2 ? C.lamp : 0x35414a); }
    [[-60, -58], [-20, -62], [30, -60], [70, -55]].forEach(function (p) { b.box(p[0] - 4, p[1], 1, 1, 26, 0x8d6a2a, 0, false); b.box(p[0] + 4, p[1], 1, 1, 26, 0x8d6a2a, 0, false); b.box(p[0], p[1] + 8, 9, 30, 1.2, 0x8d6a2a, 26, false); b.glow(p[0], 28.4, p[1] + 22, .6, .5, .6, 0xff4a30); b.glow(p[0], 26.5, p[1], 2, .3, .3, C.lamp); });
    for (i = 0; i < 46; i++) b.glow(rnd(-150, 150), rnd(1.5, 9), rnd(110, 118), rnd(.5, 1.6), .5, .2, Math.random() < .8 ? C.lamp : 0x9fd0e0);
    b.spawn('A', -32.5, -2); b.spawn('B', 32.5, -2);
    return { name: '컨테이너 부두', b: b, bounds: { minx: -36, maxx: 36, minz: -24, maxz: 20 }, bg: 0x1b2832, fog: [22, 120], hemi: [0x9fb6c8, 0x2e2a24, .78], sun: [0xbcd0ea, .62, [34, 58, 22]], rain: true, sky: [0x05080c, 0x1b2832] };
  }

  // 02 물류 창고 — 38 x 26 m, one hall under a trussed roof.
  function warehouse() {
    var b = Builder(), h = 6, i, k;
    b.box(0, 0, 40, 28, .4, 0xa8acad, -.4, false, 'floor');
    [-9.2, -4.8, 4.8, 9.2].forEach(function (x) { b.box(x, 0, .12, 22, .02, C.yellow, 0, false); }); b.box(0, 11.2, 30, .12, .02, C.yellow, 0, false); b.box(0, -9.6, 30, .12, .02, C.yellow, 0, false);
    [-6, 0, 6].forEach(function (x) { b.quad('hazard', x, .02, 11.9, 3.6, 1, 0, { flat: true, rep: [3.6, 1] }); });
    [['01', -8, 2], ['02', 8, -2], ['A', -16.3, -6], ['B', 16.3, 6]].forEach(function (m) { b.mark(m[0], m[1], .03, m[2], 2, 1.3, 0, '#d6a233'); });
    // shell: block base, sheet cladding above, steel columns, roof trusses
    [[-13, 1], [13, 1]].forEach(function (w) { b.box(0, w[0], 38.4, .4, 2.2, 0xb9b9b2, 0, true, 'block'); b.box(0, w[0], 38.4, .3, h - 2.2, 0x8f9aa0, 2.2, false, 'panel'); });
    [-19, 19].forEach(function (x) { b.box(x, 0, .4, 26, 2.2, 0xb9b9b2, 0, true, 'block'); b.box(x, 0, .3, 26, h - 2.2, 0x8f9aa0, 2.2, false, 'panel'); });
    b.solid(0, -13, 38.4, .4, h); b.solid(0, 13, 38.4, .4, h); b.solid(-19, 0, .4, 26, h); b.solid(19, 0, .4, 26, h);
    for (i = -18; i <= 18; i += 6) { [-12.65, 12.65].forEach(function (z) { b.box(i, z, .28, .3, h, 0x4f585e, 0, false, 'metal'); });
      b.box(i, 0, .2, 25.4, .22, 0x4f585e, h - .25, false, 'metal'); b.box(i, 0, .2, 25.4, .22, 0x4f585e, h - 1.5, false, 'metal');
      for (k = -12; k < 12; k += 3) { b.seg(i, h - 1.4, k, i, h - .2, k + 1.5, .1, 0x4f585e); b.seg(i, h - .2, k + 1.5, i, h - 1.4, k + 3, .1, 0x4f585e); } }
    [-8, 8].forEach(function (z) { b.box(0, z, 38, .14, .14, 0x4f585e, h - 1.5, false, 'metal'); });
    var rf = new T.BoxGeometry(39, .3, 27); rf.translate(0, h + .15, 0); b.geo(rf, 0x5d666c, 'panel', {});
    for (i = -15; i <= 15; i += 6) { b.glow(i, h - .04, -5, 1.6, .06, 6, C.sky); b.glow(i, h - .04, 6, 1.6, .06, 6, C.sky); b.quad('pool', i, .03, -5, 9, 12, 0, { flat: true, mode: 'add', color: 0x9db4c4 }); b.quad('pool', i, .03, 6, 9, 12, 0, { flat: true, mode: 'add', color: 0x9db4c4 }); }
    // spawn rooms behind block partitions, hazard-striped door frames
    [-13.5, 13.5].forEach(function (x) {
      [[-12.8, -9], [-5, 5], [9, 12.8]].forEach(function (s) { b.wallZ(x, s[0], s[1], 3.4, 0xb4b4ac, 'block'); });
      b.box(x, 0, .46, 25.6, .3, 0x4f585e, 3.4, false, 'metal'); [-7, 7].forEach(function (z) { b.quad('hazard', x + (x < 0 ? .22 : -.22), 3.15, z, 4, .5, x < 0 ? PI / 2 : -PI / 2, { rep: [4, .5] }); });
      b.mark(x < 0 ? 'ALPHA' : 'BRAVO', x + (x < 0 ? .22 : -.22), 2.3, 0, 3.4, .8, x < 0 ? PI / 2 : -PI / 2, x < 0 ? '#ffb347' : '#6cc4e0');
    });
    // pallet racking: uprights, beams, loaded shelves (the collision volume stays one block per rack)
    function rack(x, z0, z1) {
      var z, lv, n = 0; b.solid(x, (z0 + z1) / 2, 1.2, z1 - z0, 3.4, 0, true);   // you cannot walk through a rack, but shots pass between the loads
      for (z = z0; z <= z1 + .01; z += (z1 - z0) / Math.round((z1 - z0) / 2.7)) { [-.52, .52].forEach(function (dx) { b.box(x + dx, z, .09, .09, 4.3, C.blue, 0, false, 'metal'); }); b.seg(x - .52, .2, z, x + .52, 1.5, z, .04, C.blue); b.seg(x - .52, 1.7, z, x + .52, 3, z, .04, C.blue); }
      [0.1, 1.55, 3.0].forEach(function (y, li) {
        if (li) [-.52, .52].forEach(function (dx) { b.box(x + dx, (z0 + z1) / 2, .07, z1 - z0, .12, C.orange, y - .14, false, 'metal'); });
        for (z = z0 + .75; z < z1 - .3; z += 1.35) { n++; b.pallet(x, z, y, true); b.solid(x, z, 1, 1.2, .15, y); b.solid(x, z, .95, 1.05, n % 4 === 0 ? .9 : n % 4 === 1 ? 1.05 : n % 3 ? 1 : 1.05, y + .14);
          if (n % 4 === 0) { b.barrel(x - .2, z - .25, C.blue, y + .14); b.barrel(x + .2, z + .25, C.blue, y + .14); }
          else if (n % 4 === 1) b.crate(x, z, .95, 0xc9a66e, y + .14, 1.05);
          else { b.box(x, z, .9, 1.05, n % 3 ? 1 : .7, n % 2 ? 0xb39a72 : 0x8f8468, y + .14, false, 'crate', true); if (n % 3 === 0) b.box(x, z, .6, .7, .35, 0xb39a72, y + .84, false, 'crate', true); } }
      });
    }
    rack(-7, -9.5, -1.5); rack(-7, 3, 9); rack(7, 1.5, 9.5); rack(7, -9, -3);
    // centre cargo and floor cover
    b.pallet(-1, -1, 0); b.pallet(1, 1, 0); b.crate(0, 0, 4, 0xc2a16b, .01, 2.5); b.box(0, 0, 4.06, .12, 2.52, 0x33383c, 0, false); b.box(0, 0, .12, 4.06, 2.52, 0x33383c, 0, false); b.crate(.4, -.3, 1.9, 0xb39058, 2.52, 1.3);
    [[-10.5, 0, 1.6], [10.5, 0, 1.6], [-3, -10, 1.2], [3, 10, 1.2], [-3, 9.5, 1.2], [3, -9.5, 1.2], [-10, -9, 1.2], [10, 9, 1.2]].forEach(function (p, n) { b.pallet(p[0], p[1], 0); b.crate(p[0], p[1], 1.5, n % 2 ? 0xc9a66e : 0x9c8a62, .14, p[2]); b.solid(p[0], p[1], 1.6, 1.6, .2); });
    b.jersey(-2.5, 4.5, 3, false); b.jersey(2.5, -4.5, 3, false);
    [[-11.5, 6.2, C.blue], [-11, 6.8, C.red], [11.4, -6.4, C.blue], [11, -7, C.olive], [-17.6, 11.4, C.red], [17.6, -11.4, C.red], [4.6, 11.8, C.blue], [-4.6, 11.6, C.olive]].forEach(function (p) { b.barrel(p[0], p[1], p[2]); });
    b.tires(12.2, 11.6, 3); [[-1.6, 8.6], [1.8, -8.4], [-9.2, 3.4]].forEach(function (p) { b.cone(p[0], p[1]); });
    // catwalk along the north wall with railing and stairs
    b.box(0, -11.7, 18, 2.2, .14, 0x5b656c, 2.86, true, 'metal'); for (i = -9; i <= 9; i += 2.25) { b.box(i, -10.66, .06, .06, 1, C.yellow, 3, false); b.box(i, -10.7, .16, .16, 2.86, 0x4f585e, 0, false, 'metal'); }
    b.box(0, -10.66, 18, .05, .05, C.yellow, 3.95, false); b.box(0, -10.66, 18, .05, .05, C.yellow, 3.5, false);
    for (i = 0; i < 7; i++) { [-1, 1].forEach(function (s) { b.box(s * (9.3 + i * .6), -11.7, .6, 2.2, .1, 0x5b656c, 2.5 - i * .4, true, 'metal'); }); }
    [-1, 1].forEach(function (s) { b.seg(s * 9, 3.95, -10.66, s * 13.2, 1.1, -10.66, .05, C.yellow, 'plain'); b.seg(s * 9, 2.9, -10.66, s * 13.2, .1, -10.66, .1, 0x4f585e); });
    // wall fittings: roll-up doors, exit signs, pipes, fuse boxes, extinguishers
    [-6, 0, 6].forEach(function (x) { b.quad('shutter', x, 1.9, 12.77, 3.6, 3.8, PI); b.box(x, 12.74, 4, .1, .25, 0x33383c, 3.8, false, 'metal'); });
    b.mark('1', -6, 4.5, 12.74, .7, .7, PI, '#ecebe4'); b.mark('2', 0, 4.5, 12.74, .7, .7, PI, '#ecebe4'); b.mark('3', 6, 4.5, 12.74, .7, .7, PI, '#ecebe4');
    [[-12, 12.74, PI], [12, 12.74, PI]].forEach(function (p) { b.quad('m:EXIT', p[0], 2.6, p[1], .8, .32, p[2], { mode: 'lit', make: label('EXIT', '#eafff0', '#1f8a4c', 128, 64) }); });
    b.seg(-18.6, 4.6, -12.6, 18.6, 4.6, -12.6, .16, 0x9c5a2e, 'metal'); b.seg(-18.6, 5, 12.6, 18.6, 5, 12.6, .12, 0x7b858c, 'metal'); b.seg(-18.7, 4.2, -12.4, -18.7, 4.2, 12.4, .12, 0x7b858c, 'metal');
    [[-18.7, 4], [18.7, -4]].forEach(function (p) { b.box(p[0], p[1], .16, .7, 1, 0x7b858c, 1.3, false, 'metal'); b.cyl(p[0] + (p[0] < 0 ? .22 : -.22), p[1] + 1.2, .08, .5, 0xc23b2a, .9, false, 'plain', .08, 8); });
    // forklift
    (function (x, z) { b.box(x, z, 1.2, 2.2, .7, C.yellow, .25, true, 'metal'); b.box(x, z + .35, 1.1, 1, .9, 0x2a2e31, .95, false); b.box(x, z - .4, 1.15, 1.2, .06, 0x2a2e31, 2.05, false); [[-.5, -.9], [.5, -.9], [-.5, .1], [.5, .1]].forEach(function (q) { b.box(x + q[0], z + q[1], .06, .06, 1.15, 0x2a2e31, .95, false); }); b.box(x - .3, z - 1.25, .1, .1, 2, 0x2a2e31, .1, false); b.box(x + .3, z - 1.25, .1, .1, 2, 0x2a2e31, .1, false); b.box(x - .3, z - 1.8, .1, 1.1, .05, 0x55595c, .14, false); b.box(x + .3, z - 1.8, .1, 1.1, .05, 0x55595c, .14, false); [[-.6, -.6], [.6, -.6], [-.6, .7], [.6, .7]].forEach(function (q) { var g = new T.CylinderGeometry(.28, .28, .22, 10); g.rotateZ(PI / 2); g.translate(x + q[0], .28, z + q[1]); b.geo(g, 0x17191b); }); })(-3.5, -1.4);
    // hanging lamps
    [[-16.5, -8], [-16.5, 8], [16.5, -8], [16.5, 8], [-10, 0], [10, 0], [0, -7], [0, 7], [-4, 0], [4, 0]].forEach(function (p) { b.seg(p[0], h - .3, p[1], p[0], h - 1.5, p[1], .03, C.dark, 'plain'); b.cyl(p[0], p[1], .34, .22, 0x33383c, h - 1.72, false, 'metal', .12, 10); b.glow(p[0], h - 1.74, p[1], .36, .04, .36, C.lamp); b.quad('pool', p[0], .035, p[1], 8, 8, 0, { flat: true, mode: 'add' }); });
    b.spawn('A', -16.3, 0); b.spawn('B', 16.3, 0);
    return { name: '물류 창고', b: b, bounds: { minx: -19, maxx: 19, minz: -13, maxz: 13 }, bg: 0x101315, fog: [28, 90], hemi: [0xc9d2d8, 0x4a4338, .88], sun: [0xfff1dc, .32, [9, 30, 7]], rain: false, indoor: true };
  }

  // 03 보급기지 — 60 x 44 m 야외 기지. 폭파 미션용: 공격은 서쪽, 수비는 동쪽에서 출발하고 목표는 북동(A 연료 집적소)·남동(B 보급 창고).
  function depot() {
    var b = Builder(), i, OL = 0x56633f, OD = 0x3f4a30;
    b.box(0, 0, 100, 80, .4, 0x777a70, -.4, false, 'conc');
    b.box(-9, -18.5, 26, .14, .02, 0xd8d8d2, 0, false); b.box(-9, 18.5, 26, .14, .02, 0xd8d8d2, 0, false);
    for (i = -20; i <= 20; i += 4) b.box(i, 0, 2, .14, .02, C.yellow, 0, false);
    [[-12, -5], [6, 5], [-18, 19], [14, -4], [-4, -19]].forEach(function (p) { b.quad('puddle', p[0], .025, p[1], rnd(3, 5), rnd(2.4, 3.6), rnd(0, 3), { flat: true, mode: 'alpha' }); });
    function bldg(x0, x1, z0, z1, h, c) { var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0; b.box(cx, cz, w, d, 2.2, c || 0xb4b4ac, 0, true, 'block'); b.box(cx, cz, w - .1, d - .1, h - 2.2, 0x7d8a80, 2.2, true, 'panel'); b.box(cx, cz, w + .5, d + .5, .25, 0x464c4f, h, false); }
    function truck(x, z, rot, dir) {
      var L = 6.6, W = 2.4, f = dir || 1;
      function bx(dl, dw, l, w, h, c, y, t) { if (rot) b.box(x + dw, z + dl * f, w, l, h, c, y, false, t); else b.box(x + dl * f, z + dw, l, w, h, c, y, false, t); }
      bx(2.3, 0, 1.9, 2.3, 1.7, OL, .75, 'metal'); bx(2.9, 0, .6, 2.1, .7, 0x1c2226, 1.6); bx(3.3, 0, .2, 2.3, .5, 0x2a2e31, .55);
      bx(-.9, 0, 4.5, 2.36, .25, 0x2a2e31, .85, 'metal'); bx(-.9, 0, 4.4, 2.3, 1.75, OD, 1.1, 'panel'); bx(-3.15, 0, .06, 2.1, 1.5, 0x2c3422, 1.2);
      [[2.3, 1], [2.3, -1], [-1.4, 1], [-1.4, -1], [-2.5, 1], [-2.5, -1]].forEach(function (q) { var g = new T.CylinderGeometry(.42, .42, .32, 12); if (rot) { g.rotateZ(PI / 2); g.translate(x + q[1] * 1.05, .42, z + q[0] * f); } else { g.rotateX(PI / 2); g.translate(x + q[0] * f, .42, z + q[1] * 1.05); } b.geo(g, 0x17191b, 'plain', {}); });
      b.solid(x, z, rot ? W : L, rot ? L : W, 2.85);
    }
    function tank(x, z) { var g = new T.CylinderGeometry(1.15, 1.15, 5.2, 16); g.rotateZ(PI / 2); g.translate(x, 1.65, z); b.geo(g, 0xb9bdb6, 'metal', {}); [-1.7, 1.7].forEach(function (d) { b.box(x + d, z, .5, 1.9, .55, 0x8d9296, 0, false, 'conc'); }); b.box(x, z, 5.3, .06, .5, C.red, 1.5, false); b.solid(x, z, 5.2, 2.3, 2.8); }
    function stack(x, z, n, c) { b.pallet(x, z, 0); b.crate(x, z, 1.4, c || 0x7c7a52, .14, 1.2); b.solid(x, z, 1.5, 1.5, .2); if (n > 1) b.crate(x + .1, z - .05, 1.2, 0x8a8660, 1.34, 1.1); if (n > 1) b.solid(x, z, 1.3, 1.3, 1.1, 1.34); }
    function site(id, x, z) { b.quad('hazard', x, .02, z - 2.6, 5.2, .35, 0, { flat: true, rep: [5.2, .35] }); b.quad('hazard', x, .02, z + 2.6, 5.2, .35, 0, { flat: true, rep: [5.2, .35] }); b.quad('hazard', x - 2.6, .02, z, .35, 5.2, 0, { flat: true, rep: [.35, 5.2] }); b.quad('hazard', x + 2.6, .02, z, .35, 5.2, 0, { flat: true, rep: [.35, 5.2] }); b.mark(id, x, .03, z, 2.6, 2.6, 0, '#e2562f', true); }
    // perimeter wall with a concrete cap
    b.wallX(-22.2, -30.4, 30.4, 5, 0xa9aaa2); b.wallX(22.2, -30.4, 30.4, 5, 0xa9aaa2); b.wallZ(-30.2, -22, 22, 5, 0xa9aaa2); b.wallZ(30.2, -22, 22, 5, 0xa9aaa2);
    b.solid(0, -22.2, 61, .4, 9); b.solid(0, 22.2, 61, .4, 9); b.solid(-30.2, 0, .4, 44, 9); b.solid(30.2, 0, .4, 44, 9);
    // spawn yards
    [[-15, -3], [3, 15]].forEach(function (s) { b.wallZ(-22, s[0], s[1], 3.4, 0xb4b4ac); });
    [[-22, -15], [-9, -2], [2, 8]].forEach(function (s) { b.wallZ(22, s[0], s[1], 3.4, 0xb4b4ac); });
    b.mark('공격', -21.75, 2.4, -9, 3, .9, PI / 2, '#ffb347'); b.mark('수비', 21.75, 2.4, -5.5, 3, .9, -PI / 2, '#6cc4e0');
    // north: vehicle workshop between the north road and the yard
    bldg(-14, 2, -15, -8, 5.6);
    [-10, -6, -2].forEach(function (x) { b.quad('shutter', x, 1.9, -15.03, 3.4, 3.8, PI); b.quad('shutter', x, 1.9, -7.97, 3.4, 3.8, 0); });
    b.mark('정비고', -6, 4.6, -7.94, 4, 1, 0, '#ecebe4');
    truck(-9, -19.3, false, 1); stack(-18, -16.4, 2); b.barrel(-16.6, -16.2, C.olive); b.barrel(0, -21.2, C.red); b.barrel(.7, -20.9, C.olive); b.jersey(1.5, -17.5, 3, true);
    // A: fuel dump under an open shed
    b.wallZ(5, -17, -7, 4, 0xb4b4ac); b.wallX(-7, 5, 8, 4, 0xb4b4ac); b.wallX(-7, 11, 22, 4, 0xb4b4ac);
    [[8, -19], [18, -19], [8, -9.5], [18, -9.5]].forEach(function (p) { b.box(p[0], p[1], .3, .3, 4.4, 0x4f585e, 0, true, 'metal'); });
    b.box(13, -19, 10.3, .2, .25, 0x4f585e, 4.15, false, 'metal'); b.box(13, -9.5, 10.3, .2, .25, 0x4f585e, 4.15, false, 'metal');
    { var rf = new T.BoxGeometry(11.4, .16, 10.9); rf.translate(13, 4.5, -14.25); b.geo(rf, 0x6a7479, 'panel', {}); }
    tank(13, -20.3); tank(18.2, -13.2 + 0); site('A', 12, -14);
    stack(8.6, -11, 2); stack(15.4, -9.6, 1, 0x9c8a62); b.barrel(9.4, -17.6, C.red); b.barrel(10.1, -18, C.red); b.barrel(9.9, -17.2, C.olive); b.jersey(7.2, -14.5, 3, true);
    b.mark('A', 4.75, 2.6, -12, 1.6, 1.6, -PI / 2, '#e2562f'); b.mark('A', 9.5, 2.6, -6.75, 1.6, 1.6, 0, '#e2562f');
    // middle yard: control hut, water tower, parked truck, barriers
    bldg(-7, -1, -2.6, 2.6, 3.5, 0xa8a89c); b.quad('door', -4, 1.25, 2.63, 1.3, 2.4, 0, { color: 0x56633f }); b.mark('통제소', -4, 2.9, -2.63, 3, .7, PI, '#ecebe4');
    [[8, -1.4], [10.8, -1.4], [8, 1.4], [10.8, 1.4]].forEach(function (p) { b.box(p[0], p[1], .28, .28, 6.2, 0x4f585e, 0, true, 'metal'); });
    b.seg(8, .3, -1.4, 10.8, 3, -1.4, .08, 0x4f585e); b.seg(8, .3, 1.4, 10.8, 3, 1.4, .08, 0x4f585e); b.seg(8, 3, -1.4, 8, 6, 1.4, .08, 0x4f585e); b.seg(10.8, 3, -1.4, 10.8, 6, 1.4, .08, 0x4f585e);
    b.cyl(9.4, 0, 2.3, 2.6, 0x7b8a7a, 6.2, false, 'metal', 2.3, 18); b.cyl(9.4, 0, 2.4, .4, 0x586458, 8.8, false, 'metal', .6, 18);
    truck(-14.5, 4.4, false, -1); b.jersey(-17, -2.6, 3, true); b.jersey(3.6, 3.2, 3, false); b.jersey(15, -3.4, 3, true); b.jersey(16.5, 3.6, 3, false);
    stack(3, -4.6, 2); stack(-10.5, -5.4, 1, 0x9c8a62); b.tires(12.8, 5.6, 3); b.cone(-19.5, 1.2); b.cone(-19.5, -1.2); stack(18.6, 0, 1);
    // south: barracks block and the alley behind it
    bldg(-16, -2, 8, 15, 4.6, 0xb0ae9e); b.mark('생활관', -9, 3.6, 7.94, 3.6, .9, PI, '#ecebe4');
    [-13, -9, -5].forEach(function (x) { b.box(x, 7.95, 1.4, .08, 1, 0x1c2226, 1.3, false); b.box(x, 15.05, 1.4, .08, 1, 0x1c2226, 1.3, false); });
    b.cont(-9.5, 20.6, false, OL, 0); stack(-17.5, 20.4, 1); b.barrel(-1.4, 21.2, C.olive); b.barrel(-.7, 21.4, C.olive); b.jersey(-3, 17.4, 3, true); stack(1, 10.2, 2, 0x9c8a62);
    // B: supply hall
    [[8, 17], [20, 22]].forEach(function (s) { b.box(4, (s[0] + s[1]) / 2, .4, s[1] - s[0], 5, 0xb4b4ac, 0, true, 'block'); });
    [[4, 10], [13, 20]].forEach(function (s) { b.box((s[0] + s[1]) / 2, 8, s[1] - s[0], .4, 5, 0xb4b4ac, 0, true, 'block'); });
    [[8, 12], [15, 22]].forEach(function (s) { b.box(20, (s[0] + s[1]) / 2, .4, s[1] - s[0], 5, 0xb4b4ac, 0, true, 'block'); });
    b.box(4, 18.5, .46, 3, 1.6, 0xb4b4ac, 3.4, false, 'block'); b.box(11.5, 8, 3, .46, 1.6, 0xb4b4ac, 3.4, false, 'block'); b.box(20, 13.5, .46, 3, 1.6, 0xb4b4ac, 3.4, false, 'block');
    b.quad('hazard', 3.77, 3.2, 18.5, 3, .4, -PI / 2, { rep: [3, .4] }); b.quad('hazard', 11.5, 3.2, 7.77, 3, .4, PI, { rep: [3, .4] });
    b.box(12, 15, 15.6, 13.6, .02, 0xa8acad, 0, false, 'floor');
    { var rb = new T.BoxGeometry(16.8, .3, 14.8); rb.translate(12, 5.15, 15); b.geo(rb, 0x5d666c, 'panel', {}); [8, 12, 16].forEach(function (x) { b.box(x, 15, .2, 13.6, .22, 0x4f585e, 4.7, false, 'metal'); b.glow(x, 4.66, 15, .3, .05, 5, C.sky); b.quad('pool', x, .03, 15, 7, 11, 0, { flat: true, mode: 'add', color: 0x9db4c4 }); }); }
    site('B', 12.5, 15.5); b.mark('B', 3.75, 2.4, 14, 1.6, 1.6, -PI / 2, '#e2562f'); b.mark('B', 14.6, 2.4, 7.75, 1.6, 1.6, PI, '#e2562f');
    stack(6.2, 10.2, 2); stack(7.9, 10.2, 1, 0x9c8a62); stack(17.8, 20, 2); stack(16.1, 20.2, 2, 0x9c8a62); stack(18, 18.2, 1); stack(8.4, 20.2, 2, 0x9c8a62); stack(16.6, 10.4, 1);
    b.crate(12.5, 12, 2.2, 0x6f7350, .01, 1.5); b.crate(9, 15.5, 1.6, 0x9c8a62, .01, 1.6); b.barrel(15.6, 15.2, C.olive); b.barrel(16.2, 15.7, C.olive);
    // lights
    [[-18, -15.3, 0, -1], [-8, 7.6, 0, -1], [3.5, -4, 1, 0], [14, 7.5, 0, -1], [-20, 15.4, 0, 1], [21.6, -3, -1, 0], [-21.6, -6, 1, 0]].forEach(function (p) { b.lamp(p[0], p[1], 6, p[2], p[3]); });
    b.spawn('A', -26.5, 0); b.spawn('B', 26.5, 0);
    return { name: '보급기지', b: b, bounds: { minx: -30, maxx: 30, minz: -22, maxz: 22 }, bg: 0x4a5560, fog: [30, 150], hemi: [0xc4d0da, 0x4a4436, .95], sun: [0xffd9b0, .75, [-30, 38, 24]], rain: false, sky: [0x26313f, 0xb9885e],
      sites: [{ id: 'A', x: 12, z: -14 }, { id: 'B', x: 12.5, z: 15.5 }] };
  }

  var MAKERS = [dock, warehouse, depot];
  SV.MAPS = [{ name: '컨테이너 부두', info: '중형 · 72 × 44 m', hint: '통로가 얽힌 야간 부두' }, { name: '물류 창고', info: '소형 · 38 × 26 m', hint: '실내 근접전' }, { name: '보급기지', info: '중형 · 60 × 44 m', hint: '폭파 미션 가능', bomb: true }];
  SV.buildMap = function (i) { var m = MAKERS[i](); m.group = m.b.finish(); if (m.sky) m.group.add(skyDome(m.sky[0], m.sky[1])); m.boxes = m.b.boxes; m.spawns = m.b.spawns; return m; };
})();
