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
  var canvas = $('cv'), renderer = null, scene = new T.Scene(), cam = new T.PerspectiveCamera(62, 2, .08, 400), vmScene = new T.Scene(), vmCam = new T.PerspectiveCamera(50, 2, .01, 10);
  cam.rotation.order = 'YXZ';
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { SV.fatal = '이 기기에서는 3D 화면을 열 수 없습니다.'; }
  if (renderer) { renderer.autoClear = false; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; }
  var hemi = new T.HemisphereLight(0xffffff, 0x222222, .6), sun = new T.DirectionalLight(0xffffff, .6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0008;
  scene.add(hemi); scene.add(sun); scene.add(sun.target);
  vmScene.add(new T.HemisphereLight(0xdfe6ea, 0x3a342b, 1)); var vmSun = new T.DirectionalLight(0xfff1dc, .5); vmSun.position.set(1, 2, 1); vmScene.add(vmSun);
  var vmFill = new T.DirectionalLight(0xe8eef4, .9); vmFill.position.set(-.7, 1.1, 1.4); vmScene.add(vmFill);   // from over the shooter's left shoulder, so the side of the gun you see is never a black shape
  var vmRoot = new T.Group(); vmScene.add(vmRoot); var vmLamp = new T.PointLight(0xffffff, 0, 0, 1); vmLamp.position.set(.5, 1.2, -.2); vmScene.add(vmLamp);
  function paint(n, fn) { var c = document.createElement('canvas'); c.width = c.height = n; fn(c.getContext('2d'), n); var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }
  var TX = {
    star: paint(128, function (x, n) { var g = x.createRadialGradient(64, 64, 0, 64, 64, 46), i; g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,225,150,.95)'); g.addColorStop(.6, 'rgba(255,140,40,.4)'); g.addColorStop(1, 'rgba(255,90,0,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n);
      x.translate(64, 64); for (i = 0; i < 7; i++) { x.rotate(.6 + Math.random() * .9); var l = 34 + Math.random() * 28, w = 5 + Math.random() * 6, q = x.createLinearGradient(0, 0, l, 0); q.addColorStop(0, 'rgba(255,240,200,.95)'); q.addColorStop(1, 'rgba(255,120,20,0)'); x.fillStyle = q; x.beginPath(); x.moveTo(0, -w); x.lineTo(l, 0); x.lineTo(0, w); x.fill(); } }),
    flame: paint(128, function (x, n) { var g = x.createRadialGradient(40, 64, 0, 40, 64, 62); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(.3, 'rgba(255,205,110,.85)'); g.addColorStop(.7, 'rgba(255,110,25,.3)'); g.addColorStop(1, 'rgba(255,60,0,0)'); x.save(); x.translate(0, 64); x.scale(1, .42); x.translate(0, -64); x.fillStyle = g; x.fillRect(0, 0, n, n); x.restore(); }),
    soft: paint(64, function (x, n) { var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); }),
    hole: paint(64, function (x, n) { var g = x.createRadialGradient(32, 32, 0, 32, 32, 30), i; g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.28, 'rgba(8,8,8,.95)'); g.addColorStop(.45, 'rgba(40,36,32,.55)'); g.addColorStop(1, 'rgba(30,28,26,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); x.strokeStyle = 'rgba(15,15,15,.6)'; x.lineWidth = 1; for (i = 0; i < 7; i++) { var a = Math.random() * 6.28, r = 12 + Math.random() * 16; x.beginPath(); x.moveTo(32 + Math.cos(a) * 7, 32 + Math.sin(a) * 7); x.lineTo(32 + Math.cos(a + .2) * r, 32 + Math.sin(a + .2) * r); x.stroke(); } })
  };
  var FIRE = new T.Color(3.6, 2.5, 1.2), FLSIZE = { rifle: 1, smg: .8, sniper: 1.6, shotgun: 1.7, pistol: .7 };
  var flash = new T.Group(); flash.visible = false; vmRoot.add(flash);
  (function () {
    var ms = new T.MeshBasicMaterial({ map: TX.star, color: FIRE, transparent: true, blending: T.AdditiveBlending, depthTest: false, depthWrite: false }), mf = new T.MeshBasicMaterial({ map: TX.flame, color: FIRE, transparent: true, blending: T.AdditiveBlending, depthTest: false, depthWrite: false, side: T.DoubleSide });
    flash.add(new T.Mesh(new T.PlaneGeometry(.2, .2), ms));
    var g1 = new T.PlaneGeometry(.3, .13); g1.rotateY(PI / 2); g1.translate(0, 0, -.11); flash.add(new T.Mesh(g1, mf)); var g2 = new T.PlaneGeometry(.3, .13); g2.rotateX(-PI / 2); g2.rotateY(PI / 2); g2.translate(0, 0, -.11); flash.add(new T.Mesh(g2, mf));
  })();
  var mzLight = new T.PointLight(0xffb060, 0, 10, 1.4), vmFlash = new T.PointLight(0xffb060, 0, 0, 1); scene.add(mzLight); vmFlash.position.set(.25, .1, -.9); vmScene.add(vmFlash);
  var vms = {}, vmCur = null, vmKick = 0, vmAds = 0, vmSwap = 0, bobT = 0;

  // ---------- post-processing ----------
  // With "high quality" on, the scene is drawn in linear HDR into an off-screen target; bright parts are blurred into a bloom,
  // then one pass adds the bloom, maps HDR to the display (ACES fit), grades and vignettes, and a last pass smooths edges and
  // adds a little grain. Without it (or where the GPU cannot render to float targets) the scene goes straight to the screen.
  var post = null, usePost = false, envRT = null;
  (function () {
    if (!renderer || !renderer.capabilities.isWebGL2 || !(renderer.extensions.get('EXT_color_buffer_float') || renderer.extensions.get('EXT_color_buffer_half_float'))) return;
    function rt(type, depth) { return new T.WebGLRenderTarget(4, 4, { type: type, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: !!depth, stencilBuffer: false }); }
    function pass(fs, uni) { return new T.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: 'varying vec2 vUv;\n' + fs, uniforms: uni, depthTest: false, depthWrite: false }); }
    var H = T.HalfFloatType, B = T.UnsignedByteType;
    post = { scene: rt(H, true), a1: rt(H), b1: rt(H), a2: rt(H), b2: rt(H), ldr: rt(B), cam: new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad: new T.Mesh(new T.PlaneGeometry(2, 2)), sc: new T.Scene(), t: 0,
      pre: pass('uniform sampler2D t; uniform vec2 px;\nvoid main(){ vec3 c = (texture2D(t, vUv + px * vec2(-1., -1.)).rgb + texture2D(t, vUv + px * vec2(1., -1.)).rgb + texture2D(t, vUv + px * vec2(-1., 1.)).rgb + texture2D(t, vUv + px).rgb) * .25;\n  float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(min(c * smoothstep(.85, 1.7, l), vec3(10.)), 1.); }', { t: { value: null }, px: { value: new T.Vector2() } }),
      blur: pass('uniform sampler2D t; uniform vec2 d;\nvoid main(){ vec3 c = texture2D(t, vUv).rgb * .227; c += (texture2D(t, vUv + d * 1.385).rgb + texture2D(t, vUv - d * 1.385).rgb) * .316; c += (texture2D(t, vUv + d * 3.231).rgb + texture2D(t, vUv - d * 3.231).rgb) * .0705; gl_FragColor = vec4(c, 1.); }', { t: { value: null }, d: { value: new T.Vector2() } }),
      comp: pass('uniform sampler2D tS, tB1, tB2; uniform float uBloom, uExp, uVig;\nvoid main(){ vec3 c = texture2D(tS, vUv).rgb; c += (texture2D(tB1, vUv).rgb * .55 + texture2D(tB2, vUv).rgb * .45) * uBloom; c *= uExp;\n  c = clamp((c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14), 0., 1.);\n  float l = dot(c, vec3(.2126, .7152, .0722)); c *= mix(vec3(.93, 1., 1.08), vec3(1.06, 1., .93), smoothstep(.04, .6, l)); c = mix(c, c * c * (3. - 2. * c), .2);\n  vec2 q = vUv - .5; c *= 1. - uVig * smoothstep(.2, .95, dot(q, q) * 2.2);\n  c = pow(c, vec3(1. / 2.2)); gl_FragColor = vec4(c, dot(c, vec3(.299, .587, .114))); }', { tS: { value: null }, tB1: { value: null }, tB2: { value: null }, uBloom: { value: .5 }, uExp: { value: 1 }, uVig: { value: .42 } }),
      fin: pass('uniform sampler2D t; uniform vec2 px; uniform float uT;\nvoid main(){ vec4 M = texture2D(t, vUv); float n = texture2D(t, vUv + vec2(0., px.y)).a, s = texture2D(t, vUv - vec2(0., px.y)).a, e = texture2D(t, vUv + vec2(px.x, 0.)).a, w = texture2D(t, vUv - vec2(px.x, 0.)).a;\n  float mx = max(M.a, max(max(n, s), max(e, w))), mn = min(M.a, min(min(n, s), min(e, w))); vec3 c = M.rgb;\n  if (mx - mn > max(.05, mx * .14)) { vec2 g = vec2(e - w, n - s), dir = normalize(vec2(-g.y, g.x) + 1e-5) * px; c = mix(c, (texture2D(t, vUv + dir * .75).rgb + texture2D(t, vUv - dir * .75).rgb) * .5, .6); }\n  c += (fract(sin(dot(vUv * 913. + uT, vec2(12.9898, 78.233))) * 43758.5453) - .5) * .022; gl_FragColor = vec4(c, 1.); }', { t: { value: null }, px: { value: new T.Vector2() }, uT: { value: 0 } }) };
    post.sc.add(post.quad); post.quad.frustumCulled = false;
  })();
  function run(mat, target) { post.quad.material = mat; renderer.setRenderTarget(target); renderer.render(post.sc, post.cam); }
  function drawFrame() {
    var vm = G.player && G.player.alive && vmCur;
    if (!usePost) { renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, cam); if (vm) { renderer.clearDepth(); renderer.render(vmScene, vmCam); } return; }
    var p = post, w = p.scene.width, h = p.scene.height;
    renderer.setRenderTarget(p.scene); renderer.clear(); renderer.render(scene, cam); if (vm) { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
    p.pre.uniforms.t.value = p.scene.texture; p.pre.uniforms.px.value.set(1 / w, 1 / h); run(p.pre, p.a1);
    p.blur.uniforms.t.value = p.a1.texture; p.blur.uniforms.d.value.set(1 / p.a1.width, 0); run(p.blur, p.b1); p.blur.uniforms.t.value = p.b1.texture; p.blur.uniforms.d.value.set(0, 1 / p.a1.height); run(p.blur, p.a1);
    p.blur.uniforms.t.value = p.a1.texture; p.blur.uniforms.d.value.set(1 / p.a2.width, 0); run(p.blur, p.b2); p.blur.uniforms.t.value = p.b2.texture; p.blur.uniforms.d.value.set(0, 1 / p.a2.height); run(p.blur, p.a2);
    p.comp.uniforms.tS.value = p.scene.texture; p.comp.uniforms.tB1.value = p.a1.texture; p.comp.uniforms.tB2.value = p.a2.texture; p.comp.uniforms.uExp.value = (G.map && G.map.exp) || 1; run(p.comp, p.ldr);
    p.fin.uniforms.t.value = p.ldr.texture; p.fin.uniforms.px.value.set(1 / w, 1 / h); p.fin.uniforms.uT.value = (p.t = (p.t + .37) % 97); run(p.fin, null);
  }
  // the sky as a blurred environment map, so metal and wet ground have something to reflect
  function setEnv(top, horizon, ground) {
    if (!renderer) return; var sc = new T.Scene(), g = new T.SphereGeometry(50, 16, 10), ps = g.attributes.position, c = [], a = new T.Color(top).convertSRGBToLinear(), h = new T.Color(horizon).convertSRGBToLinear(), gr = new T.Color(ground).convertSRGBToLinear(), i, t, q = new T.Color();
    for (i = 0; i < ps.count; i++) { t = ps.getY(i) / 50; if (t >= 0) q.copy(h).lerp(a, Math.pow(t, .6)); else q.copy(h).lerp(gr, Math.min(1, -t * 4)); c.push(q.r, q.g, q.b); }
    g.setAttribute('color', new T.Float32BufferAttribute(c, 3)); sc.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    var pm = new T.PMREMGenerator(renderer), old = envRT; envRT = pm.fromScene(sc, .04); pm.dispose(); g.dispose(); scene.environment = vmScene.environment = envRT.texture; if (old) old.dispose();
  }

  // A photographed sky (HDRI): one dome that is both what you see overhead and what lights and reflects in the scene.
  // The picture is turned so its brightest point sits where the map's sun is, and the fog takes the colour of its horizon.
  var skyMesh = null, skyMat = null;
  function h2f(h) { var e = (h >> 10) & 31, m = h & 1023; return e === 0 ? m / 1024 * 6.1e-5 : e === 31 ? 65504 : (1 + m / 1024) * Math.pow(2, e - 15); }
  function skyInfo(tx) {
    if (tx._info) return tx._info; var d = tx.image.data, w = tx.image.width, h = tx.image.height, n = d.length / (w * h), best = -1, bu = 0, x, y, i, l, hz = [0, 0, 0], c = 0, f = d instanceof Uint16Array ? h2f : function (v) { return v; };
    for (y = 0; y < h; y += 2) for (x = 0; x < w; x += 2) { i = (y * w + x) * n; l = f(d[i]) + f(d[i + 1]) + f(d[i + 2]); if (l > best) { best = l; bu = x / w; } }
    // the data runs top-down, so the horizon band is the rows just above the middle
    for (y = Math.floor(h * .44); y < Math.floor(h * .5); y++) for (x = 0; x < w; x += 4) { i = (y * w + x) * n; hz[0] += Math.min(f(d[i]), 4); hz[1] += Math.min(f(d[i + 1]), 4); hz[2] += Math.min(f(d[i + 2]), 4); c++; }
    // average brightness of the upper sky, so every photo can be brought to the exposure its map asks for
    var av = 0, ca = 0; for (y = 0; y < Math.floor(h * .45); y += 4) for (x = 0; x < w; x += 4) { i = (y * w + x) * n; av += Math.min(.2126 * f(d[i]) + .7152 * f(d[i + 1]) + .0722 * f(d[i + 2]), 8); ca++; }
    return tx._info = { u: bu, hz: [hz[0] / c, hz[1] / c, hz[2] / c], av: Math.max(av / ca, 1e-4) };
  }
  function setSky(map) {
    if (skyMesh) { if (skyMesh.parent) skyMesh.parent.remove(skyMesh); skyMesh = null; }
    var cfgS = map.hdri, tx = cfgS && SV.assets && SV.assets.hdr && SV.assets.hdr[cfgS[0]]; if (!tx || !renderer) return false;
    if (!skyMat) skyMat = new T.ShaderMaterial({ uniforms: { t: { value: null }, gain: { value: 1 }, cap: { value: 50 } }, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 d; void main(){ d = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform sampler2D t; uniform float gain, cap; varying vec3 d; void main(){ vec3 n = normalize(d); vec2 uv = vec2(atan(n.z, n.x) * .15915494 + .5, asin(clamp(n.y, -1., 1.)) * .31830989 + .5); gl_FragColor = vec4(min(texture2D(t, uv).rgb * gain, vec3(cap)), 1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}' });
    var inf = skyInfo(tx), sd = map.sun[2], rot = Math.atan2(sd[2], sd[0]) - (inf.u - .5) * 2 * PI, geo = new T.SphereGeometry(300, 32, 16);
    // light: a dimmer, capped copy so the sun disc does not sparkle in every reflection
    var sc = new T.Scene(), em = skyMat.clone(); em.uniforms.t.value = tx; em.uniforms.gain.value = cfgS[2] / inf.av; em.uniforms.cap.value = cfgS[3] || 12; em.toneMapped = false;
    var m2 = new T.Mesh(geo, em); m2.rotation.y = -rot; sc.add(m2);
    var pm = new T.PMREMGenerator(renderer), old = envRT, tm = renderer.toneMapping, oe = renderer.outputEncoding; renderer.toneMapping = T.NoToneMapping; renderer.outputEncoding = T.LinearEncoding;
    envRT = pm.fromScene(sc, 0); pm.dispose(); em.dispose(); renderer.toneMapping = tm; renderer.outputEncoding = oe; scene.environment = vmScene.environment = envRT.texture; if (old) old.dispose();
    if (map.indoor) { geo.dispose(); return true; }
    skyMat.uniforms.t.value = tx; skyMat.uniforms.gain.value = cfgS[1] / inf.av; skyMat.uniforms.cap.value = 60; skyMat.needsUpdate = true;
    skyMesh = new T.Mesh(geo, skyMat); skyMesh.rotation.y = -rot; skyMesh.frustumCulled = false; skyMesh.renderOrder = -10; map.group.add(skyMesh);
    map.group.children.forEach(function (o) { if (o.userData.sky) o.visible = false; });
    scene.background = new T.Color(inf.hz[0], inf.hz[1], inf.hz[2]).multiplyScalar(cfgS[1] / inf.av); scene.fog.color.copy(scene.background);
    return true;
  }

  SV.resize = function () {
    if (!renderer) return; var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    var want = !!(post && cfg.quality);
    if (want !== usePost || !SV.resize.done) {   // the two paths encode colour differently, so every material's shader is rebuilt on a switch
      SV.resize.done = true; usePost = want; renderer.toneMapping = want ? T.NoToneMapping : T.ACESFilmicToneMapping; renderer.outputEncoding = want ? T.LinearEncoding : T.sRGBEncoding;
      [scene, vmScene].forEach(function (s) { s.traverse(function (o) { if (o.material) o.material.needsUpdate = true; }); });
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.quality ? (post ? 1.6 : 2) : 1.25)); renderer.setSize(w, h, false);
    if (usePost) { var dw = renderer.domElement.width, dh = renderer.domElement.height; post.scene.setSize(dw, dh); post.ldr.setSize(dw, dh); post.a1.setSize(dw >> 2, dh >> 2); post.b1.setSize(dw >> 2, dh >> 2); post.a2.setSize(dw >> 3, dh >> 3); post.b2.setSize(dw >> 3, dh >> 3); }
    cam.aspect = vmCam.aspect = w / h; cam.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  };

  // ---------- effects ----------
  var tracers = [], booms = [], fx = new T.Group(), parts = [], decals = [], shells = [], di = 0, si = 0; scene.add(fx);
  (function () {
    var i, m;
    for (i = 0; i < 28; i++) { m = new T.Line(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)), new T.LineBasicMaterial({ color: new T.Color(2.4, 1.8, 1), transparent: true, opacity: .8 })); m.visible = false; m.frustumCulled = false; fx.add(m); tracers.push({ m: m, life: 0 }); }
    var sg = new T.IcosahedronGeometry(1, 1);
    for (i = 0; i < 4; i++) { m = new T.Mesh(sg, new T.MeshBasicMaterial({ color: new T.Color(4, 2.2, .8), transparent: true, opacity: .8 })); m.visible = false; fx.add(m); booms.push({ m: m, life: 0 }); }
    // sprites: each has its own material, so colour and opacity are per particle
    for (i = 0; i < 64; i++) { m = new T.Sprite(new T.SpriteMaterial({ map: TX.soft, transparent: true, depthWrite: false, fog: false })); m.visible = false; fx.add(m); parts.push({ m: m, life: 0, max: 1, v: new T.Vector3(), g: 0, s0: 1, s1: 1, a: 1 }); }
    var dg = new T.PlaneGeometry(.11, .11), dm = new T.MeshBasicMaterial({ map: TX.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    for (i = 0; i < 48; i++) { m = new T.Mesh(dg, dm); m.visible = false; fx.add(m); decals.push(m); }
    var cg = new T.CylinderGeometry(.0055, .0055, .024, 6), cm = new T.MeshStandardMaterial({ color: 0xc9a14a, roughness: .3, metalness: .9 });
    for (i = 0; i < 12; i++) { m = new T.Mesh(cg, cm); m.visible = false; fx.add(m); shells.push({ m: m, life: 0, v: new T.Vector3(), floor: 0, hit: false }); }
  })();
  var ti = 0, pi2 = 0;
  function tracer(a, b) { var t = tracers[ti = (ti + 1) % tracers.length], p = t.m.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; t.m.visible = true; t.life = .05; }
  // one particle: texture, colour (may be brighter than white), additive or not, life, start and end size, opacity, velocity, gravity
  function part(tex, col, add, pos, life, s0, s1, alpha, vx, vy, vz, grav) {
    var q = parts[pi2 = (pi2 + 1) % parts.length], mt = q.m.material; mt.map = tex; mt.color.copy(col); mt.blending = add ? T.AdditiveBlending : T.NormalBlending; mt.rotation = Math.random() * 6.28;
    q.m.position.copy(pos); q.life = q.max = life; q.s0 = s0; q.s1 = s1; q.a = alpha; q.v.set(vx || 0, vy || 0, vz || 0); q.g = grav || 0; q.m.scale.setScalar(s0); mt.opacity = alpha; q.m.visible = true;
  }
  var cSmoke = new T.Color(.5, .5, .5), cDust = new T.Color(.62, .58, .5), cBlood = new T.Color(.32, .02, .02), cSpark = new T.Color(4, 2.6, 1), vP = new T.Vector3(), vQ = new T.Vector3();
  function puff(p, color, life, size) { part(TX.soft, color === 0xc23b2a ? cBlood : cDust, false, p, life + .15, .08 * size, .4 * size, .5, 0, .3, 0, 0); }
  // a bullet striking the world: a hole on the surface, a puff of dust thrown back along the normal, a few sparks
  function impact(p, n) {
    var d = decals[di = (di + 1) % decals.length], i; d.position.copy(p).addScaledVector(n, .012); d.lookAt(vP.copy(d.position).add(n)); d.rotation.z = Math.random() * 6.28; d.scale.setScalar(.7 + Math.random() * .7); d.visible = true;
    part(TX.soft, cDust, false, p, .45, .07, .5, .45, n.x * .9, n.y * .9 + .25, n.z * .9, 0);
    for (i = 0; i < 3; i++) if (Math.random() < .6) part(TX.soft, cSpark, true, p, .16 + Math.random() * .14, .035, .012, 1, n.x * 3 + rnd(-2, 2), n.y * 3 + rnd(0, 2.5), n.z * 3 + rnd(-2, 2), 9);
  }
  function muzzleFx(p, dir, size, mine) {
    if (!mine) part(TX.star, FIRE, true, p, .055, .45 * size, .7 * size, 1, 0, 0, 0, 0);
    part(TX.soft, cSmoke, false, vP.copy(p).addScaledVector(dir, .12), .55 + Math.random() * .3, .07 * size, .55 * size, .2, dir.x * 1.1, .35, dir.z * 1.1, 0);
    mzLight.position.copy(p).addScaledVector(dir, .3); mzLight.intensity = 3.2 * size; if (mine) vmFlash.intensity = 2.6 * size;
  }
  function shell(p, vx, vy, vz, floor) { var q = shells[si = (si + 1) % shells.length]; q.m.position.copy(p); q.v.set(vx, vy, vz); q.life = 1.3; q.floor = floor + .008; q.hit = false; q.m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); q.m.visible = true; }
  function updFx(dt) {
    var i, o, k;
    for (i = 0; i < tracers.length; i++) { o = tracers[i]; if (o.life > 0) { o.life -= dt; if (o.life <= 0) o.m.visible = false; } }
    for (i = 0; i < parts.length; i++) { o = parts[i]; if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.m.visible = false; continue; } k = 1 - o.life / o.max; o.v.y -= o.g * dt; o.m.position.addScaledVector(o.v, dt); o.m.scale.setScalar(o.s0 + (o.s1 - o.s0) * k); o.m.material.opacity = o.a * (1 - k * k); }
    for (i = 0; i < shells.length; i++) { o = shells[i]; if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.m.visible = false; continue; } o.v.y -= 9.8 * dt; o.m.position.addScaledVector(o.v, dt); o.m.rotation.x += dt * 14; o.m.rotation.z += dt * 9;
      if (o.m.position.y < o.floor) { o.m.position.y = o.floor; o.v.y *= -.35; o.v.x *= .5; o.v.z *= .5; o.hit = true; } }
    for (i = 0; i < booms.length; i++) { o = booms[i]; if (o.life > 0) { o.life -= dt; k = 1 - o.life / .35; o.m.scale.setScalar(.6 + k * 5); o.m.material.opacity = .85 * (1 - k); if (o.life <= 0) o.m.visible = false; } }
    mzLight.intensity *= Math.exp(-dt * 34); vmFlash.intensity *= Math.exp(-dt * 34);
  }

  // ---------- rain ----------
  var rain = null;
  function makeRain() {
    var n = 500, p = new Float32Array(n * 6), i; for (i = 0; i < n; i++) { var x = rnd(-14, 14), y = rnd(0, 14), z = rnd(-14, 14); p.set([x, y, z, x + .05, y - .5, z], i * 6); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3));
    rain = new T.LineSegments(g, new T.LineBasicMaterial({ color: new T.Color(0x8fa3b3).convertSRGBToLinear(), transparent: true, opacity: .32 })); rain.frustumCulled = false; scene.add(rain);
  }
  function updRain(dt) {
    if (!rain) return; var p = rain.geometry.attributes.position.array, i;
    for (i = 0; i < p.length; i += 6) { p[i + 1] -= dt * 22; p[i + 4] -= dt * 22; if (p[i + 4] < 0) { p[i + 1] += 14; p[i + 4] += 14; } }
    rain.geometry.attributes.position.needsUpdate = true; rain.position.set(cam.position.x, 0, cam.position.z);
  }

  // ---------- collision ----------
  var boxes = [];
  var rbAx = -1, rbSg = 1, hitNrm = new T.Vector3(0, 1, 0);   // which face the last rayBox entered through; rayWorld turns it into a world normal
  function rayBox(ox, oy, oz, dx, dy, dz, b) {
    var t0 = 0, t1 = 1e9, a, c, inv, s, ax = -1;
    if (Math.abs(dx) < 1e-9) { if (ox < b.minx || ox > b.maxx) return -1; } else { inv = 1 / dx; a = (b.minx - ox) * inv; c = (b.maxx - ox) * inv; if (a > c) { s = a; a = c; c = s; } if (a > t0) { t0 = a; ax = 0; } if (c < t1) t1 = c; if (t0 > t1) return -1; }
    if (Math.abs(dy) < 1e-9) { if (oy < b.miny || oy > b.maxy) return -1; } else { inv = 1 / dy; a = (b.miny - oy) * inv; c = (b.maxy - oy) * inv; if (a > c) { s = a; a = c; c = s; } if (a > t0) { t0 = a; ax = 1; } if (c < t1) t1 = c; if (t0 > t1) return -1; }
    if (Math.abs(dz) < 1e-9) { if (oz < b.minz || oz > b.maxz) return -1; } else { inv = 1 / dz; a = (b.minz - oz) * inv; c = (b.maxz - oz) * inv; if (a > c) { s = a; a = c; c = s; } if (a > t0) { t0 = a; ax = 2; } if (c < t1) t1 = c; if (t0 > t1) return -1; }
    rbAx = ax; rbSg = ax === 0 ? (dx > 0 ? -1 : 1) : ax === 1 ? (dy > 0 ? -1 : 1) : (dz > 0 ? -1 : 1); return t0;
  }
  function rayWorld(o, d, max) {
    var best = max, i, t, b, ex, ez, hb = null, hax = 1, hsg = 1; if (d.y < -1e-6) { t = -o.y / d.y; if (t >= 0 && t < best) best = t; }
    for (i = 0; i < boxes.length; i++) { b = boxes[i]; if (b.soft) continue;
      if (b.rot) { ex = o.x - b.ox; ez = o.z - b.oz; t = rayBox(ex * b.c - ez * b.s, o.y, ex * b.s + ez * b.c, d.x * b.c - d.z * b.s, d.y, d.x * b.s + d.z * b.c, b); } else t = rayBox(o.x, o.y, o.z, d.x, d.y, d.z, b);
      if (t >= 0 && t < best) { best = t; hb = b; hax = rbAx; hsg = rbSg; } }
    if (!hb || hax < 0) hitNrm.set(0, 1, 0); else if (hax === 1) hitNrm.set(0, hsg, 0); else { ex = hax === 0 ? hsg : 0; ez = hax === 2 ? hsg : 0; if (hb.rot) hitNrm.set(ex * hb.c + ez * hb.s, 0, -ex * hb.s + ez * hb.c); else hitNrm.set(ex, 0, ez); }
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
    var vd = G.map && G.map.voids; if (vd && a.alive && a.pos.y < G.map.H - 2.6) for (i = 0; i < vd.length; i++) if (a.pos.x > vd[i][0] && a.pos.x < vd[i][2] && a.pos.z > vd[i][1] && a.pos.z < vd[i][3]) { a.prot = 0; hurt(a, 999, a); break; }   // fell into the gorge
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
    (map.voids || []).forEach(function (v) { for (var x = Math.floor(v[0] - bd.minx); x < Math.ceil(v[2] - bd.minx); x++) for (var z = Math.floor(v[1] - bd.minz); z < Math.ceil(v[3] - bd.minz); z++) if (x >= 0 && z >= 0 && x < nx && z < nz) blk[z * nx + x] = 1; });   // pits: nobody walks on their floor
    for (i = 0; i < (map.roamAll ? blk.length : N); i++) if (!blk[i]) nav.free.push(i);
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
  // Every sound is synthesised. A gunshot is three layers started together: a bright crack (high-passed noise, a few tens of
  // milliseconds), the body of the report (low-passed noise whose filter closes as it decays) and a low thump (a sine falling in
  // pitch). The sum is saturated, compressed, and part of it sent through a reverb made from a decaying noise burst. Distance
  // delays the sound, dulls it, and leaves more of the echo than the shot.
  var ac = null, noise = null, master = null, verb = null, irOut = null, irIn = null, hard = null;
  var SND = { rifle: { b: 2600, t: [150, 48], len: .19, crk: .9, tail: .5, g: 1 }, smg: { b: 3400, t: [210, 80], len: .13, crk: .8, tail: .32, g: .8 }, sniper: { b: 1700, t: [105, 32], len: .36, crk: 1.1, tail: 1, g: 1.3 },
    shotgun: { b: 1300, t: [120, 36], len: .3, crk: .7, tail: .8, g: 1.25 }, pistol: { b: 3000, t: [190, 70], len: .12, crk: .85, tail: .38, g: .85 }, boom: { b: 700, t: [80, 24], len: .75, crk: .4, tail: 1.3, g: 1.6 } };
  function impulse(len, decay, slap) {
    var n = (ac.sampleRate * len) | 0, buf = ac.createBuffer(2, n, ac.sampleRate), ch, i;
    for (ch = 0; ch < 2; ch++) { var d = buf.getChannelData(ch), lp = 0; for (i = 0; i < n; i++) { var t = i / ac.sampleRate, k = Math.min(.9, .15 + t / len * .8); lp += ((Math.random() * 2 - 1) - lp) * (1 - k); d[i] = lp * Math.exp(-t * decay) * (1 + (slap && Math.abs(t - slap) < .012 ? 2.2 : 0)); } }
    return buf;
  }
  SV.audio = function () {
    if (ac || !cfg.sound) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)(); var n = ac.sampleRate * .6, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0), i; for (i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; noise = buf;
      var sh = ac.createWaveShaper(), cv2 = new Float32Array(257), comp = ac.createDynamicsCompressor(), vg = ac.createGain(); for (i = 0; i < 257; i++) cv2[i] = Math.tanh((i / 128 - 1) * 1.8); sh.curve = cv2; hard = new Float32Array(257); for (i = 0; i < 257; i++) hard[i] = Math.tanh((i / 128 - 1) * 4) * .85;
      comp.threshold.value = -20; comp.ratio.value = 9; comp.attack.value = .001; comp.release.value = .14;
      master = ac.createGain(); master.gain.value = .9; master.connect(sh); sh.connect(comp); comp.connect(ac.destination);
      irOut = impulse(1.5, 3.1, .17); irIn = impulse(.8, 5.5, .05); verb = ac.createConvolver(); verb.buffer = G.map && G.map.indoor ? irIn : irOut; vg.gain.value = .5; verb.connect(vg); vg.connect(comp); renderShots();
    } catch (e) { ac = null; }
  };
  function env(t, peak, dur, cx) { var g = (cx || ac).createGain(); g.gain.setValueAtTime(Math.max(peak, .0002), t); g.gain.exponentialRampToValueAtTime(.0002, t + dur); return g; }
  function nsrc(t, dur, rate, cx) { var s = (cx || ac).createBufferSource(); s.buffer = noise; s.loop = true; s.playbackRate.value = rate || 1; s.start(t, Math.random() * .5); s.stop(t + dur + .02); return s; }
  // One shot costs about twenty audio nodes to synthesise. Eight rifles firing would mean hundreds of live nodes, which a phone
  // cannot keep up with: the output crackles and then drops out. So each weapon's report is rendered once into a buffer (a
  // close and a distant version); firing then plays that buffer through a filter and a gain, and the number of voices is capped.
  var shotBuf = {}, voices = 0, lastBot = 0;
  function shotGraph(cx, P, near, dest) {
    var t = .005, k = P.g, drive = cx.createWaveShaper(); drive.curve = hard; drive.connect(dest);
    var c = nsrc(t, .01, 1, cx), gc = env(t, 2.2 * k * (.35 + near * .65), .004 + P.len * .01, cx); c.connect(gc); gc.connect(drive);                                  // snap
    var a = nsrc(t, .1, 1, cx), hp = cx.createBiquadFilter(), ga = env(t, P.crk * k * 1.1, .03 + P.len * .1, cx); hp.type = 'highpass'; hp.frequency.value = 2200; a.connect(hp); hp.connect(ga); ga.connect(drive);   // crack
    [[P.b * .28, 1.6, 1.5], [P.b * .1, 1.2, 1.7]].forEach(function (q) { var bb = nsrc(t, P.len, .8, cx), bp = cx.createBiquadFilter(), gb = env(t, k * q[2], P.len * .75, cx); bp.type = 'bandpass'; bp.frequency.setValueAtTime(q[0], t); bp.frequency.exponentialRampToValueAtTime(q[0] * .55, t + P.len); bp.Q.value = q[1]; bb.connect(bp); bp.connect(gb); gb.connect(drive); });   // body
    var o = cx.createOscillator(), go = env(t, k * 1.6, P.len * .7, cx); o.frequency.setValueAtTime(P.t[0], t); o.frequency.exponentialRampToValueAtTime(P.t[1], t + P.len * .5); o.connect(go); go.connect(drive); o.start(t); o.stop(t + P.len + .05);   // thump
    var r = nsrc(t, P.len * 3.5, .5, cx), lr = cx.createBiquadFilter(), gr = env(t + .01, k * .32, P.len * 3.5, cx); lr.type = 'lowpass'; lr.frequency.value = 900; r.connect(lr); lr.connect(gr); gr.connect(dest);   // roll-off
  }
  function renderShots() {
    var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OC || !ac) return;
    Object.keys(SND).forEach(function (id) { [1, 0].forEach(function (near) {
      try { var P = SND[id], cx = new OC(1, Math.ceil(ac.sampleRate * (P.len * 3.6 + .08)), ac.sampleRate); shotGraph(cx, P, near, cx.destination); var done = function (buf) { shotBuf[id + near] = buf; }, pr = cx.startRendering(); if (pr && pr.then) pr.then(done); else cx.oncomplete = function (e) { done(e.renderedBuffer); }; } catch (e) { }
    }); });
  }
  function gunSnd(id, vol, dist) {
    if (!ac || !cfg.sound || vol < .04) return; dist = dist || 0;
    var own = dist === 0, now = ac.currentTime, buf = shotBuf[id + (dist < 18 ? 1 : 0)]; if (!buf) return;
    if (!own) { if (voices >= 7 || (now - lastBot < .045 && vol < .5)) return; lastBot = now; }   // other people's shots give way first
    else if (voices >= 10) return;
    var P = SND[id], t = now + Math.min(.3, dist / 340), src = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain(), send = ac.createGain();
    src.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 16000 / (1 + dist / 8); g.gain.value = vol / Math.sqrt(1 + voices * .35); send.gain.value = P.tail * (.35 + Math.min(1, dist / 40) * .6);
    src.connect(lp); lp.connect(g); g.connect(master); g.connect(send); send.connect(verb);
    voices++; src.onended = function () { voices--; try { send.disconnect(); g.disconnect(); lp.disconnect(); } catch (e) { } }; src.start(t);
  }
  // small mechanical noises: a filtered click (bolt, magazine), a metallic ping (spent case), a dull thud (footstep)
  function tick(delay, freq, vol, q) { if (!ac || !cfg.sound) return; var t = ac.currentTime + delay, s = nsrc(t, .05), f = ac.createBiquadFilter(), g = env(t, vol, .035); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 3; s.connect(f); f.connect(g); g.connect(master); }
  function ping(freq, vol) { if (!ac || !cfg.sound) return; var t = ac.currentTime, o = ac.createOscillator(), g = env(t, vol, .09); o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(master); o.start(t); o.stop(t + .1); }
  function thud(vol) { if (!ac || !cfg.sound) return; var t = ac.currentTime, s = nsrc(t, .08, .5), f = ac.createBiquadFilter(), g = env(t, vol, .07); f.type = 'lowpass'; f.frequency.value = 260; s.connect(f); f.connect(g); g.connect(master); }
  function sndShot(rate, vol) {   // the knife's swish
    if (!ac || !cfg.sound || vol < .02) return; var t = ac.currentTime, s = nsrc(t, .2, rate), f = ac.createBiquadFilter(), g = env(t, .4 * vol, .16); f.type = 'bandpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(3800, t + .12); f.Q.value = 1.2; s.connect(f); f.connect(g); g.connect(master);
  }
  function sndTone(freq, dur, vol, type) {
    if (!ac || !cfg.sound) return; var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(master || ac.destination); o.start(t); o.stop(t + dur);
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
    a.pos.set(best.x, best.y || 0, best.z); a.vy = 0; a.yaw = side === 'A' ? -PI / 2 : PI / 2; a.pitch = 0; a.useP = 0; a.useAt = null; a.lastFree = null; a.hp = 100; a.alive = true; a.prot = 1.6; a.crouch = false; a.slot = 0; a.nade = 1; a.bloom = 0; a.dead = 0;
    if (a.isPlayer) a.primary = G.match.primary; a.guns = guns(a.primary, !a.isPlayer);
    a.ai.tgt = null; a.ai.path = []; a.ai.goal = null; a.ai.seen = 0; a.ai.hurtBy = null; a.ai.lastSeenT = 99;
    if (a.model) { a.model.root.visible = true; a.model.root.rotation.set(0, 0, 0); a.model.root.scale.set(1, 1, 1); a.kneel = 0; }
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
  function reload(a) { var g = a.guns[a.slot], w = W[g.id]; if (w.melee || g.reload > 0 || g.mag >= w.mag || g.res <= 0) return; g.reload = w.reload; a.ads = false; if (a.isPlayer) { vmSwap = .25; tick(.12, 1800, .22); tick(w.reload * .55, 900, .3, 2); tick(w.reload * .84, 2600, .22); tick(w.reload * .9, 1500, .22); } }
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
      else if (res.world) impact(vH, hitNrm);
    }
    a.bloom = Math.min(a.bloom + w.bloom, .04);
    if (a.isPlayer) { G.stats.shots++; a.pitch = clamp(a.pitch + w.recoil * rnd(.7, 1.2), -1.5, 1.5); a.yaw += w.recoil * rnd(-.35, .35); vmKick = 1; flash.visible = true; G.flashT = .05; flash.rotation.z = Math.random() * 6.28; flash.scale.setScalar((FLSIZE[g.id] || 1) * rnd(.8, 1.25)); muzzleFx(muzzle, dir, FLSIZE[g.id] || 1, true);
      gunSnd(g.id, 1, 0); tick(.035, 3400, .12); if (g.id === 'sniper') { tick(.45, 2200, .2); tick(.62, 1500, .24, 2); tick(.8, 2600, .2); } else if (g.id === 'shotgun') { tick(.3, 1200, .28, 2); tick(.44, 1700, .26, 2); }
      vP.copy(o).addScaledVector(dir, .35).addScaledVector(vR, -.14); vP.y -= .08; shell(vP, -vR.x * 2 + dir.x * .4 + rnd(-.3, .3), 1.6 + rnd(0, .6), -vR.z * 2 + dir.z * .4 + rnd(-.3, .3), a.pos.y);   // spent case, thrown to the right
      if (w.scope) a.ads = false; }
    else { var dd = Math.hypot(a.pos.x - cam.position.x, a.pos.z - cam.position.z); if (dd < 70) muzzleFx(muzzle, dir, FLSIZE[g.id] || 1, false); gunSnd(g.id, clamp(1 - dd / 95, 0, 1) * .8, dd); }
    if (g.mag <= 0 && !a.isPlayer) reload(a);
    return true;
  }
  function throwNade(a, o, dir) {
    if (a.nade <= 0) return; a.nade--;
    var ns = SV.scanOf('grenade'), m = ns || new T.Mesh(SV.merge(SV.GUN.grenade().g), SV.litMat); m.scale.setScalar(ns ? 1 : 1.6); scene.add(m);
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
        var dp = Math.hypot(n.pos.x - G.player.pos.x, n.pos.z - G.player.pos.z); gunSnd('boom', clamp(1.4 - dp / 40, 0, 1.2), dp); if (dp < 12) G.shake = .35; for (k = 0; k < 6; k++) part(TX.soft, k < 2 ? cSpark : cSmoke, k < 2, n.pos, k < 2 ? .25 : 1.1, k < 2 ? 1.2 : .6, k < 2 ? 3 : 3.2, k < 2 ? 1 : .35, rnd(-1.5, 1.5), rnd(.5, 2.4), rnd(-1.5, 1.5), 0); mzLight.position.copy(n.pos); mzLight.intensity = 9;
        for (k = 0; k < G.actors.length; k++) { var e = G.actors[k]; if (!e.alive || (e.team === n.by.team && e !== n.by)) continue; eye(e, vH); vO.copy(n.pos); vO.y += .3; vD.subVectors(vH, vO); var d = vD.length(); if (d > 6) continue; vD.normalize(); if (rayWorld(vO, vD, d) < d - .3) continue; hurt(e, 150 * (1 - d / 6.5), n.by, false, 'grenade'); }
      }
    }
  }

  // ---------- view model ----------
  function setVm() {
    var p = G.player, id = p.guns[p.slot].id; if (vmCur) vmCur.visible = false;
    if (!vms[id + p.team]) { vms[id + p.team] = SV.viewModel(id, p.team); if (!vms[id + p.team].userData.art) vms[id + p.team].rotation.y = PI / 2; vmRoot.add(vms[id + p.team]); }
    vmCur = vms[id + p.team]; vmCur.visible = true; vmSwap = .3; var mz = vmCur.userData.muzzle; flash.position.set(0, mz[1], -mz[0] - .04);
  }
  function updVm(dt, p) {
    var id = p.guns[p.slot].id, w = W[id], s = vmCur.userData.sight, ads = p.ads && !w.melee ? 1 : 0;
    vmAds += (ads - vmAds) * Math.min(1, dt * 14); vmKick = Math.max(0, vmKick - dt * 9); vmSwap = Math.max(0, vmSwap - dt);
    if (p.moving && p.ground) bobT += dt * 9;
    var bob = Math.sin(bobT) * .006 * (1 - vmAds), bx = Math.cos(bobT * .5) * .006 * (1 - vmAds), k = vmAds;
    var art = vmCur.userData.art;
    if (art) {   // a picture: pinned to the lower right of the screen; aiming slides its optic window onto the crosshair
      var hh = Math.tan(vmCam.fov * PI / 360), hw = hh * vmCam.aspect, sc = 1 + vmKick * .035, hs = 2 * hh * art.h / art.frame * sc, ws = hs * art.w / art.h;
      // One picture cannot be turned to look straight down the sights, so aiming lowers the gun out of the way and the view
      // zooms on the dot instead (a picture drawn looking down the sights can replace this later).
      var cx0 = hw + .03 - ws / 2, cy0 = -hh - .04 + hs / 2, cx1 = cx0 - hw * .1, cy1 = cy0 - hs * .45;
      var cx = cx0 * (1 - k) + cx1 * k + bx * 2.5 + vmKick * .012, cy = cy0 * (1 - k) + cy1 * k + bob * 2.5 - vmKick * .014 * (1 - k) - vmSwap * 1.6;
      if (w.melee) { cx -= vmKick * .34; cy -= vmKick * .05; }   // a knife sweeps across instead of kicking back
      vmRoot.rotation.set(0, 0, w.melee ? vmKick * .7 : 0); vmRoot.position.set(cx, cy, -1); vmCur.scale.set(ws, hs, 1); vmRoot.visible = !(w.scope && vmAds > .8);
      flash.position.set((art.muzzle[0] / art.w - .5) * ws, (.5 - art.muzzle[1] / art.h) * hs, .02); flash.scale.setScalar(1.3);
      var mp = G.map, tone = mp && mp.hdri ? ({ night: .75, dusk: 1.15, day: 1.9, indoor: 1.25 })[mp.hdri[0]] : 1.2; vmCur.children[0].material.color.setScalar(tone * art.gain);
    } else {
    flash.scale.setScalar(1);
    var ps = SV.vmPose(id), h = 1 - k, gp = vmCur.userData.grip, az = id === 'pistol' ? -.36 : -Math.max(.26, .24 - (gp ? gp[0] : 0));   // hip pose from the table; aiming brings the sights onto the view axis
    vmRoot.rotation.order = 'YXZ';
    vmRoot.position.set(ps[0] * h + bx, (ps[1] * h + (-s) * k) + bob - vmSwap * .5, ps[2] * h + az * k + vmKick * .035);
    vmRoot.rotation.set(ps[3] * h + vmKick * (w.melee ? -.9 : .05) - vmSwap * 1.2, ps[4] * h + (w.melee ? -.5 * vmKick : 0), ps[5] * h);
    vmRoot.visible = !(w.scope && vmAds > .8);
    }
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
    if (p.moving && p.ground) { G.stepT = (G.stepT || 0) - dt * sp / 4.4; if (G.stepT <= 0) { G.stepT = .36; thud(p.crouch ? .05 : .11); } }
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
    if (ob && (!best || ob.force || (G.bomb.carrier === a && bd > 11))) { /* the carrier keeps walking the bomb in unless the enemy is close */ if (ob.use) { ai.use = true; ai.path = []; ai.goal = null; } else if (Math.hypot(ob.x - a.pos.x, ob.z - a.pos.z) < 1.2 && (ob.l || 0) === lvl(a)) { ai.path = []; ai.goal = null; } else want = ob; }
    else if (best) { if (bd > pref || lvl(best) !== lvl(a) && bd > 6) want = { x: best.pos.x, z: best.pos.z, l: lvl(best) }; else { ai.path = []; ai.goal = null; } }
    else if (ai.lastSeenT < 6 && ai.lastSeen) want = ai.lastSeen;
    else if (!ai.goal || ai.path.length === 0 || ai.pathT > 9) { var h = Math.random() < .6 ? HOT[(Math.random() * HOT.length) | 0] : null; if (h) want = h; else { var c = nav.free[(Math.random() * nav.free.length) | 0]; var c2 = c % nav.N; want = { x: nav.ox + (c2 % nav.nx) + .5, z: nav.oz + ((c2 / nav.nx) | 0) + .5, l: c >= nav.N ? 1 : 0 }; } ai.goal = null; }
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
    a.crouch = !!(ai.use || (G.bomb && !tgt && !ai.path.length && ai.look && (ai.holdI + a.idx) % 3 === 0));
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
  // a site is either a 5 m square round its centre or, when the map gives zones, any of several rectangles in the site's own turned frame
  function siteAt(pos) {
    var ss = G.map.sites, i, j, s, z;
    for (i = 0; i < ss.length; i++) {
      s = ss[i]; if (Math.abs(pos.y - (s.y || 0)) > 1.2) continue;
      if (!s.zones) { if (Math.abs(pos.x - s.x) < 2.6 && Math.abs(pos.z - s.z) < 2.6) return s; continue; }
      var dx = pos.x - s.f[0], dz = pos.z - s.f[1], c = Math.cos(s.f[2]), sn = Math.sin(s.f[2]), lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      for (j = 0; j < s.zones.length; j++) { z = s.zones[j]; if (lx > z[0] && lx < z[2] && lz > z[1] && lz < z[3]) return s; }
    }
    return null;
  }
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
    if (B.carrier === a) { var sp = B.spot || s; return { x: sp.x, z: sp.z, l: sp.l, use: near(a, sp, 1.4) && !!siteAt(a.pos), force: a.useP > 1.5 }; }
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
    B.phase = 'live'; B.t = ROUND; B.planted = null; B.drop = null; B.can = null; B.plan = Math.random() < .5 ? 0 : 1; var sps = G.map.sites[B.plan].spots; B.spot = sps ? sps[(Math.random() * sps.length) | 0] : null;   // this round's place to plant
    bombMesh.visible = false; G.killer = null;
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
        var bm = booms[0]; bm.m.position.set(s.x, 1, s.z); bm.m.visible = true; bm.life = .5; G.shake = .9; gunSnd('boom', 1.4, Math.hypot(s.x - p.pos.x, s.z - p.pos.z)); bombMesh.visible = false;
        for (i = 0; i < G.actors.length; i++) { a = G.actors[i]; if (a.alive && Math.hypot(a.pos.x - s.x, a.pos.z - s.z) < 9) { a.prot = 0; hurt(a, 500, a, false, 'grenade'); } }
        roundEnd(B.atk, '폭탄 폭발'); return;
      }
      if (!nd) roundEnd(B.atk, '수비 팀 전멸');
    } else { bombLed.visible = true; B.t -= dt; if (!na) roundEnd(def, '공격 팀 전멸'); else if (!nd) roundEnd(B.atk, '수비 팀 전멸'); else if (B.t <= 0) roundEnd(def, '시간 종료'); }
    G.time = Math.max(0, B.planted ? B.planted.t : B.t);
  }
  // ---------- lamps ----------
  // A fixed set of point lights (so shaders never change) follows whichever of the map's lamps are nearest the camera.
  var LAMPS = [], lampT = 0, lampNear = [];
  (function () { for (var i = 0; i < 8; i++) LAMPS.push({ l: new T.PointLight(0xffffff, 0, 16, 1.5), src: null, k: 0 }); })();
  function updLamps(dt) {
    var src = G.map && G.map.lights, i, p, j, best = 0; if (!src || !src.length || !LAMPS[0].l.parent) return;
    if ((lampT -= dt) <= 0) { lampT = .25; var cx = cam.position.x, cy = cam.position.y, cz = cam.position.z; lampNear = src.slice().sort(function (a, b) { return Math.hypot(a.x - cx, a.y - cy, a.z - cz) - Math.hypot(b.x - cx, b.y - cy, b.z - cz); }).slice(0, LAMPS.length); }
    for (i = 0; i < LAMPS.length; i++) {
      p = LAMPS[i];
      if (p.src && lampNear.indexOf(p.src) >= 0) p.k = Math.min(1, p.k + dt * 3);
      else { p.k -= dt * 3; if (p.k <= 0) { p.k = 0; p.src = null; for (j = 0; j < lampNear.length; j++) if (!LAMPS.some(function (q) { return q.src === lampNear[j]; })) { p.src = lampNear[j]; p.l.position.set(p.src.x, p.src.y, p.src.z); p.l.color.copy(p.src.c); p.l.distance = p.src.d; break; } } }
      p.l.intensity = p.src ? p.src.i * p.k : 0;
      if (p.src) { var dd = Math.hypot(p.src.x - cam.position.x, p.src.y - cam.position.y, p.src.z - cam.position.z), at = Math.max(0, 1 - dd / p.src.d) * p.k; if (at > best) { best = at; vmLamp.color.copy(p.src.c); } }
    }
    vmLamp.intensity += (best * 2.2 - vmLamp.intensity) * Math.min(1, dt * 6);   // the gun in your hands picks up the nearest lamp too
  }
  function updModel(dt, a) {
    var m = a.model; if (!m) return;
    if (!a.alive) { if (a.dead > 0) { if (m.skinned && a.dead < .01) { m.acts.Run.setEffectiveWeight(0); m.acts.Idle.setEffectiveWeight(1); } a.dead = Math.min(a.dead + dt * 3.2, 1); m.shadow.visible = false; m.root.rotation.x = -a.dead * PI / 2; m.root.position.set(a.pos.x, a.pos.y + a.dead * .12, a.pos.z); if (a.respawn < 1.2) m.root.visible = false; } return; }
    m.root.position.copy(a.pos); m.root.rotation.set(0, a.yaw + PI, 0); m.shadow.visible = true;
    if (m.skinned) {   // the downloaded model: blend idle and run by how fast it is going, sink to a knee, then lay the arms on the weapon
      a.kneel = (a.kneel || 0) + ((a.crouch ? 1 : 0) - (a.kneel || 0)) * Math.min(1, dt * 9); a.gait = (a.gait || 0) + ((a.moving ? 1 : 0) - (a.gait || 0)) * Math.min(1, dt * 7);
      var gt = a.gait * (1 - a.kneel * .6); m.acts.Idle.setEffectiveWeight(1 - gt); m.acts.Run.setEffectiveWeight(gt); m.acts.Run.setEffectiveTimeScale(1.05); m.mixer.update(dt);
      var bn = m.bones, kn = a.kneel; if (kn > .01) { bn.Hips.position.y -= 42 * kn; bn.LeftUpLeg.rotateX(-1.25 * kn); bn.LeftLeg.rotateX(1.5 * kn); bn.RightUpLeg.rotateX(-.25 * kn); bn.RightLeg.rotateX(1.9 * kn); bn.Spine.rotateX(.15 * kn); }
      m.gun.position.y = (bn.Spine2.getWorldPosition(vP).y - a.pos.y - 1.3) * .8 - kn * .02; m.gun.position.z = 0; SV.poseArms(m); return;
    }
    // legs: thighs swing from the hip, the trailing knee bends; kneeling folds both and lowers the body
    a.kneel = (a.kneel || 0) + ((a.crouch ? 1 : 0) - (a.kneel || 0)) * Math.min(1, dt * 9); a.gait = (a.gait || 0) + ((a.moving ? 1 : 0) - (a.gait || 0)) * Math.min(1, dt * 8);
    if (a.moving) a.walk += dt * 9.5; var w = a.walk, k = a.kneel, g = a.gait * (1 - k * .5), drop = k * .34;
    m.legL.rotation.x = -Math.sin(w) * .62 * g - k * 1.25; m.legR.rotation.x = Math.sin(w) * .62 * g - k * .35;
    m.shinL.rotation.x = Math.max(0, Math.sin(w + 1.1)) * .95 * g + k * 1.45; m.shinR.rotation.x = Math.max(0, -Math.sin(w + 1.1)) * .95 * g + k * 1.75;
    m.legL.position.y = m.legR.position.y = .93 - drop; m.up.position.y = -drop + Math.abs(Math.sin(w)) * .028 * g; m.up.rotation.x = .05 + g * .07 + k * .12; m.up.rotation.z = Math.sin(w) * .025 * g;
  }

  // ---------- match ----------
  SV.start = function (match) {
    SV.end(); G.match = match; G.diff = DIFF[match.diff]; G.score = { A: 0, B: 0 }; G.killer = null; G.time = match.minutes * 60; G.feed = []; G.feedDirty = true; G.streak = 0; G.shake = 0; G.hitFlash = 0; G.marker = 0;
    G.stats = { shots: 0, hits: 0, kills: 0, deaths: 0, heads: 0, streak: 0, by: {} };
    var map = G.map = SV.buildMap(match.map); boxes = map.boxes; scene.add(map.group);
    scene.background = new T.Color(map.bg).convertSRGBToLinear(); scene.fog = new T.Fog(scene.background.getHex(), map.fog[0], map.fog[1]); scene.fog.color.copy(scene.background);
    if (verb) verb.buffer = map.indoor ? irIn : irOut;
    var photo = setSky(map); if (!photo) setEnv(map.sky ? map.sky[0] : map.bg, map.sky ? map.sky[1] : 0x5a6268, map.hemi[1]);
    map.group.traverse(function (o) { var m = o.material; if (m && m.userData.surf === 'conc' && map.rain) { m.roughness = .3; m.metalness = .05; m.envMapIntensity = 1.4; } });   // wet ground
    var lit = cfg.quality && map.lights.length > 0; vmLamp.intensity = 0; LAMPS.forEach(function (p) { p.src = null; p.k = 0; p.l.intensity = 0; if (lit) scene.add(p.l); else scene.remove(p.l); });
    hemi.color.setHex(map.hemi[0]); hemi.groundColor.setHex(map.hemi[1]); hemi.intensity = map.hemi[2] * (lit ? (map.dim || .62) : 1) * (photo ? map.hdri[4] : 1);
    sun.color.setHex(map.sun[0]); sun.intensity = map.sun[1] * (lit ? (map.dim || .62) : 1); sun.position.fromArray(map.sun[2]); sun.target.position.set(0, 0, 0);
    var r = Math.max(map.bounds.maxx, map.bounds.maxz) + 8, sc = sun.shadow.camera; sc.left = sc.bottom = -r; sc.right = sc.top = r; sc.near = 1; sc.far = 200; sc.updateProjectionMatrix();
    if (renderer) renderer.shadowMap.needsUpdate = true;
    if (map.rain) makeRain();
    buildNav(map); var b = map.bounds, cx = (b.minx + b.maxx) / 2, cz = (b.minz + b.maxz) / 2;
    HOT = map.hot || [{ x: cx, z: cz }, { x: cx, z: b.minz + 4 }, { x: cx, z: b.maxz - 4 }, { x: b.minx + 8, z: cz }, { x: b.maxx - 8, z: cz }, { x: cx - 8, z: cz + 6 }, { x: cx + 8, z: cz - 6 }];
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
    if (G.map) { scene.remove(G.map.group); G.map.group.traverse(function (o) { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); G.map = null; }
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
    if (!G.mini) { G.mini = document.createElement('canvas'); G.mini.width = G.mini.height = w; var c = G.mini.getContext('2d'); c.fillStyle = 'rgba(232,228,218,.42)'; for (i = 0; i < boxes.length; i++) { var q = boxes[i], mb = G.map.base || 0; if (q.maxy < mb + 1 || q.miny > mb + 1.6 || (q.miny > mb + .05 && !q.soft && q.maxy < mb + 3.5 && q.maxx - q.minx < 1.3 && q.maxz - q.minz < 1.3)) continue; if (q.rot) { c.save(); c.translate(ox + (q.ox - b.minx) * s, oz + (q.oz - b.minz) * s); c.rotate(Math.atan2(-q.s, q.c)); c.fillRect(q.minx * s, q.minz * s, (q.maxx - q.minx) * s, (q.maxz - q.minz) * s); c.restore(); }
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
    var w = 320, h = 128, rt = new T.WebGLRenderTarget(w, h), sc = new T.Scene(), mesh = SV.scanOf(id) || new T.Mesh(SV.merge(SV.GUN[id]().g), new T.MeshLambertMaterial({ color: 0xe8e4da }));
    var box = new T.Box3().setFromObject(mesh), c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3()), half = Math.max(sz.x / 2 * 1.08, sz.y / 2 * 1.08 * w / h);
    var oc = new T.OrthographicCamera(-half, half, half * h / w, -half * h / w, .01, 10); oc.position.set(c.x, c.y, 3); oc.lookAt(c);
    sc.add(mesh); sc.add(new T.HemisphereLight(0xffffff, 0x666666, .9)); var dl = new T.DirectionalLight(0xffffff, .5); dl.position.set(-1, 2, 3); sc.add(dl);
    var px = new Uint8Array(w * h * 4), old = renderer.getClearAlpha(); renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, oc); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); renderer.setRenderTarget(null); renderer.setClearColor(0x000000, old);
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var x = cv.getContext('2d'), im = x.createImageData(w, h), y;
    for (y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    x.putImageData(im, 0, 0); rt.dispose(); if (mesh.geometry) mesh.geometry.dispose(); return thumbs[id] = cv.toDataURL();
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
    updFx(dt); updRain(dt); updLamps(dt);
    drawFrame();
  }
  requestAnimationFrame(frame);
  // headless test hook: advance the simulation without waiting for frames
  SV.navInfo = function () { return nav; };   // for tests: lets a script check that every walkable cell can be reached
  SV.sim = function (sec) { var n = Math.round(sec * 30); for (var i = 0; i < n && G.state === 'play'; i++) step(1 / 30); return { score: G.score, time: G.time, state: G.state, bomb: G.bomb && { round: G.bomb.round, atk: G.bomb.atk, phase: G.bomb.phase, planted: G.bomb.planted && G.bomb.planted.site, t: G.bomb.planted && +G.bomb.planted.t.toFixed(1), carrier: G.bomb.carrier && G.bomb.carrier.name, can: G.bomb.can }, pos: G.actors.map(function (a) { return [a.name, +a.pos.x.toFixed(1), +a.pos.z.toFixed(1), a.kills, a.deaths]; }) }; };
})();
