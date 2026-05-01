// 坠物预警 — 游戏状态与核心循环逻辑
// 纯数据逻辑，不依赖 DOM，可在 Node.js 中测试

var ZhuiwuState = (function () {
  var ZONE_COUNT = 3;
  var INITIAL_TOKENS = 3;
  var MAX_WAVES = 10;

  function createInitialState() {
    return {
      warning_tokens: INITIAL_TOKENS,
      quota: 100,
      injury_risk: 0,
      false_alarm: 0,
      wave: 1,
      phase: 'OBSERVE',
      zones: [],
      warnings: [],
      results: null,
      gameOver: false,
      result: null
    };
  }

  // 为当前波次生成各区域危险状态和前兆
  function generateWave(state) {
    var zones = [];
    for (var i = 0; i < ZONE_COUNT; i++) {
      var dangerous = Math.random() < 0.5;
      var precursor = dangerous
        ? (Math.random() < 0.7 ? 'strong' : 'weak')
        : (Math.random() < 0.3 ? 'weak' : 'none');
      zones.push({ index: i, dangerous: dangerous, precursor: precursor });
    }
    state.zones = zones;
    state.warnings = [];
    for (var i = 0; i < ZONE_COUNT; i++) state.warnings.push(false);
    state.results = null;
    state.phase = 'OBSERVE';
    return state;
  }

  // 从观察阶段进入预警阶段
  function startWarnPhase(state) {
    if (state.phase !== 'OBSERVE') return state;
    state.phase = 'WARN';
    return state;
  }

  // 玩家对指定区域发出预警（拖拽预警旗到区域）
  function issueWarning(state, zoneIndex) {
    if (state.phase !== 'WARN') return { ok: false, reason: 'not_warn_phase' };
    if (state.warning_tokens <= 0) return { ok: false, reason: 'no_tokens' };
    if (zoneIndex < 0 || zoneIndex >= ZONE_COUNT) return { ok: false, reason: 'invalid_zone' };
    if (state.warnings[zoneIndex]) return { ok: false, reason: 'already_warned' };
    state.warnings[zoneIndex] = true;
    state.warning_tokens -= 1;
    return { ok: true };
  }

  // 结算当前波次：计算工人反应和产量
  function resolveWave(state) {
    if (state.phase !== 'WARN') return state;
    state.phase = 'RESOLVE';
    state.results = [];
    for (var i = 0; i < ZONE_COUNT; i++) {
      var zone = state.zones[i];
      var warned = state.warnings[i];
      if (zone.dangerous && warned) {
        state.quota -= 5;
        state.results.push({ zone: i, outcome: 'dodged' });
      } else if (zone.dangerous && !warned) {
        state.injury_risk += 20;
        state.results.push({ zone: i, outcome: 'injury' });
      } else if (!zone.dangerous && warned) {
        state.false_alarm += 1;
        state.quota -= 10;
        state.results.push({ zone: i, outcome: 'false_alarm' });
      } else {
        state.quota += 10;
        state.results.push({ zone: i, outcome: 'safe' });
      }
    }
    if (state.injury_risk >= 60) {
      state.gameOver = true;
      state.result = 'collapse';
    } else if (state.quota <= 0) {
      state.gameOver = true;
      state.result = 'collapse';
    } else if (state.wave >= MAX_WAVES) {
      state.gameOver = true;
      state.result = 'complete';
    }
    return state;
  }

  // 推进到下一波
  function advanceToNextWave(state) {
    state.wave += 1;
    state.warning_tokens = Math.min(state.warning_tokens + 2, INITIAL_TOKENS + 1);
    return generateWave(state);
  }

  return {
    ZONE_COUNT: ZONE_COUNT,
    INITIAL_TOKENS: INITIAL_TOKENS,
    MAX_WAVES: MAX_WAVES,
    createInitialState: createInitialState,
    generateWave: generateWave,
    startWarnPhase: startWarnPhase,
    issueWarning: issueWarning,
    resolveWave: resolveWave,
    advanceToNextWave: advanceToNextWave
  };
})();

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZhuiwuState;
}
