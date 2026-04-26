# CREATIVE_CARD: 坠物预警

- slug: `zhuiwu-yujing`
- creative_line: 坠物预警
- target_runtime: web
- target_minutes: 20
- core_emotion: 危险模式识别 + 信号次数限制 + 产量损失
- core_loop: 观察前兆 -> 发出预警或继续工作 -> 工人反应 -> 事故/产量结算 -> 下一波
- failure_condition: 关键状态崩溃，或在本轮主循环中被系统淘汰
- success_condition: 在限定时长内完成主循环，并稳定进入至少一个可结算结局

## Intent

- 做一个 Babel 相关的单创意线微游戏
- 只保留一个主循环，不扩成大项目
- 让 Claude worker 能按固定 packet 稳定并行
