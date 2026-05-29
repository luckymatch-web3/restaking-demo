# Restake One Demo API Contract

版本：v0.1  
日期：2026-05-28  
用途：约定当前可运行 demo 的前后端接口。本文以仓库内 Express mock API 为准。

## 1. 契约原则

1. API 只服务本地 demo，不连接真实钱包、不请求真实链、不处理真实资金。
2. 当前 demo 为内存账本：重启 API 后状态重置。
3. 当前 demo 金额字段用 number，便于原型展示；生产化时应改为 decimal string 或 bigint 最小单位。
4. 所有时间使用 ISO 8601 字符串。
5. 所有成功响应包含 `ok: true`、`status`、`mode: "mock"`；错误响应包含 `ok: false`、`code`、`error`。

## 2. Base URL

前端通过 Vite 代理调用：

```text
/api
```

后端单独启动服务：

```text
http://localhost:8787/api
```

## 3. 通用响应格式

成功：

```json
{
  "ok": true,
  "status": "preview_ready",
  "mode": "mock"
}
```

失败：

```json
{
  "ok": false,
  "status": "error",
  "mode": "mock",
  "code": "AMOUNT_EXCEEDS_BALANCE",
  "error": "Amount exceeds available balance.",
  "details": {
    "amount": 99,
    "availableBalance": 12.4,
    "assetId": "steth"
  }
}
```

## 4. 数据模型

### Wallet

```ts
{
  address: string;
  chain: string;
  connected: boolean;
  balances: Record<string, number>;
}
```

### Asset

```ts
{
  id: string;
  symbol: string;
  name: string;
  balance: number;
  priceUsd: number;
  baseApy: number;
  restaked: number;
  icon: string;
}
```

### Operator

```ts
{
  id: string;
  name: string;
  location: string;
  uptime: number;
  commission: number;
  delegatedEth: number;
  riskScore: number;
  insuranceCoverage: number;
  supportedAvsIds: string[];
  description: string;
}
```

### AVS

```ts
{
  id: string;
  name: string;
  category: string;
  rewardBoost: number;
  riskLevel: "low" | "medium" | "high";
  description: string;
}
```

### RestakePreviewRequest

```ts
{
  assetId: string;
  operatorId: string;
  avsIds: string[];
  amount: number;
}
```

### RestakePreview

```ts
{
  assetId: string;
  operatorId: string;
  avsIds: string[];
  amount: number;
  amountUsd: number;
  projectedApy: number;
  monthlyRewardUsd: number;
  operatorFeeUsd: number;
  protocolFeeUsd: number;
  estimatedGasUsd: number;
  slashingExposurePct: number;
  warnings: string[];
}
```

### Position

```ts
{
  id: string;
  assetId: string;
  operatorId: string;
  avsIds: string[];
  amount: number;
  amountUsd: number;
  projectedApy: number;
  rewardsAccruedUsd: number;
  riskLevel: "low" | "medium" | "high";
  openedAt: string;
  status: "active" | "exiting";
}
```

## 5. Endpoints

### GET `/health`

用途：健康检查。

成功响应：

```json
{
  "ok": true,
  "status": "healthy",
  "service": "restaking-demo-api",
  "mode": "mock",
  "timestamp": "2026-05-28T06:49:22.865Z"
}
```

### GET `/bootstrap`

用途：前端首屏一次性获取模拟钱包、资产、AVS、operator、仓位、活动和协议统计。

成功响应字段：

```ts
{
  ok: true;
  status: "bootstrapped";
  mode: "mock";
  wallet: Wallet;
  assets: Asset[];
  avs: Avs[];
  operators: Operator[];
  positions: Position[];
  activity: ActivityItem[];
  stats: ProtocolStats;
}
```

### POST `/wallet/connect`

用途：连接模拟钱包。

请求：

```json
{
  "walletType": "demo"
}
```

`walletType` 可省略；如果传入非 `demo`，返回 `INVALID_WALLET_TYPE`。

成功响应：

