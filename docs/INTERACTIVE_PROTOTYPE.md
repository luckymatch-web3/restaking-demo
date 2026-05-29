# Restake One 交互原型说明

版本：v0.1  
日期：2026-05-28  
用途：指导前端实现一个可点击、可演示、可测试的本地 demo

## 1. 原型目标

这个交互原型需要让用户在 3 分钟内理解并完成一次模拟 restaking：

1. 我有什么 LST/LRT 资产可以再质押。
2. 我可以把资产委托给哪个 operator。
3. 我可以覆盖哪些 AVS。
4. 我预计获得多少收益。
5. 我承担什么 slashing 和 operator 风险。
6. 我确认后能看到 mock tx hash、仓位和活动记录。

原型不要求真实钱包、真实链、真实签名、真实资金流。所有链上动作都用本地状态模拟。

## 2. 信息架构

当前实现采用单页工作台，首屏就是可操作产品，不做 landing page。

```text
/
  Topbar
  Protocol stats
  Restake builder
  Yield and risk preview
  Active positions
  Activity ledger
```

## 3. 全局布局

### 3.1 顶部栏

| 元素 | 说明 |
| --- | --- |
| 产品名 | Restake One |
| 页面标题 | Risk Control Workbench |
| 网络状态 | Local Restaking Sandbox |
| 钱包状态 | 未连接显示 Connect wallet；已连接显示 demo address |

### 3.2 Demo 提示

Preview warning 中必须稳定出现：

> Demo only: no real wallet signature, chain transaction, or funds movement will be submitted.

中文界面可对应：

> 当前为本地模拟 demo，不请求真实钱包签名，不提交真实链上交易，不移动真实资产。

## 4. 首屏工作台

### 4.1 未连接状态

页面仍展示协议统计、资产、operator、AVS 和仓位，但 Preview risk / Confirm restake 必须不可用。

| 区域 | 内容 |
| --- | --- |
| 顶部按钮 | Connect wallet |
| Builder 状态 | Wallet required |
| Disabled 原因 | 用户必须先连接 demo wallet |

交互：

1. 点击 Connect wallet。
2. 按钮进入 Connecting loading。
3. 成功后顶部显示 `0xA17e9C42f6B3a2D91f4C8B0e13E7dA5bC92F18a4`。
4. Builder 状态变为 Wallet ready。

### 4.2 已连接状态

| 区域 | 内容 |
| --- | --- |
| Protocol stats | Total secured、Average APY、Operators、Risk buffer |
| Restake builder | Asset、Operator、AVS coverage、Amount |
| Preview panel | Slashing exposure、Projected APY、Monthly reward、fees、warnings |
| Portfolio | Active positions |
| Ledger | Activity |

## 5. Restake Builder

### 5.1 Asset

展示资产卡片：

| Asset | Balance | Price | Base APY |
| --- | ---: | ---: | ---: |
| stETH | 12.4000 | $3,640 | 3.10% |
| rETH | 7.8000 | $3,745 | 3.35% |
| cbETH | 5.6000 | $3,588 | 2.95% |
| swETH | 9.0500 | $3,612 | 3.55% |

选择行为：

1. 点击资产卡片选中。
2. 选中资产高亮。
3. Amount helper 展示该资产 balance 和 current restaked。

### 5.2 Operator

展示 operator 卡片：

| Operator | Commission | Uptime | Delegated | Risk |
| --- | ---: | ---: | ---: | --- |
| Northstar Nodeworks | 8% | 99.98% | 428.4K ETH | Low |
| Kairos Validators | 6% | 99.93% | 291.9K ETH | Medium |
| Helix Restake Labs | 4% | 99.85% | 118.7K ETH | High |

选择行为：

1. 默认选中第一个 operator。
2. 点击卡片切换 operator。
3. 切换后，当前 operator 不支持的 AVS 自动取消或禁用。

### 5.3 AVS Coverage

展示 AVS 卡片：

| AVS | Category | Reward boost | Risk |
| --- | --- | ---: | --- |
| Proof Oracle | Oracle | +1.35 | Low |
| Rollup Watch | Security | +1.85 | Medium |
| MEV Relay Shield | MEV | +2.20 | High |
| Data Availability Mesh | DA | +1.65 | Medium |

选择行为：

