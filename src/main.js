// 坠物预警 — 主入口，连接状态/场景/循环

(function () {
  var WAVE_INTRO_FALLBACK = [
    '', '注意塔上动态，识别危险前兆', '多个区域可能同时出现信号',
    '小心! 有些前兆可能是假信号', '前兆变得模糊，判断更难了',
    '假信号增多，信任你的直觉', '强前兆减少，需要更仔细观察',
    '高风险波次! 误报代价增大', '大部分信号都很模糊了',
    '接近终点，保持警觉', '最终波! 全力以赴!'
  ];

  function enrichState(st) {
    st.precursor_events = (typeof ZhuiwuContent !== 'undefined') ?
      ZhuiwuContent.selectPrecursors(st.zones) : [];
    if (typeof ZhuiwuContent !== 'undefined') {
      st.waveIntro = ZhuiwuContent.getWaveIntro(st.wave);
    } else {
      st.waveIntro = WAVE_INTRO_FALLBACK[st.wave] || '';
    }
  }

  var state = ZhuiwuState.createInitialState();
  ZhuiwuState.generateWave(state);
  enrichState(state);

  var canvas = document.getElementById('game');
  var scene = ZhuiwuScene;

  scene.init(canvas, {
    onWarningPlaced: function (zoneIndex) {
      ZhuiwuState.issueWarning(state, zoneIndex);
    },
    onPhaseAdvance: function () {
      if (state.phase === 'OBSERVE') {
        ZhuiwuState.startWarnPhase(state);
      } else if (state.phase === 'WARN') {
        ZhuiwuState.resolveWave(state);
      } else if (state.phase === 'RESOLVE') {
        if (state.gameOver) {
          state = ZhuiwuState.createInitialState();
          ZhuiwuState.generateWave(state);
          enrichState(state);
        } else {
          ZhuiwuState.advanceToNextWave(state);
          enrichState(state);
        }
      }
    }
  });

  function tick() {
    scene.setFlagCount(state.warning_tokens);
    scene.render(state);
    requestAnimationFrame(tick);
  }
  tick();

  // Dynamically load content script to integrate content into main loop
  // (index.html not in write scope; content enriches state on load)
  var _cscript = document.createElement('script');
  _cscript.src = 'src/content/events.js';
  _cscript.onload = function () { enrichState(state); };
  document.head.appendChild(_cscript);
})();
