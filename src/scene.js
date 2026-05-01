// 坠物预警 — 场景渲染与交互（拖拽预警旗到危险区域）
// 强化核心循环压力可视化和场景对象交互反馈

var ZhuiwuScene = (function () {
  var canvas, ctx;
  var onWarningPlaced = null;
  var onPhaseAdvance = null;
  var drag = null; // { flagIdx, cx, cy }
  var FLAG_SZ = 36;
  var HUD_H = 72;

  // Animation state
  var animT = 0;
  var particles = [];
  var _curState = null;

  function init(el, callbacks) {
    canvas = el;
    ctx = el.getContext('2d');
    onWarningPlaced = callbacks.onWarningPlaced;
    onPhaseAdvance = callbacks.onPhaseAdvance;
    canvas.addEventListener('mousedown', function (e) { handleDown(pos(e)); });
    canvas.addEventListener('mousemove', function (e) { if (drag) { var p = pos(e); drag.cx = p.x; drag.cy = p.y; } });
    canvas.addEventListener('mouseup', function (e) { handleUp(pos(e)); });
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); handleDown(tpos(e)); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); if (drag) { var p = tpos(e); drag.cx = p.x; drag.cy = p.y; } }, { passive: false });
    canvas.addEventListener('touchend', function () { if (drag) handleUp({ x: drag.cx, y: drag.cy }); });
    window.addEventListener('resize', function () {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    });
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }

  function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function tpos(e) { return pos(e.touches[0]); }

  // --- Layout ---
  function zoneLayout() {
    var w = canvas.width, h = canvas.height, n = 3;
    var zw = w / n, th = h * 0.26;
    var topY = HUD_H + 10;
    var wy = topY + th + h * 0.08, wh = h * 0.16;
    var arr = [];
    for (var i = 0; i < n; i++) {
      arr.push({ x: i * zw, w: zw, ty: topY, th: th, wy: wy, wh: wh, cx: i * zw + zw / 2 });
    }
    return arr;
  }

  function flagPoolPositions(tokenCount) {
    var w = canvas.width, h = canvas.height;
    var arr = [], gap = FLAG_SZ * 1.5;
    var sx = (w - tokenCount * gap) / 2;
    for (var i = 0; i < tokenCount; i++) arr.push({ x: sx + i * gap, y: h - 72 });
    return arr;
  }

  // --- Particle system for debris effects ---
  function spawnDebris(x, y, n) {
    for (var i = 0; i < n; i++) {
      particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2 + 0.5,
        life: 20 + Math.random() * 20,
        size: 2 + Math.random() * 3
      });
    }
  }

  function tickParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = Math.min(1, p.life / 12);
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // --- Pressure gauges ---
  function drawBar(x, y, w, h, value, max, label, goodColor, dangerPct) {
    var pct = Math.min(1, Math.max(0, value / max));
    var isDanger = dangerPct !== undefined && pct <= dangerPct;
    var pulse = isDanger ? 0.65 + 0.35 * Math.sin(animT * 6) : 1;
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = isDanger ? '#E44' : goodColor;
    ctx.fillRect(x + 2, y + 2, (w - 4) * pct, h - 4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label + ': ' + Math.round(value), x + w / 2, y + h / 2 + 4);
  }

  function drawRiskBar(x, y, w, h, value, dangerAt) {
    var pct = Math.min(1, Math.max(0, value / 80));
    var isDanger = value >= dangerAt;
    var pulse = isDanger ? 0.65 + 0.35 * Math.sin(animT * 6) : 1;
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, h);
    var dangerX = x + 2 + (w - 4) * (dangerAt / 80);
    ctx.fillStyle = 'rgba(255,0,0,0.15)';
    ctx.fillRect(dangerX, y + 1, x + w - 2 - dangerX, h - 2);
    ctx.globalAlpha = pulse;
    var r = Math.round(Math.min(255, pct * 2 * 255));
    var g = Math.round(Math.min(255, (1 - pct) * 2 * 255));
    ctx.fillStyle = 'rgb(' + r + ',' + g + ',30)';
    ctx.fillRect(x + 2, y + 2, (w - 4) * pct, h - 4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('风险: ' + Math.round(value), x + w / 2, y + h / 2 + 4);
  }

  function drawPressurePanel(state) {
    var w = canvas.width;
    ctx.fillStyle = 'rgba(20,15,10,0.88)';
    ctx.fillRect(0, 0, w, HUD_H);

    var barW = Math.min(w * 0.32, 180);
    drawBar(10, 8, barW, 22, state.quota, 150, '产量', '#4A4', 0.25);
    drawRiskBar(w - barW - 10, 8, barW, 22, state.injury_risk, 45);

    // Wave dots
    var dotY = 18, dotStart = w / 2 - 55;
    for (var i = 1; i <= 10; i++) {
      var dx = dotStart + (i - 1) * 12;
      ctx.fillStyle = i < state.wave ? '#6A6' : i === state.wave ? '#FFD700' : '#555';
      ctx.beginPath(); ctx.arc(dx, dotY, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#CCC'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('波次 ' + state.wave + '/10', w / 2, dotY + 16);

    // Second row: tokens, false alarms, phase
    var row2Y = 40;
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    var tokenStr = '';
    for (var i = 0; i < state.warning_tokens; i++) tokenStr += '\u2691 ';
    ctx.fillText('\u9884\u8B66: ' + tokenStr, 10, row2Y + 14);

    ctx.fillStyle = state.false_alarm >= 5 ? '#F80' : '#AAA';
    ctx.textAlign = 'center';
    ctx.fillText('\u8BEF\u62A5: ' + state.false_alarm + '/8', w / 2, row2Y + 14);

    var phaseLabel = state.phase === 'OBSERVE' ? '\u89C2\u5BDF\u524D\u5146' :
                     state.phase === 'WARN' ? '\u653E\u7F6E\u9884\u8B66' : '\u7ED3\u7B97\u7ED3\u679C';
    var phaseColor = state.phase === 'OBSERVE' ? '#8CF' :
                     state.phase === 'WARN' ? '#FC8' : '#8F8';
    ctx.fillStyle = phaseColor; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('\u25B6 ' + phaseLabel, w - 10, row2Y + 14);

    // Wave intro
    if (state.waveIntro && state.phase === 'OBSERVE') {
      ctx.fillStyle = 'rgba(60,30,0,0.7)';
      ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      var tw = ctx.measureText(state.waveIntro).width + 20;
      ctx.fillRect(w / 2 - tw / 2, HUD_H - 18, tw, 16);
      ctx.fillStyle = '#FFD700';
      ctx.fillText(state.waveIntro, w / 2, HUD_H - 6);
    }
  }

  // --- Zones with animated precursors ---
  function drawZones(state, zones) {
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i], zone = state.zones[i];
      var shakeX = 0, shakeY = 0;

      if (zone.precursor === 'strong') {
        shakeX = Math.sin(animT * 15 + i) * 3;
        shakeY = Math.cos(animT * 12 + i * 2) * 2;
        if (Math.random() < 0.04) spawnDebris(z.cx + (Math.random() - 0.5) * z.w * 0.3, z.ty + z.th * 0.5, 2);
      }

      // Zone highlight during drag
      if (drag && !state.warnings[i] && state.phase === 'WARN') {
        var hp = 0.25 + 0.25 * Math.sin(animT * 4);
        ctx.strokeStyle = 'rgba(100,255,100,' + hp + ')';
        ctx.lineWidth = 3;
        ctx.strokeRect(z.x + 2, z.ty - 2, z.w - 4, z.wy + z.wh - z.ty + 40);
        ctx.lineWidth = 1;
      }

      // Tower structure
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(z.x + 14 + shakeX, z.ty + shakeY, z.w - 28, z.th);
      // Beams
      ctx.strokeStyle = '#6B5335'; ctx.lineWidth = 2;
      var bY1 = z.ty + z.th * 0.3, bY2 = z.ty + z.th * 0.65;
      ctx.beginPath();
      ctx.moveTo(z.x + 14 + shakeX, bY1 + shakeY); ctx.lineTo(z.x + z.w - 14 + shakeX, bY1 + shakeY);
      ctx.moveTo(z.x + 14 + shakeX, bY2 + shakeY); ctx.lineTo(z.x + z.w - 14 + shakeX, bY2 + shakeY);
      ctx.stroke();

      // Precursor shadows
      if (zone.precursor === 'strong') {
        var fl = 0.4 + 0.15 * Math.sin(animT * 8 + i);
        ctx.fillStyle = 'rgba(0,0,0,' + fl + ')';
        ctx.fillRect(z.x + 22 + shakeX, z.ty + 8 + shakeY, z.w - 44, z.th * 0.35);
        ctx.fillStyle = '#FF0'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('\u26A0', z.cx + shakeX, z.ty + z.th * 0.3 + shakeY);
      } else if (zone.precursor === 'weak') {
        var fl = 0.12 + 0.08 * Math.sin(animT * 3 + i);
        ctx.fillStyle = 'rgba(0,0,0,' + fl + ')';
        ctx.fillRect(z.x + 26, z.ty + 14, z.w - 52, z.th * 0.22);
      }

      // Precursor event description
      var pe = state.precursor_events && state.precursor_events[i];
      if (pe && state.phase !== 'RESOLVE') {
        ctx.fillStyle = '#FFE'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(pe.desc, z.cx, z.ty + z.th * 0.75);
      }

      // Zone label
      ctx.fillStyle = '#333'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('\u533A\u57DF ' + (i + 1), z.cx, z.ty - 4);
    }
  }

  // --- Workers with visual states ---
  function drawWorkers(state, zones) {
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i], warned = state.warnings[i];
      var wx = z.cx - 14, wy = z.wy, ww = 28, wh = z.wh;
      var color = '#4488FF', label = '\u5DE5\u4EBA';

      if (state.phase === 'RESOLVE' && state.results) {
        var r = state.results[i];
        if (r.outcome === 'injury') { color = '#F44'; label = '\u53D7\u4F24!'; }
        else if (r.outcome === 'dodged') { color = '#4A4'; wx = z.cx + 8; ww = 24; label = '\u5DF2\u64A4\u79BB'; ctx.globalAlpha = 0.6; }
        else if (r.outcome === 'false_alarm') { color = '#AA8833'; label = '\u767D\u8DD1\u4E00\u8D9F'; }
        else { label = '\u5DE5\u4F5C\u4E2D'; }
      } else if (warned) {
        color = '#DDAA00'; wx = z.cx - 8; ww = 20; wh = z.wh - 6;
        label = '\u64A4\u79BB\u4E2D...';
      }

      ctx.fillStyle = color;
      ctx.fillRect(wx, wy, ww, wh);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, z.cx, z.wy + z.wh + 14);
    }
  }

  // --- Placed flags ---
  function drawPlacedFlags(state, zones) {
    for (var i = 0; i < zones.length; i++) {
      if (state.warnings[i]) drawFlag(zones[i].cx - FLAG_SZ / 2, zones[i].ty + zones[i].th + 4, '#F44');
    }
  }

  // --- Results ---
  function drawResults(state, zones) {
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i], r = state.results[i];
      if (!r) continue;
      var col = r.outcome === 'dodged' ? '#FFA500' : r.outcome === 'injury' ? '#F00' :
                r.outcome === 'false_alarm' ? '#F60' : '#0A0';
      var deltaStr = (r.quotaDelta >= 0 ? '+' : '') + r.quotaDelta;
      var feedback = (typeof ZhuiwuContent !== 'undefined') ?
        ZhuiwuContent.getOutcomeFeedback(r.outcome) : { text: r.outcome, detail: '' };
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(z.x + 6, z.wy + z.wh + 18, z.w - 12, 26);
      ctx.fillStyle = col; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(feedback.text + ' ' + deltaStr, z.cx, z.wy + z.wh + 35);
    }
  }

  // --- Flag pool ---
  function drawFlagPool(state) {
    var fp = flagPoolPositions(state.warning_tokens);
    for (var i = 0; i < fp.length; i++) {
      if (drag && drag.flagIdx === i) continue;
      drawFlag(fp[i].x, fp[i].y, '#F44');
    }
    ctx.fillStyle = '#FFF'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('\u2193 \u62D6\u62FD\u9884\u8B66\u65D7\u5230\u5371\u9669\u533A\u57DF \u2193', canvas.width / 2, canvas.height - 18);
  }

  // --- Drag indicator ---
  function drawDrag() {
    drawFlag(drag.cx - FLAG_SZ / 2, drag.cy - FLAG_SZ / 2, '#F44');
    ctx.strokeStyle = 'rgba(255,200,0,0.8)'; ctx.lineWidth = 2;
    ctx.strokeRect(drag.cx - FLAG_SZ / 2 - 4, drag.cy - FLAG_SZ / 2 - 4, FLAG_SZ + 8, FLAG_SZ + 8);
    ctx.lineWidth = 1;
  }

  // --- Phase button ---
  function drawPhaseButton(state) {
    var w = canvas.width, h = canvas.height;
    var bx = w - 140, by = h - 50, bw = 128, bh = 40;
    var label, btnColor;
    if (state.phase === 'OBSERVE') { label = '\u5F00\u59CB\u9884\u8B66 \u2192'; btnColor = '#2E8B57'; }
    else if (state.phase === 'WARN') { label = '\u786E\u8BA4\u7ED3\u7B97 \u2192'; btnColor = '#CC7700'; }
    else { label = state.gameOver ? '\u67E5\u770B\u7ED3\u679C' : '\u4E0B\u4E00\u6CE2 \u2192'; btnColor = state.gameOver ? '#8B0000' : '#2E8B57'; }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(bx + 2, by + 2, bw, bh);
    ctx.fillStyle = btnColor; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, bx + bw / 2, by + bh / 2 + 5);
  }

  // --- Game over overlay ---
  function drawGameOver(state) {
    if (!state.gameOver || state.phase !== 'RESOLVE') return;
    var w = canvas.width, h = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, h * 0.25, w, h * 0.4);
    var endMsg = (typeof ZhuiwuContent !== 'undefined') ? ZhuiwuContent.getEndingText(state) : '\u6E38\u620F\u7ED3\u675F';
    ctx.fillStyle = state.result === 'complete' ? '#FFD700' : '#F44';
    ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(endMsg, w / 2, h * 0.42);
    ctx.fillStyle = '#FFF'; ctx.font = '15px sans-serif';
    ctx.fillText('\u6700\u7EC8\u4EA7\u91CF: ' + state.quota + '  \u98CE\u9669: ' + state.injury_risk + '  \u8BEF\u62A5: ' + state.false_alarm, w / 2, h * 0.50);
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#AAA';
    ctx.fillText('\u70B9\u51FB\u201C\u67E5\u770B\u7ED3\u679C\u201D\u91CD\u65B0\u5F00\u59CB', w / 2, h * 0.57);
  }

  // --- Flag primitive ---
  function drawFlag(x, y, color) {
    ctx.fillStyle = '#666';
    ctx.fillRect(x + FLAG_SZ * 0.2, y, 3, FLAG_SZ);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + FLAG_SZ * 0.2 + 3, y);
    ctx.lineTo(x + FLAG_SZ * 0.8, y + FLAG_SZ * 0.25);
    ctx.lineTo(x + FLAG_SZ * 0.2 + 3, y + FLAG_SZ * 0.5);
    ctx.closePath(); ctx.fill();
  }

  // --- Main render ---
  function render(state) {
    if (!ctx) return;
    _curState = state;
    animT += 0.016;
    tickParticles();

    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Phase-tinted sky
    var sky = state.phase === 'OBSERVE' ? '#87CEEB' : state.phase === 'WARN' ? '#A8B8C8' : '#B8B8B0';
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.68);
    ctx.fillStyle = '#C8B88A'; ctx.fillRect(0, h * 0.68, w, h * 0.32);

    drawPressurePanel(state);
    var zones = zoneLayout();
    drawZones(state, zones);
    drawWorkers(state, zones);
    drawPlacedFlags(state, zones);
    if (state.results) drawResults(state, zones);
    if (state.phase === 'WARN') drawFlagPool(state);
    if (drag) drawDrag();
    drawParticles();
    drawPhaseButton(state);
    drawGameOver(state);
  }

  // --- Interaction ---
  function handleDown(p) {
    var w = canvas.width, h = canvas.height;
    var bx = w - 140, by = h - 50, bw = 128, bh = 40;
    if (p.x >= bx && p.x <= bx + bw && p.y >= by && p.y <= by + bh) {
      if (onPhaseAdvance) onPhaseAdvance();
      return;
    }
    if (!drag && _curState && _curState.phase === 'WARN') {
      var fp = flagPoolPositions(_curState.warning_tokens);
      for (var i = 0; i < fp.length; i++) {
        if (p.x >= fp[i].x && p.x <= fp[i].x + FLAG_SZ && p.y >= fp[i].y && p.y <= fp[i].y + FLAG_SZ) {
          drag = { flagIdx: i, cx: p.x, cy: p.y };
          return;
        }
      }
    }
  }

  function handleUp(p) {
    if (!drag || !_curState) { drag = null; return; }
    var zones = zoneLayout();
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.ty && p.y <= z.wy + z.wh + 40) {
        if (onWarningPlaced) onWarningPlaced(i);
        break;
      }
    }
    drag = null;
  }

  // Legacy compat — no longer needed but kept for API stability
  var _flagCount = 3;
  function setFlagCount(n) { _flagCount = n; }

  return { init: init, render: render, setFlagCount: setFlagCount };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZhuiwuScene;
}
