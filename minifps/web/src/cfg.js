// cfg.js — saved player settings.
window.SV = window.SV || {};
(function () {
  var cfg = { sens: 55, adsSens: 35, btnScale: 100, btnAlpha: 60, sway: 30, assist: true, autoFire: false, leftFire: true, sound: true, quality: true, gyro: false, gyroSens: 50, autoUpdate: true, skipCode: 0, layout: {}, layoutV: 0 };
  SV.cfgDefaults = JSON.parse(JSON.stringify(cfg));
  try { var s = JSON.parse(localStorage.getItem('minifps.cfg') || 'null'); if (s) for (var k in cfg) if (typeof s[k] === typeof cfg[k]) cfg[k] = s[k]; } catch (e) {}
  if (cfg.layoutV < 2) { cfg.layout = {}; cfg.layoutV = 2; }   // 0.39: the default button places became the layout the player had arranged; offsets saved against the old places are dropped
  SV.cfg = cfg;
})();