1. 支持多选。
2. 高风险 AVS 必须显示 High 标签。
3. 当前 operator 不支持的 AVS 禁用，并显示 Not supported by operator。

### 5.4 Amount

| 字段 | 说明 |
| --- | --- |
| Amount | 用户输入再质押数量 |
| Max | 自动填入当前资产可用余额 |
| Helper | 展示 balance 和 current restaked |

校验：

| 场景 | 提示 |
| --- | --- |
| 空值 | 不能 Preview risk |
| 0 或负数 | Enter an amount greater than 0 |
| 超过余额 | no more than the available balance |
| 修改参数 | 旧 preview 作废，需要重新 Preview risk |

## 6. Preview Panel

点击 Preview risk 后，调用 `/api/restake/preview`。

返回后展示：

| 字段 | 说明 |
| --- | --- |
| Slashing exposure | 模拟罚没暴露百分比 |
| Projected APY | 组合预计 APY |
| Monthly reward | 模拟月收益 |
| Operator fee | operator 费用 |
| Protocol fee | 协议费用 |
| Gas estimate | mock gas 估算 |
| Exposure | 本次再质押 USD 暴露 |
| Route summary | Asset -> Operator -> AVS count |
| Warnings | demo-only、AVS、operator、仓位集中度提示 |

如果用户修改 asset、operator、AVS 或 amount：

1. 清空已确认状态。
2. 清空旧 preview。
3. Confirm restake 不可用，直到重新 Preview risk。

## 7. Confirm Restake

Confirm restake 按钮可用条件：

1. 已连接模拟钱包。
2. 当前 draft 有有效 preview。
3. amount 大于 0 且不超过 balance。
4. 至少选择一个 AVS。

点击后调用 `/api/restake/confirm`。

成功后：

| 区域 | 行为 |
| --- | --- |
| Preview panel | 显示 Restake confirmed 和 mock tx hash |
| Asset card | balance 减少，restaked 增加 |
| Active positions | 新仓位插入列表顶部 |
| Activity | 写入“再质押交易已确认” |
| Confirm button | 变为 Confirmed 并 disabled |

失败后：

| 场景 | 表现 |
| --- | --- |
| 未连接钱包 | 展示 WALLET_NOT_CONNECTED |
| 超余额 | 展示 Amount exceeds available balance |
| AVS 不被 operator 支持 | 展示 Operator does not support ... |
| 未知错误 | 展示可读错误，不生成仓位 |

## 8. Active Positions

列表字段：

| 字段 | 示例 |
| --- | --- |
| Amount + Asset | 1.25 stETH |
| Operator | Northstar Nodeworks |
| AVS | Proof Oracle, Rollup Watch |
| USD Value | $4,550 |
| APY | 5.36% |
| Risk | Low / Medium / High |

MVP 不提供真实退出/提现。后端提供 mock exit endpoint，前端当前不把它作为主流程。

## 9. Activity

活动类型：

| 类型 | 示例 |
| --- | --- |
| wallet_connected | 模拟钱包已连接 |
| preview_created | 再质押预览已生成 |
| restake_confirmed | 再质押交易已确认，展示 mock tx hash |
| exit_requested | 退出队列已创建 |

## 10. 推荐 Mock 数据

| 类型 | 当前值 |
| --- | --- |
| Wallet address | 0xA17e9C42f6B3a2D91f4C8B0e13E7dA5bC92F18a4 |
| Network | Local Restaking Sandbox |
| Assets | stETH、rETH、cbETH、swETH |
| Operators | Northstar Nodeworks、Kairos Validators、Helix Restake Labs |
| AVS | Proof Oracle、Rollup Watch、MEV Relay Shield、Data Availability Mesh |

## 11. 前端验收清单

| 编号 | 验收点 |
| --- | --- |
| UI-001 | 未连接钱包时，用户能看到明确连接入口 |
| UI-002 | 无钱包插件时，点击连接不报错 |
| UI-003 | 首屏就是可操作工作台 |
| UI-004 | 金额校验即时反馈，不等到提交才提示 |
| UI-005 | 确认前必须展示收益、费用和风险 |
| UI-006 | Confirm 后 mock tx hash 和成功状态可见 |
| UI-007 | Success 后 Active positions 出现新仓位 |
| UI-008 | 刷新页面后 mock 数据行为符合后端约定 |
| UI-009 | 所有真实资金相关表述都避免误导 |
