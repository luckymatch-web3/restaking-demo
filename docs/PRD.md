# Restake One Demo MVP PRD

版本：v0.1  
日期：2026-05-28  
文档对象：投资人、产品、前端、后端、测试 agent

## 1. 产品定位

Restake One 是一个可本地运行的 Web3 restaking（再质押）演示 demo。它不连接真实钱包、不上真实链、不托管真实资产，而是用模拟钱包、模拟 LST/LRT 资产、模拟 operator/AVS、模拟收益和 mock tx hash，跑通用户从“理解收益与风险”到“确认再质押并查看仓位”的完整闭环。

投资人视角：展示产品叙事、核心用户路径、风险控制台信息架构，以及未来接入真实链后的商业扩展空间。  
开发视角：提供清晰页面、状态、数据字段、API 契约和验收标准，方便前端、后端、测试并行实现。

## 2. MVP 目标

MVP 必须在无真实钱包、无真实链、无真实资金的本地环境中完成以下流程：

1. 用户点击连接模拟钱包。
2. 用户看到模拟资产余额与可再质押资产。
3. 用户选择资产、operator 和多个 AVS。
4. 用户输入再质押数量。
5. 系统展示预计 APY、月收益、费用、gas 估算、slashing exposure 和风险提示。
6. 用户确认模拟再质押。
7. 系统返回 mock tx hash，更新余额、仓位和活动流。
8. 用户在工作台查看本金、收益、风险、operator、AVS 和活动记录。

## 3. MVP 范围

| 模块 | 说明 |
| --- | --- |
| 模拟钱包 | 一键连接、展示 mock 地址、网络名和余额 |
| 资产选择 | 支持 stETH、rETH、cbETH、swETH 四种模拟资产 |
| Operator 选择 | 展示名称、佣金、uptime、风险评分、委托规模和说明 |
| AVS 选择 | 支持多选，展示类别、APY boost、风险等级和 operator 支持状态 |
| 再质押表单 | 输入数量、Max、余额校验、preview 和 confirm |
| 风险提示 | 确认前展示 slashing exposure、warnings 和 demo-only 提示 |
| 模拟确认 | confirm 后立即返回 mock tx hash，生成 active 仓位 |
| 仓位列表 | 展示资产数量、USD 价值、APY、operator、AVS、风险等级 |
| 活动流 | 展示 wallet connected、preview created、restake confirmed、exit requested |
| 自动化测试 | API smoke + Playwright 桌面主流程和移动 smoke |

## 4. 明确不做

| 不做 | 原因 |
| --- | --- |
| 真实钱包连接 | 避免钱包插件、签名、网络差异影响 demo |
| 真实链上交易 | MVP 聚焦产品闭环，不处理 RPC、gas、合约状态 |
| 真实资金托管 | 不涉及资金安全、托管责任、合约审计 |
| 真实收益结算 | 收益为模拟值，仅用于演示信息架构 |
| 跨链桥 | 超出 demo 范围，放入后续路线图 |
| 合约审计 | 无真实合约，不做审计承诺 |
| KYC/合规流程 | 本地 demo 不涉及真实投资行为 |

## 5. 用户角色

| 角色 | 目标 | 关注点 |
| --- | --- | --- |
| Crypto 持币用户 | 理解资产如何再质押并查看潜在收益 | 操作简单、收益清晰、风险可见 |
| 投资人/合作方 | 判断产品是否有清晰闭环和扩展空间 | 转化路径、风险表达、路线图 |
| 前端开发 | 快速实现可点击 demo | 页面结构、状态、字段、文案 |
| 后端开发 | 提供 mock API 和内存账本 | API 契约、数据模型、错误码 |
| 测试 agent | 验证本地闭环是否可跑通 | 验收标准、边界场景、状态覆盖 |

## 6. 核心用户路径

```text
进入工作台
  -> 模拟连接钱包
  -> 查看可用资产
  -> 选择资产
  -> 选择 operator
  -> 选择多个 AVS
  -> 输入数量
  -> Preview risk
  -> 查看收益、费用和风险
  -> Confirm restake
  -> 查看 mock tx hash、新仓位和活动记录
```

## 7. 核心页面

当前 MVP 是单页工作台，不做 landing page。

| 区域 | 目标 | 核心内容 |
| --- | --- | --- |
| Topbar | 展示产品和钱包状态 | Restake One、Ethereum Preview、Connect wallet 或 demo address |
| Protocol stats | 展示协议规模感 | total secured、average APY、operators、risk buffer |
| Restake builder | 完成用户输入 | asset、operator、AVS coverage、amount、Preview risk、Confirm restake |
| Preview panel | 确认前风险控制 | slashing exposure、projected APY、monthly reward、fees、warnings |
| Active positions | 展示确认结果 | amount、asset、operator、AVS、USD value、APY、risk |
| Activity | 展示 mock 操作记录 | preview、confirm、wallet connected、tx hash |

