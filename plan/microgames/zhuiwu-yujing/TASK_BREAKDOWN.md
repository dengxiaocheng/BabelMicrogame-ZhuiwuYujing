# TASK_BREAKDOWN: 坠物预警

## Standard Worker Bundle

1. `zhuiwu-yujing-foundation`
   - lane: foundation
   - level: M
   - goal: 建立只服务「观察前兆 -> 发出预警或继续工作 -> 工人反应 -> 事故/产量结算 -> 下一波」的可运行骨架

2. `zhuiwu-yujing-state`
   - lane: logic
   - level: M
   - goal: 实现 Direction Lock 状态的一次分配/操作结算

3. `zhuiwu-yujing-content`
   - lane: content
   - level: M
   - goal: 用事件池强化「危险模式识别 + 信号次数限制 + 产量损失」

4. `zhuiwu-yujing-ui`
   - lane: ui
   - level: M
   - goal: 让玩家看见核心压力、可选操作和后果反馈

5. `zhuiwu-yujing-integration`
   - lane: integration
   - level: M
   - goal: 把已有 state/content/ui 接成单一主循环

6. `zhuiwu-yujing-qa`
   - lane: qa
   - level: S
   - goal: 用测试和 scripted playthrough 确认方向没跑偏
