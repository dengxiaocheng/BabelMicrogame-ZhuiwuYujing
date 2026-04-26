# MINI_GDD: 坠物预警

## Scope

- runtime: web
- duration: 20min
- project_line: 坠物预警
- single_core_loop: 观察前兆 -> 发出预警或继续工作 -> 工人反应 -> 事故/产量结算 -> 下一波

## Core Loop
1. 执行核心循环：观察前兆 -> 发出预警或继续工作 -> 工人反应 -> 事故/产量结算 -> 下一波
2. 按 20 分钟节奏推进：明显前兆 -> 多区域 -> 假信号 -> 模糊前兆和高惩罚

## State

- resource
- pressure
- risk
- relation
- round

## UI

- 只保留主界面、结果反馈、结算入口
- 不加多余菜单和后台页

## Content

- 用小型事件池支撑主循环
- 一次只验证一条 Babel 创意线

## Constraints

- 总体规模目标控制在 5000 行以内
- 单个 worker 任务必须服从 packet budget
- 如需扩线，交回 manager 重新拆
