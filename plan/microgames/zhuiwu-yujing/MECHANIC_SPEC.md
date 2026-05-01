# MECHANIC_SPEC: 坠物预警

## Primary Mechanic

- mechanic: 危险模式识别 + 信号次数限制 + 产量损失
- primary_input: 观察坠物前兆并点击/拖拽预警信号到危险区域
- minimum_interaction: 玩家必须在有限 warning_tokens 内对具体区域发出或保留预警，权衡 quota 与 injury_risk

## Mechanic Steps

1. 观察前兆图案
2. 判断区域风险
3. 投放预警旗或继续工作
4. 结算 false_alarm/quota/injury_risk

## State Coupling

每次有效操作必须同时推动两类后果：

- 生存/资源/进度压力：从 Required State 中选择至少一个直接变化
- 关系/风险/秩序压力：从 Required State 中选择至少一个直接变化

## Not A Choice List

- 不能只展示 2-4 个文字按钮让玩家选择
- UI worker 必须把 primary input 映射到场景对象操作
- integration worker 必须让这个操作进入状态结算，而不是只写叙事反馈
