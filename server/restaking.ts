import { activity, assets, avs, operators, positions, wallet } from "./data";
import type { Avs, Operator, Position, RestakePreview, RestakePreviewRequest, RiskLevel } from "../shared/types";

const protocolFeeRate = 0.0025;
const demoWalletAddress = "0xA17e9C42f6B3a2D91f4C8B0e13E7dA5bC92F18a4";
let idSequence = 0;

export type RestakingErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_WALLET_TYPE"
  | "WALLET_NOT_CONNECTED"
  | "INVALID_ASSET"
  | "INVALID_OPERATOR"
  | "INVALID_AVS"
  | "AVS_REQUIRED"
  | "UNSUPPORTED_AVS"
  | "INVALID_AMOUNT"
  | "AMOUNT_EXCEEDS_BALANCE"
  | "POSITION_NOT_FOUND"
  | "POSITION_NOT_ACTIVE";

export class RestakingApiError extends Error {
  constructor(
    public readonly code: RestakingErrorCode,
    message: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RestakingApiError";
  }
}

export function isRestakingApiError(error: unknown): error is RestakingApiError {
  return error instanceof RestakingApiError;
}

export function connectWallet(input: unknown = {}) {
  const walletType = readWalletType(input);

  if (walletType !== "demo") {
    throw new RestakingApiError("INVALID_WALLET_TYPE", "Only the demo wallet is available in mock mode.", 400, {
      walletType
    });
  }

  if (!wallet.connected) {
    wallet.address = demoWalletAddress;
    wallet.connected = true;
    pushActivity({
      id: makeId("act"),
      type: "wallet_connected",
      title: "模拟钱包已连接",
      description: `${wallet.address} 已进入 ${wallet.chain}。`,
      createdAt: new Date().toISOString()
    });
  }

  return wallet;
}

export function createPreview(input: unknown): RestakePreview {
  const validated = validateRestakeRequest(input);
  const preview = buildPreview(validated);

  pushActivity({
    id: makeId("act"),
    type: "preview_created",
    title: "再质押预览已生成",
    description: `${validated.request.amount.toFixed(2)} ${validated.asset.symbol} 预计 APY ${preview.projectedApy.toFixed(
      2
    )}%。`,
    createdAt: new Date().toISOString()
  });

  return preview;
}

export function confirmRestake(input: unknown) {
  if (!wallet.connected) {
    throw new RestakingApiError("WALLET_NOT_CONNECTED", "Connect the demo wallet before confirming a restake.", 401);
  }

  const validated = validateRestakeRequest(input);
  const preview = buildPreview(validated);
  const { asset, operator, request } = validated;

  asset.balance = round(asset.balance - request.amount, 4);
  asset.restaked = round(asset.restaked + request.amount, 4);
  wallet.balances[asset.id] = asset.balance;

  const riskLevel = riskFromPreview(preview.slashingExposurePct);
  const position: Position = {
    id: makeId("pos"),
    assetId: request.assetId,
    operatorId: request.operatorId,
    avsIds: request.avsIds,
    amount: request.amount,
    amountUsd: preview.amountUsd,
    projectedApy: preview.projectedApy,
    rewardsAccruedUsd: 0,
    riskLevel,
    openedAt: new Date().toISOString(),
    status: "active"
  };

  positions.unshift(position);

  const txHash = makeMockTxHash();
  pushActivity({
    id: makeId("act"),
    type: "restake_confirmed",
    title: "再质押交易已确认",
    description: `${request.amount.toFixed(2)} ${asset.symbol} 已委托给 ${operator.name}。`,
    txHash,
    createdAt: new Date().toISOString()
  });

  return {
    position,
    preview,
    txHash
  };
}

export function markExiting(positionId: string) {
  if (typeof positionId !== "string" || positionId.trim().length === 0) {
    throw new RestakingApiError("INVALID_REQUEST", "positionId is required.", 400);
  }

  const position = positions.find((item) => item.id === positionId);
  if (!position) {
    throw new RestakingApiError("POSITION_NOT_FOUND", "Position not found.", 404, { positionId });
  }

  if (position.status !== "active") {
    throw new RestakingApiError("POSITION_NOT_ACTIVE", "Only active positions can enter the exit queue.", 409, {
      positionId,
      status: position.status
    });
  }

  position.status = "exiting";
  pushActivity({
    id: makeId("act"),
    type: "exit_requested",
    title: "退出队列已创建",
    description: `${position.amount.toFixed(2)} 的再质押仓位进入 7 天退出期。`,
    createdAt: new Date().toISOString()
  });

  return position;
}

interface ValidatedRestakeRequest {
  request: RestakePreviewRequest;
  asset: (typeof assets)[number];
  operator: Operator;
  selectedAvs: Avs[];
}

