# TASK_BREAKDOWN: 坠物预警

## Worker Dependency Graph

```
foundation ──┐
             ├──► state ──┐
             │            ├──► integration ──► qa
             ├──► content ┘
             │
             └──► ui ──────► integration
```

- foundation 必须先完成（建立 index.html + 主循环骨架）
- state, content, ui 可并行
- integration 依赖 state + content + ui 全部完成
- qa 依赖 integration 完成

---

## Worker 1: zhuiwu-yujing-foundation

| 字段 | 值 |
|------|---|
| lane | foundation |
| level | M |
| goal | 建立只服务核心循环的可运行骨架：index.html + src/main.js |
| serves primary input | 建立拖拽事件监听框架和 Zone 渲染占位 |

**Deliverables:**
1. `index.html` — 游戏入口，包含 HUD / Zone 容器 / Flag Bar / 相位标签
2. `src/main.js` — 主循环骨架：5 阶段（前兆/决策/结算/结局检查/下一波），state 初始化，拖拽事件框架

**Acceptance:**
- 浏览器打开 index.html 可运行完整 5 阶段循环（前兆可占位）
- 3 个 Zone 在页面上可见
- Flag Bar 渲染 3 面旗（交互可占位）
- HUD 显示 5 个 Required State

**Forbidden:**
- 不得实现完整拖拽逻辑（留给 ui worker）
- 不得实现前兆动画（留给 content worker）
- 不得实现结算算法（留给 state worker）

---

## Worker 2: zhuiwu-yujing-state

| 字段 | 值 |
|------|---|
| lane | logic |
| level | M |
| goal | 实现 Direction Lock Required State 的初始化、操作结算、结局检测 |
| serves primary input | 让拖拽操作的结果进入 state 结算 |

**Deliverables:**
1. `src/state.js` — state 管理：init, update, checkEnding, getSummary
2. 导出函数：`initState()`, `settleWave(warnings, dangers)`, `checkEnding()`, `getState()`, `resetTokens()`

**settleWave 算法（核心）：**
```
for each zone in [A, B, C]:
  if zone is warned && zone has danger → quota -= zone.quota, injury_risk += 0, false_alarm += 0
  if zone is warned && zone has NO danger → quota -= zone.quota, false_alarm += 15
  if zone NOT warned && zone has danger → quota += 0, injury_risk += 25
  if zone NOT warned && zone has NO danger → quota += zone.quota
quota = clamp(quota, 0, 100)
```

**Acceptance:**
- 单元测试覆盖 4×3=12 种结算组合
- checkEnding 正确返回 5 种结局或 null
- resetTokens 正确重置 warning_tokens=3

**Forbidden:**
- 不操作 DOM
- 不渲染动画
- 不决定波次配置（由 content worker 提供）

---

## Worker 3: zhuiwu-yujing-content

| 字段 | 值 |
|------|---|
| lane | content |
| level | M |
| goal | 实现 5 种前兆动画 + 8 波危险配置 + 波次生成器 |
| serves primary input | 让玩家能观察到视觉前兆作为决策依据 |

**Deliverables:**
1. `src/content.js` — 前兆动画池 + 波次配置 + 波次生成器
2. 导出函数：`getWaveConfig(wave)`, `generatePrecursors(waveConfig)`, `createPrecursorAnimation(type, zoneEl)`

**波次生成逻辑：**
```
getWaveConfig(wave) → { dangerZones: [...], fakeZones: [...], precursorTypes: [...] }
  从 MECHANIC_SPEC 的 Per-Wave Danger Configuration 表读取参数
  随机选择危险 Zone 数量
  按假信号概率决定额外假信号 Zone
  按前兆模糊度选择前兆类型
```

**前兆动画：**
- 5 种前兆（大阴影/梁晃动/碎石/灰尘/裂缝）的 CSS 动画
- 每种动画必须对 Zone 有明确的视觉关联（出现在对应 Zone 的上方）

