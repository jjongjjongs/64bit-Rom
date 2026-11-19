// ui.js — menus, settings, touch and keyboard input.
(function () {
  var $ = function (id) { return document.getElementById(id); }, G = SV.G, inp = SV.inp, cfg = SV.cfg, W = SV.W;
  var match = { mode: 0, map: 0, perTeam: 5, target: 40, diff: 1, team: 'A', primary: 'rifle', minutes: 10 };
  try { var m0 = JSON.parse(localStorage.getItem('minifps.match') || 'null'); if (m0) for (var k0 in match) if (typeof m0[k0] === typeof match[k0]) match[k0] = m0[k0]; } catch (e) {}
  if (!SV.MAPS[match.map]) match.map = 0; if (match.mode !== 1 || !SV.MAPS[match.map].bomb) match.mode = 0;
  var stats = { w: 0, l: 0, k: 0, d: 0 }; try { var s0 = JSON.parse(localStorage.getItem('minifps.stats') || 'null'); if (s0) for (var k1 in stats) if (typeof s0[k1] === 'number') stats[k1] = s0[k1]; } catch (e) {}
  function save() { try { localStorage.setItem('minifps.stats', JSON.stringify(stats)); } catch (e) {} try { localStorage.setItem('minifps.cfg', JSON.stringify(cfg)); localStorage.setItem('minifps.match', JSON.stringify(match)); } catch (e) {} }
  var SCR = ['s-title', 's-lobby', 's-match', 's-team', 's-load', 's-pause', 's-set', 's-res', 's-upd'], from = { 's-load': 's-team', 's-set': 's-lobby' };
  var cur = 's-title';
  function show(id) { cur = id; if (id === 's-lobby' && window.MiniUpdate && cfg.autoUpdate && !upd.asked) { upd.asked = true; setTimeout(function () { updCheck(false); }, 400); } SCR.forEach(function (s) { $(s).hidden = s !== id; }); $('hud').hidden = !(id === null || id === 's-pause'); if (id) refresh(id); }
  if (SV.fatal) { $('s-title').querySelector('.tag').textContent = SV.fatal; }

  // ---------- option builders ----------
  function seg(host, items, get, set) {
    host.textContent = ''; items.forEach(function (it, n) {
      var b = document.createElement('button'); b.className = 'opt'; b.id = host.id + '-' + n; b.textContent = it[0]; if (it[1]) { var s = document.createElement('small'); s.textContent = it[1]; b.appendChild(s); }
      if (it[3]) { var im = document.createElement('img'); im.alt = ''; im.src = it[3]; b.insertBefore(im, b.firstChild); }
      b.setAttribute('aria-pressed', get() === it[2] ? 'true' : 'false'); b.addEventListener('click', function () { set(it[2]); save(); refresh(host.closest('.scr').id); }); host.appendChild(b);
    });
  }
  var GUNS = [['rifle', '중거리 만능. 연사 반동이 위로 올라갑니다.', [62, 70, 58, 66, 55]], ['smg', '가볍고 빠릅니다. 멀어질수록 약해집니다.', [40, 92, 48, 35, 88]], ['sniper', '한 발이 무겁습니다. 정조준하면 조준경이 열립니다.', [98, 12, 96, 100, 25]], ['shotgun', '좁은 통로의 주인. 여덟 알이 퍼져 나갑니다.', [90, 28, 30, 20, 60]]];
  var NAMES = { A: ['까치', '너구리', '수달', '오소리', '두루미', '고라니'], B: ['매', '늑대', '살쾡이', '올빼미', '멧돼지', '담비'] };
  function refresh(id) {
    if (id === 's-lobby') { $('lb-map').textContent = SV.MAPS[match.map].name; var c = $('lb-chips'); c.textContent = ''; [match.mode ? '폭파 미션' : '팀 데스매치', match.perTeam + ' 대 ' + match.perTeam, match.mode ? '5라운드 선승' : '목표 ' + match.target + '킬', '봇 ' + ['쉬움', '보통', '어려움', '지옥'][match.diff], (match.team === 'A' ? 'ALPHA' : 'BRAVO') + ' · ' + W[match.primary].name].forEach(function (t) { var s = document.createElement('span'); s.textContent = t; c.appendChild(s); }); $('lb-wl').textContent = stats.w + '승 ' + stats.l + '패'; $('lb-kd').textContent = stats.d ? (stats.k / stats.d).toFixed(2) : stats.k ? stats.k + '.00' : '–'; $('lb-gun').textContent = W[match.primary].name; }
    if (id === 's-match') {
      seg($('o-map'), SV.MAPS.map(function (m, n) { return [m.name, m.info, n]; }), function () { return match.map; }, function (v) { match.map = v; if (!SV.MAPS[v].bomb) match.mode = 0; setTimeout(function () { refresh('s-match'); }, 0); });
      seg($('o-diff'), [['쉬움', '', 0], ['보통', '', 1], ['어려움', '', 2], ['지옥', '', 3]], function () { return match.diff; }, function (v) { match.diff = v; });
      $('pt').textContent = match.perTeam + ' 대 ' + match.perTeam; $('tk').textContent = match.target;
      $('md-0').setAttribute('aria-pressed', match.mode ? 'false' : 'true'); $('md-1').setAttribute('aria-pressed', match.mode ? 'true' : 'false'); $('tk-box').hidden = !!match.mode;
      $('mt-foot').textContent = match.mode ? '5라운드 선승 · 라운드 2분 30초 · 부활 없음 · 4라운드 뒤 공수 교대' : '제한 시간 10분 · 죽으면 3초 뒤 다시 투입';
    }
    if (id === 's-team') { $('tm-A-s').textContent = match.mode ? '주황 · 먼저 공격 (폭탄 설치)' : '주황 · 서쪽에서 시작'; $('tm-B-s').textContent = match.mode ? '하늘 · 먼저 수비 (설치 저지)' : '하늘 · 동쪽에서 시작'; }
    if (id === 's-team') ['A', 'B'].forEach(function (t) { $('tm-' + t).setAttribute('aria-pressed', match.team === t ? 'true' : 'false'); var ro = $('ro-' + t), mine = match.team === t, n = mine ? match.perTeam - 1 : match.perTeam, i; ro.textContent = ''; function row(a, b2, me) { var r = document.createElement('span'), x = document.createElement('span'), y = document.createElement('span'); if (me) r.className = 'me'; x.textContent = a; y.textContent = b2; r.appendChild(x); r.appendChild(y); ro.appendChild(r); } if (mine) row('나', W[match.primary].name, true); for (i = 0; i < n; i++) row('봇 · ' + NAMES[t][i], W[SV.botGun(mine ? i + 1 : i, match.map)].name); });
    if (id === 's-load') {
      seg($('o-gun'), GUNS.map(function (g) { return [W[g[0]].name, '', g[0], SV.thumb(g[0])]; }), function () { return match.primary; }, function (v) { match.primary = v; });
      var g = GUNS.filter(function (x) { return x[0] === match.primary; })[0]; $('gn').textContent = W[g[0]].name; $('gd').textContent = g[1]; $('ga').textContent = W[g[0]].mag + ' / ' + W[g[0]].res + '발';
      var gb = $('gb'); gb.textContent = ''; ['위력', '연사', '정확도', '사거리', '기동성'].forEach(function (l, n) { var a = document.createElement('div'); a.textContent = l; var b = document.createElement('div'); b.className = 'bar'; var f = document.createElement('i'); f.style.width = g[2][n] + '%'; b.appendChild(f); gb.appendChild(a); gb.appendChild(b); });
      var inGame = from['s-load'] === 's-pause'; $('ld-step').textContent = inGame ? '다음 투입부터 적용' : from['s-load'] === 's-lobby' ? '' : '3 / 3'; $('go-fight').textContent = inGame ? '확인' : from['s-load'] === 's-lobby' ? '확인' : '전투 투입';
    }
    if (id === 's-pause') board();
    if (id === 's-set') {
      [['sens', 'sens', ''], ['ads', 'adsSens', ''], ['gs', 'gyroSens', ''], ['bs', 'btnScale', '%'], ['ba', 'btnAlpha', '%']].forEach(function (r) { $('c-' + r[0]).value = cfg[r[1]]; $('v-' + r[0]).textContent = cfg[r[1]] + r[2]; });
      [['assist', 'assist'], ['auto', 'autoFire'], ['left', 'leftFire'], ['sound', 'sound'], ['quality', 'quality'], ['gyro', 'gyro'], ['autoup', 'autoUpdate']].forEach(function (r) { $('c-' + r[0]).setAttribute('aria-checked', cfg[r[1]] ? 'true' : 'false'); });
    }
  }
  function board() {
    var host = $('board'), me = G.player; host.textContent = '';
    ['A', 'B'].forEach(function (t) {
      var col = document.createElement('div'), h = document.createElement('h3'); h.className = 't' + t; var a = document.createElement('span'); a.textContent = t === 'A' ? 'ALPHA' : 'BRAVO'; var b = document.createElement('span'); b.textContent = G.score[t]; h.appendChild(a); h.appendChild(b); col.appendChild(h);
      SV.board().filter(function (x) { return x.team === t; }).forEach(function (x) { var r = document.createElement('div'); r.className = 'row' + (x === me ? ' me' : ''); [x.name, x.kills, x.deaths].forEach(function (v) { var s = document.createElement('span'); s.textContent = v; r.appendChild(s); }); col.appendChild(r); });
      host.appendChild(col);
    });
  }
  var EDIT = ['stick', 'b-lfire', 'b-fire', 'b-ads', 'b-jump', 'b-crouch', 'b-reload', 'b-nade'], ENAME = { stick: '이동 스틱', 'b-lfire': '왼손 사격', 'b-fire': '사격', 'b-ads': '정조준', 'b-jump': '점프', 'b-crouch': '앉기', 'b-reload': '장전', 'b-nade': '투척' };
  if (!cfg.layout || typeof cfg.layout !== 'object') cfg.layout = {};
  function applyLayout() { EDIT.forEach(function (id) { var l = cfg.layout[id] || {}, st = $(id).style; st.setProperty('--dx', (l.x || 0) + 'px'); st.setProperty('--dy', (l.y || 0) + 'px'); st.setProperty('--sc', l.s || 1); }); }
  function applyCfg() { applyLayout(); var h = $('hud'); h.style.setProperty('--bs', cfg.btnScale / 100); h.style.setProperty('--ba', cfg.btnAlpha / 100); $('b-lfire').hidden = !cfg.leftFire; SV.resize(); }

  // ---------- navigation ----------
  document.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { SV.audio(); var to = b.getAttribute('data-go'); if (b.hasAttribute('data-from')) from[to] = b.getAttribute('data-from'); show(to); }); });
  $('ld-back').addEventListener('click', function () { show(from['s-load']); });
  $('st-back').addEventListener('click', function () { show(from['s-set']); });
  var practice = false;
  $('go-practice').addEventListener('click', function () { practice = true; begin(); });
  $('tm-auto').addEventListener('click', function () { match.team = Math.random() < .5 ? 'A' : 'B'; save(); refresh('s-team'); });
  function begin() { SV.audio(); var el = document.documentElement; try { if (window.matchMedia('(pointer: coarse)').matches && el.requestFullscreen) { var p = el.requestFullscreen(); if (p && p.catch) p.catch(function () {}); } } catch (e) {} show(null); var m = match; if (practice) { m = JSON.parse(JSON.stringify(match)); m.practice = true; m.mode = 0; m.map = 1; m.perTeam = 1; m.enemies = 3; m.target = 999; m.minutes = 99; m.diff = 0; } lastPractice = practice; practice = false; SV.start(m); applyCfg(); }
  var lastPractice = false;
  $('go-fight').addEventListener('click', function () { save(); if (from['s-load'] === 's-pause') show('s-pause'); else if (from['s-load'] === 's-lobby') show('s-lobby'); else begin(); });
  $('r-again').addEventListener('click', function () { practice = lastPractice; begin(); });
  $('tm-A').addEventListener('click', function () { match.team = 'A'; save(); refresh('s-team'); }); $('tm-B').addEventListener('click', function () { match.team = 'B'; save(); refresh('s-team'); });
  function stepper(id, key, lo, hi, st) { $(id + '-').addEventListener('click', function () { match[key] = Math.max(lo, match[key] - st); save(); refresh('s-match'); }); $(id + '+').addEventListener('click', function () { match[key] = Math.min(hi, match[key] + st); save(); refresh('s-match'); }); }
  $('md-0').addEventListener('click', function () { match.mode = 0; save(); refresh('s-match'); });
  $('md-1').addEventListener('click', function () { match.mode = 1; if (!SV.MAPS[match.map].bomb) for (var i = SV.MAPS.length - 1; i >= 0; i--) if (SV.MAPS[i].bomb) match.map = i; save(); refresh('s-match'); });
  stepper('pt', 'perTeam', 2, 6, 1); stepper('tk', 'target', 10, 100, 10);
  function pause() { if (G.state !== 'play') return; G.state = 'pause'; inp.fire = inp.ads = inp.use = false; inp.mx = inp.mz = 0; if (document.exitPointerLock) document.exitPointerLock(); show('s-pause'); }
  function resume() { if (G.state !== 'pause') return; show(null); G.state = 'play'; }
  $('b-pause').addEventListener('click', pause); $('b-score').addEventListener('click', pause); $('p-resume').addEventListener('click', resume);
  $('p-quit').addEventListener('click', function () { SV.end(); show('s-lobby'); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  SV.onEnd = function (r) {
    if (document.exitPointerLock) document.exitPointerLock();
    $('r-eye').textContent = r.map + (r.mode ? ' · 폭파 미션' : ' · 팀 데스매치'); $('r-title').textContent = r.draw ? '무승부' : r.win ? '승리' : '패배'; $('r-a').textContent = r.score.A; $('r-b').textContent = r.score.B;
    var u = Math.round(r.used); $('r-time').textContent = ('0' + ((u / 60) | 0)).slice(-2) + ':' + ('0' + (u % 60)).slice(-2) + ' 소요';
    $('r-k').textContent = r.stats.kills; $('r-d').textContent = r.stats.deaths; $('r-h').textContent = r.stats.heads;
    var nem = '없음', nb = 0; for (var nk in r.stats.by) if (r.stats.by[nk] > nb) { nb = r.stats.by[nk]; nem = nk + ' · ' + nb + '회'; }
    if (!r.practice) { stats.k += r.stats.kills; stats.d += r.stats.deaths; if (!r.draw) { if (r.win) stats.w++; else stats.l++; } save(); }
    var f = $('r-facts'); f.textContent = ''; [['명중률', r.stats.shots ? Math.round(r.stats.hits / r.stats.shots * 100) + '%' : '–'], ['최다 연속 킬', r.stats.streak], ['주 무기', r.weapon], ['나를 가장 많이 잡은 적', nem]].forEach(function (x) { var li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('b'); a.textContent = x[0]; b.textContent = x[1]; li.appendChild(a); li.appendChild(b); f.appendChild(li); });
    SV.end(); show('s-res');
  };

  // ---------- settings ----------
  [['sens', 'sens'], ['ads', 'adsSens'], ['gs', 'gyroSens'], ['bs', 'btnScale'], ['ba', 'btnAlpha']].forEach(function (r) { $('c-' + r[0]).addEventListener('input', function () { cfg[r[1]] = +this.value; save(); refresh('s-set'); applyCfg(); }); });
  $('c-reset').addEventListener('click', function () { var d = SV.cfgDefaults; for (var k in d) cfg[k] = JSON.parse(JSON.stringify(d[k])); save(); refresh('s-set'); applyCfg(); });
  [['assist', 'assist'], ['auto', 'autoFire'], ['left', 'leftFire'], ['sound', 'sound'], ['quality', 'quality'], ['gyro', 'gyro'], ['autoup', 'autoUpdate']].forEach(function (r) { $('c-' + r[0]).addEventListener('click', function () { cfg[r[1]] = !cfg[r[1]]; save(); refresh('s-set'); applyCfg(); if (r[1] === 'sound') SV.audio(); }); });

  // ---------- in-app update (Android only: the app exposes window.MiniUpdate) ----------
  var MU = window.MiniUpdate, upd = { meta: null, phase: 'idle', manual: false, back: 's-lobby', asked: false }, mine = {};
  if (MU) { try { mine = JSON.parse(MU.version() || '{}'); } catch (e) {} $('up-row').hidden = false; $('up-auto-row').hidden = false; $('up-ver').textContent = mine.name || ''; }
  function kb(n) { return Math.round(n / 1024).toLocaleString('ko-KR') + ' KB'; }
  function updShow(phase, msg) {
    var m = upd.meta || {}; upd.phase = phase; if (cur !== 's-upd') upd.back = cur === 's-set' ? 's-set' : 's-lobby';
    $('u-cur').textContent = '지금 ' + (mine.name || ''); $('u-title').textContent = m.versionName || ''; $('u-size').textContent = m.size ? '약 ' + kb(m.size) : '';
    var ul = $('u-notes'); ul.textContent = ''; (m.notes || []).slice(0, 4).forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); }); ul.hidden = phase !== 'notice';
    $('u-prog').hidden = phase !== 'down'; $('u-skip').hidden = phase !== 'notice';
    $('u-eye').textContent = { notice: '새 버전이 있습니다', down: '새 버전을 받는 중', ready: '받기 완료 · 파일 확인됨', installing: '설치하는 중', error: '업데이트 실패' }[phase];
    $('u-go').textContent = { notice: '지금 업데이트', down: '받는 중…', ready: '설치', installing: '설치 창을 확인해 주세요', error: '다시 확인' }[phase]; $('u-go').disabled = phase === 'down' || phase === 'installing';
    $('u-later').textContent = phase === 'down' ? '취소' : phase === 'error' ? '닫기' : '나중에';
    $('u-msg').textContent = msg || { notice: '설정, 전적, 버튼 배치는 그대로 남습니다.', down: '', ready: '설치를 누르면 안드로이드의 설치 확인 창이 뜰 수 있습니다. 받은 파일은 설치 뒤 자동으로 지웁니다.', installing: '설치가 끝나면 앱이 닫힙니다. 다시 열면 새 버전입니다.', error: '' }[phase];
    show('s-upd');
  }
  SV.upd = { on: function (ev, d) {
    if (ev === 'checked') { upd.meta = d; $('up-state').textContent = d.newer ? '새 버전 ' + d.versionName + ' 이 있습니다' : '최신 버전입니다'; if (d.newer && (upd.manual || d.versionCode !== cfg.skipCode) && G.state === 'menu') updShow('notice'); upd.manual = false; }
    else if (ev === 'progress') { if (upd.phase === 'down') { $('u-fill').style.width = d.pct + '%'; $('u-bar').setAttribute('aria-valuenow', d.pct); $('u-msg').textContent = d.pct + '% · ' + kb(d.done) + ' / ' + kb(d.total); } }
    else if (ev === 'ready') { if (G.state === 'menu') updShow('ready'); else upd.phase = 'ready'; }
    else if (ev === 'installing') { if (cur === 's-upd') updShow('installing'); }
    else if (ev === 'cancelled') { upd.phase = 'idle'; if (cur === 's-upd') show(upd.back); }
    else if (ev === 'error') { $('up-state').textContent = d.message; if (cur === 's-upd' || upd.manual) updShow('error', d.message); upd.manual = false; }
  } };
  function updCheck(manual) { if (!MU) return; upd.manual = manual; if (manual) $('up-state').textContent = '확인하는 중…'; MU.check(); }
  $('up-check').addEventListener('click', function () { updCheck(true); });
  $('u-go').addEventListener('click', function () { if (upd.phase === 'notice') { $('u-fill').style.width = '0'; updShow('down'); MU.download(); } else if (upd.phase === 'ready') MU.install(); else if (upd.phase === 'error') { show(upd.back); updCheck(true); } });
  $('u-later').addEventListener('click', function () { if (upd.phase === 'down' || upd.phase === 'ready') MU.cancel(); upd.phase = 'idle'; show(upd.back); });
  $('u-skip').addEventListener('click', function () { cfg.skipCode = upd.meta.versionCode; save(); upd.phase = 'idle'; show(upd.back); });

  // ---------- button layout editor ----------
  var hud = $('hud'), sel = null, dragB = null;
  function pick(id) { EDIT.forEach(function (e) { $(e).classList.toggle('sel', e === id); }); sel = id; $('ed-name').textContent = id ? ENAME[id] + ' 선택됨' : '버튼을 끌어 옮기세요'; $('ed-size').disabled = !id; if (id) $('ed-size').value = Math.round(((cfg.layout[id] || {}).s || 1) * 100); }
  function editOn() { cur = 'edit'; SCR.forEach(function (s) { $(s).hidden = true; }); hud.hidden = false; hud.classList.add('edit'); $('grid').hidden = false; $('edbar').hidden = false; $('b-lfire').hidden = false; pick(null); }
  function editOff() { hud.classList.remove('edit'); $('grid').hidden = true; $('edbar').hidden = true; pick(null); save(); applyCfg(); show('s-set'); }
  $('go-edit').addEventListener('click', editOn); $('ed-done').addEventListener('click', editOff);
  $('ed-reset').addEventListener('click', function () { cfg.layout = {}; applyLayout(); pick(null); save(); });
  $('ed-size').addEventListener('input', function () { if (!sel) return; var l = cfg.layout[sel] || (cfg.layout[sel] = {}); l.s = +this.value / 100; applyLayout(); save(); });
  hud.addEventListener('pointerdown', function (e) {
    if (!hud.classList.contains('edit')) return; var t = e.target.closest ? e.target.closest('.hb, #stick') : null;
    if (!t) { if (!(e.target.closest && e.target.closest('#edbar'))) pick(null); return; }
    e.stopPropagation(); e.preventDefault(); pick(t.id); var l = cfg.layout[t.id] || (cfg.layout[t.id] = {}); dragB = { id: t.id, p: e.pointerId, sx: e.clientX, sy: e.clientY, ox: l.x || 0, oy: l.y || 0 }; try { hud.setPointerCapture(e.pointerId); } catch (er) {}
  }, true);
  hud.addEventListener('pointermove', function (e) { if (!dragB || e.pointerId !== dragB.p) return; e.stopPropagation(); var l = cfg.layout[dragB.id], W2 = window.innerWidth, H2 = window.innerHeight; l.x = Math.max(-W2, Math.min(W2, dragB.ox + e.clientX - dragB.sx)); l.y = Math.max(-H2, Math.min(H2, dragB.oy + e.clientY - dragB.sy)); applyLayout(); }, true);
  function dragEnd(e) { if (!dragB || e.pointerId !== dragB.p) return; e.stopPropagation(); var r = $(dragB.id).getBoundingClientRect(), l = cfg.layout[dragB.id]; if (r.right < 30) l.x += 30 - r.right; if (r.left > window.innerWidth - 30) l.x -= r.left - (window.innerWidth - 30); if (r.bottom < 30) l.y += 30 - r.bottom; if (r.top > window.innerHeight - 30) l.y -= r.top - (window.innerHeight - 30); applyLayout(); dragB = null; save(); }
  hud.addEventListener('pointerup', dragEnd, true); hud.addEventListener('pointercancel', dragEnd, true);

  // ---------- touch ----------
  var zone = $('zone'), stick = null, looks = {}, knob = $('knob'), stickEl = $('stick');
  function knobAt(dx, dy) { knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
  zone.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') { if (zone.requestPointerLock && document.pointerLockElement !== zone) { try { var p = zone.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (er) {} } if (document.pointerLockElement !== zone) looks[e.pointerId] = { x: e.clientX, y: e.clientY }; return; }
    try { zone.setPointerCapture(e.pointerId); } catch (er) {}
    if (!stick && e.clientX < window.innerWidth * .42) { stick = { id: e.pointerId, x: e.clientX, y: e.clientY }; }
    else looks[e.pointerId] = { x: e.clientX, y: e.clientY };
  });
  zone.addEventListener('pointermove', function (e) {
    if (stick && e.pointerId === stick.id) { var dx = e.clientX - stick.x, dy = e.clientY - stick.y, d = Math.hypot(dx, dy), R = 52; if (d > R) { dx *= R / d; dy *= R / d; } inp.mx = dx / R; inp.mz = -dy / R; knobAt(dx * .7, dy * .7); return; }
    var l = looks[e.pointerId]; if (l) { inp.lx += e.clientX - l.x; inp.ly += e.clientY - l.y; l.x = e.clientX; l.y = e.clientY; }
  });
  function zup(e) { if (stick && e.pointerId === stick.id) { stick = null; inp.mx = inp.mz = 0; knobAt(0, 0); } delete looks[e.pointerId]; }
  zone.addEventListener('pointerup', zup); zone.addEventListener('pointercancel', zup);
  function hold(id, down, up, look) {
    var el = $(id), pt = null;
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) {} pt = { id: e.pointerId, x: e.clientX, y: e.clientY }; el.classList.add('on'); down(); });
    el.addEventListener('pointermove', function (e) { if (look && pt && e.pointerId === pt.id) { inp.lx += e.clientX - pt.x; inp.ly += e.clientY - pt.y; pt.x = e.clientX; pt.y = e.clientY; } });
    function end(e) { if (pt && e.pointerId === pt.id) { pt = null; el.classList.remove('on'); if (up) up(); } }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  hold('b-fire', function () { inp.fire = true; }, function () { inp.fire = false; }, true);
  hold('b-lfire', function () { inp.fire = true; }, function () { inp.fire = false; }, false);
  var adsOn = false; hold('b-ads', function () { adsOn = !adsOn; inp.ads = adsOn; $('b-ads').classList.toggle('on', adsOn); }, function () { $('b-ads').classList.toggle('on', adsOn); }, true);
  hold('b-jump', function () { inp.jump = true; }, null, true); hold('b-crouch', function () { inp.crouch = true; }, null, false);
  hold('b-use', function () { inp.use = true; }, function () { inp.use = false; }, false);
  hold('b-reload', function () { inp.reload = true; }, null, false); hold('b-nade', function () { inp.nade = true; }, null, false);
  [0, 1, 2].forEach(function (n) { $('slot' + n).addEventListener('click', function () { inp.slot = n; adsOn = false; inp.ads = false; $('b-ads').classList.remove('on'); }); });

  // ---------- mouse and keyboard ----------
  var keys = {};
  function axes() { inp.mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); inp.mz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0); if (!keys.ShiftLeft && (inp.mx || inp.mz)) { inp.mx *= .9; inp.mz *= .9; } }
  window.addEventListener('keydown', function (e) {
    if (G.state !== 'play') { if ((e.code === 'KeyP' || e.code === 'Escape') && G.state === 'pause') resume(); return; }
    keys[e.code] = true; axes();
    if (e.code === 'Space') { inp.jump = true; e.preventDefault(); } else if (e.code === 'KeyC') inp.crouch = true; else if (e.code === 'KeyR') inp.reload = true; else if (e.code === 'KeyG') inp.nade = true; else if (e.code === 'KeyE' || e.code === 'KeyF') inp.use = true;
    else if (e.code === 'Digit1') inp.slot = 0; else if (e.code === 'Digit2') inp.slot = 1; else if (e.code === 'Digit3') inp.slot = 2; else if (e.code === 'KeyP' || e.code === 'Tab') { e.preventDefault(); pause(); }
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; if (e.code === 'KeyE' || e.code === 'KeyF') inp.use = false; if (G.state === 'play') axes(); });
  document.addEventListener('mousemove', function (e) { if (document.pointerLockElement === zone && G.state === 'play') { inp.lx += e.movementX * .5; inp.ly += e.movementY * .5; } });
  zone.addEventListener('mousedown', function (e) { if (e.button === 0) inp.fire = true; if (e.button === 2) inp.ads = true; });
  window.addEventListener('mouseup', function (e) { if (e.button === 0) inp.fire = false; if (e.button === 2) inp.ads = false; });
  zone.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('pointerlockchange', function () { if (document.pointerLockElement !== zone && G.state === 'play' && window.matchMedia('(pointer: fine)').matches && SV.locked) pause(); SV.locked = document.pointerLockElement === zone; });

  // gyro aiming: rotation rate of the phone, mapped for either landscape orientation
  window.addEventListener('devicemotion', function (e) {
    if (!cfg.gyro || G.state !== 'play' || !e.rotationRate) return; var r = e.rotationRate, dt = (e.interval > 1 ? e.interval / 1000 : e.interval) || .016, a = (screen.orientation && screen.orientation.angle) || window.orientation || 90, s = a === 270 || a === -90 ? -1 : 1, k = Math.PI / 180 * dt * cfg.gyroSens / 50;
    // Android WebView reports alpha about the phone's short axis and beta about its long axis. Held in landscape, the short axis is
    // vertical (turning left and right) and the long axis is horizontal (tilting up and down).
    inp.gy += (r.alpha || 0) * s * k; inp.gp += -(r.beta || 0) * s * k;
  });
  window.addEventListener('resize', SV.resize); if (window.ResizeObserver) new ResizeObserver(SV.resize).observe($('cv'));
  if (window.matchMedia('(pointer: coarse)').matches) $('keys').hidden = true;
  // Android back key: pause a running match, step back out of menus, and only then let the app close.
  SV.back = function () { if (cur === 'edit') { editOff(); return true; } if (cur === 's-upd') { if (upd.phase !== 'installing') $('u-later').click(); return true; } if (G.state === 'play') { pause(); return true; } if (cur === 's-pause') return true; if (cur === 's-res') { show('s-lobby'); return true; } if (cur && cur !== 's-title' && cur !== 's-lobby') { show(G.state === 'pause' ? 's-pause' : 's-lobby'); return true; } return false; };
  SV.ui = { begin: begin, match: match, pause: pause, resume: resume, edit: editOn };
  applyCfg(); show('s-title');
})();
