export type RiskLevel = "low" | "medium" | "high";

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  priceUsd: number;
  baseApy: number;
  restaked: number;
  icon: string;
}

export interface Avs {
  id: string;
  name: string;
  category: string;
  rewardBoost: number;
  riskLevel: RiskLevel;
  description: string;
}

export interface Operator {
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

export interface Wallet {
  address: string;
  chain: string;
  connected: boolean;
  balances: Record<string, number>;
}

export interface ProtocolStats {
  totalRestakedUsd: number;
  activeOperators: number;
  activeAvs: number;
  averageApy: number;
  totalRiskBufferUsd: number;
}

export interface RestakePreviewRequest {
  assetId: string;
  operatorId: string;
  avsIds: string[];
  amount: number;
}

export interface RestakePreview {
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

export interface Position {
  id: string;
  assetId: string;
  operatorId: string;
  avsIds: string[];
  amount: number;
  amountUsd: number;
  projectedApy: number;
  rewardsAccruedUsd: number;
  riskLevel: RiskLevel;
  openedAt: string;
  status: "active" | "exiting";
}

export interface ActivityItem {
  id: string;
  type: "wallet_connected" | "preview_created" | "restake_confirmed" | "exit_requested";
  title: string;
  description: string;
  txHash?: string;
  createdAt: string;
}

export interface BootstrapPayload {
  wallet: Wallet;
  assets: Asset[];
  avs: Avs[];
  operators: Operator[];
  positions: Position[];
  activity: ActivityItem[];
  stats: ProtocolStats;
}
