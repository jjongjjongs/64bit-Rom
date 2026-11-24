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
    // tarpaulin: a weave with soft folds
    canvas: function () { var a = cv(256, 256), c = a[0], x = a[1], i; x.fillStyle = '#d8d8d2'; x.fillRect(0, 0, 256, 256); for (i = 0; i < 256; i += 3) { x.fillStyle = 'rgba(40,40,36,.12)'; x.fillRect(i, 0, 1, 256); x.fillRect(0, i, 256, 1); } blot(x, 256, 256, 26, 'rgba(30,30,26,.2)', 20, 70); blot(x, 256, 256, 18, 'rgba(255,255,250,.14)', 20, 60); speck(x, 256, 256, 1500, .12); return c; },
    glass: function () { var a = cv(64, 64), c = a[0], x = a[1]; x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64); blot(x, 64, 64, 6, 'rgba(120,130,140,.25)', 10, 30); return c; },
    // tyre tread and sidewall
    rubber: function () { var a = cv(128, 128), c = a[0], x = a[1], i; x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(0,0,0,.55)'; for (i = 0; i < 128; i += 16) { x.fillRect(i, 0, 5, 128); x.fillRect(0, i + 6, 128, 3); } speck(x, 128, 128, 700, .2); return c; },
    // painted sheet metal: mostly clean, chipped at random, a little dust
    paint: function () { var a = cv(512, 512), c = a[0], x = a[1], i; x.fillStyle = '#dcdcd6'; x.fillRect(0, 0, 512, 512); blot(x, 512, 512, 30, 'rgba(60,50,40,.12)', 30, 120); speck(x, 512, 512, 2600, .2); x.fillStyle = 'rgba(70,45,30,.5)'; for (i = 0; i < 70; i++) x.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 5, 1 + Math.random() * 3); x.strokeStyle = 'rgba(20,20,20,.3)'; for (i = 0; i < 16; i++) { var px = Math.random() * 512, py = Math.random() * 512; x.beginPath(); x.moveTo(px, py); x.lineTo(px + rnd(-50, 50), py + rnd(-12, 12)); x.stroke(); } return c; },
    // surfaces named in the map pack's material list (Snow, Ice, Sand, Rock, Water, RustMetal): painted base colour, the normal
    // map is derived from it, roughness and metalness come from SURF. Swap in photographed PBR sets later by adding them to the manifest.
    snow: function () { var a = cv(256, 256), x = a[1]; x.fillStyle = '#eef2f6'; x.fillRect(0, 0, 256, 256); blot(x, 256, 256, 40, 'rgba(170,190,212,.22)', 14, 46); blot(x, 256, 256, 30, 'rgba(255,255,255,.5)', 8, 30); speck(x, 256, 256, 500, .12); return a[0]; },
    ice: function () { var a = cv(256, 256), x = a[1], i; x.fillStyle = '#b6cfde'; x.fillRect(0, 0, 256, 256); blot(x, 256, 256, 26, 'rgba(235,246,252,.5)', 16, 60); x.strokeStyle = 'rgba(255,255,255,.55)'; for (i = 0; i < 26; i++) { x.lineWidth = .6 + Math.random(); x.beginPath(); var px = Math.random() * 256, py = Math.random() * 256; x.moveTo(px, py); x.lineTo(px + rnd(-70, 70), py + rnd(-70, 70)); x.stroke(); } return a[0]; },
    sand: function () { var a = cv(256, 256), x = a[1], i, j; x.fillStyle = '#c8a878'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(120,92,58,.11)'; x.lineWidth = 1.4; for (i = -8; i < 264; i += 9) { x.beginPath(); for (j = 0; j <= 256; j += 8) x.lineTo(j, i + Math.sin(j * .07 + i * .3) * 3.2); x.stroke(); } blot(x, 256, 256, 30, 'rgba(226,200,150,.3)', 12, 40); speck(x, 256, 256, 1400, .2); return a[0]; },
    rock: function () { var a = cv(256, 256), x = a[1], i; x.fillStyle = '#8b7052'; x.fillRect(0, 0, 256, 256); blot(x, 256, 256, 46, 'rgba(60,44,30,.36)', 10, 44); blot(x, 256, 256, 36, 'rgba(190,160,120,.3)', 8, 36); x.strokeStyle = 'rgba(40,28,18,.5)'; for (i = 0; i < 16; i++) { x.lineWidth = .8 + Math.random() * 1.6; x.beginPath(); var py = Math.random() * 256; x.moveTo(0, py); x.bezierCurveTo(80, py + rnd(-18, 18), 170, py + rnd(-18, 18), 256, py + rnd(-10, 10)); x.stroke(); } speck(x, 256, 256, 1600, .25); return a[0]; },
    water: function () { var a = cv(256, 256), x = a[1], i; x.fillStyle = '#28575c'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(190,230,232,.22)'; for (i = 0; i < 60; i++) { x.lineWidth = .8 + Math.random() * 1.4; x.beginPath(); var px = Math.random() * 256, py = Math.random() * 256; x.moveTo(px, py); x.quadraticCurveTo(px + 20, py + rnd(-5, 5), px + rnd(30, 70), py + rnd(-3, 3)); x.stroke(); } return a[0]; },
    rust: function () { var a = cv(256, 256), x = a[1]; x.fillStyle = '#74452c'; x.fillRect(0, 0, 256, 256); blot(x, 256, 256, 50, 'rgba(180,96,40,.4)', 6, 30); blot(x, 256, 256, 40, 'rgba(40,24,16,.45)', 6, 26); speck(x, 256, 256, 2200, .3); return a[0]; },
    // decals: transparent pictures laid a few centimetres off a wall or floor
    d_stain: function () { var a = cv(128, 128), x = a[1]; blot(x, 128, 128, 7, 'rgba(22,20,18,.6)', 14, 42); blot(x, 128, 128, 5, 'rgba(10,10,10,.7)', 6, 18); return a[0]; },
    d_rust: function () { var a = cv(64, 256), x = a[1], i; for (i = 0; i < 9; i++) { var px = 8 + Math.random() * 48, g = x.createLinearGradient(0, 0, 0, 120 + Math.random() * 130); g.addColorStop(0, 'rgba(120,62,26,.85)'); g.addColorStop(1, 'rgba(120,62,26,0)'); x.fillStyle = g; x.fillRect(px, 0, 2 + Math.random() * 7, 256); } return a[0]; },
    d_crack: function () { var a = cv(256, 256), x = a[1], i, k; x.strokeStyle = 'rgba(20,18,16,.85)'; for (k = 0; k < 3; k++) { var px = 128, py = 128; x.lineWidth = 2.2; x.beginPath(); x.moveTo(px, py); for (i = 0; i < 14; i++) { px += rnd(-22, 22) + (k - 1) * 9; py += rnd(-20, 20) + (k % 2 ? 7 : -7); x.lineTo(px, py); if (i === 7) x.lineWidth = 1.2; } x.stroke(); } return a[0]; },
    d_holes: function () { var a = cv(128, 128), x = a[1], i; for (i = 0; i < 7; i++) { var px = 16 + Math.random() * 96, py = 16 + Math.random() * 96, r = 2.5 + Math.random() * 3; x.fillStyle = 'rgba(210,205,195,.75)'; x.beginPath(); x.arc(px, py, r * 2.1, 0, 6.2832); x.fill(); x.fillStyle = 'rgba(12,12,12,.95)'; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill(); } return a[0]; },
    d_tracks: function () { var a = cv(128, 256), x = a[1], i; [22, 106].forEach(function (cx) { x.fillStyle = 'rgba(30,30,32,.42)'; x.fillRect(cx - 13, 0, 26, 256); x.fillStyle = 'rgba(15,15,16,.5)'; for (i = 0; i < 256; i += 10) { x.fillRect(cx - 13, i, 11, 5); x.fillRect(cx + 2, i + 5, 11, 5); } }); return a[0]; },
    d_drift: function () { var a = cv(128, 128), x = a[1], g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(206,178,128,.95)'); g.addColorStop(.6, 'rgba(206,178,128,.6)'); g.addColorStop(1, 'rgba(206,178,128,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return a[0]; },
    d_foot: function () { var a = cv(128, 256), x = a[1], i; x.fillStyle = 'rgba(120,140,165,.55)'; for (i = 0; i < 6; i++) { x.beginPath(); x.ellipse(i % 2 ? 84 : 44, 22 + i * 40, 11, 19, 0, 0, 6.2832); x.fill(); } return a[0]; },
    hazard: function () { var a = cv(128, 128), c = a[0], x = a[1], i; x.fillStyle = '#d6a233'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#1b1b1b'; for (i = -4; i < 8; i++) { x.beginPath(); x.moveTo(i * 32, 128); x.lineTo(i * 32 + 16, 128); x.lineTo(i * 32 + 144, 0); x.lineTo(i * 32 + 128, 0); x.fill(); } speck(x, 128, 128, 500, .2); return c; },
    chain: function () { var a = cv(64, 64), c = a[0], x = a[1]; x.strokeStyle = '#aab3b8'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 32); x.lineTo(32, 0); x.lineTo(64, 32); x.lineTo(32, 64); x.closePath(); x.stroke(); return c; },
    pool: function () { var a = cv(128, 128), c = a[0], x = a[1], g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,214,150,.55)'); g.addColorStop(.5, 'rgba(255,200,130,.2)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c; },
    puddle: function () {
      var a = cv(128, 128), c = a[0], x = a[1], i; x.fillStyle = 'rgba(8,14,18,.62)'; x.beginPath(); for (i = 0; i <= 24; i++) { var t = i / 24 * 2 * PI, r = 46 + Math.sin(t * 3) * 8 + Math.cos(t * 5) * 5; if (i) x.lineTo(64 + Math.cos(t) * r, 64 + Math.sin(t) * r * .7); else x.moveTo(64 + r, 64); } x.fill();
      x.fillStyle = 'rgba(190,210,225,.2)'; x.beginPath(); x.ellipse(52, 56, 26, 6, -.3, 0, 7); x.fill(); return c;
    }
  };
  var texCache = {}, WHITE = new T.Color(1, 1, 1);
  // real-world size of one repeat of each photographed texture, and how much of the painted-in tint to keep on it
  var PHT = { plaster: [2.5, 2.5], roof: [1.6, 1.6], conc: [3, 3], floor: [3, 3], block: [2.4, 2.4], corr: [2, 2], panel: [2, 2], metal: [2, 2], paint: [2, 2], canvas: [1, 1], crate: [1, 1] }, KEEP = { plaster: .45, roof: .75, conc: .5, floor: .5, block: .3, corr: .9, panel: .75, metal: .7, paint: .92, crate: .8 }, GAIN = { block: 1.9, conc: 1.2, floor: 1.15, crate: .95, corr: 1.3, panel: 1.3, metal: 1.2, paint: 1.3 };
  // scans whose own colours are wrong for where they are used are tinted: the cement sacks become plain burlap
  var TINT = { cement_bag: 0x9a8a68 };
  function photo(key) { var a = key !== 'canvas' && SV.assets && SV.assets.tex[key]; return a && a.diff ? a : null; }
  function tex(key, make) {
    if (texCache[key]) return texCache[key];
    if (!make && photo(key)) return texCache[key] = photo(key).diff;
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
  var SURF = { snow: [.9, 0, 2], ice: [.15, 0, 1], sand: [.95, 0, 3], rock: [.9, 0, 6], water: [.08, .1, 1], rust: [.85, .15, 4], canvas: [.95, 0, 4], glass: [.07, .9, 0], rubber: [.9, 0, 3], paint: [.5, .35, 2], conc: [.86, 0, 3], floor: [.42, 0, 2], corr: [.5, .55, 5], panel: [.48, .5, 4], block: [.92, 0, 5], metal: [.42, .7, 3], crate: [.8, 0, 4], plain: [.78, .05, 0] };
  function label(text, fg, bg, w, h) {
    return function () { var a = cv(w || 256, h || 128), c = a[0], x = a[1]; if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); } x.fillStyle = fg; x.font = '900 ' + Math.round(c.height * .62) + 'px "Big Shoulders Display","Arial Narrow",sans-serif-condensed,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, c.width / 2, c.height / 2 + 4, c.width - 16); if (bg) speck(x, c.width, c.height, 500, .15); return c; };
  }
  var TS = { canvas: [1.4, 1.4], glass: [2, 2], snow: [7, 7], ice: [4, 4], sand: [3, 3], rock: [6, 6], water: [9, 9], rust: [2, 2], rubber: [.5, .5], paint: [2.5, 2.5], conc: [4, 4], floor: [5, 5], corr: [1.2, 2.5], panel: [3, 3], block: [1.6, 1.6], metal: [2, 2], plain: [1, 1], hazard: [1, 1] };

  function Builder() {
    var L = {}, Q = {}, col = new T.Color();
    function lay(store, k) { return store[k] || (store[k] = { P: [], N: [], C: [], U: [] }); }
    // append a transformed geometry to a layer. World-space UVs by default, the geometry's own UVs when opt.fit.
    function push(geo, c, t, opt, store) {
      opt = opt || {}; var g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position.array, n = g.attributes.normal.array, uv = g.attributes.uv ? g.attributes.uv.array : null, l = lay(store || L, !store && b.tier ? t + '@' + b.tier + '@' + Math.floor(p[0] / 24) + '_' + Math.floor(p[2] / 24) : t), ph = !store && photo(t), ts = (ph && PHT[t]) || TS[t] || TS.plain;
      var k = opt.flat ? 1 : .9 + Math.random() * .2, y0 = opt.y0 == null ? 1e9 : opt.y0, rep = opt.rep || [1, 1], i; col.setHex(c).convertSRGBToLinear(); if (ph) col.lerp(WHITE, 1 - (KEEP[t] || .6)).multiplyScalar(GAIN[t] || 1.15);
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
    // What you can see, you can bump into and hit: pieces drawn without their own collision still get one, unless they are
    // paint on the floor, a kerb you step over, or too thin to matter. `b.ghost` switches this off for scenery out of reach.
    function real(w, d, h, y0) { return !b.ghost && (h >= .25 || (y0 > .5 && h >= .06)) && Math.max(w, d, h) >= .2 && Math.min(w, d) >= .04; }   // off the ground even a thin beam or sheet counts
    var b = {
      boxes: [], spawns: { A: [], B: [] }, lights: [], day: false, inst: {}, tier: 0, ghost: false,   // tier 1: small clutter and decals, tier 2: medium props; both are hidden with distance (see map.lod)
      has: function (id) { return !!(SV.assets && SV.assets.model[id]); },
      // one copy of a scanned model: position, turn about the vertical, scale (number or [x, y, z]), and an optional tilt to lay it down
      model: function (id, x, y, z, ry, s, rx) {
        if (!b.has(id)) return false; var m = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, 0, 'YXZ')), sc = s == null ? [1, 1, 1] : s.length ? s : [s, s, s];
        m.compose(new T.Vector3(x, y, z), q, new T.Vector3(sc[0], sc[1], sc[2])); (b.inst[id] = b.inst[id] || []).push(m); return true;
      },
      // a scanned prop standing on the ground with a collision box taken from its own size
      prop: function (id, x, z, ry, s, y, soft) {
        if (!b.model(id, x, y || 0, z, ry, s)) return false; var bx = SV.assets.box[id], k = s == null ? 1 : s, cx = (bx.min.x + bx.max.x) / 2 * k, cz = (bx.min.z + bx.max.z) / 2 * k, c = Math.cos(ry || 0), sn = Math.sin(ry || 0);
        b.rsolid(x + cx * c + cz * sn, z - cx * sn + cz * c, (bx.max.x - bx.min.x) * k, (bx.max.z - bx.min.z) * k, (bx.max.y - bx.min.y) * k, y || 0, ry || 0, soft); return true;
      },
      // a lamp that really lights its surroundings; the game keeps the nearest few switched on
      light: function (x, y, z, c, i, d) { if (!b.day) b.lights.push({ x: x, y: y, z: z, c: new T.Color(c).convertSRGBToLinear(), i: i, d: d }); },
      box: function (x, z, w, d, h, c, y0, solid, t, fit) { y0 = y0 || 0; var g = new T.BoxGeometry(w, h, d); g.translate(x, y0 + h / 2, z); push(g, c, t || 'plain', { y0: y0 < .05 ? y0 : null, fit: fit }); if (solid !== false || real(w, d, h, y0)) coll(x, z, w, d, h, y0); },
      cyl: function (x, z, r, h, c, y0, solid, t, r2, seg) { y0 = y0 || 0; var g = new T.CylinderGeometry(r2 == null ? r : r2, r, h, seg || 12); g.translate(x, y0 + h / 2, z); push(g, c, t || 'plain', { y0: y0 < .05 ? y0 : null }); if (solid !== false || (!b.ghost && h >= .3 && r >= .05)) coll(x, z, Math.max(r, r2 == null ? r : r2) * 1.7, Math.max(r, r2 == null ? r : r2) * 1.7, h, y0); },
      geo: function (g, c, t, opt) {   // free-form pieces (pitched roofs, rocks, tree crowns): their bounding box stands in
        if (!b.ghost && !(opt && opt.pass)) { g.computeBoundingBox(); var q = g.boundingBox, gw = q.max.x - q.min.x, gd = q.max.z - q.min.z, gh = q.max.y - q.min.y; if (gh >= .3 && gw < 16 && gd < 16 && q.min.y > -.2) coll((q.min.x + q.max.x) / 2, (q.min.z + q.max.z) / 2, gw * .85, gd * .85, gh, q.min.y); }
        push(g, c, t || 'plain', opt); },
      // a box turned about the vertical axis. Its collision record keeps the box in its own frame (ox, oz, cos, sin).
      rbox: function (x, z, w, d, h, c, y0, ang, solid, t, soft) {
        y0 = y0 || 0; var g = new T.BoxGeometry(w, h, d); g.rotateY(ang); g.translate(x, y0 + h / 2, z); push(g, c, t || 'plain', { y0: y0 < .05 ? y0 : null });
        if (solid !== false || real(w, d, h, y0)) b.rsolid(x, z, w, d, h, y0, ang, soft);
      },
      rsolid: function (x, z, w, d, h, y0, ang, soft) { var q = { minx: -w / 2, maxx: w / 2, miny: y0 || 0, maxy: (y0 || 0) + h, minz: -d / 2, maxz: d / 2, rot: true, ox: x, oz: z, c: Math.cos(ang), s: Math.sin(ang) }; if (soft) q.soft = true; b.boxes.push(q); },
      solid: function (x, z, w, d, h, y0, soft) { coll(x, z, w, d, h, y0 || 0); if (soft) b.boxes[b.boxes.length - 1].soft = true; },   // soft: stops people, not bullets
      seg: function (x0, y0, z0, x1, y1, z1, w, c, t) {              // a beam between two points
        var a = new T.Vector3(x0, y0, z0), e = new T.Vector3(x1, y1, z1), dir = e.clone().sub(a), len = dir.length(), g = new T.BoxGeometry(w, len, w), m = new T.Matrix4();
        if (!b.ghost && w >= .05 && len >= .3) { var hl = Math.hypot(x1 - x0, z1 - z0), ylo = Math.min(y0, y1) - w / 2, yh = Math.abs(y1 - y0) + w; if (hl < .05) coll(x0, z0, w, w, yh, ylo); else b.rsolid((x0 + x1) / 2, (z0 + z1) / 2, hl + w, w, yh, ylo, -Math.atan2(z1 - z0, x1 - x0)); }   // beams, rails, pipes: a slab under the run
        m.compose(a.add(e).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize()), new T.Vector3(1, 1, 1)); g.applyMatrix4(m); push(g, c, t || 'metal');
      },
      glow: function (x, y, z, w, h, d, c) { var g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); push(g, c, 'glow', { flat: true }); },
      // a textured rectangle: upright (ry = facing angle) or lying on the ground (flat)
      quad: function (key, x, y, z, w, h, ry, o) {
        o = o || {}; var g = new T.PlaneGeometry(w, h); if (o.flat) g.rotateX(-PI / 2); g.rotateY(ry || 0); g.translate(x, y, z);
        var qk = b.tier ? key + '@' + b.tier + '@' + Math.floor(x / 24) + '_' + Math.floor(z / 24) : key;
        if (!Q[qk]) Q[qk] = { P: [], N: [], C: [], U: [], mode: o.mode || 'opaque', tex: tex(key, o.make) };
        push(g, o.color == null ? 0xffffff : o.color, qk, { fit: true, flat: true, rep: o.rep }, Q);
      },
      cont: function (x, z, rot, c, level, len, deco) {
        len = len || 6.1; var y = (level || 0) * 2.5, w = rot ? 2.5 : len, d = rot ? len : 2.5, sx, sz;
        b.box(x, z, w, d, 2.5, c, y, true, 'corr'); var gh = b.ghost; b.ghost = true;
        for (sx = -1; sx <= 1; sx += 2) for (sz = -1; sz <= 1; sz += 2) b.box(x + sx * (w / 2 - .06), z + sz * (d / 2 - .06), .16, .16, 2.52, 0x33383c, y - .01, false, 'metal');
        b.ghost = gh; if (deco === false) return;
        if (rot) b.quad('door', x, y + 1.25, z + len / 2 + .015, 2.4, 2.4, 0, { color: c }); else b.quad('door', x + len / 2 + .015, y + 1.25, z, 2.4, 2.4, PI / 2, { color: c });
      },
      mark: function (text, x, y, z, w, h, ry, fg, flat) { b.quad('m:' + text + fg, x, y, z, w, h, ry, { mode: 'alpha', make: label(text, fg || '#ecebe4'), flat: flat }); },
      crate: function (x, z, s, c, y0, h) {
        h = h || s; y0 = y0 || 0; b.box(x, z, s, s, h, c || C.wood, y0, !(y0 > .5), 'crate', true);
        var t = Math.min(.09, s * .07), e = s / 2 + .012, q = 0x5c4526, i, j, gh = b.ghost; b.ghost = true;   // the battens sit on the crate's own box: no records of their own   // battens proud of the faces: four uprights, top and bottom frames
        for (i = -1; i <= 1; i += 2) for (j = -1; j <= 1; j += 2) b.box(x + i * (e - t / 2), z + j * (e - t / 2), t, t, h + .02, q, y0 - .01, false, 'crate');
        [y0 + t / 2, y0 + h - t / 2].forEach(function (y) { for (i = -1; i <= 1; i += 2) { b.box(x + i * (e - t / 2), z, t, s, t, q, y - t / 2, false, 'crate'); b.box(x, z + i * (e - t / 2), s, t, t, q, y - t / 2, false, 'crate'); } });
        b.ghost = gh;
      },
      barrel: function (x, z, c, y0) { y0 = y0 || 0; var id = c === C.red ? 'Barrel_01' : 'barrel_03'; if (b.model(id, x, y0, z, Math.random() * 6.28, id === 'barrel_03' ? .94 : 1)) { if (y0 < .5) coll(x, z, .58, .58, .88, y0); return; } b.cyl(x, z, .29, .88, c, y0, y0 < .5, 'metal', .29, 14); b.cyl(x, z, .305, .04, 0x2a2e31, y0 + .28, false, 'plain', .305, 14); b.cyl(x, z, .305, .04, 0x2a2e31, y0 + .58, false, 'plain', .305, 14); b.cyl(x, z, .25, .02, 0x1c1f22, y0 + .875, false, 'plain', .25, 14); },
      tires: function (x, z, n) { if (b.has('old_tyre')) { for (var j = 0; j < n; j++) b.model('old_tyre', x + rnd(-.04, .04), .11 + j * .215, z + rnd(-.04, .04), Math.random() * 6.28, 1.35, PI / 2); coll(x, z, .8, .8, n * .215, 0); return; } for (var i = 0; i < n; i++) { var g = new T.TorusGeometry(.3, .13, 6, 14); g.rotateX(PI / 2); g.translate(x + rnd(-.03, .03), .13 + i * .25, z + rnd(-.03, .03)); push(g, 0x17191b, 'plain', {}); } coll(x, z, .8, .8, n * .25, 0); },
      cone: function (x, z) { var g = new T.CylinderGeometry(.03, .16, .5, 10); g.translate(x, .27, z); push(g, C.orange, 'plain', {}); g = new T.CylinderGeometry(.075, .11, .12, 10); g.translate(x, .3, z); push(g, 0xf0efe8, 'plain', { flat: true }); b.box(x, z, .36, .36, .03, C.orange, 0, false); },
      pallet: function (x, z, y0, rot) { y0 = y0 || 0; var w = rot ? 1 : 1.2, d = rot ? 1.2 : 1, i; b.box(x, z, w, d, .03, C.wood, y0 + .11, false, 'crate', true); for (i = -1; i <= 1; i++) { if (rot) b.box(x, z + i * .5, 1, .1, .11, 0x8a6a3c, y0, false); else b.box(x + i * .5, z, .1, 1, .11, 0x8a6a3c, y0, false); } },
      jersey: function (x, z, len, rot) {                                // concrete road barrier with a sloped profile
        if (b.has('concrete_road_barrier')) { var nb = Math.max(1, Math.round(len / 1.5)), pl = len / nb, kk; for (kk = 0; kk < nb; kk++) { var o = -len / 2 + pl * (kk + .5); b.model('concrete_road_barrier', x + (rot ? 0 : o), 0, z + (rot ? o : 0), (rot ? PI / 2 : 0) + (kk % 2 ? PI : 0), [pl / 1.55, 1.22, 1]); } coll(x, z, rot ? .6 : len, rot ? len : .6, 1.0, 0); return; }
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
        function lodTag(m, key) { var q = key.split('@'); if (q.length > 1) { m.geometry.computeBoundingSphere(); m.userData.lod = +q[1]; m.userData.at = m.geometry.boundingSphere.center.clone(); } }
        for (var kk in L) {
          k = kk.split('@')[0]; var sf = SURF[k] || SURF.plain, mat = k === 'glow' ? new T.MeshBasicMaterial({ vertexColors: true, fog: false, color: new T.Color(3, 3, 3) })   // brighter than white: this is what blooms
            : photo(k) ? new T.MeshStandardMaterial({ vertexColors: true, map: tex(k), normalMap: photo(k).nor || null, roughnessMap: photo(k).arm || null, metalnessMap: photo(k).arm || null, roughness: photo(k).arm ? 1 : sf[0], metalness: photo(k).arm ? 1 : sf[1], side: T.DoubleSide })
            : new T.MeshStandardMaterial({ vertexColors: true, map: k === 'plain' ? null : tex(k), normalMap: sf[2] ? nrm(k, sf[2]) : null, roughness: sf[0], metalness: sf[1], side: T.DoubleSide });
          mat.userData.surf = k;
          var m = new T.Mesh(geo(L[kk]), mat); if (k !== 'glow') { m.castShadow = kk === k; m.receiveShadow = true; } lodTag(m, kk); grp.add(m);
        }
        for (k in b.inst) (function (list, src, k) {
          src.traverse(function (o) { if (!o.isMesh) return; var mt = o.material; if (TINT[k]) { mt = o.userData.tinted || (o.userData.tinted = o.material.clone()); mt.color.setHex(TINT[k]); } var im = new T.InstancedMesh(o.geometry, mt, list.length), m = new T.Matrix4(); list.forEach(function (w, i) { im.setMatrixAt(i, m.multiplyMatrices(w, o.matrixWorld)); }); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; im.userData.shared = true; grp.add(im); });
        })(b.inst[k], SV.assets.model[k], k);
        for (k in Q) {
          var q = Q[k], qm = q.mode === 'add' ? new T.MeshBasicMaterial({ map: q.tex, blending: T.AdditiveBlending, transparent: true, depthWrite: false, vertexColors: true })
            : q.mode === 'alpha' ? new T.MeshStandardMaterial({ map: q.tex, vertexColors: true, transparent: true, alphaTest: .25, side: T.DoubleSide, roughness: .7, metalness: .1 })
            : q.mode === 'lit' ? new T.MeshBasicMaterial({ map: q.tex, vertexColors: true, fog: false }) : new T.MeshStandardMaterial({ map: q.tex, vertexColors: true, roughness: .6, metalness: .2 });
          var qq = new T.Mesh(geo(q), qm); qq.receiveShadow = q.mode !== 'add' && q.mode !== 'lit'; qq.renderOrder = q.mode === 'add' ? 2 : 1; lodTag(qq, k); grp.add(qq);
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
    return { name: '컨테이너 부두', b: b, bounds: { minx: -36, maxx: 36, minz: -24, maxz: 20 }, bg: 0x1b2832, fog: [22, 120], hemi: [0x9fb6c8, 0x2e2a24, .78], sun: [0xbcd0ea, .62, [34, 58, 22]], rain: true, sky: [0x05080c, 0x1b2832], hdri: ['night', .05, .08, 2, .6] };
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
      b.box(i, 0, .2, 25.4, .22, 0x4f585e, h - .25, false, 'metal'); b.box(i, 1.2, .2, 23, .22, 0x4f585e, h - 1.5, false, 'metal');   /* the lower chord stops short of the catwalk so you can walk under the roof there */
      for (k = -9; k < 12; k += 3) { b.seg(i, h - 1.4, k, i, h - .2, k + 1.5, .1, 0x4f585e); b.seg(i, h - .2, k + 1.5, i, h - 1.4, k + 3, .1, 0x4f585e); } }
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
    // scanned fittings in the spawn rooms: steel shelving, a desk, tool chests, gas bottles
    [['steel_frame_shelves_01', -18.42, -10.6, PI / 2, .1], ['steel_frame_shelves_01', -18.42, 10.6, PI / 2, .1], ['steel_frame_shelves_01', 18.42, 10.6, -PI / 2, .1], ['steel_frame_shelves_01', 18.42, -10.6, -PI / 2, .1],
      ['metal_office_desk', -18.1, 7, PI / 2, 1], ['metal_office_desk', 18.1, -7, -PI / 2, 1], ['metal_tool_chest', -17.9, -8.6, PI / 2, 1], ['metal_tool_chest', 17.9, 8.6, -PI / 2, 1], ['propane_tank', -14.2, 11.9, .4, 1], ['propane_tank', 14.2, -11.9, 2, 1]
    ].forEach(function (q) { b.prop(q[0], q[1], q[2], q[3], q[4]); });
    b.spawn('A', -16.3, 0); b.spawn('B', 16.3, 0);
    return { name: '물류 창고', b: b, bounds: { minx: -19, maxx: 19, minz: -13, maxz: 13 }, bg: 0x101315, fog: [28, 90], hemi: [0xc9d2d8, 0x4a4338, .88], sun: [0xfff1dc, .32, [9, 30, 7]], rain: false, indoor: true, hdri: ['indoor', .3, .3, 4, .6] };
  }

  // Free-form parts for a frame: boxes at any tilt, cylinders along any axis, lathed and extruded shapes. None of these collide;
  // a prop adds its own collision volume with f.solid.
  function extend(f, b, cx, cz, ang, fr) {
    f.b = b;
    function put(g, col, tex) { g.rotateY(ang); g.translate(cx, 0, cz); b.geo(g, col, tex || 'plain', {}); }
    f.g = put; f.ang = ang; f.cx = cx; f.cz = cz;
    f.bx = function (lx, y, lz, w, h, d, col, tex, rx, ry, rz) { var g = new T.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(lx, y, lz); put(g, col, tex); };
    f.cyl = function (lx, y, lz, r, len, axis, col, tex, seg, r2) { var g = new T.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 12); if (axis === 'x') g.rotateZ(-PI / 2); else if (axis === 'z') g.rotateX(PI / 2); g.translate(lx, y, lz); put(g, col, tex); };
    // [[distance along the axis, radius], ...]
    f.lathe = function (prof, axis, lx, y, lz, col, tex, seg) { var g = new T.LatheGeometry(prof.map(function (p) { return new T.Vector2(p[1], p[0]); }), seg || 16); if (axis === 'x') g.rotateZ(-PI / 2); else if (axis === 'z') g.rotateX(PI / 2); g.translate(lx, y, lz); put(g, col, tex); };
    f.sph = function (lx, y, lz, r, col, tex, sx, sy, sz) { var g = new T.SphereGeometry(r, 12, 9); g.scale(sx || 1, sy || 1, sz || 1); g.translate(lx, y, lz); put(g, col, tex); };
    // side profile (x along the frame, y up) pushed from z0 to z1; exX: front profile (z, y) pushed from x0 to x1
    f.ex = function (pts, z0, z1, col, tex, bv, holes) { put(SV.exg(pts, z0, z1, bv || 0, holes), col, tex); };
    f.exX = function (pts, x0, x1, col, tex, bv, holes) { var g = SV.exg(pts, 0, x1 - x0, bv || 0, holes); g.rotateY(PI / 2); g.translate(x0, 0, 0); put(g, col, tex); };
    f.sub = function (lx, lz, da) { var q = f.p(lx, lz); return fr(q[0], q[1], ang + (da || 0)); };
    f.solid = function (lx, lz, w, d, h, y0, soft) { var q = f.p(lx, lz); b.rsolid(q[0], q[1], w, d, h, y0 || 0, ang, soft); };
  }

  // ---------- props ----------
  // Each takes a frame placed at the prop's origin (x = its length, z = its width) and builds the object piece by piece.
  var PR = {
    wheel: function (f, x, z, r, w, hub) {
      f.lathe([[-w / 2, r * .58], [-w / 2, r * .88], [-w * .34, r], [w * .34, r], [w / 2, r * .88], [w / 2, r * .58]], 'z', x, r, z, 0x1b1d1f, 'rubber', 18);
      f.lathe([[-w * .42, r * .58], [-w * .3, r * .6], [-w * .1, r * .3], [w * .1, r * .3], [w * .3, r * .6], [w * .42, r * .58]], 'z', x, r, z, hub || 0x4a5238, 'paint', 14);
      var s = z > 0 ? 1 : -1; f.cyl(x, r, z + s * w * .14, r * .17, .08, 'z', 0x2a2e31, 'metal', 10); for (var i = 0; i < 6; i++) f.cyl(x + Math.cos(i * 1.047) * r * .26, r + Math.sin(i * 1.047) * r * .26, z + s * w * .13, .022, .05, 'z', 0x8d9296, 'metal', 6);
    },
    // 6x6 cargo truck, 7 m long
    truck: function (f, col) {
      col = col || 0x4d5a3a; var dk = 0x24282b, wd = 0x6a5636, i;
      [-.42, .42].forEach(function (z) { f.bx(-.1, .74, z, 6.5, .18, .1, dk, 'metal'); }); [-2.9, -.2, 1.4].forEach(function (x) { f.bx(x, .74, 0, .1, .14, .9, dk, 'metal'); });
      [2.3, -1.3, -2.5].forEach(function (x) { f.cyl(x, .52, 0, .075, 2.2, 'z', dk, 'metal', 8); f.sph(x, .52, 0, .2, dk, 'metal', 1, 1, 1.2); [-1, 1].forEach(function (s) { PR.wheel(f, x, s * 1.06, .52, .36, col); f.bx(x, .7, s * .62, .9, .05, .09, dk, 'metal'); }); });
      f.cyl(-.6, .56, 0, .05, 3.6, 'x', dk, 'metal', 8);                                                                                 // drive shaft
      f.ex([[1.25, .94], [3.28, .94], [3.4, 1.02], [3.4, 1.5], [3.3, 1.64], [2.52, 1.74], [2.28, 2.5], [2.14, 2.6], [1.32, 2.6], [1.25, 2.52]], -1.12, 1.12, col, 'paint', .05);   // cab
      f.bx(2.41, 2.13, 0, .03, .74, 1.96, 0x0d1418, 'glass', 0, 0, .29); f.bx(2.44, 2.13, 0, .05, .8, .05, col, 'paint', 0, 0, .29);                          // windshield, centre post
      [-1, 1].forEach(function (s) {
        f.bx(1.8, 2.13, s * 1.165, .76, .56, .02, 0x0d1418, 'glass'); f.bx(1.8, 1.82, s * 1.17, .86, .04, .03, dk); f.bx(1.33, 1.75, s * 1.172, .02, 1.5, .012, dk); f.bx(2.2, 1.5, s * 1.172, .02, 1, .012, dk); f.bx(1.5, 1.66, s * 1.19, .13, .035, .04, dk, 'metal');   // side glass, door seams, handle
        f.bx(2.52, 2.3, s * 1.42, .05, .34, .2, dk); f.bx(2.52, 2.3, s * 1.27, .035, .035, .3, dk, 'metal'); f.bx(1.8, .76, s * 1.16, .7, .05, .3, dk, 'metal'); f.bx(1.8, .5, s * 1.2, .5, .04, .22, dk, 'metal');                          // mirror, steps
        f.exX([[s * 1.0, .5], [s * 1.0, 1.02], [s * 1.28, 1.02], [s * 1.28, .5]].sort(function () { return 0; }), 1.72, 2.88, col, 'paint', .02); f.bx(2.3, 1.07, s * 1.16, 1.3, .06, .36, col, 'paint');                                                        // front mudguard
        f.cyl(3.41, 1.3, s * .82, .115, .07, 'x', 0xe6e2d0, 'glass', 14); f.cyl(3.4, 1.3, s * .82, .135, .05, 'x', dk, 'metal', 14); f.cyl(3.41, 1.08, s * .86, .05, .05, 'x', 0xd9892a, 'plain', 8);                                                            // headlight, bezel, indicator
        f.bx(-3.2, .52, s * 1.06, .03, .52, .4, 0x111315, 'rubber'); f.bx(-3.5, 1.02, s * 1.0, .05, .12, .22, 0xb02a20); f.bx(3.56, .62, s * .7, .1, .1, .06, dk, 'metal');                                                                                       // mud flap, tail light, tow hook
      });
      for (i = 0; i < 7; i++) f.bx(3.415, 1.08 + i * .065, 0, .02, .03, 1.16, dk, 'metal'); f.bx(3.41, 1.27, 0, .02, .5, 1.24, 0x15181a);                         // grille
      f.bx(3.52, .84, 0, .14, .2, 2.44, dk, 'metal'); f.bx(3.3, 1.76, 0, .5, .03, 1.5, col, 'paint', 0, 0, -.12); f.cyl(1.75, 2.62, 0, .3, .05, 'y', dk, 'metal', 14);   // bumper, hood ridge, roof hatch
      f.cyl(.62, .8, -.92, .25, .9, 'x', dk, 'paint', 14); f.bx(.62, .8, -.92, .05, .56, .56, 0x8d9296, 'metal'); f.cyl(.4, 1.4, .95, .07, 1.5, 'y', dk, 'metal', 8); f.cyl(.4, 2.2, .95, .1, .3, 'y', 0x3a3a36, 'metal', 8);   // fuel tank, strap, exhaust
      f.bx(-1.12, 1.01, 0, 4.66, .1, 2.42, dk, 'metal');                                                                                                     // bed floor
      [-1, 1].forEach(function (s) { f.bx(-1.12, 1.34, s * 1.19, 4.62, .56, .05, wd, 'crate'); for (i = 0; i < 6; i++) f.bx(-3.3 + i * .87, 1.34, s * 1.23, .07, .62, .035, dk, 'metal'); });
      f.bx(1.17, 1.6, 0, .05, 1.1, 2.4, wd, 'crate'); f.bx(-3.42, 1.34, 0, .05, .56, 2.4, wd, 'crate'); f.bx(-3.46, 1.36, 0, .02, .1, 2.2, dk, 'metal');
      f.exX([[-1.2, 1.56], [-1.2, 2.5], [-.86, 2.84], [0, 2.96], [.86, 2.84], [1.2, 2.5], [1.2, 1.56]], -3.4, 1.14, 0x3f4a30, 'canvas', .03);                       // tarpaulin over bows
      for (i = 0; i < 5; i++) [-1, 1].forEach(function (s) { f.bx(-3.1 + i * 1, 2.05, s * 1.235, .05, 1, .02, 0x2c3422, 'canvas'); f.bx(-3.1 + i * 1, 1.5, s * 1.245, .03, .14, .02, 0x8a7a50); });
      f.bx(-3.43, 2.25, 0, .02, 1.3, 2.1, 0x10130c); f.bx(-3.44, 1.75, .5, .03, .5, .9, 0x3f4a30, 'canvas', 0, 0, .1);                                                // open rear, rolled flap
      f.solid(.05, 0, 7, 2.5, 2.9);
    },
    // steel bunk bed, 2 x 0.95 m
    bunk: function (f) {
      var st = 0x4a5258, i; [[-.97, -.45], [.97, -.45], [-.97, .45], [.97, .45]].forEach(function (q) { f.cyl(q[0], .9, q[1], .022, 1.8, 'y', st, 'metal', 8); f.sph(q[0], 1.8, q[1], .03, st, 'metal'); });
      [.38, 1.28].forEach(function (y, n) {
        [-.45, .45].forEach(function (z) { f.cyl(0, y, z, .018, 1.94, 'x', st, 'metal', 8); }); [-.97, .97].forEach(function (x) { f.cyl(x, y, 0, .018, .9, 'z', st, 'metal', 8); f.cyl(x, y + .28, 0, .016, .9, 'z', st, 'metal', 8); });
        for (i = 0; i < 7; i++) f.bx(-.8 + i * .27, y - .01, 0, .03, .01, .9, st, 'metal');                                                          // slats
        f.ex([[-.94, y + .02], [.94, y + .02], [.94, y + .13], [-.94, y + .13]], -.42, .42, 0xc9c6b8, 'canvas', .025);                                  // mattress
        f.ex([[-.5, y + .135], [.92, y + .135], [.92, y + .17], [-.5, y + .17]], -.43, .43, n ? 0x4f5a3c : 0x5a5f48, 'canvas', .012);                    // blanket
        f.sph(-.72, y + .19, 0, .16, 0xdedbd0, 'canvas', 1, .38, 1.5);                                                                              // pillow
      });
      for (i = 0; i < 4; i++) f.cyl(.99, .3 + i * .3, .28, .013, .32, 'z', st, 'metal', 6); f.cyl(.99, .9, .12, .016, 1.3, 'y', st, 'metal', 6);       // ladder
      f.solid(0, 0, 2, .95, 1.7);
    },
    // steel locker
    locker: function (f, col) {
      col = col || 0x66705a; f.ex([[-.45, 0], [.45, 0], [.45, 1.8], [-.45, 1.8]], -.25, .25, col, 'paint', .012);
      [-.225, .225].forEach(function (x) { f.bx(x, .92, .256, .42, 1.7, .012, col, 'paint'); for (var i = 0; i < 4; i++) f.bx(x, 1.5 + i * .04, .264, .22, .012, .006, 0x1c1f22); f.bx(x + .14, .95, .268, .02, .1, .02, 0x9aa0a4, 'metal'); });
      f.solid(0, 0, .9, .5, 1.8);
    },
    // horizontal fuel tank on saddles, 5.2 m
    tank: function (f) {
      var i; f.lathe([[-2.6, 0], [-2.58, .45], [-2.42, .86], [-2.15, 1.08], [-1.9, 1.15], [1.9, 1.15], [2.15, 1.08], [2.42, .86], [2.58, .45], [2.6, 0]], 'x', 0, 1.72, 0, 0xc4c8c0, 'paint', 22);
      [-2, -.7, .7, 2].forEach(function (x) { f.lathe([[-.03, 1.15], [-.03, 1.17], [.03, 1.17], [.03, 1.15]], 'x', x, 1.72, 0, 0x9aa0a4, 'metal', 22); });                          // weld bands
      [-1.5, 1.5].forEach(function (x) { f.exX([[-1.05, 0], [1.05, 0], [1.05, .5], [.9, .95], [.55, .72], [0, .6], [-.55, .72], [-.9, .95], [-1.05, .5]], x - .22, x + .22, 0x9a9c97, 'conc', .02); });   // saddles
      f.lathe([[-.06, 1.2], [-.06, 1.22], [.06, 1.22], [.06, 1.2]], 'x', 0, 1.72, 0, 0xb02a20, 'paint', 22);                                                                    // red band
      f.cyl(.6, 2.95, 0, .28, .16, 'y', 0x8d9296, 'metal', 14); f.cyl(.6, 3.05, 0, .32, .04, 'y', 0x6b767e, 'metal', 14); f.cyl(-1.2, 2.98, 0, .05, .3, 'y', 0x8d9296, 'metal', 8); f.cyl(-1.2, 3.12, 0, .1, .03, 'x', 0xb02a20, 'metal', 10);   // manway, vent valve
      f.cyl(2.75, .9, .4, .06, 1.8, 'y', 0x8d9296, 'metal', 8); f.cyl(2.75, 1.0, .4, .12, .06, 'x', 0xb02a20, 'metal', 10); f.cyl(2.62, 1.72, .4, .06, .3, 'x', 0x8d9296, 'metal', 8);                                  // outlet pipe and valve
      [-.2, .2].forEach(function (z) { f.cyl(-2.3, 1.5, z + 1.0, .02, 3, 'y', 0x596268, 'metal', 6); }); for (i = 0; i < 9; i++) f.cyl(-2.3, .3 + i * .32, 1.0, .015, .4, 'z', 0x596268, 'metal', 6);                       // ladder
      f.bx(0, 1.72, 1.16, .6, .6, .01, 0xd6a233, 'plain', 0, 0, .785); f.bx(0, 1.72, 1.166, .34, .06, .01, 0x1c1c1c);                                                                 // hazard diamond
      f.solid(0, 0, 5.2, 2.3, 2.9);
    },
    // a wall of sandbags, chest high
    bags: function (f, len) {
      if (f.b.has('cement_bag')) {   // sacks stacked in a running bond, each a little out of line
        var per = Math.max(2, Math.round(len / .68)), ly, bi; for (ly = 0; ly < 6; ly++) for (bi = 0; bi < per - (ly % 2); bi++) { var q = f.p(-len / 2 + .35 + bi * (len - .7) / Math.max(1, per - 1) + (ly % 2) * .34 + rnd(-.03, .03), rnd(-.04, .04)); f.b.model('cement_bag', q[0], ly * .175, q[1], f.ang + PI / 2 + rnd(-.08, .08), [1.05, 1, .98]); }
        f.solid(0, 0, len, .56, 1.08); return;
      }
      var rows = 6, n = Math.max(2, Math.round(len / .58)), r, i, cols = [0x9a8f6c, 0x8a8262, 0xa39874, 0x7f775a];
      for (r = 0; r < rows; r++) for (i = 0; i < n - (r % 2); i++) { var x = -len / 2 + .29 + i * (len - .58) / Math.max(1, n - 1) + (r % 2) * .29; f.sph(x + rnd(-.02, .02), .095 + r * .185, rnd(-.04, .04) + (r > 3 ? 0 : (i % 2 ? .06 : -.06)), .3, cols[(i + r * 3) % 4], 'canvas', 1, .36, .72 + (r < 2 ? .25 : 0)); }
      f.solid(0, 0, len, .62, 1.18);
    },
    // box car on two bogies, 9.6 m
    wagon: function (f, col) {
      var dk = 0x24282b, i; f.bx(0, .82, 0, 9.5, .22, 2.5, dk, 'metal'); [-.9, .9].forEach(function (z) { f.bx(0, .66, z, 9, .14, .12, dk, 'metal'); });
      f.ex([[-4.8, .93], [4.8, .93], [4.8, 3.3], [-4.8, 3.3]], -1.42, 1.42, col, 'corr', .03);
      f.exX([[-1.5, 3.28], [-1.5, 3.4], [-1.1, 3.62], [0, 3.72], [1.1, 3.62], [1.5, 3.4], [1.5, 3.28]], -4.86, 4.86, 0x3a3f43, 'paint', .02);                                    // arched roof
      [-1, 1].forEach(function (s) {
        f.bx(.4, 2.05, s * 1.47, 2.3, 2.1, .06, col, 'paint'); f.bx(.4, 3.14, s * 1.5, 5, .07, .07, dk, 'metal'); f.bx(.4, .97, s * 1.5, 5, .06, .07, dk, 'metal'); f.bx(-.55, 2, s * 1.52, .05, .5, .05, 0x9aa0a4, 'metal'); f.bx(.4, 2.6, s * 1.505, 1.2, .4, .01, 0xd8d2bc);   // sliding door, rails, handle, placard
        [-4.7, 4.7].forEach(function (x) { for (i = 0; i < 6; i++) f.bx(x, 1.15 + i * .38, s * 1.47, .05, .03, .34, 0x9aa0a4, 'metal'); });                                              // corner ladders
        [-4.75, -2.3, 2.3, 4.75].forEach(function (x) { f.bx(x, 2.1, s * 1.45, .08, 2.34, .05, dk, 'metal'); });
      });
      [-3.2, 3.2].forEach(function (bx) { f.bx(bx, .5, 0, 2.3, .22, 1.9, dk, 'metal'); [-.75, .75].forEach(function (dx) { f.cyl(bx + dx, .43, 0, .06, 1.9, 'z', dk, 'metal', 8); [-.76, .76].forEach(function (z) { f.cyl(bx + dx, .43, z, .43, .11, 'z', 0x3a3f43, 'metal', 18); f.cyl(bx + dx, .43, z - (z > 0 ? .07 : -.07), .48, .03, 'z', 0x3a3f43, 'metal', 18); }); }); });
      [-4.95, 4.95].forEach(function (x) { f.bx(x, .85, 0, .4, .2, .3, dk, 'metal'); f.cyl(x + (x > 0 ? .25 : -.25), .85, 0, .12, .22, 'y', dk, 'metal', 10); [-.9, .9].forEach(function (z) { f.cyl(x + (x > 0 ? .12 : -.12), 1.0, z, .12, .2, 'x', dk, 'metal', 12); }); });   // couplers, buffers
      f.cyl(4.84, 2.9, -.9, .18, .03, 'x', 0x9aa0a4, 'metal', 12);
      f.solid(0, 0, 9.6, 2.9, 3.5);
    },
    // eight-wheeled armoured carrier, 6.4 m
    apc: function (f, col) {
      col = col || 0x4d5a3a; var dk = 0x24282b, i;
      f.ex([[-3.1, .62], [2.9, .62], [3.3, 1.02], [3.05, 1.6], [1.5, 2.02], [-3, 2.02], [-3.2, 1.4]], -1.3, 1.3, col, 'paint', .06);                                              // hull
      [-2.2, -.8, .7, 2.1].forEach(function (x) { [-1, 1].forEach(function (s) { PR.wheel(f, x, s * 1.28, .56, .4, col); f.exX([[s * 1.02, 1.0], [s * 1.02, 1.2], [s * 1.5, 1.2], [s * 1.5, 1.08]].sort(function () { return 0; }), x - .68, x + .68, col, 'paint', .015); }); });
      f.lathe([[0, .95], [.1, .95], [.5, .7], [.56, .62], [.56, 0]], 'y', -.3, 2.0, 0, col, 'paint', 12); f.cyl(.9, 2.3, 0, .055, 1.9, 'x', dk, 'metal', 10); f.cyl(1.9, 2.3, 0, .08, .3, 'x', dk, 'metal', 10); f.bx(.25, 2.3, 0, .5, .3, .34, col, 'paint');   // turret, gun, mantlet
      f.cyl(-.5, 2.58, .1, .32, .06, 'y', dk, 'metal', 14); f.cyl(-1.9, 2.04, -.5, .36, .05, 'y', dk, 'metal', 14); f.cyl(-1.9, 2.04, .5, .36, .05, 'y', dk, 'metal', 14); f.cyl(1.1, 2.0, -.6, .3, .05, 'y', dk, 'metal', 14);   // hatches
      [-1, 1].forEach(function (s) { f.cyl(3.2, 1.36, s * .95, .1, .1, 'x', 0xe6e2d0, 'glass', 12); f.bx(3.12, 1.36, s * .95, .14, .3, .3, col, 'paint'); f.bx(2.2, 1.78, s * .7, .5, .16, .4, 0x0d1418, 'glass', 0, 0, -.27); f.bx(-3.22, 1.5, s * .9, .04, .14, .24, 0xb02a20); f.bx(-.4, 1.62, s * 1.34, 3.4, .5, .05, col, 'paint'); f.bx(-.4, 1.62, s * 1.37, .6, .34, .03, dk, 'metal'); });
      f.bx(-3.24, 1.25, 0, .06, .95, 1.5, col, 'paint'); f.bx(-3.28, 1.3, .55, .03, .12, .06, 0x9aa0a4, 'metal'); f.cyl(-2.6, 2.9, 1.0, .012, 1.8, 'y', dk, 'metal', 5); f.bx(-1, 1.9, 1.05, 1.6, .16, .2, dk, 'metal'); f.cyl(-1.6, 1.4, -1.33, .09, 1.2, 'x', dk, 'metal', 8);   // rear door, antenna, tools, exhaust
      for (i = 0; i < 4; i++) f.bx(3.2, .9 + i * .1, 0, .04, .04, 1.2, dk, 'metal');
      f.solid(0, 0, 6.4, 2.8, 2.1);
    },
    // ammunition box with latches and rope handles
    ammo: function (f, w, d, h, y, col) {
      if (f.b.model('wooden_military_crate', f.cx, y || 0, f.cz, f.ang, [w / 1.24, h / .46, d / .52])) { f.solid(0, 0, w, d, h, y || 0); return; }
      col = col || 0x4b5637; y = y || 0; f.ex([[-w / 2, y], [w / 2, y], [w / 2, y + h], [-w / 2, y + h]], -d / 2, d / 2, col, 'paint', .012); f.bx(0, y + h * .78, 0, w + .012, .012, d + .012, 0x1c1f1a);
      [-1, 1].forEach(function (s) { f.bx(s * w * .3, y + h * .76, d / 2 + .01, .05, .09, .02, 0x8d9296, 'metal'); f.bx(s * (w / 2 + .012), y + h * .55, 0, .02, .03, d * .5, 0x8a7a50, 'canvas'); });
      f.bx(0, y + h * .4, d / 2 + .008, w * .6, h * .22, .004, 0xd6c96a);
      f.solid(0, 0, w, d, h, y);
    },
    // framed window on a wall face: (lx, lz) is the point on the face, `out` the outward direction ([±1, 0] or [0, ±1])
    win: function (f, lx, lz, y, w, h, out) {
      var ax = out[0] !== 0, dp = .05, fr0 = 0xd8d6cc;
      function part(u, v, pw, ph, col, tex, off) { var o = (off == null ? dp : off); if (ax) f.bx(lx + out[0] * o, y + v, lz + u, .06, ph, pw, col, tex); else f.bx(lx + u, y + v, lz + out[1] * o, pw, ph, .06, col, tex); }
      part(0, 0, w, h, 0x0e161b, 'glass', .02); part(0, h / 2, w + .12, .08, fr0, 'paint'); part(0, -h / 2, w + .12, .08, fr0, 'paint'); part(-w / 2, 0, .08, h, fr0, 'paint'); part(w / 2, 0, .08, h, fr0, 'paint'); part(0, 0, .05, h, fr0, 'paint'); part(0, .08, w, .05, fr0, 'paint');
      part(0, -h / 2 - .07, w + .26, .06, 0x9a9c97, 'conc', .1);
    },
    door: function (f, lx, lz, w, h, out, col) {
      var ax = out[0] !== 0; function part(u, v, pw, ph, c2, tex, off) { var o = (off == null ? .04 : off); if (ax) f.bx(lx + out[0] * o, v, lz + u, .07, ph, pw, c2, tex); else f.bx(lx + u, v, lz + out[1] * o, pw, ph, .07, c2, tex); }
      part(0, h / 2, w, h, col || 0x4b5637, 'paint', .03); part(-w / 2 - .05, h / 2, .1, h + .1, 0x8d9296, 'metal'); part(w / 2 + .05, h / 2, .1, h + .1, 0x8d9296, 'metal'); part(0, h + .05, w + .2, .1, 0x8d9296, 'metal');
      part(w * .34, h * .47, .04, .14, 0xc8ccd0, 'metal', .09); part(0, h * .72, w * .7, .02, 0x2a2e31, 'plain', .07); part(0, h * .3, w * .7, .02, 0x2a2e31, 'plain', .07); part(0, .03, w + .1, .06, 0x9a9c97, 'conc', .1);
    }
  };

  // A local frame: everything built through it is placed and turned together, so each building is laid out as a plain rectangle.
  // Stairs and ladders made through a frame register themselves as links for the bots.
  function Frames(b, H, links, ladders, ST, DK) {
    return function fr(cx, cz, ang) {
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
        extend(f, b, cx, cz, ang, fr);
      return f;
    };
  }

  // 03 보급기지 — 108 x 72 m 야외 기지. 폭파 미션 맵 설계 자료에서 가져온 원칙:
  //  · 공격이 지점에 닿는 데 걸리는 시간보다 수비의 지점 간 이동이 조금 짧다(가운데를 지나는 빠른 길은 사방에서 보인다).
  //  · 길목은 네댓 곳으로 줄이고, 지점마다 성격이 다른 입구를 셋 이상 둔다.
  //  · 지점은 한 점이 아니라 구역이다. 설치할 자리가 여럿이고, 저마다 다른 엄폐물과 다른 위험을 가진다.
  //  · 설치 뒤에 숨을 자리와, 지점을 내려다보는 높은 자리가 있다.
  function depot() {
    var b = Builder(), H = 3.2, ROOF = !SV.noRoof, links = [], ladders = [], OL = 0x56633f, OD = 0x3f4a30, WC = 0xb4b4ac, DK = 0x4f585e, i;
    var fr = Frames(b, H, links, ladders, WC, DK);
    b.box(0, 0, 170, 130, .4, 0x777a70, -.4, false, 'conc');
    function truck(x, z, rot, dir) { PR.truck(fr(x, z, rot ? (dir < 0 ? PI / 2 : -PI / 2) : (dir < 0 ? PI : 0)), OL); }
    function tank(x, z, ang) { PR.tank(fr(x, z, ang || 0)); }
    function stack(x, z, n, c) { b.pallet(x, z, 0); b.crate(x, z, 1.4, c || 0x7c7a52, .14, 1.2); b.solid(x, z, 1.5, 1.5, .2); if (n > 1) { b.crate(x + .1, z - .05, 1.2, 0x8a8660, 1.34, 1.1); b.solid(x, z, 1.3, 1.3, 1.1, 1.34); } }
    function crate(f, lx, lz, s, h, y0, col) { f.box(lx, lz, s, s, h, col || 0x7c7a52, y0 || 0, true, 'crate'); }
    // sandbag wall, chest high: cover you can shoot over
    function bags(f, lx, lz, len, alongX) { PR.bags(f.sub(lx, lz, alongX ? 0 : PI / 2), len); }
    // painted outline of a plant zone
    function zone(f, q, y) { var w = q[2] - q[0], d = q[3] - q[1], cx = (q[0] + q[2]) / 2, cz = (q[1] + q[3]) / 2; f.box(cx, q[1], w, .3, .02, 0xd6a233, y, false, 'hazard'); f.box(cx, q[3], w, .3, .02, 0xd6a233, y, false, 'hazard'); f.box(q[0], cz, .3, d, .02, 0xd6a233, y, false, 'hazard'); f.box(q[2], cz, .3, d, .02, 0xd6a233, y, false, 'hazard'); }
    // chain-link fence between two points: stops people, not bullets
    function fence(x0, z0, x1, z1) {
      var dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), ang = Math.atan2(-dz, dx), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, n = Math.round(len / 3), k;
      b.rbox(mx, mz, len, .25, .3, 0x9a9c97, 0, ang, false, 'conc'); b.rsolid(mx, mz, len, .3, 2.6, 0, ang, true); b.rbox(mx, mz, len, .06, .06, 0x596268, 2.6, ang, false, 'metal');
      for (k = 0; k <= n; k++) b.cyl(x0 + dx * k / n, z0 + dz * k / n, .05, 2.6, 0x596268, 0, false, 'metal', .05, 6);
      b.quad('chain', mx, 1.45, mz, len, 2.3, ang, { mode: 'alpha', rep: [len / .16, 2.3 / .16], color: 0xc4ccd0 });
    }
    [[-30, -30], [6, -31], [-36, 6], [22, 6], [-10, 32], [26, 32], [40, -2], [-44, -12]].forEach(function (p) { b.quad('puddle', p[0], .025, p[1], rnd(3, 5), rnd(2.4, 3.6), rnd(0, 3), { flat: true, mode: 'alpha' }); });
    var ring = [[-54, -20], [-38, -36], [40, -36], [54, -24], [54, 22], [42, 36], [-40, 36], [-54, 24]];
    ring.forEach(function (p, n) { var q = ring[(n + 1) % ring.length], dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz), ang = Math.atan2(-dz, dx), mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2; b.rbox(mx, mz, len + .6, .5, 5, 0xa9aaa2, 0, ang, false, 'block'); b.rbox(mx, mz, len + .8, .7, .2, 0x8d9296, 5, ang, false, 'conc'); b.rsolid(mx, mz, len + .6, .5, 10, 0, ang); });

    // ----- middle: control tower you can climb, motor pool to its west, fuel point to its east
    var Ct = fr(-4, 0, .35);
    Ct.box(0, 0, 10, 8, 3, WC, 0, true, 'block'); Ct.box(0, 0, 10.4, 8.4, .2, 0x8a8478, 3, true, 'conc'); Ct.box(2.5, 5.2, 5, 2.2, H, 0xa39a88, 0, true, 'conc');
    Ct.stairs(-4, 5.2, 1, 0, 2); Ct.ladder(3, -4.2, 0, 1);
    Ct.rail('x', -4.15, -5.15, 5.15, [[2.3, 3.7]], H); Ct.rail('x', 4.15, -5.15, 0, [], H); Ct.rail('x', 6.3, 0, 5.15, [], H); Ct.rail('z', 5.15, -4.15, 6.3, [], H); Ct.rail('z', -5.15, -4.15, 4.15, [], H);
    Ct.box(-2, -1, 3.6, 3, 2.3, 0x7d8a80, H, true, 'panel'); Ct.box(-2, -1, 4, 3.4, .15, 0x464c4f, H + 2.3, false); crate(Ct, 3, 1.5, 1.3, 1.1, H);
    [-3, 0].forEach(function (x) { PR.win(Ct, x, -4, 1.75, 1.5, 1.1, [0, -1]); }); [-2.5, 2.5].forEach(function (z) { PR.win(Ct, 5, z, 1.75, 1.4, 1.1, [1, 0]); }); PR.door(Ct, -5, 0, 1.1, 2.1, [-1, 0]); PR.win(Ct, -5, 2.6, 1.75, 1.2, 1.1, [-1, 0]); PR.win(Ct, -5, -2.6, 1.75, 1.2, 1.1, [-1, 0]);
    PR.win(Ct, -2, .5, H + 1.35, 2.4, .9, [0, 1]); PR.win(Ct, -.2, -1, H + 1.35, 1.8, .9, [1, 0]); PR.door(Ct, -3.8, -1, .9, 2, [-1, 0]); Ct.cyl(-3, H + 3.9, -1.8, .02, 3.2, 'y', DK, 'metal', 5); Ct.cyl(-.8, H + 2.75, -2, .5, .12, 'y', 0xc8ccd0, 'paint', 14, .1); Ct.cyl(4.9, 1.6, -3.9, .05, 3.2, 'y', 0x8d9296, 'metal', 8);
    truck(-23, -6, false, 1); truck(-21.5, 2, false, -1); truck(-24, 10, false, 1); stack(-15, -9, 2); stack(-13, 7.5, 1, 0x9c8a62); b.jersey(-30, -1, 3, true); b.jersey(-12, -3, 3, true); b.cone(-17, -2); b.cone(-17, 5.5);
    var Fu = fr(13, 3, -.2); [[-3.6, -2.6], [3.6, -2.6], [-3.6, 2.6], [3.6, 2.6]].forEach(function (q) { Fu.box(q[0], q[1], .3, .3, 3.6, DK, 0, true, 'metal'); });
    Fu.box(0, 0, 8.6, 6.6, .25, 0xb9bdb6, 3.6, false, 'panel'); [-1.6, 1.6].forEach(function (x) { Fu.ex([[x - .35, .15], [x + .35, .15], [x + .35, 1.5], [x + .25, 1.62], [x - .25, 1.62], [x - .35, 1.5]], -.5, .5, 0xa8322a, 'paint', .03); Fu.bx(x, 1.2, .52, .46, .3, .02, 0x0e161b, 'glass'); Fu.bx(x, 1.2, -.52, .46, .3, .02, 0x0e161b, 'glass'); Fu.cyl(x + .4, .95, .2, .03, .7, 'y', 0x1b1d1f, 'rubber', 6); Fu.bx(x + .42, 1.3, .2, .08, .14, .06, 0x8d9296, 'metal'); Fu.solid(x, 0, .7, 1.1, 1.6); }); Fu.box(0, 0, 5, 1.6, .15, 0x9a9c97, 0, false, 'conc');
    [[-3, 2], [-2.4, 2.5], [3, -2]].forEach(function (q, n) { var p = Fu.p(q[0], q[1]); b.barrel(p[0], p[1], n ? C.red : C.olive); }); b.light(13, 3.2, 3, 0xd6e6f2, 1.4, 12);
    bags(fr(4, -8, .5), 0, 0, 4, true); bags(fr(-14, -14, -.3), 0, 0, 4, true); bags(fr(6, 11, -.4), 0, 0, 4, true); bags(fr(22, 8, 1.1), 0, 0, 3.5, true); bags(fr(-34, 8, 1.3), 0, 0, 4, true); bags(fr(-36, -8, -1.2), 0, 0, 4, true);

    // ----- north: a rail siding. The wagons are a wall with gaps you can slip through
    var Ra = fr(-6, -25.5, .07); [-.76, .76].forEach(function (z) { Ra.bx(0, .12, z, 54, .13, .07, 0x6b6f72, 'metal'); Ra.bx(0, .05, z, 54, .03, .16, 0x4f585e, 'metal'); }); for (i = -26.5; i <= 26.5; i += .7) Ra.bx(i, .03, 0, .24, .1, 2.5, 0x4a3a28, 'crate'); Ra.bx(0, .005, 0, 55, .02, 3.4, 0x6a665c, 'conc');
    [[-19.5, 0x4a5238], [-6.5, 0x7a3b26], [6.5, 0x2f4763], [19.5, 0x55524a]].forEach(function (q) { PR.wagon(Ra.sub(q[0], 0, 0), q[1]); });
    var N1 = fr(-33, -20, .3); N1.box(0, 0, 11, 8, 5.4, 0xb0ae9e, 0, true, 'block'); N1.box(0, 0, 11.6, 8.6, .3, 0x464c4f, 5.4, false); [-3.2, 0, 3.2].forEach(function (x) { N1.bx(x, 1.7, 4.04, 2.6, 3.4, .06, 0x8f9aa0, 'panel'); N1.bx(x, 3.46, 4.08, 2.9, .16, .14, 0x4f585e, 'metal'); [-1.36, 1.36].forEach(function (o) { N1.bx(x + o, 1.7, 4.07, .1, 3.4, .1, 0x4f585e, 'metal'); }); N1.bx(x, .5, 4.08, 2.4, .08, .02, 0xd6a233); }); [-3.5, 0, 3.5].forEach(function (x) { PR.win(N1, x, -4, 3.6, 1.6, .8, [0, -1]); }); PR.door(N1, 5.5, 1.5, 1, 2.1, [1, 0]); [-2.5, 2].forEach(function (z) { PR.win(N1, -5.5, z, 3.4, 1.6, .9, [-1, 0]); });
    var S2 = fr(15, -13, -.3); S2.box(0, 0, 8, 6, 4.4, 0xb0ae9e, 0, true, 'block'); S2.box(0, 0, 8.6, 6.6, .3, 0x464c4f, 4.4, false); PR.door(S2, 0, 3, 1.2, 2.1, [0, 1]); [-2.7, 2.7].forEach(function (x) { PR.win(S2, x, 3, 1.8, 1.4, 1.1, [0, 1]); PR.win(S2, x, -3, 1.8, 1.4, 1.1, [0, -1]); }); PR.win(S2, 4, 0, 1.8, 1.6, 1.1, [1, 0]); S2.cyl(2.6, 5, -1.4, .22, 1.3, 'y', 0x8d9296, 'metal', 10); S2.cyl(2.6, 5.7, -1.4, .3, .1, 'y', 0x6b767e, 'metal', 10); S2.bx(-2.6, 2.5, 3.5, 2.6, .05, 1, 0x56633f, 'canvas', .25); b.mark('취사장', S2.p(0, 3.06)[0], 3.3, S2.p(0, 3.06)[1], 2.6, .8, -.3, '#ecebe4');
    fence(-21, -17.2, -10, -16); fence(-6, -15.4, 5, -14.6); stack(-25, -30.5, 2); stack(9, -31, 1, 0x9c8a62); b.jersey(18, -30, 3, false); b.barrel(-2, -32.5, C.olive); b.tires(-12, -31.5, 3);

    // ----- south: barracks you can cut through, then a container yard
    var S1 = fr(-30, 21, -.2); S1.wall('z', -7, -3.5, 3.5, [[-1.2, 1.2]], 0, H); S1.wall('z', 7, -3.5, 3.5, [[-1.2, 1.2]], 0, H); S1.wall('x', -3.5, -7, 7, [[2, 4.5]], 0, H); S1.wall('x', 3.5, -7, 7, [], 0, H);
    S1.box(0, 0, 13.6, 6.6, .02, 0xa8acad, 0, false, 'floor'); if (ROOF) { S1.box(0, 0, 14.8, 7.8, .25, 0x464c4f, H, false, 'panel'); b.light(-30, 2.6, 21, 0xffe2b0, 1.2, 10); }
    [[-5.4, 2.6], [-2.9, 2.6], [5.4, 2.6], [-5.4, -2.6], [-2.9, -2.6]].forEach(function (q) { PR.bunk(S1.sub(q[0], q[1], 0)); }); [[.2, 3], [1.15, 3], [5.8, -3]].forEach(function (q) { PR.locker(S1.sub(q[0], q[1] > 0 ? 3.02 : -3.02, q[1] > 0 ? PI : 0)); });
    S1.bx(.8, .74, -.6, 1.6, .05, .8, 0x7a6038, 'crate'); [[.1, -.9], [1.5, -.9], [.1, -.3], [1.5, -.3]].forEach(function (q) { S1.cyl(q[0], .37, q[1], .025, .74, 'y', 0x4a5258, 'metal', 6); }); S1.solid(.8, -.6, 1.6, .8, .78);
    [-4.5, -1.5, 4.8].forEach(function (x) { PR.win(S1, x, 3.7, 1.75, 1.2, 1, [0, 1]); }); [-4.5, -1].forEach(function (x) { PR.win(S1, x, -3.7, 1.75, 1.2, 1, [0, -1]); });
    [[-9, 17, .2, OL, 0], [-9, 17, .2, C.rust, 1], [-1, 23, -.5, C.navy, 0], [7, 17, 1.2, C.sand, 0], [14, 25, .1, C.teal, 0], [14, 25, .1, OL, 1], [3, 30, 0, C.rust, 0], [-13, 29, .9, C.sand, 0], [-20, 31.5, .05, OD, 0]].forEach(function (q) {
      b.rbox(q[0], q[1], 6.1, 2.5, 2.5, q[3], q[4] * 2.5, q[2], true, 'corr'); var f = fr(q[0], q[1], q[2]); f.box(3.07, 0, .04, 2.3, 2.3, 0x33383c, q[4] * 2.5 + .1, false); });
    fence(15, 12.5, 22, 10.5); stack(-3, 13, 1); stack(21, 30, 2, 0x9c8a62); b.jersey(-22, 28, 3, false); b.barrel(9, 22, C.olive); b.barrel(9.6, 22.5, C.blue); b.tires(-4, 31, 3);

    // ----- A (north-east): ammunition point. Two plant zones: a raised pad among crates, and a corner behind a stack. A watch tower looks down on both.
    var AF = fr(34, -19, .15), zA = [[3, -9, 10, -3], [-6, 2, 0, 8]];
    AF.wall('z', 11, -10, 10, [[2, 6]], 0, 4); AF.wall('x', 10, -11, 11, [[-3, 2]], 0, 4); AF.wall('z', -11, -10, 10, [[-4, 3]], 0, 4); AF.wall('x', -10, -11, 11, [], 0, 4);
    AF.box(6.5, -6, 7, 6, .42, 0x9a9c97, 0, true, 'conc'); zone(AF, zA[0], .42); zone(AF, zA[1], 0);
    crate(AF, 8.6, -7.6, 1.5, 1.4, .42); crate(AF, 8.7, -7.5, 1.2, 1.1, 1.82, 0x8a8660); [[4, -8.3, 0], [5.3, -8.3, 0], [4.65, -8.3, .5], [9.4, -4.4, 0], [9.4, -3.5, 0], [9.4, -3.95, .5], [4.2, -3.6, 0]].forEach(function (q) { PR.ammo(AF.sub(q[0], q[1], q[0] > 9 ? PI / 2 : 0), 1.2, .5, .46, .42 + q[2]); });
    AF.box(-6.9, 5, 1.4, 4.4, 2.2, 0x6f7350, 0, true, 'crate'); crate(AF, -6.9, 4, 1.2, 1, 2.2, 0x8a8660); bags(AF, -3, 1.2, 4.4, true); crate(AF, 1, 8.6, 1.4, 1.3); [[-2.2, 8.8, 0], [-.9, 8.8, 0], [-1.55, 8.8, .46]].forEach(function (q) { PR.ammo(AF.sub(q[0], q[1], 0), 1.2, .5, .46, q[2]); });
    bags(AF, -7.6, -.6, 3.6, false); bags(AF, 1, -5.2, 3.2, true); bags(AF, 7.5, 4.6, 3.4, false);
    var tk = AF.p(-3.6, -8.2); tank(tk[0], tk[1]);
    [[-9.8, -7.8], [-7.2, -7.8], [-9.8, -5.2], [-7.2, -5.2]].forEach(function (q) { AF.box(q[0], q[1], .28, .28, 3, DK, 0, true, 'metal'); AF.box(q[0], q[1], .12, .12, 2.3, DK, H, false, 'metal'); });
    [[-9.8, -7.8, -7.2, -7.8], [-7.2, -7.8, -7.2, -5.2], [-7.2, -5.2, -9.8, -5.2], [-9.8, -5.2, -9.8, -7.8]].forEach(function (q) { var p0 = AF.p(q[0], q[1]), p1 = AF.p(q[2], q[3]); b.seg(p0[0], .2, p0[1], p1[0], 2.9, p1[1], .07, DK); b.seg(p1[0], .2, p1[1], p0[0], 2.9, p0[1], .07, DK); b.seg(p0[0], 1.5, p0[1], p1[0], 1.5, p1[1], .07, DK); });
    AF.box(-8.5, -6.5, 3.2, 3.2, .2, 0x6a5636, 3, true, 'crate'); AF.box(-8.5, -6.5, 3.8, 3.8, .15, OD, H + 2.3, false, 'panel'); AF.ladder(-8.5, -4.9, 0, -1);
    AF.rail('x', -8.05, -10.05, -6.95, [], H); AF.rail('x', -4.95, -10.05, -6.95, [[-9.2, -7.8]], H); AF.rail('z', -10.05, -8.05, -4.95, [], H); AF.rail('z', -6.95, -8.05, -4.95, [], H);
    var pA = AF.p(6.5, -6); b.mark('A', pA[0], .45, pA[1], 2.4, 2.4, 0, '#e2562f', true); pA = AF.p(-3, 5); b.mark('A', pA[0], .03, pA[1], 2.4, 2.4, 0, '#e2562f', true);
    b.mark('A', AF.p(-11.25, 6)[0], 2.8, AF.p(-11.25, 6)[1], 1.6, 1.6, .15 - PI / 2, '#e2562f'); b.mark('A', AF.p(5, 10.25)[0], 2.8, AF.p(5, 10.25)[1], 1.6, 1.6, .15, '#e2562f');

    // ----- B (south-east): maintenance hangar, open to the west. Plant inside behind the vehicle, or out on the apron. A gallery runs along the back.
    var BF = fr(33, 18, -.2), zB = [[-9, -7, -2.5, 7], [-17, -5, -11, 5]];
    BF.wall('x', -8, -10, 10, [[-2, 1]], 0, 6.2); BF.box(-.5, -8, 3, .4, 3.2, WC, 3, true, 'block'); BF.wall('x', 8, -10, 10, [], 0, 6.2);
    BF.wall('z', 10, -8, 8, [[-2, 1]], 0, H); BF.wall('z', 10, -8, 8, [[-6, -4]], H, 3); BF.box(10, -5, .4, 2, 1, WC, 5.2, true, 'block');
    [-8, 0, 8].forEach(function (z) { BF.box(-10, z, .6, .6, 6.2, DK, 0, true, 'metal'); }); BF.box(-10, 0, .5, 16.4, .8, DK, 5.4, true, 'metal');
    BF.box(0, 0, 19.6, 15.6, .02, 0xa8acad, 0, false, 'floor'); zone(BF, zB[0], 0); zone(BF, zB[1], 0);
    if (ROOF) { BF.box(0, 0, 21, 17, .25, 0x5d666c, 6.2, false, 'panel'); [[-5, 0], [3, 0]].forEach(function (q) { var p = BF.p(q[0], q[1]); b.light(p[0], 5.5, p[1], 0xd6e6f2, 1.5, 15); BF.box(q[0], q[1], .3, 5, .06, 0xffffff, 6.1, false, 'glow'); }); }
    BF.box(7.75, 0, 4.5, 15.6, .2, 0x7d766a, 3, true, 'conc'); [-3, 4].forEach(function (z) { BF.box(5.7, z, .25, .25, 3, DK, 0, true, 'metal'); }); BF.stairs(1.5, 6.9, 1, 0, 2); BF.rail('z', 5.5, -7.8, 5.9, [], H); BF.ladder(10.2, -5, -1, 0);
    crate(BF, 8, 3, 1.3, 1.1, H); crate(BF, 7.5, -6.6, 1.3, 1.2, H, 0x8a8660);
    var pv = BF.p(-1, .5), V = fr(pv[0], pv[1], .15);                                                                                                   // the vehicle being worked on
    PR.apc(V, 0x4d5a3a);
    BF.box(-4, 7.3, 5, .9, .9, 0x4a5258, 0, true, 'metal'); BF.bx(-4, .93, 7.3, 5.1, .06, 1, 0x7a6038, 'crate'); BF.bx(-5.6, 1.08, 7.3, .3, .24, .24, 0x2a4a6a, 'paint'); BF.bx(-2.8, 1.02, 7.3, .5, .12, .3, 0xa8322a, 'paint'); BF.bx(-4, 1.9, 7.75, 4.6, 1.2, .04, 0x8a7a58, 'crate');
    [-8.6, -7.6].forEach(function (x) { PR.locker(BF.sub(x, 7.55, PI), 0x4a5a6a); }); for (i = -8; i <= 8; i += 4) { BF.bx(0, 5.9, i, 20, .16, .12, DK, 'metal'); BF.bx(0, 5.2, i, 20, .12, .1, DK, 'metal'); for (var tx = -9; tx < 9; tx += 3) { var p0 = BF.p(tx, i), p1 = BF.p(tx + 1.5, i), p2 = BF.p(tx + 3, i); b.seg(p0[0], 5.2, p0[1], p1[0], 5.9, p1[1], .07, DK); b.seg(p1[0], 5.9, p1[1], p2[0], 5.2, p2[1], .07, DK); } } crate(BF, 4, -6.6, 1.5, 1.4); crate(BF, -8.4, -6.8, 1.5, 1.5, 0, 0x8a8660); BF.box(-7.6, 5.4, 1.2, 2.4, 1.2, 0x6f7350, 0, true, 'crate'); BF.ex([[3.1, 0], [4.1, 0], [4.1, 1.1], [3.1, 1.1]], 2.95, 3.85, 0xa8322a, 'paint', .02); for (i = 0; i < 4; i++) { BF.bx(3.6, .2 + i * .24, 3.86, .9, .02, .02, 0x1c1f22); BF.bx(3.6, .12 + i * .24, 3.88, .3, .03, .03, 0xc8ccd0, 'metal'); } [[3.2, 3.05], [4, 3.05], [3.2, 3.75], [4, 3.75]].forEach(function (q) { BF.cyl(q[0], -.02, q[1], .05, .08, 'x', 0x1b1d1f, 'rubber', 8); }); BF.solid(3.6, 3.4, 1, .9, 1.1);
    bags(BF, -13.8, -3.4, 4, true); BF.box(-12.6, 4.2, 3, .5, 1.05, 0xa9aba6, 0, true, 'conc'); BF.box(-16.6, .6, .5, 3, 1.05, 0xa9aba6, 0, true, 'conc');
    [[-14.5, 1.2], [-13.9, 1.7], [-14.7, 2], [-19, -6]].forEach(function (q, n) { var p = BF.p(q[0], q[1]); b.barrel(p[0], p[1], n % 2 ? C.red : C.olive); });
    var pB = BF.p(-6, 0); b.mark('B', pB[0], .03, pB[1], 2.4, 2.4, 0, '#e2562f', true); pB = BF.p(-14, 0); b.mark('B', pB[0], .03, pB[1], 2.4, 2.4, 0, '#e2562f', true);
    b.mark('B', BF.p(-.5, -8.25)[0], 4.2, BF.p(-.5, -8.25)[1], 1.6, 1.6, PI - .2, '#e2562f');

    // ----- east yard, between the sites and the defenders
    [[22.7, -3.4], [25.3, -3.4], [22.7, -.6], [25.3, -.6]].forEach(function (p) { b.box(p[0], p[1], .28, .28, 6.2, DK, 0, true, 'metal'); }); b.cyl(24, -2, 2.2, 2.6, 0x7b8a7a, 6.2, false, 'metal', 2.2, 18); b.cyl(24, -2, 2.3, .4, 0x586458, 8.8, false, 'metal', .6, 18);
    var G1 = fr(45.5, 9, .1); G1.box(0, 0, 4, 3, 3, 0xb0ae9e, 0, true, 'block'); G1.box(0, 0, 4.5, 3.5, .25, 0x464c4f, 3, false); PR.door(G1, -2, 0, .9, 2, [-1, 0]); PR.win(G1, 0, -1.5, 1.7, 1.6, 1, [0, -1]); PR.win(G1, 0, 1.5, 1.7, 1.6, 1, [0, 1]);
    truck(40, -10, true, 1); stack(30, -3, 2); stack(38, 3, 1, 0x9c8a62); b.jersey(31, 4, 3, true); b.jersey(43, -17, 3, false); b.tires(47, 1, 3); b.barrel(27, 7, C.olive);
    var G0 = fr(-46, -6, -.2); G0.box(0, 0, 3, 3, 2.8, 0xb0ae9e, 0, true, 'block'); G0.box(0, 0, 3.5, 3.5, .25, 0x464c4f, 2.8, false); PR.door(G0, 1.5, .6, .9, 2, [1, 0]); PR.win(G0, 0, -1.5, 1.6, 1.4, 1, [0, -1]); PR.win(G0, 0, 1.5, 1.6, 1.4, 1, [0, 1]); PR.win(G0, -1.5, 0, 1.6, 1.4, 1, [-1, 0]); G0.bx(4.4, 1, 0, 5, .12, .12, 0xd8d2bc, 'paint'); G0.bx(4.4, 1, .001, 1, .13, .13, 0xb02a20); G0.cyl(1.9, .55, 0, .09, 1.1, 'y', 0x8d9296, 'metal', 8); stack(-45, 12, 2); b.jersey(-40, 3, 3, true);
    [[-42, -22, 1, 0], [-28, -31, 0, 1], [-4, -33, 0, 1], [14, -33, 0, 1], [-18, -12, 0, 1], [-28, 6, 1, 0], [-12, 13, 0, -1], [6, 8, 0, 1], [22, -9, -1, 0], [18, 14, 1, 0], [-36, 32, 0, -1], [-8, 33.5, 0, -1], [20, 33.5, 0, -1], [44, -4, -1, 0], [50, 14, -1, 0], [-50, 10, 1, 0], [28, 6, 0, -1]].forEach(function (p) { b.lamp(p[0], p[1], 6, p[2], p[3]); });
    // scanned dressing: generator, compressor, tool cart, hand trucks, jerrycans, military crates, a car under a cover
    [['portable_generator', -9.5, -6.5, .6, 1.25], ['old_military_crate', 30.5, -25.5, .3, 1], ['old_military_crate', 30.6, -25.4, .25, 1, .3], ['old_military_crate', 42, -13, 1.2, 1], ['hand_truck', 37, -22, 2, 1], ['hand_truck', 26, 22.5, -.6, 1],
      ['tool_cart', 31, 24.5, .15, 1], ['metal_toolbox', 28.5, 24.8, .9, 1.2], ['utility_box_01', -1.2, 5.6, .35, 1.2], ['utility_box_01', 44.6, 11.2, .1, 1.2], ['metal_jerrycan_green', 10.2, 5.2, .4, 1], ['metal_jerrycan_green', 10.7, 5.5, 1.9, 1], ['metal_jerrycan_green', 15.8, .4, -.7, 1],
      ['covered_car', -34, 13, 1.25, 1.05], ['wooden_crate_02', -16, 9, .4, 1.4], ['wooden_crate_02', 21, 27, 1.1, 1.4], ['old_military_crate', -27, -30.5, .1, 1], ['portable_generator', 38, 12, 2.2, 1.25], ['old_military_crate', 3, 10, .7, 1], ['wooden_crate_02', -2, -9.5, 2, 1.4],
      ['propane_tank', -8.2, -7.5, .3, 1], ['propane_tank', -7.8, -7, 1.7, 1], ['metal_tool_chest', 29.9, 25.4, .2, 1], ['fire_hydrant', 7.2, 8.7, .5, 1], ['propane_tank', 39.2, 12.8, 2, 1]
    ].forEach(function (q) { b.prop(q[0], q[1], q[2], q[3], q[4], q[5] || 0); });
    b.spawn('A', -49, 2); b.spawn('B', 49, -1);
    function L(f, q, l) { return f.p(q[0], q[1], l || 0); }
    return { name: '보급기지', b: b, bounds: { minx: -54, maxx: 54, minz: -36, maxz: 36 }, bg: 0x4a5560, fog: [40, 190], hemi: [0xc4d0da, 0x4a4436, .95], sun: [0xffd9b0, .75, [-30, 38, 24]], rain: false, sky: [0x26313f, 0xb9885e], dim: .7, hdri: ['dusk', .42, .75, 6, .85],
      H: H, links: links, ladders: ladders,
      // a site is a set of zones in its own frame; `spots` are where a bot may choose to plant, `via` the approaches, `fwd` forward posts for defenders
      sites: [{ id: 'A', x: AF.p(1, 0)[0], z: AF.p(1, 0)[1], l: 0, y: 0, f: [34, -19, .15], zones: zA, spots: [{ x: AF.p(7, -5)[0], z: AF.p(7, -5)[1], y: .42, l: 0 }, { x: AF.p(5, -7)[0], z: AF.p(5, -7)[1], y: .42, l: 0 }, { x: AF.p(-3.5, 4.5)[0], z: AF.p(-3.5, 4.5)[1], y: 0, l: 0 }, { x: AF.p(-1, 6.8)[0], z: AF.p(-1, 6.8)[1], y: 0, l: 0 }],
          via: [[-30, -31, 0], [0, -31.5, 0], [8, -8, 0], Ct.p(1, 0, 1), [22, -7, 0]] },
        { id: 'B', x: BF.p(-5, 0)[0], z: BF.p(-5, 0)[1], l: 0, y: 0, f: [33, 18, -.2], zones: zB, spots: [{ x: BF.p(-6, -4.5)[0], z: BF.p(-6, -4.5)[1], y: 0, l: 0 }, { x: BF.p(-5.5, 5)[0], z: BF.p(-5.5, 5)[1], y: 0, l: 0 }, { x: BF.p(-14.5, -1.5)[0], z: BF.p(-14.5, -1.5)[1], y: 0, l: 0 }, { x: BF.p(-13, 2.6)[0], z: BF.p(-13, 2.6)[1], y: 0, l: 0 }],
          via: [[-30, 31, 0], [0, 32.5, 0], [8, 12, 0], [-18, 13, 0], BF.p(8, -5, 1)] }],
      fwd: [Ct.p(2, 2, 1), [19, -8, 0], [17, 12, 0], AF.p(-8.5, -6.5, 1), [8, -31, 0], [20, 31, 0], BF.p(8, 0, 1)] };
  }

  // 04 구시가지 — 88 x 60 m, 2층. 폭파 미션 맵들의 공통 짜임을 따랐다: 세 갈래 길과 그 사이 연결로, 양쪽 목표로 통하는 가운데
  // 건물, 지점마다 성격이 다른 입구 셋 이상(큰길, 샛길, 윗길), 수비가 먼저 닿는 거리, 야외 지점 하나와 실내 지점 하나.
  // 건물은 저마다 다른 각도로 놓여 길이 직각으로 만나지 않는다. 위층(H = 3.2 m)은 시장 옥상, 구름다리, A 옥상, B 중층이다.
  function oldtown() {
    var b = Builder(); b.day = true; var H = 3.2, ROOF = !SV.noRoof, links = [], ladders = [], ST = 0xc9b79a, ST2 = 0xb9a488, TILE = 0x9a5a3c, DK = 0x4f585e, WD = 0x9c7a4a;
    b.box(0, 0, 140, 110, .4, 0x8f897c, -.4, false, 'conc');
    var fr = Frames(b, H, links, ladders, ST, DK);
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
    [['fire_hydrant', -6.8, -27.4, .3, 1], ['propane_tank', 2.9, -18.4, 1, 1], ['propane_tank', 3.2, -17.9, 2.2, 1], ['fire_hydrant', 21.2, 28.3, 2, 1]].forEach(function (q) { b.prop(q[0], q[1], q[2], q[3], q[4]); });
    b.spawn('A', -39.5, 3); b.spawn('B', 39.5, -1);
    return { name: '구시가지', b: b, bounds: { minx: -44, maxx: 44, minz: -30, maxz: 30 }, bg: 0x93a7b8, fog: [40, 190], hemi: [0xe2ebf2, 0x6a5c48, 1], sun: [0xfff0d0, 1.7, [-26, 40, 18]], rain: false, sky: [0x3a6aa6, 0xd9cdb4], hdri: ['day', .8, 1.5, 8, 1], dim: 1,
      H: H, links: links, ladders: ladders,
      sites: [{ id: 'A', x: sa[0], z: sa[1], l: 0, y: 0, via: [[-4, -25, 0], [-12, -8, 0], [5, -9, 0], M.p(0, -1, 1), A.p(-9, 6, 1)] }, { id: 'B', x: sb[0], z: sb[1], l: 0, y: 0, via: [[-2, 27, 0], [-8, 12.5, 0], [8, 11, 0], Bf.p(-6, 2, 1), M.p(3, 4.5, 1)] }],
      fwd: [A.p(-9, 3, 1), M.p(6, 0, 1), [8, 3, 0], Bf.p(-6, -2, 1), [14, -27, 0], [8, 25, 0]] };
  }

  // helpers shared by the three maps built to the map pack's rules
  function tiered(b, tier, fn) { return function () { var o = b.tier; b.tier = tier; var r = fn.apply(null, arguments); b.tier = o; return r; }; }
  function decal(b, key, x, y, z, w, h, ry, flat, col) { var o = b.tier; b.tier = 1; b.quad('d_' + key, x, y, z, w, h, ry || 0, { flat: !!flat, mode: 'alpha', make: PAINT['d_' + key], color: col }); b.tier = o; }
  // the plant zone: a 6 x 6 m square, as the pack's TRIGGER_*_SITE boxes define it, outlined on the ground
  function plantZone(b, x, z, y) { [[0, -3, 6, .25], [0, 3, 6, .25], [-3, 0, .25, 6], [3, 0, .25, 6]].forEach(function (q) { b.quad('hazard', x + q[0], y + .035, z + q[1], q[2], q[3], 0, { flat: true, rep: [q[2] > 1 ? 6 : .25, q[3] > 1 ? 6 : .25] }); }); }
  function siteDef(id, x, z, y, l, via) { return { id: id, x: x, z: z, l: l, y: y, f: [x, z, 0], zones: [[-3, -3, 3, 3]], spots: [[0, 0], [1.8, -1.6], [-1.7, 1.5], [2, 1.9], [-2, -2]].map(function (q) { return { x: x + q[0], z: z + q[1], y: y, l: l }; }), via: via }; }

  // 05 전술 기지 — 사용자가 준 시안과 설명문(맵 1, 대칭형 군사기지)을 그대로 옮겼다. 북쪽이 -z.
  //  · 부지 106 x 81 m 를 높이 4.8 m 콘크리트 방벽이 두른다. 좌우 대칭, 세 갈래(왼쪽 길 / 가운데 광장 / 오른쪽 길).
  //  · 남쪽 가운데 철제 정문(공격 출발) → 가운데 광장(화단과 큰 나무) → 광장 북쪽의 24 x 14 x 5 m 중앙 건물이 시야를 가른다.
  //  · 중앙 건물 좌우의 문 통로로 돌아 들어가고, 건물 뒤 가로 통로(수비 출발, 본부 건물 앞)로 A·B 를 오간다.
  //  · A(북서)·B(북동) 지점은 광장보다 1.4 m 높은 19 x 21 m 작업장. 남쪽 넓은 계단, 동쪽 계단, 본부 쪽 좁은 계단으로 오른다.
  //  · 감시탑과 옥상은 장식이다(올라갈 수 없다).
  function compound() {
    var b = Builder(), H = 1.4, links = [], CW = 0x9a9b98, CW2 = 0x838583, FLR = 0x83847e, DK = 0x33383c, OLV = 0x5a6142, TAN = 0xb39a6a, i;
    b.day = true;
    b.box(0, 0, 150, 120, .3, 0x5b5a3e, -.45, false, 'plain');                    // earth outside the walls
    b.box(0, 0, 108, 83, .4, FLR, -.4, false, 'conc');                            // paved compound
    function tree(x, z, k, solid) {
      b.cyl(x, z, .28 * k, 3.2 * k, 0x4a3a28, 0, !!solid, 'plain', .2 * k, 8);
      [[0, 4.4, 0, 2.3], [1.3, 3.6, .4, 1.7], [-1.2, 3.8, -.5, 1.8], [.3, 3.4, -1.4, 1.6], [-.4, 5.6, .5, 1.5], [.2, 3.7, 1.4, 1.6]].forEach(function (q, n) { var g = new T.IcosahedronGeometry(q[3] * k, 1); g.translate(x + q[0] * k, q[1] * k, z + q[2] * k); b.geo(g, n % 2 ? 0x3f5a2c : 0x4c6a33, 'plain', {}); });
    }
    function acu(x, z, y) { b.box(x, z, 1.7, 1.7, 1, 0xb4b8b6, y, false, 'metal'); b.cyl(x, z, .62, .06, 0x2a2e31, y + 1, false, 'plain', .62, 14); b.cyl(x, z, .12, .1, 0x8a8f92, y + 1.03, false, 'metal', .12, 8); }
    function lampW(x, z, y, nx, nz) { b.box(x + nx * .1, z + nz * .1, nx ? .2 : .5, nz ? .2 : .5, .16, DK, y, false, 'metal'); b.glow(x + nx * .14, y - .05, z + nz * .14, nx ? .12 : .4, .07, nz ? .12 : .4, 0xffd9a0); }
    function win(x, z, w, h, y, nx, nz) { b.box(x + nx * .03, z + nz * .03, nx ? .1 : w + .2, nz ? .1 : w + .2, h + .2, 0x55595a, y - .1, false, 'metal'); b.box(x + nx * .07, z + nz * .07, nx ? .08 : w, nz ? .08 : w, h, 0x5a6a72, y, false, 'glass'); }
    function door(x, z, w, h, nx, nz) { b.box(x + nx * .04, z + nz * .04, nx ? .12 : w + .24, nz ? .12 : w + .24, h + .12, 0x4a4e50, 0, false, 'metal'); b.box(x + nx * .09, z + nz * .09, nx ? .1 : w, nz ? .1 : w, h, 0x3d4a44, 0, false, 'paint'); }
    function rim(x0, z0, x1, z1, y, c) { var w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; b.box(cx, z0 + .15, w, .3, .35, c, y, false, 'conc'); b.box(cx, z1 - .15, w, .3, .35, c, y, false, 'conc'); b.box(x0 + .15, cz, .3, d, .35, c, y, false, 'conc'); b.box(x1 - .15, cz, .3, d, .35, c, y, false, 'conc'); }
    function cr(x, z, sz, h, c, y0) { b.crate(x, z, sz, c, y0 || 0, h); if (y0 > .5) b.solid(x, z, sz, sz, h, y0); }
    function ctn(x, z, alongZ, c, y0) {                                            // cargo container, 6.06 x 2.44 x 2.6
      var w = alongZ ? 2.44 : 6.06, d = alongZ ? 6.06 : 2.44, sx, sz; b.box(x, z, w, d, 2.6, c, y0, true, 'corr');
      for (sx = -1; sx <= 1; sx += 2) for (sz = -1; sz <= 1; sz += 2) b.box(x + sx * (w / 2 - .06), z + sz * (d / 2 - .06), .16, .16, 2.62, DK, y0 - .01, false, 'metal');
      if (alongZ) b.quad('door', x, y0 + 1.3, z + d / 2 + .015, 2.3, 2.45, 0, { color: c }); else b.quad('door', x + w / 2 + .015, y0 + 1.3, z, 2.3, 2.45, PI / 2, { color: c });
    }
    lampW = tiered(b, 1, lampW); acu = tiered(b, 2, acu); win = tiered(b, 2, win); door = tiered(b, 2, door);
    function siteMark() { var a = cv(256, 256), x = a[1]; x.strokeStyle = '#b8402e'; x.lineWidth = 16; x.beginPath(); x.arc(128, 128, 104, 0, 6.2832); x.stroke(); x.lineWidth = 20; x.beginPath(); x.moveTo(60, 60); x.lineTo(196, 196); x.moveTo(196, 60); x.lineTo(60, 196); x.stroke(); return a[0]; }
    function hazard(x, z, w, d) { b.quad('hazard', x, .025, z, w, d, 0, { flat: true, rep: [w, d] }); }

    // ---------- perimeter: 4.8 m wall with a coping, steel main gate in the middle of the south side
    [[0, -40.8, 107.2, .6], [-53.3, 0, .6, 82.2], [53.3, 0, .6, 82.2]].forEach(function (q) { b.box(q[0], q[1], q[2], q[3], 4.8, CW, 0, true, 'conc'); b.box(q[0], q[1], q[2] + .2, q[3] + .2, .2, CW2, 4.8, false, 'conc'); });
    [-1, 1].forEach(function (sd) { b.box(sd * 29.8, 40.8, 47.6, .6, 4.8, CW, 0, true, 'conc'); b.box(sd * 29.8, 40.8, 47.8, .8, .2, CW2, 4.8, false, 'conc'); b.box(sd * 6.5, 40.8, 1.2, 1.2, 5.4, CW2, 0, true, 'conc'); });   // gate piers
    b.box(0, 40.9, 11.8, .25, 4.4, 0x3c4347, 0, true, 'metal');                                                                     // the gate: plate, frame, cross-bracing
    [[-5.9, 0], [5.9, 0], [0, 0]].forEach(function (q) { b.box(q[0], 40.7, .3, .3, 4.5, 0x2c3134, 0, false, 'metal'); }); [.3, 2.2, 4.2].forEach(function (y) { b.box(0, 40.7, 11.8, .2, .25, 0x2c3134, y, false, 'metal'); });
    [-1, 1].forEach(function (sd) { b.seg(sd * .2, .4, 40.68, sd * 5.8, 4.2, 40.68, .14, 0x2c3134, 'metal'); b.seg(sd * .2, 4.2, 40.68, sd * 5.8, .4, 40.68, .14, 0x2c3134, 'metal'); });
    b.quad('hazard', 0, .3, 40.55, 11.8, .5, PI, { rep: [11.8, .5] }); hazard(0, 39.4, 11.8, .6);
    for (i = -48; i <= 48; i += 8) { lampW(i, -40.5, 3.6, 0, 1); if (Math.abs(i) > 8) lampW(i, 40.5, 3.6, 0, -1); } for (i = -32; i <= 32; i += 8) { lampW(-53, i, 3.6, 1, 0); lampW(53, i, 3.6, -1, 0); }

    // ---------- middle (not mirrored)
    // central building, 24 x 14 x 5: it splits the map's sight lines; roof is dressing only
    b.box(0, -11, 24, 14, 5, CW, 0, true, 'conc'); rim(-12, -18, 12, -4, 5, CW2); b.box(0, -3.95, 24.4, .3, .25, CW2, 3.3, false, 'conc');
    door(0, -4, 2.2, 2.5, 0, 1); [-9, -6, -3, 3, 6, 9].forEach(function (x) { win(x, -4, 1.6, 1.1, 3.55, 0, 1); win(x, -18, 1.6, 1.1, 3.55, 0, -1); }); door(-8, -18, 1.2, 2.2, 0, -1); door(8, -18, 1.2, 2.2, 0, -1);
    [-10.5, 10.5].forEach(function (x) { lampW(x, -4, 2.9, 0, 1); lampW(x, -18, 2.9, 0, -1); }); lampW(-12, -11, 2.9, -1, 0); lampW(12, -11, 2.9, 1, 0);
    acu(7.5, -8, 5); acu(-7, -13.5, 5.3); b.box(-7, -13.5, 3.2, 4, .3, 0x9aa0a2, 5, false, 'metal');                                  // rooftop plant: units, duct run, pipes
    b.box(-6.5, -8.5, 4.2, 1.1, .9, 0xa7adaf, 5, false, 'metal'); b.box(-3.9, -10.5, 1.1, 5, .9, 0xa7adaf, 5, false, 'metal'); b.box(-8.4, -9.4, .5, .5, 1.6, 0x8d9396, 5, false, 'metal');
    [-.4, 0, .4].forEach(function (o) { b.seg(2 + o, 5.25, -16.5, 2 + o, 5.25, -6, .16, 0x7f6b55, 'metal'); }); b.box(2, -16.6, 1.6, .5, .5, 0x6a7073, 5, false, 'metal'); b.box(4.6, -15, 2.4, 2.2, 1.2, 0x8d9396, 5, false, 'metal');
    // HQ building along the north wall: two tiers, front steps, plant on the roof
    b.box(0, -33.9, 30, 13.8, 5, CW, 0, true, 'conc'); rim(-15, -40.8, 15, -27, 5, CW2); b.box(0, -35.5, 18, 9.5, 2.6, CW2, 5, false, 'conc'); rim(-9, -40.25, 9, -30.75, 7.6, CW);
    b.box(0, -26.65, 6, .7, .2, CW2, 0, true, 'conc'); b.box(0, -26.3, 6, .7, .2, CW2, 0, false, 'conc'); b.box(0, -26.65, 6, .7, .2, CW2, .2, true, 'conc');                 // steps to the door
    door(0, -27, 2.6, 2.7, 0, 1); [-12, -9, -6, 6, 9, 12].forEach(function (x) { win(x, -27, 1.7, 1.2, 1.3, 0, 1); win(x, -27, 1.7, 1, 3.5, 0, 1); }); [-3.5, 3.5].forEach(function (x) { win(x, -30.75, 2.2, 1, 5.9, 0, 1); lampW(x * 1.2, -27, 3.1, 0, 1); });
    [[-12.5, -30], [-12.5, -32.5], [12.5, -30], [12.5, -32.5]].forEach(function (q) { acu(q[0], q[1], 5); }); b.box(-11.5, -37, 2.5, 2, .8, 0x8d9396, 5, false, 'metal'); b.box(11.5, -37, 1.2, 1.2, 1.4, 0x8d9396, 5, false, 'metal');
    // plaza planter with the big tree: a 1.1 m rim makes waist-high cover; crate rows on its two long sides, steps on the south
    b.box(0, 9, 9.2, 7.2, .95, 0x4d5a34, 0, true, 'plain'); [[0, 5.15, 10, .5], [0, 12.85, 10, .5], [-4.75, 9, .5, 7.2], [4.75, 9, .5, 7.2]].forEach(function (q) { b.box(q[0], q[1], q[2], q[3], 1.1, CW, 0, true, 'conc'); });
    tree(0, 9, 1.5, true); b.box(0, 13.5, 3, .8, .25, CW2, 0, false, 'conc'); b.box(0, 13.3, 3, .4, .5, CW2, 0, false, 'conc');
    [-1, 1].forEach(function (sd) { for (i = 0; i < 4; i++) cr(sd * 5.6, 6.6 + i * 1.6, .9, .8, OLV); });
    // gate corridor: attackers' start
    hazard(0, 31.2, 12, .5); [-2, 2].forEach(function (x) { b.box(x, 24.2, .25, .25, 1, 0xd0b03a, 0, true, 'metal'); });                                                       // bollards at the plaza mouth

    // ---------- one half, mirrored. u = distance from the centre line
    function half(sd) {
      function B(u0, z0, u1, z1, h, c, t, y0, solid) { b.box(sd * (u0 + u1) / 2, (z0 + z1) / 2, Math.abs(u1 - u0), Math.abs(z1 - z0), h, c, y0 || 0, solid, t || 'conc'); }
      function stair(u, z, du, dz, wd) {                                            // four steps up to the site floor
        for (var k = 0; k < 4; k++) b.box(sd * (u + du * (k * .5 + .25)), z + dz * (k * .5 + .25), du ? .5 : wd, du ? wd : .5, .35 * (k + 1), 0x9d998e, 0, true, 'conc');
        links.push({ a: [sd * (u - du * .8), z - dz * .8, 0], b: [sd * (u + du * 2.7), z + dz * 2.7, 1] });
        [-1, 1].forEach(function (e) { var ou = du ? 0 : e * (wd / 2 + .12), oz = du ? e * (wd / 2 + .12) : 0; b.seg(sd * (u + ou), 1, z + oz, sd * (u + du * 2 + ou), 2.4, z + dz * 2 + oz, .07, DK, 'metal'); b.box(sd * (u + ou), z + oz, .08, .08, 1, DK, 0, false, 'metal'); });   // handrails
      }
      var A = sd < 0;
      // thick fortified corners behind the site, with the watch tower on top (dressing: nobody gets in)
      B(15, -40.8, 53.3, -34, 4.8, CW, 'conc'); B(50, -34, 53.3, -13, 4.8, CW, 'conc'); B(15, -34.2, 50, -34, 5, CW2, 'conc', 0, false);
      b.cyl(sd * 49.5, -37.5, 3.1, 6.2, CW, 0, false, 'conc', 3.1, 8); b.cyl(sd * 49.5, -37.5, 3.45, .3, CW2, 6.2, false, 'conc', 3.45, 8); b.cyl(sd * 49.5, -37.5, 3, 1.25, 0x23292d, 6.5, false, 'plain', 3, 8);
      b.cyl(sd * 49.5, -37.5, 3.7, .3, CW2, 7.75, false, 'conc', 3.5, 8); for (i = 0; i < 8; i++) b.box(sd * 49.5 + Math.cos(i * PI / 4 + PI / 8) * 3.05, -37.5 + Math.sin(i * PI / 4 + PI / 8) * 3.05, .3, .3, 1.25, CW, 6.5, false, 'conc');
      b.seg(sd * 49.5, 8.05, -37.5, sd * 49.5, 9.6, -37.5, .08, DK, 'metal'); b.box(sd * 48.2, -36.4, .5, .4, .4, 0xd8d2bc, 8.05, false, 'metal');
      // the site: a yard 1.4 m above the plaza, walled on its open sides, three ways up
      B(31, -34, 50, -13, H, 0x96928a, 'conc'); b.quad('siteX', sd * 39.5, H + .03, -22.5, 5.2, 5.2, 0, { flat: true, mode: 'alpha', make: siteMark }); plantZone(b, sd * 39.5, -22.5, H);
      // wear and dirt: rust under the wall lamps, bullet marks, cracks and stains, tyre tracks in the lane
      decal(b, 'rust', sd * 52.95, 2.6, -8, .9, 2.6, -sd * PI / 2); decal(b, 'rust', sd * 52.95, 2.6, 16, .9, 2.6, -sd * PI / 2); decal(b, 'rust', sd * 40, 2.4, 40.45, .9, 2.4, PI); decal(b, 'rust', sd * 30.94, 2.6, -24, .8, 2.2, sd * PI / 2);
      decal(b, 'holes', sd * 12.06, 1.5, -9, 1.4, 1.4, sd * PI / 2); decal(b, 'holes', sd * 26.7, 1.4, 4, 1.4, 1.4, -sd * PI / 2); decal(b, 'holes', sd * 34.94, 1.6, 9, 1.2, 1.2, -sd * PI / 2); decal(b, 'holes', sd * 36, H + 1.3, -13.56, 1.3, 1.3, PI);
      decal(b, 'crack', sd * 20, .03, 14, 5, 5, .4, true); decal(b, 'crack', sd * 41, .03, -3, 4, 4, 1.2, true); decal(b, 'crack', sd * 41, H + .03, -27, 4, 4, .7, true);
      decal(b, 'stain', sd * 33, .03, 20, 3, 3, 0, true); decal(b, 'stain', sd * 15, .03, 3, 2.6, 2.6, 1, true); decal(b, 'stain', sd * 44, .03, 30, 3.4, 3.4, 2, true); decal(b, 'stain', sd * 47, H + .03, -17, 2.6, 2.6, 0, true); decal(b, 'tracks', sd * 49, .03, 8, 2.4, 12, 0, true); decal(b, 'tracks', sd * 30, .03, 29, 2.4, 12, PI / 2, true);
      [[-34, -29.4], [-27, -18.6], [-15.4, -13]].forEach(function (q) { B(31, q[0], 31.5, q[1], 3.8, CW, 'conc'); });                        // east wall, gaps for the two stairs
      [[31, 38], [42, 50]].forEach(function (q) { B(q[0], -13.5, q[1], -13, 3.8, CW, 'conc'); });                                            // south wall, gap for the wide stairs
      stair(29, -17, 1, 0, 3); stair(29, -28.2, 1, 0, 2.2); stair(40, -11, 0, -1, 4);
      [[-18.6, -15.4], [-29.4, -27]].forEach(function (q) { B(31, q[0], 31.5, q[1], .4, CW2, 'conc', 3.4, false); }); B(38, -13.5, 42, -13, .4, CW2, 'conc', 3.4, false);       // lintels over the stair openings
      lampW(sd * 31.5, -22, H + 2.1, sd, 0); lampW(sd * 40, -34, H + 2.6, 0, 1); lampW(sd * 50, -23, H + 2.6, -sd, 0); lampW(sd * 35, -13.5, H + 2.1, 0, -1); lampW(sd * 45, -13.5, H + 2.1, 0, -1);
      mk(A ? 'A' : 'B', sd * 31.02, 2.9, -21.5, sd > 0 ? -PI / 2 : PI / 2); mk(A ? 'A' : 'B', sd * 36, 2.9, -13.52, 0);
      if (A) {   // A: red cargo container and green military storage
        ctn(sd * 35.6, -31.2, false, 0xa5432f, H); ctn(sd * 47.6, -21.6, true, 0x56633f, H);
        cr(sd * 43.2, -30.6, 1.3, 1.2, OLV, H); cr(sd * 44.6, -30.5, 1.3, 1.2, OLV, H); cr(sd * 43.9, -29.1, 1, .8, OLV, H); cr(sd * 43.9, -30.5, 1, .8, 0x4e5637, H + 1.2);
        cr(sd * 33, -24.6, 1.3, 1.2, TAN, H); cr(sd * 33, -23.2, 1, .8, TAN, H); cr(sd * 42.6, -15.2, 1.3, 1.2, TAN, H); cr(sd * 44, -15.3, 1, .8, OLV, H); cr(sd * 35.4, -18.6, 1, .8, OLV, H);
      } else {   // B: blue cargo container and stacks of boxes
        ctn(sd * 47.6, -21.6, true, 0x4d6f8f, H);
        cr(sd * 34, -31.5, 1.3, 1.2, TAN, H); cr(sd * 35.4, -31.5, 1.3, 1.2, TAN, H); cr(sd * 36.8, -31.5, 1.3, 1.2, TAN, H); cr(sd * 34.7, -31.5, 1.1, .9, TAN, H + 1.2); cr(sd * 35.1, -30, 1, .8, 0x9c8a62, H);
        cr(sd * 43.2, -30.6, 1.3, 1.2, OLV, H); cr(sd * 44.6, -30.5, 1.3, 1.2, OLV, H); cr(sd * 43.9, -29.1, 1, .8, OLV, H);
        cr(sd * 33, -24.6, 1.3, 1.2, TAN, H); cr(sd * 33, -23.2, 1.3, 1.2, TAN, H); cr(sd * 33, -23.9, 1, .8, TAN, H + 1.2); cr(sd * 42.6, -15.2, 1.3, 1.2, TAN, H); cr(sd * 44, -15.3, 1.3, 1.2, TAN, H); cr(sd * 35.4, -18.6, 1, .8, TAN, H);
      }
      // HQ side yard (the narrow stairs start here) and the court beside the central building
      cr(sd * 17.2, -32.6, 1.3, 1.2, OLV); cr(sd * 18.6, -32.7, 1.3, 1.2, OLV); cr(sd * 17.9, -32.6, 1, .8, OLV, 1.2); cr(sd * 26.5, -32.8, 1, .8, TAN);
      cr(sd * 13, -19.2, 1.3, 1.2, OLV); cr(sd * 14.4, -19.2, 1.3, 1.2, OLV); cr(sd * 24, -24.5, 1.3, 1.2, TAN); b.jersey(sd * 22, -11.5, 3, true);
      // wall from the central building to the plaza wall, with the gateway that lets you round the building
      B(12, -5.25, 17.5, -4.75, 3.8, CW, 'conc'); B(21.5, -5.25, 27.25, -4.75, 3.8, CW, 'conc'); B(17.2, -5.4, 21.8, -4.6, .7, CW2, 'conc', 3.1, false); B(17.3, -5.4, 17.7, -4.6, 3.1, CW2, 'conc', 0, false); B(21.3, -5.4, 21.7, -4.6, 3.1, CW2, 'conc', 0, false);
      lampW(sd * 19.5, -4.75, 3.3, 0, 1); lampW(sd * 19.5, -5.25, 3.3, 0, -1); hazard(sd * 19.5, -5, 3.6, .5);
      // plaza side wall with one gap toward the outer lane; short return wall north of it
      B(26.75, -5.25, 27.25, 8, 3.8, CW, 'conc'); B(26.75, 12, 27.25, 22, 3.8, CW, 'conc'); B(27.75, -13, 28.25, -8.5, 3.8, CW, 'conc'); lampW(sd * 26.75, 2, 2.9, -sd, 0); lampW(sd * 26.75, 17, 2.9, -sd, 0); lampW(sd * 27.25, 2, 2.9, sd, 0); hazard(sd * 27, 10, .5, 3.6);
      // plaza cover
      cr(sd * 17.3, 8.3, 1.3, 1.2, TAN); cr(sd * 18.7, 8.3, 1.3, 1.2, TAN); cr(sd * 18, 9.7, 1, .8, TAN); cr(sd * 19.6, .6, 1.3, 1.2, OLV); cr(sd * 19.6, 2, 1, .8, OLV); cr(sd * 11, 18.5, 1.3, 1.2, OLV); b.jersey(sd * 12, -1, 3, false);
      // south side of the plaza: wall, shed with a pitched iron roof, striped opening to the cross alley
      B(5.5, 26.2, 13, 26.8, 3.8, CW, 'conc'); B(13, 22, 20, 27, 3, 0x8a8f8c, 'block'); var rf = new T.BoxGeometry(7.6, .14, 5.8); rf.rotateZ(sd * .2); rf.translate(sd * 16.5, 3.75, 24.5); b.geo(rf, 0x7a6a58, 'corr', {});
      door(sd * 16.5, 22, 2, 2.3, 0, -1); hazard(sd * 23.6, 24.5, 6.6, .6); lampW(sd * 9, 26.2, 2.9, 0, -1);
      // guard building beside the gate
      B(6, 31, 18, 40.8, 3.6, CW, 'conc'); rim(sd > 0 ? 6 : -18, 31, sd > 0 ? 18 : -6, 40.5, 3.6, CW2); win(sd * 6, 34, 1.6, 1.1, 1.3, -sd, 0); win(sd * 6, 37.5, 1.6, 1.1, 1.3, -sd, 0); win(sd * 10, 31, 1.6, 1.1, 1.3, 0, -1); win(sd * 14.5, 31, 1.6, 1.1, 1.3, 0, -1); door(sd * 18, 34, 1.1, 2.2, sd, 0);
      acu(sd * 14, 36, 3.6); lampW(sd * 6, 32, 2.9, -sd, 0); lampW(sd * 12, 31, 2.9, 0, -1);
      // corner yard: tent store, stacked boxes, a barred side gate in the wall (closed)
      B(42.5, 34, 49.5, 39, 2.3, 0x5f6a45, 'canvas'); B(42.3, 33.8, 49.7, 39.2, .15, 0x55603f, 'canvas', 2.3, false); cr(sd * 41.2, 35.2, 1.3, 1.2, OLV); cr(sd * 41.2, 36.6, 1, .8, OLV);
      cr(sd * 22.5, 34.4, 1.3, 1.2, OLV); cr(sd * 23.9, 34.4, 1.3, 1.2, OLV); cr(sd * 23.2, 35.8, 1.3, 1.2, OLV); cr(sd * 23.2, 34.4, 1, .8, OLV, 1.2);
      B(29, 40.35, 35, 40.5, 3.2, 0x2c3134, 'metal', 0, false); for (i = 0; i < 7; i++) b.box(sd * (29.4 + i * .9), 40.3, .08, .08, 3.2, 0x1f2326, 0, false, 'metal'); b.jersey(sd * 33, 30.5, 3, false);
      // outer lane: store sheds to weave round, an office against the wall
      B(35, 5, 45, 12, 3.6, CW, 'conc'); rim(sd > 0 ? 35 : -45, 5, sd > 0 ? 45 : -35, 12, 3.6, CW2); door(sd * 35, 8.5, 1.2, 2.2, -sd, 0); win(sd * 40, 5, 1.6, 1.1, 1.3, 0, -1);
      B(37, 12, 47, 20, 3, 0x8a8f8c, 'block'); var r2 = new T.BoxGeometry(10.6, .14, 8.6); r2.rotateZ(-sd * .16); r2.translate(sd * 42, 3.85, 16); b.geo(r2, 0x74655a, 'corr', {}); door(sd * 42, 20, 2.4, 2.4, 0, 1);
      B(46, -9, 53.3, -1, 3.6, CW, 'conc'); win(sd * 46, -5, 1.6, 1.1, 1.3, -sd, 0); door(sd * 46, -2.5, 1.1, 2.2, -sd, 0); acu(sd * 50, -5, 3.6);
      cr(sd * 31.5, 1, 1.3, 1.2, TAN); cr(sd * 31.5, 2.4, 1, .8, TAN); cr(sd * 50.5, 12.5, 1.3, 1.2, OLV); cr(sd * 50.5, 13.9, 1, .8, OLV); cr(sd * 33.5, -4, 1.3, 1.2, OLV); b.jersey(sd * 38, -5.5, 3, false); b.jersey(sd * 31, 23, 3, true);
      lampW(sd * 45, 9, 2.9, sd, 0); lampW(sd * 37, 16, 2.6, -sd, 0); lampW(sd * 46, -5, 2.9, -sd, 0);
      // more of the compound from the reference picture: stores along the outer wall, a workshop with a rusty roof,
      // painted containers in the lane and yard, extra wall stubs that break up the long views
      B(48.5, 20.5, 53.3, 27, 3.4, CW, 'conc'); door(sd * 48.5, 23.5, 1.2, 2.2, -sd, 0); B(48.5, -13, 53.3, -9, 3.4, CW, 'conc');
      B(47, 28.5, 53.3, 32.5, 3, 0x8a8f8c, 'block'); var r3 = new T.BoxGeometry(6.9, .14, 4.6); r3.rotateZ(sd * .18); r3.translate(sd * 50.1, 3.7, 30.5); b.geo(r3, 0x8a4f38, 'corr', {});
      b.cont(sd * 30.2, 14.5, true, A ? 0x7a3f30 : 0x3f5f7a, 0, 6.1); b.cont(sd * 37, 37.4, false, 0x596a4a, 0, 6.1); b.cont(sd * 24.5, -30.5, false, A ? 0x596a4a : 0x8a7a52, 0, 6.1);
      B(31.5, -9.2, 36, -8.8, 2.6, CW, 'conc'); B(41, 22.8, 46, 23.2, 2.6, CW, 'conc'); B(20.8, 12, 21.2, 17, 2.2, CW, 'conc'); B(8, -24, 12, -23.6, 1.1, CW, 'conc');
      b.barrel(sd * 34.2, 20.6, 0x7a3f30); b.barrel(sd * 34.9, 21.2, OLV); b.barrel(sd * 47.5, 3.2, 0x3f5f7a); b.barrel(sd * 20.5, 28.2, OLV); b.tires(sd * 44.5, 26.5, 3);
      [[36, 26.5], [47.5, -11.5], [22.8, 19.5]].forEach(function (q) { b.box(sd * q[0], q[1], .8, .5, 1.3, 0x5a6168, 0, true, 'metal'); b.glow(sd * q[0], 1, q[1] + .26, .12, .08, .02, 0x8fe0a8); });                       // electrical cabinets
      for (i = 0; i < 5; i++) b.box(sd * 52.95, -30 + i * 14, .12, .12, 4, 0x9a7a60, .4, false, 'rust');                                                                                       // rusty downpipes on the wall
      b.seg(sd * 18, 3.5, 31, sd * 27, 3.7, 22, .03, 0x1c1c1c, 'plain'); b.seg(sd * 27, 3.7, 12, sd * 35, 3.5, 12, .03, 0x1c1c1c, 'plain');
    }
    function mk(t, x, y, z, ry) { b.mark(t, x, y, z, 1.5, 1.5, ry, '#e2562f'); }
    half(-1); half(1);
    // trees beyond the wall, seen over it
    [[-60, -30], [-61, -8], [-59, 14], [-62, 33], [60, -32], [62, -10], [59, 12], [61, 34], [-40, -47], [-12, -48], [22, -47], [44, -48], [-45, 47], [-22, 48], [24, 48], [46, 47]].forEach(function (q, n) { tree(q[0], q[1], 1.2 + (n % 3) * .25); });
    [-4, -2, 0, 2, 4].forEach(function (x) { b.spawns.A.push({ x: x, z: 36 }); b.spawns.B.push({ x: x, z: -22.5 }); });
    decal(b, 'tracks', 0, .03, 30, 2.6, 14, 0, true); decal(b, 'tracks', 0, .03, 18, 2.6, 10, .05, true); decal(b, 'holes', -4, 1.6, -3.94, 1.4, 1.4, 0); decal(b, 'holes', 6, 1.3, -3.94, 1.2, 1.2, 0); decal(b, 'crack', -8, .03, 20, 5, 5, 2, true); decal(b, 'stain', 6, .03, -1, 3, 3, 0, true); decal(b, 'rust', -5.9, 2.4, 40.6, .8, 2.6, PI); decal(b, 'rust', 5.9, 2.4, 40.6, .8, 2.6, PI);
    function site(id, sd) {
      return siteDef(id, sd * 39.5, -22.5, H, 1, [[sd * 40, 29, 0], [sd * 31, 3, 0], [sd * 19.5, 0, 0], [sd * 40, -8, 0], [sd * 22, -15, 0]]);
    }
    return { name: '전술 기지', b: b, bounds: { minx: -54, maxx: 54, minz: -41.5, maxz: 41.5 }, bg: 0x93a7b8, fog: [50, 220], hemi: [0xe2ebf2, 0x6a5c48, 1], sun: [0xffd2a0, 1.5, [-38, 22, 24]], rain: false, sky: [0x3a6aa6, 0xd9cdb4], hdri: ['day', .7, 1.3, 8, .95], dim: 1,   // low, warm late-afternoon sun as in the picture
      H: H, lod: [40, 80], links: links, ladders: [], sites: [site('A', -1), site('B', 1)],
      fwd: [[-19.5, -9, 0], [19.5, -9, 0], [-40, -8, 0], [40, -8, 0], [0, -22, 0], [-36, -18, 1], [36, -18, 1], [-24, -30, 0], [24, -30, 0]] };
  }

  // 06 설산 연구기지 — 사용자가 준 시안과 설명문(맵 2)을 옮겼다. 북쪽이 -z. 실내 비중이 높고 비대칭이다.
  //  · 가운데 30 x 30 m 트럭 하역장(야외)이 모든 실내 구역을 잇는 교차점. 트럭, 팔레트, 컨테이너가 시야를 끊는다.
  //  · 북서: 푸른빛 원자로 연구실(18 x 20, 천장 6 m). 그 동쪽으로 통제실·실험실. 하역장 북쪽 가로 복도가 이들을 잇는다(수비 출발).
  //  · A = 남서 창고(20 x 20, 천장 5.5 m): 넓은 동문, 좁은 북문(병목), 바깥으로 난 남쪽 셔터. B = 북동 물류 창고(22 x 20): 복도 끝에서 곧게 들어간다.
  //  · 남동: 방 넷과 복도로 된 연구동. 남쪽 가운데 보안 게이트(공격 출발)에서 왼쪽 외곽 / 하역장 / 오른쪽 외곽 세 갈래.
  //  · 바깥은 눈밭 외곽 도로이고, 북쪽과 가장자리는 눈 덮인 벼랑이 막는다. 위성 안테나·레이돔(북서), 저장 탱크(북동)는 장식이다.
  function arctic() {
    var b = Builder(), PN = 0x6c7884, PN2 = 0x55626e, SNOW = 0xc3ccd6, ROCK = 0x737b86, DK = 0x2c3238, OLV = 0x56604a, TAN = 0xa89a78, WHT = 0xc9d0d6, i;
    function T2(x0, z0, x1, z1, h, c, t, y0, solid) { b.box((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(z1 - z0), h, c, y0 || 0, solid, t || 'plain'); }
    // walls with door openings: gaps are [from, to] along the wall; each gets a lintel above 2.5 m
    function WX(z, x0, x1, h, gaps, c) { var cur = x0; (gaps || []).concat([[x1, x1]]).forEach(function (g) { if (g[0] > cur + .01) T2(cur, z - .2, g[0], z + .2, h, c || PN, 'conc'); if (g[1] > g[0]) { T2(g[0], z - .2, g[1], z + .2, h - 2.5, c || PN, 'conc', 2.5, false); T2(g[0] - .06, z - .26, g[0] + .06, z + .26, 2.5, DK, 'metal', 0, false); T2(g[1] - .06, z - .26, g[1] + .06, z + .26, 2.5, DK, 'metal', 0, false); } cur = g[1]; }); }
    function WZ(x, z0, z1, h, gaps, c) { var cur = z0; (gaps || []).concat([[z1, z1]]).forEach(function (g) { if (g[0] > cur + .01) T2(x - .2, cur, x + .2, g[0], h, c || PN, 'conc'); if (g[1] > g[0]) { T2(x - .2, g[0], x + .2, g[1], h - 2.5, c || PN, 'conc', 2.5, false); T2(x - .26, g[0] - .06, x + .26, g[0] + .06, 2.5, DK, 'metal', 0, false); T2(x - .26, g[1] - .06, x + .26, g[1] + .06, 2.5, DK, 'metal', 0, false); } cur = g[1]; }); }
    function roof(x0, z0, x1, z1, h) { T2(x0 - .2, z0 - .2, x1 + .2, z1 + .2, .3, 0xd3d9df, 'plain', h); }
    function flr(x0, z0, x1, z1, c, t) { T2(x0, z0, x1, z1, .03, c, t || 'floor', 0, false); }
    function lamp(x, z, h, c, k, d) { b.light(x, h - .6, z, c || 0xffe6bf, k || 1.7, d || 16); b.box(x, z, 1.2, .3, .08, 0x3a3f44, h - .1, false, 'metal'); b.glow(x, h - .14, z, 1.1, .05, .22, c || 0xffe6bf); }
    function cr(x, z, sz, h, c, y0) { b.crate(x, z, sz, c, y0 || 0, h); if (y0 > .5) b.solid(x, z, sz, sz, h, y0); }
    function shelf(x, z, ry, n, alongX) { for (var k = 0; k < n; k++) { var px = x + (alongX ? k * 1.12 : 0), pz = z + (alongX ? 0 : k * 1.12); if (!b.prop('steel_frame_shelves_01', px, pz, ry, .1)) { b.box(px, pz, alongX ? 1.1 : .5, alongX ? .5 : 1.1, 2.1, 0x59636b, 0, true, 'metal'); } else if (k % 2 === 0) b.box(px, pz, .5, .4, .35, k % 4 ? TAN : OLV, .62, false, 'crate'); } }
    function desk(x, z, ry) { if (!b.prop('metal_office_desk', x, z, ry, 1)) b.box(x, z, 1.9, .9, .78, 0x7c858c, 0, true, 'metal'); }
    function console(x, z, alongX, c) { b.box(x, z, alongX ? 2.2 : .8, alongX ? .8 : 2.2, .95, 0x4a545c, 0, true, 'metal'); b.box(x, z, alongX ? 2.2 : .5, alongX ? .5 : 2.2, .55, 0x39424a, .95, false, 'metal'); b.glow(x, 1.25, z, alongX ? 1.9 : .52, .32, alongX ? .52 : 1.9, c || 0x6fd0ff); }
    function mound(x, z, r, h, solid) { var g = new T.IcosahedronGeometry(1, 1); g.scale(r, h, r * (.7 + Math.random() * .5)); g.rotateY(Math.random() * 3); g.translate(x, 0, z); b.geo(g, SNOW, 'snow', {}); if (solid) b.solid(x, z, r * 1.3, r * 1.1, h * .8, 0); }
    function ctn(x, z, alongZ, c) { b.cont(x, z, alongZ, c, 0, 6.1); T2(x - (alongZ ? 1.3 : 3.1), z - (alongZ ? 3.1 : 1.3), x + (alongZ ? 1.3 : 3.1), z + (alongZ ? 3.1 : 1.3), .12, SNOW, 'snow', 2.5, false); }
    lamp = (function () { return function (x, z, h, c, k, d) { b.light(x, h - .6, z, c || 0xffe6bf, k || 1.7, d || 16); var o = b.tier; b.tier = 1; b.box(x, z, 1.2, .3, .08, 0x3a3f44, h - .1, false, 'metal'); b.glow(x, h - .14, z, 1.1, .05, .22, c || 0xffe6bf); b.tier = o; }; })();
    function siteMark() { var a = cv(256, 256), x = a[1]; x.strokeStyle = '#c24a32'; x.lineWidth = 12; [104, 70].forEach(function (r) { x.beginPath(); x.arc(128, 128, r, 0, 6.2832); x.stroke(); }); x.lineWidth = 16; x.beginPath(); x.moveTo(72, 72); x.lineTo(184, 184); x.moveTo(184, 72); x.lineTo(72, 184); x.stroke(); return a[0]; }

    // ---------- ground: snow everywhere, concrete inside and on the loading yard, tyre tracks on the outer road
    b.box(0, 0, 136, 110, .4, SNOW, -.4, false, 'plain');
    flr(-45, -12, -15, 22, 0x858b91); flr(-25, -36, 42, -12, 0x858b91); flr(15, -12, 42, 22, 0x858b91); flr(-15, -12, 15, 22, 0x62676c, 'conc'); flr(-4, 22, 4, 28, 0x62676c, 'conc');
    [[-50.5, 14, 2.2, 56], [50, 6, 2.2, 70], [0, 37.5, 96, 2.2], [0, 33, 3, 8]].forEach(function (q) { T2(q[0] - q[2] / 2, q[1] - q[3] / 2, q[0] + q[2] / 2, q[1] + q[3] / 2, .02, 0xb7c1cc, 'plain', 0, false); });

    // ---------- cliffs and plateaus that close the map (snow on top, rock faces), with the landmarks standing on them
    T2(-60, -50, 60, -36, 5, SNOW, 'snow'); T2(-60, -36, -25, -14, 5, SNOW, 'snow'); T2(-25, -36, -23, -16, 6, PN2, 'conc'); T2(42, -36, 60, -30, 5, SNOW, 'snow'); T2(20.2, -36, 42, -32.2, 5, SNOW, 'snow');
    T2(-60, -14, -56, 48, 5, SNOW, 'snow'); T2(56, -30, 60, 48, 5, SNOW, 'snow'); T2(-56, 44, 56, 48, 5, SNOW, 'snow');
    [[-56, 0, .4], [-55.6, 22, -.3], [-55.5, 38, .2], [-40, 43.6, 1.4], [-12, 43.8, 1.7], [20, 43.6, 1.5], [44, 43.7, 1.6], [55.6, 30, .3], [55.7, 8, -.2], [55.6, -14, .4], [50, -29.6, 1.5], [-50, -14.3, 1.6], [-36, -14.2, 1.4]].forEach(function (q, n) { b.rbox(q[0], q[1], 2.2 + (n % 3), 5 + (n % 4) * 1.5, 3.2 + (n % 3) * .8, ROCK, 0, q[2], false, 'plain'); });
    // satellite dish and radome (north-west), two storage tanks (north-east)
    b.cyl(-46, -27, .9, 1.2, 0x7d868e, 5, false, 'conc', 1.2, 10); b.cyl(-46, -27, .4, 4.2, 0x8e979e, 6.2, false, 'plain', .4, 10);
    (function () { var pts = [], k; for (k = 0; k <= 8; k++) pts.push(new T.Vector2(k * .55, k * k * .022)); var g = new T.LatheGeometry(pts, 20); g.rotateX(-1.0); g.rotateY(-.7); g.translate(-46, 10.6, -27); b.geo(g, 0xd9dfe4, 'plain', {}); b.seg(-46, 10.6, -27, -44.6, 12.2, -25.2, .1, 0x596268, 'metal'); })();
    b.cyl(-52, -20, 2.6, 1.4, 0x8a939b, 5, false, 'conc', 2.6, 14); (function () { var g = new T.IcosahedronGeometry(3.3, 2); g.translate(-52, 8.6, -20); b.geo(g, 0xe9eef2, 'plain', {}); })();
    [[38, -42], [45.5, -42]].forEach(function (q) { b.cyl(q[0], q[1], 3.1, 6.5, 0xc4ccd3, 5, false, 'plain', 3.1, 18); b.cyl(q[0], q[1], 3.1, 1, 0xb3bcc4, 11.5, false, 'plain', .6, 18); b.cyl(q[0], q[1], 3.2, .2, 0x7d868e, 8, false, 'metal', 3.2, 18); });
    b.seg(41, 9, -42, 42.5, 9, -42, .25, 0x8e979e, 'metal');

    // ---------- west wing: site A warehouse, service store, the north-south corridor beside them, rooms toward the yard
    WZ(-45, 2, 22, 5.5); WX(22, -45, -25, 5.5, [[-40, -36]]); WZ(-25, 2, 22, 5.5, [[4.5, 7.5]]); WX(2, -45, -25, 5.5, [[-38, -35.5]]); roof(-45, 2, -25, 22, 5.5);
    WZ(-45, -12, 2, 3.4, [[-6, -3]]); WX(-12, -45, -25, 3.4); WZ(-25, -12, 2, 3.4, [[-9, -6.5]]); roof(-45, -12, -25, 2, 3.4);
    WZ(-25, -16, -12, 3.4); WX(-16, -25, -23, 3.4); WZ(-21, -10, 8, 3.4, [[-6, -3.5], [3.5, 6.5]]); WX(8, -25, -21, 3.4); roof(-25, -16, -21, 8, 3.4);
    WX(2, -21, -15, 3.4); roof(-21, -12, -15, 8, 3.4);
    T2(-25, 8, -15, 22, 4.2, PN2, 'conc'); b.quad('shutter', -14.97, 1.8, 15, 4, 3.4, PI / 2); T2(-25.3, 8, -14.7, 22.3, .3, SNOW, 'snow', 4.2, false);           // closed store between A and the yard
    b.quad('shutter', -38, 2.2, 22.23, 3.8, 1, 0); b.mark('A', -33, 3.6, 22.25, 2, 2, 0, '#e2562f'); b.mark('A', -24.75, 2.9, 0, 1.4, 1.4, PI / 2, '#e2562f');
    // ---------- yard walls (thick), north cross corridor
    T2(-21, -12, -2, -10, 4, PN2, 'conc'); T2(2, -12, 24, -10, 4, PN2, 'conc'); T2(-2, -12, 2, -10, 1.3, PN2, 'conc', 2.7, false);
    WZ(-15, -10, 8, 4, [[-6, -3.5], [3.5, 6.5]]); WZ(15, -10, 20, 4, [[-6, -3.5], [3.5, 6.5]]);
    T2(-15, 20, -4, 22, 4, PN2, 'conc'); T2(4, 20, 15, 22, 4, PN2, 'conc'); T2(-4, 20, 4, 22, 1, DK, 'metal', 3.2, false); b.quad('hazard', 0, 3.7, 22.02, 8, .5, 0, { rep: [8, .5] });
    roof(-25, -16, 20, -12, 3.4); WX(-16, -5, 7, 4, [[0, 2.5]]); WX(-16, 7, 20, 4, [[12, 14.5]]);
    // ---------- north: reactor lab (tall), control room and labs
    WZ(-23, -36, -16, 6, null, 0x4a5c6e); WX(-36, -23, -5, 6, null, 0x4a5c6e); WX(-16, -23, -5, 6, [[-15, -12]], 0x4a5c6e); WZ(-5, -36, -16, 6, [[-29, -26.5]], 0x4a5c6e); roof(-23, -36, -5, -16, 6);
    WX(-36, -5, 20, 4); WX(-26, -5, 7, 4, [[0, 2.5]]); WZ(7, -36, -16, 4, [[-23, -20.5]]); WZ(20, -36, -32, 4); roof(-5, -36, 20, -16, 4);
    // ---------- north-east: site B warehouse
    WX(-32, 20, 42, 5.5); WZ(20, -32, -16, 5.5, [[-30, -27.5]]); WZ(42, -32, -12, 5.5, [[-24, -20]]); WX(-12, 20, 42, 5.5, [[24, 27]]); roof(20, -32, 42, -12, 5.5);
    b.quad('shutter', 42.23, 2.2, -27, 3.8, 1, PI / 2); b.mark('B', 42.25, 3.6, -16.5, 2, 2, PI / 2, '#e2562f'); b.mark('B', 19.75, 2.9, -14, 1.4, 1.4, -PI / 2, '#e2562f');
    // ---------- south-east: research wing, four rooms on a corridor
    WX(2, 15, 24, 3.4); WX(8, 15, 24, 3.4); WZ(24, -12, 2, 3.4, [[-6, -3.5]]); WZ(24, 8, 22, 3.4, [[14, 16.5]]); WX(22, 15, 24, 3.4);
    WZ(27, -12, 22, 3.4, [[-4, -1.5], [12, 14.5]]); WX(5, 27, 42, 3.4); WZ(42, -12, 22, 3.4, [[15, 18]]); WX(22, 27, 42, 3.4); T2(24, 21.8, 27, 22.2, .9, PN, 'conc', 2.5, false); roof(15, -12, 42, 22, 3.4);
    // ---------- gate: guard posts either side of the forecourt, barrier arms up, floodlights
    T2(-9, 22, -4, 27, 3, PN, 'conc'); T2(4, 22, 9, 27, 3, PN, 'conc'); T2(-9.3, 21.9, -3.7, 27.3, .3, SNOW, 'snow', 3, false); T2(3.7, 21.9, 9.3, 27.3, .3, SNOW, 'snow', 3, false);
    [-1, 1].forEach(function (sd) { b.box(sd * 4.02, 24.5, .06, 1.6, 1, 0x1b262c, 1.3, false, 'plain'); b.box(sd * 3.6, 27.6, .3, .3, 1.1, 0xd0b03a, 0, true, 'metal'); b.seg(sd * 3.6, 1.1, 27.6, sd * 3.2, 3.6, 27.6, .1, 0xd8d2bc, 'metal'); b.lamp(sd * 10, 32, 6.5, -sd, 0); });
    b.quad('hazard', 0, .025, 27.8, 7.4, .6, 0, { flat: true, rep: [7.4, .6] });

    // ---------- loading yard: the lorry stands askew in the middle; pallets, a container and barriers cut the long views
    (function () { var a = -.5, c = Math.cos(a), sn = Math.sin(a), cx = 1, cz = 5; function at(l) { return [cx + l * c, cz - l * sn]; }
      var p = at(-1.2); b.rbox(p[0], p[1], 9.6, 2.6, 2.8, WHT, 1.1, a, false, 'plain'); b.rbox(p[0], p[1], 9.8, 2.7, .12, SNOW, 3.9, a, false, 'plain'); b.rbox(p[0], p[1], 9.6, 1.1, .5, DK, .6, a, false, 'metal');
      p = at(5.2); b.rbox(p[0], p[1], 2.3, 2.5, 2.5, 0x596873, .7, a, false, 'paint'); b.rbox(p[0] + .9 * c, p[1] - .9 * sn, .1, 2.1, .9, 0x1b262c, 2.1, a, false, 'plain');
      [-4.6, -3.2, 2.4, 5.4].forEach(function (l) { [-1.15, 1.15].forEach(function (o) { var q = at(l); b.rbox(q[0] + o * sn, q[1] + o * c, 1, .35, 1, 0x17191b, 0, a, false, 'plain'); }); });
      p = at(.6); b.rsolid(p[0], p[1], 13.2, 2.7, 3.9, 0, a); })();
    b.pallet(9, 12, 0); cr(9, 12, 1.3, 1.2, TAN, .14); b.pallet(10.6, 13.4, 0); cr(10.6, 13.4, 1.3, 1.2, TAN, .14); b.solid(9, 12, 1.3, 1.3, .2); b.solid(10.6, 13.4, 1.3, 1.3, .2); cr(9.8, 10.4, 1, .8, OLV);
    ctn(-9.5, 14, true, 0x7f8a93); cr(-10.5, -5.5, 1.3, 1.2, OLV); cr(-9.1, -5.5, 1.3, 1.2, OLV); cr(-9.8, -5.5, 1, .8, OLV, 1.2); cr(10.5, -6.5, 1.3, 1.2, TAN); cr(11.9, -6.4, 1, .8, TAN); cr(11, 1.5, 1.3, 1.2, OLV);
    b.jersey(0, -5.5, 3, false); b.jersey(-3.2, 15.5, 3, false); b.jersey(4.6, 13, 3, true); b.jersey(-7, 2, 3, true);
    [[-13, -8.5], [13, -8.5], [-13, 18.5], [13, 18.5]].forEach(function (q) { b.lamp(q[0], q[1], 5.5, q[0] < 0 ? 1 : -1, 0); });

    // ---------- inside: site A (shelving and stacked goods; marked circle in the middle)
    b.quad('siteS', -35, .035, 12, 5, 5, 0, { flat: true, mode: 'alpha', make: siteMark }); plantZone(b, -35, 12, 0);
    shelf(-44.3, 5, PI / 2, 5, false); shelf(-44.3, 14, PI / 2, 5, false); shelf(-33, 21.3, 0, 5, true); shelf(-25.7, 11, -PI / 2, 5, false);
    cr(-40, 6.5, 1.3, 1.2, TAN); cr(-38.6, 6.5, 1.3, 1.2, TAN); cr(-39.3, 6.5, 1, .8, TAN, 1.2); cr(-31, 8.5, 1.3, 1.2, OLV); cr(-31, 9.9, 1, .8, OLV); cr(-39, 16.5, 1.3, 1.2, OLV); cr(-37.6, 16.6, 1.3, 1.2, OLV); cr(-38.3, 18, 1, .8, TAN);
    cr(-30, 16, 1.3, 1.2, TAN); cr(-30, 17.4, 1.3, 1.2, TAN); cr(-30, 16.7, 1, .8, TAN, 1.2); cr(-34.5, 4, 1, .8, OLV);
    // frost and ice by the doors, tyre tracks and boot prints in the snow, oil on the yard, bullet marks, rust streaks
    [[-41.5, 24, 5, 3], [0, 25, 6, 3.4], [47, -22, 3, 6], [25.5, 24.5, 3.4, 3], [-49, -4.5, 3, 4]].forEach(function (q) { b.box(q[0], q[1], q[2], q[3], .025, 0xcfe2ee, 0, false, 'ice'); });
    decal(b, 'tracks', -50.5, .04, 30, 2.6, 16, 0, true); decal(b, 'tracks', -50.5, .04, 6, 2.6, 16, 0, true); decal(b, 'tracks', 50, .04, 0, 2.6, 16, 0, true); decal(b, 'tracks', 50, .04, 28, 2.6, 16, 0, true); decal(b, 'tracks', -20, .04, 37.5, 2.6, 16, PI / 2, true); decal(b, 'tracks', 22, .04, 37.5, 2.6, 16, PI / 2, true); decal(b, 'tracks', 0, .04, 33, 2.6, 12, 0, true);
    [[-44, 26, .4], [-36, 30, 1.8], [8, 30, .3], [40, 24, 2.6], [46, 10, .1], [46, -12, 3], [-48, 18, .2], [-10, 26, 1.2]].forEach(function (q) { decal(b, 'foot', q[0], .045, q[1], .9, 3.2, q[2], true); });
    decal(b, 'stain', 3, .04, 9, 4, 4, 0, true); decal(b, 'stain', -8, .04, -2, 3, 3, 1, true); decal(b, 'stain', 9, .04, 16, 3, 3, 2, true); decal(b, 'stain', -35, .04, 8, 2.6, 2.6, 0, true); decal(b, 'stain', 30, .04, -18, 2.6, 2.6, 1, true); decal(b, 'crack', -5, .04, 12, 5, 5, .6, true); decal(b, 'crack', 6, .04, -6, 4, 4, 2, true);
    decal(b, 'holes', -14.76, 1.5, 0, 1.4, 1.4, PI / 2); decal(b, 'holes', 14.76, 1.4, 12, 1.4, 1.4, -PI / 2); decal(b, 'holes', -8, 1.6, -9.94, 1.3, 1.3, 0); decal(b, 'holes', 9, 1.5, 19.94, 1.3, 1.3, PI); decal(b, 'rust', -14.74, 3, 15, 1, 2.4, PI / 2); decal(b, 'rust', 6.5, 2.4, 22.24, .9, 2.2, 0); decal(b, 'rust', -6.5, 2.4, 22.24, .9, 2.2, 0); b.pallet(-42, 19.5, 0); cr(-42, 19.5, 1.2, 1, TAN, .14); b.solid(-42, 19.5, 1.2, 1.2, .2);
    [[-40, 7], [-30, 7], [-40, 17], [-30, 17]].forEach(function (q) { lamp(q[0], q[1], 5.5, 0xffe2b4, 1.6, 18); });
    // service store north of A (its narrow door is A's choke point), corridor, yard-side rooms
    shelf(-44.3, -11, PI / 2, 4, false); shelf(-40, -11.3, 0, 6, true); cr(-31, -2, 1.3, 1.2, TAN); cr(-29.6, -2, 1, .8, TAN); cr(-36, -6, 1.3, 1.2, OLV); cr(-42, -1, 1, .8, OLV); lamp(-35, -5, 3.4, 0xfff0d8, 1.4, 14);
    lamp(-23, -10, 3.4, 0xfff0d8, 1.2, 12); lamp(-23, 2, 3.4, 0xfff0d8, 1.2, 12); cr(-24.2, -1.2, 1, .8, OLV); cr(-21.8, 7, 1, .8, TAN);
    shelf(-20.3, -9.3, 0, 4, true); cr(-16.2, -1, 1.3, 1.2, TAN); cr(-17.6, -1, 1, .8, TAN); lamp(-18, -4, 3.4, 0xfff0d8, 1.2, 10); lamp(-18, 5, 3.4, 0xfff0d8, 1.1, 10);
    // reactor lab: glowing column inside a ring rail, consoles, coolers and pipes
    b.cyl(-14, -26, 2.4, .5, 0x4b555e, 0, true, 'metal', 2.4, 20); b.cyl(-14, -26, 1.5, 4.4, 0x6f7b85, .5, false, 'metal', 1.5, 20); b.cyl(-14, -26, 1.9, .5, 0x4b555e, 4.9, false, 'metal', 1.6, 20); b.cyl(-14, -26, .7, .6, 0x4b555e, 5.4, false, 'metal', .7, 12);
    [1.3, 2.5, 3.7].forEach(function (y) { var g = new T.CylinderGeometry(1.56, 1.56, .55, 20, 1, true); g.translate(-14, y, -26); b.geo(g, 0x58c6ff, 'glow', { flat: true }); });
    b.light(-14, 3.2, -22.6, 0x49b8ff, 3, 22); b.light(-14, 3.2, -29.4, 0x49b8ff, 2.4, 20);
    for (i = 0; i < 12; i++) { var a0 = i * PI / 6, a1 = (i + 1) * PI / 6; if (i === 2 || i === 8) continue; b.seg(-14 + Math.cos(a0) * 3.6, 1, -26 + Math.sin(a0) * 3.6, -14 + Math.cos(a1) * 3.6, 1, -26 + Math.sin(a1) * 3.6, .07, 0xd0b03a, 'metal'); b.box(-14 + Math.cos(a0) * 3.6, -26 + Math.sin(a0) * 3.6, .08, .08, 1, 0xd0b03a, 0, false, 'metal'); b.rsolid(-14 + Math.cos((a0 + a1) / 2) * 3.6, -26 + Math.sin((a0 + a1) / 2) * 3.6, .2, 1.9, 1, 0, -(a0 + a1) / 2, true); }
    b.solid(-14, -26, 7.4, 7.4, 1, 0, true);   // nobody walks inside the ring rail
    console(-21.8, -22, false, 0x6fd0ff); console(-21.8, -30, false, 0x6fd0ff); console(-10, -35, true, 0x8fe0a8); console(-18, -35, true, 0x6fd0ff);
    T2(-8, -20.5, -6, -17.5, 2.2, 0x7d8890, 'metal'); T2(-22, -18.6, -19.5, -17, 2.2, 0x7d8890, 'metal'); b.seg(-14, 5.7, -26, -14, 5.7, -35.6, .3, 0x8e979e, 'metal'); b.seg(-13.2, 5.2, -26, -7, 5.2, -19, .2, 0x9b7a4e, 'metal'); b.seg(-7, 5.2, -19, -7, 2.2, -19, .2, 0x9b7a4e, 'metal'); b.seg(-14.8, 5.2, -26, -20.7, 5.2, -17.8, .2, 0x9b7a4e, 'metal');
    b.quad('hazard', -14, .035, -16.9, 3, .5, 0, { flat: true, rep: [3, .5] });
    // control room, labs
    console(-2, -35, true); console(1.5, -35, true, 0x8fe0a8); console(5, -35, true); desk(1, -30, 0); lamp(1, -31, 4, 0xe8f0ff, 1.4, 12);
    desk(-3.5, -21, PI / 2); desk(5, -19, 0); cr(5.8, -25, 1, .8, TAN); shelf(-4.3, -25.2, PI / 2, 3, false); lamp(1, -21, 4, 0xe8f0ff, 1.4, 12);
    desk(11, -33, 0); desk(15, -33, 0); desk(13, -27, 0); shelf(8, -35.3, 0, 3, true); T2(16.5, -22.5, 19, -20.5, .9, 0x7c858c, 'metal'); b.glow(17.7, 1.1, -21.5, .9, .3, .5, 0x8fe0a8); cr(8.2, -18, 1.3, 1.2, TAN); lamp(13, -30, 4, 0xe8f0ff, 1.4, 14); lamp(13, -21, 4, 0xe8f0ff, 1.3, 12);
    [-18, -6, 8, 16].forEach(function (x) { lamp(x, -14, 3.4, 0xfff0d8, 1.3, 12); });
    // site B: goods against the walls, a clearer middle
    b.quad('siteS', 31, .035, -22, 5, 5, 0, { flat: true, mode: 'alpha', make: siteMark }); plantZone(b, 31, -22, 0);
    shelf(24, -31.3, 0, 6, true); shelf(34, -31.3, 0, 6, true); cr(22, -19, 1.3, 1.2, TAN); cr(22, -17.6, 1.3, 1.2, TAN); cr(22, -18.3, 1, .8, TAN, 1.2); cr(29, -13.5, 1.3, 1.2, OLV); cr(30.4, -13.5, 1.3, 1.2, OLV); cr(37, -14, 1.3, 1.2, TAN); cr(38.4, -14, 1, .8, TAN);
    cr(40.5, -28, 1.3, 1.2, OLV); cr(40.5, -29.4, 1.3, 1.2, OLV); cr(40.5, -28.7, 1, .8, OLV, 1.2); cr(27, -24, 1.3, 1.2, 0xc86a3a); cr(35, -19.5, 1.3, 1.2, TAN); cr(36.4, -19.5, 1, .8, TAN); b.pallet(33, -27, 0); cr(33, -27, 1.2, 1, OLV, .14); b.solid(33, -27, 1.2, 1.2, .2);
    [[26, -26], [36, -26], [26, -17], [36, -17]].forEach(function (q) { lamp(q[0], q[1], 5.5, 0xffe2b4, 1.6, 18); });
    // research wing: server room, office, wet lab, control office
    [17, 19, 21].forEach(function (x) { [-8.6, -4.6].forEach(function (z) { b.box(x, z, .9, 1.1, 2.1, 0x2b3137, 0, true, 'metal'); b.glow(x, 1.5, z + .56, .5, .06, .02, 0x6fd0ff); b.glow(x, 1.1, z + .56, .5, .06, .02, 0x8fe0a8); }); }); lamp(19.5, -1.5, 3.4, 0xcfe4ff, 1.2, 10);
    lamp(19.5, 5, 3.4, 0xfff0d8, 1.1, 10); cr(16.2, 3.2, 1, .8, TAN);
    desk(17.5, 11, PI / 2); desk(17.5, 18.5, PI / 2); desk(22, 20.6, 0); shelf(16, 21.3, 0, 3, true); lamp(19.5, 15, 3.4, 0xfff0d8, 1.3, 12);
    [-10, -6].forEach(function (z) { T2(30, z - .45, 34, z + .45, .92, 0x8a949b, 'metal'); T2(36, z - .45, 40, z + .45, .92, 0x8a949b, 'metal'); b.glow(32, 1.05, z, .4, .2, .3, 0x8fe0a8); }); shelf(41.3, -3, -PI / 2, 5, false); cr(29, 2.5, 1.3, 1.2, TAN); lamp(34.5, -3.5, 3.4, 0xe8f0ff, 1.4, 14);
    console(30, 21, true); console(33.5, 21, true, 0x8fe0a8); console(37, 21, true); desk(35, 9, 0); desk(31, 13, PI / 2); cr(40.5, 7.2, 1.3, 1.2, OLV); lamp(34.5, 13.5, 3.4, 0xfff0d8, 1.4, 14);
    [-9, 0, 9, 18].forEach(function (z) { lamp(25.5, z, 3.4, 0xfff0d8, 1.1, 10); });

    // ---------- outside: outer road with containers, sheds and snow banks for cover
    ctn(-50.5, 12, true, 0x7f8a93); ctn(-48, -4, false, 0x93826a); T2(-55, 30, -43, 40, 3.6, PN2, 'conc'); T2(-55.3, 29.7, -42.7, 40.3, .3, SNOW, 'snow', 3.6, false); [[-52, 33], [-49, 33], [-46, 33], [-52, 37], [-49, 37], [-46, 37]].forEach(function (q) { b.cyl(q[0], q[1], .9, .25, 0x2a2e31, 3.9, false, 'plain', .9, 12); });
    ctn(-30, 31.5, false, 0x7f8a93); ctn(-19, 37, false, 0x6d7c88); cr(-33, 26.5, 1.3, 1.2, OLV); cr(-12, 30, 1.3, 1.2, TAN); cr(-12, 31.4, 1, .8, TAN); b.jersey(-24, 26.5, 3, false);
    ctn(49, -10, true, 0x6d7c88); ctn(51.5, 8, true, 0x93826a); ctn(47.5, 27, false, 0x7f8a93); T2(44, 34, 50, 40, 3, PN2, 'conc'); T2(43.7, 33.7, 50.3, 40.3, .3, SNOW, 'snow', 3, false); ctn(30, 33, false, 0x7f8a93); ctn(17, 38, false, 0x93826a); cr(13, 30, 1.3, 1.2, OLV); cr(46, 19, 1.3, 1.2, TAN); cr(46, -22, 1.3, 1.2, OLV); cr(47.4, -22, 1, .8, OLV); b.jersey(36, 26, 3, false);
    [[-54, 22, 2.4, 1.3, 1], [-46.5, 24.5, 1.8, 1, 1], [-27, 42.5, 3, 1.4, 0], [8, 42.8, 2.6, 1.2, 0], [38, 42.6, 3, 1.5, 0], [54.5, 16, 2.2, 1.3, 1], [44.5, -1.5, 1.6, 1, 1], [54.3, -24, 2.4, 1.4, 0], [-54.2, -9, 2.2, 1.3, 0], [-46.5, 1.2, 1.5, .9, 1], [-13, 24, 1.6, .9, 1], [12, 24.2, 1.5, .9, 1], [-22, 23.6, 1.8, .8, 0], [35, 23.5, 2, .8, 0]].forEach(function (q) { mound(q[0], q[1], q[2], q[3], q[4]); });
    [[-50.5, 26, 1, 0], [-50.5, -2, 1, 0], [-30, 40, 0, -1], [30, 40, 0, -1], [50, 20, -1, 0], [50, -16, -1, 0]].forEach(function (q) { b.lamp(q[0], q[1], 6, q[2], q[3]); });
    // pipes and cable trays under the ceilings (corridors, warehouses, labs), as the brief asks
    var pipe = tiered(b, 1, function (x0, z0, x1, z1, y, c, w) { b.seg(x0, y, z0, x1, y, z1, w || .14, c || 0x8e979e, 'plain'); });
    pipe(-24.3, -14.6, 19.6, -14.6, 3.05, 0x9b7a4e); pipe(-24.3, -15.1, 19.6, -15.1, 3.05); T2(-24, -13.2, 19.6, -12.7, .06, 0x3a4046, 'plain', 3.05, false);
    pipe(-24.4, -15.6, -24.4, 7.6, 3.05); T2(-21.9, -11.6, -21.4, 7.6, .06, 0x3a4046, 'plain', 3.05, false); pipe(26.6, -11.6, 26.6, 21.6, 3.05, 0x9b7a4e); T2(24.4, -11.6, 24.9, 21.6, .06, 0x3a4046, 'plain', 3.05, false);
    [[-44.4, 2.6, -44.4, 21.6], [-25.6, 2.6, -25.6, 21.6]].forEach(function (q) { pipe(q[0], q[1], q[2], q[3], 5, 0x8e979e, .22); }); [7, 12, 17].forEach(function (z) { T2(-44.6, z - .12, -25.4, z + .12, .25, 0x4a545c, 'plain', 5.2, false); });
    [[20.6, -31.4, 41.4, -31.4], [20.6, -12.6, 41.4, -12.6]].forEach(function (q) { pipe(q[0], q[1], q[2], q[3], 5, 0x8e979e, .22); }); [26, 31, 36].forEach(function (x) { T2(x - .12, -31.6, x + .12, -12.4, .25, 0x4a545c, 'plain', 5.2, false); });
    pipe(-4.4, -35.4, 19.4, -35.4, 3.7, 0x9b7a4e); pipe(6.4, -35.4, 6.4, -16.6, 3.7); T2(-4.4, -26.6, 6.6, -26.1, .06, 0x3a4046, 'plain', 3.7, false); T2(27.6, 4.3, 41.6, 4.7, .06, 0x3a4046, 'plain', 3.05, false); T2(15.6, 8.3, 23.6, 8.7, .06, 0x3a4046, 'plain', 3.05, false);
    // chain-link fence along the outer edges, in front of the cliffs
    b.fence(-55.4, -12, -55.4, 28, 2.6); b.fence(55.4, -28, 55.4, 30, 2.6); b.fence(-40, 43.4, -12, 43.4, 2.6); b.fence(12, 43.4, 42, 43.4, 2.6);
    [-4, -2, 0, 2, 4].forEach(function (x) { b.spawns.A.push({ x: x, z: 38 }); b.spawns.B.push({ x: x * 2, z: -14 }); });
    function spots(l) { return l.map(function (q) { return { x: q[0], z: q[1], y: 0, l: 0 }; }); }
    return { name: '설산 연구기지', b: b, bounds: { minx: -57, maxx: 57, minz: -37, maxz: 45 }, bg: 0x2b3b55, fog: [30, 170], hemi: [0xb9cde8, 0x5b6676, .95], sun: [0xa9c4ec, .55, [30, 40, 26]], rain: false, sky: [0x0c1626, 0x3a5070], hdri: ['night', .14, .22, 2, .9], dim: .8, lod: [40, 80],
      sites: [siteDef('A', -35, 12, 0, 0, [[-50, 30, 0], [-38, 26, 0], [-18, 5, 0], [-23, -9, 0], [-35, -5, 0]]), siteDef('B', 31, -22, 0, 0, [[25.5, 10, 0], [49, -6, 0], [10, -14, 0], [14, -24, 0], [25.5, -6, 0]])],
      fwd: [[0, -7, 0], [-23, 0, 0], [25.5, 0, 0], [-35, -6, 0], [30, -15, 0], [-14, -19, 0], [0, -14, 0], [-18, -4, 0], [19, 5, 0]] };
  }

  // 07 사막 협곡 — 사용자가 준 시안과 설명문(맵 3)을 옮겼다. 북쪽이 -z. 지상(높이 H)과 그 아래 지하 터널, 두 층이다.
  //  · 폭 16 m 협곡과 강이 맵을 좌우로 가른다. 떨어지면 죽는다. 건너는 길은 셋: 가운데 22 x 5 m 철제 다리(가장 빠르고 가장 드러난다),
  //    북쪽의 좁은 둑길, 남쪽 암반 아래의 지하 터널(폭 3 m, 높이 2.6 m, 직각으로 꺾이고 중간에 넓은 방 둘).
  //  · 터널 입구는 좌우에 둘씩: 다리 남서·남동의 계단, 서쪽·동쪽 끝의 사다리.
  //  · 왼쪽은 산업·병영 시설(공격 출발), 오른쪽은 주둔지(수비 출발). 지점은 둘 다 오른쪽이다: B = 북동 큰 마당(녹색 군용 상자),
  //    A = 남쪽 안뜰(터널 계단이 올라오는 곳). 설명문은 왼쪽 마당도 지점 후보로 들지만, 공격 출발지 바로 옆이라 지점으로 쓰지 않았다.
  //  · 감시탑, 물탱크, 안테나는 장식이다.
  function canyon() {
    var b = Builder(), H = 3.2, links = [], ladders = [], SAND = 0xe9dfcc, SAND2 = 0xd2c8b8, ROCKC = 0xbcae9c, /* light tints: the painted sand and rock textures carry the colour */ CW = 0xa39a88, DK = 0x33383c, OLV = 0x5a6142, TAN = 0xb39a6a, BAG = 0xb09a6c, i;
    var f = Frames(b, H, links, ladders, CW, DK)(0, 0, 0);
    b.day = false;
    function Bg(x0, z0, x1, z1, h, c, t, y0, solid) { b.box((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(z1 - z0), h, c, H + (y0 || 0), solid, t || 'conc'); }
    function cr(x, z, sz, h, c, y0) { b.crate(x, z, sz, c, H + (y0 || 0), h); b.solid(x, z, sz, sz, h, H + (y0 || 0)); }
    function crT(x, z, sz, h, c) { b.crate(x, z, sz, c, 0, h); }                         // crate on the tunnel floor
    function bags(x, z, len, ang) { b.rbox(x, z, len, .7, .75, BAG, H, ang, true, 'canvas'); b.rbox(x, z, len - .5, .55, .35, 0xa38d60, H + .75, ang, false, 'canvas'); b.rsolid(x, z, len - .5, .55, .35, H + .75, ang); }
    function rock(x, z, r, h, solid, y) { var g = new T.IcosahedronGeometry(1, 0); g.scale(r, h, r * (.75 + Math.random() * .5)); g.rotateY(Math.random() * 3); g.translate(x, (y == null ? H : y) + h * .3, z); b.geo(g, (x * 7 + z * 3) % 2 ? ROCKC : SAND2, 'rock', {}); if (solid) b.solid(x, z, r * 1.3, r * 1.2, h, y == null ? H : y); }
    function acu(x, z, y) { b.box(x, z, 1.6, 1.6, .9, 0xb4b8b6, H + y, false, 'plain'); b.cyl(x, z, .58, .06, 0x2a2e31, H + y + .9, false, 'plain', .58, 12); }
    function win(x, z, w, h, y, nx, nz) { b.box(x + nx * .05, z + nz * .05, nx ? .1 : w, nz ? .1 : w, h, 0x5a6a72, H + y, false, 'glass'); }
    function door(x, z, w, h, nx, nz) { b.box(x + nx * .06, z + nz * .06, nx ? .12 : w, nz ? .12 : w, h, 0x4a4438, H, false, 'paint'); }
    function rail(x0, z0, x1, z1) { var mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, w = Math.max(Math.abs(x1 - x0), .1), d = Math.max(Math.abs(z1 - z0), .1); b.box(mx, mz, w, d, .08, DK, H + 1, false, 'plain'); b.box(mx, mz, w, d, .06, DK, H + .5, false, 'plain'); b.box(x0, z0, .09, .09, 1, DK, H, false, 'plain'); b.box(x1, z1, .09, .09, 1, DK, H, false, 'plain'); b.solid(mx, mz, Math.max(w, .2), Math.max(d, .2), 1.05, H, true); }
    function tower(x, z) {                                                                   // watch tower on legs (dressing; the foot blocks the way)
      [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]].forEach(function (q) { b.seg(x + q[0] * 1.3, H, z + q[1] * 1.3, x + q[0], H + 5, z + q[1], .22, 0x4a4034, 'plain'); });
      b.seg(x - 1.6, H + .2, z - 1.6, x + 1.4, H + 4.6, z - 1.4, .1, 0x4a4034, 'plain'); b.seg(x + 1.6, H + .2, z + 1.6, x - 1.4, H + 4.6, z + 1.4, .1, 0x4a4034, 'plain');
      Bg(x - 1.9, z - 1.9, x + 1.9, z + 1.9, .2, 0x5a5044, 'plain', 5, false); Bg(x - 1.7, z - 1.7, x + 1.7, z + 1.7, 1, 0x6a5e4c, 'plain', 5.2, false); Bg(x - 1.6, z - 1.6, x + 1.6, z + 1.6, .9, 0x23292d, 'plain', 6.2, false); Bg(x - 2.2, z - 2.2, x + 2.2, z + 2.2, .25, 0x5a5044, 'plain', 7.1, false);
      b.solid(x, z, 3.4, 3.4, 5, H);
    }
    acu = tiered(b, 2, acu); win = tiered(b, 2, win); door = tiered(b, 2, door);
    function siteMark() { var a = cv(256, 256), x = a[1]; x.strokeStyle = '#b8402e'; x.lineWidth = 16; x.beginPath(); x.arc(128, 128, 104, 0, 6.2832); x.stroke(); x.lineWidth = 20; x.beginPath(); x.moveTo(60, 60); x.lineTo(196, 196); x.moveTo(196, 60); x.lineTo(60, 196); x.stroke(); return a[0]; }

    // ---------- the rock the map is cut from: everything outside these holes is solid up to the ground level
    var GORGE = [[-8, -46, 8, -38], [-8, -34, 8, 22]];
    var TUN = [[-46, 34, -30, 37], [-30, 30, -18, 40], [-18, 30, -4, 33], [-4, 30, -1, 39], [-1, 36, 18, 39], [18, 30, 30, 40], [30, 33, 46, 36], [-24, 18, -21, 30], [21, 18, 24, 30]];
    (function () {
      var holes = GORGE.concat(TUN), xs = [-66, 66], zs = [-50, 50], ix, iz, x0, run;
      holes.forEach(function (h) { xs.push(h[0], h[2]); zs.push(h[1], h[3]); });
      xs = xs.filter(function (v, k) { return xs.indexOf(v) === k; }).sort(function (a, c) { return a - c; }); zs = zs.filter(function (v, k) { return zs.indexOf(v) === k; }).sort(function (a, c) { return a - c; });
      function open(x, z) { return holes.some(function (h) { return x > h[0] && x < h[2] && z > h[1] && z < h[3]; }); }
      for (iz = 0; iz < zs.length - 1; iz++) { run = null; for (ix = 0; ix < xs.length; ix++) { var solid = ix < xs.length - 1 && !open((xs[ix] + xs[ix + 1]) / 2, (zs[iz] + zs[iz + 1]) / 2); if (solid && run == null) run = xs[ix]; if (!solid && run != null) { b.box((run + xs[ix]) / 2, (zs[iz] + zs[iz + 1]) / 2, xs[ix] - run, zs[iz + 1] - zs[iz], H + 14, SAND, -14, true, 'sand'); run = null; } } }
    })();
    // tunnel floor and roofs (the roofs are the ground above); the stair wells and ladder shafts stay open
    b.box(0, 30, 96, 26, .3, 0x5a4c3c, -.3, false, 'conc');
    [[-44, 34, -30, 37], [-30, 30, -18, 40], [-18, 30, -4, 33], [-4, 30, -1, 39], [-1, 36, 18, 39], [18, 30, 30, 40], [30, 33, 44, 36], [-24, 22, -21, 30], [21, 22, 24, 30]].forEach(function (q) { b.box((q[0] + q[2]) / 2, (q[1] + q[3]) / 2, q[2] - q[0], q[3] - q[1], .5, 0x3a3026, 2.6, true, 'conc'); b.box((q[0] + q[2]) / 2, (q[1] + q[3]) / 2, q[2] - q[0], q[3] - q[1], .1, SAND, 3.1, true, 'sand'); });
    // dark timber props and lintels along the tunnels, so they read as dug out and dim
    [[-40, 34, 37, 0], [-34, 34, 37, 0], [-11, 30, 33, 0], [-2.5, 33, 36, 1], [6, 36, 39, 0], [12, 36, 39, 0], [34, 33, 36, 0], [40, 33, 36, 0], [-22.5, 24, 27, 2], [22.5, 24, 27, 2]].forEach(function (q) { var ax = q[3] === 0; if (q[3] === 1) { b.box(-2.5, 34.5, 3, .25, .22, 0x2e2418, 2.38, false, 'plain'); return; } if (q[3] === 2) { b.box(q[0], 25.5, 3, .25, .22, 0x2e2418, 2.38, false, 'plain'); b.box(q[0] - 1.4, 25.5, .2, .25, 2.4, 0x2e2418, 0, false, 'plain'); b.box(q[0] + 1.4, 25.5, .2, .25, 2.4, 0x2e2418, 0, false, 'plain'); return; } b.box(q[0], (q[1] + q[2]) / 2, .25, 3, .22, 0x2e2418, 2.38, false, 'plain'); b.box(q[0], q[1] + .1, .25, .2, 2.4, 0x2e2418, 0, false, 'plain'); b.box(q[0], q[2] - .1, .25, .2, 2.4, 0x2e2418, 0, false, 'plain'); });
    f.stairs(-22.5, 22, 0, -1, 3); f.stairs(22.5, 22, 0, -1, 3); f.ladder(-46, 35.5, -1, 0); f.ladder(46, 34.5, 1, 0);
    [-1, 1].forEach(function (sd) { rail(sd * 24.1, 18, sd * 24.1, 22.2); rail(sd * 20.9, 18, sd * 20.9, 22.2); rail(sd * 20.9, 22.2, sd * 24.1, 22.2); });
    rail(-46, 33.9, -43.9, 33.9); rail(-46, 37.1, -43.9, 37.1); rail(-43.9, 33.9, -43.9, 37.1); rail(43.9, 32.9, 46, 32.9); rail(43.9, 36.1, 46, 36.1); rail(43.9, 32.9, 43.9, 36.1);
    // tunnel dressing: orange work lamps, crates for cover in the two rooms, cable along the roof
    [[-40, 35.5], [-24, 35], [-22.5, 27], [-11, 31.5], [-2.5, 35], [8, 37.5], [24, 35], [22.5, 27], [37, 34.5]].forEach(function (q) { b.light(q[0], 2.1, q[1], 0xffa348, 1.9, 13); b.box(q[0], q[1], .18, .18, .25, DK, 2.35, false, 'plain'); b.glow(q[0], 2.28, q[1], .14, .14, .14, 0xffb35a); });
    crT(-27, 32, 1.3, 1.2, TAN); crT(-25.6, 32, 1, .8, TAN); crT(-21, 38, 1.3, 1.2, OLV); crT(-26.5, 38.5, 1, .8, OLV); crT(21, 32, 1.3, 1.2, OLV); crT(27, 38, 1.3, 1.2, TAN); crT(25.6, 38.2, 1, .8, TAN); crT(27.5, 31.5, 1, .8, OLV); crT(-9, 32.2, 1, .8, TAN); crT(10, 36.8, 1, .8, OLV);
    b.seg(-44, 2.5, 34.3, -30, 2.5, 34.3, .05, 0x1c1c1c, 'plain'); b.seg(-1, 2.5, 38.7, 18, 2.5, 38.7, .05, 0x1c1c1c, 'plain'); b.seg(30, 2.5, 33.3, 44, 2.5, 33.3, .05, 0x1c1c1c, 'plain');
    // river far below, the fall at its south end, the culvert under the north causeway
    b.box(0, -12, 16, 70, .4, 0x6a9a9e, -13, false, 'water'); b.box(0, 21.8, 7, .3, 12, 0xbfe0e6, -13, false, 'plain'); b.box(0, 20.5, 9, 2.5, .5, 0xd8eef0, -13, false, 'plain'); b.box(0, -33.95, 5, .2, 6, 0x14181a, -9, false, 'plain'); b.box(0, -38.05, 5, .2, 6, 0x14181a, -9, false, 'plain');
    for (i = 0; i < 14; i++) rock((i % 2 ? -7.2 : 7.2), -44 + i * 4.7, 1.6 + (i % 3) * .5, 2.4 + (i % 4), false, -11 + (i % 5) * 2);

    // ---------- rim: rock walls round the playable ground, and the big outcrop that closes the surface south of the gorge
    Bg(-66, -50, 66, -42, 7, SAND2, 'rock'); Bg(-66, 44, 66, 50, 7, SAND2, 'rock'); Bg(-66, -42, -60, 44, 7, SAND2, 'rock'); Bg(60, -42, 66, 44, 7, SAND2, 'rock'); Bg(-14, 22.6, 14, 44, 6, SAND2, 'rock');
    [[-60, -30], [-60, -8], [-60, 14], [-59.5, 34], [60, -34], [60, -12], [60, 12], [59.5, 32], [-44, -42], [-22, -42], [12, -42], [40, -42], [-46, 44], [-28, 44], [26, 44], [48, 44], [-14, 30], [14, 28], [-10, 23], [9, 23.5], [0, 40]].forEach(function (q, n) { rock(q[0], q[1], 2.6 + (n % 3), 4 + (n % 4) * 1.4, false); });
    [[-38, 24, -28, 31, 4], [-36, 40.5, -16, 44, 3.4], [27, 25, 38, 30.5, 4], [16, 40.5, 36, 44, 3.4], [-58, 22, -52, 30, 3]].forEach(function (q) { Bg(q[0], q[1], q[2], q[3], q[4], ROCKC, 'rock'); rock((q[0] + q[2]) / 2, (q[1] + q[3]) / 2, (q[2] - q[0]) * .55, q[4] * 1.1, false); });
    // the south outcrop and the rims are heaped with boulders so no flat slab shows; ledges step down the gorge walls
    for (i = 0; i < 26; i++) rock(-13 + (i * 7.3) % 26, 24 + (i * 5.1) % 19, 3 + (i % 3) * 1.2, 5.5 + (i % 4) * 1.5, false, H + (i % 3));
    for (i = 0; i < 40; i++) { var t = i / 40 * 6.2832, ex = Math.cos(t), ez = Math.sin(t), kx = Math.abs(ex) > Math.abs(ez) * 1.4; rock(kx ? (ex > 0 ? 61.5 : -61.5) : -58 + (i * 23) % 116, kx ? -40 + (i * 17) % 82 : (ez > 0 ? 45.5 : -43.5), 2.4 + (i % 3) * .9, 6 + (i % 5) * 1.3, false, H + 1); }
    [-1, 1].forEach(function (sd) { for (i = 0; i < 9; i++) { b.box(sd * (8 - .7 - (i % 3) * .5), -30 + i * 6, 1.4 + (i % 3), 4.5, 1.2, i % 2 ? ROCKC : SAND2, -3 - (i % 4) * 2.3, false, 'rock'); } });
    // parapets along the gorge so nobody steps off by accident
    [-1, 1].forEach(function (sd) { [[-42, -38.4], [-33.6, -5.9], [-.1, 22.6]].forEach(function (q) { Bg(sd * 8.2, q[0], sd * 8.7, q[1], 1.1, CW); }); });
    Bg(-8.2, -38.5, 8.2, -38.1, 1.1, CW); Bg(-8.2, -33.9, 8.2, -33.5, 1.1, CW);

    // ---------- the steel bridge: 22 x 5 deck, trussed sides
    b.box(0, -3, 22.6, 5, .4, 0x4a4f52, 2.8, true, 'plain'); b.box(0, -3, 22.6, 1.2, .5, 0x33383c, 2.2, false, 'plain');
    [-5.4, -.6].forEach(function (z) { b.solid(0, z, 22.6, .25, 1.2, H, true); b.box(0, z, 22.6, .18, .16, DK, H + 1.15, false, 'plain'); b.box(0, z, 22.6, .2, .25, DK, H + 2.7, false, 'plain');
      for (i = -11; i <= 11; i += 2.75) b.box(i, z, .16, .16, 2.8, DK, H, false, 'plain'); for (i = -11; i < 11; i += 5.5) { b.seg(i, H + .1, z, i + 2.75, H + 2.7, z, .12, DK, 'plain'); b.seg(i + 2.75, H + 2.7, z, i + 5.5, H + .1, z, .12, DK, 'plain'); } });
    for (i = -11; i <= 11; i += 5.5) b.box(i, -3, .18, 5, .18, DK, H + 2.75, false, 'plain');
    b.quad('hazard', -10.6, H + .02, -3, .6, 4.6, 0, { flat: true, rep: [.6, 4.6] }); b.quad('hazard', 10.6, H + .02, -3, .6, 4.6, 0, { flat: true, rep: [.6, 4.6] });

    // ---------- left side: industrial / barracks compound (attackers start at its west edge)
    Bg(-57, -30, -43, -15, 4.5, CW); Bg(-57.2, -30.2, -42.8, -14.8, .3, 0x8a8170, 'conc', 4.5, false); acu(-53, -26, 4.8); acu(-50.5, -26, 4.8); acu(-53, -23, 4.8); acu(-50.5, -23, 4.8); door(-43, -19, 1.4, 2.3, 1, 0); [-27, -23].forEach(function (z) { win(-43, z, 1.6, 1.1, 1.3, 1, 0); }); [-54, -50, -46].forEach(function (x) { win(x, -15, 1.6, 1.1, 1.3, 0, 1); });
    Bg(-39, -34, -31, -25, 3, 0x8f8676, 'block'); (function () { var g = new T.BoxGeometry(8.8, .14, 9.8); g.rotateZ(.18); g.translate(-35, H + 3.8, -29.5); b.geo(g, 0x8a4a34, 'corr', {}); })(); door(-35, -25, 2.2, 2.3, 0, 1);
    Bg(-28, -33, -15, -22, 3.4, CW); Bg(-28.2, -33.2, -14.8, -21.8, .3, 0x8a8170, 'conc', 3.4, false); door(-21.5, -22, 1.4, 2.3, 0, 1); win(-25, -22, 1.6, 1.1, 1.3, 0, 1); win(-18, -22, 1.6, 1.1, 1.3, 0, 1); Bg(-15, -27, -14, -22, .4, 0x8a8170, 'conc', 3, false);
    for (i = 0; i < 7; i++) Bg(-14.9, -22.2 - i * .7, -13.6, -21.5 - i * .7, .25, 0x9d998e, 'conc', i * .5, false);                                                     // outside stair to its roof (dressing)
    Bg(-40, -18.2, -30, -17.8, 2.4, CW); Bg(-24.2, -16, -23.8, -8, 2.4, CW); Bg(-58, 8, -46, 18, 3.2, CW); (function () { var g = new T.BoxGeometry(12.8, .14, 10.8); g.rotateZ(-.14); g.translate(-52, H + 4, 13); b.geo(g, 0x9a4a36, 'corr', {}); })(); door(-46, 12, 1.4, 2.3, 1, 0); win(-50, 8, 1.6, 1.1, 1.3, 0, -1);
    Bg(-20, 4, -14, 9, 2.6, CW); door(-17, 4, 1.3, 2.1, 0, -1);
    cr(-36.6, -7, 1.3, 1.2, OLV); cr(-35.2, -7, 1.3, 1.2, OLV); cr(-35.9, -7, 1.1, .9, 0x4e5637, 1.2); cr(-33, -2, 1, .8, OLV); cr(-42, -10.5, 1.3, 1.2, TAN); cr(-29, -12, 1.3, 1.2, TAN); cr(-29, -10.6, 1, .8, TAN); cr(-20, 12, 1.3, 1.2, OLV); cr(-30, 16, 1.3, 1.2, TAN); cr(-12, -24, 1.3, 1.2, OLV);
    bags(-13, -8.5, 5, .5); bags(-13, 2.5, 5, -.5); bags(-31, 8, 6, 0); bags(-12.5, -31, 5, 0); bags(-40, 2, 5, PI / 2); bags(-26, 20, 5, .3);
    tower(-41, -39.2); Bg(-42.5, -41, -39.5, -37.6, .1, 0x5a5044, 'plain', 0, false);
    // ---------- right side: garrison (defenders start at its east edge); both sites are here
    Bg(10, -33, 24, -25, 3.4, CW); Bg(9.8, -33.2, 24.2, -24.8, .3, 0x8a8170, 'conc', 3.4, false); door(17, -25, 1.4, 2.3, 0, 1); win(13, -25, 1.6, 1.1, 1.3, 0, 1); win(21, -25, 1.6, 1.1, 1.3, 0, 1); acu(13, -30, 3.7);
    [[26, -31], [38, -31], [26, -24], [38, -24]].forEach(function (q) { b.box(q[0], q[1], .16, .16, 3, 0x4a4034, H, false, 'plain'); }); (function () { var g = new T.BoxGeometry(12.6, .06, 7.6); g.translate(32, H + 3.02, -27.5); b.geo(g, 0x6a6a44, 'canvas', {}); })();           // work area under a camouflage net
    cr(28, -29, 1.3, 1.2, TAN); cr(29.4, -29, 1.3, 1.2, TAN); cr(35, -27, 1, .8, OLV); Bg(31, -30.5, 34.5, -29.5, .9, 0x6a5e4c, 'plain');
    Bg(46, -25, 58, -11, 4, CW); Bg(45.8, -25.2, 58.2, -10.8, .3, 0x8a8170, 'conc', 4, false); acu(50, -21, 4.3); acu(54, -15, 4.3); door(46, -17, 1.4, 2.3, -1, 0); win(46, -22, 1.6, 1.1, 1.3, -1, 0); [49, 53].forEach(function (x) { win(x, -11, 1.6, 1.1, 1.3, 0, 1); });
    for (i = 0; i < 7; i++) Bg(44.8 - 0, -24.8 + i * .7, 46, -24.1 + i * .7, .25, 0x9d998e, 'conc', i * .5, false);
    Bg(40, -5, 46, 1, 2.8, 0x8f8676, 'block'); (function () { var g = new T.BoxGeometry(6.8, .14, 6.8); g.rotateZ(.16); g.translate(43, H + 3.4, -2); b.geo(g, 0x8f9498, 'corr', {}); })(); door(40, -2, 1.4, 2.1, -1, 0);
    // site B: the big north-east yard with green military boxes
    b.quad('siteX', 33, H + .03, -14, 5.2, 5.2, 0, { flat: true, mode: 'alpha', make: siteMark }); plantZone(b, 33, -14, H);
    b.quad('siteX', -39, H + .03, -5, 5.2, 5.2, 0, { flat: true, mode: 'alpha', make: siteMark }); plantZone(b, -39, -5, H); b.mark('A', -30, H + 1.9, -17.78, 1.4, 1.4, 0, '#e2562f'); b.mark('A', -24.22, H + 1.9, -12, 1.4, 1.4, -PI / 2, '#e2562f');
    cr(29.6, -9, 1.3, 1.2, OLV); cr(31, -9, 1.3, 1.2, OLV); cr(30.3, -9, 1.1, .9, 0x4e5637, 1.2); cr(36.5, -17.5, 1.3, 1.2, OLV); cr(36.5, -16.1, 1, .8, OLV); cr(27, -19, 1, .8, TAN); cr(40, -9.5, 1.3, 1.2, TAN); cr(34, -21, 1.3, 1.2, OLV);
    Bg(23.8, -22, 24.2, -10, 2.6, CW); Bg(24, -4.2, 30, -3.8, 2.6, CW); Bg(34, -4.2, 40, -3.8, 2.6, CW); b.mark('B', 24.22, H + 1.9, -16, 1.4, 1.4, PI / 2, '#e2562f'); b.mark('B', 37, H + 1.9, -4.22, 1.4, 1.4, PI, '#e2562f');
    // the south court where the tunnel stairs come up
    Bg(10, 4.8, 19, 5.2, 2.6, CW); Bg(27, 4.8, 36, 5.2, 2.6, CW); Bg(35.8, 5, 36.2, 19, 2.6, CW); Bg(28, 9, 34, 14, 2.6, CW); door(31, 14, 1.3, 2.1, 0, 1);
    cr(11.5, 9, 1.3, 1.2, TAN); cr(12.9, 9, 1.3, 1.2, TAN); cr(12.2, 9, 1.1, .9, TAN, 1.2); cr(18.5, 17, 1, .8, OLV); cr(11.5, 19.5, 1.3, 1.2, OLV); cr(17, 8, 1, .8, TAN); cr(26, 20, 1.3, 1.2, OLV); cr(30, 18, 1.3, 1.2, TAN); cr(30, 19.4, 1, .8, TAN);
    bags(13, -8.5, 5, -.5); bags(13, 2.5, 5, .5); bags(12.5, -31.5, 5, 0); bags(18, -14, 5, PI / 2); bags(42, 8, 5, .2); bags(26, 0, 4, 0);
    tower(30, -39.2); cr(46, 22, 1.3, 1.2, TAN); cr(50, 30, 1.3, 1.2, OLV); cr(40, 36, 1.3, 1.2, TAN); cr(-50, 34, 1.3, 1.2, TAN); cr(-44, 26, 1.3, 1.2, OLV);
    // water tower and antenna on the east rim
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { b.seg(62 + q[0] * 1.6, H + 7, -30 + q[1] * 1.6, 62 + q[0] * 1.2, H + 11.5, -30 + q[1] * 1.2, .2, 0x4a4034, 'plain'); }); b.cyl(62, -30, 2.2, 3.2, 0x9a9488, H + 11.5, false, 'plain', 2.2, 14); b.cyl(62, -30, 2.3, .8, 0x7d776c, H + 14.7, false, 'plain', .4, 14);
    b.seg(50, H + 7, -45, 50, H + 15, -45, .14, 0x8e979e, 'plain'); b.seg(49, H + 12.5, -45, 51, H + 12.5, -45, .08, 0x8e979e, 'plain'); b.seg(49.3, H + 14, -45, 50.7, H + 14, -45, .08, 0x8e979e, 'plain');
    // floodlights at the bridge heads
    [[-11.6, -6.6], [-11.6, .6], [11.6, -6.6], [11.6, .6]].forEach(function (q) { b.box(q[0], q[1], .14, .14, 3.4, DK, H, false, 'plain'); b.glow(q[0], H + 3.4, q[1], .3, .16, .3, 0xffd9a0); });
    // sand drifted against walls, tracks in the yards, oil and bullet marks, rust on the bridge
    [[-43, -14.4, 5, 2.4], [-30, -17.2, 6, 2.2], [-46, 7.4, 6, 2.2], [-15, -21.4, 5, 2], [24.8, -16, 2.2, 6], [46, -10.4, 6, 2.2], [35.4, 12, 2.2, 6], [10, 5.8, 6, 2], [-56, -14.4, 5, 2.4], [56, -10.4, 5, 2.4]].forEach(function (q) { decal(b, 'drift', q[0], H + .03, q[1], q[2], q[3], 0, true); });
    decal(b, 'tracks', -44, H + .03, -2, 2.6, 14, PI / 2, true); decal(b, 'tracks', -20, H + .03, -3, 2.6, 12, PI / 2, true); decal(b, 'tracks', 30, H + .03, 2, 2.6, 14, PI / 2, true); decal(b, 'tracks', 18, H + .03, -3, 2.6, 10, PI / 2, true);
    decal(b, 'stain', -34, H + .03, -10, 3, 3, 0, true); decal(b, 'stain', 38, H + .03, -12, 3, 3, 1, true); decal(b, 'stain', 0, H + .02, -3, 3, 3, 0, true); decal(b, 'stain', -24, .03, 35, 3, 3, 0, true); decal(b, 'stain', 24, .03, 36, 3, 3, 2, true); decal(b, 'stain', 6, .03, 37.5, 2.4, 2.4, 1, true);
    decal(b, 'holes', -42.94, H + 1.5, -24, 1.4, 1.4, PI / 2); decal(b, 'holes', -20, H + 1.4, 3.94, 1.3, 1.3, PI); decal(b, 'holes', 45.94, H + 1.5, -20, 1.4, 1.4, -PI / 2); decal(b, 'holes', 31, H + 1.3, 8.94, 1.3, 1.3, PI); decal(b, 'holes', 23.74, H + 1.4, -18, 1.3, 1.3, -PI / 2); decal(b, 'crack', -36, H + .03, 12, 5, 5, 1, true); decal(b, 'crack', 28, H + .03, -2, 5, 5, 2, true);
    // both teams start at the south end, one on each side of the gorge, as the pack's SPAWN markers place them
    [-55, -53.5, -52, -50.5, -49].forEach(function (x) { b.spawns.A.push({ x: x, y: H, z: 40.5 }); b.spawns.B.push({ x: -x, y: H, z: 40.5 }); });
    function spots(l) { return l.map(function (q) { return { x: q[0], z: q[1], y: H, l: 1 }; }); }
    return { name: '사막 협곡', b: b, bounds: { minx: -61, maxx: 61, minz: -43, maxz: 45 }, bg: 0xc9b79a, fog: [55, 240], hemi: [0xf0e6d2, 0x7a6448, 1], sun: [0xffdca8, 1.7, [-30, 32, 20]], rain: false, sky: [0x4a78b0, 0xe0c9a4], hdri: ['day', .8, 1.5, 8, 1], dim: 1,
      H: H, base: H, lod: [45, 90], links: links, ladders: ladders, voids: GORGE, roamAll: true,   // voids are the pack's river / canyon hazard: a fall there kills
      hot: [{ x: 0, z: -3, l: 1 }, { x: -36, z: -4, l: 1 }, { x: 33, z: -14, l: 1 }, { x: 0, z: -36, l: 1 }, { x: -24, z: 35, l: 0 }, { x: 24, z: 35, l: 0 }, { x: 15, z: 13, l: 1 }, { x: -22, z: 12, l: 1 }],
      sites: [siteDef('A', -39, -5, H, 1, [[-50, 20, 1], [-30, 8, 1], [-46, -12, 1]]), siteDef('B', 33, -14, H, 1, [[0, -3, 1], [0, -36, 1], [22.5, 26, 0], [12, -2, 1], [47.5, 30, 1]])],
      fwd: [[-12, -3, 1], [12, -3, 1], [-22.5, 15, 1], [22.5, 15, 1], [-30, -10, 1], [30, -12, 1], [0, -36, 1], [-24, 35, 0], [24, 35, 0]] };
  }

  // 08 사격 연습장 — 사용자가 준 콘셉트 보드(가상의 FPS 훈련장)를 옮겼다. 조작 연습장에서만 쓰인다. 북쪽이 -z, 80 x 60 m.
  //  1 사격 레인(서쪽, 지붕 있는 사선과 10~42 m 고정 표적)  2 이동 표적 구역(북쪽 가운데, 좌우·전후로 움직이는 표적)
  //  3 CQB 구역(북동, 지붕 없는 방과 복도)  4 엄폐물 연습 구역(가운데)  5 투척 연습 구역(동쪽, 바닥 원)
  //  6 무기 테스트 존(남동 건물)  7 스폰 및 장비 선택 구역(남쪽 가운데 정문 안)
  function range() {
    var b = Builder(), CW = 0x9a9b98, CW2 = 0x838583, DK = 0x2c3238, OLV = 0x5a6142, TAN = 0xb39a6a, tg = [], i;
    b.day = true;
    function B(x0, z0, x1, z1, h, c, t, y0, solid) { b.box((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(z1 - z0), h, c, y0 || 0, solid, t || 'conc'); }
    function cr(x, z, sz, h, c) { b.crate(x, z, sz, c, 0, h); }
    function post(x, z, h) { b.box(x, z, .16, .16, h, DK, 0, true, 'metal'); }
    function sign(n, x, z, ry) { var o = b.tier; b.box(x, z, .1, .1, 2.6, DK, 0, false, 'metal'); b.quad('zone' + n, x + Math.sin(ry) * .08, 2.9, z + Math.cos(ry) * .08, .9, .9, ry, { mode: 'alpha', make: function () { var a = cv(128, 128), c = a[1]; c.fillStyle = '#ff8a1f'; c.beginPath(); c.arc(64, 64, 58, 0, 6.2832); c.fill(); c.fillStyle = '#fff'; c.font = '900 84px "Big Shoulders Display","Arial Narrow",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, 64, 70); return a[0]; } }); b.quad('zone' + n, x - Math.sin(ry) * .08, 2.9, z - Math.cos(ry) * .08, .9, .9, ry + PI, {}); b.tier = o; }
    function target(x, z, ry, y, mv) { tg.push({ x: x, y: y || 1.25, z: z, ry: ry, w: .62, h: 1.1, mv: mv || null }); if (!mv) b.box(x, z, .08, .08, (y || 1.25) - .5, DK, 0, false, 'metal'); }
    function bags(x, z, len, ang) { b.rbox(x, z, len, .7, .8, 0xb09a6c, 0, ang, true, 'canvas'); }
    function tower(x, z) { b.cyl(x, z, .14, 9, DK, 0, false, 'metal', .1, 8); b.box(x, z, 1.8, .5, .7, 0x23292d, 9, false, 'metal'); b.glow(x, 9.35, z + .26, 1.5, .45, .04, 0xfff2d0); b.solid(x, z, .5, .5, 3, 0); }

    // ground: asphalt apron, dirt in the lane and the cover yard, painted safety lines
    b.box(0, 0, 140, 110, .3, 0x5b5a3e, -.45, false, 'plain'); b.box(0, 0, 82, 62, .4, 0x7d7f7c, -.4, false, 'floor');
    B(-38, -28, -24, 16, .03, 0xd6c8ae, 'sand', 0, false); B(-20, -2, 12, 14, .03, 0xcfc2aa, 'sand', 0, false); B(-18, -28, 10, -9, .03, 0xd6c8ae, 'sand', 0, false); B(18, -4, 38, 10, .03, 0xd6c8ae, 'sand', 0, false);
    [[-22, 16, .15, 12], [13, 4, .15, 28], [0, 16.5, 44, .15], [0, -6, 26, .15]].forEach(function (q) { b.box(q[0], q[1], q[2], q[3], .02, 0xd8b13a, 0, false); });
    // perimeter: concrete wall with a fence on top, steel gate in the middle of the south side
    [[0, -30.3, 81.2, .6], [-40.3, 0, .6, 61.2], [40.3, 0, .6, 61.2], [-23, 30.3, 35, .6], [23, 30.3, 35, .6]].forEach(function (q) { b.box(q[0], q[1], q[2], q[3], 4, CW, 0, true, 'conc'); b.box(q[0], q[1], q[2] > 1 ? q[2] : .08, q[3] > 1 ? q[3] : .08, 1, 0x596268, 4, false, 'metal'); });
    b.box(0, 30.4, 11, .25, 3.8, 0x3c4347, 0, true, 'metal'); [-5.6, 5.6].forEach(function (x) { b.box(x, 30.3, 1, 1, 4.6, CW2, 0, true, 'conc'); }); b.mark('TRAINING RANGE', 13, 2.6, 29.98, 8, 1.3, PI, '#e8e4da'); b.quad('hazard', 0, .3, 30.2, 11, .5, PI, { rep: [11, .5] });
    [[-36, -26], [36, -26], [-36, 26], [36, 26]].forEach(function (q) { tower(q[0], q[1]); });
    // 7 spawn and kit area: canopy, tables with crates, lockers
    [[-8, 21], [8, 21], [-8, 28], [8, 28]].forEach(function (q) { post(q[0], q[1], 3); }); B(-8.4, 20.6, 8.4, 28.4, .14, 0x4a545c, 'corr', 3, false);
    B(-7.7, 27.2, -1.3, 28.2, .9, 0x6a5e4c, 'crate'); B(1.3, 27.2, 7.7, 28.2, .9, 0x6a5e4c, 'crate');
    // weapon tables: one of every gun, lying ready; taking one leaves it there (the game keeps these, see map.armory)
    var armory = [['rifle', -6.9, 'AR-01'], ['rifle2', -5.4, 'AR-02'], ['smg', -4, 'SM-01'], ['sniper', -2.4, 'SR-01'], ['shotgun', 2.5, 'SG-01'], ['pistol', 4.1, 'HG-01'], ['pistol2', 5.4, 'HG-02']].map(function (q) {
      b.mark(q[2], q[1], .62, 27.17, .9, .3, PI, '#ffd27a'); return { id: q[0], x: q[1], y: .9, z: 27.75, yaw: PI / 2, tilt: -.95 }; });   /* laid along the table, side turned up toward whoever stands in front */
    [-7.6, 7.6].forEach(function (x) { b.box(x, 24, .6, 2.4, 2, 0x4a5a6a, 0, true, 'paint'); }); b.cont(-16, 26.5, false, 0x7a3f30, 0, 6.1); b.cont(14, 27, false, 0x3f5f7a, 0, 6.1); sign('7', 0, 19.5, 0);
    // 1 firing lanes: roofed firing line with stalls, targets at 10 to 42 m, sand berm, fence toward the yard
    [-38, -24.5].forEach(function (x) { [16.2, 22.8].forEach(function (z) { post(x + (x < -30 ? .4 : -.4), z, 3); }); }); B(-38.4, 15.8, -24, 23.2, .14, 0x4a545c, 'corr', 3, false); B(-37.8, 16.2, -24.4, 16.8, 1, 0x6a5e4c, 'crate');
    [-35.1, -32.5, -29.9, -27.3].forEach(function (x) { B(x - .06, 16.2, x + .06, 19, 2.2, 0x4a545c, 'metal'); });
    [[-36.4, 6], [-33.8, -4], [-31.2, -14], [-28.6, -25.5], [-26, 6], [-36.4, -14], [-31.2, -25.5], [-26, -4], [-33.8, -25.5]].forEach(function (q) { target(q[0], q[1], 0); });
    B(-38, -29.9, -24, -27, 2.6, 0xc9b894, 'sand'); b.fence(-24, -28, -24, 16, 2.6); [[6, '10'], [-4, '20'], [-14, '30'], [-25.5, '42']].forEach(function (q) { b.mark(q[1] + 'm', -24.25, 1.6, q[0], 1.4, .6, -PI / 2, '#ffd27a'); }); sign('1', -23, 20, PI / 2);
    // 2 moving targets: covered stand with a counter, two cross tracks and one that runs toward you
    B(-18.2, -29.9, -17.8, -9, 3, CW, 'conc'); B(9.8, -29.9, 10.2, -9, 3, CW, 'conc'); B(-17.8, -9.3, 9.8, -8.7, 1, 0x6a5e4c, 'crate'); [[-17, -8.5], [9, -8.5], [-17, -4.5], [9, -4.5]].forEach(function (q) { post(q[0], q[1], 3); }); B(-17.6, -9.2, 9.6, -4.2, .14, 0x4a545c, 'corr', 3, false);
    [-18, -25].forEach(function (z) { B(-16, z - .08, 8, z + .08, .12, 0x33383c, 'metal', .3, false); }); B(3.92, -25, 4.08, -13, .12, 0x33383c, 'metal', .3, false);
    target(-4, -18, 0, 1.25, ['x', 10, .8]); target(-4, -25, 0, 1.25, ['x', 11, 1.3]); target(4, -19.5, 0, 1.25, ['z', 5, .7]); target(-12, -27, 0, 1.25); target(6, -27, 0, 1.25); sign('2', -4, -3.4, 0);
    // 3 close-quarters house: roofless rooms and a corridor, targets round the corners
    function wx(z, x0, x1, gaps) { var cur = x0; (gaps || []).concat([[x1, x1]]).forEach(function (g) { if (g[0] > cur + .01) B(cur, z - .15, g[0], z + .15, 2.8, 0xa7a39a, 'block'); cur = g[1]; }); }
    function wz(x, z0, z1, gaps) { var cur = z0; (gaps || []).concat([[z1, z1]]).forEach(function (g) { if (g[0] > cur + .01) B(x - .15, cur, x + .15, g[0], 2.8, 0xa7a39a, 'block'); cur = g[1]; }); }
    wz(14, -28, -8, [[-14.5, -12]]); wx(-8, 14, 38, [[29.5, 32]]); wz(22, -28, -18, [[-24.5, -22]]); wx(-18, 14, 30, [[16.5, 19], [25.5, 28]]); wz(30, -18, -8, [[-14.5, -12]]); wx(-22, 22, 38, [[32.5, 35]]);
    target(18, -26.5, 0); target(15.2, -21, PI / 2); target(26, -27, 0); target(36.5, -25, -PI / 2); target(36.8, -12, -PI / 2); target(24, -10.5, PI); target(34, -19.5, 0); cr(27, -20.5, 1.3, 1.2, TAN); cr(20, -12, 1.3, 1.2, OLV); cr(33, -15.5, 1, .8, TAN);
    b.mark('B', 13.83, 1.9, -17, 1.4, 1.4, -PI / 2, '#b8402e'); sign('3', 12.6, -13.2, PI / 2);
    // 4 cover yard: blocks, crates, tyres and barriers at standing and crouching heights
    [[-14, 10, 2, .6, 1.1], [-8, 2, .6, 2.4, 1.1], [-2, 8, 2.4, .6, 2], [4, 1, .6, 2, 2], [-12, -0, 2, .6, 2], [7, 10, 2, .6, 1.1], [-5, 12, .6, 2, 1.1]].forEach(function (q) { b.box(q[0], q[1], q[2], q[3], q[4], 0xa7a39a, 0, true, 'block'); });
    cr(-16, 4, 1.3, 1.2, OLV); cr(-16, 5.4, 1, .8, OLV); cr(0, 3, 1.3, 1.2, TAN); cr(1.4, 3, 1.3, 1.2, TAN); cr(.7, 3, 1.1, .9, TAN); cr(9, 5, 1.3, 1.2, OLV); cr(-9, 8.5, 1, .8, TAN);
    b.tires(-11, 5, 3); b.tires(3, 12, 3); b.tires(8.5, -.5, 2); b.jersey(-3, 0, 3, false); b.jersey(-17, 12, 3, true); b.barrel(5.5, 6, 0x7a3f30); b.barrel(-6.5, 5.5, OLV); bags(10, 12, 4, .3);
    target(-13, 8.9, 0); target(-1, 6.6, 0); target(5.2, -1, PI / 2); target(8, 8.9, 0); sign('4', -4, 15.2, 0);
    // 5 throwing bay: throw line, rings on the ground, a few drums to aim at
    B(17.2, -3.5, 17.8, 1, 1.1, 0xa7a39a, 'block'); B(17.2, 4, 17.8, 9.5, 1.1, 0xa7a39a, 'block');   /* a gap in the throw line lets you walk in to look */ b.quad('rings', 29, .04, 3, 13, 13, 0, { flat: true, mode: 'alpha', make: function () { var a = cv(256, 256), c = a[1]; c.strokeStyle = '#e8892a'; [120, 84, 46].forEach(function (r, n) { c.lineWidth = n ? 5 : 7; c.beginPath(); c.arc(128, 128, r, 0, 6.2832); c.stroke(); }); c.fillStyle = '#e8892a'; c.beginPath(); c.arc(128, 128, 9, 0, 6.2832); c.fill(); return a[0]; } });
    B(18, 10.2, 39.9, 10.6, 2.4, CW, 'conc'); B(18, -5.2, 39.9, -4.8, 1.1, CW, 'conc'); b.barrel(29, 3, 0x7a3f30); b.barrel(33, -1, OLV); b.barrel(25, 7, OLV); bags(36, 5, 4, PI / 2); sign('5', 15.6, 3, PI / 2);
    // 6 weapon test hall: open front, racks on the wall, a workbench, three targets at the far end
    B(16, 13.8, 38, 14.2, 4, CW, 'conc'); B(37.8, 14, 38.2, 28, 4, CW, 'conc'); B(16, 27.8, 38, 28.2, 4, CW, 'conc'); B(15.8, 14, 16.2, 17.5, 4, CW, 'conc'); B(15.8, 24.5, 16.2, 28, 4, CW, 'conc'); B(15.8, 17.5, 16.2, 24.5, .8, CW2, 'conc', 3.2, false); B(15.6, 13.6, 38.4, 28.4, .3, 0x5d666c, 'corr', 4, true);
    for (i = 0; i < 7; i++) { b.box(19 + i * 2.2, 14.35, 1.6, .1, 1.5, 0x3a4046, .9, false, 'metal'); b.box(19 + i * 2.2, 14.45, 1.1, .06, .16, 0x15181a, 1.9, false, 'plain'); b.box(19 + i * 2.2, 14.45, .9, .06, .14, 0x15181a, 1.4, false, 'plain'); }
    B(20, 26.4, 26, 27.4, .9, 0x6a5e4c, 'crate'); b.box(22, 26.9, .8, .4, .25, 0x33383c, .9, false, 'metal'); cr(28, 26.6, 1.3, 1.2, OLV); cr(36.6, 15.5, 1, .8, TAN); [20, 28, 35].forEach(function (x) { b.box(x, 21, 1.4, .3, .08, 0x3a3f44, 3.9, false, 'metal'); b.glow(x, 3.85, 21, 1.3, .05, .22, 0xfff2d0); });
    target(37.4, 17.5, -PI / 2); target(37.4, 21, -PI / 2); target(37.4, 24.5, -PI / 2); b.mark('TEST', 15.78, 3.5, 21, 2.6, .8, -PI / 2, '#ffd27a'); sign('6', 14.6, 21, PI / 2);
    // trees beyond the wall
    [[-46, -20], [-47, 4], [-45, 24], [46, -22], [47, 2], [45, 22], [-24, -37], [4, -38], [28, -37], [-28, 37], [26, 38]].forEach(function (q, n) { var k = 1.2 + (n % 3) * .25; b.cyl(q[0], q[1], .28 * k, 3.2 * k, 0x4a3a28, 0, false, 'plain', .2 * k, 8); [[0, 4.4, 0, 2.3], [1.3, 3.6, .4, 1.7], [-1.2, 3.8, -.5, 1.8], [.3, 3.4, -1.4, 1.6]].forEach(function (c, m) { var g = new T.IcosahedronGeometry(c[3] * k, 1); g.translate(q[0] + c[0] * k, c[1] * k, q[1] + c[2] * k); b.geo(g, m % 2 ? 0x3f5a2c : 0x4c6a33, 'plain', {}); }); });
    [-4, -2, 0, 2, 4].forEach(function (x) { b.spawns.A.push({ x: x, z: 24.5 }); b.spawns.B.push({ x: -6 + x, z: 6 }); });
    return { name: '사격 연습장', b: b, bounds: { minx: -41, maxx: 41, minz: -31, maxz: 31 }, bg: 0x93a7b8, fog: [60, 240], hemi: [0xe2ebf2, 0x6a5c48, 1], sun: [0xfff0d0, 1.7, [-26, 40, 18]], rain: false, sky: [0x3a6aa6, 0xd9cdb4], hdri: ['day', .8, 1.5, 8, 1], dim: 1, lod: [40, 80], targets: tg, armory: armory };
  }

  // 08–11 세관 야적장 · 고갯길 검문소 · 폐공장 · 시장 골목 — drawn from the approved plan sheets (the 3D draft).
  // A plan is a list of entries on a 90 x 56 m sheet, x to the right and y down (world x = x - 45, z = y - 28):
  //   ['room', x, y, w, h, name, twoStorey, open]   name '' is an outline that only holds rooms; open: posts and a roof, no walls
  //   ['door', x, y, onHorizontalWall, width]      ['cover', x, y, w, h]      ['spawn', x, y, w, h, team]      ['site', x, y, n]
  // planned() builds it the way the other maps are built: merged walls with door gaps and lintels, floors, roofs, lamps, a
  // walkway with stairs in each two-storey hall (the players' upper floor, like the warehouse catwalk: bots keep to the ground),
  // cover from the plan, and the rooms furnished by their kind with the same rules as the draft.
  var FK = { wood: 0x8a6a45, dark: 0x3d3a36, metal: 0x7d858c, steel: 0x58606a, blue: 0x3f5f86, red: 0x8c3b2f, fab: 0x56677a, paper: 0xd8d2c0, orange: 0xc97a2b, screen: 0x14191f, sand: 0xa58d63, white: 0xd9dcdf,
    desk: 0xd9d5cb, leg: 0x6d737a, rail: 0xaab2ba, chair: 0x24272b, carpet: 0x55606c, leaf: 0x3f7a3a, pot: 0x8a5a3a, cork: 0xb08a5a, board: 0xeef0f0, bind: [0x2f5d8a, 0x8c3b2f, 0x3f6b3f, 0xc9a227, 0x4a4a4a, 0x6a4a8a] };
  // a frame turned by `a` about the vertical; pieces are given in its own coordinates (x across, z toward the front)
  function Fr(b, x, z, a) {
    var c = Math.cos(a), s = Math.sin(a), q = Math.abs(s) > .5, f = { ang: a,
      at: function (lx, lz) { return [x + lx * c + lz * s, z - lx * s + lz * c]; },
      sub: function (lx, lz, a2) { var p = f.at(lx, lz); return Fr(b, p[0], p[1], a + a2); },
      B: function (lx, ly, lz, w, h, d, col, t) { var p = f.at(lx, lz); b.rbox(p[0], p[1], w, d, h, col, ly, a, false, t); },
      Cy: function (lx, ly, lz, r, h, col, t) { var p = f.at(lx, lz); b.cyl(p[0], p[1], r, h, col, ly, false, t || 'plain', r, 10); },
      Ball: function (lx, ly, lz, r, col) { var p = f.at(lx, lz), g = new T.IcosahedronGeometry(r, 1); g.translate(p[0], ly, p[1]); b.geo(g, col, 'plain', { pass: true }); },
      G: function (lx, ly, lz, w, h, d, col) { var p = f.at(lx, lz); b.glow(p[0], ly + h / 2, p[1], q ? d : w, h, q ? w : d, col); },
      Seg: function (x0, y0, z0, x1, y1, z1, r, col) { var p = f.at(x0, z0), e = f.at(x1, z1); b.seg(p[0], y0, p[1], e[0], y1, e[1], r, col, 'metal'); }
    }; return f;
  }
  function chairF(f) { f.B(0, .42, 0, .5, .07, .48, FK.chair); f.B(0, .5, -.22, .48, .55, .06, FK.chair); f.Cy(0, .08, 0, .03, .34, FK.leg); f.B(0, .03, 0, .56, .04, .07, FK.leg); f.B(0, .03, 0, .07, .04, .56, FK.leg); f.B(-.27, .55, 0, .04, .04, .32, FK.chair); f.B(.27, .55, 0, .04, .04, .32, FK.chair); }
  function deskF(d, w, k) {
    d.B(0, .72, 0, w, .04, .75, FK.desk); d.B(-w / 2 + .03, 0, 0, .04, .72, .72, FK.leg); d.B(w / 2 - .03, 0, 0, .04, .72, .72, FK.leg); d.B(0, .28, .34, w - .1, .42, .03, FK.leg);
    d.B(0, .76, .2, .22, .02, .16, FK.leg); d.B(0, .78, .22, .04, .16, .04, FK.leg); d.B(0, .92, .22, .58, .34, .03, FK.screen); d.G(0, .95, .205, .52, .28, .005, 0x6d93b8); d.B(0, .76, -.1, .45, .02, .15, FK.leg);
    if (k % 3 !== 1) d.B(w / 2 - .28, .76, -.02, .24, .03 + (k % 2) * .05, .32, 0xf1eee6); if (k % 2 === 0) d.Cy(-w / 2 + .22, .76, .04, .04, .1, [0xc8452f, 0x2f5d8a, 0xeeeeee][k % 3]);
    d.B(w / 2 - .25, 0, .08, .4, .58, .55, FK.leg);
  }
  function bookF(f) {
    [-.88, .88].forEach(function (x) { f.B(x, 0, 0, .04, 2.05, .4, 0x8a6a45); }); f.B(0, 0, -.18, 1.8, 2.05, .02, 0x6e5538);
    for (var i = 0; i < 5; i++) { f.B(0, .02 + i * .5, 0, 1.76, .03, .38, 0x8a6a45); if (i < 4) for (var k = 0; k < 3; k++) f.B(-.56 + k * .57, .05 + i * .5, 0, .5 - ((i + k) % 3) * .07, .27 + ((i * k) % 2) * .05, .3, FK.bind[(i * 3 + k) % 6]); }
  }
  // furniture: [width, depth, collision height (0: none, or the piece makes its own), draw(frame, builder)]. Centred; the front faces +z.
  var FURN = {
    shelf: [2.2, .5, 2.2, function (f) { f.B(0, 0, 0, 2.2, .05, .5, FK.steel, 'metal'); for (var i = 0; i < 4; i++) f.B(0, .05 + i * .55, 0, 2.2, .04, .5, FK.steel, 'metal'); [-1.08, 1.08].forEach(function (x) { f.B(x, 0, 0, .05, 2.2, .5, FK.steel, 'metal'); }); for (var j = 0; j < 5; j++) f.B(-.86 + j * .42, .09 + ((j * 7) % 4) * .55, 0, .3, .3, .35, [FK.wood, FK.paper, FK.blue][j % 3], j % 3 ? 'plain' : 'crate'); }],
    rack: [3, 1.1, 3.4, function (f) { [-1.45, 1.45].forEach(function (x) { f.B(x, 0, 0, .1, 3.4, 1.1, FK.orange, 'metal'); }); [1.1, 2.3, 3.3].forEach(function (y) { f.B(0, y, 0, 3, .08, 1.1, FK.blue, 'metal'); }); f.B(-.7, 1.18, 0, 1.2, .9, 1, 0xb39a72, 'crate'); f.B(.7, 2.38, 0, 1.2, .85, 1, 0x9c8a62, 'crate'); f.B(.6, 0, 0, 1.3, .15, 1, FK.wood, 'crate'); f.B(.6, .15, 0, 1.1, .8, .9, FK.sand, 'crate'); }],
    locker: [1.6, .5, 1.9, function (f) { for (var i = 0; i < 3; i++) { f.B(-.53 + i * .53, 0, 0, .5, 1.9, .5, FK.steel, 'paint'); f.B(-.53 + i * .53, 1.4, .25, .3, .05, .01, FK.dark); } }],
    cabinet: [1, .6, 1.3, function (f) { f.B(0, 0, 0, .9, 1.3, .6, 0x9aa1a6, 'paint'); for (var i = 0; i < 3; i++) f.B(0, .2 + i * .38, .31, .4, .04, .02, FK.dark); }],
    counter: [3, .7, 1.1, function (f) { f.B(0, 0, 0, 3, 1.05, .7, FK.wood, 'crate'); f.B(0, 1.05, 0, 3.1, .05, .8, FK.dark); f.B(-.8, 1.1, -.05, .5, .35, .08, FK.screen); }],
    bench: [2.4, .8, 1, function (f) { f.B(0, .85, 0, 2.4, .08, .8, FK.steel, 'metal'); [-1.1, 1.1].forEach(function (x) { f.B(x, 0, 0, .08, .85, .75, FK.dark); }); f.B(-.6, .93, 0, .5, .2, .35, FK.red); f.B(.5, .93, -.1, .3, .4, .3, FK.metal, 'metal'); }],
    bunk: [2, .9, 2, function (f) { [0, 1].forEach(function (k) { f.B(0, .35 + k * 1.1, 0, 2, .12, .9, FK.steel, 'metal'); f.B(0, .47 + k * 1.1, 0, 1.9, .15, .85, 0x5a6448, 'canvas'); }); [-.95, .95].forEach(function (x) { [-.4, .4].forEach(function (z) { f.B(x, 0, z, .06, 1.9, .06, FK.steel); }); }); }],
    console: [2.6, .8, 1.35, function (f) { f.B(0, 0, 0, 2.6, .9, .8, 0x6a737b, 'paint'); for (var i = 0; i < 3; i++) { f.B(-.85 + i * .85, .9, -.15, .7, .45, .06, FK.screen); f.G(-.85 + i * .85, .95, -.115, .62, .36, .01, [0x1c3a34, 0x1e3046, 0x1c3a34][i]); } }],
    pipes: [4, .4, 0, function (f) { f.Seg(-2, 2.85, -.05, 2, 2.85, -.05, .18, FK.metal); f.Seg(-2, 3.05, .1, 2, 3.05, .1, .14, FK.red); }],
    sandbag: [2.4, .7, 1, function (f) { for (var r = 0; r < 3; r++) for (var i = 0; i < 4; i++) f.B(-.9 + i * .6 + (r % 2) * .3 - .15, r * .3, 0, .58, .3, .7, FK.sand, 'canvas'); }],
    tires: [1.2, 1.2, 0, function (f, b) { var p = f.at(0, 0); b.tires(p[0], p[1], 3); }],
    barrels: [1.3, .7, 0, function (f, b) { var p = f.at(-.33, 0), q = f.at(.33, 0); b.barrel(p[0], p[1], C.blue); b.barrel(q[0], q[1], C.red); }],
    bookcase: [1.8, .4, 2.05, bookF],
    copier: [.9, .7, 1.05, function (f) { f.B(0, 0, 0, .85, .9, .65, FK.board); f.B(0, .9, 0, .85, .12, .6, 0xcfd3d6); f.B(.2, .9, .27, .35, .06, .12, 0x333a40); f.B(0, .2, .33, .7, .05, .04, FK.leg); f.B(-.45, .75, 0, .1, .03, .4, FK.board); }],
    water: [.5, .4, 1.45, function (f) { f.B(0, 0, 0, .34, 1, .34, FK.board); f.Cy(0, 1, 0, .15, .45, 0x7fb6e0); f.B(0, .62, .18, .1, .04, .04, 0xc8452f); }],
    plant: [.7, .7, 1.4, function (f) { f.Cy(0, 0, 0, .24, .42, FK.pot); f.Cy(0, .42, 0, .06, .3, 0x5a4632); f.Ball(0, .95, 0, .38, FK.leaf); f.Ball(.12, 1.25, -.05, .28, 0x4a8a42); f.Ball(-.15, 1.15, .1, .24, FK.leaf); }],
    whiteboard: [2, .12, 0, function (f) { f.B(0, .9, -.03, 1.9, 1.15, .03, 0xb9bec2); f.B(0, .93, -.005, 1.82, 1.08, .01, FK.board); f.B(0, .88, .04, 1.6, .03, .08, 0xb9bec2); [[-.5, 1.45, .5], [.1, 1.3, .7], [.4, 1.6, .3]].forEach(function (l, i) { f.B(l[0], l[1], .007, l[2], .02, .005, [0x2f5d8a, 0xc8452f, 0x222222][i]); }); }],
    notice: [1.3, .1, 0, function (f) { f.B(0, 1.05, -.02, 1.2, .85, .03, FK.cork); [[-.35, 1.6, 0xffffff], [.1, 1.5, 0xf3e27a], [.38, 1.7, 0xffffff], [-.2, 1.25, 0xa8d8f0], [.3, 1.25, 0xffffff]].forEach(function (n) { f.B(n[0], n[1] - .12, .0, .2, .26, .005, n[2]); }); }],
    sofa: [2, .85, .9, function (f) { f.B(0, 0, .02, 2, .42, .8, 0x3d4f63, 'canvas'); f.B(0, .42, -.3, 2, .45, .2, 0x3d4f63, 'canvas'); [-.95, .95].forEach(function (x) { f.B(x, 0, .02, .12, .62, .8, 0x34465a, 'canvas'); }); f.B(-.5, .42, .07, .85, .1, .6, 0x4a5f76, 'canvas'); f.B(.5, .42, .07, .85, .1, .6, 0x4a5f76, 'canvas'); }],
    printer: [1, .6, 1.1, function (f) { f.B(0, .7, 0, 1, .04, .6, FK.desk); [-.46, .46].forEach(function (x) { f.B(x, 0, 0, .04, .7, .56, FK.leg); }); f.B(-.1, .74, 0, .5, .3, .42, 0x2a2e33); f.B(-.1, 1.04, 0, .36, .02, .2, 0xf1eee6); f.B(.33, .74, 0, .22, .12, .3, 0xf1eee6); }],
    coat: [.6, .5, 1.8, function (f) { f.Cy(0, 0, 0, .2, .03, FK.leg); f.Cy(0, 0, 0, .025, 1.8, FK.leg); f.B(0, 1.15, 0, .3, .65, .12, 0x3a3f45, 'canvas'); }],
    // free-standing pieces for the middle of a room
    pod: [3.3, 2.9, 1.25, function (f) {
      [-1, 1].forEach(function (sd, a) { [-.78, .78].forEach(function (xx, k) { var n = a * 2 + k; deskF(f.sub(xx, sd * .42, sd > 0 ? PI : 0), 1.5, n); chairF(f.sub(xx + (n - 1.5) * .06, sd * 1.12, (sd > 0 ? PI : 0) + (n % 3 - 1) * .25)); }); });
      f.B(0, 0, 0, 3.15, 1.25, .05, FK.fab, 'canvas'); f.B(0, 1.25, 0, 3.2, .04, .08, FK.rail); [-1, 1].forEach(function (sd) { f.B(0, 0, sd * .42, .05, 1.1, .75, FK.fab, 'canvas'); f.B(sd * 1.58, 0, 0, .05, 1.1, 1.6, FK.fab, 'canvas'); f.B(sd * 1.58, 1.1, 0, .08, .04, 1.64, FK.rail); }); }],
    meeting: [3.2, 2.4, .8, function (f) { f.B(0, .74, 0, 3, .05, 1.2, 0x6e5538, 'crate'); [-1.1, 1.1].forEach(function (x) { f.B(x, 0, 0, .1, .74, .8, FK.leg); }); [-1, 0, 1].forEach(function (i) { chairF(f.sub(i * .95, -.95, 0)); chairF(f.sub(i * .95, .95, PI)); }); f.B(.4, .79, 0, .4, .03, .3, 0xf1eee6); f.B(-.6, .79, .1, .32, .02, .22, 0x2a2e33); }],
    lone: [1.5, 1.9, 1.2, function (f) { deskF(f.sub(0, -.1, PI), 1.5, 1); chairF(f.sub(.05, .65, PI)); f.B(0, 0, -.62, 1.6, 1.2, .05, FK.fab, 'canvas'); }],
    archive: [3.4, .8, 2.05, function (f) { [-.86, .86].forEach(function (x) { bookF(f.sub(x, .2, 0)); bookF(f.sub(x, -.2, PI)); }); }],
    waiting: [2.4, .7, .95, function (f) { f.B(0, 0, 0, 2.4, .08, .5, FK.leg); for (var i = 0; i < 4; i++) { f.B(-.9 + i * .6, .42, 0, .5, .06, .48, 0x3d4f63, 'canvas'); f.B(-.9 + i * .6, .48, -.22, .5, .45, .05, 0x3d4f63, 'canvas'); f.B(-.9 + i * .6, 0, 0, .04, .42, .04, FK.leg); } }],
    reception: [3.4, 2.1, 1.15, function (f) { f.B(0, 0, -.45, 3.2, 1.1, .25, 0x6e5538, 'crate'); f.B(0, 1.1, -.5, 3.3, .05, .4, 0xd9d5cb); f.B(0, 0, -.1, 3.2, .72, .6, FK.desk); f.B(-.6, .76, -.1, .55, .34, .03, FK.screen); chairF(f.sub(-.6, .6, PI)); f.B(.8, .76, -.05, .3, .05, .22, 0xf1eee6); }],
    desk: [1.6, 1.4, 1.1, function (f) { f.B(0, .72, -.3, 1.6, .05, .8, FK.wood, 'crate'); f.B(0, 0, -.65, 1.6, .72, .05, FK.wood, 'crate'); [-.75, .75].forEach(function (x) { f.B(x, 0, -.3, .05, .72, .8, FK.dark); }); f.B(.3, .77, -.5, .55, .38, .05, FK.screen); f.B(-.4, .77, -.25, .4, .05, .3, FK.paper); chairF(f.sub(0, .35, PI)); }],
    table: [2.2, 2.2, .8, function (f) { f.B(0, .76, 0, 2.2, .06, 1.1, FK.wood, 'crate'); [-1, 1].forEach(function (x) { [-.45, .45].forEach(function (z) { f.B(x, 0, z, .07, .76, .07, FK.dark); }); }); [-.6, .6].forEach(function (x) { f.B(x, 0, .85, .45, .45, .45, FK.wood, 'crate'); f.B(x, 0, -.85, .45, .45, .45, FK.wood, 'crate'); }); f.B(.4, .82, 0, .3, .25, .3, FK.white); }],
    crates: [2.3, 1.2, 0, function (f, b) { var p = f.at(-.55, 0), q = f.at(.62, 0); b.crate(p[0], p[1], 1.1, 0xb39058); b.crate(q[0], q[1], .95, 0xc9a66e); b.crate(p[0], p[1], .9, 0x9c8a62, 1.1); }],
    pallet: [1.4, 1.2, 1.05, function (f, b) { var p = f.at(0, 0); b.pallet(p[0], p[1], 0, Math.abs(Math.sin(f.ang)) > .5); f.B(0, .14, 0, 1.1, .9, .95, 0xb39a72, 'crate'); f.B(0, 1.04, 0, .7, .3, .6, 0x8f8468, 'crate'); }],
    xray: [2.8, 1.2, 1.85, function (f) { f.B(0, 0, 0, 2.8, .75, .9, FK.dark, 'metal'); f.B(-.2, .75, 0, 1, 1.1, 1.1, FK.white, 'paint'); f.B(-.2, .95, .56, .6, .5, .02, FK.screen); f.B(1.1, .75, 0, .6, .15, .7, FK.paper); f.B(-1.25, .75, 0, .3, .02, .9, 0x1c1f22); }],
    car: [4.6, 2.2, 0, function (f, b) { var p = f.at(0, 0); if (!b.prop('covered_car', p[0], p[1], f.ang + PI / 2, 1)) { f.B(0, .25, 0, 4, .75, 1.8, FK.blue, 'paint'); f.B(-.3, 1, 0, 2.2, .6, 1.6, FK.blue, 'paint'); b.solid(p[0], p[1], 4, 4, 1.6); } }],
    forklift: [2.4, 1.3, 2.2, function (f) { f.B(0, .2, 0, 1.6, 1, 1.2, C.yellow, 'metal'); f.B(-.3, 1.2, 0, .9, 1, 1.1, FK.dark); f.B(1, 0, -.35, .08, 2.2, .08, FK.dark); f.B(1, 0, .35, .08, 2.2, .08, FK.dark); f.B(1.4, .1, 0, .9, .06, .9, FK.steel, 'metal'); [[-.55, -.6], [.55, -.6], [-.55, .6], [.55, .6]].forEach(function (q) { f.Cy(q[0], 0, q[1], .28, .2, 0x17191b); }); }],
    stall: [2.2, 1.2, 1, function (f) { f.B(0, 0, 0, 2.2, .9, 1.1, FK.wood, 'crate'); f.B(0, .9, 0, 2, .25, 1, FK.orange); f.B(0, 2.6, 0, 2.6, .06, 1.6, FK.red, 'canvas'); [-1.05, 1.05].forEach(function (x) { f.B(x, .9, -.5, .06, 1.7, .06, FK.dark); }); [-.6, 0, .6].forEach(function (x, i) { f.Ball(x, 1.25, .1, .16, [0xc8452f, 0xd9a52f, 0x5a8a3a][i]); }); }],
    sandbagM: [2.4, .8, 1, function (f) { FURN.sandbag[3](f); }],
    machine: [3.4, 1.8, 2.4, function (f) { f.B(0, 0, 0, 3.4, 1.15, 1.8, 0x5c6b5e, 'paint'); f.B(-.5, 1.15, 0, 1.9, .9, 1.25, 0x77808a, 'metal'); f.Cy(1.05, 1.15, 0, .55, 1.3, 0xb7b0a0, 'metal'); f.Cy(1.05, 2.45, 0, .08, 1.2, 0x8c3b2f); f.B(-1.2, .5, .91, .5, .35, .02, 0x2a2e31); f.G(-1.2, .78, .92, .12, .05, .01, 0x8fe0a8); }]
  };
  // which pieces furnish which kind of room (by its name), as in the draft
  function roomKit(name) {
    if (/사무/.test(name)) return { carpet: 1, gap: .3, wall: ['plant', 'cabinet', 'cabinet', 'bookcase', 'copier', 'water', 'whiteboard', 'bookcase', 'cabinet', 'printer', 'notice', 'coat', 'plant'], grid: [['pod', 6, 1.6], ['meeting', 1, 1.5], ['lone', 2, 1.4]] };
    if (/복도/.test(name)) return { carpet: 1, gap: .5, wall: ['plant', 'sofa', 'water', 'notice', 'sofa', 'plant', 'cabinet'], grid: [['reception', 1, 1.4], ['waiting', 2, 1.4]] };
    if (/보관/.test(name)) return { gap: .15, wall: ['bookcase', 'bookcase', 'bookcase', 'cabinet', 'bookcase', 'bookcase'], grid: [['archive', 6, 1.4], ['lone', 1, 1.2]] };
    if (/검사/.test(name)) return { gap: .35, wall: ['counter', 'cabinet', 'bookcase', 'water', 'notice', 'cabinet'], grid: [['xray', 1, 1.6], ['lone', 2, 1.2], ['waiting', 1, 1.3]] };
    if (/제어/.test(name)) return { carpet: 1, gap: .3, wall: ['console', 'console', 'cabinet', 'bookcase', 'whiteboard', 'plant'], grid: [['meeting', 1, 1.3], ['lone', 2, 1.2]] };
    if (/약국|이발/.test(name)) return { gap: .4, wall: ['counter', 'shelf', 'shelf', 'plant', 'cabinet'], mid: ['table'] };
    if (/빈 가게/.test(name)) return { wall: ['shelf'], mid: ['crates', 'pallet'] };
    if (/공장/.test(name)) return { wall: ['rack', 'barrels', 'bench', 'rack'], mid: ['forklift', 'crates', 'pallet'] };
    if (/창고|하역|공방/.test(name)) return { wall: ['rack', 'rack', 'barrels', 'rack'], mid: ['crates', 'pallet', 'forklift', 'crates', 'pallet'] };
    if (/막사|여관/.test(name)) return { wall: ['bunk', 'locker', 'bunk', 'locker'], mid: ['table'] };
    if (/정비|차고/.test(name)) return { wall: ['bench', 'tires', 'locker', 'bench'], mid: ['car', 'barrels'] };
    if (/찻집|식당|잡화/.test(name)) return { wall: ['counter', 'shelf', 'shelf'], mid: ['table', 'table', 'stall'] };
    if (/검문|초소/.test(name)) return { wall: ['sandbag', 'counter', 'locker'], mid: ['sandbagM', 'desk'] };
    if (/배수|배관|통로/.test(name)) return { wall: ['pipes', 'pipes', 'pipes', 'pipes', 'pipes', 'pipes', 'pipes'], mid: [] };
    return { wall: ['shelf', 'cabinet'], mid: ['crates'] };
  }
  function planned(PLN, th) {
    var b = Builder(), D = PLN.plan, OX = PLN.W / 2, OZ = PLN.H / 2, HW = OX, HD = OZ, i;
    b.day = false;
    // the sheet in world coordinates
    var rooms = [], doors = [], covers = [], spawns = [], sites = [], walks = [], stairs = [], bars = [], conts = [], waters = [], decks = [], steps = [], roads = [], lanes = [];
    function rect(e) { return { x: e[1] - OX, z: e[2] - OZ, w: e[3], d: e[4] }; }
    D.forEach(function (e) {
      if (e[0] === 'wall') bars.push(rect(e)); else if (e[0] === 'cont') { var c = rect(e); c.lv = e[5] || 1; conts.push(c); } else if (e[0] === 'water') waters.push(rect(e));
      else if (e[0] === 'bridge' || e[0] === 'ford' || e[0] === 'walk') { var k = rect(e); k.kind = e[0]; decks.push(k); } else if (e[0] === 'stairs') steps.push(rect(e)); else if (e[0] === 'road') roads.push(rect(e));
      else if (e[0] === 'lane') lanes.push({ kind: e[1], pts: e[2].map(function (q) { return [q[0] - OX, q[1] - OZ]; }) });
      if (e[0] === 'room') rooms.push({ x: e[1] - OX, z: e[2] - OZ, w: e[3], d: e[4], name: e[5], two: !!e[6], open: /지붕만/.test(e[5]) });
      else if (e[0] === 'door') doors.push({ x: e[1] - OX, z: e[2] - OZ, hz: !!e[3], w: e[4] });
      else if (e[0] === 'cover') covers.push({ x: e[1] - OX, z: e[2] - OZ, w: e[3], d: e[4] });
      else if (e[0] === 'spawn') spawns.push({ x: e[1] - OX + e[3] / 2, z: e[2] - OZ + e[4] / 2, team: e[5] });
      else if (e[0] === 'site') sites.push({ x: e[1] - OX, z: e[2] - OZ, id: e[3] === '1' || e[3] === 'A' ? 'A' : 'B' });
    });
    function inside(o, r, m) { m = m || 0; return o.x >= r.x - .01 - m && o.z >= r.z - .01 - m && o.x + (o.w || 0) <= r.x + r.w + .01 + m && o.z + (o.d || 0) <= r.z + r.d + .01 + m; }
    function roomOf(x, z) { var best = null; rooms.forEach(function (r) { if (r.name && x > r.x && x < r.x + r.w && z > r.z && z < r.z + r.d && (!best || r.w * r.d < best.w * best.d)) best = r; }); return best; }
    rooms.forEach(function (r) { r.ht = r.two ? 6.4 : (th.ht || 3.3); r.top = !rooms.some(function (o) { return o !== r && o.w * o.d > r.w * r.d && inside(r, o); }); r.leaf = !rooms.some(function (o) { return o !== r && inside(o, r); }); });
    function hit(a, c, m) { m = m || 0; return a.x < c.x + c.w + m && a.x + a.w > c.x - m && a.z < c.z + c.d + m && a.z + a.d > c.z - m; }
    function siteBox(s, m) { return { x: s.x - 3 - m, z: s.z - 3 - m, w: 6 + 2 * m, d: 6 + 2 * m }; }

    // ---- ground, the outer wall, the land beyond ----
    b.ghost = true; b.box(0, 0, 220, 180, .3, th.far, -.62, false, th.farT || 'plain'); b.ghost = false;
    b.box(0, 0, HW * 2 + 2, HD * 2 + 2, .4, th.ground, -.4, false, th.groundT);
    var OH = th.hall ? th.hall : th.outerH || 4.2;
    [[0, -HD - .2, HW * 2 + 1, .4], [0, HD + .2, HW * 2 + 1, .4], [-HW - .2, 0, .4, HD * 2 + .8], [HW + .2, 0, .4, HD * 2 + .8]].forEach(function (q) { b.box(q[0], q[1], q[2], q[3], OH, th.outer, 0, true, th.outerT || 'conc'); });
    if (!th.hall) [[0, -HD - .2, HW * 2 + 1.2, .7], [0, HD + .2, HW * 2 + 1.2, .7], [-HW - .2, 0, .7, HD * 2 + 1], [HW + .2, 0, .7, HD * 2 + 1]].forEach(function (q) { b.box(q[0], q[1], q[2], q[3], .14, 0x6f7270, OH, false, 'conc'); });
    else {   // one big indoor hall: floor, roof on trusses, rows of lamps
      b.box(0, 0, HW * 2, HD * 2, .03, th.floor || 0xa8acad, 0, false, 'floor'); b.box(0, 0, HW * 2 + 1, HD * 2 + 1, .3, th.roofC || 0x5d666c, OH, true, 'panel');
      for (var tx = -HW + 4; tx < HW; tx += 6) b.box(tx, 0, .2, HD * 2, .25, 0x4f585e, OH - .3, false, 'metal');
      for (var lx0 = -HW + 5; lx0 < HW - 2; lx0 += 8) for (var lz0 = -HD + 5; lz0 < HD - 2; lz0 += 8) { b.glow(lx0, OH - .08, lz0, 1.4, .06, .5, C.sky); b.light(lx0, OH - .6, lz0, 0xd6e6f2, 1.3, 14); }
    }
    roads.forEach(function (r) { b.box(r.x + r.w / 2, r.z + r.d / 2, r.w, r.d, .02, th.roadC || 0x5a5852, 0, false, 'conc'); });

    // ---- walkway and stairs in each two-storey hall: along the longest wall whose strip keeps clear of the bomb sites ----
    rooms.forEach(function (r) {
      if (!r.two || decks.some(function (k) { return k.kind === 'walk' && hit(k, r); })) return; var best = null;
      [['n', r.x, r.z, r.w, 3.1, 1], ['s', r.x, r.z + r.d - 3.1, r.w, 3.1, 1], ['w', r.x, r.z, 3.1, r.d, 0], ['e', r.x + r.w - 3.1, r.z, 3.1, r.d, 0]].forEach(function (c) {
        var band = { x: c[1], z: c[2], w: c[3], d: c[4] }, len = c[5] ? c[3] : c[4]; if (sites.some(function (s) { return hit(band, siteBox(s, 0)); })) return;
        // stairs at one or both ends, running along the wall; an end is refused when a door opens there
        var ends = [0, 1].filter(function (k) { var st = c[5] ? { x: k ? c[1] + c[3] - 4.6 : c[1], z: c[2], w: 4.6, d: c[4] } : { x: c[1], z: k ? c[2] + c[4] - 4.6 : c[2], w: c[3], d: 4.6 };
          return !doors.some(function (dd) { var dr = dd.hz ? { x: dd.x - dd.w / 2, z: dd.z - .2, w: dd.w, d: .4 } : { x: dd.x - .2, z: dd.z - dd.w / 2, w: .4, d: dd.w }; return hit(st, dr, .6); }); });
        if (!ends.length || len < 10) return; var sc = len + ends.length * 3; if (!best || sc > best.sc) best = { c: c, ends: len >= 15 ? ends : ends.slice(0, 1), sc: sc };
      });
      if (!best) return; var c = best.c, along = c[5], wall = { n: -1, s: 1, w: -1, e: 1 }[c[0]], a0 = along ? r.x + .15 : r.z + .15, a1 = along ? r.x + r.w - .15 : r.z + r.d - .15;
      var lineOut = along ? (wall < 0 ? r.z + .15 : r.z + r.d - .15) : (wall < 0 ? r.x + .15 : r.x + r.w - .15), inner = lineOut - wall * 3, sw = 2.2, d0 = a0, d1 = a1;
      function P(a, o) { return along ? [a, o] : [o, a]; }                          // (along, across) to world x, z
      best.ends.forEach(function (k) {
        var dir = k ? -1 : 1, start = k ? a1 : a0, n;                                  // the foot of the stairs is at the hall's end wall
        for (n = 0; n < 7; n++) { var am = start + dir * (.3 + n * .6), om = lineOut - wall * sw / 2, p = P(am, om), top = .4 * (n + 1); b.box(p[0], p[1], along ? .6 : sw, along ? sw : .6, top, th.stairC || 0x6b7075, 0, true, 'metal'); b.box(p[0], p[1], along ? .62 : sw + .02, along ? sw + .02 : .62, .05, C.yellow, top - .05, false); }
        var rs = P(start + dir * 2.1, lineOut - wall * (sw + .03)); b.box(rs[0], rs[1], along ? 4.2 : .05, along ? .05 : 4.2, .05, C.yellow, 3.4, false);
        if (k) d1 = a1 - 4.2; else d0 = a0 + 4.2;
        stairs.push(along ? { x: Math.min(start, start + dir * 4.2), z: Math.min(lineOut, lineOut - wall * sw), w: 4.2, d: sw } : { x: Math.min(lineOut, lineOut - wall * sw), z: Math.min(start, start + dir * 4.2), w: sw, d: 4.2 });
      });
      var mid = (d0 + d1) / 2, L = d1 - d0, oc = (lineOut + inner) / 2, p = P(mid, oc);
      b.box(p[0], p[1], along ? L : 3, along ? 3 : L, .14, 0x5b656c, 2.86, true, 'metal');
      var rail = P(mid, inner + wall * .05); b.box(rail[0], rail[1], along ? L : .05, along ? .05 : L, .05, C.yellow, 3.95, false); b.box(rail[0], rail[1], along ? L : .05, along ? .05 : L, .05, C.yellow, 3.5, false); b.solid(rail[0], rail[1], along ? L : .1, along ? .1 : L, 1, 3, true);
      for (var t = d0 + .2; t <= d1 + .01; t += Math.max(2, L / Math.round(L / 2.5))) { var pp = P(t, inner + wall * .1); b.box(pp[0], pp[1], .16, .16, 2.86, 0x4f585e, 0, true, 'metal'); b.box(pp[0], pp[1], .05, .05, 1, C.yellow, 3, false); }
      walks.push(along ? { x: d0, z: Math.min(lineOut, inner), w: L, d: 3 } : { x: Math.min(lineOut, inner), z: d0, w: 3, d: L });
      // a little cover up there
      var c1 = P(d0 + L * .3, oc + wall * .5), c2 = P(d0 + L * .72, oc + wall * .5); b.crate(c1[0], c1[1], 1.1, 0xb39058, 3); b.crate(c2[0], c2[1], 1, 0x9c8a62, 3);
      // windows high on the outer wall of the upper floor
      b.ghost = true; for (t = d0 + 2; t < d1 - 1; t += 5) { var wq = P(t, lineOut + wall * .15); b.box(wq[0], wq[1], along ? 1.6 : .36, along ? .36 : 1.6, 1, 0x9bb4c4, 4.2, false, 'glass'); } b.ghost = false;
    });

    // ---- walls: every room edge, merged per line so shared walls are drawn once, cut at doors with a lintel above ----
    var lines = {};
    rooms.forEach(function (r) {
      if (r.open) return;
      [[1, r.z, r.x, r.x + r.w], [1, r.z + r.d, r.x, r.x + r.w], [0, r.x, r.z, r.z + r.d], [0, r.x + r.w, r.z, r.z + r.d]].forEach(function (s) { var k = s[0] + ':' + s[1].toFixed(2); (lines[k] = lines[k] || { hz: s[0], at: s[1], segs: [] }).segs.push([s[2], s[3], r.ht]); });
    });
    Object.keys(lines).forEach(function (k) {
      var ln = lines[k], gaps = doors.filter(function (dd) { return dd.hz === !!ln.hz && Math.abs((ln.hz ? dd.z : dd.x) - ln.at) < .25; }).map(function (dd) { var c = ln.hz ? dd.x : dd.z; return [c - dd.w / 2, c + dd.w / 2]; });
      var pts = []; ln.segs.forEach(function (s) { pts.push(s[0], s[1]); }); gaps.forEach(function (g) { pts.push(g[0], g[1]); }); pts.sort(function (p, q) { return p - q; });
      var runs = [];
      for (var j = 0; j < pts.length - 1; j++) {
        var p = pts[j], q = pts[j + 1]; if (q - p < .01) continue; var m = (p + q) / 2, h = 0, g = gaps.some(function (gg) { return m > gg[0] && m < gg[1]; });
        ln.segs.forEach(function (s) { if (m > s[0] && m < s[1]) h = Math.max(h, s[2]); }); if (!h) continue;
        var last = runs[runs.length - 1]; if (last && last.h === h && last.g === g && Math.abs(last.q - p) < .01) last.q = q; else runs.push({ p: p, q: q, h: h, g: g });
      }
      runs.forEach(function (rn, n) {
        var prev = runs[n - 1], next = runs[n + 1], p = rn.p, q = rn.q;
        if (!rn.g) { if (ln.hz) { if (!(prev && prev.g && Math.abs(prev.q - p) < .01)) p -= .15; if (!(next && next.g && Math.abs(next.p - q) < .01)) q += .15; } }
        var c = (p + q) / 2, L = q - p, y0 = rn.g ? 2.3 : 0, h1 = rn.h > 4 ? 3.3 : rn.h;
        function W(ya, yb, col, t) { if (yb - ya < .02) return; if (ln.hz) b.box(c, ln.at, L, .3, yb - ya, col, ya, true, t); else b.box(ln.at, c, .3, L, yb - ya, col, ya, true, t); }
        W(y0, Math.max(y0, h1), th.wall, th.wallT); if (rn.h > 4) W(Math.max(y0, 3.3), rn.h, th.wall2 || th.wall, th.wall2T || th.wallT);
        if (!rn.g) { var g0 = b.ghost; b.ghost = true; if (ln.hz) b.box(c, ln.at, L, .36, .25, th.base || 0x5d6163, 0, false, 'conc'); else b.box(ln.at, c, .36, L, .25, th.base || 0x5d6163, 0, false, 'conc'); b.ghost = g0; }   // a darker footing
        else { var gh = b.ghost; b.ghost = true; [p, q].forEach(function (e) { if (ln.hz) b.box(e, ln.at, .12, .38, 2.3, 0x3f4447, 0, false, 'metal'); else b.box(ln.at, e, .38, .12, 2.3, 0x3f4447, 0, false, 'metal'); });   // door frame
          if (ln.hz) b.box(c, ln.at, L + .12, .38, .12, 0x3f4447, 2.25, false, 'metal'); else b.box(ln.at, c, .38, L + .12, .12, 0x3f4447, 2.25, false, 'metal'); b.ghost = gh; }
      });
    });

    // ---- floors, roofs, lamps ----
    rooms.forEach(function (r) {
      var cx = r.x + r.w / 2, cz = r.z + r.d / 2, kit = r.name ? roomKit(r.name) : {};
      if (r.leaf) { b.box(cx, cz, r.w - .3, r.d - .3, .03, kit.carpet ? FK.carpet : (th.floor || 0x9a9c97), 0, false, kit.carpet ? 'canvas' : 'floor'); }
      if (r.open) {                                                               // posts and a roof only
        for (var px = r.x + .3; px <= r.x + r.w - .29; px += (r.w - .6) / Math.max(1, Math.round((r.w - .6) / 5))) [r.z + .3, r.z + r.d - .3].forEach(function (pz) { b.box(px, pz, .3, .3, 4.2, 0x4f585e, 0, true, 'metal'); });
        b.box(cx, cz, r.w + .8, r.d + .8, .2, th.roofC || 0x5d666c, 4.2, true, 'corr');
        for (px = r.x + 3; px < r.x + r.w - 2; px += 6) { b.glow(px, 4.15, cz, 1.4, .05, .25, C.lamp); b.light(px, 3.8, cz, 0xffe2b8, 1.1, 10); }
        return;
      }
      if (r.top) { b.box(cx, cz, r.w + .5, r.d + .5, .25, th.roofC || 0x5d666c, r.ht, true, th.roofT || 'corr'); b.box(cx, cz, r.w - .3, r.d - .3, .04, th.ceil || 0xc9c6bd, r.ht - .05, false, 'plain'); }
      if (!r.leaf) {
        if (!r.top || r.w * r.d < 100) return; var kids = rooms.filter(function (o) { return o !== r && inside(o, r); }); b.box(cx, cz, r.w - .3, r.d - .3, .02, th.floor || 0x9a9c97, 0, false, 'floor');
        for (var ax = r.x + 4; ax < r.x + r.w - 2; ax += 8) for (var az = r.z + 4; az < r.z + r.d - 2; az += 8) { if (kids.some(function (o) { return ax > o.x - .5 && ax < o.x + o.w + .5 && az > o.z - .5 && az < o.z + o.d + .5; })) continue; b.glow(ax, r.ht - .1, az, .6, .03, 1.2, 0xfff2d8); b.light(ax, r.ht - .6, az, 0xffe2b8, r.two ? 1.6 : 1.05, r.two ? 14 : 9); }
        return;
      }
      var top = r.ht - .08, nx = Math.max(1, Math.round(r.w / 8)), nz = Math.max(1, Math.round(r.d / 8)), ix, iz;
      for (ix = 0; ix < nx; ix++) for (iz = 0; iz < nz; iz++) { var lx = r.x + r.w * (ix + .5) / nx, lz = r.z + r.d * (iz + .5) / nz; b.box(lx, lz, .7, 1.3, .06, 0x3a3f44, top - .02, false, 'metal'); b.glow(lx, top - .05, lz, .6, .03, 1.2, 0xfff2d8); b.light(lx, top - .5, lz, kit.carpet ? 0xf2f0ea : 0xffe2b8, r.two ? 1.9 : 1.05, r.two ? 16 : 9); }
    });

    // ---- barriers you cannot see over: walls, cliffs, pallet racks, machine rows ----
    function rackRow(cv, n) {
      var cx = cv.x + cv.w / 2, cz = cv.z + cv.d / 2, lx = cv.w >= cv.d, L = lx ? cv.w : cv.d, Dp = lx ? cv.d : cv.w;
      var f2 = Fr(b, cx, cz, lx ? 0 : PI / 2), k, cnt = Math.max(1, Math.round(L / 3)), seg = L / cnt; b.solid(cx, cz, cv.w, cv.d, 3.4, 0, true); b.ghost = true; b.tier = 2;
      for (k = 0; k <= cnt; k++) [-Dp / 2 + .06, Dp / 2 - .06].forEach(function (oz) { f2.B(-L / 2 + k * seg, 0, oz, .09, 3.6, .09, FK.orange, 'metal'); });
      [.1, 1.3, 2.5].forEach(function (y, li) { if (li) [-Dp / 2 + .06, Dp / 2 - .06].forEach(function (oz) { f2.B(0, y - .12, oz, L, .1, .07, FK.blue, 'metal'); });
        for (k = 0; k < cnt * 2; k++) { var ax = -L / 2 + seg * (k + .5) / 2, q = (k + li + n) % 4; if (q === 3) continue; f2.B(ax, y, 0, seg / 2 - .2, .12, Dp - .25, FK.wood, 'crate'); f2.B(ax, y + .12, 0, seg / 2 - .35, q === 1 ? .7 : .95, Dp - .4, [0xb39a72, 0x8f8468, 0xc9a66e][q], 'crate'); } });
      b.tier = 0; b.ghost = false;
    }
    bars.forEach(function (wl, n) {
      var cx = wl.x + wl.w / 2, cz = wl.z + wl.d / 2, lx = wl.w >= wl.d, L = lx ? wl.w : wl.d, Dp = lx ? wl.d : wl.w, r = roomOf(cx, cz), kind = r && /공장/.test(r.name) ? 'machine' : (th.wallKind || 'conc');
      if (kind === 'rack') return rackRow(wl, n);
      if (kind === 'machine') { var f = Fr(b, cx, cz, lx ? 0 : PI / 2), cnt = Math.max(1, Math.floor(L / 3.6)), gh = b.ghost; b.ghost = true; b.tier = 2; for (var k = 0; k < cnt; k++) FURN.machine[3](f.sub(-L / 2 + (k + .5) * L / cnt, 0, 0), b); b.tier = 0; b.ghost = gh; b.solid(cx, cz, wl.w, wl.d, 2.4); return; }
      if (kind === 'cliff') {
        var hc = th.wallH || 5.5; b.box(cx, cz, wl.w, wl.d, hc, th.cliffC || 0x8a7a60, 0, true, 'rock'); var g0 = b.ghost; b.ghost = true;
        for (var t = -L / 2 + 1; t < L / 2; t += 2.6) { var gg = new T.DodecahedronGeometry(Dp * .55 + (n + t) % 3 * .25, 0); gg.scale(1.3, .8, 1); gg.translate(cx + (lx ? t : 0), hc - .2, cz + (lx ? 0 : t)); b.geo(gg, th.cliffC || 0x8a7a60, 'rock', {}); }
        if (th.snowCap) b.box(cx, cz, wl.w + .2, wl.d + .2, .25, 0xe8eef4, hc, false, 'snow'); b.ghost = g0; return;
      }
      var h = th.wallH || 3.4; b.box(cx, cz, wl.w, wl.d, h, th.barrierC || 0x9a9b98, 0, true, th.barrierT || 'conc'); b.box(cx, cz, wl.w + .12, wl.d + .12, .12, 0x6f7270, h, false, 'conc');
    });
    conts.forEach(function (c, n) { var rot = c.d > c.w, L = Math.max(c.w, c.d), cx = c.x + c.w / 2, cz = c.z + c.d / 2; for (var lv = 0; lv < c.lv; lv++) b.cont(cx, cz, rot, th.cont[(n * 2 + lv) % th.cont.length], lv, L, lv === 0); });
    // water: a surface you cannot walk into, except where a bridge, a ford or a building crosses it
    waters.forEach(function (wa) {
      var vert = wa.d >= wa.w, gaps = [], a0 = vert ? wa.z : wa.x, a1 = vert ? wa.z + wa.d : wa.x + wa.w;
      decks.concat(rooms).forEach(function (k) { if (!hit(k, wa)) return; if (vert && k.x <= wa.x + .1 && k.x + k.w >= wa.x + wa.w - .1) gaps.push([k.z, k.z + k.d]); if (!vert && k.z <= wa.z + .1 && k.z + k.d >= wa.z + wa.d - .1) gaps.push([k.x, k.x + k.w]); });
      b.box(wa.x + wa.w / 2, wa.z + wa.d / 2, wa.w, wa.d, .02, th.waterC || 0x1f4a5c, 0, false, 'water'); gaps.sort(function (p, q) { return p[0] - q[0]; });
      var cur = a0; gaps.concat([[a1, a1]]).forEach(function (g) { if (g[0] - cur > .2) { var m = (cur + g[0]) / 2, L = g[0] - cur; if (vert) b.solid(wa.x + wa.w / 2, m, wa.w, L, 1.2, 0, true); else b.solid(m, wa.z + wa.d / 2, L, wa.d, 1.2, 0, true); } cur = Math.max(cur, g[1]); });
      var gh = b.ghost; b.ghost = true; if (vert) { b.box(wa.x - .15, wa.z + wa.d / 2, .3, wa.d, .25, 0x6b6458, 0, false, 'rock'); b.box(wa.x + wa.w + .15, wa.z + wa.d / 2, .3, wa.d, .25, 0x6b6458, 0, false, 'rock'); } else { b.box(wa.x + wa.w / 2, wa.z - .15, wa.w, .3, .3, 0x8a8c88, 0, false, 'conc'); } b.ghost = gh;
    });
    decks.forEach(function (k) {
      var cx = k.x + k.w / 2, cz = k.z + k.d / 2, lx = k.w >= k.d, L = lx ? k.w : k.d;
      if (k.kind === 'ford') { b.box(cx, cz, k.w, k.d, .03, 0x5f8fa0, 0, false, 'water'); for (var i2 = 0; i2 < 5; i2++) b.cyl(k.x + 1 + (i2 * 3.7) % (k.w - 2), k.z + 1.5 + (i2 * 2.3) % (k.d - 3), .35, .25, 0x6b6458, 0, false, 'rock', .45, 7); return; }
      if (k.kind === 'bridge') {
        b.box(cx, cz, k.w, k.d, .18, 0x6b5a48, 0, false, 'crate');
        [-1, 1].forEach(function (sd) { var ex = lx ? cx : cx + sd * (k.w / 2 - .1), ez = lx ? cz + sd * (k.d / 2 - .1) : cz; b.box(ex, ez, lx ? L : .08, lx ? .08 : L, .08, 0x3a3f44, 1.05, false, 'metal'); b.solid(ex, ez, lx ? L : .2, lx ? .2 : L, 1.1, 0, true);
          for (var t = -L / 2 + .2; t <= L / 2; t += 2) b.box(lx ? cx + t : ex, lx ? ez : cz + t, .1, .1, 1.1, 0x3a3f44, 0, false, 'metal'); });
        return;
      }
      // a walkway up at 3 m (players only, like the warehouse catwalk), rails on both long sides except where stairs come up
      b.box(cx, cz, k.w, k.d, .14, 0x5b656c, 2.86, true, 'metal');
      [-1, 1].forEach(function (sd) {
        var e = lx ? cz + sd * (k.d / 2 - .05) : cx + sd * (k.w / 2 - .05), cuts = steps.filter(function (s) { return hit(s, k, .6); }).map(function (s) { return lx ? [s.x - .2, s.x + s.w + .2] : [s.z - .2, s.z + s.d + .2]; }), cur = lx ? k.x : k.z, end = lx ? k.x + k.w : k.z + k.d;
        cuts.concat([[end, end]]).sort(function (p, q) { return p[0] - q[0]; }).forEach(function (g) {
          if (g[0] - cur > .3) { var m = (cur + g[0]) / 2, L2 = g[0] - cur; if (lx) { b.box(m, e, L2, .05, .05, C.yellow, 3.95, false); b.solid(m, e, L2, .1, 1, 3, true); } else { b.box(e, m, .05, L2, .05, C.yellow, 3.95, false); b.solid(e, m, .1, L2, 1, 3, true); } }
          cur = Math.max(cur, g[1]); });
        for (var t = -L / 2 + .3; t <= L / 2; t += 2.5) b.box(lx ? cx + t : e, lx ? e : cz + t, .14, .14, 2.86, 0x4f585e, 0, true, 'metal');
      });
    });
    // stairs climb toward whatever raised thing they touch: a walkway (3 m) or the top of a container (2.5 m)
    steps.forEach(function (s) {
      var tg = null, best = .7;
      decks.filter(function (k) { return k.kind === 'walk'; }).map(function (k) { return { r: k, top: 3 }; }).concat(conts.map(function (c) { return { r: c, top: 2.5 }; })).forEach(function (o) {
        var r = o.r, gaps = [[Math.abs(s.z - (r.z + r.d)), 'n'], [Math.abs(s.z + s.d - r.z), 's'], [Math.abs(s.x - (r.x + r.w)), 'w'], [Math.abs(s.x + s.w - r.x), 'e']];
        gaps.forEach(function (g) { var ovx = Math.min(s.x + s.w, r.x + r.w) - Math.max(s.x, r.x), ovz = Math.min(s.z + s.d, r.z + r.d) - Math.max(s.z, r.z); if (g[0] < best && ((g[1] === 'n' || g[1] === 's') ? ovx > .5 : ovz > .5)) { best = g[0]; tg = { top: o.top, side: g[1] }; } });
      });
      if (!tg) return; var alongZ = tg.side === 'n' || tg.side === 's', L = alongZ ? s.d : s.w, n = Math.ceil(tg.top / .4), sl = L / n;
      for (var i3 = 0; i3 < n; i3++) { var u = (i3 + .5) * sl, top = tg.top * (i3 + 1) / n, px = s.x + s.w / 2, pz = s.z + s.d / 2;
        if (tg.side === 'n') pz = s.z + s.d - u; else if (tg.side === 's') pz = s.z + u; else if (tg.side === 'w') px = s.x + s.w - u; else px = s.x + u;
        b.box(px, pz, alongZ ? s.w : sl, alongZ ? sl : s.d, top, th.stairC || 0x6b7075, 0, true, 'metal'); b.box(px, pz, alongZ ? s.w + .02 : .1, alongZ ? .1 : s.d + .02, .03, C.yellow, top - .02, false); }
      stairs.push(s);
    });

    // ---- cover from the plan: racks or machines indoors, containers and theme pieces outside ----
    covers.forEach(function (cv, n) {
      var r = roomOf(cv.x + cv.w / 2, cv.z + cv.d / 2);
      walks.forEach(function (wk) { if (r && hit(cv, wk) && (r.two)) { if (wk.w > wk.d) { if (cv.z < wk.z) cv.d = wk.z - cv.z - .3; else { var e = cv.z + cv.d; cv.z = wk.z + wk.d + .3; cv.d = e - cv.z; } } else { if (cv.x < wk.x) cv.w = wk.x - cv.x - .3; else { var e2 = cv.x + cv.w; cv.x = wk.x + wk.w + .3; cv.w = e2 - cv.x; } } } });
      if (cv.w < .8 || cv.d < .8 || stairs.some(function (s) { return hit(cv, s, .8); })) return;
      var cx = cv.x + cv.w / 2, cz = cv.z + cv.d / 2, lx = cv.w >= cv.d, L = lx ? cv.w : cv.d, Dp = lx ? cv.d : cv.w;
      if (r && /공장/.test(r.name)) { var f = Fr(b, cx, cz, lx ? 0 : PI / 2), gh = b.ghost; b.ghost = true; b.tier = 2; FURN.machine[3](f, b); f.B(0, 0, 0, L, .12, Dp, 0x3a3f44, 'metal'); b.tier = 0; b.ghost = gh; b.solid(cx, cz, cv.w, cv.d, 2.4); return; }
      if (r && cv.w * cv.d > 6) { rackRow(cv, n); return; }   // big cover indoors: pallet racking, as in the warehouse
      if (L > 5.2) { b.cont(cx, cz, !lx, th.cont[n % th.cont.length], 0, L); if (L < 9 && n % 3 === 0) b.cont(cx, cz, !lx, th.cont[(n + 1) % th.cont.length], 1, L); return; }
      th.cover(b, cv, cx, cz, lx, L, Dp, n);
    });

    // ---- furnishing: wall pieces round the edge, then the middle (offices on a grid with aisles, other rooms a few loose pieces) ----
    rooms.forEach(function (r) {
      if (!r.leaf) return; var K = roomKit(r.name), taken = walks.map(function (w) { return [w.x + w.w / 2, w.z + w.d / 2, w.w / 2, w.d / 2]; }), x = r.x, z = r.z, w = r.w, h = r.d;
      covers.concat(bars, conts).forEach(function (c) { taken.push([c.x + c.w / 2, c.z + c.d / 2, c.w / 2 + .3, c.d / 2 + .3]); });
      function free(cx, cz, hw, hd, pad, mg) {
        mg = mg == null ? .35 : mg; if (cx - hw < x + mg || cx + hw > x + w - mg || cz - hd < z + mg || cz + hd > z + h - mg) return false; var i;
        for (i = 0; i < doors.length; i++) { var dd = doors[i]; if (dd.hz ? (Math.abs(cx - dd.x) < hw + dd.w / 2 + 1 && Math.abs(cz - dd.z) < hd + 2.2) : (Math.abs(cz - dd.z) < hd + dd.w / 2 + 1 && Math.abs(cx - dd.x) < hw + 2.2)) return false; }
        for (i = 0; i < sites.length; i++) if (Math.abs(cx - sites[i].x) < hw + 2.6 && Math.abs(cz - sites[i].z) < hd + 2.6) return false;
        for (i = 0; i < stairs.length; i++) if (hit({ x: cx - hw, z: cz - hd, w: hw * 2, d: hd * 2 }, stairs[i], 1)) return false;
        for (i = 0; i < taken.length; i++) { var t = taken[i]; if (Math.abs(cx - t[0]) < hw + t[2] + pad && Math.abs(cz - t[1]) < hd + t[3] + pad) return false; }
        return true;
      }
      var placed = [];
      function put(def, cx, cz, rot, hw, hd, wallPiece) { var t = [cx, cz, hw, hd]; taken.push(t); placed.push({ def: def, cx: cx, cz: cz, rot: rot, hw: hw, hd: hd, wall: wallPiece, t: t }); }
      var walls = [[x, z, 1, 0, 0], [x + w, z + h, -1, 0, PI], [x, z + h, 0, -1, PI / 2], [x + w, z, 0, 1, -PI / 2]], k = 0, cnt = 0;
      walls.forEach(function (wl) {
        var len = wl[2] ? w : h, t = 1.2;
        while (t < len - 1.2 && cnt < 16) {
          var def = FURN[K.wall[k % K.wall.length]], pw = def[0], pd = def[1], along = t + pw / 2, nx = -wl[3], nz = wl[2];
          var cx = wl[0] + wl[2] * along + nx * (pd / 2 + .17), cz = wl[1] + wl[3] * along + nz * (pd / 2 + .17), hw = wl[2] ? pw / 2 : pd / 2, hd = wl[2] ? pd / 2 : pw / 2;
          if (along + pw / 2 < len - .4 && free(cx, cz, hw, hd, .15, .1)) { put(def, cx, cz, wl[4], hw, hd, true); k++; cnt++; t += pw + (def === FURN.pipes ? .2 : (K.gap != null ? K.gap : 1.4)); } else t += .8;
        }
      });
      if (K.grid) {
        K.grid.forEach(function (gd) { var def = FURN[gd[0]], c = 0, gx, gz; for (gz = z + .6; gz < z + h - .6 && c < gd[1]; gz += .5) for (gx = x + .6; gx < x + w - .6 && c < gd[1]; gx += .5) [0, PI / 2].forEach(function (rot) { if (c >= gd[1]) return; var hw = (rot ? def[1] : def[0]) / 2, hd = (rot ? def[0] : def[1]) / 2, cx = gx + hw, cz = gz + hd; if (free(cx, cz, hw, hd, gd[2], .9)) { put(def, cx, cz, rot, hw, hd); c++; } }); });
      } else {
      var cand = [], step = 1.2, gx, gz; for (gx = x + step / 2 + 1; gx < x + w - 1; gx += step) for (gz = z + step / 2 + 1; gz < z + h - 1; gz += step) cand.push([gx + ((Math.round(gx * 13 + gz * 7) % 3 + 3) % 3 - 1) * .6, gz + ((Math.round(gx * 5 + gz * 11) % 3 + 3) % 3 - 1) * .6]);
      var m = 0, want = Math.min(K.mid && K.mid.length ? Math.round(w * h / 32) + 1 : 0, 8); function hs(p) { var v = Math.sin(p[0] * 12.9898 + p[1] * 78.233) * 43758.5453; return v - Math.floor(v); } cand.sort(function (p, q) { return hs(p) - hs(q); });
      cand.forEach(function (c) { if (m >= want) return; var def = FURN[K.mid[m % K.mid.length]], rot = (Math.round(c[0] + c[1]) % 2) ? 0 : PI / 2, hw = (rot ? def[1] : def[0]) / 2, hd = (rot ? def[0] : def[1]) / 2; if (free(c[0], c[1], hw, hd, 1.7)) { put(def, c[0], c[1], rot, hw, hd); m++; } });
      }
      // keep every part of the room reachable: walk a half-metre grid in from the doors (stopping 0.45 m short of anything, as the
      // bots' grid does) and take pieces away, middle ones first, while that frees a pocket of floor a person could stand in
      var nx = Math.floor(w / .5), nz = Math.floor(h / .5), myDoors = doors.filter(function (dd) { return dd.hz ? (Math.abs(dd.z - z) < .3 || Math.abs(dd.z - z - h) < .3) && dd.x > x && dd.x < x + w : (Math.abs(dd.x - x) < .3 || Math.abs(dd.x - x - w) < .3) && dd.z > z && dd.z < z + h; });
      function pockets(skip) {
        var blk = new Uint8Array(nx * nz), seen = new Uint8Array(nx * nz), i, j, q = [], lost = 0;
        for (i = 0; i < nx; i++) for (j = 0; j < nz; j++) {
          var px = x + (i + .5) * .5, pz = z + (j + .5) * .5, bad = px < x + .6 || px > x + w - .6 || pz < z + .6 || pz > z + h - .6;
          if (!bad) bad = placed.some(function (o) { return o !== skip && !o.gone && o.def[2] !== 0 && Math.abs(px - o.cx) < o.hw + .55 && Math.abs(pz - o.cz) < o.hd + .55; }) || covers.concat(bars, conts).some(function (c) { return px > c.x - .55 && px < c.x + c.w + .55 && pz > c.z - .55 && pz < c.z + c.d + .55; }) || stairs.some(function (c) { return px > c.x - .45 && px < c.x + c.w + .45 && pz > c.z - .45 && pz < c.z + c.d + .45; });
          blk[j * nx + i] = bad ? 1 : 0;
        }
        myDoors.forEach(function (dd) { var px = dd.hz ? dd.x : (Math.abs(dd.x - x) < .3 ? x + .7 : x + w - .7), pz = dd.hz ? (Math.abs(dd.z - z) < .3 ? z + .7 : z + h - .7) : dd.z, ii = Math.floor((px - x) / .5), jj = Math.floor((pz - z) / .5), c = jj * nx + ii; if (ii >= 0 && jj >= 0 && ii < nx && jj < nz && !blk[c] && !seen[c]) { seen[c] = 1; q.push(c); } });
        while (q.length) { var c = q.pop(), ci = c % nx, cj = (c / nx) | 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var a = ci + d[0], e = cj + d[1], t = e * nx + a; if (a >= 0 && e >= 0 && a < nx && e < nz && !blk[t] && !seen[t]) { seen[t] = 1; q.push(t); } }); }
        for (i = 0; i < nx * nz; i++) if (!blk[i] && !seen[i]) lost++;
        return lost;
      }
      if (myDoors.length) { var lost = pockets(null), order = placed.filter(function (o) { return !o.wall; }).reverse().concat(placed.filter(function (o) { return o.wall; }).reverse());
        for (var oi = 0; oi < order.length && lost > 3; oi++) { var l2 = pockets(order[oi]); if (l2 < lost) { order[oi].gone = true; lost = l2; } } }
      placed.forEach(function (o) { if (o.gone) return; var f = Fr(b, o.cx, o.cz, o.rot); b.ghost = true; b.tier = 2; o.def[3](f, b); b.tier = 0; b.ghost = false; if (o.def[2]) b.solid(o.cx, o.cz, o.hw * 2, o.hd * 2, o.def[2]); });
    });

    // ---- bomb sites, spawns ----
    sites.forEach(function (s) { plantZone(b, s.x, s.z, 0); b.mark(s.id, s.x, .04, s.z, 2.4, 2.4, 0, '#d6a233', true); });
    spawns.forEach(function (s) { b.spawn(s.team, s.x, s.z); });
    // ---- dressing: windows, name boards over doors, roof units, clutter along outside walls (only where it leaves the way
    // open), and scenery beyond the wall. None of it stands in a lane: the clutter needs 4.5 m of open ground in front of it.
    function inRoom(x, z) { return rooms.some(function (r) { return !r.open && x > r.x && x < r.x + r.w && z > r.z && z < r.z + r.d; }); }
    function busy(x, z) { return inRoom(x, z) || Math.abs(x) > HW - .8 || Math.abs(z) > HD - .8 || bars.concat(conts, covers, waters, stairs, roads, decks).some(function (c) { return x > c.x - .4 && x < c.x + c.w + .4 && z > c.z - .4 && z < c.z + c.d + .4; })
      || spawns.some(function (sp) { return Math.abs(x - sp.x) < 6 && Math.abs(z - sp.z) < 6; }) || sites.some(function (st) { return Math.abs(x - st.x) < 4.5 && Math.abs(z - st.z) < 4.5; }); }
    function doorNear(hz, at, t, m) { return doors.some(function (dd) { return dd.hz === !!hz && Math.abs((hz ? dd.z : dd.x) - at) < .3 && Math.abs((hz ? dd.x : dd.z) - t) < dd.w / 2 + m; }); }
    var clutter = (th.clutter || ['metal_trash_can', 'utility_box_01', 'Barrel_01']).filter(function (id) { return b.has(id); }), ci = 0;
    rooms.forEach(function (r) {
      if (r.open) return;
      [[1, r.z, -1], [1, r.z + r.d, 1], [0, r.x, -1], [0, r.x + r.w, 1]].forEach(function (e) {
        var hz = e[0], at = e[1], out = e[2], a0 = hz ? r.x : r.z, a1 = hz ? r.x + r.w : r.z + r.d, t;
        b.ghost = true; b.tier = 1;
        for (t = a0 + 2.2; t < a1 - 2; t += 4.6) {
          if (inRoom(hz ? t : at + out * .6, hz ? at + out * .6 : t) || doorNear(hz, at, t, 1.1)) continue;
          [1.35].concat(r.ht > 4 ? [4.4] : []).forEach(function (y) { if (hz) { b.box(t, at, 1.5, .34, 1.1, 0x3a3f44, y - .05, false, 'metal'); b.box(t, at, 1.3, .36, .9, th.glassC || 0x5f7a88, y + .05, false, 'glass'); } else { b.box(at, t, .34, 1.5, 1.1, 0x3a3f44, y - .05, false, 'metal'); b.box(at, t, .36, 1.3, .9, th.glassC || 0x5f7a88, y + .05, false, 'glass'); } });
        }
        b.ghost = false; b.tier = 2;
        if (!r.top || th.hall) { b.tier = 0; return; }
        for (t = a0 + 3.5; t < a1 - 2; t += 7) {
          var px = hz ? t : at + out * .55, pz = hz ? at + out * .55 : t, ok = !doorNear(hz, at, t, 2.5) && !busy(px, pz) && [1.5, 3, 4.5].every(function (d) { return !busy(hz ? px : px + out * d, hz ? pz + out * d : pz); });
          if (!ok || clutter.length === 0 || (Math.round(t * 7 + at * 13) % 9 + 9) % 9 > 3) continue;
          b.prop(clutter[ci++ % clutter.length], px, pz, hz ? (out > 0 ? 0 : PI) : (out > 0 ? PI / 2 : -PI / 2), 1);
        }
        b.tier = 0;
      });
      // a name board over the first door that opens to the outside
      if (r.name && r.leaf && !th.hall) {
        var nm = r.name.replace(/\s*\(.*\)/, ''), dd = null, sg = 0;
        doors.forEach(function (d) { if (dd) return; var onR = d.hz ? (Math.abs(d.z - r.z) < .3 || Math.abs(d.z - r.z - r.d) < .3) && d.x > r.x && d.x < r.x + r.w : (Math.abs(d.x - r.x) < .3 || Math.abs(d.x - r.x - r.w) < .3) && d.z > r.z && d.z < r.z + r.d; if (!onR) return;
          var s0 = d.hz ? (Math.abs(d.z - r.z) < .3 ? -1 : 1) : (Math.abs(d.x - r.x) < .3 ? -1 : 1); if (!inRoom(d.hz ? d.x : d.x + s0 * .8, d.hz ? d.z + s0 * .8 : d.z)) { dd = d; sg = s0; } });
        if (dd) { var bw = Math.min(3.4, .6 + nm.length * .5), gx = dd.hz ? dd.x : dd.x + sg * .2, gz = dd.hz ? dd.z + sg * .2 : dd.z, ry = dd.hz ? (sg > 0 ? 0 : PI) : (sg > 0 ? PI / 2 : -PI / 2);
          b.ghost = true; if (dd.hz) b.box(gx, gz, bw, .08, .55, 0x23272a, 2.48, false, 'paint'); else b.box(gx, gz, .08, bw, .55, 0x23272a, 2.48, false, 'paint'); b.ghost = false;
          b.mark(nm, dd.hz ? dd.x : dd.x + sg * .25, 2.75, dd.hz ? dd.z + sg * .25 : dd.z, bw - .2, .5, ry, th.signC || '#f2e6c8'); }
      }
      // units and vents on the roof
      if (r.top && !th.hall && r.w * r.d > 60) { if (b.has('exterior_aircon_unit')) b.model('exterior_aircon_unit', r.x + r.w * .3, r.ht + .25, r.z + r.d * .4, 0, 1); b.ghost = true; b.box(r.x + r.w * .7, r.z + r.d * .62, .8, .8, .6, 0x6b7075, r.ht + .25, false, 'metal'); b.cyl(r.x + r.w * .62, r.z + r.d * .3, .18, .9, 0x55595c, r.ht + .25, false, 'metal', .18, 8); b.ghost = false; }
    });
    // scenery beyond the wall: trees, pines or nothing
    if (th.trees) { b.ghost = true; for (var tk = 0; tk < th.trees; tk++) { var ang = tk / th.trees * PI * 2 + (tk % 3) * .13, rx = HW + 6 + (tk * 7 % 11), rz = HD + 6 + (tk * 5 % 9), tx2 = Math.cos(ang) * rx, tz2 = Math.sin(ang) * rz, k3 = .9 + (tk % 4) * .2;
      if (th.pines) { b.cyl(tx2, tz2, .2 * k3, 1.6 * k3, 0x4a3a28, 0, false, 'plain', .15 * k3, 6); [0, 1, 2].forEach(function (j) { b.cyl(tx2, tz2, (2.2 - j * .6) * k3, 2.2 * k3, j % 2 ? 0x2f4a3a : 0x355440, (1.2 + j * 1.6) * k3, false, 'plain', .05, 8); }); }
      else { b.cyl(tx2, tz2, .28 * k3, 3.2 * k3, 0x4a3a28, 0, false, 'plain', .2 * k3, 8); [[0, 4.4, 0, 2.3], [1.3, 3.6, .4, 1.7], [-1.2, 3.8, -.5, 1.8], [.3, 3.4, -1.4, 1.6]].forEach(function (q, n2) { var g = new T.IcosahedronGeometry(q[3] * k3, 1); g.translate(tx2 + q[0] * k3, q[1] * k3, tz2 + q[2] * k3); b.geo(g, n2 % 2 ? (th.leafC || 0x3f5a2c) : (th.leafC2 || 0x4c6a33), 'plain', {}); }); } } b.ghost = false; }
    if (th.extra) th.extra(b, { rooms: rooms, doors: doors, sites: sites, spawns: spawns, HW: HW, HD: HD, bars: bars, conts: conts, waters: waters, busy: busy });
    // approaches to each site: the doors of the room it sits in (a step outside them), or four points round it in the open
    function via(s) {
      var r = roomOf(s.x, s.z), out = [];
      if (r) doors.forEach(function (dd) { var onR = dd.hz ? (Math.abs(dd.z - r.z) < .3 || Math.abs(dd.z - r.z - r.d) < .3) && dd.x > r.x && dd.x < r.x + r.w : (Math.abs(dd.x - r.x) < .3 || Math.abs(dd.x - r.x - r.w) < .3) && dd.z > r.z && dd.z < r.z + r.d;
        if (!onR) return; var sx = dd.hz ? 0 : (dd.x < s.x ? -2 : 2), sz = dd.hz ? (dd.z < s.z ? -2 : 2) : 0; out.push([dd.x + sx, dd.z + sz, 0]); });
      if (out.length < 2) [[-8, 0], [0, -7], [0, 7], [8, 0]].forEach(function (q) { out.push([s.x + q[0], s.z + q[1], 0]); });
      return out;
    }
    function clear(x, z, m) {
      if (Math.abs(x) > HW - 1.5 || Math.abs(z) > HD - 1.5) return false;
      return !b.boxes.some(function (q) { if (q.maxy <= .5 || q.miny >= 1.6) return false; var lx = x, lz = z; if (q.rot) { var dx = x - q.ox, dz = z - q.oz; lx = dx * q.c - dz * q.s; lz = dx * q.s + dz * q.c; } return lx > q.minx - m && lx < q.maxx + m && lz > q.minz - m && lz < q.maxz + m; });
    }
    function settle(p, from) { for (var k = 0; k < 6; k++) { if (clear(p[0], p[1], 1)) return p; var dx = p[0] - from[0], dz = p[1] - from[1], l = Math.hypot(dx, dz) || 1; p = [p[0] + dx / l, p[1] + dz / l, 0]; } return null; }
    var S = sites.map(function (s) { var d = siteDef(s.id, s.x, s.z, 0, 0, via(s).map(function (v) { return settle([Math.max(-HW + 2, Math.min(HW - 2, v[0])), Math.max(-HD + 2, Math.min(HD - 2, v[1])), 0], [s.x, s.z]); }).filter(Boolean));
      d.spots = d.spots.filter(function (q, n) { return !n || clear(q.x, q.z, 1); }); return d; }), fw = [];
    S.forEach(function (s) { s.via.forEach(function (v) { fw.push(v); }); });
    var routes = lanes.filter(function (l) { return l.kind !== 'conn'; });   // the drawn lanes, A's side to B's: bots pick one to walk
    return { name: th.name, b: b, bounds: { minx: -HW, maxx: HW, minz: -HD, maxz: HD }, bg: th.bg, fog: th.fog, hemi: th.hemi, sun: th.sun, rain: !!th.rain, sky: th.sky, hdri: th.hdri, dim: th.dim, lod: [40, 80], indoor: !!th.hall, sites: S.length ? S : undefined, fwd: S.length ? fw : undefined, routes: routes };
  }
  // small outdoor cover, filled from a rectangle on the plan
  function crateRect(b, cv, n, cols) {
    var nx = Math.max(1, Math.round(cv.w / 1.35)), nz = Math.max(1, Math.round(cv.d / 1.35)), sx = cv.w / nx, sz = cv.d / nz, s = Math.min(sx, sz) - .1, i, j;
    for (i = 0; i < nx; i++) for (j = 0; j < nz; j++) { var x = cv.x + sx * (i + .5), z = cv.z + sz * (j + .5), k = (i * 3 + j * 5 + n) % 5; b.crate(x, z, s, cols[k % cols.length]); if (k < 2) b.crate(x + (k ? .08 : -.06), z, s * .85, cols[(k + 1) % cols.length], s); }
  }
  function bagWall(b, cx, cz, lx, L) {
    var n = Math.max(2, Math.round(L / .6)), r, i, gh = b.ghost; b.ghost = true;
    for (r = 0; r < 4; r++) for (i = 0; i < n - (r % 2); i++) { var o = -L / 2 + .3 + i * (L - .6) / (n - 1) + (r % 2) * (L - .6) / (n - 1) / 2; b.box(cx + (lx ? o : 0), cz + (lx ? 0 : o), lx ? .58 : .7, lx ? .7 : .58, .28, r % 2 ? 0xa08a62 : 0x9a8460, r * .27, false, 'canvas'); }
    b.ghost = gh; b.solid(cx, cz, lx ? L : .75, lx ? .75 : L, 1.1);
  }

  // ---- the eleven match maps, each built from its plan (the approved renewal sheets; data made by the plan drawing tool) ----
  // A plan keeps rooms, doors, barriers (wall), containers (cont, 1-2 high), low cover, water with bridges and fords, players-only
  // walkways with stairs, spawns (two per team), bomb sites and the lanes; the lanes become the routes bots choose between.
  var PLANS = {"dock": {"W": 80, "H": 56, "plan": [["water", 0, 50, 80, 6], ["spawn", 2, 2, 10, 9, "A"], ["spawn", 2, 30, 8, 8, "A"], ["spawn", 66, 40, 12, 8, "B"], ["spawn", 68, 14, 10, 8, "B"], ["room", 16, 2, 30, 10, "창고동", false], ["door", 16, 7.0, false, 2.4], ["door", 24.1, 12, true, 2.4], ["door", 37.9, 12, true, 2.4], ["door", 46, 7.0, false, 2.4], ["room", 52, 2, 14, 9, "항만 사무소", false], ["door", 52, 6.5, false, 2.4], ["door", 59.0, 11, true, 2.4], ["door", 66, 6.5, false, 2.4], ["cont", 14, 17, 12, 2.5, 2], ["cont", 30, 17, 8, 2.5, 1], ["cont", 46, 17, 12, 2.5, 2], ["cont", 62, 17, 2.5, 8, 2], ["cont", 20, 22, 2.5, 9, 2], ["cont", 28, 24, 12, 2.5, 2], ["cont", 44, 22, 2.5, 9, 1], ["cont", 52, 26, 10, 2.5, 2], ["cont", 12, 33, 10, 2.5, 1], ["cont", 26, 31, 2.5, 8, 2], ["cont", 34, 34, 12, 2.5, 2], ["cont", 56, 32, 2.5, 8, 2], ["cont", 62, 34, 8, 2.5, 1], ["stairs", 30, 19.5, 2.4, 3], ["stairs", 12, 35.5, 2.4, 3], ["stairs", 66, 36.5, 2.4, 3], ["cover", 14, 45, 2, 1.5], ["cover", 28, 44, 3, 2], ["cover", 44, 46, 2, 2], ["cover", 56, 44, 3, 1.5], ["cover", 34, 40.5, 6, 2.5], ["cover", 22, 14, 2, 2], ["cover", 40, 14.5, 2, 1.5], ["cover", 58, 13, 2, 2], ["lane", "flank", [[8, 9], [16, 7], [46, 7], [52, 6.5], [66, 6.5], [72, 14]]], ["lane", "main", [[7, 32], [17, 28], [24, 22.5], [42, 21], [50, 29.5], [62, 30], [70, 40]]], ["lane", "flank", [[6, 38], [10, 46], [60, 46.5], [66, 44]]], ["lane", "conn", [[23, 12.5], [24, 16]]], ["lane", "conn", [[38, 12.5], [39, 21]]], ["lane", "conn", [[48, 41], [48, 37]]], ["lane", "conn", [[24, 40], [24, 36]]]]}, "warehouse": {"W": 40, "H": 28, "plan": [["spawn", 1, 21, 7, 6, "A"], ["spawn", 1, 5, 4.5, 6, "A"], ["spawn", 34.5, 5, 4.5, 6, "B"], ["spawn", 33, 22, 6, 5, "B"], ["wall", 8, 8, 8, 2.2], ["wall", 8, 12.5, 8, 2.2], ["wall", 8, 17, 8, 2.2], ["wall", 24, 9.5, 8, 2.2], ["wall", 24, 14, 8, 2.2], ["wall", 24, 18.5, 8, 2.2], ["room", 14, 23, 12, 5, "사무실", false], ["door", 14, 25.5, false, 2.4], ["door", 20.0, 23, true, 2.4], ["door", 26, 25.5, false, 2.4], ["walk", 8, 0.6, 24, 2.2], ["stairs", 8, 2.8, 2.2, 4], ["stairs", 29.8, 2.8, 2.2, 4], ["cover", 19, 11, 2, 2], ["cover", 20.5, 16.5, 1.5, 2.6], ["cover", 3, 14, 2, 2], ["cover", 35, 13, 2, 2], ["cover", 17, 5, 2, 1.5], ["cover", 22, 21, 1.6, 1.6], ["lane", "main", [[5, 21], [5, 11], [12, 5], [18, 7], [18, 21], [12, 21.5], [6, 22]]], ["lane", "main", [[35, 7], [35, 21], [28, 22.5], [22, 21], [22, 6], [30, 6.5], [34, 7]]], ["lane", "flank", [[8, 24.5], [14, 25.5], [26, 25.5], [32, 24.5]]], ["lane", "flank", [[7, 3], [12, 1.7], [30, 1.7], [33, 3]]]]}, "depot": {"W": 100, "H": 70, "plan": [["spawn", 2, 56, 12, 11, "A"], ["spawn", 2, 18, 8, 12, "A"], ["spawn", 86, 2, 12, 10, "B"], ["spawn", 90, 36, 8, 12, "B"], ["wall", 38, 24, 9, 1.2], ["wall", 53, 24, 9, 1.2], ["wall", 38, 46, 9, 1.2], ["wall", 53, 46, 9, 1.2], ["wall", 38, 24, 1.2, 8], ["wall", 38, 39, 1.2, 8], ["wall", 61, 24, 1.2, 8], ["wall", 61, 39, 1.2, 8], ["cover", 42, 28, 4, 4], ["cover", 53, 36, 4, 4], ["cover", 47, 33, 2.5, 2.5], ["cover", 43, 40, 3, 2], ["cover", 55, 28, 2, 3], ["cont", 14, 6, 14, 3, 1], ["cont", 32, 6, 14, 3, 1], ["cont", 50, 6, 14, 3, 1], ["room", 70, 6, 12, 9, "막사 1", false], ["door", 70, 10.5, false, 2.4], ["door", 76.0, 15, true, 2.4], ["room", 70, 18, 12, 8, "막사 2", false], ["door", 70, 22.0, false, 2.4], ["door", 76.0, 18, true, 2.4], ["door", 82, 22.0, false, 2.4], ["room", 12, 50, 22, 14, "격납고", true], ["door", 18.6, 50, true, 2.4], ["door", 34, 57.0, false, 2.4], ["door", 12, 57.0, false, 2.4], ["room", 40, 54, 12, 10, "창고", false], ["door", 46.0, 54, true, 2.4], ["door", 40, 59.0, false, 2.4], ["door", 52, 59.0, false, 2.4], ["cover", 64, 54, 6, 2.5], ["cover", 74, 58, 6, 2.5], ["cover", 80, 50, 2.5, 6], ["cover", 66, 62, 4, 2], ["cover", 24, 30, 3, 3], ["cover", 18, 40, 4, 2], ["cover", 30, 18, 2, 4], ["cover", 72, 32, 3, 3], ["cover", 84, 28, 2, 4], ["cover", 28, 44, 3, 2], ["site", 78, 31, "A"], ["site", 74, 55, "B"], ["lane", "flank", [[8, 22], [12, 12], [48, 12], [68, 12], [80, 26]]], ["lane", "main", [[10, 30], [28, 35], [38, 35.5], [61, 35.5], [75, 33]]], ["lane", "flank", [[12, 58], [34, 57], [40, 59], [52, 59], [70, 56]]], ["lane", "conn", [[50, 16], [50, 24]]], ["lane", "conn", [[50, 52], [50, 47]]], ["lane", "conn", [[24, 48], [26, 40]]]]}, "oldtown": {"W": 84, "H": 60, "plan": [["spawn", 2, 50, 10, 8, "A"], ["spawn", 2, 24, 6, 10, "A"], ["spawn", 72, 1, 10, 7, "B"], ["spawn", 78, 22, 5, 10, "B"], ["room", 8, 6, 14, 10, "여관", true], ["door", 15.0, 16, true, 2.4], ["door", 22, 11.0, false, 2.4], ["room", 26, 4, 12, 10, "종탑 집", true], ["door", 32.0, 14, true, 2.4], ["door", 26, 9.0, false, 2.4], ["room", 54, 8, 12, 10, "상점", false], ["door", 60.0, 18, true, 2.4], ["door", 54, 13.0, false, 2.4], ["door", 66, 13.0, false, 2.4], ["room", 10, 22, 12, 12, "빵집", false], ["door", 16.0, 22, true, 2.4], ["door", 16.0, 34, true, 2.4], ["door", 22, 28.0, false, 2.4], ["room", 56, 24, 12, 12, "카페", true], ["door", 56, 30.0, false, 2.4], ["door", 68, 30.0, false, 2.4], ["door", 62.0, 24, true, 2.4], ["room", 14, 42, 14, 10, "공방", false], ["door", 21.0, 42, true, 2.4], ["door", 28, 47.0, false, 2.4], ["room", 34, 44, 14, 12, "교회", true], ["door", 41.0, 44, true, 2.4], ["door", 34, 50.0, false, 2.4], ["door", 48, 50.0, false, 2.4], ["room", 54, 44, 12, 10, "우체국", false], ["door", 60.0, 44, true, 2.4], ["door", 66, 49.0, false, 2.4], ["room", 70, 34, 12, 12, "시장 창고", false], ["door", 70, 40.0, false, 2.4], ["door", 76.0, 34, true, 2.4], ["door", 76.0, 46, true, 2.4], ["wall", 26, 18, 8, 1.2], ["wall", 44, 14, 1.2, 8], ["wall", 30, 37, 1.2, 7], ["wall", 50, 38, 6, 1.2], ["wall", 66, 20, 8, 1.2], ["wall", 24, 30, 6, 1.2], ["wall", 44, 2, 1.2, 6], ["cover", 41, 28, 4, 4], ["cover", 36, 24, 2, 2], ["cover", 48, 34, 2, 2], ["cover", 30, 20, 2, 1.5], ["cover", 62, 40, 2, 2], ["cover", 20, 38, 2, 2], ["cover", 72, 26, 2, 2], ["site", 62, 4, "A"], ["site", 76, 52, "B"], ["lane", "flank", [[7, 30], [8, 20], [24, 17], [38, 16], [52, 20], [61, 7]]], ["lane", "main", [[8, 30], [16, 28], [24, 32], [36, 30], [50, 30], [68, 30], [76, 28]]], ["lane", "flank", [[9, 50], [20, 54], [32, 54], [48, 50], [68, 52], [74, 52]]], ["lane", "conn", [[16, 34], [16, 41]]], ["lane", "conn", [[41, 44], [41, 33]]], ["lane", "conn", [[60, 24], [60, 18]]]]}, "compound": {"W": 100, "H": 76, "plan": [["spawn", 36, 66, 28, 8, "A"], ["spawn", 2, 64, 10, 10, "A"], ["spawn", 36, 2, 28, 6, "B"], ["spawn", 88, 2, 10, 8, "B"], ["room", 40, 28, 20, 14, "본부", true], ["door", 55.0, 28, true, 2.4], ["door", 45.0, 42, true, 2.4], ["door", 40, 32.2, false, 2.4], ["door", 60, 37.8, false, 2.4], ["room", 10, 10, 16, 10, "막사", false], ["door", 18.0, 20, true, 2.4], ["door", 26, 15.0, false, 2.4], ["room", 74, 10, 16, 10, "정비고", false], ["door", 82.0, 20, true, 2.4], ["door", 74, 15.0, false, 2.4], ["wall", 28, 8, 2, 18], ["wall", 28, 32, 2, 22], ["wall", 70, 8, 2, 18], ["wall", 70, 32, 2, 22], ["wall", 36, 50, 10, 1.2], ["wall", 54, 50, 10, 1.2], ["wall", 36, 18, 8, 1.2], ["wall", 56, 18, 8, 1.2], ["cover", 14, 30, 3, 3], ["cover", 20, 40, 3, 2], ["cover", 12, 50, 2, 3], ["cover", 80, 30, 3, 3], ["cover", 78, 40, 3, 2], ["cover", 86, 50, 2, 3], ["cover", 46, 58, 3, 2], ["cover", 52, 58, 3, 2], ["cover", 47, 22, 6, 2], ["cover", 18, 24, 4, 2], ["cover", 78, 24, 4, 2], ["site", 18, 15, "A"], ["site", 82, 15, "B"], ["lane", "main", [[40, 66], [20, 58], [18, 36], [18, 22]]], ["lane", "main", [[50, 66], [45, 43], [45, 36], [55, 33], [55, 27], [50, 10]]], ["lane", "main", [[60, 66], [80, 58], [82, 36], [82, 22]]], ["lane", "conn", [[30, 29], [39, 34]]], ["lane", "conn", [[70, 29], [61, 34]]], ["lane", "conn", [[29, 57], [36, 56]]], ["lane", "conn", [[71, 57], [64, 56]]]]}, "arctic": {"W": 100, "H": 70, "plan": [["spawn", 2, 56, 10, 11, "A"], ["spawn", 2, 2, 10, 8, "A"], ["spawn", 88, 2, 10, 10, "B"], ["spawn", 88, 30, 10, 8, "B"], ["room", 32, 20, 36, 26, "", true], ["room", 32, 20, 12, 10, "서버실", false], ["door", 44, 25.0, false, 2.4], ["room", 56, 20, 12, 10, "실험실", false], ["door", 56, 25.0, false, 2.4], ["door", 62.0, 30, true, 2.4], ["door", 32, 37, false, 2.4], ["door", 68, 37, false, 2.4], ["door", 50, 20, true, 2.4], ["door", 50, 46, true, 2.4], ["room", 10, 52, 80, 4, "지하 배관 통로", false], ["door", 10, 54.0, false, 2.4], ["door", 90, 54.0, false, 2.4], ["door", 50.0, 52, true, 2.4], ["wall", 18, 12, 14, 3], ["wall", 66, 8, 14, 3], ["wall", 14, 30, 3, 14], ["wall", 82, 22, 3, 14], ["wall", 24, 44, 6, 3], ["wall", 72, 42, 6, 3], ["cover", 40, 40, 2, 2], ["cover", 58, 38, 2, 2], ["cover", 24, 24, 3, 2], ["cover", 76, 30, 2, 3], ["cover", 44, 10, 3, 2], ["cover", 56, 14, 2, 2], ["cover", 30, 60, 3, 2], ["cover", 64, 60, 3, 2], ["site", 62, 25, "A"], ["site", 80, 14, "B"], ["lane", "flank", [[8, 8], [16, 18], [40, 16], [62, 14], [80, 14]]], ["lane", "main", [[10, 36], [31, 37], [50, 33], [69, 37], [88, 34]]], ["lane", "flank", [[8, 58], [10, 54], [90, 54], [92, 40]]], ["lane", "conn", [[50, 52], [50, 47]]], ["lane", "conn", [[50, 19], [50, 14]]]]}, "canyon": {"W": 110, "H": 70, "plan": [["water", 50, 0, 10, 70], ["bridge", 48, 8, 14, 4], ["ford", 50, 30, 10, 10], ["room", 46, 56, 18, 6, "동굴 다리", false], ["door", 46, 59.0, false, 2.4], ["door", 64, 59.0, false, 2.4], ["spawn", 2, 54, 10, 13, "A"], ["spawn", 2, 4, 8, 10, "A"], ["spawn", 98, 2, 10, 10, "B"], ["spawn", 98, 50, 10, 10, "B"], ["wall", 30, 16, 3, 12], ["wall", 36, 44, 10, 3], ["wall", 40, 0, 3, 6], ["wall", 66, 18, 3, 10], ["wall", 68, 46, 10, 3], ["wall", 20, 32, 8, 3], ["room", 10, 10, 14, 10, "서쪽 마을집", false], ["door", 17.0, 20, true, 2.4], ["door", 24, 15.0, false, 2.4], ["room", 16, 40, 12, 10, "우물집", false], ["door", 22.0, 40, true, 2.4], ["door", 28, 45.0, false, 2.4], ["room", 74, 14, 14, 10, "채굴장 사무소", false], ["door", 74, 19.0, false, 2.4], ["door", 81.0, 24, true, 2.4], ["room", 86, 42, 14, 12, "동쪽 창고", true], ["door", 86, 48.0, false, 2.4], ["door", 93.0, 42, true, 2.4], ["cover", 36, 30, 2, 3], ["cover", 42, 22, 3, 2], ["cover", 42, 38, 2, 2], ["cover", 72, 34, 3, 2], ["cover", 78, 28, 2, 3], ["cover", 90, 30, 3, 2], ["cover", 30, 60, 3, 2], ["cover", 78, 60, 3, 2], ["cover", 64, 4, 3, 2], ["site", 80, 28, "A"], ["site", 82, 52, "B"], ["lane", "flank", [[8, 10], [26, 10], [48, 10], [62, 10], [74, 16], [80, 24]]], ["lane", "main", [[10, 50], [34, 36], [50, 35], [60, 35], [76, 31]]], ["lane", "flank", [[10, 62], [46, 59], [64, 59], [84, 56]]], ["lane", "conn", [[34, 30], [34, 18]]], ["lane", "conn", [[72, 42], [72, 34]]]]}, "customs": {"W": 90, "H": 56, "plan": [["spawn", 1, 42, 9, 12, "A"], ["spawn", 1, 2, 8, 8, "A"], ["spawn", 80, 2, 9, 12, "B"], ["spawn", 82, 26, 7, 8, "B"], ["room", 50, 3, 28, 12, "", false], ["room", 50, 3, 10, 12, "검사실", false], ["door", 50, 9.0, false, 2.4], ["door", 55.0, 15, true, 2.4], ["room", 60, 3, 8, 12, "복도", false], ["door", 60, 9.0, false, 2.4], ["door", 68, 9.0, false, 2.4], ["door", 64.0, 15, true, 2.4], ["room", 68, 3, 10, 12, "보관실", false], ["door", 78, 9.0, false, 2.4], ["door", 73.0, 15, true, 2.4], ["room", 52, 38, 28, 14, "물류 창고", true], ["door", 52, 45.0, false, 2.4], ["door", 60.4, 38, true, 2.4], ["door", 71.6, 38, true, 2.4], ["door", 80, 45.0, false, 2.4], ["wall", 32, 18, 0.8, 16], ["cover", 30.4, 25, 1.6, 2.4], ["wall", 38, 18, 0.8, 16], ["cover", 36.4, 25, 1.6, 2.4], ["wall", 44, 18, 0.8, 16], ["cover", 42.4, 25, 1.6, 2.4], ["cover", 30, 36, 3, 2], ["cover", 46, 14, 3, 2], ["cover", 36, 40, 2, 2], ["cont", 10, 14, 10, 2.5, 2], ["cont", 10, 20, 2.5, 8, 2], ["cont", 16, 22, 8, 2.5, 1], ["cont", 14, 30, 10, 2.5, 2], ["cont", 22, 34, 2.5, 8, 2], ["cont", 8, 36, 8, 2.5, 1], ["cont", 24, 12, 2.5, 8, 1], ["cover", 60, 22, 3, 3], ["cover", 70, 28, 2, 4], ["cover", 56, 30, 4, 2], ["cover", 80, 18, 2, 3], ["site", 55, 9, "A"], ["site", 66, 45, "B"], ["lane", "flank", [[7, 8], [20, 8], [40, 9], [50, 9]]], ["lane", "main", [[9, 44], [18, 28], [30, 26], [35, 30], [41, 23], [50, 26], [66, 24]]], ["lane", "flank", [[9, 50], [30, 48], [52, 45]]], ["lane", "conn", [[64, 15], [64, 22]]], ["lane", "conn", [[60, 37], [60, 32]]]]}, "pass": {"W": 90, "H": 56, "plan": [["spawn", 1, 42, 9, 12, "A"], ["spawn", 1, 18, 7, 9, "A"], ["spawn", 80, 2, 9, 10, "B"], ["spawn", 82, 26, 7, 8, "B"], ["road", 8, 44, 26, 6], ["road", 28, 22, 6, 28], ["road", 28, 22, 34, 6], ["road", 56, 8, 6, 20], ["road", 56, 8, 26, 6], ["wall", 10, 36, 16, 3], ["wall", 36, 30, 18, 3], ["wall", 50, 34, 3, 12], ["wall", 38, 14, 16, 3], ["wall", 64, 16, 3, 14], ["wall", 68, 32, 14, 3], ["room", 38, 19, 12, 12, "검문소", true], ["door", 38, 25.0, false, 2.4], ["door", 50, 25.0, false, 2.4], ["door", 44.0, 19, true, 2.4], ["room", 4, 4, 12, 9, "경비 막사", false], ["door", 16, 8.5, false, 2.4], ["door", 10.0, 13, true, 2.4], ["room", 66, 40, 14, 10, "차량 정비소", false], ["door", 66, 45.0, false, 2.4], ["door", 73.0, 40, true, 2.4], ["room", 30, 51, 34, 4, "배수로", false], ["door", 30, 53.0, false, 2.4], ["door", 64, 53.0, false, 2.4], ["door", 50.4, 51, true, 2.4], ["room", 70, 14, 10, 8, "초소", false], ["door", 70, 18.0, false, 2.4], ["door", 75.0, 22, true, 2.4], ["cover", 14, 40, 3, 2], ["cover", 30, 38, 2, 3], ["cover", 58, 22, 2, 3], ["cover", 74, 26, 3, 2], ["cover", 22, 8, 3, 2], ["cover", 46, 6, 3, 2], ["cover", 78, 46, 2, 2], ["cover", 40, 44, 3, 2], ["site", 76, 26, "A"], ["site", 44, 25, "B"], ["lane", "main", [[9, 46], [30, 47], [31, 26], [37, 25], [51, 25], [59, 22], [60, 11], [78, 10]]], ["lane", "flank", [[6, 20], [10, 15], [30, 8], [56, 5], [80, 6]]], ["lane", "flank", [[9, 52], [30, 53], [64, 53], [70, 46], [82, 32]]], ["lane", "conn", [[44, 31], [44, 50]]], ["lane", "conn", [[18, 34], [18, 15]]]]}, "factory": {"W": 90, "H": 56, "plan": [["spawn", 1, 44, 9, 10, "A"], ["spawn", 1, 14, 7, 8, "A"], ["spawn", 80, 2, 9, 10, "B"], ["spawn", 82, 30, 7, 10, "B"], ["room", 20, 14, 50, 28, "공장 본관", true], ["door", 20, 18.2, false, 2.4], ["door", 20, 36.400000000000006, false, 2.4], ["door", 70, 21.0, false, 2.4], ["door", 70, 37.8, false, 2.4], ["door", 30.0, 14, true, 2.4], ["door", 57.5, 14, true, 2.4], ["door", 40.0, 42, true, 2.4], ["door", 62.5, 42, true, 2.4], ["wall", 22, 20, 8, 2.2], ["wall", 22, 33, 8, 2.2], ["wall", 34, 20, 9, 2.2], ["wall", 34, 33, 9, 2.2], ["wall", 47, 20, 9, 2.2], ["wall", 47, 33, 9, 2.2], ["wall", 60, 20, 8, 2.2], ["wall", 60, 33, 8, 2.2], ["walk", 22, 14.6, 30, 2], ["stairs", 52.3, 14.6, 3, 2], ["cont", 8, 5, 14, 3, 1], ["cont", 28, 5, 14, 3, 1], ["cont", 50, 5, 14, 3, 1], ["cover", 24, 46, 4, 4], ["cover", 36, 48, 4, 4], ["cover", 54, 46, 3, 3], ["cover", 66, 48, 4, 4], ["cover", 14, 30, 2, 3], ["cover", 76, 18, 2, 3], ["cover", 40, 26, 2, 2], ["cover", 52, 27, 2, 2], ["wall", 44, 45, 1, 8], ["site", 64, 28, "A"], ["site", 70, 50, "B"], ["lane", "flank", [[6, 16], [8, 10], [40, 10.5], [70, 10], [80, 8]]], ["lane", "main", [[9, 44], [20, 37], [45, 37], [70, 38], [82, 36]]], ["lane", "main", [[20, 25], [45, 27], [70, 24]]], ["lane", "flank", [[9, 50], [30, 52], [60, 52], [78, 46]]], ["lane", "conn", [[32, 14], [32, 9]]], ["lane", "conn", [[40, 42], [40, 46]]]]}, "market": {"W": 90, "H": 56, "plan": [["spawn", 1, 46, 8, 9, "A"], ["spawn", 1, 26, 5, 10, "A"], ["spawn", 81, 1, 8, 9, "B"], ["spawn", 84, 28, 5, 10, "B"], ["room", 34, 20, 22, 16, "지붕 시장", false], ["door", 40.6, 20, true, 2.4], ["door", 34, 24.8, false, 2.4], ["door", 56, 32.0, false, 2.4], ["door", 49.4, 36, true, 2.4], ["cover", 38, 24, 3, 1.5], ["cover", 46, 24, 3, 1.5], ["cover", 40, 30, 3, 1.5], ["cover", 49, 30, 3, 1.5], ["room", 8, 4, 10, 8, "찻집", false], ["door", 13.0, 12, true, 2.4], ["door", 18, 8.0, false, 2.4], ["room", 21, 4, 10, 8, "잡화점", false], ["door", 21, 8.0, false, 2.4], ["door", 26.0, 12, true, 2.4], ["room", 37, 3, 12, 9, "식당", false], ["door", 43.0, 12, true, 2.4], ["door", 49, 7.5, false, 2.4], ["room", 53, 4, 10, 8, "약국", false], ["door", 53, 8.0, false, 2.4], ["door", 58.0, 12, true, 2.4], ["room", 66, 4, 12, 8, "여관", false], ["door", 72.0, 12, true, 2.4], ["door", 78, 8.0, false, 2.4], ["room", 8, 16, 9, 8, "창고", false], ["door", 12.5, 16, true, 2.4], ["door", 17, 20.0, false, 2.4], ["room", 20, 18, 10, 9, "공방", false], ["door", 20, 22.5, false, 2.4], ["door", 25.0, 27, true, 2.4], ["room", 60, 18, 10, 9, "이발소", false], ["door", 65.0, 18, true, 2.4], ["door", 70, 22.5, false, 2.4], ["room", 73, 14, 8, 10, "차고", false], ["door", 73, 19.0, false, 2.4], ["door", 77.0, 24, true, 2.4], ["room", 8, 40, 12, 9, "빵집", false], ["door", 14.0, 40, true, 2.4], ["door", 20, 44.5, false, 2.4], ["room", 24, 42, 10, 9, "철물점", false], ["door", 29.0, 42, true, 2.4], ["door", 24, 46.5, false, 2.4], ["room", 40, 40, 12, 8, "빈 가게", false], ["door", 46.0, 40, true, 2.4], ["door", 46.0, 48, true, 2.4], ["room", 56, 42, 10, 8, "정육점", false], ["door", 56, 46.0, false, 2.4], ["door", 66, 46.0, false, 2.4], ["room", 70, 40, 12, 9, "세탁소", false], ["door", 76.0, 40, true, 2.4], ["door", 70, 44.5, false, 2.4], ["cover", 14, 31, 2, 2], ["cover", 30, 32, 2, 2], ["cover", 60, 32, 2, 2], ["cover", 76, 30, 2, 2], ["cover", 34, 14, 2, 2], ["cover", 64, 38, 2, 1.5], ["cover", 20, 36, 3, 1.5], ["cover", 52, 14, 2, 2], ["site", 45, 28, "A"], ["site", 70, 30, "B"], ["lane", "flank", [[5, 30], [12, 26], [19, 14], [34, 14], [51, 14], [64, 15], [80, 12]]], ["wall", 66, 27, 1.2, 7], ["wall", 58, 36.5, 6, 1.2], ["lane", "main", [[8, 46], [22, 38], [33, 25], [45, 28], [57, 32], [64, 35], [72, 34], [84, 32]]], ["lane", "flank", [[9, 52], [38, 53], [54, 51], [68, 50], [84, 36]]], ["lane", "conn", [[45, 37], [45, 40]]], ["lane", "conn", [[25, 28], [25, 32]]]]}};
  var LIT = {
    night: { bg: 0x1b2832, fog: [22, 120], hemi: [0x9fb6c8, 0x2e2a24, .78], sun: [0xbcd0ea, .62, [34, 58, 22]], sky: [0x05080c, 0x1b2832], hdri: ['night', .05, .08, 2, .6], dim: 1 },
    day: { bg: 0x93a7b8, fog: [50, 200], hemi: [0xe2ebf2, 0x6a5c48, 1], sun: [0xfff0d0, 1.6, [-26, 40, 18]], sky: [0x3a6aa6, 0xd9cdb4], hdri: ['day', .8, 1.5, 8, 1], dim: .92 },
    dusk: { bg: 0x4a5560, fog: [40, 190], hemi: [0xc4d0da, 0x4a4436, .95], sun: [0xffd9b0, .75, [-30, 38, 24]], sky: [0x26313f, 0xb9885e], hdri: ['dusk', .42, .75, 6, .85], dim: .7 },
    snow: { bg: 0x2b3b55, fog: [30, 170], hemi: [0xb9cde8, 0x5b6676, .95], sun: [0xa9c4ec, .55, [30, 40, 26]], sky: [0x0c1626, 0x3a5070], hdri: ['night', .14, .22, 2, .9], dim: .8 },
    indoor: { bg: 0x101315, fog: [28, 90], hemi: [0xc9d2d8, 0x4a4338, .88], sun: [0xfff1dc, .32, [9, 30, 7]], hdri: ['indoor', .3, .3, 4, .6], dim: 1 }
  };
  function lit(k, th) { for (var q in LIT[k]) if (th[q] === undefined) th[q] = LIT[k][q]; return th; }
  function crates(b, cv, cx, cz, lx, L, Dp, n) { if (cv.w * cv.d <= 4.5) { b.pallet(cx, cz, 0); b.crate(cx, cz, 1.3, 0xb39058, .14, 1.2); b.solid(cx, cz, 1.4, 1.4, .2); } else crateRect(b, cv, n, [0xb39058, 0x9c8a62, 0xc9a66e]); }
  function lamps(b, list, h) { list.forEach(function (p) { b.lamp(p[0], p[1], h || 6, p[2] || 0, p[3] || 0); }); }
  function mk(key, th) { return function () { return planned(PLANS[key], th); }; }
  var dockM = mk('dock', lit('night', { name: '컨테이너 부두', clutter: ['metal_trash_can', 'utility_box_01', 'propane_tank', 'Barrel_01'], ground: 0x4d5053, groundT: 'conc', far: 0x16303b, outer: 0x6a6e70, wall: 0xb7b2a6, wallT: 'block', roofC: 0x5d666c, floor: 0x8e918c, rain: true, waterC: 0x16313d,
    cont: [0x7a3f30, 0x3f5f7a, 0x596a4a, 0x8a7a52, 0x2f6a6a, 0x6a4a6a, 0x9a5a2a], cover: crates,
    extra: function (b, P) { var gh = b.ghost; b.ghost = true;   /* a moored ship and two quay cranes beyond the water */
      b.box(0, P.HD + 16, 70, 12, 9, 0x2a2f33, -4, false, 'metal'); b.box(0, P.HD + 16, 70.4, 12.4, .5, 0x8a2a22, 5, false, 'paint'); b.box(-22, P.HD + 16, 12, 10, 8, 0xd8d6cf, 5, false, 'panel'); b.box(-22, P.HD + 16, 4, 4, 3, 0xd8d6cf, 13, false, 'panel');
      for (var cx = -12; cx <= 24; cx += 12) for (var cz = 12; cz <= 20; cz += 4) b.box(cx, P.HD + cz, 11, 3.2, 2.6, [0x7a3f30, 0x3f5f7a, 0x596a4a, 0x8a7a52][(cx / 12 + cz) & 3], 5.5, false, 'corr');
      [-20, 18].forEach(function (x) { [-4, 4].forEach(function (dx) { b.box(x + dx, P.HD + 4, .8, .8, 22, 0xc9a233, 0, false, 'metal'); }); b.box(x, P.HD + 4, 9.6, 1.2, 1.4, 0xc9a233, 22, false, 'metal'); b.box(x, P.HD + 12, 2, 26, 1.2, 0xc9a233, 21, false, 'metal'); b.box(x, P.HD - 6, 4, 4, 3, 0xb38f2a, 23, false, 'metal'); });
      b.ghost = gh;
      lamps(b, [[-30, -12, 0, 1], [-10, -12, 0, 1], [10, -12, 0, 1], [30, -12, 0, 1], [-26, 16, 0, -1], [0, 16, 0, -1], [26, 16, 0, -1]]); for (var x = -38; x <= 38; x += 6) b.cyl(x, 21.6, .22, .6, 0x2a2e31, 0, true, 'metal', .28, 10); b.mark('PIER 7', 0, 3.4, -18.85, 4, 1, PI, '#ecebe4'); } }));
  var warehouseM = mk('warehouse', lit('indoor', { name: '물류 창고', clutter: ['hand_truck', 'metal_trash_can'], hall: 6.2, wallKind: 'rack', ground: 0xa8acad, groundT: 'floor', far: 0x101315, outer: 0x8f9aa0, outerT: 'panel', wall: 0xb4b4ac, wallT: 'block', floor: 0xa8acad, roofC: 0x5d666c,
    cont: [0x7a3f30], cover: crates, extra: function (b, P) { [[-19.95, -6, PI / 2], [19.95, 6, -PI / 2]].forEach(function (q) { b.quad('m:EXIT', q[0], 2.6, q[1], .8, .32, q[2], { mode: 'lit', make: label('EXIT', '#eafff0', '#1f8a4c', 128, 64) }); });
      var gh = b.ghost; b.ghost = true; b.seg(-19.7, 4.6, -13.6, 19.7, 4.6, -13.6, .16, 0x9c5a2e, 'metal'); b.seg(-19.7, 5, 13.6, 19.7, 5, 13.6, .12, 0x7b858c, 'metal'); b.ghost = gh;
      [-12, 0, 12].forEach(function (x) { b.box(x, 0, .12, 26, .02, C.yellow, .03, false); }); b.mark('A', -17, .04, 11, 1.6, 1.6, 0, '#ffb347', true); b.mark('B', 17, .04, -11, 1.6, 1.6, 0, '#6cc4e0', true); } }));
  var depotM = mk('depot', lit('day', { name: '보급기지', clutter: ['metal_jerrycan_green', 'utility_box_01', 'portable_generator', 'Barrel_01'], trees: 22, ground: 0xa59878, groundT: 'sand', far: 0x8a7a5c, farT: 'sand', outer: 0x9a9b98, wall: 0xb9b5a8, wallT: 'block', roofC: 0x6a7074, floor: 0x9a9c97, wallKind: 'conc', wallH: 3, barrierC: 0x9a9b98,
    cont: [0x5a6142, 0x6a4a3a, 0x3f5f7a], cover: crates, extra: function (b, P) { var gh = b.ghost; b.ghost = true; b.box(42, -39, .3, .3, 18, 0x8a9096, 0, false, 'metal'); for (var y = 2; y < 18; y += 3) b.seg(41.6, y, -39, 42.4, y + 3, -39, .06, 0x8a9096, 'metal'); b.box(42, -39, 1.6, .2, .8, 0xd0d4d8, 16, false, 'metal'); b.ghost = gh;
      [[-18, -1.5], [7, 1.5]].forEach(function (q) { b.cyl(q[0], q[1], 2, 3.4, 0xc9c4b6, 0, false, 'metal', 2, 18); }); lamps(b, [[-36, -18, 1, 0], [36, 18, -1, 0], [0, -20, 0, 1], [0, 22, 0, -1]]); } }));
  var oldtownM = mk('oldtown', lit('day', { name: '구시가지', clutter: ['metal_trash_can', 'fire_hydrant', 'wooden_crate_02'], trees: 26, ground: 0x9a9488, groundT: 'conc', far: 0x6f7a52, outer: 0xc8bba4, outerT: 'plaster', wall: 0xd6c7a8, wallT: 'plaster', wall2: 0xcbb995, wall2T: 'plaster', roofC: 0x9a5a40, roofT: 'roof', floor: 0x8a7a66,
    wallKind: 'conc', wallH: 2.6, barrierC: 0xcdbb98, barrierT: 'plaster', cont: [0x7a3f30], extra: function (b, P) { lamps(b, [[-20, -8, 1, 0], [6, -16, 0, 1], [-4, 8, 0, -1], [22, 4, -1, 0]], 5); var gh = b.ghost; b.ghost = true; b.box(-10, -21, 3, 3, 3.4, 0xcdbb98, 6.4, false, 'plaster'); b.cyl(-10, -21, .1, 2.2, 0x9a5a40, 9.8, false, 'roof', 2.3, 4); b.glow(-10, 8.6, -19.48, .9, .9, .02, 0x2a2a28); b.ghost = gh; }, cover: function (b, cv, cx, cz, lx, L, Dp, n) { if (cv.w >= 4 && cv.d >= 4) { b.cyl(cx, cz, 2, .7, 0xb9b2a2, 0, true, 'conc', 2.1, 20); b.cyl(cx, cz, .35, 1.6, 0xb9b2a2, 0, true, 'conc', .45, 10); b.cyl(cx, cz, 1.8, .03, 0x4a7a8a, .68, false, 'water', 1.8, 20); } else crates(b, cv, cx, cz, lx, L, Dp, n); } }));
  var compoundM = mk('compound', lit('day', { name: '전술 기지', clutter: ['utility_box_01', 'ammo_box', 'old_military_crate', 'metal_jerrycan_green'], trees: 24, ground: 0x83847e, groundT: 'conc', far: 0x5b5a3e, outer: 0x9a9b98, wall: 0x9a9b98, wallT: 'conc', roofC: 0x5d666c, floor: 0x9a9c97, wallKind: 'conc', wallH: 3.6, outerH: 4.8,
    cont: [0x596a4a, 0x8a7a52], extra: function (b, P) { var gh = b.ghost; b.ghost = true; [-6, 6].forEach(function (x) { b.cyl(x, -10.5, .07, 9, 0xc9ccce, 0, false, 'metal', .05, 6); b.box(x + .9, -10.5, 1.8, .03, 1.1, x < 0 ? 0x3f5f7a : 0x963a2c, 7.6, false, 'canvas'); });
      [[-55, -43], [55, -43], [-55, 43], [55, 43]].forEach(function (q) { [-1, 1].forEach(function (a) { [-1, 1].forEach(function (c) { b.box(q[0] + a * 1.4, q[1] + c * 1.4, .3, .3, 8, 0x5a5e5c, 0, false, 'metal'); }); }); b.box(q[0], q[1], 4, 4, .3, 0x6a6e6c, 8, false, 'metal'); b.box(q[0], q[1], 4.4, 4.4, 2.2, 0x7a7e7a, 8.3, false, 'block'); b.box(q[0], q[1], 5, 5, .25, 0x4a4e4c, 10.5, false, 'corr'); });
      b.ghost = gh; }, cover: function (b, cv, cx, cz, lx, L, Dp, n) { if (Dp <= 2.1 && L >= 3) bagWall(b, cx, cz, lx, L); else crates(b, cv, cx, cz, lx, L, Dp, n); } }));
  var arcticM = mk('arctic', lit('snow', { name: '설산 연구기지', clutter: ['portable_generator', 'utility_box_01', 'propane_tank'], trees: 30, pines: true, roofT: 'snow', ground: 0xdfe6ee, groundT: 'snow', far: 0xc9d3dd, farT: 'snow', outer: 0x8a96a2, outerT: 'conc', wall: 0xc4ccd4, wallT: 'block', wall2: 0xaab4be, wall2T: 'block', roofC: 0xd8e0e8, floor: 0x8e979e,
    wallKind: 'cliff', cliffC: 0x6f7884, snowCap: true, wallH: 5, cont: [0x3f5f7a, 0x7a3f30], cover: crates, extra: function (b, P) { var gh = b.ghost; b.ghost = true; var g = new T.SphereGeometry(3.2, 18, 12, 0, PI * 2, 0, PI / 2); g.translate(-6, 6.6, -9); b.geo(g, 0xe8edf1, 'plain', {}); b.cyl(-6, -9, 3.3, .3, 0xa9b2ba, 6.4, false, 'metal', 3.3, 18);
      b.box(10, -10, .25, .25, 9, 0x8a9096, 6.4, false, 'metal'); b.box(10, -10, 2.4, .1, .1, 0x8a9096, 13, false, 'metal'); b.glow(10, 15.5, -10, .2, .2, .2, 0xff4433); b.ghost = gh;
      lamps(b, [[-30, -20, 1, 0], [30, -24, -1, 0], [-20, 22, 0, -1], [20, 22, 0, -1]], 5.5); } }));
  var canyonM = mk('canyon', lit('dusk', { name: '사막 협곡', clutter: ['wooden_crate_02', 'hand_truck', 'Barrel_01'], roofT: 'roof', ground: 0xb89a6e, groundT: 'sand', far: 0x9a7a52, farT: 'sand', outer: 0x9a6e4c, outerT: 'rock', outerH: 7, wall: 0xc8a978, wallT: 'plaster', roofC: 0x7a5a3a, floor: 0x9a8a6a, waterC: 0x24464c,
    wallKind: 'cliff', cliffC: 0x9a6e4c, wallH: 6, cont: [0x6a4a3a], cover: crates, extra: function (b, P) { var gh = b.ghost; b.ghost = true; for (var k = 0; k < 14; k++) { var a = k / 14 * PI * 2, R = 90 + (k % 3) * 14, g = new T.DodecahedronGeometry(14 + (k % 4) * 5, 0); g.scale(1.2, 1.4 + (k % 3) * .4, 1); g.translate(Math.cos(a) * R, 6, Math.sin(a) * R * .8); b.geo(g, 0x9a6e4c, 'rock', {}); }
      b.cyl(-40, -14, .2, 6, 0x6b5a48, 0, false, 'crate', .2, 6); b.cyl(-40, -14, 1.4, 2, 0x8a7a62, 6, false, 'crate', 1.4, 10); b.ghost = gh;
      lamps(b, [[-20, -12, 1, 0], [20, 10, -1, 0], [-28, 20, 0, -1], [28, -20, 0, 1]], 5.5); } }));
  var customsM = mk('customs', lit('day', { name: '세관 야적장', clutter: ['metal_trash_can', 'utility_box_01', 'hand_truck'], trees: 18, ground: 0x8d8f8a, groundT: 'conc', far: 0x6f6b5c, outer: 0x9a9b98, wall: 0xc9c4b6, wallT: 'plaster', wall2: 0x8f9aa0, wall2T: 'panel', roofC: 0x6a7074, floor: 0xa2a49f, wallKind: 'conc', wallH: 2.8,
    cont: [0x7a3f30, 0x3f5f7a, 0x596a4a, 0x8a7a52, 0x2f6a6a], cover: crates, extra: function (b, P) { [[-16, -9], [-16, 8], [2, -9], [2, 8], [-9, 9.5]].forEach(function (q) { b.cone(q[0], q[1]); });
      var gh = b.ghost; b.ghost = true; b.box(-7, -2, 16, 18, .2, 0x4f585e, 4.6, false, 'corr'); [-14, -7, 0].forEach(function (x) { [-10, 6].forEach(function (z) { b.box(x, z, .25, .25, 4.6, 0x3a4046, 0, false, 'metal'); }); }); b.ghost = gh; b.mark('CUSTOMS', 19, 3.4, -13.1, 5, 1.1, PI, '#2f4763'); } }));
  var passM = mk('pass', lit('dusk', { name: '고갯길 검문소', clutter: ['old_military_crate', 'metal_jerrycan_green', 'utility_box_01'], trees: 20, pines: true, ground: 0x8a7a5e, groundT: 'sand', far: 0x6b5a44, farT: 'sand', outer: 0x8a8070, outerT: 'rock', outerH: 6, wall: 0xa7a39a, wallT: 'block', wall2: 0x9c988e, roofC: 0x5d5a52, floor: 0x8f8c84, roadC: 0x4a4a46,
    wallKind: 'cliff', cliffC: 0x7a6a54, wallH: 5.5, cont: [0x596a4a], cover: function (b, cv, cx, cz, lx, L, Dp, n) { if (Dp <= 2.1 && L >= 3) bagWall(b, cx, cz, lx, L); else crates(b, cv, cx, cz, lx, L, Dp, n); },
    extra: function (b, P) { [[-16, 17], [-14.5, 17.4], [16, -18], [17.5, -17.6]].forEach(function (q) { b.cone(q[0], q[1]); });
      b.ghost = true; for (var k = 0; k < 18; k++) { var a = k / 18 * PI * 2, R = 100 + (k % 3) * 12, g = new T.DodecahedronGeometry(18 + (k % 4) * 6, 0); g.scale(1.4, .7 + (k % 3) * .25, 1); g.translate(Math.cos(a) * R, 2, Math.sin(a) * R * .75); b.geo(g, 0x6b5e4c, 'rock', {}); } b.ghost = false; lamps(b, [[-14, 19, 0, -1], [-14, -3, 1, 0], [14, -17, 0, 1]], 5.5); } }));
  var factoryM = mk('factory', lit('day', { name: '폐공장', clutter: ['propane_tank', 'tool_cart', 'portable_generator', 'Barrel_01'], ground: 0x7d7e78, groundT: 'conc', far: 0x5e5d52, outer: 0x8a8b86, wall: 0x9a9690, wallT: 'block', wall2: 0x7b6a5c, wall2T: 'rust', roofC: 0x6a5a4c, roofT: 'corr', floor: 0x8c8d88, stairC: 0x5c6166, wallKind: 'conc', wallH: 3,
    cont: [0x6a4a3a, 0x4f5a4a, 0x5a4a3a], cover: function (b, cv, cx, cz, lx, L, Dp, n) { if (cv.w >= 3 && cv.d >= 3) { b.cyl(cx, cz, Math.min(cv.w, cv.d) / 2, 3.2, 0xb7b0a0, 0, true, 'metal', Math.min(cv.w, cv.d) / 2, 18); b.cyl(cx, cz, .12, 1.4, 0x8c3b2f, 3.2, false, 'plain', .12, 8); } else crates(b, cv, cx, cz, lx, L, Dp, n); },
    extra: function (b, P) { var gh = b.ghost; b.ghost = true; [-12, 0, 12].forEach(function (x) { b.seg(x, 7.2, 14.2, x, 7.2, 22, .3, 0x8a6a58, 'rust'); b.seg(x, 7.2, 22, x, 3.4, 22, .3, 0x8a6a58, 'rust'); }); b.seg(-25, 7.2, 14.2, 25, 7.2, 14.2, .34, 0x7b858c, 'metal'); b.ghost = gh;
      b.ghost = true; b.cyl(30, -40, 2.4, 34, 0x8a6a58, 0, false, 'block', 1.8, 16); b.ghost = false; for (var x = -44; x < 44; x += 1.2) b.box(x, -21.5, .25, 2.4, .08, 0x4a3a2a, 0, false, 'crate'); [-22.3, -20.7].forEach(function (z) { b.box(0, z, 88, .08, .1, 0x6b7075, .08, false, 'metal'); }); } }));
  var marketM = mk('market', lit('night', { name: '시장 골목', clutter: ['metal_trash_can', 'wooden_crate_02', 'hand_truck'], signC: '#ffd9a0', ht: 3.6, ground: 0x6e6c66, groundT: 'conc', far: 0x3a3a36, outer: 0x8a8680, outerT: 'block', wall: 0xc8bba4, wallT: 'plaster', wall2: 0xb9ab92, wall2T: 'plaster', roofC: 0x7a4a38, roofT: 'roof', floor: 0x8a7a66,
    wallKind: 'conc', wallH: 3, barrierC: 0xb9ab92, barrierT: 'plaster', cont: [0x3f5f7a], cover: function (b, cv, cx, cz, lx, L, Dp, n) { if (cv.w * cv.d <= 4.5) { b.barrel(cx - .35, cz, 0x3f5f7a); b.barrel(cx + .35, cz + .2, 0x7a3f30); } else { var f = Fr(b, cx, cz, lx ? 0 : PI / 2); b.ghost = true; FURN.stall[3](f, b); b.ghost = false; b.solid(cx, cz, cv.w, cv.d, 1); } },
    extra: function (b, P) { var gh = b.ghost; b.ghost = true; for (var x = -40; x < 40; x += 1.8) { var z = Math.sin(x * .2) * 1.2 - 12; b.cyl(x, z, .06, .06, [0xffd28a, 0xffb070, 0xfff0c0][(Math.round(x) % 3 + 3) % 3], 4.2 + Math.cos(x * .5) * .12, false, 'glow', .06, 6); } b.seg(-40, 4.3, -12, 40, 4.3, -12, .015, 0x222222, 'plain');
      for (x = -40; x < 40; x += 1.8) { var z2 = 10.5 + Math.sin(x * .3); b.cyl(x, z2, .06, .06, [0xffd28a, 0xffb070, 0xfff0c0][(Math.round(x) % 3 + 3) % 3], 4.1, false, 'glow', .06, 6); } b.ghost = gh;
        // awning and a warm lamp over every shop door that opens onto an alley
      var cols = [0x8c3b2f, 0x2f5d8a, 0x3f6b3f, 0xc97a2b, 0x6a4a8a];
      P.doors.forEach(function (dd, i) { if (!dd.hz) return; var inR = function (x, z) { return P.rooms.some(function (r) { return x > r.x && x < r.x + r.w && z > r.z && z < r.z + r.d; }); }, out = inR(dd.x, dd.z - .6) ? 1 : inR(dd.x, dd.z + .6) ? -1 : 0; if (!out || inR(dd.x, dd.z + out * 1.5)) return;
        var gh = b.ghost; b.ghost = true; b.box(dd.x, dd.z + out * 1, 3.4, 1.8, .06, cols[i % cols.length], 2.6, false, 'canvas'); b.ghost = gh; b.glow(dd.x, 2.62, dd.z + out * .2, 1.4, .04, .1, 0xffd28a); b.light(dd.x, 2.3, dd.z + out * 1.1, 0xffc98a, 1.1, 8); });
      lamps(b, [[-30, 3, 0, -1], [-12, 3, 0, -1], [12, 3, 0, -1], [30, 3, 0, -1]], 5); b.mark('MARKET', 0, 4.4, -27.95, 6, 1.4, 0, '#ffd27a');
    } }));

  var MAKERS = [dockM, warehouseM, depotM, oldtownM, compoundM, arcticM, canyonM, customsM, passM, factoryM, marketM, range];
  SV.RANGE = 11;   // the practice range: not in the match list, opened from the lobby's practice button
  SV.MAPS = [{ name: '컨테이너 부두', info: '중형 · 야간', hint: '컨테이너 미로와 부두 · 출발점 대각선' }, { name: '물류 창고', info: '소형 · 실내', hint: '선반 두 블록을 도는 8자 순환' },
    { name: '보급기지', info: '대형 · 낮', hint: '폭파 미션 가능 · 가운데 연료 저장소와 외곽 순환로', bomb: true }, { name: '구시가지', info: '대형 · 2층', hint: '폭파 미션 가능 · 굽은 골목과 집 관통', bomb: true },
    { name: '전술 기지', info: '대형 · 대칭', hint: '폭파 미션 가능 · 세 갈래와 연결로', bomb: true }, { name: '설산 연구기지', info: '대형 · 야간', hint: '폭파 미션 가능 · 연구동 관통과 지하 통로', bomb: true },
    { name: '사막 협곡', info: '대형 · 해질녘', hint: '폭파 미션 가능 · 철교 · 여울 · 동굴 다리', bomb: true }, { name: '세관 야적장', info: '대형 · 낮', hint: '폭파 미션 가능 · 검사 차선과 컨테이너 블록', bomb: true },
    { name: '고갯길 검문소', info: '대형 · 해질녘', hint: '폭파 미션 가능 · 지그재그 산길', bomb: true }, { name: '폐공장', info: '대형 · 낮', hint: '폭파 미션 가능 · 기계 사이 격자 실내전', bomb: true },
    { name: '시장 골목', info: '대형 · 야간', hint: '폭파 미션 가능 · 골목 그물망과 지붕 시장', bomb: true }];
  SV.buildMap = function (i) { var m = MAKERS[i](); m.group = m.b.finish(); m.lights = m.b.lights; if (m.sky) { var sd = skyDome(m.sky[0], m.sky[1]); sd.userData.sky = 1; m.group.add(sd); } m.boxes = m.b.boxes; m.spawns = m.b.spawns; return m; };
})();
