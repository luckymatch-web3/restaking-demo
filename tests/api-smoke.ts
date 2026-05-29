import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../server/index";
import type { Asset, BootstrapPayload, Operator, Position, RestakePreview, Wallet } from "../shared/types";

type ApiOk<T> = T & {
  ok: true;
  status: string;
  mode: "mock";
};

interface ApiError {
  ok: false;
  status: "error";
  mode: "mock";
  code: string;
  error: string;
  details?: Record<string, unknown>;
}

interface ConfirmPayload {
  position: Position;
  preview: RestakePreview;
  txHash: string;
  wallet: Wallet;
  assets: Asset[];
  positions: Position[];
}

const externalBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, "");
const localServer = externalBaseUrl ? undefined : await startLocalApi();
const apiBaseUrl = normalizeApiBaseUrl(externalBaseUrl ?? localServer?.baseUrl ?? "");

try {
  await runSmoke();
  console.log(`api-smoke ok: ${apiBaseUrl}`);
} finally {
  await localServer?.close();
}

async function runSmoke() {
  const health = await requestJson<ApiOk<{ service: string; timestamp: string }>>("GET", "/health");
  assert.equal(health.ok, true);
  assert.equal(health.mode, "mock");
  assert.equal(health.status, "healthy");
  assert.equal(health.service, "restaking-demo-api");

  const bootstrap = await requestJson<ApiOk<BootstrapPayload>>("GET", "/bootstrap");
  assert.equal(bootstrap.ok, true);
  assert.ok(Array.isArray(bootstrap.assets) && bootstrap.assets.length > 0, "bootstrap returns assets");
  assert.ok(Array.isArray(bootstrap.avs) && bootstrap.avs.length > 0, "bootstrap returns avs");
  assert.ok(Array.isArray(bootstrap.operators) && bootstrap.operators.length > 0, "bootstrap returns operators");

  const plan = chooseRestakePlan(bootstrap);

  if (!externalBaseUrl) {
    assert.equal(bootstrap.wallet.connected, false, "fresh local API starts disconnected");

    const blockedConfirm = await requestJson<ApiError>("POST", "/restake/confirm", plan.request, 401);
    assert.equal(blockedConfirm.ok, false);
    assert.equal(blockedConfirm.code, "WALLET_NOT_CONNECTED");
  }

  const badWallet = await requestJson<ApiError>("POST", "/wallet/connect", { walletType: "metamask" }, 400);
  assert.equal(badWallet.code, "INVALID_WALLET_TYPE");

  const connected = await requestJson<ApiOk<{ wallet: Wallet }>>("POST", "/wallet/connect", { walletType: "demo" });
  assert.equal(connected.wallet.connected, true);
  assert.match(connected.wallet.address, /^0x[a-fA-F0-9]{40}$/);

  const badAmount = await requestJson<ApiError>(
    "POST",
    "/restake/preview",
    {
      ...plan.request,
      amount: -1
    },
    400
  );
  assert.equal(badAmount.code, "INVALID_AMOUNT");

  const tooLarge = await requestJson<ApiError>(
    "POST",
    "/restake/preview",
    {
      ...plan.request,
      amount: plan.asset.balance + 1
    },
    400
  );
  assert.equal(tooLarge.code, "AMOUNT_EXCEEDS_BALANCE");

  await assertUnsupportedAvsError(bootstrap, plan);

  const preview = await requestJson<ApiOk<{ preview: RestakePreview }>>("POST", "/restake/preview", plan.request);
  assert.equal(preview.status, "preview_ready");
  assert.equal(preview.preview.assetId, plan.request.assetId);
  assert.equal(preview.preview.operatorId, plan.request.operatorId);
  assert.ok(preview.preview.projectedApy > 0, "preview projected APY is positive");
  assert.ok(preview.preview.warnings.some((warning) => warning.includes("Demo only")), "preview says it is mock only");

  const confirmed = await requestJson<ApiOk<ConfirmPayload>>("POST", "/restake/confirm", plan.request, 201);
  assert.equal(confirmed.status, "restake_confirmed");
  assert.equal(confirmed.position.status, "active");
  assert.equal(confirmed.position.amount, plan.request.amount);
  assert.match(confirmed.txHash, /^0x[a-f0-9]{64}$/i);
  assert.ok(
    confirmed.assets.some((asset) => asset.id === plan.asset.id && asset.balance < plan.asset.balance),
    "confirmed restake lowers available mock balance"
  );

  const portfolio = await requestJson<ApiOk<Pick<BootstrapPayload, "wallet" | "assets" | "positions" | "activity" | "stats">>>(
    "GET",
    "/portfolio"
  );
  assert.equal(portfolio.status, "portfolio_ready");
  assert.equal(portfolio.wallet.connected, true);
  assert.ok(portfolio.positions.some((position) => position.id === confirmed.position.id), "portfolio contains new position");

  const exit = await requestJson<ApiOk<{ position: Position; positions: Position[] }>>(
    "POST",
    `/positions/${confirmed.position.id}/exit`
  );
  assert.equal(exit.status, "exit_requested");
  assert.equal(exit.position.status, "exiting");

  const duplicateExit = await requestJson<ApiError>("POST", `/positions/${confirmed.position.id}/exit`, undefined, 409);
  assert.equal(duplicateExit.code, "POSITION_NOT_ACTIVE");
}

