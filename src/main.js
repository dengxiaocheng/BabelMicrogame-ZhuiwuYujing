// 坠物预警 — 主入口，连接状态/场景/循环

(function () {
  var state = ZhuiwuState.createInitialState();
  ZhuiwuState.generateWave(state);

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
          // 重置游戏
          state = ZhuiwuState.createInitialState();
          ZhuiwuState.generateWave(state);
        } else {
          ZhuiwuState.advanceToNextWave(state);
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
})();