## 8. 状态与交互

| 状态 | 用户可做 | 用户不可做 |
| --- | --- | --- |
| walletDisconnected | 查看模拟市场数据、连接钱包 | preview/confirm |
| walletConnecting | 等待连接 | 重复点击连接 |
| walletConnected | 选择资产、operator、AVS、输入数量 | 无 |
| previewLoading | 等待收益和风险预览 | confirm |
| previewReady | 查看风险并确认 | 无 |
| previewStale | 重新 Preview risk | 使用旧 preview confirm |
| confirming | 等待 mock confirm | 重复提交 |
| confirmed | 查看 tx hash、新仓位和活动 | 重复提交同一 draft |
| error | 修改输入或重试 | 生成仓位 |

## 9. 核心数据字段

### Wallet

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| connected | boolean | 是否已连接模拟钱包 |
| address | string | mock 地址 |
| chain | string | Local Restaking Sandbox |
| balances | Record<string, number> | 各资产余额 |

### Asset

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | steth、reth、cbeth、sweth |
| symbol | string | 资产符号 |
| name | string | 资产名称 |
| balance | number | 可用余额 |
| priceUsd | number | mock USD 单价 |
| baseApy | number | 基础 APY |
| restaked | number | 已再质押数量 |

### Operator

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | Operator ID |
| name | string | 名称 |
| location | string | 运行地区 |
| uptime | number | 正常运行率 |
| commission | number | 佣金百分比 |
| delegatedEth | number | 已委托 ETH |
| riskScore | number | 风险评分，越高风险越高 |
| insuranceCoverage | number | 模拟保险覆盖 |
| supportedAvsIds | string[] | 支持的 AVS |

### AVS

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | AVS ID |
| name | string | 名称 |
| category | string | Oracle、Security、MEV、DA |
| rewardBoost | number | APY boost |
| riskLevel | low/medium/high | 风险等级 |
| description | string | 简短说明 |

### RestakePreview

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| amountUsd | number | 本次模拟暴露美元价值 |
| projectedApy | number | 预计 APY |
| monthlyRewardUsd | number | 预计月收益 |
| operatorFeeUsd | number | operator fee |
| protocolFeeUsd | number | protocol fee |
| estimatedGasUsd | number | mock gas 估算 |
| slashingExposurePct | number | 模拟罚没暴露 |
| warnings | string[] | 风险和 demo-only 提示 |

## 10. 业务规则

| 编号 | 规则 |
| --- | --- |
| BR-001 | 未连接模拟钱包时，不能 Preview risk 或 Confirm restake |
| BR-002 | 输入数量必须大于 0 |
| BR-003 | 输入数量不能超过资产可用 balance |
| BR-004 | 至少选择 1 个 AVS |
| BR-005 | operator 不支持的 AVS 不可选择 |
| BR-006 | preview 后修改资产、operator、AVS 或数量，旧 preview 作废 |
| BR-007 | confirming 或 confirmed 状态禁止重复提交同一 draft |
| BR-008 | confirmed 后必须生成 active 仓位 |
| BR-009 | 高风险 AVS 或高风险 operator 必须展示 warning |
| BR-010 | 当前 demo 金额以 number 传输，生产化再改 decimal string 或最小单位整数 |

## 11. 验收标准

| 编号 | 标准 |
| --- | --- |
| AC-001 | 本地启动后，不安装钱包插件也能完成完整 demo |
| AC-002 | 用户可模拟连接钱包 |
| AC-003 | 用户可看到至少 4 个资产、3 个 operator、4 个 AVS |
| AC-004 | 用户可选择资产、operator、多个 AVS 并输入合法数量 |
| AC-005 | 数量超过余额时必须阻止提交并提示原因 |
| AC-006 | 用户确认后能看到 mock tx hash 和成功状态 |
| AC-007 | 成功后能在 Active positions 看到新仓位 |
| AC-008 | 仓位展示本金、APY、风险、operator、AVS |
| AC-009 | API 错误格式统一，前端能展示可读错误 |
| AC-010 | 页面上明确标识为模拟 demo，不能暗示真实收益或真实资金移动 |

## 12. 后续路线图

1. 接真实钱包：MetaMask、WalletConnect、链切换和签名确认。
2. 接测试网合约：真实 deposit/undelegate/withdraw 状态机。
3. 风险模型升级：operator slash history、AVS correlation、保险覆盖。
4. 收益结算：按 epoch 更新 rewards，并支持历史收益图。
5. 退出流程：exit queue、cooldown、claim。
6. 机构版：多钱包、多策略、审批流、导出报表。