function validateRestakeRequest(input: unknown): ValidatedRestakeRequest {
  if (!isRecord(input)) {
    throw new RestakingApiError("INVALID_REQUEST", "Request body must be a JSON object.", 400);
  }

  const assetId = readRequiredString(input.assetId, "assetId");
  const operatorId = readRequiredString(input.operatorId, "operatorId");
  const avsIds = readAvsIds(input.avsIds);
  const amount = readAmount(input.amount);

  const asset = assets.find((item) => item.id === assetId);
  if (!asset) {
    throw new RestakingApiError("INVALID_ASSET", "Unknown asset.", 400, { assetId });
  }

  const operator = operators.find((item) => item.id === operatorId);
  if (!operator) {
    throw new RestakingApiError("INVALID_OPERATOR", "Unknown operator.", 400, { operatorId });
  }

  if (amount > asset.balance) {
    throw new RestakingApiError("AMOUNT_EXCEEDS_BALANCE", "Amount exceeds available balance.", 400, {
      amount,
      availableBalance: asset.balance,
      assetId
    });
  }

  const missingAvsIds = avsIds.filter((avsId) => !avs.some((item) => item.id === avsId));
  if (missingAvsIds.length > 0) {
    throw new RestakingApiError("INVALID_AVS", "Unknown AVS selected.", 400, { avsIds: missingAvsIds });
  }

  const selectedAvs = avsIds.map((avsId) => avs.find((item) => item.id === avsId)).filter(Boolean) as Avs[];
  const unsupported = selectedAvs.filter((item) => !operator.supportedAvsIds.includes(item.id));
  if (unsupported.length > 0) {
    throw new RestakingApiError(
      "UNSUPPORTED_AVS",
      `Operator does not support ${unsupported.map((item) => item.name).join(", ")}.`,
      400,
      {
        operatorId,
        avsIds: unsupported.map((item) => item.id)
      }
    );
  }

  return {
    request: {
      assetId,
      operatorId,
      avsIds,
      amount
    },
    asset,
    operator,
    selectedAvs
  };
}

function buildPreview({ asset, operator, request, selectedAvs }: ValidatedRestakeRequest): RestakePreview {
  const amountUsd = request.amount * asset.priceUsd;
  const avsBoost = selectedAvs.reduce((sum, item) => sum + item.rewardBoost, 0) / selectedAvs.length;
  const operatorQualityBonus = Math.max(0, (100 - operator.riskScore) / 100) * 0.9;
  const projectedApy = round(asset.baseApy + avsBoost + operatorQualityBonus - operator.commission / 100);
  const operatorFeeUsd = round((amountUsd * projectedApy * (operator.commission / 100)) / 100);
  const protocolFeeUsd = round(amountUsd * protocolFeeRate);
  const estimatedGasUsd = round(2.8 + selectedAvs.length * 0.62);
  const slashingExposurePct = round(operator.riskScore / 10 + selectedAvs.length * 0.35);
  const warnings = buildWarnings(selectedAvs, operator.riskScore, request.amount / asset.balance);

  return {
    assetId: request.assetId,
    operatorId: request.operatorId,
    avsIds: request.avsIds,
    amount: request.amount,
    amountUsd: round(amountUsd),
    projectedApy,
    monthlyRewardUsd: round((amountUsd * projectedApy) / 100 / 12),
    operatorFeeUsd,
    protocolFeeUsd,
    estimatedGasUsd,
    slashingExposurePct,
    warnings
  };
}

function riskFromPreview(slashingExposurePct: number): RiskLevel {
  if (slashingExposurePct >= 5) {
    return "high";
  }

  if (slashingExposurePct >= 3) {
    return "medium";
  }

  return "low";
}

function buildWarnings(selectedAvs: Avs[], riskScore: number, allocationRatio: number) {
  const warnings = ["Demo only: no real wallet signature, chain transaction, or funds movement will be submitted."];

  if (selectedAvs.some((item) => item.riskLevel === "high")) {
    warnings.push("包含高收益 AVS，需接受更高 slashing 风险。");
  }

  if (riskScore > 35) {
    warnings.push("当前 operator 风险评分偏高，建议控制仓位。");
  }

  if (allocationRatio > 0.6) {
    warnings.push("本次投入超过该资产可用余额 60%，建议分批操作。");
  }

  return warnings;
}

function readWalletType(input: unknown) {
  if (input === undefined || input === null) {
    return "demo";
  }

  if (!isRecord(input)) {
    throw new RestakingApiError("INVALID_REQUEST", "Request body must be a JSON object.", 400);
  }

  if (input.walletType === undefined) {
    return "demo";
  }

  if (typeof input.walletType !== "string" || input.walletType.trim().length === 0) {
    throw new RestakingApiError("INVALID_WALLET_TYPE", "walletType must be demo.", 400);
  }

  return input.walletType.trim();
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RestakingApiError("INVALID_REQUEST", `${field} is required.`, 400, { field });
  }

  return value.trim();
}

function readAvsIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new RestakingApiError("AVS_REQUIRED", "avsIds must be a non-empty array.", 400, { field: "avsIds" });
  }

  const avsIds = value.map((item) => (typeof item === "string" ? item.trim() : ""));
  if (avsIds.some((item) => item.length === 0)) {
    throw new RestakingApiError("INVALID_AVS", "avsIds must contain only non-empty strings.", 400, {
      field: "avsIds"
    });
  }

  const dedupedAvsIds = [...new Set(avsIds)];
  if (dedupedAvsIds.length === 0) {
    throw new RestakingApiError("AVS_REQUIRED", "Choose at least one AVS.", 400);
  }

  return dedupedAvsIds;
}

function readAmount(value: unknown) {
  const amount = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RestakingApiError("INVALID_AMOUNT", "Amount must be a positive number.", 400, { field: "amount" });
  }

  return round(amount, 6);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushActivity(item: (typeof activity)[number]) {
  activity.unshift(item);

  if (activity.length > 40) {
    activity.length = 40;
  }
}

function makeId(prefix: string) {
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSequence.toString(36).padStart(4, "0")}`;
}

function makeMockTxHash() {
  idSequence += 1;
  const seed = `${Date.now().toString(16)}${idSequence.toString(16).padStart(4, "0")}`;
  return `0x${seed.padEnd(64, "0").slice(0, 64)}`;
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
