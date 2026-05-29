# Restake One Demo 测试计划

版本：v0.1  
日期：2026-05-28  
用途：指导测试 agent 验证本地 mock demo 是否达到 MVP 验收标准

## 1. 测试目标

验证项目在无真实钱包、无真实链、无真实资金环境中，可以稳定跑通 restaking MVP 闭环：

```text
模拟连接钱包
  -> 选择资产
  -> 选择 operator
  -> 选择 AVS
  -> 输入数量
  -> 查看收益和风险预览
  -> 确认模拟再质押
  -> 查看仓位、收益、风险
```

当前可运行 demo 采用 `/api/restake/preview` 和 `/api/restake/confirm` 两个接口完成预览与确认；不会创建独立的 quote/transaction 资源，也不会轮询真实链状态。

## 2. 测试范围

### 2.1 范围内

| 类型 | 内容 |
| --- | --- |
| 功能测试 | 钱包、资产、operator、AVS、风险预览、模拟确认、仓位 |
| 状态测试 | loading、empty、error、disabled、success、failed |
| 表单测试 | 数量输入、余额校验、小数位校验 |
| API 契约测试 | response schema、错误码、状态推进 |
| 集成测试 | 前端与 mock API 完整闭环 |
| 文案测试 | 不误导用户为真实交易或真实收益 |
| 回归测试 | happy path 和关键异常路径稳定 |

### 2.2 范围外

| 不测 | 原因 |
| --- | --- |
| 真实钱包插件兼容 | MVP 不接真实钱包 |
| 真实链交易 | MVP 不接 RPC 和合约 |
| 合约安全审计 | 无真实合约 |
| 跨链桥 | 不在 demo 范围 |
| 真实收益结算 | 收益为模拟值 |
| 法务/KYC | 本地 demo 不涉及真实投资 |

## 3. 测试环境

| 项 | 要求 |
| --- | --- |
| 运行环境 | 本地开发环境 |
| 钱包插件 | 不需要 |
| 区块链 RPC | 不需要 |
| 网络 | 不依赖外部服务 |
| 数据 | 使用固定 mock 数据 |
| 浏览器 | Chrome 或 Chromium 优先 |

环境验收：

1. 断网或无外部 RPC 时，demo 主流程仍可运行。
2. 未安装 MetaMask 等钱包插件时，连接模拟钱包不报错。
3. API 不向真实链 RPC、钱包扩展、第三方交易服务发起请求。

## 4. 测试数据基线

| 类型 | 最低要求 |
| --- | --- |
| 资产 | 至少 stETH、rETH、cbETH 三个 LST/LRT 类资产 |
| Operator | 至少 3 个，覆盖 Low、Medium、High 风险 |
| AVS | 至少 3 个，覆盖不同 APR 和风险等级 |
| 初始仓位 | 可为空 |
| 初始交易 | 可为空 |

推荐 happy path 数据：

| 字段 | 值 |
| --- | --- |
| Asset | stETH |
| Amount | 1.250000 |
| Operator | Northstar Nodeworks |
| AVS | Proof Oracle + Data Availability Mesh |
| Expected Risk | Low/Medium |
| Expected Tx Result | Demo confirmed |

## 5. MVP 验收标准

| 编号 | 验收标准 | 优先级 |
| --- | --- | --- |
| AC-001 | 不安装钱包插件也能完成主流程 | P0 |
| AC-002 | 模拟钱包可连接、可断开 | P0 |
| AC-003 | 资产、operator、AVS 列表可正常展示 | P0 |
| AC-004 | 用户可以完成合法 preview 并看到收益/费用/风险 | P0 |
| AC-005 | 超余额、非法数量、未连接钱包必须阻止提交 | P0 |
| AC-006 | 模拟确认后显示 tx hash 和成功状态 | P0 |
| AC-007 | 交易成功后生成 Active 仓位 | P0 |
| AC-008 | 仓位展示本金、收益、APR、风险、operator、AVS | P0 |
| AC-009 | 文案明确说明 demo 和模拟数据 | P1 |
| AC-010 | API 错误格式统一，前端能展示可读错误 | P1 |

