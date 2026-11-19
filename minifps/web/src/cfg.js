// cfg.js — saved player settings.
window.SV = window.SV || {};
(function () {
  var cfg = { sens: 55, adsSens: 35, btnScale: 100, btnAlpha: 60, assist: true, autoFire: false, leftFire: true, sound: true, quality: true, gyro: false, layout: {} };
  SV.cfgDefaults = JSON.parse(JSON.stringify(cfg));
  try { var s = JSON.parse(localStorage.getItem('minifps.cfg') || 'null'); if (s) for (var k in cfg) if (typeof s[k] === typeof cfg[k]) cfg[k] = s[k]; } catch (e) {}
  SV.cfg = cfg;
})();
