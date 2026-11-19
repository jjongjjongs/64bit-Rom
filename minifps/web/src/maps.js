// maps.js — the four battlegrounds. Each builder returns render meshes (grouped by surface texture) plus the collision boxes
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
    var t = new T.CanvasTexture((make || PAINT[key])()); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; t.encoding = T.sRGBEncoding; return texCache[key] = t;
  }
  // A normal map from a painted texture: brightness is taken as height, so scratches, seams and specks catch the light.
  var nrmCache = {};
  function nrm(key, strength) {
    if (nrmCache[key]) return nrmCache[key];
    var src = tex(key).image, w = src.width, h = src.height, a = cv(w, h), x = a[1], i, j; x.drawImage(src, 0, 0);
    var d = x.getImageData(0, 0, w, h), px = d.data, H = new Float32Array(w * h), out = x.createImageData(w, h), o = out.data;
    for (i = 0; i < w * h; i++) H[i] = (px[i * 4] * .3 + px[i * 4 + 1] * .59 + px[i * 4 + 2] * .11) / 255;
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
      var dx = (H[j * w + (i + 1) % w] - H[j * w + (i + w - 1) % w]) * strength, dy = (H[((j + 1) % h) * w + i] - H[((j + h - 1) % h) * w + i]) * strength, l = 1 / Math.sqrt(dx * dx + dy * dy + 1), q = (j * w + i) * 4;
      o[q] = (-dx * l * .5 + .5) * 255; o[q + 1] = (dy * l * .5 + .5) * 255; o[q + 2] = (l * .5 + .5) * 255; o[q + 3] = 255;
    }
    x.putImageData(out, 0, 0); var t = new T.CanvasTexture(a[0]); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return nrmCache[key] = t;
  }
  // how each surface answers light: [roughness, metalness, normal strength]
  var SURF = { conc: [.86, 0, 3], floor: [.42, 0, 2], corr: [.5, .55, 5], panel: [.48, .5, 4], block: [.92, 0, 5], metal: [.42, .7, 3], crate: [.8, 0, 4], plain: [.78, .05, 0] };
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
      var k = opt.flat ? 1 : .9 + Math.random() * .2, y0 = opt.y0 == null ? 1e9 : opt.y0, rep = opt.rep || [1, 1], i; col.setHex(c).convertSRGBToLinear();
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
      boxes: [], spawns: { A: [], B: [] }, lights: [], day: false,
      // a lamp that really lights its surroundings; the game keeps the nearest few switched on
      light: function (x, y, z, c, i, d) { if (!b.day) b.lights.push({ x: x, y: y, z: z, c: new T.Color(c).convertSRGBToLinear(), i: i, d: d }); },
      box: function (x, z, w, d, h, c, y0, solid, t, fit) { y0 = y0 || 0; var g = new T.BoxGeometry(w, h, d); g.translate(x, y0 + h / 2, z); push(g, c, t || 'plain', { y0: y0 < .05 ? y0 : null, fit: fit }); if (solid !== false) coll(x, z, w, d, h, y0); },
      cyl: function (x, z, r, h, c, y0, solid, t, r2, seg) { y0 = y0 || 0; var g = new T.CylinderGeometry(r2 == null ? r : r2, r, h, seg || 12); g.translate(x, y0 + h / 2, z); push(g, c, t || 'plain', { y0: y0 < .05 ? y0 : null }); if (solid !== false) coll(x, z, r * 1.7, r * 1.7, h, y0); },
      geo: function (g, c, t, opt) { push(g, c, t || 'plain', opt); },
      // a box turned about the vertical axis. Its collision record keeps the box in its own frame (ox, oz, cos, sin).
      rbox: function (x, z, w, d, h, c, y0, ang, solid, t, soft) {
        y0 = y0 || 0; var g = new T.BoxGeometry(w, h, d); g.rotateY(ang); g.translate(x, y0 + h / 2, z); push(g, c, t || 'plain', { y0: y0 < .05 ? y0 : null });
        if (solid !== false) b.rsolid(x, z, w, d, h, y0, ang, soft);
      },
      rsolid: function (x, z, w, d, h, y0, ang, soft) { var q = { minx: -w / 2, maxx: w / 2, miny: y0 || 0, maxy: (y0 || 0) + h, minz: -d / 2, maxz: d / 2, rot: true, ox: x, oz: z, c: Math.cos(ang), s: Math.sin(ang) }; if (soft) q.soft = true; b.boxes.push(q); },
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
        b.glow(hx, h + .17, hz, ax ? .56 : .24, .05, az ? .56 : .24, b.day ? 0x3a3a36 : C.lamp); if (!b.day) { b.quad('pool', hx, .03, hz, 9, 9, 0, { flat: true, mode: 'add', color: 0x5a5a5a }); b.light(hx, h - .25, hz, 0xffc98a, 2.1, 17); }
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
          var sf = SURF[k] || SURF.plain, mat = k === 'glow' ? new T.MeshBasicMaterial({ vertexColors: true, fog: false, color: new T.Color(3, 3, 3) })   // brighter than white: this is what blooms
            : new T.MeshStandardMaterial({ vertexColors: true, map: k === 'plain' ? null : tex(k), normalMap: sf[2] ? nrm(k, sf[2]) : null, roughness: sf[0], metalness: sf[1] });
          mat.userData.surf = k;
          var m = new T.Mesh(geo(L[k]), mat); if (k !== 'glow') { m.castShadow = true; m.receiveShadow = true; } grp.add(m);
        }
        for (k in Q) {
          var q = Q[k], qm = q.mode === 'add' ? new T.MeshBasicMaterial({ map: q.tex, blending: T.AdditiveBlending, transparent: true, depthWrite: false, vertexColors: true })
            : q.mode === 'alpha' ? new T.MeshStandardMaterial({ map: q.tex, vertexColors: true, transparent: true, alphaTest: .25, side: T.DoubleSide, roughness: .7, metalness: .1 })
            : q.mode === 'lit' ? new T.MeshBasicMaterial({ map: q.tex, vertexColors: true, fog: false }) : new T.MeshStandardMaterial({ map: q.tex, vertexColors: true, roughness: .6, metalness: .2 });
          var qq = new T.Mesh(geo(q), qm); qq.receiveShadow = q.mode !== 'add' && q.mode !== 'lit'; qq.renderOrder = q.mode === 'add' ? 2 : 1; grp.add(qq);
        }
        return grp;
      }
    };
    return b;
  }
  function skyDome(top, horizon) {
    var g = new T.SphereGeometry(300, 16, 10), p = g.attributes.position, c = [], a = new T.Color(top).convertSRGBToLinear(), h = new T.Color(horizon).convertSRGBToLinear(), i;
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
    for (i = -15; i <= 15; i += 6) { b.light(i, h - .5, -5, 0xd6e6f2, 1.35, 15); b.light(i, h - .5, 6, 0xd6e6f2, 1.35, 15); b.glow(i, h - .04, -5, 1.6, .06, 6, C.sky); b.glow(i, h - .04, 6, 1.6, .06, 6, C.sky); }
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

  // 03 보급기지 — 92 x 64 m 야외 기지. 건물 블록 아홉 개가 3 x 3 으로 놓이고 그 사이 길이 격자를 이룬다. 폭파 미션에서는
  // 공격이 서쪽, 수비가 동쪽에서 출발하고 목표는 북동(A 연료 집적소, 야외)과 남동(B 보급 창고, 실내)이다.
  function depot() {
    var b = Builder(), i, ROOF = !SV.noRoof, OL = 0x56633f, OD = 0x3f4a30, WC = 0xb4b4ac;   // SV.noRoof: 평면도를 찍을 때만 쓴다
    b.box(0, 0, 150, 110, .4, 0x777a70, -.4, false, 'conc');
    [-29, 29].forEach(function (z) { for (i = -30; i <= 14; i += 4) b.box(i, z, 2, .14, .02, 0xd8d8d2, 0, false); });
    for (i = -36; i <= 32; i += 4) b.box(i, 0, 2, .14, .02, C.yellow, 0, false);
    [[-27, -10], [9, 10], [-18, 29], [27, -3], [-4, -29], [18, -20], [-36, 14], [2, 20]].forEach(function (p) { b.quad('puddle', p[0], .025, p[1], rnd(3, 5), rnd(2.4, 3.6), rnd(0, 3), { flat: true, mode: 'alpha' }); });
    function bldg(x0, x1, z0, z1, h, c) { var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0; b.box(cx, cz, w, d, 2.2, c || WC, 0, true, 'block'); b.box(cx, cz, w - .1, d - .1, h - 2.2, 0x7d8a80, 2.2, true, 'panel'); b.box(cx, cz, w + .5, d + .5, .25, 0x464c4f, h, false); }
    // a wall along x (at z = c) or along z (at x = c) with door gaps; a lintel closes each gap above head height
    function wallG(along, c, a0, a1, gaps, h) {
      var cur = a0; gaps = (gaps || []).concat([[a1, a1]]);
      gaps.forEach(function (g) {
        if (g[0] > cur) { if (along === 'x') b.box((cur + g[0]) / 2, c, g[0] - cur, .4, h, WC, 0, true, 'block'); else b.box(c, (cur + g[0]) / 2, .4, g[0] - cur, h, WC, 0, true, 'block'); }
        if (g[1] > g[0]) { var m = (g[0] + g[1]) / 2, l = g[1] - g[0]; if (along === 'x') { b.box(m, c, l, .46, h - 3.2, WC, 3.2, true, 'block'); b.quad('hazard', m, 3, c - .24, l, .4, PI, { rep: [l, .4] }); b.quad('hazard', m, 3, c + .24, l, .4, 0, { rep: [l, .4] }); } else { b.box(c, m, .46, l, h - 3.2, WC, 3.2, true, 'block'); b.quad('hazard', c - .24, 3, m, l, .4, -PI / 2, { rep: [l, .4] }); b.quad('hazard', c + .24, 3, m, l, .4, PI / 2, { rep: [l, .4] }); } }
        cur = g[1];
      });
    }
    // a building you can walk through: four walls with doors, a floor, a roof and strip lights
    function hall(x0, x1, z0, z1, h, d) {
      var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, dp = z1 - z0, x;
      wallG('x', z0, x0, x1, d.N, h); wallG('x', z1, x0, x1, d.S, h); wallG('z', x0, z0, z1, d.W, h); wallG('z', x1, z0, z1, d.E, h);
      b.box(cx, cz, w - .4, dp - .4, .02, 0xa8acad, 0, false, 'floor');
      if (ROOF) { var rf = new T.BoxGeometry(w + .8, .3, dp + .8); rf.translate(cx, h + .15, cz); b.geo(rf, 0x5d666c, 'panel', {}); for (x = x0 + 3; x < x1 - 1; x += 4) { b.box(x, cz, .2, dp - .4, .22, 0x4f585e, h - .3, false, 'metal'); b.glow(x, h - .34, cz, .3, .05, Math.min(6, dp - 4), C.sky); b.light(x, h - .7, cz, 0xd6e6f2, 1.3, 13); } }
    }
    function truck(x, z, rot, dir) {
      var L = 6.6, W = 2.4, f = dir || 1;
      function bx(dl, dw, l, w, h, c, y, t) { if (rot) b.box(x + dw, z + dl * f, w, l, h, c, y, false, t); else b.box(x + dl * f, z + dw, l, w, h, c, y, false, t); }
      bx(2.3, 0, 1.9, 2.3, 1.7, OL, .75, 'metal'); bx(2.9, 0, .6, 2.1, .7, 0x1c2226, 1.6); bx(3.3, 0, .2, 2.3, .5, 0x2a2e31, .55);
      bx(-.9, 0, 4.5, 2.36, .25, 0x2a2e31, .85, 'metal'); bx(-.9, 0, 4.4, 2.3, 1.75, OD, 1.1, 'panel'); bx(-3.15, 0, .06, 2.1, 1.5, 0x2c3422, 1.2);
      [[2.3, 1], [2.3, -1], [-1.4, 1], [-1.4, -1], [-2.5, 1], [-2.5, -1]].forEach(function (q) { var g = new T.CylinderGeometry(.42, .42, .32, 12); if (rot) { g.rotateZ(PI / 2); g.translate(x + q[1] * 1.05, .42, z + q[0] * f); } else { g.rotateX(PI / 2); g.translate(x + q[0] * f, .42, z + q[1] * 1.05); } b.geo(g, 0x17191b, 'plain', {}); });
      b.solid(x, z, rot ? W : L, rot ? L : W, 2.85);
    }
    function tank(x, z) { var g = new T.CylinderGeometry(1.15, 1.15, 5.2, 16); g.rotateZ(PI / 2); g.translate(x, 1.65, z); b.geo(g, 0xb9bdb6, 'metal', {}); [-1.7, 1.7].forEach(function (d) { b.box(x + d, z, .5, 1.9, .55, 0x8d9296, 0, false, 'conc'); }); b.box(x, z, 5.3, .06, .5, C.red, 1.5, false); b.solid(x, z, 5.2, 2.3, 2.8); }
    function stack(x, z, n, c) { b.pallet(x, z, 0); b.crate(x, z, 1.4, c || 0x7c7a52, .14, 1.2); b.solid(x, z, 1.5, 1.5, .2); if (n > 1) { b.crate(x + .1, z - .05, 1.2, 0x8a8660, 1.34, 1.1); b.solid(x, z, 1.3, 1.3, 1.1, 1.34); } }
    function site(id, x, z) { [[0, -2.6, 5.2, .35], [0, 2.6, 5.2, .35], [-2.6, 0, .35, 5.2], [2.6, 0, .35, 5.2]].forEach(function (q) { b.quad('hazard', x + q[0], .025, z + q[1], q[2], q[3], 0, { flat: true, rep: [q[2], q[3]] }); }); b.mark(id, x, .03, z, 2.6, 2.6, 0, '#e2562f', true); }
    // perimeter and the two spawn yards
    b.wallX(-32.2, -46.4, 46.4, 5, 0xa9aaa2); b.wallX(32.2, -46.4, 46.4, 5, 0xa9aaa2); b.wallZ(-46.2, -32, 32, 5, 0xa9aaa2); b.wallZ(46.2, -32, 32, 5, 0xa9aaa2);
    b.solid(0, -32.2, 93, .4, 9); b.solid(0, 32.2, 93, .4, 9); b.solid(-46.2, 0, .4, 64, 9); b.solid(46.2, 0, .4, 64, 9);
    [[-27, -3], [3, 27]].forEach(function (s) { b.wallZ(-38, s[0], s[1], 3.4, WC); });
    [[-32, -22], [-18, -2], [2, 12], [30, 32]].forEach(function (s) { b.wallZ(34, s[0], s[1], 3.4, WC); });
    b.mark('공격', -37.75, 2.4, -15, 3, .9, PI / 2, '#ffb347'); b.mark('수비', 33.75, 2.4, -10, 3, .9, -PI / 2, '#6cc4e0');
    // north row: workshop you can cut through, a closed store, the tank farm
    hall(-34, -20, -26, -12, 5.5, { W: [[-21, -17]], E: [[-21, -17]], S: [[-29, -25]] }); b.mark('정비고', -27, 4.5, -11.74, 4, 1, 0, '#ecebe4');
    truck(-27, -23.6, false, 1); stack(-32.4, -14, 2); stack(-22, -14.2, 1, 0x9c8a62); b.barrel(-21.4, -24.6, C.olive); b.tires(-32.6, -24.6, 3);
    bldg(-16, 0, -26, -12, 5.6); [-12, -8, -4].forEach(function (x) { b.quad('shutter', x, 1.9, -26.03, 3.4, 3.8, PI); b.quad('shutter', x, 1.9, -11.97, 3.4, 3.8, 0); }); b.mark('2 창고', -8, 4.6, -11.94, 3.4, 1, 0, '#ecebe4');
    tank(10, -23.4); tank(10, -18.9); tank(10, -14.4); b.box(10, -26.1, 12, .25, .3, 0x9a9c97, 0, false, 'conc'); b.barrel(5, -25, C.red); b.barrel(15.2, -13, C.red); b.barrel(14.6, -13.4, C.olive);
    // middle row: motor pool, control hut with alleys all round, container stacks
    truck(-28, -5.6, false, 1); truck(-26.5, .6, false, -1); truck(-28, 6, false, 1); b.cone(-21.5, -7); b.cone(-21.5, 7); stack(-33, 0, 1);
    bldg(-13, -3, -5, 5, 3.5, 0xa8a89c); b.quad('door', -8, 1.25, 5.03, 1.3, 2.4, 0, { color: 0x56633f }); b.mark('통제소', -8, 2.9, -5.03, 3, .7, PI, '#ecebe4'); b.barrel(-14.4, -6.6, C.olive); stack(-1.4, 6.8, 1, 0x9c8a62);
    b.cont(7.5, -5.5, false, OL, 0); b.cont(12.5, -1, true, C.sand, 0); b.cont(7, 2.5, false, C.navy, 0); b.cont(7, 2.5, false, OL, 1); b.cont(12, 6.2, false, C.rust, 0);
    // south row: barracks, a second barracks with a corridor through it, the mess
    bldg(-34, -20, 12, 26, 4.6, 0xb0ae9e); b.mark('1 생활관', -27, 3.6, 11.94, 3.6, .9, PI, '#ecebe4'); [-31, -27, -23].forEach(function (x) { b.box(x, 11.95, 1.4, .08, 1, 0x1c2226, 1.3, false); b.box(x, 26.05, 1.4, .08, 1, 0x1c2226, 1.3, false); });
    hall(-16, 0, 12, 26, 4.6, { N: [[-10, -7]], S: [[-10, -7]], E: [[17, 20]] }); b.mark('2 생활관', -3.5, 3.7, 11.74, 3.4, .9, PI, '#ecebe4');
    [[-14.4, 15], [-14.4, 19], [-14.4, 23], [-1.6, 14], [-1.6, 23.5]].forEach(function (q) { b.box(q[0], q[1], 2, 1, .5, 0x5b6548, 0, true); b.box(q[0], q[1], 2, 1, .08, 0x8d9296, 1.3, false, 'metal'); }); b.wallX(19, -6, -1.5, 2.4, 0x9c9c90);
    bldg(4, 16, 14, 26, 4.4, 0xb0ae9e); b.mark('식당', 10, 3.5, 13.94, 2.4, .9, PI, '#ecebe4'); b.tires(5, 12.9, 3); b.barrel(15, 13, C.olive);
    // A: fuel dump under an open shed, walled on the west and south
    b.wallZ(20, -26, -12, 4, WC); b.wallX(-8, 20, 24, 4, WC); b.wallX(-8, 27, 34, 4, WC);
    [[22.5, -25], [31.5, -25], [22.5, -15], [31.5, -15]].forEach(function (p) { b.box(p[0], p[1], .3, .3, 4.4, 0x4f585e, 0, true, 'metal'); });
    b.box(27, -25, 9.3, .2, .25, 0x4f585e, 4.15, false, 'metal'); b.box(27, -15, 9.3, .2, .25, 0x4f585e, 4.15, false, 'metal');
    if (ROOF) { var ra = new T.BoxGeometry(10.4, .16, 11.4); ra.translate(27, 4.5, -20); b.geo(ra, 0x6a7479, 'panel', {}); }
    tank(28, -29.6); site('A', 27, -20); stack(23, -17, 2); stack(31.4, -22.4, 2, 0x9c8a62); stack(30.5, -11.6, 1); b.jersey(22.2, -28.6, 3, true); b.jersey(25.5, -10.6, 3, false);
    b.barrel(23.4, -23.4, C.red); b.barrel(24.1, -23.8, C.red); b.barrel(23.9, -23, C.olive); b.mark('A', 19.75, 2.6, -19, 1.6, 1.6, -PI / 2, '#e2562f'); b.mark('A', 22, 2.6, -7.75, 1.6, 1.6, 0, '#e2562f');
    // east yard between the two sites
    b.wallZ(20, -8, -2, 3.4, WC); b.wallZ(20, 6, 12, 3.4, WC);
    [[25.6, .6], [28.4, .6], [25.6, 3.4], [28.4, 3.4]].forEach(function (p) { b.box(p[0], p[1], .28, .28, 6.2, 0x4f585e, 0, true, 'metal'); });
    b.seg(25.6, .3, .6, 28.4, 3, .6, .08, 0x4f585e); b.seg(25.6, .3, 3.4, 28.4, 3, 3.4, .08, 0x4f585e); b.seg(25.6, 3, .6, 25.6, 6, 3.4, .08, 0x4f585e); b.seg(28.4, 3, .6, 28.4, 6, 3.4, .08, 0x4f585e);
    b.cyl(27, 2, 2.3, 2.6, 0x7b8a7a, 6.2, false, 'metal', 2.3, 18); b.cyl(27, 2, 2.4, .4, 0x586458, 8.8, false, 'metal', .6, 18);
    truck(27.5, 8.4, false, 1); stack(22, -4.6, 2); b.jersey(31, -3.4, 3, false); b.tires(32.6, 10.6, 3); b.jersey(22.4, 3, 3, true);
    // B: supply hall, four doors
    hall(20, 34, 12, 30, 5, { N: [[24, 27]], W: [[15, 18], [26, 29]], E: [[19, 22]] }); site('B', 27, 21.5);
    b.mark('B', 19.75, 2.4, 22, 1.6, 1.6, -PI / 2, '#e2562f'); b.mark('B', 29, 2.4, 11.75, 1.6, 1.6, PI, '#e2562f');
    stack(22, 13.8, 2); stack(32.2, 13.8, 1, 0x9c8a62); stack(32.2, 28.2, 2); stack(30.5, 28.4, 2, 0x9c8a62); stack(22, 22.4, 1); stack(31.6, 24.4, 1, 0x9c8a62); stack(23.8, 28.4, 2);
    b.crate(27, 16.6, 2.2, 0x6f7350, .01, 1.5); b.crate(23.2, 18.6, 1.6, 0x9c8a62, .01, 1.6); b.barrel(30.6, 19.2, C.olive); b.barrel(31.2, 19.7, C.olive);
    // road and street cover
    truck(-8, -29.8, false, 1); stack(-24, -27.4, 2); b.cont(12, -30.6, false, C.teal, 0); b.jersey(2, -28.2, 3, true); b.barrel(-17, -31.2, C.olive);
    b.cont(-9.5, 30.6, false, OL, 0); stack(-30, 27.6, 2); b.jersey(6, 28, 3, true); b.barrel(15, 31.2, C.olive); b.barrel(15.7, 31.3, C.red); stack(18.6, 27.4, 1, 0x9c8a62);
    stack(-18.9, -1.5, 2); b.jersey(-17, 9.4, 3, false); b.tires(19, 9.4, 3); stack(1, -11.2, 1); b.jersey(17.4, -3, 3, true); b.barrel(3.4, 9, C.olive); b.jersey(-35.4, -14, 3, true); b.jersey(-35.4, 14, 3, true);
    [[-36, -27.6, 0, 1], [-18, -8.3, 0, 1], [2, -8.3, 0, 1], [18, -8.3, -1, 0], [-18, 8.3, 0, -1], [2, 8.3, 0, -1], [-36, 27.6, 0, -1], [8, -31.6, 0, 1], [8, 31.6, 0, -1], [33.6, 5, -1, 0], [-37.6, -8, 1, 0], [-37.6, 8, 1, 0], [20.4, -30, 1, 0]].forEach(function (p) { b.lamp(p[0], p[1], 6, p[2], p[3]); });
    b.spawn('A', -42, 0); b.spawn('B', 40.5, 0);
    return { name: '보급기지', b: b, bounds: { minx: -46, maxx: 46, minz: -32, maxz: 32 }, bg: 0x4a5560, fog: [36, 170], hemi: [0xc4d0da, 0x4a4436, .95], sun: [0xffd9b0, .75, [-30, 38, 24]], rain: false, sky: [0x26313f, 0xb9885e],
      // 폭파 미션: 목표 지점과, 공격 봇이 라운드마다 하나씩 골라 거쳐 가는 길목(via), 수비 봇 일부가 앞으로 나가 서는 자리(fwd)
      sites: [{ id: 'A', x: 27, z: -20, via: [[2, -29], [-18, -10], [2, -10], [18, 2], [-27, -19]] }, { id: 'B', x: 27, z: 21.5, via: [[2, 29], [-18, 10], [2, 10], [18, 2], [-8.5, 19]] }],
      fwd: [[18, -10], [18, 10], [2, 0], [27, -4], [14, -29], [18, 24]] };
  }
  // 04 구시가지 — 88 x 60 m, 2층. 폭파 미션 맵들의 공통 짜임을 따랐다: 세 갈래 길과 그 사이 연결로, 양쪽 목표로 통하는 가운데
  // 건물, 지점마다 성격이 다른 입구 셋 이상(큰길, 샛길, 윗길), 수비가 먼저 닿는 거리, 야외 지점 하나와 실내 지점 하나.
  // 건물은 저마다 다른 각도로 놓여 길이 직각으로 만나지 않는다. 위층(H = 3.2 m)은 시장 옥상, 구름다리, A 옥상, B 중층이다.
  function oldtown() {
    var b = Builder(); b.day = true; var H = 3.2, ROOF = !SV.noRoof, links = [], ladders = [], ST = 0xc9b79a, ST2 = 0xb9a488, TILE = 0x9a5a3c, DK = 0x4f585e, WD = 0x9c7a4a;
    b.box(0, 0, 140, 110, .4, 0x8f897c, -.4, false, 'conc');
    // a local frame: everything built through it is placed and turned together, so each building is laid out as a plain rectangle
    function fr(cx, cz, ang) {
      var c = Math.cos(ang), s = Math.sin(ang), f = {
        p: function (lx, lz, l) { return [cx + lx * c + lz * s, cz - lx * s + lz * c, l || 0]; },
        box: function (lx, lz, w, d, h, col, y0, solid, t, soft) { var q = f.p(lx, lz); b.rbox(q[0], q[1], w, d, h, col, y0 || 0, ang, solid, t, soft); },
        wall: function (al, c0, a0, a1, gaps, y0, h, col) { var cur = a0; (gaps || []).concat([[a1, a1]]).forEach(function (g) { if (g[0] > cur + .01) { var m = (cur + g[0]) / 2, l = g[0] - cur; if (al === 'x') f.box(m, c0, l, .4, h, col || ST, y0, true, 'block'); else f.box(c0, m, .4, l, h, col || ST, y0, true, 'block'); } cur = g[1]; }); },
        // waist-high railing: stops people, lets bullets through
        rail: function (al, c0, a0, a1, gaps, y0) { var cur = a0; (gaps || []).concat([[a1, a1]]).forEach(function (g) { if (g[0] > cur + .01) { var m = (cur + g[0]) / 2, l = g[0] - cur; if (al === 'x') { f.box(m, c0, l, .12, .08, DK, y0 + .95, true, 'metal', true); f.box(m, c0, l, .06, .06, DK, y0 + .5, false, 'metal'); } else { f.box(c0, m, .12, l, .08, DK, y0 + .95, true, 'metal', true); f.box(c0, m, .06, l, .06, DK, y0 + .5, false, 'metal'); } var q = f.p(al === 'x' ? m : c0, al === 'x' ? c0 : m); b.rsolid(q[0], q[1], al === 'x' ? l : .12, al === 'x' ? .12 : l, 1.03, y0, ang, true); for (var k = cur; k <= g[0] + .01; k += Math.max(1, l / Math.round(l / 1.6))) f.box(al === 'x' ? k : c0, al === 'x' ? c0 : k, .08, .08, .95, DK, y0, false, 'metal'); } cur = g[1]; }); },
        // eight steps up to the upper floor, starting at (lx, lz) and running along (dx, dz)
        stairs: function (lx, lz, dx, dz, wd) { for (var i = 0; i < 8; i++) f.box(lx + dx * (i * .5 + .25), lz + dz * (i * .5 + .25), dx ? .5 : wd, dx ? wd : .5, .4 * (i + 1), 0xa39a88, 0, true, 'conc'); links.push({ a: f.p(lx - dx * .8, lz - dz * .8, 0), b: f.p(lx + dx * 4.9, lz + dz * 4.9, 1) }); },
        // a ladder on a wall face at (lx, lz); (dx, dz) points into the wall
        ladder: function (lx, lz, dx, dz) {
          var i, q; [-.24, .24].forEach(function (o) { f.box(lx - dx * .1 + dz * o, lz - dz * .1 + dx * o, .07, .07, H + 1, 0x8d6a2e, 0, false, 'metal'); });
          for (i = 1; i <= 10; i++) f.box(lx - dx * .1, lz - dz * .1, dx ? .05 : .5, dx ? .5 : .05, .05, 0x8d6a2e, i * .38, false, 'metal');
          q = f.p(lx - dx * .42, lz - dz * .42); ladders.push({ x: q[0], z: q[1], dx: dx * c + dz * s, dz: -dx * s + dz * c, y1: H });
          links.push({ a: f.p(lx - dx * .8, lz - dz * .8, 0), b: f.p(lx + dx * 1.3, lz + dz * 1.3, 1) });
        } };
      return f;
    }
    function crate(f, lx, lz, s, h, y0, col) { f.box(lx, lz, s, s, h, col || 0x9c8a62, y0 || 0, true, 'crate'); }
    function site(id, x, z) { [[0, -2.6, 5.2, .35], [0, 2.6, 5.2, .35], [-2.6, 0, .35, 5.2], [2.6, 0, .35, 5.2]].forEach(function (q) { b.quad('hazard', x + q[0], .025, z + q[1], q[2], q[3], 0, { flat: true, rep: [q[2], q[3]] }); }); b.mark(id, x, .03, z, 2.6, 2.6, 0, '#e2562f', true); }
    // the town wall: an eight-sided ring instead of a rectangle
    var ring = [[-44, -10], [-24, -30], [30, -30], [44, -16], [44, 14], [28, 30], [-30, 30], [-44, 16]];
    ring.forEach(function (p, i) { var q = ring[(i + 1) % ring.length], dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz), ang = Math.atan2(-dz, dx), mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2; b.rbox(mx, mz, len + .6, .7, 5.4, 0xa89c88, 0, ang, false, 'block'); b.rbox(mx, mz, len + .9, 1, .3, 0x8a7f6e, 5.4, ang, false, 'conc'); b.rsolid(mx, mz, len + .6, .7, 10, 0, ang); });

    // ----- market hall in the middle: open arcade below, terrace above
    var M = fr(-6, 2, .3);
    M.wall('x', -6, -9, 9, [[-6, -2], [1, 4]], 0, 3); M.wall('x', 6, -9, 9, [[-1, 3]], 0, 3); M.wall('z', -9, -6, 6, [[-2, 2]], 0, 3); M.wall('z', 9, -6, 6, [[-2, 2]], 0, 3);
    M.box(0, 0, 17.6, 11.6, .02, 0xa8a294, 0, false, 'floor');
    M.box(0, -1.25, 18.4, 9.5, .2, 0x8a8478, 3, true, 'conc'); M.box(3, 4.75, 12.4, 2.9, .2, 0x8a8478, 3, true, 'conc');   // terrace floor, with a well for the stairs
    M.stairs(-7, 4.7, 1, 0, 2); M.ladder(6.5, -6.2, 0, 1);
    M.rail('x', -6.1, -9.1, 9.1, [[5.8, 7.2]], H); M.rail('z', 9.1, -6.1, 6.1, [[-4.7, -1.3]], H); M.rail('x', 6.1, -3, 9.1, [], H); M.rail('z', -9.1, -6.1, 3.5, [], H); M.rail('x', 3.5, -9.1, -3, [], H);
    M.wall('x', 6, -9, -3, [], 3, 1.25); M.wall('z', -9, 3.5, 6, [], 3, 1.25);
    [[-8.5, -5.5], [8.5, -5.5], [8.5, 5.5], [0, -5.5], [0, 5.5]].forEach(function (q) { M.box(q[0], q[1], .35, .35, 2.8, WD, H, true); });
    if (ROOF) { M.box(0, 0, 19.4, 13.2, .2, TILE, 6, false, 'panel'); }
    crate(M, 0, -1, 1.5, 1.3, H); crate(M, -5, -3.5, 1.3, 1.1, H, 0x7c7a52); crate(M, 5.5, 3, 1.4, 1.2, H); M.box(-2, 2, 3, .5, 1.1, ST2, H, true, 'block');
    M.box(2.5, -2.2, 3.2, 1.2, 1, WD, 0, true, 'crate'); M.box(-3.5, 1.6, 1.2, 3, 1, WD, 0, true, 'crate'); crate(M, 5.5, 2.6, 1.5, 1.4); crate(M, -1, -4, 1.3, 1.2, 0, 0x7c7a52);
    b.mark('시장', M.p(-9.25, 0)[0], 2.2, M.p(-9.25, 0)[1], 2.4, .9, .3 - PI / 2, '#3a2f22');

    // ----- A: a walled plaza with a rooftop walk along its west side
    var A = fr(22, -12, -.2);
    A.box(-9, -6.5, 6, 9, 3, ST2, 0, true, 'block'); A.box(-9, 6, 6, 10, 3, ST2, 0, true, 'block'); A.box(-9, 0, 6.4, 22.4, .2, 0x8a8478, 3, true, 'conc');   // row of houses, an archway through, roof on top
    A.stairs(-4.8, 4, 0, 1, 2.4); A.box(-4.8, 9.5, 2.4, 3, H, 0xa39a88, 0, true, 'conc');
    A.rail('z', -12.1, -11.1, 11.1, [[6.3, 9.7]], H); A.rail('x', -11.1, -12.1, -5.9, [], H); A.rail('x', 11.1, -12.1, -3.6, [], H); A.rail('z', -5.9, -11.1, 8, [], H); A.rail('z', -3.6, 8, 11.1, [], H);
    A.box(-10, -6, 1.6, 1.2, 1.1, 0x9aa0a4, H, true, 'metal'); A.box(-8.4, 1.5, 1.2, 2.2, 1.2, 0x9aa0a4, H, true, 'metal'); A.box(-10.6, 4.4, .9, .9, 1.9, 0x8a5a44, H, true, 'block'); A.box(-7.6, -9.6, 1.4, 1.4, 1.2, 0x9c8a62, H, true, 'crate');
    A.box(5, -10, 14, 2, 5.2, ST, 0, true, 'block'); A.box(11, -7, 2, 8, 5.2, ST, 0, true, 'block'); A.box(11, 5, 2, 8, 5.2, ST, 0, true, 'block'); A.box(1.2, 10, 9.6, 2, 5.2, ST, 0, true, 'block'); A.box(10.5, 10, 3, 2, 5.2, ST, 0, true, 'block');
    if (ROOF) [[5, -10, 14.6, 2.6], [11, -7, 2.6, 8.6], [11, 5, 2.6, 8.6], [1.2, 10, 10.2, 2.6], [10.5, 10, 3.6, 2.6]].forEach(function (q) { A.box(q[0], q[1], q[2], q[3], .25, TILE, 5.2, false, 'panel'); });
    var fa = A.p(3, -5.4); b.cyl(fa[0], fa[1], 1.6, .7, 0xa8a294, 0, true, 'conc', 1.6, 8); b.cyl(fa[0], fa[1], .3, 1.5, 0xa8a294, 0, false, 'conc', .4, 8);
    crate(A, 7.6, 4.2, 1.5, 1.3); crate(A, -1.6, -6.4, 1.5, 1.3, 0, 0x7c7a52); A.box(.2, 5.6, 2.6, 1.2, 1, WD, 0, true, 'crate'); A.box(7, -5.5, 3, .5, 1.05, ST2, 0, true, 'block'); A.box(-2.6, 2.2, .5, 2.4, 1.05, ST2, 0, true, 'block');
    var sa = A.p(3, 0); site('A', sa[0], sa[1]);

    // ----- bridge from the market terrace to the A rooftop
    var p0 = M.p(9.2, -3), p1 = A.p(-12.2, 8), bl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ba = Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]), BR = fr((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, ba);
    BR.box(0, 0, bl + 1, 3.4, .2, 0x8a7f6e, 3, true, 'conc'); BR.rail('x', -1.64, -bl / 2, bl / 2, [], H); BR.rail('x', 1.64, -bl / 2, bl / 2, [], H); BR.box(0, 0, .5, .5, 3, 0x8a7f6e, 0, true, 'conc');
    links.push({ a: M.p(7.6, -3, 1), b: A.p(-10.4, 8, 1) }); links.push({ a: A.p(-4.8, 9.4, 1), b: A.p(-8, 9.4, 1) });

    // ----- B: a two-storey storehouse; the bomb goes on the ground floor, a gallery looks down on it
    var Bf = fr(20, 17, .2);
    Bf.wall('z', -9, -6.5, 6.5, [], 0, H); Bf.wall('z', -9, -6.5, 6.5, [[1, 3]], H, 3); Bf.box(-9, 2, .4, 2, 1, ST, 5.2, true, 'block');
    Bf.wall('x', 6.5, -9, 9, [[-6, -3]], 0, 6.2); Bf.box(-4.5, 6.5, 3, .4, 3.4, ST, 2.8, true, 'block'); Bf.wall('x', -6.5, -9, 9, [[2, 5]], 0, 6.2); Bf.box(3.5, -6.5, 3, .4, 3.2, ST, 3, true, 'block');
    Bf.wall('z', 9, -6.5, 6.5, [[-1.5, 1.5]], 0, 6.2); Bf.box(9, 0, .4, 3, 3.2, ST, 3, true, 'block');
    Bf.box(0, 0, 17.6, 12.6, .02, 0xa8acad, 0, false, 'floor'); Bf.box(-6.25, 0, 5.5, 12.6, .2, 0x7d766a, 3, true, 'conc'); [-2, 3.5].forEach(function (z) { Bf.box(-3.7, z, .25, .25, 3, DK, 0, true, 'metal'); });
    Bf.stairs(.5, -5.2, -1, 0, 2); Bf.rail('z', -3.5, -4.2, 6.3, [], H); Bf.ladder(-9.2, 2, 1, 0);
    if (ROOF) Bf.box(0, 0, 18.8, 13.8, .25, 0x5d666c, 6.2, false, 'panel');
    crate(Bf, 6.6, -3.6, 1.6, 1.4); Bf.box(.4, 4.7, 2, 2, 1.6, 0x6f7350, 0, true, 'crate'); crate(Bf, 7.2, 4.6, 1.5, 1.3, 0, 0x7c7a52); crate(Bf, 7.2, 3.1, 1.2, 1.1); Bf.box(-7.9, -3.5, 1, 3.4, 2.2, 0x6f7350, 0, true, 'crate'); Bf.box(-1.4, .4, 1.4, 1.4, 1.2, 0x9c8a62, 0, true, 'crate');
    crate(Bf, -7.6, -3, 1.3, 1.1, H); crate(Bf, -5, 5.2, 1.3, 1.2, H, 0x7c7a52);
    var sb = Bf.p(3.5, 1); site('B', sb[0], sb[1]);

    // ----- the houses that shape the lanes
    [[-14, -17, .5, 12, 7, 5.6, ST], [-12, 21, -.25, 15, 6, 6, ST2], [-28, -5, .9, 6, 5, 4.6, ST2], [37.5, 8.5, -.45, 5, 4, 4.4, ST], [-27, 14, .15, 5, 4, 4.2, ST], [4, 24.5, .5, 4, 3, 3.6, ST2]].forEach(function (q) {
      var f = fr(q[0], q[1], q[2]); f.box(0, 0, q[3], q[4], q[5], q[6], 0, true, 'block'); f.box(0, 0, q[3] + .6, q[4] + .6, .3, TILE, q[5], false, 'panel'); f.box(q[3] / 2 + .03, 0, .06, 1.1, 2.1, 0x5a4630, 0, false); f.box(-q[3] / 4, q[4] / 2 + .03, 1.2, .06, 1, 0x26303a, 1.3, false); f.box(q[3] / 4, -q[4] / 2 - .03, 1.2, .06, 1, 0x26303a, 1.3, false);
    });
    b.cyl(0, -18, 2.2, 3, ST2, 0, true, 'block', 2.2, 8); b.cyl(0, -18, 2.6, .9, TILE, 3, false, 'panel', .3, 8);               // kiosk on the north square
    b.cyl(6.5, 8, 1.3, .9, 0xa8a294, 0, true, 'conc', 1.3, 10); b.seg(5.4, .9, 8, 5.4, 2.6, 8, .1, WD); b.seg(7.6, .9, 8, 7.6, 2.6, 8, .1, WD); b.seg(5.4, 2.6, 8, 7.6, 2.6, 8, .1, WD);   // well
    // street cover
    [[-22, -22, 2], [-3, -26.5, 1], [9, -24, 2], [-20, 6, 1], [-22, 26, 2], [0, 14, 1], [10, 27, 2], [33, 22, 1], [36, -8, 2], [14, 2.5, 1], [-33, -12, 1], [-4, -10.5, 2]].forEach(function (q, n) { b.pallet(q[0], q[1], 0); b.crate(q[0], q[1], 1.4, n % 2 ? 0x7c7a52 : 0x9c8a62, .14, 1.2); b.solid(q[0], q[1], 1.5, 1.5, .2); if (q[2] > 1) { b.crate(q[0] + .1, q[1], 1.2, 0x8a8660, 1.34, 1.1); b.solid(q[0], q[1], 1.3, 1.3, 1.1, 1.34); } });
    [[-18, -27, C.olive], [-17.3, -26.7, C.red], [15, 9, C.blue], [-2, 28.4, C.olive], [31, 3, C.red], [31.6, 3.5, C.olive], [-34, 12, C.blue], [12.5, -27.5, C.olive]].forEach(function (q) { b.barrel(q[0], q[1], q[2]); });
    b.jersey(-30, 2, 3, true); b.jersey(34, -2, 3, true); b.jersey(8, -3.5, 3, false); b.jersey(16, 28, 3, false); b.tires(-8, 28.6, 3); b.tires(30, -27, 3);
    [[-30, -18, 1, 0], [-8, -27, 0, 1], [8, -16, -1, 0], [-20, 11, 1, 0], [-2, 27.5, 0, -1], [10, 4, 0, 1], [32, 5, -1, 0], [38, -12, -1, 0], [20, 28, 0, -1], [-36, 4, 1, 0], [24, -27, 0, 1]].forEach(function (q) { b.lamp(q[0], q[1], 5.5, q[2], q[3]); });
    [[-10, -24], [6, -12], [-18, 14], [12, 12], [34, 12], [-34, -2]].forEach(function (q) { b.quad('puddle', q[0], .025, q[1], rnd(3, 5), rnd(2.4, 3.6), rnd(0, 3), { flat: true, mode: 'alpha' }); });
    b.spawn('A', -39.5, 3); b.spawn('B', 39.5, -1);
    return { name: '구시가지', b: b, bounds: { minx: -44, maxx: 44, minz: -30, maxz: 30 }, bg: 0x93a7b8, fog: [40, 190], hemi: [0xe2ebf2, 0x6a5c48, 1], sun: [0xfff0d0, .9, [-26, 40, 18]], rain: false, sky: [0x3a6aa6, 0xd9cdb4],
      H: H, links: links, ladders: ladders,
      sites: [{ id: 'A', x: sa[0], z: sa[1], l: 0, y: 0, via: [[-4, -25, 0], [-12, -8, 0], [5, -9, 0], M.p(0, -1, 1), A.p(-9, 6, 1)] }, { id: 'B', x: sb[0], z: sb[1], l: 0, y: 0, via: [[-2, 27, 0], [-8, 12.5, 0], [8, 11, 0], Bf.p(-6, 2, 1), M.p(3, 4.5, 1)] }],
      fwd: [A.p(-9, 3, 1), M.p(6, 0, 1), [8, 3, 0], Bf.p(-6, -2, 1), [14, -27, 0], [8, 25, 0]] };
  }

  var MAKERS = [dock, warehouse, depot, oldtown];
  SV.MAPS = [{ name: '컨테이너 부두', info: '중형 · 야간', hint: '통로가 얽힌 야간 부두' }, { name: '물류 창고', info: '소형 · 실내', hint: '실내 근접전' }, { name: '보급기지', info: '대형 · 야외', hint: '폭파 미션 가능', bomb: true }, { name: '구시가지', info: '대형 · 2층', hint: '폭파 미션 가능 · 계단과 사다리', bomb: true }];
  SV.buildMap = function (i) { var m = MAKERS[i](); m.group = m.b.finish(); m.lights = m.b.lights; if (m.sky) m.group.add(skyDome(m.sky[0], m.sky[1])); m.boxes = m.b.boxes; m.spawns = m.b.spawns; return m; };
})();