## 6. 功能测试用例

### 6.1 模拟钱包

| ID | 场景 | 步骤 | 预期 |
| --- | --- | --- | --- |
| WAL-001 | 未连接初始状态 | 打开首页 | 显示 Connect Demo Wallet，资产和仓位不可操作 |
| WAL-002 | 连接模拟钱包 | 点击 Connect wallet | 顶部栏显示 demo address，资产列表可见 |
| WAL-003 | 无真实钱包依赖 | 不安装钱包插件点击 Connect wallet | 连接仍成功 |
| WAL-004 | 无钱包插件 | 浏览器不安装钱包插件运行 | 连接流程仍成功 |

### 6.2 资产选择

| ID | 场景 | 步骤 | 预期 |
| --- | --- | --- | --- |
| AST-001 | 展示资产列表 | 打开工作台 | 至少展示 stETH、rETH、cbETH |
| AST-002 | 选择可用资产 | 进入 Restake，选择 stETH | Continue 可用，资产高亮 |
| AST-003 | 不可用资产 | mock 一个 availableBalance=0 资产 | Restake 不可点击或 Continue 不可用 |

### 6.3 Operator 与 AVS

| ID | 场景 | 步骤 | 预期 |
| --- | --- | --- | --- |
| OAVS-001 | 选择 operator | 选择 Northstar Nodeworks | 显示佣金、uptime、风险 |
| OAVS-002 | 选择 AVS | 选择 Proof Oracle | 显示 APY boost、类别、风险说明 |
| OAVS-003 | 高风险组合 | 选择高风险 operator 或 AVS | 确认前展示 High 风险提示 |
| OAVS-004 | inactive AVS | mock 一个 active=false AVS | 不可选择，并显示不可用状态 |

### 6.4 数量与 Quote

| ID | 场景 | 输入 | 预期 |
| --- | --- | --- | --- |
| QTE-001 | 合法金额 | 1.250000 | preview 成功，显示 APY、月收益、费用、风险 |
| QTE-002 | 空金额 | 空 | 提示 Enter an amount，不能提交 |
| QTE-003 | 零金额 | 0 | 提示 Amount must be greater than 0 |
| QTE-004 | 负数 | -1 | 提示 Amount must be greater than 0 |
| QTE-005 | 超过余额 | 999 | 提示 Amount exceeds available balance |
| QTE-006 | 修改参数 | preview 后修改资产/operator/AVS/数量 | 旧 preview 在前端作废，需要重新 Preview risk |

### 6.5 模拟交易

| ID | 场景 | 步骤 | 预期 |
| --- | --- | --- | --- |
| TX-001 | 成功确认 | 使用合法 preview 点击 Confirm restake | 返回 tx hash，生成 active 仓位 |
| TX-002 | 防重复提交 | Confirming 或已确认状态再次点击 | 按钮 disabled |
| TX-003 | 未预览确认 | 不生成 preview 直接确认 | 前端阻止并提示 |
| TX-004 | 未连接提交 | 断开钱包后提交交易 | 返回 WALLET_NOT_CONNECTED |

### 6.6 仓位

| ID | 场景 | 步骤 | 预期 |
| --- | --- | --- | --- |
| POS-001 | 成功生成仓位 | TX-001 成功后进入 Positions | 新增 Active 仓位 |
| POS-002 | 仓位字段完整 | 打开仓位详情 | 展示本金、当前价值、累计收益、APR、风险、operator、AVS |
| POS-003 | 活动记录关联 | 查看 Activity | 能看到确认活动和 mock tx hash |
| POS-004 | 空仓位 | 初始无交易时进入 Positions | 显示空态，不报错 |

## 7. API 契约测试

