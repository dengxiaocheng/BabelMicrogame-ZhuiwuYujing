// 坠物预警 — 游戏状态与核心循环逻辑
// 纯数据逻辑，不依赖 DOM，可在 Node.js 中测试

var ZhuiwuState = (function () {
  var ZONE_COUNT = 3;
  var INITIAL_TOKENS = 3;
  var MAX_WAVES = 10;
  var FALSE_ALARM_LIMIT = 8;

  // Wave difficulty: [dangerRate, strongPrecursorChance, falseSignalRate]
  // Progresses: obvious precursors → ambiguous → false signals + high penalty
  var WAVE_DIFFICULTY = [
    null,
    [0.3, 0.9, 0.0],
    [0.3, 0.8, 0.0],
    [0.4, 0.7, 0.1],
    [0.5, 0.5, 0.2],
    [0.5, 0.4, 0.25],
    [0.5, 0.3, 0.3],
    [0.6, 0.2, 0.35],
    [0.6, 0.2, 0.4],
    [0.7, 0.1, 0.45],
    [0.7, 0.1, 0.5]
  ];

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

  // 为当前波次生成各区域危险状态和前兆（按波次难度渐进）
  function generateWave(state) {
    var waveIdx = Math.min(state.wave, MAX_WAVES);
    var diff = WAVE_DIFFICULTY[waveIdx];
    var dangerRate = diff[0], strongChance = diff[1], falseSignalRate = diff[2];
    var zones = [];
    for (var i = 0; i < ZONE_COUNT; i++) {
      var dangerous = Math.random() < dangerRate;
      var precursor;
      if (dangerous) {
        precursor = Math.random() < strongChance ? 'strong' : 'weak';
      } else {
        precursor = Math.random() < falseSignalRate ? 'weak' : 'none';
      }
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

  // 结算当前波次：每次结果同时推动资源压力和风险压力
  function resolveWave(state) {
    if (state.phase !== 'WARN') return state;
    state.phase = 'RESOLVE';
    state.results = [];
    for (var i = 0; i < ZONE_COUNT; i++) {
      var zone = state.zones[i];
      var warned = state.warnings[i];
      var quotaDelta = 0, riskDelta = 0, outcome;
      if (zone.dangerous && warned) {
        // 躲避: 停工损失产量(resource) + 成功预警提升信任(risk下降)
        quotaDelta = -5;
        riskDelta = -3;
        outcome = 'dodged';
      } else if (zone.dangerous && !warned) {
        // 受伤: 工伤损失产量(resource) + 风险飙升(risk上升)
        quotaDelta = -15;
        riskDelta = 20;
        outcome = 'injury';
      } else if (!zone.dangerous && warned) {
        // 误报: 白停工(resource) + 狼来了效应(risk上升)
        quotaDelta = -10;
        riskDelta = 3;
        state.false_alarm += 1;
        outcome = 'false_alarm';
      } else {
        // 安全: 正常生产(resource) + 风险不变
        quotaDelta = 10;
        outcome = 'safe';
      }
      state.quota += quotaDelta;
      state.injury_risk = Math.max(0, state.injury_risk + riskDelta);
      state.results.push({ zone: i, outcome: outcome, quotaDelta: quotaDelta, riskDelta: riskDelta });
    }
    if (state.injury_risk >= 60) {
      state.gameOver = true;
      state.result = 'collapse';
    } else if (state.quota <= 0) {
      state.gameOver = true;
      state.result = 'collapse';
    } else if (state.false_alarm >= FALSE_ALARM_LIMIT) {
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
    FALSE_ALARM_LIMIT: FALSE_ALARM_LIMIT,
    WAVE_DIFFICULTY: WAVE_DIFFICULTY,
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
