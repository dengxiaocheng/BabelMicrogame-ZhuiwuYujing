// 坠物预警 — 核心状态逻辑测试
// 运行: npm test

var assert = require('assert');
var S = require('./state.js');

// 1. 初始状态
(function () {
  var st = S.createInitialState();
  assert.strictEqual(st.warning_tokens, 3, '初始预警次数应为 3');
  assert.strictEqual(st.quota, 100, '初始产量应为 100');
  assert.strictEqual(st.injury_risk, 0, '初始受伤风险应为 0');
  assert.strictEqual(st.false_alarm, 0, '初始误报应为 0');
  assert.strictEqual(st.wave, 1, '初始波次应为 1');
  assert.strictEqual(st.phase, 'OBSERVE', '初始阶段应为 OBSERVE');
  assert.strictEqual(st.gameOver, false, '初始不应结束');
  console.log('PASS: 初始状态正确');
})();

// 2. 生成波次
(function () {
  var st = S.createInitialState();
  S.generateWave(st);
  assert.strictEqual(st.zones.length, S.ZONE_COUNT, '区域数应为 ' + S.ZONE_COUNT);
  assert.strictEqual(st.warnings.length, S.ZONE_COUNT, '预警标记数应为 ' + S.ZONE_COUNT);
  assert.strictEqual(st.phase, 'OBSERVE', '生成波次后应为 OBSERVE');
  console.log('PASS: 波次生成正确');
})();

// 3. 发出预警
(function () {
  var st = S.createInitialState();
  S.generateWave(st);
  S.startWarnPhase(st);
  assert.strictEqual(st.phase, 'WARN', '应进入 WARN 阶段');
  var r = S.issueWarning(st, 0);
  assert.strictEqual(r.ok, true, '发出预警应成功');
  assert.strictEqual(st.warning_tokens, 2, '预警次数应减 1');
  assert.strictEqual(st.warnings[0], true, '区域 0 应已预警');
  // 重复预警
  var r2 = S.issueWarning(st, 0);
  assert.strictEqual(r2.ok, false, '重复预警应失败');
  console.log('PASS: 发出预警逻辑正确');
})();

// 4. 预警次数耗尽
(function () {
  var st = S.createInitialState();
  S.generateWave(st);
  S.startWarnPhase(st);
  S.issueWarning(st, 0);
  S.issueWarning(st, 1);
  S.issueWarning(st, 2);
  var r = S.issueWarning(st, 0); // 再次尝试（虽然 0 已预警）
  assert.strictEqual(st.warning_tokens, 0, '预警次数应耗尽');
  console.log('PASS: 预警次数耗尽');
})();

// 5. 结算 — 危险+预警=躲避
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: true, precursor: 'strong' },
    { index: 1, dangerous: false, precursor: 'none' },
    { index: 2, dangerous: false, precursor: 'none' }
  ];
  st.warnings = [true, false, false];
  st.phase = 'WARN';
  S.resolveWave(st);
  assert.strictEqual(st.results[0].outcome, 'dodged', '危险+预警=躲避');
  assert.strictEqual(st.quota, 115, '躲避应扣5，另两区安全各+10');
  assert.strictEqual(st.injury_risk, 0, '躲避不应增加受伤风险');
  console.log('PASS: 危险+预警结算正确');
})();

// 6. 结算 — 危险+无预警=受伤
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: true, precursor: 'strong' },
    { index: 1, dangerous: false, precursor: 'none' },
    { index: 2, dangerous: false, precursor: 'none' }
  ];
  st.warnings = [false, false, false];
  st.phase = 'WARN';
  S.resolveWave(st);
  assert.strictEqual(st.results[0].outcome, 'injury', '危险+无预警=受伤');
  assert.strictEqual(st.injury_risk, 20, '受伤风险应增加');
  assert.strictEqual(st.quota, 105, '受伤应扣产量(资源+风险双压力)');
  console.log('PASS: 危险+无预警结算正确');
})();

