import type { ActivityItem, Asset, Avs, Operator, Position, ProtocolStats, Wallet } from "../shared/types";

export const assets: Asset[] = [
  {
    id: "eth",
    symbol: "ETH",
    name: "Ethereum",
    balance: 4.85,
    priceUsd: 3632,
    baseApy: 2.8,
    restaked: 0.6,
    icon: "eth"
  },
  {
    id: "steth",
    symbol: "stETH",
    name: "Lido Staked Ether",
    balance: 12.4,
    priceUsd: 3640,
    baseApy: 3.1,
    restaked: 3.2,
    icon: "st"
  },
  {
    id: "reth",
    symbol: "rETH",
    name: "Rocket Pool ETH",
    balance: 7.8,
    priceUsd: 3745,
    baseApy: 3.35,
    restaked: 1.1,
    icon: "r"
  },
  {
    id: "cbeth",
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    balance: 5.6,
    priceUsd: 3588,
    baseApy: 2.95,
    restaked: 0,
    icon: "cb"
  },
  {
    id: "sweth",
    symbol: "swETH",
    name: "Swell Staked ETH",
    balance: 9.05,
    priceUsd: 3612,
    baseApy: 3.55,
    restaked: 2.7,
    icon: "sw"
  }
];

export const avs: Avs[] = [
  {
    id: "oracle",
    name: "Proof Oracle",
    category: "Oracle",
    rewardBoost: 1.35,
    riskLevel: "low",
    description: "为价格、资金费率和跨链状态提供经济安全性。"
  },
  {
    id: "rollup",
    name: "Rollup Watch",
    category: "Security",
    rewardBoost: 1.85,
    riskLevel: "medium",
    description: "为 L2 状态发布和欺诈证明窗口提供看护。"
  },
  {
    id: "mev",
    name: "MEV Relay Shield",
    category: "MEV",
    rewardBoost: 2.2,
    riskLevel: "high",
    description: "约束中继行为并为共享排序收入提供担保。"
  },
  {
    id: "da",
    name: "Data Availability Mesh",
    category: "DA",
    rewardBoost: 1.65,
    riskLevel: "medium",
    description: "为轻量数据可用性网络提供抽样和惩罚承诺。"
  }
];

export const operators: Operator[] = [
  {
    id: "northstar",
    name: "Northstar Nodeworks",
    location: "Singapore",
    uptime: 99.98,
    commission: 8,
    delegatedEth: 428_400,
    riskScore: 18,
    insuranceCoverage: 84,
    supportedAvsIds: ["oracle", "rollup", "da"],
    description: "偏稳健的机构级 operator，适合低波动收益组合。"
  },
  {
    id: "kairos",
    name: "Kairos Validators",
    location: "Tokyo",
    uptime: 99.93,
    commission: 6,
    delegatedEth: 291_900,
    riskScore: 27,
    insuranceCoverage: 72,
    supportedAvsIds: ["oracle", "rollup", "mev", "da"],
    description: "收益与覆盖面均衡，支持全部 demo AVS。"
  },
  {
    id: "helix",
    name: "Helix Restake Labs",
    location: "Frankfurt",
    uptime: 99.85,
    commission: 4,
    delegatedEth: 118_700,
    riskScore: 42,
    insuranceCoverage: 48,
    supportedAvsIds: ["rollup", "mev"],
    description: "更激进的收益型 operator，适合小仓位测试。"
  }
];

export const wallet: Wallet = {
  address: "",
  chain: "Ethereum Preview",
  connected: false,
  balances: Object.fromEntries(assets.map((asset) => [asset.id, asset.balance]))
};

export const positions: Position[] = [
  {
    id: "pos-1001",
    assetId: "steth",
    operatorId: "northstar",
    avsIds: ["oracle", "da"],
    amount: 3.2,
    amountUsd: 11_648,
    projectedApy: 5.72,
    rewardsAccruedUsd: 42.34,
    riskLevel: "low",
    openedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString(),
    status: "active"
  },
  {
    id: "pos-1002",
    assetId: "sweth",
    operatorId: "kairos",
    avsIds: ["rollup", "oracle"],
    amount: 2.7,
    amountUsd: 9752.4,
    projectedApy: 6.48,
    rewardsAccruedUsd: 27.96,
    riskLevel: "medium",
    openedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    status: "active"
  }
];

export const activity: ActivityItem[] = [
  {
    id: "act-1",
    type: "restake_confirmed",
    title: "stETH 再质押成功",
    description: "3.20 stETH 委托给 Northstar Nodeworks，覆盖 2 个 AVS。",
    txHash: "0x7c91...19fe",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString()
  },
  {
    id: "act-2",
    type: "preview_created",
    title: "收益预览已生成",
    description: "Kairos Validators + Rollup Watch 组合预估 APY 6.48%。",
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString()
  }
];

export function getStats(): ProtocolStats {
  const totalRestakedUsd = positions.reduce((sum, position) => sum + position.amountUsd, 0) + 41_820_000;
  const averageApy =
    positions.length === 0 ? 0 : positions.reduce((sum, position) => sum + position.projectedApy, 0) / positions.length;

  return {
    totalRestakedUsd,
    activeOperators: operators.length,
    activeAvs: avs.length,
    averageApy,
    totalRiskBufferUsd: 6_400_000
  };
}