function chooseRestakePlan(bootstrap: BootstrapPayload) {
  const operator = bootstrap.operators.find((item) => item.supportedAvsIds.length > 0);
  assert.ok(operator, "at least one operator supports AVS");

  const asset = bootstrap.assets.find((item) => item.balance >= 1);
  assert.ok(asset, "at least one asset has a usable mock balance");

  const avsIds = operator.supportedAvsIds.slice(0, 2);
  const amount = Math.min(1.25, Number((asset.balance / 2).toFixed(6)));

  return {
    asset,
    operator,
    request: {
      assetId: asset.id,
      operatorId: operator.id,
      avsIds,
      amount
    }
  };
}

async function assertUnsupportedAvsError(
  bootstrap: BootstrapPayload,
  plan: ReturnType<typeof chooseRestakePlan>
) {
  const unsupported = findUnsupportedPair(bootstrap.operators, bootstrap.avs.map((item) => item.id));

  if (!unsupported) {
    return;
  }

  const response = await requestJson<ApiError>(
    "POST",
    "/restake/preview",
    {
      ...plan.request,
      operatorId: unsupported.operator.id,
      avsIds: [unsupported.avsId]
    },
    400
  );
  assert.equal(response.code, "UNSUPPORTED_AVS");
}

function findUnsupportedPair(operators: Operator[], avsIds: string[]) {
  for (const operator of operators) {
    const avsId = avsIds.find((candidate) => !operator.supportedAvsIds.includes(candidate));

    if (avsId) {
      return { operator, avsId };
    }
  }

  return undefined;
}

async function requestJson<T>(method: string, path: string, body?: unknown, expectedStatus = 200): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const payload = parseJson(text, method, path);

  assert.equal(response.status, expectedStatus, `${method} ${path} returned ${response.status}: ${text}`);

  return payload as T;
}

function parseJson(text: string, method: string, path: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${method} ${path} did not return JSON: ${text}`);
  }
}

async function startLocalApi() {
  const app = createApp();

  const server = await new Promise<Server>((resolve, reject) => {
    const pendingServer = app.listen(0, "127.0.0.1", () => resolve(pendingServer));
    pendingServer.once("error", reject);
  });

  const address = server.address();
  assert.ok(isAddressInfo(address), "local API server has a TCP address");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

function normalizeApiBaseUrl(baseUrl: string) {
  assert.ok(baseUrl, "API base URL is available");
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
}

function isAddressInfo(address: string | AddressInfo | null): address is AddressInfo {
  return Boolean(address && typeof address === "object" && "port" in address);
}