// 7. 结算 — 安全+预警=误报
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: false, precursor: 'none' },
    { index: 1, dangerous: false, precursor: 'none' },
    { index: 2, dangerous: false, precursor: 'none' }
  ];
  st.warnings = [true, false, false];
  st.phase = 'WARN';
  S.resolveWave(st);
  assert.strictEqual(st.results[0].outcome, 'false_alarm', '安全+预警=误报');
  assert.strictEqual(st.false_alarm, 1, '误报应 +1');
  assert.strictEqual(st.quota, 110, '误报-10，另两区安全各+10');
  assert.strictEqual(st.injury_risk, 3, '误报应增加受伤风险(资源+风险双压力)');
  console.log('PASS: 安全+预警结算正确');
})();

// 8. 结算 — 安全+无预警=安全
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: false, precursor: 'none' },
    { index: 1, dangerous: false, precursor: 'none' },
    { index: 2, dangerous: false, precursor: 'none' }
  ];
  st.warnings = [false, false, false];
  st.phase = 'WARN';
  S.resolveWave(st);
  assert.strictEqual(st.results[0].outcome, 'safe', '安全+无预警=安全');
  assert.strictEqual(st.quota, 130, '全部安全应 +30');
  console.log('PASS: 安全+无预警结算正确');
})();

// 9. 游戏结束 — 受伤风险过高
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: true, precursor: 'strong' },
    { index: 1, dangerous: true, precursor: 'strong' },
    { index: 2, dangerous: true, precursor: 'strong' }
  ];
  st.warnings = [false, false, false];
  st.phase = 'WARN';
  st.injury_risk = 40;
  S.resolveWave(st);
  assert.strictEqual(st.gameOver, true, '受伤风险>=60应结束');
  assert.strictEqual(st.result, 'collapse', '应为崩溃结局');
  console.log('PASS: 受伤崩溃判定正确');
})();

// 10. 波次推进
(function () {
  var st = S.createInitialState();
  S.generateWave(st);
  S.startWarnPhase(st);
  S.resolveWave(st);
  assert.strictEqual(st.phase, 'RESOLVE', '结算后应为 RESOLVE');
  st.wave = 1;
  S.advanceToNextWave(st);
  assert.strictEqual(st.wave, 2, '波次应推进到 2');
  assert.strictEqual(st.phase, 'OBSERVE', '新一波应为 OBSERVE');
  console.log('PASS: 波次推进正确');
})();

// 11. 游戏完成（打满波次）
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: false, precursor: 'none' },
    { index: 1, dangerous: false, precursor: 'none' },
    { index: 2, dangerous: false, precursor: 'none' }
  ];
  st.warnings = [false, false, false];
  st.phase = 'WARN';
  st.wave = S.MAX_WAVES;
  S.resolveWave(st);
  assert.strictEqual(st.gameOver, true, '打满波次应结束');
  assert.strictEqual(st.result, 'complete', '应为完成结局');
  console.log('PASS: 游戏完成判定正确');
})();

// 12. 波次难度配置
(function () {
  assert.strictEqual(S.WAVE_DIFFICULTY.length, 11, '应有 11 个难度配置');
  assert.strictEqual(S.WAVE_DIFFICULTY[0], null, '索引 0 应为 null');
  assert.strictEqual(S.WAVE_DIFFICULTY[1][0], 0.3, '第1波危险率 0.3');
  assert.strictEqual(S.WAVE_DIFFICULTY[1][1], 0.9, '第1波强前兆率 0.9');
  assert.strictEqual(S.WAVE_DIFFICULTY[1][2], 0.0, '第1波无假信号');
  assert.strictEqual(S.WAVE_DIFFICULTY[10][0], 0.7, '第10波危险率 0.7');
  assert.strictEqual(S.WAVE_DIFFICULTY[10][1], 0.1, '第10波强前兆率 0.1');
  assert.strictEqual(S.WAVE_DIFFICULTY[10][2], 0.5, '第10波假信号率 0.5');
  // 难度递增验证
  assert.ok(S.WAVE_DIFFICULTY[10][0] > S.WAVE_DIFFICULTY[1][0], '危险率应递增');
  assert.ok(S.WAVE_DIFFICULTY[10][2] > S.WAVE_DIFFICULTY[1][2], '假信号率应递增');
  assert.ok(S.WAVE_DIFFICULTY[10][1] < S.WAVE_DIFFICULTY[1][1], '强前兆率应递减');
  console.log('PASS: 波次难度配置正确');
})();

