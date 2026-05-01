// 坠物预警 — 场景渲染与交互（拖拽预警旗到危险区域）

var ZhuiwuScene = (function () {
  var canvas, ctx;
  var onWarningPlaced = null;
  var onPhaseAdvance = null;
  var drag = null; // { flagIdx, cx, cy }
  var FLAG_SZ = 36;

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

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function tpos(e) { return pos(e.touches[0]); }

  // 布局计算
  function zoneLayout() {
    var w = canvas.width, h = canvas.height, n = 3;
    var zw = w / n, th = h * 0.32, wy = th + h * 0.12, wh = h * 0.22;
    var arr = [];
    for (var i = 0; i < n; i++) {
      arr.push({ x: i * zw, w: zw, ty: h * 0.08, th: th, wy: wy, wh: wh, cx: i * zw + zw / 2 });
    }
    return arr;
  }

  function flagPoolPositions(state) {
    var w = canvas.width, h = canvas.height;
    var arr = [], total = state.warning_tokens;
    var gap = FLAG_SZ * 1.4;
    var sx = (w - total * gap) / 2;
    for (var i = 0; i < total; i++) {
      arr.push({ x: sx + i * gap, y: h - 70 });
    }
    return arr;
  }

  // 绘制
  function render(state) {
    if (!ctx) return;
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 背景
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, w, h);
    // 地面
    ctx.fillStyle = '#C8B88A';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);

    var zones = zoneLayout();

    // 绘制塔上区域 + 前兆
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i], zone = state.zones[i];
      // 塔结构
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(z.x + 12, z.ty, z.w - 24, z.th);
      // 前兆阴影
      if (zone.precursor === 'strong') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(z.x + 20, z.ty + 8, z.w - 40, z.th * 0.35);
        ctx.fillStyle = '#FF0';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', z.cx, z.ty + z.th * 0.28);
      } else if (zone.precursor === 'weak') {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(z.x + 24, z.ty + 14, z.w - 48, z.th * 0.25);
      }
      // 区域标签
      ctx.fillStyle = '#333';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('区域 ' + (i + 1), z.cx, z.ty - 4);

      // 工人
      ctx.fillStyle = '#4488FF';
      ctx.fillRect(z.cx - 14, z.wy, 28, z.wh);
      ctx.fillStyle = '#333';
      ctx.fillText('工人', z.cx, z.wy + z.wh + 14);

      // 已放置的预警旗
      if (state.warnings && state.warnings[i]) {
        drawFlag(z.cx - FLAG_SZ / 2, z.ty + z.th + 4, '#F44');
      }

      // 结算结果
      if (state.results && state.results[i]) {
        var r = state.results[i];
        var lbl = '', col = '#000';
        if (r.outcome === 'dodged')    { lbl = '躲避 -5产量'; col = '#FFA500'; }
        if (r.outcome === 'injury')    { lbl = '受伤!';       col = '#F00'; }
        if (r.outcome === 'false_alarm'){ lbl = '误报 -10';   col = '#F60'; }
        if (r.outcome === 'safe')      { lbl = '安全 +10';    col = '#0A0'; }
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(z.x + 4, z.wy + z.wh + 18, z.w - 8, 22);
        ctx.fillStyle = col;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lbl, z.cx, z.wy + z.wh + 33);
      }
    }

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, w, 28);
    ctx.fillStyle = '#FFF';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('波次: ' + state.wave + '/10', 8, 19);
    ctx.fillText('预警: ' + state.warning_tokens, 100, 19);
    ctx.fillText('产量: ' + state.quota, 180, 19);
    ctx.fillText('受伤风险: ' + state.injury_risk, 260, 19);
    ctx.fillText('误报: ' + state.false_alarm, 380, 19);
    ctx.textAlign = 'right';
    ctx.fillText('阶段: ' + state.phase, w - 8, 19);

    // 预警旗池（可拖拽）
    if (state.phase === 'WARN') {
      var fp = flagPoolPositions(state);
      for (var i = 0; i < fp.length; i++) {
        if (drag && drag.flagIdx === i) continue;
        drawFlag(fp[i].x, fp[i].y, '#F44');
      }
      // 标签
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('拖拽预警旗到危险区域', w / 2, canvas.height - 20);
    }

    // 拖拽中的旗帜
    if (drag) {
      drawFlag(drag.cx - FLAG_SZ / 2, drag.cy - FLAG_SZ / 2, '#F44');
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(drag.cx - FLAG_SZ / 2 - 2, drag.cy - FLAG_SZ / 2 - 2, FLAG_SZ + 4, FLAG_SZ + 4);
    }

    // 阶段按钮
    var bx = w - 130, by = h - 48, bw = 118, bh = 36;
    var label = '';
    if (state.phase === 'OBSERVE') label = '开始预警';
    else if (state.phase === 'WARN') label = '确认结算';
    else if (state.phase === 'RESOLVE') label = state.gameOver ? '查看结果' : '下一波';
    ctx.fillStyle = '#4466AA';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#FFF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, bx + bw / 2, by + bh / 2 + 5);

    // 游戏结束覆盖
    if (state.gameOver && state.phase === 'RESOLVE') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, h * 0.3, w, h * 0.3);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      if (state.result === 'complete') ctx.fillText('完成! 最终产量: ' + state.quota, w / 2, h * 0.5);
      else ctx.fillText('状态崩溃! 产量: ' + state.quota, w / 2, h * 0.5);
    }
  }

  function drawFlag(x, y, color) {
    ctx.fillStyle = '#666';
    ctx.fillRect(x + FLAG_SZ * 0.2, y, 3, FLAG_SZ);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + FLAG_SZ * 0.2 + 3, y);
    ctx.lineTo(x + FLAG_SZ * 0.8, y + FLAG_SZ * 0.25);
    ctx.lineTo(x + FLAG_SZ * 0.2 + 3, y + FLAG_SZ * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  // 交互
  function handleDown(p) {
    var w = canvas.width, h = canvas.height;
    // 阶段按钮
    var bx = w - 130, by = h - 48, bw = 118, bh = 36;
    if (p.x >= bx && p.x <= bx + bw && p.y >= by && p.y <= by + bh) {
      if (onPhaseAdvance) onPhaseAdvance();
      return;
    }
    // 拖拽预警旗
    if (!drag) {
      var st = typeof ZhuiwuState !== 'undefined' ? null : null; // state passed via render
      var fp = flagPoolPositions({ warning_tokens: currentFlagCount() });
      for (var i = 0; i < fp.length; i++) {
        if (p.x >= fp[i].x && p.x <= fp[i].x + FLAG_SZ && p.y >= fp[i].y && p.y <= fp[i].y + FLAG_SZ) {
          drag = { flagIdx: i, cx: p.x, cy: p.y };
          return;
        }
      }
    }
  }

  function handleUp(p) {
    if (!drag) return;
    // 判断落在哪个区域
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

  // 缓存当前 warning_tokens 数量（由 main.js 在 render 前设置）
  var _flagCount = 3;
  function setFlagCount(n) { _flagCount = n; }
  function currentFlagCount() { return _flagCount; }

  return {
    init: init,
    render: render,
    setFlagCount: setFlagCount
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZhuiwuScene;
}