| ID | Endpoint | 测试点 | 预期 |
| --- | --- | --- | --- |
| API-001 | GET /api/health | 服务健康 | ok=true, mode=mock |
| API-002 | GET /api/bootstrap | 初始快照 | 返回 wallet、assets、operators、avs、positions、activity |
| API-003 | POST /api/wallet/connect | 连接钱包 | 返回固定 demo address |
| API-004 | POST /api/restake/confirm | 未连接提交 | 401 WALLET_NOT_CONNECTED |
| API-005 | POST /api/restake/preview | 合法 preview | 返回 projectedApy、monthlyRewardUsd、risk warnings |
| API-006 | POST /api/restake/preview | 超余额 | 400 AMOUNT_EXCEEDS_BALANCE |
| API-007 | POST /api/restake/preview | operator 不支持 AVS | 400 UNSUPPORTED_AVS |
| API-008 | POST /api/restake/confirm | 合法确认 | 201，返回 txHash 和新仓位 |
| API-009 | GET /api/portfolio | 确认后快照 | 返回包含新仓位的 positions |
| API-010 | POST /api/positions/:id/exit | active 仓位退出 | 状态变为 exiting |

## 8. 端到端 Happy Path

| 步骤 | 操作 | 预期 |
| --- | --- | --- |
| 1 | 打开首页 | 看到 demo 提示和连接按钮 |
| 2 | 连接模拟钱包 | 顶部显示 0xA17e...9C42 |
| 3 | 选择 stETH | stETH 被选中 |
| 4 | 选择 Northstar Nodeworks | operator 详情可见 |
| 5 | 选择 Proof Oracle 和 Data Availability Mesh | AVS 详情和 APY boost 可见 |
| 6 | 输入 1.25 并点击 Preview risk | preview 成功，展示收益和风险 |
| 7 | 点击 Confirm restake | 显示 Restake confirmed 和 tx hash |
| 8 | 查看 Active positions | 新仓位出现在列表顶部 |
| 9 | 查看 Activity | 出现再质押确认记录 |

## 9. 异常路径

| 场景 | 预期 |
| --- | --- |
| API 短暂失败 | 前端展示可重试错误，不白屏 |
| 修改参数后未重新预览 | 用户不能提交旧 preview |
| API 返回错误 | 不生成仓位，展示可读错误 |
| 刷新页面 | mock 状态按后端约定保留或重置，行为必须稳定 |
| 断开钱包 | 资产、仓位、交易提交入口被限制 |

## 10. 文案与合规感测试

检查所有页面是否避免以下误导：

| 禁用表达 | 推荐表达 |
| --- | --- |
| Guaranteed yield | Estimated simulated rewards |
| Risk-free | Simulated risk level |
| Real transaction confirmed | Demo transaction completed |
| Funds secured | No real assets were moved |
| Mainnet restaking live | Local demo mode |

中文检查：

| 禁用表达 | 推荐表达 |
| --- | --- |
| 保本 | 模拟收益，不构成承诺 |
| 无风险 | 风险等级 |
| 真实交易完成 | 模拟交易完成 |
| 资金已托管 | 未移动真实资产 |
| 主网上线 | 本地 demo |

## 11. 回归检查清单

每次前端、后端或测试 agent 修改后，至少回归：

1. 首页未连接状态。
2. 模拟钱包连接。
3. Restake happy path。
4. 超余额校验。
5. 交易状态推进。
6. 仓位生成与详情。
7. 断开钱包后的限制。
8. 文案不暗示真实资金。

## 12. 交付证据

测试完成后建议输出：

| 证据 | 内容 |
| --- | --- |
| 测试摘要 | 通过/失败数量、阻塞问题 |
| 截图 | Earn 首屏、deposit widget、preview、confirm、portfolio |
| API 日志 | 至少包含 preview、confirm、positions |
| 已知问题 | 问题描述、影响、优先级 |
| 环境说明 | 本地启动命令、浏览器版本、是否断网验证 |