**Acceptance:**
- 8 波配置均可正确生成
- 每种前兆动画可在浏览器中显示
- 假信号与真实前兆视觉一致

**Forbidden:**
- 不操作 game state（由 state worker 管理）
- 不实现拖拽交互（由 ui worker 实现）
- 不决定结算结果

---

## Worker 4: zhuiwu-yujing-ui

| 字段 | 值 |
|------|---|
| lane | ui |
| level | M |
| goal | 实现拖拽交互 + 场景渲染 + HUD 更新 + 反馈动画 |
| serves primary input | 实现拖拽预警旗到 Zone 的完整交互链路 |

**Deliverables:**
1. `src/ui.js` — 场景渲染 + 拖拽系统 + HUD 更新 + 反馈动画
2. 导出函数：`renderScene(state)`, `initDragDrop(flagBar, zones, onFlagDrop, onFlagRecycle)`, `updateHUD(state)`, `showFeedback(type, zone)`, `showPhase(phase)`, `showWaveSummary(summary)`

**拖拽实现要求：**
- 使用 HTML5 Drag & Drop API 或 pointer events
- Flag Bar 中的旗可拖拽到 Zone
- 已放置的旗可点击回收
- tokens 为 0 时禁止拖拽
- 非前兆期禁止拖拽和回收
- 触屏兼容（touch events 或 pointer events fallback）

**Acceptance:**
- 拖拽旗到 Zone → Zone 高亮 + 旗出现 + tokens 减少
- 点击 Zone 内旗 → 旗回 Flag Bar + Zone 恢复
- HUD 实时反映 state 变化
- 3 层反馈（即时/结算/波次）均有视觉效果

**Forbidden:**
- 不操作 game state（由 state worker 管理）
- 不决定结算逻辑
- 不使用 alert/prompt/confirm

---

## Worker 5: zhuiwu-yujing-integration

| 字段 | 值 |
|------|---|
| lane | integration |
| level | M |
| goal | 将 state + content + ui 接成完整主循环，使 ACCEPTANCE_PLAYTHROUGH 可试玩 |
| serves primary input | 让拖拽操作从 UI → state 结算 → 反馈 完整闭环 |

**Deliverables:**
1. 修改 `src/main.js` — 将占位逻辑替换为 state/content/ui 的真实调用
2. 确保波次循环完整：前兆期（content 生成+ui 渲染）→ 拖拽（ui 交互）→ 决策锁定 → 结算（state）→ 反馈（ui）→ 下一波/结局

**集成要求：**
- 前兆期开始时调用 content.generatePrecursors + content.createPrecursorAnimation
- 拖拽回调中更新 state（warning_tokens 减少/恢复）
- 决策锁定时调用 ui 禁用拖拽
- 结算时调用 state.settleWave + ui.showFeedback + ui.showWaveSummary
- 结局时调用 state.checkEnding + 显示结局画面

**Acceptance:**
- ACCEPTANCE_PLAYTHROUGH.md 的 Wave 1-3 可完整试玩
- 每步的 state 变化与试玩脚本一致
- Quick Regression Checklist 的 8 项全部通过

**Forbidden:**
- 不新增游戏机制
- 不修改结算公式
- 不偏离 Direction Lock

---

## Worker 6: zhuiwu-yujing-qa

| 字段 | 值 |
|------|---|
| lane | qa |
| level | S |
| goal | 验证 ACCEPTANCE_PLAYTHROUGH.md 和 Quick Regression Checklist |
| serves primary input | 确认拖拽交互在整个核心循环中正确工作 |

**Deliverables:**
1. `tests/state.test.js` — state 模块单元测试（12 种结算组合 + 5 种结局检测）
2. QA report（在 worker report 中记录手工验证结果）

**Acceptance:**
- 所有 state 单元测试通过
- Quick Regression Checklist 8 项全部 ✓
- 5 种结局均可触发

**Forbidden:**
- 不修改游戏代码修复 bug（记录 bug 回交 manager）
- 不修改 plan 文件
