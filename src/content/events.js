// 坠物预警 — 事件内容池
// 服务核心情绪：危险模式识别 + 信号次数限制 + 产量损失
// 所有事件围绕 Scene Objects（塔上阴影、晃动梁、工人区域、预警旗、产量表）
// 和 Feedback Channels（阴影变化、预警次数、工人躲避动画/状态、quota 损失）

var ZhuiwuContent = (function () {

  // === 前兆事件 ===
  // 观察阶段的场景对象前兆，服务「危险模式识别」核心情绪
  // strong: 明确前兆 — 玩家有信心发出预警
  // weak: 模糊前兆 — 增加决策压力（可能是真危险也可能是假信号）
  var PRECURSOR_EVENTS = {
    strong: [
      { id: 'crack', object: '塔结构', desc: '裂缝扩展中，碎块摇摇欲坠' },
      { id: 'sway',  object: '钢梁',   desc: '钢梁剧烈晃动!' },
      { id: 'debris', object: '塔结构', desc: '碎石从高处滚落!' }
    ],
    weak: [
      { id: 'shadow', object: '阴影', desc: '阴影似乎在移动...' },
      { id: 'dust',   object: '塔结构', desc: '有粉尘从上方飘落' },
      { id: 'creak',  object: '钢梁',   desc: '隐约听到金属异响' }
    ]
  };

  // === 结局反馈 ===
  // 结算阶段的情绪强化文本，围绕 quota 损失和 injury_risk
  // 每种结局提供多条随机文本，强化不同情绪：
  //   dodged: relief（预警有效，但付出停工代价）
  //   injury: shock（未预警的严重后果）
  //   false_alarm: regret（误报的产量损失 + 狼来了效应）
  //   safe: calm（正确判断的回报）
  var OUTCOME_FEEDBACK = {
    dodged: [
      { text: '预警生效! 工人撤离', detail: '碎块砸在空位，停工代价' },
      { text: '躲避成功',           detail: '预警换来安全，产量小损' }
    ],
    injury: [
      { text: '工伤事故!',  detail: '坠物砸中工人，现场混乱' },
      { text: '坠物命中!', detail: '未预警区域出事，工人倒地' }
    ],
    false_alarm: [
      { text: '误报!',      detail: '安全区域白停工，产量受损' },
      { text: '虚惊一场',   detail: '工人白跑一趟，预警信用下降' }
    ],
    safe: [
      { text: '正常产出',   detail: '无事故，工人继续工作' },
      { text: '安全通过',   detail: '判断正确，这一区顺利产出' }
    ]
  };

  // === 波次节奏 ===
  // 渐进: 明显前兆 → 多区域 → 假信号 → 模糊前兆和高惩罚
  // 每条提示强化当前波次的决策压力特征
  var WAVE_INTROS = [
    null,  // wave 0 不用
    '注意塔上动态，识别危险前兆',
    '多个区域可能同时出现信号',
    '小心! 有些前兆可能是假信号',
    '前兆变得模糊，判断更难了',
    '假信号增多，信任你的直觉',
    '强前兆减少，需要更仔细观察',
    '高风险波次! 误报代价增大',
    '大部分信号都很模糊了',
    '接近终点，保持警觉',
    '最终波! 全力以赴!'
  ];

  // === 结局文本 ===
  // 游戏结束时根据崩溃原因给出不同文本
  var ENDINGS = {
    complete: '工班安全完成所有波次!',
    collapse_injury: '工伤频发，工程被迫停工',
    collapse_quota: '产量不足，工班被解散',
    collapse_false_alarm: '误报过多，预警失去信任'
  };

  // --- 工具函数 ---

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 为给定区域列表选择前兆事件（每波调用一次）
  function selectPrecursors(zones) {
    var result = [];
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (z.precursor === 'strong') {
        result.push(copyEvent(pickRandom(PRECURSOR_EVENTS.strong)));
      } else if (z.precursor === 'weak') {
        result.push(copyEvent(pickRandom(PRECURSOR_EVENTS.weak)));
      } else {
        result.push(null);
      }
    }
    return result;
  }

  function copyEvent(e) {
    return { id: e.id, object: e.object, desc: e.desc };
  }

  // 获取结局反馈（随机选一条）
  function getOutcomeFeedback(outcome) {
    var pool = OUTCOME_FEEDBACK[outcome];
    if (!pool || pool.length === 0) return { text: outcome, detail: '' };
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 获取波次开场文本
  function getWaveIntro(wave) {
    return WAVE_INTROS[wave] || '';
  }

  // 获取结局文本（根据崩溃原因）
  function getEndingText(state) {
    if (state.result === 'complete') return ENDINGS.complete;
    if (state.injury_risk >= 60) return ENDINGS.collapse_injury;
    if (state.quota <= 0) return ENDINGS.collapse_quota;
    if (state.false_alarm >= 8) return ENDINGS.collapse_false_alarm;
    return '多重压力导致崩溃';
  }

  return {
    PRECURSOR_EVENTS: PRECURSOR_EVENTS,
    OUTCOME_FEEDBACK: OUTCOME_FEEDBACK,
    WAVE_INTROS: WAVE_INTROS,
    ENDINGS: ENDINGS,
    selectPrecursors: selectPrecursors,
    getOutcomeFeedback: getOutcomeFeedback,
    getWaveIntro: getWaveIntro,
    getEndingText: getEndingText
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZhuiwuContent;
}