// 13. 误报超限游戏结束
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: false, precursor: 'none' },
    { index: 1, dangerous: false, precursor: 'none' },
    { index: 2, dangerous: false, precursor: 'none' }
  ];
  st.warnings = [true, true, true];
  st.phase = 'WARN';
  st.false_alarm = 7;
  S.resolveWave(st);
  assert.strictEqual(st.false_alarm, 10, '误报应达到 10');
  assert.strictEqual(st.gameOver, true, '误报超限应结束');
  assert.strictEqual(st.result, 'collapse', '误报超限应为崩溃结局');
  console.log('PASS: 误报超限游戏结束正确');
})();

// 14. 双压力耦合 — dodged 同时影响资源与风险
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: true, precursor: 'strong' },
    { index: 1, dangerous: false, precursor: 'none' },
    { index: 2, dangerous: false, precursor: 'none' }
  ];
  st.warnings = [true, false, false];
  st.phase = 'WARN';
  st.injury_risk = 10;
  S.resolveWave(st);
  var r = st.results[0];
  assert.strictEqual(r.outcome, 'dodged');
  assert.strictEqual(r.quotaDelta, -5, 'dodged 产量变化');
  assert.strictEqual(r.riskDelta, -3, 'dodged 风险变化');
  assert.strictEqual(st.injury_risk, 7, 'dodged 应降低受伤风险(10-3)');
  console.log('PASS: dodged 双压力耦合正确');
})();

// 15. 双压力耦合 — false_alarm 同时影响资源与风险
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: false, precursor: 'none' },
    { index: 1, dangerous: false, precursor: 'none' },
    { index: 2, dangerous: false, precursor: 'none' }
  ];
  st.warnings = [true, false, false];
  st.phase = 'WARN';
  S.resolveWave(st);
  var r = st.results[0];
  assert.strictEqual(r.outcome, 'false_alarm');
  assert.strictEqual(r.quotaDelta, -10, '误报产量变化');
  assert.strictEqual(r.riskDelta, 3, '误报风险变化');
  assert.strictEqual(st.injury_risk, 3, '误报应增加受伤风险');
  console.log('PASS: false_alarm 双压力耦合正确');
})();

// 16. 双压力耦合 — injury 同时影响资源与风险
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: true, precursor: 'strong' },
    { index: 1, dangerous: false, precursor: 'none' },
    { index: 2, dangerous: false, precursor: 'none' }
  ];
  st.warnings = [false, false, false];
  st.phase = 'WARN';
  S.resolveWave(st);
  var r = st.results[0];
  assert.strictEqual(r.outcome, 'injury');
  assert.strictEqual(r.quotaDelta, -15, '受伤产量变化');
  assert.strictEqual(r.riskDelta, 20, '受伤风险变化');
  console.log('PASS: injury 双压力耦合正确');
})();

console.log('\n全部 16 个状态测试通过');

// === Content + Integration Tests ===
var C = require('./content/events.js');

// 17. Content — selectPrecursors enrichment
(function () {
  var st = S.createInitialState();
  S.generateWave(st);
  var events = C.selectPrecursors(st.zones);
  assert.strictEqual(events.length, S.ZONE_COUNT, '前兆事件数应等于区域数');
  for (var i = 0; i < events.length; i++) {
    var z = st.zones[i];
    if (z.precursor === 'none') {
      assert.strictEqual(events[i], null, '无前兆区域应返回 null');
    } else {
      assert.ok(events[i] !== null, '有前兆区域应返回事件');
      assert.ok(events[i].id, '事件应有 id');
      assert.ok(events[i].desc, '事件应有 desc');
    }
  }
  console.log('PASS: Content 前兆选择正确');
})();

// 18. Content — outcome feedback for all outcomes
(function () {
  var outcomes = ['dodged', 'injury', 'false_alarm', 'safe'];
  for (var i = 0; i < outcomes.length; i++) {
    var fb = C.getOutcomeFeedback(outcomes[i]);
    assert.ok(fb.text, outcomes[i] + ' 反馈应有 text');
    assert.ok(fb.detail !== undefined, outcomes[i] + ' 反馈应有 detail');
  }
  console.log('PASS: Content 结局反馈正确');
})();

