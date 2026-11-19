// game.js — simulation and rendering: movement, shooting, bots, effects, HUD numbers.
(function () {
  var T = THREE, PI = Math.PI, $ = function (id) { return document.getElementById(id); };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function angd(a, b) { var d = (a - b) % (2 * PI); if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI; return d; }

  var W = SV.W = {
    rifle:   { name: '돌격소총', short: '소총', dmg: 27, head: 2.2, interval: .1, mag: 30, res: 120, reload: 2.1, spread: .014, ads: .0035, bloom: .0035, recoil: .011, auto: true, range: 120, fall: 35, pellets: 1, fov: 46, snd: 1 },
    smg:     { name: '기관단총', short: '기관단총', dmg: 18, head: 1.9, interval: .067, mag: 32, res: 160, reload: 1.8, spread: .022, ads: .011, bloom: .003, recoil: .0075, auto: true, range: 80, fall: 14, pellets: 1, fov: 50, snd: 1.35 },
    sniper:  { name: '저격소총', short: '저격', dmg: 92, head: 2.5, interval: 1.25, mag: 5, res: 25, reload: 2.8, spread: .07, ads: .0004, bloom: 0, recoil: .05, auto: false, range: 200, fall: 200, pellets: 1, fov: 13, scope: true, snd: .55 },
    shotgun: { name: '산탄총', short: '산탄총', dmg: 14, head: 1.4, interval: .85, mag: 6, res: 30, reload: 2.4, spread: .075, ads: .06, bloom: 0, recoil: .04, auto: false, range: 40, fall: 7, pellets: 8, fov: 50, snd: .7 },
    pistol:  { name: '권총', short: '권총', dmg: 26, head: 2, interval: .15, mag: 12, res: 60, reload: 1.4, spread: .016, ads: .006, bloom: .006, recoil: .014, auto: false, range: 70, fall: 16, pellets: 1, fov: 50, snd: 1.15 },
    knife:   { name: '나이프', short: '칼', dmg: 55, head: 1, interval: .5, melee: true, range: 2.3, mag: 0, res: 0, reload: 0, fov: 62 }
  };
  var DIFF = [{ err: .05, react: .62, turn: 5 }, { err: .032, react: .42, turn: 7 }, { err: .02, react: .28, turn: 9.5 }, { err: .011, react: .17, turn: 13 }];
  var NAMES = { A: ['까치', '너구리', '수달', '오소리', '두루미', '고라니', '삵'], B: ['매', '늑대', '살쾡이', '올빼미', '멧돼지', '담비', '수리'] };
  var BOTGUN = ['rifle', 'smg', 'sniper', 'shotgun', 'rifle', 'smg', 'rifle'];
  var EYE = 1.63, EYEC = 1.12, RAD = .35;

  var G = SV.G = { state: 'menu', actors: [], nades: [], score: { A: 0, B: 0 }, time: 0, stats: null, feed: [] };
  var inp = SV.inp = { use: false, gy: 0, gp: 0, mx: 0, mz: 0, lx: 0, ly: 0, fire: false, ads: false, jump: false, crouch: false, reload: false, nade: false, slot: -1 };
  var cfg = SV.cfg;

  // ---------- renderer ----------
  var canvas = $('cv'), renderer = null, scene = new T.Scene(), cam = new T.PerspectiveCamera(62, 2, .08, 400), vmScene = new T.Scene(), vmCam = new T.PerspectiveCamera(48, 2, .01, 10);
  cam.rotation.order = 'YXZ';
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { SV.fatal = '이 기기에서는 3D 화면을 열 수 없습니다.'; }
  if (renderer) { renderer.autoClear = false; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; renderer.shadowMap.autoUpdate = false; }
  var hemi = new T.HemisphereLight(0xffffff, 0x222222, .6), sun = new T.DirectionalLight(0xffffff, .6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0008;
  scene.add(hemi); scene.add(sun); scene.add(sun.target);
  vmScene.add(new T.HemisphereLight(0xdfe6ea, 0x3a342b, 1)); var vmSun = new T.DirectionalLight(0xfff1dc, .5); vmSun.position.set(1, 2, 1); vmScene.add(vmSun);
  var vmRoot = new T.Group(); vmScene.add(vmRoot);
  var flash = new T.Mesh(new T.PlaneGeometry(.16, .16), new T.MeshBasicMaterial({ color: 0xffc977, transparent: true, opacity: .9, depthTest: false })); flash.visible = false; vmRoot.add(flash);
  var vms = {}, vmCur = null, vmKick = 0, vmAds = 0, vmSwap = 0, bobT = 0;

  SV.resize = function () {
    if (!renderer) return; var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.quality ? 2 : 1.25)); renderer.setSize(w, h, false);
    cam.aspect = vmCam.aspect = w / h; cam.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  };

  // ---------- effects ----------
  var tracers = [], puffs = [], booms = [], fx = new T.Group(); scene.add(fx);
  (function () {
    var i, m;
    for (i = 0; i < 28; i++) { m = new T.Line(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)), new T.LineBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: .8 })); m.visible = false; m.frustumCulled = false; fx.add(m); tracers.push({ m: m, life: 0 }); }
    var bg = new T.BoxGeometry(.09, .09, .09);
    for (i = 0; i < 36; i++) { m = new T.Mesh(bg, new T.MeshBasicMaterial({ color: 0xffffff })); m.visible = false; fx.add(m); puffs.push({ m: m, life: 0, max: 1 }); }
    var sg = new T.IcosahedronGeometry(1, 1);
    for (i = 0; i < 4; i++) { m = new T.Mesh(sg, new T.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: .8 })); m.visible = false; fx.add(m); booms.push({ m: m, life: 0 }); }
  })();
  var ti = 0, pi2 = 0;
  function tracer(a, b) { var t = tracers[ti = (ti + 1) % tracers.length], p = t.m.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; t.m.visible = true; t.life = .07; }
  function puff(p, color, life, size) { var q = puffs[pi2 = (pi2 + 1) % puffs.length]; q.m.position.copy(p); q.m.material.color.setHex(color); q.m.scale.setScalar(size || 1); q.m.visible = true; q.life = q.max = life || .22; }
  function updFx(dt) {
    var i, o;
    for (i = 0; i < tracers.length; i++) { o = tracers[i]; if (o.life > 0) { o.life -= dt; if (o.life <= 0) o.m.visible = false; } }
    for (i = 0; i < puffs.length; i++) { o = puffs[i]; if (o.life > 0) { o.life -= dt; o.m.scale.multiplyScalar(1 - dt * 3); if (o.life <= 0) o.m.visible = false; } }
    for (i = 0; i < booms.length; i++) { o = booms[i]; if (o.life > 0) { o.life -= dt; var k = 1 - o.life / .35; o.m.scale.setScalar(.6 + k * 5); o.m.material.opacity = .85 * (1 - k); if (o.life <= 0) o.m.visible = false; } }
  }

  // ---------- rain ----------
  var rain = null;
  function makeRain() {
    var n = 500, p = new Float32Array(n * 6), i; for (i = 0; i < n; i++) { var x = rnd(-14, 14), y = rnd(0, 14), z = rnd(-14, 14); p.set([x, y, z, x + .05, y - .5, z], i * 6); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3));
    rain = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x8fa3b3, transparent: true, opacity: .28 })); rain.frustumCulled = false; scene.add(rain);
  }
  function updRain(dt) {
    if (!rain) return; var p = rain.geometry.attributes.position.array, i;
    for (i = 0; i < p.length; i += 6) { p[i + 1] -= dt * 22; p[i + 4] -= dt * 22; if (p[i + 4] < 0) { p[i + 1] += 14; p[i + 4] += 14; } }
    rain.geometry.attributes.position.needsUpdate = true; rain.position.set(cam.position.x, 0, cam.position.z);
  }

  // ---------- collision ----------
  var boxes = [];
  function rayBox(ox, oy, oz, dx, dy, dz, b) {
    var t0 = 0, t1 = 1e9, a, c, inv;
    if (Math.abs(dx) < 1e-9) { if (ox < b.minx || ox > b.maxx) return -1; } else { inv = 1 / dx; a = (b.minx - ox) * inv; c = (b.maxx - ox) * inv; if (a > c) { var s = a; a = c; c = s; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) return -1; }
    if (Math.abs(dy) < 1e-9) { if (oy < b.miny || oy > b.maxy) return -1; } else { inv = 1 / dy; a = (b.miny - oy) * inv; c = (b.maxy - oy) * inv; if (a > c) { var s2 = a; a = c; c = s2; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) return -1; }
    if (Math.abs(dz) < 1e-9) { if (oz < b.minz || oz > b.maxz) return -1; } else { inv = 1 / dz; a = (b.minz - oz) * inv; c = (b.maxz - oz) * inv; if (a > c) { var s3 = a; a = c; c = s3; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) return -1; }
    return t0;
  }
  function rayWorld(o, d, max) {
    var best = max, i, t, b, ex, ez; if (d.y < -1e-6) { t = -o.y / d.y; if (t >= 0 && t < best) best = t; }
    for (i = 0; i < boxes.length; i++) { b = boxes[i]; if (b.soft) continue;
      if (b.rot) { ex = o.x - b.ox; ez = o.z - b.oz; t = rayBox(ex * b.c - ez * b.s, o.y, ex * b.s + ez * b.c, d.x * b.c - d.z * b.s, d.y, d.x * b.s + d.z * b.c, b); } else t = rayBox(o.x, o.y, o.z, d.x, d.y, d.z, b);
      if (t >= 0 && t < best) best = t; }
    return best;
  }
  var tb = { minx: 0, maxx: 0, miny: 0, maxy: 0, minz: 0, maxz: 0 };
  function rayActor(o, d, a) {
    var h = a.crouch ? 1.25 : 1.75, hx = a.pos.x - o.x, hy = a.pos.y + h - .15 - o.y, hz = a.pos.z - o.z, b = hx * d.x + hy * d.y + hz * d.z, th = -1;
    if (b > 0) { var c = hx * hx + hy * hy + hz * hz - b * b; if (c < .0324) th = b - Math.sqrt(.0324 - c); }
    tb.minx = a.pos.x - .3; tb.maxx = a.pos.x + .3; tb.minz = a.pos.z - .3; tb.maxz = a.pos.z + .3; tb.miny = a.pos.y; tb.maxy = a.pos.y + h - .3;
    var t = rayBox(o.x, o.y, o.z, d.x, d.y, d.z, tb);
    if (th >= 0 && (t < 0 || th < t + .35)) return { t: th, head: true };
    return t >= 0 ? { t: t, head: false } : null;
  }
  function height(a) { return a.crouch ? 1.25 : 1.75; }
  function collide(a) {
    var h = height(a), f = a.pos.y, it, i, b, cx, cz, dx, dz, d2, d, px, pz;
    for (it = 0; it < 2; it++) for (i = 0; i < boxes.length; i++) {
      b = boxes[i]; if (b.maxy <= f + .45 || b.miny >= f + h) continue;
      px = a.pos.x; pz = a.pos.z; if (b.rot) { dx = px - b.ox; dz = pz - b.oz; px = dx * b.c - dz * b.s; pz = dx * b.s + dz * b.c; }   // into the box's own frame
      cx = clamp(px, b.minx, b.maxx); cz = clamp(pz, b.minz, b.maxz); dx = px - cx; dz = pz - cz; d2 = dx * dx + dz * dz;
      if (d2 >= RAD * RAD) continue;
      if (d2 > 1e-8) { d = Math.sqrt(d2); px += dx / d * (RAD - d); pz += dz / d * (RAD - d); }
      else { var l = px - b.minx, r = b.maxx - px, n = pz - b.minz, s = b.maxz - pz, m = Math.min(l, r, n, s); if (m === l) px = b.minx - RAD; else if (m === r) px = b.maxx + RAD; else if (m === n) pz = b.minz - RAD; else pz = b.maxz + RAD; }
      if (b.rot) { a.pos.x = b.ox + px * b.c + pz * b.s; a.pos.z = b.oz - px * b.s + pz * b.c; } else { a.pos.x = px; a.pos.z = pz; }
    }
  }
  function groundAt(a) {
    var g = 0, f = a.pos.y, i, b; for (i = 0; i < boxes.length; i++) { b = boxes[i]; if (b.maxy <= f + .46 && b.maxy > g && inBox(b, a.pos.x, a.pos.z, .2)) g = b.maxy; }
    return g;
  }
  function moveActor(a, vx, vz, dt) {
    var lad = null, ls = G.map && G.map.ladders, i; a.pos.x += vx * dt; a.pos.z += vz * dt; collide(a);
    if (ls) for (i = 0; i < ls.length; i++) if (a.pos.y < ls[i].y1 + .05 && Math.abs(a.pos.x - ls[i].x) < .55 && Math.abs(a.pos.z - ls[i].z) < .55) lad = ls[i];
    // ladder: pushing into it climbs, anything else slides down slowly
    if (lad && vx * lad.dx + vz * lad.dz > .5) a.vy = 3.4; else { a.vy -= 20 * dt; if (lad && a.vy < -3) a.vy = -3; } a.pos.y += a.vy * dt; var g = groundAt(a);
    if (a.pos.y <= g) { a.pos.y = g; a.vy = 0; a.ground = true; } else a.ground = a.pos.y - g < .05;
  }

  // ---------- navigation grid for bots ----------
  var nav = null;
  function inBox(b, x, z, m) { if (b.rot) { var ex = x - b.ox, ez = z - b.oz, t = ex * b.c - ez * b.s; z = ex * b.s + ez * b.c; x = t; } return x > b.minx - m && x < b.maxx + m && z > b.minz - m && z < b.maxz + m; }
  // One grid of 1 m cells per storey. Storey 1 exists where a box top lies at the map's upper-floor height (map.H). Stairs and
  // ladders are explicit links between two cells (map.links); a path node reached through a link is flagged "jump".
  function lvl(a) { return nav && nav.H && a.pos.y > nav.H - 1.2 ? 1 : 0; }
  function buildNav(map) {
    var bd = map.bounds, nx = Math.ceil(bd.maxx - bd.minx), nz = Math.ceil(bd.maxz - bd.minz), N = nx * nz, H = map.H || 0, blk = new Uint8Array(N * (H ? 2 : 1)), k, b, i;
    function mark(b, base, m, val) {
      var r = b.rot ? Math.hypot(b.maxx, b.maxz) + 1 : 0, x0 = b.rot ? b.ox - r : b.minx - 1, x1 = b.rot ? b.ox + r : b.maxx + 1, z0 = b.rot ? b.oz - r : b.minz - 1, z1 = b.rot ? b.oz + r : b.maxz + 1, i, j;
      var i0 = Math.max(0, Math.floor(x0 - bd.minx)), i1 = Math.min(nx - 1, Math.floor(x1 - bd.minx)), j0 = Math.max(0, Math.floor(z0 - bd.minz)), j1 = Math.min(nz - 1, Math.floor(z1 - bd.minz));
      for (i = i0; i <= i1; i++) for (j = j0; j <= j1; j++) if (inBox(b, bd.minx + i + .5, bd.minz + j + .5, m)) blk[base + j * nx + i] = val;
    }
    for (k = 0; k < boxes.length; k++) { b = boxes[k]; if (b.maxy > .5 && b.miny < 1.6) mark(b, 0, .5, 1); }
    if (H) {
      blk.fill(1, N);
      for (k = 0; k < boxes.length; k++) { b = boxes[k]; if (!b.soft && Math.abs(b.maxy - H) < .15) mark(b, N, -.15, 0); }
      for (k = 0; k < boxes.length; k++) { b = boxes[k]; if (b.maxy > H + .5 && b.miny < H + 1.6) mark(b, N, .5, 1); }
    }
    nav = { nx: nx, nz: nz, N: N, H: H, blk: blk, ox: bd.minx, oz: bd.minz, g: new Float32Array(blk.length), par: new Int32Array(blk.length), stamp: new Int32Array(blk.length), cl: new Int32Array(blk.length), jmp: new Uint8Array(blk.length), run: 0, free: [], links: {}, exact: {} };
    for (i = 0; i < N; i++) if (!blk[i]) nav.free.push(i);
    (map.links || []).forEach(function (L) {
      var ca = freeNear(cellOf(L.a[0], L.a[1], L.a[2])), cb = freeNear(cellOf(L.b[0], L.b[1], L.b[2])), cost = Math.hypot(L.a[0] - L.b[0], L.a[1] - L.b[1]) + 2;
      (nav.links[ca] = nav.links[ca] || []).push({ to: cb, cost: cost }); (nav.links[cb] = nav.links[cb] || []).push({ to: ca, cost: cost }); nav.exact[ca] = L.a; nav.exact[cb] = L.b;
    });
  }
  function cellOf(x, z, l) { var i = clamp(Math.floor(x - nav.ox), 0, nav.nx - 1), j = clamp(Math.floor(z - nav.oz), 0, nav.nz - 1); return (l && nav.H ? nav.N : 0) + j * nav.nx + i; }
  function freeNear(c) {
    if (!nav.blk[c]) return c; var base = c >= nav.N ? nav.N : 0, cc = c - base, ci = cc % nav.nx, cj = (cc / nav.nx) | 0, r, i, j;
    for (r = 1; r < 8; r++) for (i = ci - r; i <= ci + r; i++) for (j = cj - r; j <= cj + r; j++) { if (i < 0 || j < 0 || i >= nav.nx || j >= nav.nz) continue; if (!nav.blk[base + j * nav.nx + i]) return base + j * nav.nx + i; }
    return c;
  }
  function lineFree(x0, z0, x1, z1, l) { var d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / .4), i; for (i = 1; i < n; i++) { var t = i / n; if (nav.blk[cellOf(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, l)]) return false; } return true; }
  function findPath(x0, z0, l0, x1, z1, l1) {
    var nx = nav.nx, N = nav.N, s = freeNear(cellOf(x0, z0, l0)), t = freeNear(cellOf(x1, z1, l1)), run = ++nav.run, heap = [s], hf = {}, ti2 = (t % N) % nx, tj = ((t % N) / nx) | 0, guard = 0;
    nav.g[s] = 0; nav.par[s] = -1; nav.stamp[s] = run; nav.jmp[s] = 0; hf[s] = 0;
    function relax(c, n, ng, jump) { if (nav.stamp[n] === run && ng >= nav.g[n]) return; var nn = n % N; nav.g[n] = ng; nav.par[n] = c; nav.stamp[n] = run; nav.jmp[n] = jump; hf[n] = ng + Math.hypot(nn % nx - ti2, ((nn / nx) | 0) - tj); heap.push(n); }
    while (heap.length && guard++ < 30000) {
      var bi = 0, k; for (k = 1; k < heap.length; k++) if (hf[heap[k]] < hf[heap[bi]]) bi = k;
      var c = heap[bi]; heap[bi] = heap[heap.length - 1]; heap.pop();
      if (c === t) break; if (nav.cl[c] === run) continue; nav.cl[c] = run;
      var base = c >= N ? N : 0, cc = c - base, ci = cc % nx, cj = (cc / nx) | 0, di, dj;
      for (di = -1; di <= 1; di++) for (dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue; var ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= nx || nj >= nav.nz) continue;
        var n = base + nj * nx + ni; if (nav.blk[n] || nav.cl[n] === run) continue; if (di && dj && (nav.blk[base + cj * nx + ni] || nav.blk[base + nj * nx + ci])) continue;
        relax(c, n, nav.g[c] + (di && dj ? 1.414 : 1), 0);
      }
      var lk = nav.links[c]; if (lk) for (k = 0; k < lk.length; k++) if (nav.cl[lk[k].to] !== run) relax(c, lk[k].to, nav.g[c] + lk[k].cost, 1);
    }
    var out = []; if (nav.stamp[t] !== run) return out;
    for (var q = t; q !== -1 && out.length < 600; q = nav.par[q]) { var qq = q % N, e = nav.exact[q]; out.push({ x: e ? e[0] : nav.ox + (qq % nx) + .5, z: e ? e[1] : nav.oz + ((qq / nx) | 0) + .5, l: q >= N ? 1 : 0, jump: nav.jmp[q] === 1 }); }
    return out.reverse();
  }

  // ---------- sound ----------
  var ac = null, noise = null;
  SV.audio = function () {
    if (ac || !cfg.sound) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); var n = ac.sampleRate * .6, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; noise = buf; } catch (e) { ac = null; }
  };
  function sndShot(rate, vol) {
    if (!ac || !cfg.sound || vol < .02) return; var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime;
    s.buffer = noise; s.playbackRate.value = rate; f.type = 'lowpass'; f.frequency.setValueAtTime(4200 * rate, t); f.frequency.exponentialRampToValueAtTime(500, t + .14);
    g.gain.setValueAtTime(.5 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .22 / Math.max(rate, .5)); s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); s.stop(t + .5);
  }
  function sndTone(freq, dur, vol, type) {
    if (!ac || !cfg.sound) return; var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur);
  }

  // ---------- actors ----------
  function guns(primary, bot) { return [primary, 'pistol', 'knife'].map(function (id) { return { id: id, mag: W[id].mag, res: bot ? 9999 : W[id].res, cool: 0, reload: 0 }; }); }
  function actor(team, name, isPlayer, primary) {
    var a = { team: team, name: name, isPlayer: isPlayer, primary: primary, pos: new T.Vector3(), vy: 0, yaw: 0, pitch: 0, hp: 100, alive: false, respawn: 0, prot: 0, crouch: false, ground: true,
      kills: 0, deaths: 0, slot: 0, guns: null, nade: 1, bloom: 0, ads: false, walk: 0, moving: false, dead: 0, spot: 0, model: null, useP: 0, useAt: null, idx: 0,
      ai: { tgt: null, seen: 0, path: [], pathT: 0, goal: null, think: Math.random() * .2, strafe: 1, strafeT: 0, burst: 0, pause: 0, lastX: 0, lastZ: 0, stuckT: 0, hurtBy: null, lastSeen: null, lastSeenT: 99 } };
    if (!isPlayer) { a.model = SV.soldier(team, primary); scene.add(a.model.root); a.model.root.visible = false; if (team === G.match.team) { var mk = new T.Mesh(new T.OctahedronGeometry(.09), new T.MeshBasicMaterial({ color: team === 'A' ? 0xffb347 : 0x6cc4e0, fog: false })); mk.position.y = 2.1; a.model.root.add(mk); } }
    return a;
  }
  function eye(a, out) { return out.set(a.pos.x, a.pos.y + (a.crouch ? EYEC : EYE), a.pos.z); }
  function spawn(a) {
    var side = G.bomb ? (a.team === G.bomb.atk ? 'A' : 'B') : a.team, pts = G.map.spawns[side], best = pts[0], bd = -1, i, j;
    for (i = 0; i < pts.length; i++) { var d = 1e9; for (j = 0; j < G.actors.length; j++) { var o = G.actors[j]; if (o !== a && o.alive) d = Math.min(d, Math.hypot(o.pos.x - pts[i].x, o.pos.z - pts[i].z)); } d += Math.random() * 2; if (d > bd) { bd = d; best = pts[i]; } }
    a.pos.set(best.x, 0, best.z); a.vy = 0; a.yaw = side === 'A' ? -PI / 2 : PI / 2; a.pitch = 0; a.useP = 0; a.useAt = null; a.lastFree = null; a.hp = 100; a.alive = true; a.prot = 1.6; a.crouch = false; a.slot = 0; a.nade = 1; a.bloom = 0; a.dead = 0;
    if (a.isPlayer) a.primary = G.match.primary; a.guns = guns(a.primary, !a.isPlayer);
    a.ai.tgt = null; a.ai.path = []; a.ai.goal = null; a.ai.seen = 0; a.ai.hurtBy = null; a.ai.lastSeenT = 99;
    if (a.model) { a.model.root.visible = true; a.model.root.rotation.set(0, 0, 0); a.model.root.scale.set(1, 1, 1); }
    if (a.isPlayer) { setVm(); $('msg').hidden = true; }
  }
  function feed(k, v, head) { G.feed.unshift({ k: k, v: v, head: head, t: 5 }); if (G.feed.length > 4) G.feed.pop(); G.feedDirty = true; }
  function hurt(v, dmg, by, head, wid) {
    if (!v.alive || v.prot > 0 || G.state !== 'play') return false;
    v.hp -= dmg; v.ai.hurtBy = by;
    if (v.isPlayer) { G.hitFlash = .5; sndTone(120, .12, .18, 'sawtooth'); }
    if (by.isPlayer && by !== v) { G.marker = head ? .3 : .18; G.markerHead = head; sndTone(head ? 1500 : 900, .05, .1); }
    if (v.hp <= 0) {
      v.alive = false; v.respawn = 3; v.deaths++; v.dead = .001;
      if (by !== v) { by.kills++; if (!G.bomb) G.score[by.team]++; }
      if (G.bomb && G.bomb.carrier === v) { G.bomb.carrier = null; G.bomb.drop = v.lastFree || snap(v.pos.x, v.pos.z, lvl(v)); }
      feed(by, v, head);
      if (by.isPlayer && by !== v) { G.stats.kills++; if (head) G.stats.heads++; G.streak++; G.stats.streak = Math.max(G.stats.streak, G.streak); showMsg(v.name + ' 처치' + (head ? ' · 헤드샷' : ''), 1.4); sndTone(660, .09, .12); setTimeout(function () { sndTone(990, .14, .12); }, 90); }
      if (v.isPlayer) { G.streak = 0; G.stats.deaths++; G.killer = by; if (by !== v) G.stats.by[by.name] = (G.stats.by[by.name] || 0) + 1; }
      if (!G.bomb && G.score[by.team] >= G.match.target) endMatch();
    }
    return true;
  }
  var msgT = 0; function showMsg(t, dur) { var m = $('msg'); m.textContent = t; m.hidden = false; msgT = dur; }

  // ---------- shooting ----------
  var vO = new T.Vector3(), vD = new T.Vector3(), vH = new T.Vector3(), vM = new T.Vector3(), vR = new T.Vector3(), vU = new T.Vector3();
  function castShot(a, o, d, range) {
    var tw = rayWorld(o, d, range), best = null, i, e, r;
    for (i = 0; i < G.actors.length; i++) { e = G.actors[i]; if (!e.alive || e.team === a.team) continue; r = rayActor(o, d, e); if (r && r.t < tw && (!best || r.t < best.t)) { best = r; best.actor = e; } }
    return best || { t: tw, actor: null, world: tw < range };
  }
  function reload(a) { var g = a.guns[a.slot], w = W[g.id]; if (w.melee || g.reload > 0 || g.mag >= w.mag || g.res <= 0) return; g.reload = w.reload; a.ads = false; if (a.isPlayer) { sndTone(300, .05, .08); vmSwap = .25; } }
  function fire(a, o, dir, muzzle) {
    var g = a.guns[a.slot], w = W[g.id], i, res;
    if (g.cool > 0 || g.reload > 0) return false;
    if (w.melee) {
      g.cool = w.interval; res = castShot(a, o, dir, w.range); if (a.isPlayer) { vmKick = 1; sndShot(2.4, .25); }
      if (res.actor) { var back = Math.abs(angd(res.actor.yaw, a.yaw)) < 1; hurt(res.actor, back ? 200 : w.dmg, a, false, g.id); }
      return true;
    }
    if (g.mag <= 0) { reload(a); return false; }
    g.mag--; g.cool = w.interval;
    var sp = (a.ads ? w.ads : w.spread) + a.bloom + (a.moving ? (a.ads ? .004 : .012) : 0) + (a.isPlayer ? 0 : a.ai.err) + (a.ground ? 0 : .04);
    vR.set(dir.z, 0, -dir.x).normalize(); vU.crossVectors(vR, dir);
    for (i = 0; i < w.pellets; i++) {
      var ang = Math.random() * 2 * PI, rad = Math.sqrt(Math.random()) * sp * (w.pellets > 1 ? 1 : 1);
      vD.copy(dir).addScaledVector(vR, Math.cos(ang) * rad).addScaledVector(vU, Math.sin(ang) * rad).normalize();
      res = castShot(a, o, vD, w.range); vH.copy(o).addScaledVector(vD, res.t);
      if (i < 3) tracer(muzzle, vH);
      if (res.actor) { var dmg = w.dmg * (res.t > w.fall ? Math.max(.45, 1 - (res.t - w.fall) / w.range) : 1) * (res.head ? w.head : 1); if (hurt(res.actor, dmg, a, res.head, g.id)) { puff(vH, 0xc23b2a, .2, 1.3); if (a.isPlayer) G.stats.hits += 1 / w.pellets; } }
      else if (res.world) puff(vH, 0xd8d2c4, .2, 1);
    }
    a.bloom = Math.min(a.bloom + w.bloom, .04);
    if (a.isPlayer) { G.stats.shots++; a.pitch = clamp(a.pitch + w.recoil * rnd(.7, 1.2), -1.5, 1.5); a.yaw += w.recoil * rnd(-.35, .35); vmKick = 1; flash.visible = true; G.flashT = .045; sndShot(w.snd, 1); if (w.scope) a.ads = false; }
    else { puff(muzzle, 0xffc977, .06, 2.2); var dd = Math.hypot(a.pos.x - G.player.pos.x, a.pos.z - G.player.pos.z); sndShot(w.snd * .9, clamp(1 - dd / 60, 0, 1) * .55); }
    if (g.mag <= 0 && !a.isPlayer) reload(a);
    return true;
  }
  function throwNade(a, o, dir) {
    if (a.nade <= 0) return; a.nade--;
    var m = new T.Mesh(SV.merge(SV.GUN.grenade().g), SV.litMat); m.scale.setScalar(1.6); scene.add(m);
    G.nades.push({ pos: o.clone().addScaledVector(dir, .5), vel: dir.clone().multiplyScalar(15).add(new T.Vector3(0, 4, 0)), t: 2.6, by: a, m: m });
    if (a.isPlayer) sndTone(220, .08, .1, 'triangle');
  }
  function updNades(dt) {
    for (var i = G.nades.length - 1; i >= 0; i--) {
      var n = G.nades[i], px = n.pos.x, py = n.pos.y, pz = n.pos.z, k, b, hit = false; n.vel.y -= 18 * dt; n.pos.addScaledVector(n.vel, dt);
      if (n.pos.y < .06) { n.pos.y = .06; n.vel.y *= -.35; n.vel.x *= .6; n.vel.z *= .6; }
      for (k = 0; k < boxes.length; k++) { b = boxes[k]; if (n.pos.y > b.miny && n.pos.y < b.maxy && inBox(b, n.pos.x, n.pos.z, 0)) { hit = true; break; } }
      if (hit) { if (py >= b.maxy) { n.pos.y = b.maxy + .01; n.vel.y *= -.35; n.vel.x *= .6; n.vel.z *= .6; } else { n.pos.set(px, py, pz); if (b.rot) { n.vel.x *= -.45; n.vel.z *= -.45; } else { if (px <= b.minx || px >= b.maxx) n.vel.x *= -.45; if (pz <= b.minz || pz >= b.maxz) n.vel.z *= -.45; } } }
      n.m.position.copy(n.pos); n.m.rotation.x += dt * 8; n.t -= dt;
      if (n.t <= 0) {
        var bm = booms[i % booms.length]; bm.m.position.copy(n.pos); bm.m.visible = true; bm.life = .35; scene.remove(n.m); G.nades.splice(i, 1);
        var dp = Math.hypot(n.pos.x - G.player.pos.x, n.pos.z - G.player.pos.z); sndShot(.3, clamp(1.4 - dp / 40, 0, 1.2)); if (dp < 12) G.shake = .35;
        for (k = 0; k < G.actors.length; k++) { var e = G.actors[k]; if (!e.alive || (e.team === n.by.team && e !== n.by)) continue; eye(e, vH); vO.copy(n.pos); vO.y += .3; vD.subVectors(vH, vO); var d = vD.length(); if (d > 6) continue; vD.normalize(); if (rayWorld(vO, vD, d) < d - .3) continue; hurt(e, 150 * (1 - d / 6.5), n.by, false, 'grenade'); }
      }
    }
  }

  // ---------- view model ----------
  function setVm() {
    var p = G.player, id = p.guns[p.slot].id; if (vmCur) vmCur.visible = false;
    if (!vms[id + p.team]) { vms[id + p.team] = SV.viewModel(id, p.team); vms[id + p.team].rotation.y = PI / 2; vmRoot.add(vms[id + p.team]); }
    vmCur = vms[id + p.team]; vmCur.visible = true; vmSwap = .3; var mz = vmCur.userData.muzzle; flash.position.set(0, mz[1], -mz[0] - .04);
  }
  function updVm(dt, p) {
    var id = p.guns[p.slot].id, w = W[id], s = vmCur.userData.sight, ads = p.ads && !w.melee ? 1 : 0;
    vmAds += (ads - vmAds) * Math.min(1, dt * 14); vmKick = Math.max(0, vmKick - dt * 9); vmSwap = Math.max(0, vmSwap - dt);
    if (p.moving && p.ground) bobT += dt * 9;
    var bob = Math.sin(bobT) * .006 * (1 - vmAds), bx = Math.cos(bobT * .5) * .006 * (1 - vmAds), k = vmAds;
    var hx = id === 'knife' ? .2 : .17, hy = id === 'knife' ? -.14 : -.15, hz = id === 'pistol' || id === 'knife' ? -.42 : -.36;
    vmRoot.position.set(hx * (1 - k) + bx, (hy * (1 - k) + (-s) * k) + bob - vmSwap * .5, hz * (1 - k) + (-.26) * k + vmKick * .035);
    vmRoot.rotation.set(vmKick * (w.melee ? -.9 : .05) - vmSwap * 1.2, w.melee ? -.5 * vmKick : 0, 0);
    vmRoot.visible = !(w.scope && vmAds > .8);
    var fov = 62 + (w.fov - 62) * vmAds; if (Math.abs(cam.fov - fov) > .05) { cam.fov = fov; cam.updateProjectionMatrix(); }
    $('scope').hidden = !(w.scope && vmAds > .8);
  }

  // ---------- player ----------
  function updPlayer(dt, p) {
    var g = p.guns[p.slot], w = W[g.id];
    var sens = (p.ads && !w.melee ? cfg.adsSens * (w.scope ? .35 : 1) : cfg.sens) * .00011 * (G.assistSlow ? .55 : 1);
    p.yaw -= inp.lx * sens; p.yaw += inp.gy; p.pitch = clamp(p.pitch - inp.ly * sens + inp.gp, -1.45, 1.45); inp.lx = inp.ly = inp.gy = inp.gp = 0;
    if (inp.crouch) { p.crouch = !p.crouch; inp.crouch = false; }
    if (inp.slot >= 0) { if (inp.slot !== p.slot) { p.slot = inp.slot; p.ads = false; g.reload = 0; setVm(); } inp.slot = -1; g = p.guns[p.slot]; w = W[g.id]; }
    p.ads = inp.ads && !w.melee && g.reload <= 0;
    var mag = Math.min(1, Math.hypot(inp.mx, inp.mz)), sp = p.crouch ? 2.3 : p.ads ? 2.6 : mag > .92 ? 6 : 4.4; if (g.id === 'knife') sp *= 1.1;
    var s = Math.sin(p.yaw), c = Math.cos(p.yaw), vx = (inp.mx * c - inp.mz * s) * sp, vz = (-inp.mx * s - inp.mz * c) * sp;
    if (inp.jump) { if (p.ground) { p.vy = 6.6; p.crouch = false; } inp.jump = false; }
    p.moving = mag > .1; moveActor(p, vx, vz, dt);
    eye(p, vO); vD.set(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch));
    // aim assist: slow the view near a visible enemy, and optionally pull the trigger
    G.assistSlow = false; var onTarget = false;
    if (cfg.assist || cfg.autoFire) {
      for (var i = 0; i < G.actors.length; i++) { var e = G.actors[i]; if (!e.alive || e.team === p.team) continue; vH.set(e.pos.x, e.pos.y + 1.1, e.pos.z).sub(vO); var d = vH.length(); if (d > 60) continue; vH.multiplyScalar(1 / d); var dot = vH.dot(vD); if (dot > .9965 && rayWorld(vO, vH, d) >= d - .5) { G.assistSlow = cfg.assist; if (dot > .9995 || Math.acos(Math.min(1, dot)) * d < .45) onTarget = d < W[g.id].range * .7; } }
    }
    if (inp.reload) { reload(p); inp.reload = false; }
    if (inp.nade) { throwNade(p, vO, vD); inp.nade = false; }
    var want = inp.fire || (cfg.autoFire && onTarget && !w.melee);
    if (want && (w.auto || !G.fireHeld || (cfg.autoFire && onTarget && !inp.fire))) { vmCam.updateMatrixWorld(); vmRoot.updateMatrixWorld(); muzzleWorld(p, vM); fire(p, vO, vD, vM); }
    G.fireHeld = inp.fire;
    if (g.mag <= 0 && !w.melee && g.reload <= 0 && g.res > 0) reload(p);
  }
  function muzzleWorld(p, out) { out.set(.16, -.12, -.6).applyEuler(cam.rotation).add(cam.position); return out; }

  // ---------- bots ----------
  var HOT = null;
  function canSee(a, e) { eye(a, vO); vH.set(e.pos.x, e.pos.y + (e.crouch ? .8 : 1.2), e.pos.z).sub(vO); var d = vH.length(); if (d > 75) return 0; vH.multiplyScalar(1 / d); return rayWorld(vO, vH, d) >= d - .4 ? d : 0; }
  function think(a) {
    var ai = a.ai, best = null, bd = 1e9, i, e, d;
    for (i = 0; i < G.actors.length; i++) {
      e = G.actors[i]; if (!e.alive || e.team === a.team) continue;
      var dx = e.pos.x - a.pos.x, dz = e.pos.z - a.pos.z, dist = Math.hypot(dx, dz), facing = Math.abs(angd(Math.atan2(-dx, -dz), a.yaw)) < 1.75;
      if (!facing && dist > 7 && ai.hurtBy !== e && ai.tgt !== e) continue;
      d = canSee(a, e); if (d && d < bd) { bd = d; best = e; }
    }
    if (best !== ai.tgt) { ai.seen = 0; ai.tgt = best; }
    if (best) { ai.lastSeen = { x: best.pos.x, z: best.pos.z, l: lvl(best) }; ai.lastSeenT = 0; best.spot = 1.5; }
    // choose where to walk
    var want = null, pref = { rifle: 20, smg: 10, sniper: 38, shotgun: 5, pistol: 12, knife: 2 }[a.guns[a.slot].id];
    var ob = G.bomb ? objective(a) : null; ai.use = false; ai.look = ob && ob.look;
    if (ob && (!best || ob.force)) { if (ob.use) { ai.use = true; ai.path = []; ai.goal = null; } else if (Math.hypot(ob.x - a.pos.x, ob.z - a.pos.z) < 1.2 && (ob.l || 0) === lvl(a)) { ai.path = []; ai.goal = null; } else want = ob; }
    else if (best) { if (bd > pref || lvl(best) !== lvl(a) && bd > 6) want = { x: best.pos.x, z: best.pos.z, l: lvl(best) }; else { ai.path = []; ai.goal = null; } }
    else if (ai.lastSeenT < 6 && ai.lastSeen) want = ai.lastSeen;
    else if (!ai.goal || ai.path.length === 0 || ai.pathT > 9) { var h = Math.random() < .6 ? HOT[(Math.random() * HOT.length) | 0] : null; if (h) want = h; else { var c = nav.free[(Math.random() * nav.free.length) | 0]; want = { x: nav.ox + (c % nav.nx) + .5, z: nav.oz + ((c / nav.nx) | 0) + .5 }; } ai.goal = null; }
    if (want && (!ai.goal || Math.hypot(ai.goal.x - want.x, ai.goal.z - want.z) > 3 || ai.goal.l !== (want.l || 0) || ai.path.length === 0)) { ai.goal = { x: want.x, z: want.z, l: want.l || 0 }; ai.path = findPath(a.pos.x, a.pos.z, lvl(a), want.x, want.z, want.l || 0); ai.pathT = 0; }
    var g = a.guns[a.slot]; if (!best && g.reload <= 0 && g.mag < W[g.id].mag * .4) reload(a);
  }
  function updBot(dt, a) {
    var ai = a.ai, g = a.guns[a.slot], w = W[g.id], df = G.diff; ai.err = df.err;
    ai.holdT = (ai.holdT || 0) - dt; if (ai.holdT <= 0) { ai.holdT = rnd(4, 9); ai.holdI = (Math.random() * 120) | 0; }   // time to shift to another post
    ai.think -= dt; ai.pathT += dt; ai.lastSeenT += dt; if (ai.think <= 0) { ai.think = .16 + Math.random() * .08; think(a); }
    var vx = 0, vz = 0, sp = 4.1, tgt = ai.tgt, wantYaw = a.yaw, wantPitch = 0;
    if (tgt && !tgt.alive) { tgt = ai.tgt = null; }
    // follow the path
    var L = lvl(a); while (ai.path.length > 1 && !ai.path[0].jump && !ai.path[1].jump && ai.path[0].l === L && ai.path[1].l === L && lineFree(a.pos.x, a.pos.z, ai.path[1].x, ai.path[1].z, L)) ai.path.shift();
    if (ai.path.length) { var wp = ai.path[0], dx = wp.x - a.pos.x, dz = wp.z - a.pos.z, d = Math.hypot(dx, dz); if (d < .55 && (!wp.jump || Math.abs(a.pos.y - (wp.l ? nav.H : 0)) < .7)) ai.path.shift(); else if (wp.jump && d < .5) { vx = vz = 0; }   // right above or below the far end of a ladder: let go and let it carry us
      else { vx = dx / d * sp; vz = dz / d * sp; if (!tgt) wantYaw = Math.atan2(-dx, -dz); } }
    if (tgt) {
      ai.seen += dt; var tx = tgt.pos.x - a.pos.x, tz = tgt.pos.z - a.pos.z, td = Math.hypot(tx, tz), ty = tgt.pos.y + (tgt.crouch ? .85 : 1.25) - (a.pos.y + EYE);
      wantYaw = Math.atan2(-tx, -tz); wantPitch = Math.atan2(ty, td);
      if (!ai.path.length && !ai.use) { ai.strafeT -= dt; if (ai.strafeT <= 0) { ai.strafeT = rnd(.5, 1.5); ai.strafe = Math.random() < .5 ? -1 : Math.random() < .2 ? 0 : 1; } var s = Math.sin(wantYaw), c = Math.cos(wantYaw); vx = c * ai.strafe * 2.6; vz = -s * ai.strafe * 2.6; }
    }
    if (!tgt && !ai.path.length && ai.look) wantYaw = Math.atan2(a.pos.x - ai.look.x, a.pos.z - ai.look.z);
    var turn = df.turn * dt; a.yaw += clamp(angd(wantYaw, a.yaw), -turn, turn); a.pitch += clamp(wantPitch - a.pitch, -turn, turn);
    a.moving = (vx || vz) !== 0; moveActor(a, vx, vz, dt);
    // unstick
    ai.stuckT += dt; if (ai.stuckT > 1.2) { if (a.moving && Math.hypot(a.pos.x - ai.lastX, a.pos.z - ai.lastZ) + Math.abs(a.pos.y - (ai.lastY || 0)) < .35) { ai.path = []; ai.goal = null; ai.lastSeenT = 99; } ai.lastX = a.pos.x; ai.lastZ = a.pos.z; ai.lastY = a.pos.y; ai.stuckT = 0; }
    // shoot
    if (!G.match.practice && !ai.use && tgt && ai.seen > df.react && Math.abs(angd(wantYaw, a.yaw)) < .12 && g.reload <= 0) {
      ai.pause -= dt;
      if (ai.pause <= 0 && g.cool <= 0) {
        eye(a, vO); vD.set(-Math.sin(a.yaw) * Math.cos(a.pitch), Math.sin(a.pitch), -Math.cos(a.yaw) * Math.cos(a.pitch));
        vM.copy(a.model.muzzle).applyAxisAngle(T.Object3D.DefaultUp, a.yaw + PI).add(a.pos);
        a.ads = w.scope; if (fire(a, vO, vD, vM)) { if (w.auto) { if (ai.burst <= 0) ai.burst = (rnd(3, 7)) | 0; if (--ai.burst <= 0) ai.pause = rnd(.25, .65); } else ai.pause = rnd(.05, .3) + (w.scope ? .3 : 0); }
      }
    }
  }
  // ---------- bomb mission ----------
  // Rounds without respawn. The attacking side carries one bomb to site A or B and holds "use" for 3 s; it goes off 35 s later
  // unless a defender holds "use" on it for 5 s. G.score counts rounds won. Sides swap after four rounds.
  var POSTS = [[-2.2, -2.2], [2.2, 2.2], [-2.2, 2.2], [2.2, -2.2], [0, 3.2], [3.2, 0], [-5.5, .5], [5, -4.5], [1, 6], [-4, -5.5], [6.5, 3], [-1, -7]], PLANT = 3, DEFUSE = 5, FUSE = 40, ROUND = 150;
  var bombMesh = new T.Mesh(new T.BoxGeometry(.36, .16, .24), new T.MeshLambertMaterial({ color: 0x2a2e31 })), bombLed = new T.Mesh(new T.BoxGeometry(.09, .05, .09), new T.MeshBasicMaterial({ color: 0xff3b2a, fog: false }));
  bombLed.position.y = .1; bombMesh.add(bombLed); bombMesh.visible = false; scene.add(bombMesh);
  function snap(x, z, l) { var c = freeNear(cellOf(x, z, l)), cc = c % nav.N; return { x: nav.ox + (cc % nav.nx) + .5, z: nav.oz + ((cc / nav.nx) | 0) + .5, l: c >= nav.N ? 1 : 0, y: c >= nav.N ? nav.H : 0 }; }
  function near(a, s, r) { return Math.hypot(a.pos.x - s.x, a.pos.z - s.z) < r && Math.abs(a.pos.y - (s.y || 0)) < 1.2; }
  function aliveOf(team) { var n = 0, i; for (i = 0; i < G.actors.length; i++) if (G.actors[i].alive && G.actors[i].team === team) n++; return n; }
  function siteAt(pos) { var s = G.map.sites, i; for (i = 0; i < s.length; i++) if (Math.abs(pos.x - s[i].x) < 2.6 && Math.abs(pos.z - s[i].z) < 2.6 && Math.abs(pos.y - (s[i].y || 0)) < 1) return s[i]; return null; }
  // where a bot should be, and whether it should be holding "use" there
  function objective(a) {
    var B = G.bomb, atk = a.team === B.atk, off = POSTS[a.idx % POSTS.length], s, o, far = { x: G.map.spawns.B[2].x, z: 0 };
    if (B.phase !== 'live') return { x: a.pos.x, z: a.pos.z };
    if (B.planted) {
      s = B.planted; if (atk) return hold(a, s, 1.5, (G.map.fwd || []).concat([[far.x, far.z]]));
      return { x: s.x, z: s.z, l: s.l, use: near(a, s, 1.3), force: s.t < 14 || a.useP > 2.5 };
    }
    if (!atk) { var k = a.ai.holdI || 0, fw = G.map.fwd;
      if (a.ai.fwd && fw) { o = fw[(k + a.idx) % fw.length]; o = snap(o[0], o[1], o[2]); s = G.map.sites[k % 2].via; o.look = s ? { x: s[k % s.length][0], z: s[k % s.length][1] } : { x: G.map.spawns.A[2].x, z: 0 }; return o; }   // roams the forward spots
      s = G.map.sites[(a.idx + (k % 4 === 0 ? 1 : 0)) % 2]; return hold(a, s, 1, s.via || [[0, 0]]); }   // guards a site, now and then crossing to the other
    if (B.drop) return { x: B.drop.x, z: B.drop.z, l: B.drop.l, force: true };
    s = G.map.sites[B.plan];
    if (a.ai.via && !(B.carrier && B.carrier.isPlayer)) { if (Math.hypot(a.ai.via[0] - a.pos.x, a.ai.via[1] - a.pos.z) < 4 && (a.ai.via[2] || 0) === lvl(a)) a.ai.via = null; else return snap(a.ai.via[0], a.ai.via[1], a.ai.via[2]); }   // this round's route
    if (B.carrier === a) return { x: s.x, z: s.z, l: s.l, use: near(a, s, 1.4), force: a.useP > 1.5 };
    if (B.carrier && B.carrier.isPlayer) return snap(B.carrier.pos.x + off[0] * .9, B.carrier.pos.z + off[1] * .9, lvl(B.carrier));   // escort the player
    o = snap(s.x + off[0], s.z + off[1], s.l); o.look = far; return o;
  }
  // a place to stand near s, changing every few seconds, and something to watch from there that changes more often
  function hold(a, s, scale, looks) {
    var k = a.ai.holdI || 0, off = POSTS[(a.idx * 5 + k) % POSTS.length], o = snap(s.x + off[0] * scale, s.z + off[1] * scale, s.l), v = looks && looks.length ? looks[(k + a.idx + ((G.elapsed / 3.2) | 0)) % looks.length] : null;
    o.look = v ? { x: v[0], z: v[1] } : null; return o;
  }
  function roundEnd(winner, why) {
    var B = G.bomb; if (B.phase !== 'live') return; B.phase = 'post'; B.postT = 4; G.score[winner]++; B.round++; inp.use = false;
    var won = winner === G.player.team; showMsg((won ? '라운드 승리' : '라운드 패배') + ' · ' + why, 3.8); sndTone(won ? 880 : 220, .35, .15);
  }
  function newRound() {
    var B = G.bomb, at; if (B.round === 5 && !B.swapped) { B.swapped = true; B.atk = B.atk === 'A' ? 'B' : 'A'; }
    B.phase = 'live'; B.t = ROUND; B.planted = null; B.drop = null; B.can = null; B.plan = Math.random() < .5 ? 0 : 1; bombMesh.visible = false; G.killer = null;
    G.nades.forEach(function (n) { scene.remove(n.m); }); G.nades = [];
    G.actors.forEach(function (a) { a.alive = false; }); G.actors.forEach(spawn);
    at = G.actors.filter(function (a) { return a.team === B.atk; }); B.carrier = at[(Math.random() * at.length) | 0];
    // spread out: the attackers split over two of the routes to the chosen site, and every third defender pushes forward
    var vs = G.map.sites[B.plan].via || [], v1 = vs[(Math.random() * vs.length) | 0], v2 = vs[(Math.random() * vs.length) | 0], fw = G.map.fwd || [];
    G.actors.forEach(function (a) { a.ai.via = a.team === B.atk ? (a.idx % 2 ? v1 : v2) || null : null; a.ai.fwd = a.team !== B.atk && a.idx % 3 === 2 && fw.length ? fw[(Math.random() * fw.length) | 0] : null; });
    showMsg('라운드 ' + B.round + (B.swapped && B.round === 5 ? ' · 공수 교대' : '') + ' · ' + (G.player.team === B.atk ? (B.carrier === G.player ? '공격: 폭탄을 들었습니다' : '공격: 운반조를 엄호하세요') : '수비: 설치를 막으세요'), 3.2);
  }
  function updBomb(dt) {
    var B = G.bomb, def = B.atk === 'A' ? 'B' : 'A', i, a, s, kind, want, p = G.player;
    if (B.phase === 'post') { B.postT -= dt; if (B.postT <= 0) { if (G.score.A >= B.need || G.score.B >= B.need) endMatch(); else newRound(); } return; }
    for (i = 0; i < G.actors.length; i++) {
      a = G.actors[i]; if (!a.alive) { a.useP = 0; a.useAt = null; continue; }
      if (B.drop && a.team === B.atk && near(a, B.drop, 1.5)) { B.carrier = a; B.drop = null; if (a.isPlayer) showMsg('폭탄을 주웠습니다', 1.6); }
      if (B.carrier === a && a.ground && !nav.blk[cellOf(a.pos.x, a.pos.z, lvl(a))]) a.lastFree = { x: a.pos.x, z: a.pos.z, y: a.pos.y, l: lvl(a) };   // if the carrier dies the bomb lands where bots can walk
      kind = null; s = null;
      if (!B.planted) { if (B.carrier === a && (s = siteAt(a.pos))) kind = 'plant'; }
      else if (a.team === def && near(a, B.planted, 1.7)) kind = 'defuse';
      if (a.isPlayer) B.can = kind;
      want = a.isPlayer ? inp.use : a.ai.use;
      if (!kind || !want) { a.useP = 0; a.useAt = null; continue; }
      if (!a.useAt || Math.hypot(a.pos.x - a.useAt.x, a.pos.z - a.useAt.z) > .35) { a.useAt = { x: a.pos.x, z: a.pos.z }; a.useP = 0; }   // moving starts over
      a.useP += dt;
      if (kind === 'plant' && a.useP >= PLANT) { B.planted = { x: a.pos.x, z: a.pos.z, y: a.pos.y, l: lvl(a), site: s.id, t: FUSE, beep: 0 }; B.carrier = null; a.useP = 0; showMsg(s.id + ' 지점에 폭탄이 설치됐습니다', 2.6); sndTone(520, .25, .16, 'square'); }
      else if (kind === 'defuse' && a.useP >= DEFUSE) { bombMesh.visible = false; a.useP = 0; roundEnd(def, '폭탄 해제'); return; }
    }
    s = B.planted || B.drop; bombMesh.visible = !!s; if (s) bombMesh.position.set(s.x, (s.y || 0) + .08, s.z);
    var na = aliveOf(B.atk), nd = aliveOf(def);
    if (B.planted) {
      s = B.planted; s.t -= dt; s.beep -= dt; bombLed.visible = s.beep > .12 || s.beep < .06;
      if (s.beep <= 0) { s.beep = s.t > 10 ? 1 : s.t > 5 ? .5 : .22; sndTone(1250, .05, clamp(.2 - Math.hypot(s.x - p.pos.x, s.z - p.pos.z) / 220, .02, .2), 'square'); }
      if (s.t <= 0) {
        var bm = booms[0]; bm.m.position.set(s.x, 1, s.z); bm.m.visible = true; bm.life = .5; G.shake = .9; sndShot(.2, 1.4); bombMesh.visible = false;
        for (i = 0; i < G.actors.length; i++) { a = G.actors[i]; if (a.alive && Math.hypot(a.pos.x - s.x, a.pos.z - s.z) < 9) { a.prot = 0; hurt(a, 500, a, false, 'grenade'); } }
        roundEnd(B.atk, '폭탄 폭발'); return;
      }
      if (!nd) roundEnd(B.atk, '수비 팀 전멸');
    } else { bombLed.visible = true; B.t -= dt; if (!na) roundEnd(def, '공격 팀 전멸'); else if (!nd) roundEnd(B.atk, '수비 팀 전멸'); else if (B.t <= 0) roundEnd(def, '시간 종료'); }
    G.time = Math.max(0, B.planted ? B.planted.t : B.t);
  }
  function updModel(dt, a) {
    var m = a.model; if (!m) return;
    if (!a.alive) { if (a.dead > 0) { a.dead = Math.min(a.dead + dt * 3.2, 1); m.root.rotation.x = -a.dead * PI / 2; m.root.position.set(a.pos.x, a.pos.y + a.dead * .12, a.pos.z); if (a.respawn < 1.2) m.root.visible = false; } return; }
    m.root.position.copy(a.pos); m.root.rotation.set(0, a.yaw + PI, 0); m.root.scale.y = a.crouch ? .74 : 1;
    if (a.moving) a.walk += dt * 9; var sw = a.moving ? Math.sin(a.walk) * .6 : 0; m.legL.rotation.x = sw; m.legR.rotation.x = -sw;
  }

  // ---------- match ----------
  SV.start = function (match) {
    SV.end(); G.match = match; G.diff = DIFF[match.diff]; G.score = { A: 0, B: 0 }; G.killer = null; G.time = match.minutes * 60; G.feed = []; G.feedDirty = true; G.streak = 0; G.shake = 0; G.hitFlash = 0; G.marker = 0;
    G.stats = { shots: 0, hits: 0, kills: 0, deaths: 0, heads: 0, streak: 0, by: {} };
    var map = G.map = SV.buildMap(match.map); boxes = map.boxes; scene.add(map.group);
    scene.background = new T.Color(map.bg); scene.fog = new T.Fog(map.bg, map.fog[0], map.fog[1]);
    hemi.color.setHex(map.hemi[0]); hemi.groundColor.setHex(map.hemi[1]); hemi.intensity = map.hemi[2];
    sun.color.setHex(map.sun[0]); sun.intensity = map.sun[1]; sun.position.fromArray(map.sun[2]); sun.target.position.set(0, 0, 0);
    var r = Math.max(map.bounds.maxx, map.bounds.maxz) + 8, sc = sun.shadow.camera; sc.left = sc.bottom = -r; sc.right = sc.top = r; sc.near = 1; sc.far = 200; sc.updateProjectionMatrix();
    if (renderer) renderer.shadowMap.needsUpdate = true;
    if (map.rain) makeRain();
    buildNav(map); var b = map.bounds, cx = (b.minx + b.maxx) / 2, cz = (b.minz + b.maxz) / 2;
    HOT = [{ x: cx, z: cz }, { x: cx, z: b.minz + 4 }, { x: cx, z: b.maxz - 4 }, { x: b.minx + 8, z: cz }, { x: b.maxx - 8, z: cz }, { x: cx - 8, z: cz + 6 }, { x: cx + 8, z: cz - 6 }];
    G.actors = []; var other = match.team === 'A' ? 'B' : 'A', i, small = match.map === 1;
    function gun(n) { var id = BOTGUN[n % BOTGUN.length]; return small && id === 'sniper' ? 'smg' : id; }
    G.player = actor(match.team, '나', true, match.primary); G.actors.push(G.player);
    for (i = 0; i < match.perTeam - 1; i++) G.actors.push(actor(match.team, NAMES[match.team][i], false, gun(i + 1)));
    for (i = 0; i < (match.enemies || match.perTeam); i++) G.actors.push(actor(other, NAMES[other][i], false, gun(i)));
    var cnt = { A: 0, B: 0 }; G.actors.forEach(function (a) { a.idx = cnt[a.team]++; }); G.elapsed = 0; G.deadT = 0;
    G.bomb = match.mode === 1 && map.sites ? { atk: 'A', round: 1, need: 5, phase: 'live', swapped: false } : null;
    G.mini = null; G.state = 'play'; SV.resize(); if (G.bomb) newRound(); else G.actors.forEach(spawn); if (!G.bomb) showMsg(match.practice ? '연습장 · 봇은 쏘지 않습니다' : map.name + ' · 먼저 ' + match.target + '킬', 2.5);
  };
  SV.end = function () {
    if (G.map) { scene.remove(G.map.group); G.map.group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); G.map = null; }
    G.actors.forEach(function (a) { if (a.model) scene.remove(a.model.root); }); G.actors = [];
    G.nades.forEach(function (n) { scene.remove(n.m); }); G.nades = [];
    if (rain) { scene.remove(rain); rain.geometry.dispose(); rain = null; }
    for (var k in vms) { vmRoot.remove(vms[k]); } vms = {}; vmCur = null; G.state = 'menu'; G.bomb = null; bombMesh.visible = false;
  };
  function endMatch() {
    if (G.state !== 'play') return; G.state = 'over'; inp.fire = false;
    var p = G.player, mine = G.score[p.team], theirs = G.score[p.team === 'A' ? 'B' : 'A'];
    setTimeout(function () { SV.onEnd({ win: mine > theirs, draw: mine === theirs, score: G.score, team: p.team, stats: G.stats, used: G.bomb ? G.elapsed : (G.match.minutes * 60 - G.time), mode: G.bomb ? 1 : 0, map: G.map.name, weapon: W[G.match.primary].name, practice: !!G.match.practice }); }, 1200);
    showMsg(mine > theirs ? '승리' : mine === theirs ? '무승부' : '패배', 5);
  }

  // ---------- HUD ----------
  var last = {};
  function set(id, v) { if (last[id] !== v) { last[id] = v; $(id).textContent = v; } }
  function drawMini() {
    var cv = $('mini'), ctx = cv.getContext('2d'), b = G.map.bounds, w = cv.width, s = (w - 8) / Math.max(b.maxx - b.minx, b.maxz - b.minz), ox = (w - (b.maxx - b.minx) * s) / 2, oz = (w - (b.maxz - b.minz) * s) / 2, i, p = G.player;
    if (!G.mini) { G.mini = document.createElement('canvas'); G.mini.width = G.mini.height = w; var c = G.mini.getContext('2d'); c.fillStyle = 'rgba(232,228,218,.42)'; for (i = 0; i < boxes.length; i++) { var q = boxes[i]; if (q.maxy < 1 || q.miny > 1.6 || (q.miny > .05 && !q.soft && q.maxy < 3.5 && q.maxx - q.minx < 1.3 && q.maxz - q.minz < 1.3)) continue; if (q.rot) { c.save(); c.translate(ox + (q.ox - b.minx) * s, oz + (q.oz - b.minz) * s); c.rotate(Math.atan2(-q.s, q.c)); c.fillRect(q.minx * s, q.minz * s, (q.maxx - q.minx) * s, (q.maxz - q.minz) * s); c.restore(); }
      else c.fillRect(ox + (q.minx - b.minx) * s, oz + (q.minz - b.minz) * s, (q.maxx - q.minx) * s, (q.maxz - q.minz) * s); } }
    ctx.clearRect(0, 0, w, w); ctx.drawImage(G.mini, 0, 0);
    if (G.bomb) { ctx.fillStyle = '#e2562f'; ctx.font = '900 15px sans-serif'; ctx.textAlign = 'center'; G.map.sites.forEach(function (q) { ctx.fillText(q.id, ox + (q.x - b.minx) * s, oz + (q.z - b.minz) * s + 5); }); var bp = G.bomb.planted || G.bomb.drop; if (bp && (G.bomb.planted || p.team === G.bomb.atk)) { ctx.beginPath(); ctx.arc(ox + (bp.x - b.minx) * s, oz + (bp.z - b.minz) * s, 4, 0, 7); ctx.fill(); } }
    for (i = 0; i < G.actors.length; i++) { var a = G.actors[i]; if (!a.alive || a === p) continue; if (a.team !== p.team && a.spot <= 0) continue; ctx.fillStyle = a.team === 'A' ? '#ffb347' : '#6cc4e0'; var x = ox + (a.pos.x - b.minx) * s, z = oz + (a.pos.z - b.minz) * s; if (a.team === p.team) { ctx.beginPath(); ctx.arc(x, z, 3.2, 0, 7); ctx.fill(); } else ctx.fillRect(x - 3, z - 3, 6, 6); }
    var px = ox + (p.pos.x - b.minx) * s, pz = oz + (p.pos.z - b.minz) * s; ctx.save(); ctx.translate(px, pz); ctx.rotate(-p.yaw); ctx.fillStyle = '#e8e4da'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  var miniT = 0;
  function updHud(dt) {
    var p = G.player, g = p.guns[p.slot], w = W[g.id], other = p.team === 'A' ? 'B' : 'A';
    set('sc-a', G.score.A); set('sc-b', G.score.B); var t = Math.max(0, Math.ceil(G.time)); set('sc-t', ('0' + ((t / 60) | 0)).slice(-2) + ':' + ('0' + (t % 60)).slice(-2));
    set('hpn', Math.max(0, Math.ceil(p.hp))); var hw = clamp(p.hp, 0, 100) + '%'; if (last.hw !== hw) { last.hw = hw; $('hpf').style.width = hw; $('hpf').style.background = p.hp < 35 ? '#ff5a40' : '#e8e4da'; }
    set('am', w.melee ? '–' : g.reload > 0 ? '…' : g.mag); set('ar', w.melee ? '' : '/ ' + g.res);
    for (var i = 0; i < 3; i++) { var on = i === p.slot ? 'true' : 'false'; if (last['s' + i] !== on + p.guns[i].id) { last['s' + i] = on + p.guns[i].id; var e = $('slot' + i); e.setAttribute('aria-pressed', on); e.textContent = W[p.guns[i].id].short; } }
    set('nn', p.nade > 0 ? '투척' : '없음');
    var sp = Math.round(((p.ads ? w.ads : w.spread || 0) + p.bloom + (p.moving ? .012 : 0)) * 380 + 3); if (last.sp !== sp) { last.sp = sp; $('cross').style.setProperty('--g', sp + 'px'); }
    $('cross').hidden = !p.alive || (w.scope && vmAds > .8); var dotOnly = p.ads && !w.melee && !w.scope && vmAds > .6; if (last.dot !== dotOnly) { last.dot = dotOnly; $('cross').classList.toggle('dot', dotOnly); }
    G.marker = Math.max(0, G.marker - dt); var mk = $('hitm'); mk.hidden = G.marker <= 0; if (G.marker > 0) mk.style.borderColor = G.markerHead ? '#ff5a40' : '#e8e4da';
    G.hitFlash = Math.max(0, G.hitFlash - dt); $('dmg').style.opacity = Math.min(1, G.hitFlash * 2 + (p.alive && p.hp < 35 ? .25 : 0));
    if (G.feedDirty || G.feed.length) { var ch = false; G.feed.forEach(function (f) { f.t -= dt; }); while (G.feed.length && G.feed[G.feed.length - 1].t <= 0) { G.feed.pop(); ch = true; }
      if (G.feedDirty || ch) { G.feedDirty = false; var box = $('feed'); box.textContent = ''; G.feed.forEach(function (f) { var d = document.createElement('div'), a = document.createElement('b'), b2 = document.createElement('b'); a.textContent = f.k.name; a.className = 't' + f.k.team; b2.textContent = f.v.name; b2.className = 't' + f.v.team; d.appendChild(a); d.appendChild(document.createTextNode(f.head ? ' ◆ ' : ' ▸ ')); d.appendChild(b2); box.appendChild(d); }); } }
    if (msgT > 0) { msgT -= dt; if (msgT <= 0 && p.alive) $('msg').hidden = true; }
    if (!p.alive && G.state === 'play' && !(G.bomb && G.bomb.phase === 'post')) { $('msg').hidden = false; $('msg').textContent = (G.killer && G.killer !== p ? G.killer.name + '에게 당했습니다 · ' : '') + (G.bomb ? (G.specName ? G.specName + ' 관전 중 · 사격 버튼으로 전환' : '다음 라운드까지 관전') : Math.ceil(p.respawn) + '초 뒤 다시 투입'); msgT = .1; }
    var B = G.bomb, can = B && p.alive && B.phase === 'live' ? B.can : null, ot = '', ut = can === 'plant' ? '설치' : can === 'defuse' ? '해제' : '', up = can ? Math.round(p.useP / (can === 'plant' ? PLANT : DEFUSE) * 100) : 0, red = !!(B && B.planted);
    if (B) ot = B.planted ? (p.team === B.atk ? B.planted.site + ' 지점 설치 완료 · 폭탄을 지키세요' : B.planted.site + ' 지점에 폭탄 · 해제하세요') : p.team === B.atk ? (B.carrier === p ? '폭탄 소지 · A 또는 B에 설치' : B.drop ? '폭탄이 떨어져 있습니다 · 주우세요' : '공격 · ' + (B.carrier ? B.carrier.name + ' 이(가) 폭탄 운반 중' : '')) : '수비 · A, B 지점 방어';
    set('obj', ot); if (last.objh !== !B) { last.objh = !B; $('obj').hidden = !B; }
    if (last.use !== ut) { last.use = ut; $('b-use').hidden = !ut; $('use-t').textContent = ut; if (!ut) inp.use = false; }
    if (last.up !== up) { last.up = up; $('usef').style.width = up + '%'; }
    if (last.red !== red) { last.red = red; $('sc-t').style.color = red ? '#ff5a40' : ''; }
    miniT -= dt; if (miniT <= 0) { miniT = .12; drawMini(); }
  }
  SV.botGun = function (n, map) { var id = BOTGUN[n % BOTGUN.length]; return map === 1 && id === 'sniper' ? 'smg' : id; };
  // Side-on picture of a gun for the menus, drawn with the game renderer into a small off-screen target.
  var thumbs = {};
  SV.thumb = function (id) {
    if (thumbs[id] || !renderer) return thumbs[id] || '';
    var w = 320, h = 128, rt = new T.WebGLRenderTarget(w, h), sc = new T.Scene(), mesh = new T.Mesh(SV.merge(SV.GUN[id]().g), new T.MeshLambertMaterial({ color: 0xe8e4da }));
    var box = new T.Box3().setFromObject(mesh), c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3()), half = Math.max(sz.x / 2 * 1.08, sz.y / 2 * 1.08 * w / h);
    var oc = new T.OrthographicCamera(-half, half, half * h / w, -half * h / w, .01, 10); oc.position.set(c.x, c.y, 3); oc.lookAt(c);
    sc.add(mesh); sc.add(new T.HemisphereLight(0xffffff, 0x666666, .9)); var dl = new T.DirectionalLight(0xffffff, .5); dl.position.set(-1, 2, 3); sc.add(dl);
    var px = new Uint8Array(w * h * 4), old = renderer.getClearAlpha(); renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, oc); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); renderer.setRenderTarget(null); renderer.setClearColor(0x000000, old);
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var x = cv.getContext('2d'), im = x.createImageData(w, h), y;
    for (y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    x.putImageData(im, 0, 0); rt.dispose(); mesh.geometry.dispose(); return thumbs[id] = cv.toDataURL();
  };
  SV.board = function () { return G.actors.slice().sort(function (a, b) { return b.kills - a.kills || a.deaths - b.deaths; }); };

  // ---------- main loop ----------
  function step(dt) {
    var i, a, p = G.player; G.elapsed += dt;
    if (G.bomb) { updBomb(dt); if (G.state !== 'play') return; } else { G.time -= dt; if (G.time <= 0) { endMatch(); return; } }
    for (i = 0; i < G.actors.length; i++) {
      a = G.actors[i]; a.prot = Math.max(0, a.prot - dt); a.spot = Math.max(0, a.spot - dt); a.bloom = Math.max(0, a.bloom - dt * .05);
      if (!a.alive) { if (!G.bomb) { a.respawn -= dt; if (a.respawn <= 0) spawn(a); } continue; }
      for (var k = 0; k < 3; k++) { var g = a.guns[k]; if (g.cool > 0) g.cool -= dt; if (k === a.slot && g.reload > 0) { g.reload -= dt; if (g.reload <= 0) { var n = Math.min(W[g.id].mag - g.mag, g.res); g.mag += n; g.res -= n; } } }
      if (a.isPlayer) updPlayer(dt, a); else updBot(dt, a);
    }
    for (i = 0; i < G.actors.length; i++) updModel(dt, G.actors[i]);
    updNades(dt);
    if (p.alive) { G.deadT = 0; G.specName = ''; cam.position.set(p.pos.x, p.pos.y + (p.crouch ? EYEC : EYE), p.pos.z); cam.rotation.set(p.pitch, p.yaw, 0); }
    else if (G.bomb && (G.deadT += dt) > 1.6 && (a = watch(p))) { if (inp.fire && !G.specHeld) G.specI = (G.specI || 0) + 1; G.specHeld = inp.fire; a = watch(p); G.specName = a.team === p.team ? a.name : ''; cam.position.set(a.pos.x + Math.sin(a.yaw) * 2.4, a.pos.y + 2.3, a.pos.z + Math.cos(a.yaw) * 2.4); cam.rotation.set(-.24, a.yaw, 0); }   // no respawn: follow a teammate
    else { cam.rotation.x += (-.5 - cam.rotation.x) * dt * 2; cam.position.y = Math.max(.5, cam.position.y - dt * 1.2); }
    if (G.shake > 0) { G.shake -= dt; cam.position.x += rnd(-1, 1) * G.shake * .12; cam.position.y += rnd(-1, 1) * G.shake * .12; }
    if (G.flashT > 0) { G.flashT -= dt; if (G.flashT <= 0) flash.visible = false; }
  }
  // who the dead player's camera follows: living teammates in turn (the fire button steps to the next), else anyone alive
  function watch(p) { var i, a, mates = [], any = null; for (i = 0; i < G.actors.length; i++) { a = G.actors[i]; if (!a.alive) continue; if (a.team === p.team) mates.push(a); any = any || a; } return mates.length ? mates[(G.specI || 0) % mates.length] : any; }
  var prev = 0;
  function frame(t) {
    requestAnimationFrame(frame); var dt = Math.min(.05, (t - prev) / 1000 || 0); prev = t;
    if (!renderer || G.state === 'menu') return;
    if (G.state === 'play') { step(dt); if (G.state !== 'menu' && G.player) { updVm(dt, G.player); updHud(dt); } }
    updFx(dt); updRain(dt);
    renderer.clear(); renderer.render(scene, cam);
    if (G.player && G.player.alive && vmCur) { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
  }
  requestAnimationFrame(frame);
  // headless test hook: advance the simulation without waiting for frames
  SV.sim = function (sec) { var n = Math.round(sec * 30); for (var i = 0; i < n && G.state === 'play'; i++) step(1 / 30); return { score: G.score, time: G.time, state: G.state, bomb: G.bomb && { round: G.bomb.round, atk: G.bomb.atk, phase: G.bomb.phase, planted: G.bomb.planted && G.bomb.planted.site, t: G.bomb.planted && +G.bomb.planted.t.toFixed(1), carrier: G.bomb.carrier && G.bomb.carrier.name, can: G.bomb.can }, pos: G.actors.map(function (a) { return [a.name, +a.pos.x.toFixed(1), +a.pos.z.toFixed(1), a.kills, a.deaths]; }) }; };
})();
