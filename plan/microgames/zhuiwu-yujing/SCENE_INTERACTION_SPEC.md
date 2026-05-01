# SCENE_INTERACTION_SPEC: 坠物预警

## Scene Objects

- 塔上阴影
- 晃动梁
- 工人区域
- 预警旗
- 产量表

## Player Input

- primary_input: 观察坠物前兆并点击/拖拽预警信号到危险区域
- minimum_interaction: 玩家必须在有限 warning_tokens 内对具体区域发出或保留预警，权衡 quota 与 injury_risk

## Feedback Channels

- 阴影变化
- 预警次数
- 工人躲避动画/状态
- quota 损失

## Forbidden UI

- 不允许做动作闪避
- 不允许只用“预警/不预警”全局按钮

## Acceptance Rule

- 首屏必须让玩家看到至少一个可直接操作的场景对象
- 玩家操作必须产生即时可见反馈，且反馈能追溯到 Required State
- 不得只靠随机事件文本或普通选择按钮完成主循环