// 19. Content — wave intros
(function () {
  for (var w = 1; w <= S.MAX_WAVES; w++) {
    var intro = C.getWaveIntro(w);
    assert.ok(intro.length > 0, '波次 ' + w + ' 应有开场文本');
  }
  console.log('PASS: Content 波次开场正确');
})();

// 20. Content — ending text by collapse reason
(function () {
  var st1 = S.createInitialState(); st1.result = 'complete';
  assert.ok(C.getEndingText(st1).indexOf('安全') >= 0, '完成结局应提及安全');
  var st2 = S.createInitialState(); st2.injury_risk = 60;
  assert.ok(C.getEndingText(st2).indexOf('工伤') >= 0, '受伤崩溃应提及工伤');
  var st3 = S.createInitialState(); st3.quota = 0;
  assert.ok(C.getEndingText(st3).indexOf('产量') >= 0, '产量崩溃应提及产量');
  var st4 = S.createInitialState(); st4.false_alarm = 8;
  assert.ok(C.getEndingText(st4).indexOf('误报') >= 0, '误报崩溃应提及误报');
  console.log('PASS: Content 结局文本正确');
})();

// 21. Integration — full loop with content enrichment
(function () {
  var st = S.createInitialState();
  S.generateWave(st);
  st.precursor_events = C.selectPrecursors(st.zones);
  st.waveIntro = C.getWaveIntro(st.wave);
  assert.ok(st.precursor_events.length === S.ZONE_COUNT, 'enriched 前兆事件数');
  assert.ok(st.waveIntro.length > 0, 'enriched 波次开场');

  S.startWarnPhase(st);
  assert.strictEqual(st.phase, 'WARN');
  S.issueWarning(st, 0);
  S.resolveWave(st);
  assert.strictEqual(st.phase, 'RESOLVE');
  assert.ok(st.results !== null, '应有结算结果');

  for (var i = 0; i < st.results.length; i++) {
    var fb = C.getOutcomeFeedback(st.results[i].outcome);
    assert.ok(fb.text, '结算反馈应有 text for ' + st.results[i].outcome);
  }

  if (!st.gameOver) {
    S.advanceToNextWave(st);
    st.precursor_events = C.selectPrecursors(st.zones);
    st.waveIntro = C.getWaveIntro(st.wave);
    assert.strictEqual(st.wave, 2, '波次应推进到 2');
    assert.ok(st.precursor_events.length === S.ZONE_COUNT, '新波次前兆事件');
  }
  console.log('PASS: 集成完整主循环通过');
})();

// 22. Content — precursor events reference scene objects
(function () {
  var sceneObjects = ['塔结构', '钢梁', '阴影'];
  var allEvents = C.PRECURSOR_EVENTS.strong.concat(C.PRECURSOR_EVENTS.weak);
  var found = {};
  for (var i = 0; i < allEvents.length; i++) found[allEvents[i].object] = true;
  for (var j = 0; j < sceneObjects.length; j++) {
    assert.ok(found[sceneObjects[j]], '应有场景对象 ' + sceneObjects[j] + ' 的事件');
  }
  console.log('PASS: Content 前兆覆盖场景对象');
})();

// 23. Integration — content enrichment on restart
(function () {
  var st = S.createInitialState();
  st.zones = [
    { index: 0, dangerous: true, precursor: 'strong' },
    { index: 1, dangerous: true, precursor: 'strong' },
    { index: 2, dangerous: true, precursor: 'strong' }
  ];
  st.warnings = [false, false, false];
  st.phase = 'WARN';
  st.injury_risk = 40;
  S.resolveWave(st);
  assert.strictEqual(st.gameOver, true, '应游戏结束');

  st = S.createInitialState();
  S.generateWave(st);
  st.precursor_events = C.selectPrecursors(st.zones);
  st.waveIntro = C.getWaveIntro(st.wave);
  assert.strictEqual(st.phase, 'OBSERVE', '重启后应为 OBSERVE');
  assert.strictEqual(st.gameOver, false, '重启后不应结束');
  assert.ok(st.precursor_events.length === S.ZONE_COUNT, '重启后前兆事件');
  console.log('PASS: 集成重启后内容充实正确');
})();

console.log('\n全部 23 个测试通过 (16 状态 + 7 集成)');
