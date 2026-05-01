# ACCEPTANCE_PLAYTHROUGH: 坠物预警

## Scripted Playthrough

### Wave 1（教学波）
**初始 state**: warning_tokens=3, quota=100, injury_risk=0, false_alarm=0, wave=1

| 步骤 | 操作 | 预期结果 | State 变化 |
|------|------|---------|-----------|
| 1 | 开局 | 显示场景布局（塔+3 Zone+Flag Bar+HUD），HUD 显示初始值 | - |
| 2 | 观察前兆 | Zone B 上方出现"大阴影"动画，持续 2s | - |
| 3 | 拖旗到 Zone B | Flag Bar 减少 1 旗，Zone B 底色变黄，工人闪烁 | tokens: 3→2 |
| 4 | 等待前兆期结束 | 显示"决策锁定"，工人撤离动画 | - |
| 5 | 结算 | Zone B 有坠物+已预警→安全停工。Zone A/C 无坠物→正常贡献 | quota: 100+4+4-5=103→clamp(100)=100, injury_risk=0, false_alarm=0 |
| 6 | 波结束 summary | "+8 quota（A:4, C:4），-5 停工（B），净 +3" | wave: 1→2 |

### Wave 2（教学波 - 误报）
**初始 state**: warning_tokens=3, quota=100, injury_risk=0, false_alarm=0, wave=2

| 步骤 | 操作 | 预期结果 | State 变化 |
|------|------|---------|-----------|
| 1 | 观察前兆 | Zone A 上方出现"梁晃动"动画 | - |
| 2 | 拖旗到 Zone A | Zone A 标记预警 | tokens: 3→2 |
| 3 | 等待结算 | Zone A 无坠物（假信号 10%）→误报 | quota: 100+5+4-4=109→100, false_alarm: 0+15=15 |
| 4 | 波结束 summary | "+9 quota（B:5, C:4），-4 误报停工（A），false_alarm +15" | wave: 2→3 |

### Wave 3（压力波 - 漏报）
**初始 state**: warning_tokens=3, quota=100, injury_risk=0, false_alarm=15, wave=3

| 步骤 | 操作 | 预期结果 | State 变化 |
|------|------|---------|-----------|
| 1 | 观察前兆 | Zone B 出现"碎石掉落"动画，同时 Zone C 出现"大阴影" | - |
| 2 | 拖旗到 Zone B | Zone B 标记预警 | tokens: 3→2 |
| 3 | 不操作 Zone C | Zone C 未预警 | tokens 不变 |
| 4 | 等待结算 | Zone B 有坠物+预警→安全。Zone C 有坠物+未预警→事故！ | quota: 100+4-5=99, injury_risk: 0+25=25 |
| 5 | 波结束 summary | "Zone C 事故！injury_risk +25。+4 quota（A），-5 停工（B）" | wave: 3→4 |

## Full Game Completion Check

必须验证以下 5 种结局均可触发：

| 结局 | 触发路径 | 验证方法 |
|------|---------|---------|
| 好结局 | 完成所有 8 波，quota>=60 且 injury_risk<50 | 按上述策略完成 8 波 |
| 普通结局 | 完成 8 波但不满足好结局条件 | 全部误报到 wave 8 |
| 工伤结局 | injury_risk>=100 | 连续 4 次漏报真坠物（4×25=100） |
| 信任结局 | false_alarm>=100 | 连续 7 次误报（7×15=105>100） |
| 产量结局 | quota<=0 | 每波都预警所有 Zone 且无坠物，净损失积累 |

## Quick Regression Checklist

QA worker 必须验证以下 8 项：

1. [ ] 开局可见 3 Zone + Flag Bar + HUD，无 alert/prompt
2. [ ] 可拖拽旗到 Zone，Zone 出现旗图标+高亮
3. [ ] 可点击 Zone 内旗回收，旗回到 Flag Bar
4. [ ] tokens 用完后无法再拖拽
5. [ ] 决策锁定后无法拖拽或回收
6. [ ] 结算时 HUD 数值正确更新
7. [ ] 任意失败结局触发后显示结局画面
8. [ ] 好结局/普通结局只在 wave=8 后触发

## Direction Gate

- integration worker 必须让上述 Wave 1-3 流程可试玩
- qa worker 必须用测试或手工记录验证 Quick Regression Checklist
- 如试玩要求需要偏离 Direction Lock，停止并回交 manager
