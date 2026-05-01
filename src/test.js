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

console.log('\n全部 ' + 11 + ' 个测试通过');