```json
{
  "ok": true,
  "status": "wallet_connected",
  "mode": "mock",
  "wallet": {
    "address": "0xA17e9C42f6B3a2D91f4C8B0e13E7dA5bC92F18a4",
    "chain": "Local Restaking Sandbox",
    "connected": true,
    "balances": {
      "steth": 12.4
    }
  }
}
```

### POST `/restake/preview`

用途：根据资产、operator、AVS 和金额生成模拟收益、费用和风险预览。

请求：

```json
{
  "assetId": "steth",
  "operatorId": "northstar",
  "avsIds": ["oracle", "da"],
  "amount": 1.25
}
```

成功响应：

```json
{
  "ok": true,
  "status": "preview_ready",
  "mode": "mock",
  "preview": {
    "assetId": "steth",
    "operatorId": "northstar",
    "avsIds": ["oracle", "da"],
    "amount": 1.25,
    "amountUsd": 4550,
    "projectedApy": 5.72,
    "monthlyRewardUsd": 21.69,
    "operatorFeeUsd": 20.82,
    "protocolFeeUsd": 11.38,
    "estimatedGasUsd": 4.04,
    "slashingExposurePct": 2.5,
    "warnings": ["Demo only: no real wallet signature, chain transaction, or funds movement will be submitted."]
  }
}
```

### POST `/restake/confirm`

用途：确认模拟再质押。该接口会更新内存余额、创建新仓位、写入活动记录，并返回模拟 tx hash。

前置条件：必须先调用 `/wallet/connect` 成功连接 demo wallet。

请求同 `/restake/preview`。

成功状态码：`201`

成功响应字段：

```ts
{
  ok: true;
  status: "restake_confirmed";
  mode: "mock";
  position: Position;
  preview: RestakePreview;
  txHash: string;
  wallet: Wallet;
  assets: Asset[];
  positions: Position[];
  activity: ActivityItem[];
  stats: ProtocolStats;
}
```

### GET `/portfolio`

用途：获取钱包、资产、仓位、活动和协议统计的最新快照。

成功响应字段：

```ts
{
  ok: true;
  status: "portfolio_ready";
  mode: "mock";
  wallet: Wallet;
  assets: Asset[];
  positions: Position[];
  activity: ActivityItem[];
  stats: ProtocolStats;
}
```

### POST `/positions/:positionId/exit`

用途：将 active 仓位标记为 exiting，模拟进入退出队列。

成功响应字段：

```ts
{
  ok: true;
  status: "exit_requested";
  mode: "mock";
  position: Position;
  positions: Position[];
  activity: ActivityItem[];
  stats: ProtocolStats;
}
```

## 6. 错误码

| code | HTTP | 场景 |
| --- | ---: | --- |
| INVALID_JSON | 400 | 请求体不是合法 JSON |
| INVALID_REQUEST | 400 | 请求体类型不正确或字段缺失 |
| INVALID_WALLET_TYPE | 400 | 当前 demo 只支持 `walletType=demo` |
| WALLET_NOT_CONNECTED | 401 | 未连接模拟钱包时确认再质押 |
| INVALID_ASSET | 400 | assetId 不存在 |
| INVALID_OPERATOR | 400 | operatorId 不存在 |
| INVALID_AVS | 400 | avsIds 包含未知 AVS |
| AVS_REQUIRED | 400 | 未选择 AVS |
| UNSUPPORTED_AVS | 400 | operator 不支持选择的 AVS |
| INVALID_AMOUNT | 400 | amount 非正数或无法解析 |
| AMOUNT_EXCEEDS_BALANCE | 400 | amount 超出可用余额 |
| POSITION_NOT_FOUND | 404 | positionId 不存在 |
| POSITION_NOT_ACTIVE | 409 | 非 active 仓位不能再次进入退出队列 |
| NOT_FOUND | 404 | API 路由不存在 |

## 7. 验收标准

1. `npm run test:api` 应覆盖健康检查、bootstrap、连接钱包、preview、confirm、portfolio、exit，以及关键错误分支。
2. `npm run test:e2e` 应覆盖前端主流程：连接钱包、生成预览、确认再质押、看到 tx 和新仓位。
3. API 文案必须持续说明当前为 mock/demo，不得暗示真实资金已移动。
