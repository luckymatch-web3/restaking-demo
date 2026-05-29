import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coins,
  Gem,
  Info,
  Landmark,
  Loader2,
  LockKeyhole,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap
} from "lucide-react";
import type {
  ActivityItem,
  Asset,
  Avs,
  BootstrapPayload,
  Operator,
  Position,
  ProtocolStats,
  RestakePreview,
  RestakePreviewRequest,
  Wallet as WalletSession
} from "../shared/types";

type ProductRisk = "Lower" | "Balanced" | "Higher";

interface EarnProduct {
  id: string;
  name: string;
  shortName: string;
  tokenOut: string;
  tagline: string;
  description: string;
  operatorId: string;
  avsIds: string[];
  headlineApy: number;
  risk: ProductRisk;
  exit: string;
  receiptNote: string;
  incentives: string[];
  bestFor: string;
}

type ConfirmResponse = {
  position: Position;
  preview: RestakePreview;
  txHash: string;
  wallet: WalletSession;
  assets: Asset[];
  positions: Position[];
  activity: ActivityItem[];
  stats: ProtocolStats;
};

type ConnectResponse = {
  wallet: WalletSession;
};

type PreviewResponse = {
  preview: RestakePreview;
};

interface EthereumProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<T>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const configuredVaultAddress = import.meta.env.VITE_RESTAKE_VAULT_ADDRESS?.trim() ?? "";
const realVaultReady = /^0x[a-fA-F0-9]{40}$/.test(configuredVaultAddress);

const products: EarnProduct[] = [
  {
    id: "core",
    name: "Restaked ETH",
    shortName: "Core",
    tokenOut: "rstETH",
    tagline: "Stake ETH or LSTs, receive liquid restaked ETH.",
    description: "A diversified LRT route built for users who want simple ETH yield, daily portfolio tracking, and DeFi-ready liquidity.",
    operatorId: "northstar",
    avsIds: ["oracle", "da"],
    headlineApy: 5.3,
    risk: "Lower",
    exit: "Standard exit: 7 days",
    receiptNote: "Auto-compounding receipt token",
    incentives: ["ETH staking rewards", "AVS rewards", "Restake points"],
    bestFor: "First-time restakers"
  },
  {
    id: "boost",
    name: "AVS Boost",
    shortName: "Boost",
    tokenOut: "boostETH",
    tagline: "Higher AVS coverage with managed operator routing.",
    description: "A balanced strategy that routes stake across oracle, rollup, and data availability services for more reward sources.",
    operatorId: "kairos",
    avsIds: ["oracle", "rollup", "da"],
    headlineApy: 6.6,
    risk: "Balanced",
    exit: "Fast exit estimate: 3-5 days",
    receiptNote: "Reward-bearing vault share",
    incentives: ["ETH staking rewards", "AVS rewards", "Partner boosts"],
    bestFor: "Users optimizing ETH yield"
  },
  {
    id: "points",
    name: "Points Max",
    shortName: "Points",
    tokenOut: "pxETH",
    tagline: "Restake into higher-upside AVS routes and partner rewards.",
    description: "A growth-oriented route for users who accept more volatility in exchange for higher modeled rewards and points exposure.",
    operatorId: "helix",
    avsIds: ["rollup", "mev"],
    headlineApy: 8.4,
    risk: "Higher",
    exit: "Standard exit: 10 days",
    receiptNote: "Points-eligible position token",
    incentives: ["AVS rewards", "Partner points", "Campaign boosts"],
    bestFor: "Experienced DeFi users"
  }
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency"
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency"
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short"
});

export default function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [selectedProductId, setSelectedProductId] = useState(products[0].id);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [amount, setAmount] = useState("1");
  const [preview, setPreview] = useState<RestakePreview | null>(null);
  const [bootError, setBootError] = useState("");
  const [flowError, setFlowError] = useState("");
  const [lastTxHash, setLastTxHash] = useState("");
  const [confirmedKey, setConfirmedKey] = useState("");
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [walletMode, setWalletMode] = useState<"mock" | "real">("mock");

  useEffect(() => {
    void loadBootstrap();
  }, []);

  const assets = bootstrap?.assets ?? [];
  const operators = bootstrap?.operators ?? [];
  const avsList = bootstrap?.avs ?? [];
  const positions = bootstrap?.positions ?? [];
  const activity = bootstrap?.activity ?? [];
  const wallet = bootstrap?.wallet;
  const stats = bootstrap?.stats;

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0];
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);
  const selectedOperator = operators.find((operator) => operator.id === selectedProduct.operatorId);
  const selectedAvs = avsList.filter((avs) => selectedProduct.avsIds.includes(avs.id));
  const amountValue = Number(amount);
  const walletConnected = Boolean(wallet?.connected);
  const amountIsValid =
    Boolean(selectedAsset) &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    amountValue <= (selectedAsset?.balance ?? 0);
  const draftKey = useMemo(
    () =>
      createDraftKey({
        amount: Number.isFinite(amountValue) ? amountValue : 0,
        assetId: selectedAssetId,
        avsIds: selectedProduct.avsIds,
        operatorId: selectedProduct.operatorId
      }),
    [amountValue, selectedAssetId, selectedProduct]
  );
  const estimatedReceived = useMemo(
    () => estimateReceiptAmount(amountValue, selectedAsset, selectedProduct),
    [amountValue, selectedAsset, selectedProduct]
  );
  const portfolioValue = positions.reduce((sum, position) => sum + position.amountUsd, 0);
  const rewardsValue = positions.reduce((sum, position) => sum + position.rewardsAccruedUsd, 0);

  useEffect(() => {
    setFlowError("");
    setLastTxHash("");
    setConfirmedKey("");
    setPreview(null);
  }, [amount, selectedAssetId, selectedProductId]);

  async function loadBootstrap() {
    setLoadingBootstrap(true);
    setBootError("");

    try {
      const data = await requestJson<BootstrapPayload>("/api/bootstrap");
      setBootstrap(data);
      setSelectedAssetId((current) => current || data.assets[0]?.id || "");
      setAmount((current) => current || "1");
    } catch (error) {
      setBootError(getErrorMessage(error));
    } finally {
      setLoadingBootstrap(false);
    }
  }

  async function connectWallet() {
    setConnecting(true);
    setFlowError("");

    try {
      const provider = window.ethereum;
      if (!provider) {
        throw new Error("No browser wallet found. Install MetaMask, Rabby, or another EIP-1193 wallet to use real mode.");
      }

      const accounts = await provider.request<string[]>({ method: "eth_requestAccounts" });
      const address = accounts[0];
      if (!address) {
        throw new Error("Wallet returned no account.");
      }

      const [chainId, balanceHex] = await Promise.all([
        provider.request<string>({ method: "eth_chainId" }),
        provider.request<string>({ method: "eth_getBalance", params: [address, "latest"] })
      ]);
      const ethBalance = weiHexToEth(balanceHex);

      setWalletMode("real");
      setBootstrap((current) =>
        current
          ? {
              ...current,
              activity: [],
              assets: current.assets.map((asset) => ({
                ...asset,
                balance: asset.id === "eth" ? ethBalance : 0,
                restaked: 0
              })),
              positions: [],
              wallet: {
                address,
                balances: {
                  eth: ethBalance
                },
                chain: formatChainName(chainId),
                connected: true
              }
            }
          : current
      );
    } catch (error) {
      setFlowError(getErrorMessage(error));
    } finally {
      setConnecting(false);
    }
  }

  async function createPreview() {
    const request = buildRestakeRequest();
    if (!request) {
      setFlowError("Connect a wallet, choose a product, and enter a valid amount first.");
      return;
    }

    setPreviewing(true);
    setFlowError("");
    setLastTxHash("");

    try {
      if (walletMode === "real") {
        if (!selectedAsset) {
          throw new Error("Choose an asset before previewing.");
        }
        setPreview(buildRealPreview(request, selectedAsset, selectedProduct));
        return;
      }

      const result = await requestJson<PreviewResponse>("/api/restake/preview", {
        body: JSON.stringify(request),
        method: "POST"
      });
      setPreview(result.preview);
    } catch (error) {
      setPreview(null);
      setFlowError(getErrorMessage(error));
    } finally {
      setPreviewing(false);
    }
  }

  async function confirmDeposit() {
    const request = buildRestakeRequest();
    if (!request || !preview) {
      setFlowError("Preview this deposit before confirming.");
      return;
    }

    setConfirming(true);
    setFlowError("");

    try {
      if (walletMode === "real") {
        const txHash = await submitRealDepositTransaction(request);
        const confirmedPreview = preview;
        const position: Position = {
          amount: request.amount,
          amountUsd: confirmedPreview.amountUsd,
          assetId: request.assetId,
          avsIds: request.avsIds,
          id: `real-${Date.now()}`,
          openedAt: new Date().toISOString(),
          operatorId: request.operatorId,
          projectedApy: confirmedPreview.projectedApy,
          rewardsAccruedUsd: 0,
          riskLevel: riskLevelFromProduct(selectedProduct),
          status: "active"
        };
        const confirmedActivity: ActivityItem = {
          createdAt: new Date().toISOString(),
          description: `${request.amount.toFixed(4)} ${selectedAsset?.symbol ?? request.assetId} sent to configured vault.`,
          id: `real-act-${Date.now()}`,
          title: "On-chain transaction submitted",
          txHash,
          type: "restake_confirmed"
        };

        setBootstrap((current) =>
          current
            ? {
                ...current,
                activity: [confirmedActivity, ...current.activity],
                assets: current.assets.map((asset) =>
                  asset.id === request.assetId
                    ? {
                        ...asset,
                        balance: roundClient(Math.max(0, asset.balance - request.amount), 6),
                        restaked: roundClient(asset.restaked + request.amount, 6)
                      }
                    : asset
                ),
                positions: [position, ...current.positions]
              }
            : current
        );
        setLastTxHash(txHash);
        setConfirmedKey(draftKey);
        return;
      }

      const result = await requestJson<ConfirmResponse>("/api/restake/confirm", {
        body: JSON.stringify(request),
        method: "POST"
      });

      setBootstrap((current) =>
        current
          ? {
              ...current,
              activity: result.activity,
              assets: result.assets,
              positions: result.positions,
              stats: result.stats,
              wallet: result.wallet
            }
          : current
      );
      setPreview(result.preview);
      setLastTxHash(result.txHash);
      setConfirmedKey(draftKey);
    } catch (error) {
      setFlowError(getErrorMessage(error));
    } finally {
      setConfirming(false);
    }
  }

  async function submitRealDepositTransaction(request: RestakePreviewRequest) {
    const provider = window.ethereum;
    if (!provider) {
      throw new Error("No browser wallet found. Reconnect MetaMask, Rabby, or another EIP-1193 wallet.");
    }

    if (!realVaultReady) {
      throw new Error("Real deposit is disabled until VITE_RESTAKE_VAULT_ADDRESS is configured with a deployed vault contract.");
    }

    if (request.assetId !== "eth") {
      throw new Error("Real on-chain deposit is currently enabled for native ETH only. LST deposits need token approval and a vault ABI.");
    }

    if (!wallet?.address) {
      throw new Error("Connect a real wallet before confirming.");
    }

    return provider.request<string>({
      method: "eth_sendTransaction",
      params: [
        {
          from: wallet.address,
          to: configuredVaultAddress,
          value: ethToWeiHex(request.amount)
        }
      ]
    });
  }

  function buildRestakeRequest(): RestakePreviewRequest | null {
    if (!walletConnected || !selectedAsset || !amountIsValid) {
      return null;
    }

    return {
      amount: amountValue,
      assetId: selectedAsset.id,
      avsIds: selectedProduct.avsIds,
      operatorId: selectedProduct.operatorId
    };
  }

  if (loadingBootstrap) {
    return <LoadingShell />;
  }

  if (bootError || !bootstrap) {
    return (
      <main className="app-shell app-shell--centered">
        <section className="state-panel" aria-labelledby="boot-error-title">
          <Info aria-hidden="true" />
          <h1 id="boot-error-title">Restake One could not load</h1>
          <p>{bootError || "Bootstrap returned no data."}</p>
          <button className="primary-button" type="button" onClick={() => void loadBootstrap()}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="app-frame">
      <div className="ambient-backdrop" aria-hidden="true">
        <img src="/visuals/restaking-orbit-v1.png" alt="" />
      </div>
      <div className="scan-grid" aria-hidden="true" />

      <main className="app-shell">
        <header className="topbar" aria-label="Application header">
          <a className="brand" href="#earn" aria-label="Restake One home">
            <span className="brand-mark" aria-hidden="true">
              R1
            </span>
            <span>
              <strong>Restake One</strong>
              <small>Liquid restaking terminal</small>
            </span>
          </a>

          <nav className="top-nav" aria-label="Protocol navigation">
            <a href="#earn">Stake</a>
            <a href="#portfolio">Portfolio</a>
            <a href="#risk">Risk</a>
          </nav>

          <div className="wallet-area">
            <span className="network-chip">
              <LockKeyhole aria-hidden="true" />
              {wallet?.chain ?? "Preview"}
            </span>
            {walletConnected ? (
              <span className="wallet-chip" aria-label={`Connected wallet ${wallet?.address}`}>
                <CheckCircle2 aria-hidden="true" />
                {shortAddress(wallet?.address ?? "")}
              </span>
            ) : (
              <button className="primary-button" type="button" onClick={() => void connectWallet()} disabled={connecting}>
                {connecting ? <Loader2 className="spin" aria-hidden="true" /> : <Wallet aria-hidden="true" />}
                {connecting ? "Connecting" : "Connect Wallet"}
              </button>
            )}
          </div>
        </header>

        <section className="stake-stage" id="earn" aria-labelledby="earn-title">
          <div className="hero-copy">
            <div className="signal-pill">
              <Sparkles aria-hidden="true" />
              <span>AVS rewards live in demo mode</span>
            </div>
            <h1 id="earn-title">Restake into the AVS yield matrix.</h1>
            <p>
              Deposit ETH or LSTs, receive a liquid receipt token, and route capital through operator-secured networks with modeled rewards before every transaction.
            </p>

            <div className="market-strip" aria-label="Protocol stats">
              <MarketMetric label="TVL" value={stats ? compactCurrencyFormatter.format(stats.totalRestakedUsd) : "$0"} />
              <MarketMetric label="Blended APY" value={`${percentFormatter.format(stats?.averageApy ?? 0)}%`} />
              <MarketMetric label="Operators" value={String(stats?.activeOperators ?? 0)} />
              <MarketMetric label="Risk reserve" value={stats ? compactCurrencyFormatter.format(stats.totalRiskBufferUsd) : "$0"} />
            </div>

            <div className="flow-ticker" aria-hidden="true">
              <span>ETH</span>
              <i />
              <span>stETH</span>
              <i />
              <span>Operator Set</span>
              <i />
              <span>AVS Rewards</span>
              <i />
              <span>Liquid Receipt</span>
            </div>
          </div>

          <DepositPanel
            amount={amount}
            amountIsValid={amountIsValid}
            assets={assets}
            confirmed={confirmedKey === draftKey && Boolean(lastTxHash)}
            confirming={confirming}
            connectWallet={connectWallet}
            connecting={connecting}
            createPreview={createPreview}
            estimatedReceived={estimatedReceived}
            flowError={flowError}
            lastTxHash={lastTxHash}
            preview={preview}
            previewing={previewing}
            product={selectedProduct}
            realVaultReady={realVaultReady}
            selectedAsset={selectedAsset}
            selectedAssetId={selectedAssetId}
            setAmount={setAmount}
            setSelectedAssetId={setSelectedAssetId}
            confirmDeposit={confirmDeposit}
            walletMode={walletMode}
            walletConnected={walletConnected}
          />
        </section>

        <section className="product-showcase" aria-labelledby="routes-title">
          <div className="section-heading section-heading--wide">
            <p>Strategies</p>
            <h2 id="routes-title">Pick a route by outcome, not protocol plumbing.</h2>
            <span>Each product abstracts operator selection, AVS coverage, receipt token behavior, exit timing, and reward sources.</span>
          </div>
          <div className="strategy-workbench">
            <div className="product-grid" role="list" aria-label="Restaking products">
              {products.map((product) => (
                <button
                  aria-pressed={selectedProduct.id === product.id}
                  className={`product-card ${selectedProduct.id === product.id ? "is-selected" : ""}`}
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProductId(product.id)}
                >
                  <span className="product-topline">
                    <strong>{product.name}</strong>
                    <span className={`risk-badge risk-badge--${product.risk.toLowerCase()}`}>{product.risk}</span>
                  </span>
                  <span className="product-tagline">{product.tagline}</span>
                  <span className="product-yield">
                    <b>{product.headlineApy.toFixed(2)}%</b>
                    APY
                  </span>
                  <span className="product-meta">
                    <span>{product.tokenOut}</span>
                    <span>{product.exit}</span>
                  </span>
                </button>
              ))}
            </div>
            <StrategyPanel product={selectedProduct} preview={preview} selectedAvs={selectedAvs} selectedOperator={selectedOperator} />
          </div>
        </section>

        <section className="details-grid" id="portfolio">
          <PortfolioPanel
            assets={assets}
            avsList={avsList}
            operators={operators}
            portfolioValue={portfolioValue}
            positions={positions}
            rewardsValue={rewardsValue}
          />
          <RewardsPanel activity={activity} product={selectedProduct} selectedAvs={selectedAvs} selectedOperator={selectedOperator} />
        </section>

        <section className="risk-section" id="risk" aria-labelledby="risk-title">
          <div className="section-heading">
            <p>Risk</p>
            <h2 id="risk-title">Know the risks before you deposit.</h2>
          </div>
          <div className="risk-grid">
            <RiskItem icon={<ShieldCheck aria-hidden="true" />} title="No yield guarantee" text="Rewards are modeled for this demo. A production vault needs live APY sources and clear disclosures." />
            <RiskItem icon={<Landmark aria-hidden="true" />} title="Receipt token liquidity" text="Users should know what token they receive, where it can be used, and how exits work." />
            <RiskItem icon={<BadgeCheck aria-hidden="true" />} title="Operator abstraction" text="The product chooses a managed operator route, while power users can still inspect the underlying AVS coverage." />
          </div>
        </section>
      </main>
    </div>
  );
}

function DepositPanel({
  amount,
  amountIsValid,
  assets,
  confirmed,
  confirming,
  connectWallet,
  connecting,
  createPreview,
  estimatedReceived,
  flowError,
  lastTxHash,
  preview,
  previewing,
  product,
  realVaultReady,
  selectedAsset,
  selectedAssetId,
  setAmount,
  setSelectedAssetId,
  confirmDeposit,
  walletMode,
  walletConnected
}: {
  amount: string;
  amountIsValid: boolean;
  assets: Asset[];
  confirmed: boolean;
  confirming: boolean;
  connectWallet: () => Promise<void>;
  connecting: boolean;
  createPreview: () => Promise<void>;
  estimatedReceived: number;
  flowError: string;
  lastTxHash: string;
  preview: RestakePreview | null;
  previewing: boolean;
  product: EarnProduct;
  realVaultReady: boolean;
  selectedAsset?: Asset;
  selectedAssetId: string;
  setAmount: (amount: string) => void;
  setSelectedAssetId: (assetId: string) => void;
  confirmDeposit: () => Promise<void>;
  walletMode: "mock" | "real";
  walletConnected: boolean;
}) {
  const balanceLabel = walletConnected
    ? `Balance ${selectedAsset ? `${numberFormatter.format(selectedAsset.balance)} ${selectedAsset.symbol}` : "0"}`
    : "Connect wallet to read live balance";
  const finePrint =
    walletMode === "real"
      ? realVaultReady
        ? "Real wallet mode. Confirm opens your wallet and submits an on-chain ETH transaction to the configured vault."
        : "Real wallet mode. Preview uses your live ETH balance; set VITE_RESTAKE_VAULT_ADDRESS to enable real deposit transactions."
      : "Demo mode. No real wallet signature, chain transaction, or funds movement will be submitted.";

  return (
    <aside className="deposit-panel" aria-labelledby="deposit-title">
      <div className="deposit-heading">
        <div>
          <p>Stake</p>
          <h2 id="deposit-title">{product.name}</h2>
        </div>
        <span>{product.tokenOut}</span>
      </div>

      <div className="conversion-box">
        <label htmlFor="deposit-amount">You deposit</label>
        <div className="amount-control">
          <input
            aria-describedby="deposit-help"
            id="deposit-amount"
            inputMode="decimal"
            min="0"
            placeholder="0.00"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <select
            aria-label="Deposit asset"
            value={selectedAssetId}
            onChange={(event) => setSelectedAssetId(event.target.value)}
          >
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.symbol}
              </option>
            ))}
          </select>
        </div>
        <p id="deposit-help">
          {balanceLabel}
          <button type="button" onClick={() => setAmount(walletConnected && selectedAsset ? String(selectedAsset.balance) : "0")}>
            Max
          </button>
        </p>
      </div>

      <div className="receive-box" aria-label="Receive estimate">
        <span>You receive</span>
        <strong>
          {Number.isFinite(estimatedReceived) ? numberFormatter.format(estimatedReceived) : "0"} {product.tokenOut}
        </strong>
        <small>{product.receiptNote}</small>
      </div>

      <dl className="quote-grid">
        <div>
          <dt>Modeled APY</dt>
          <dd>{preview ? `${preview.projectedApy.toFixed(2)}%` : `${product.headlineApy.toFixed(2)}%`}</dd>
        </div>
        <div>
          <dt>Monthly rewards</dt>
          <dd>{preview ? currencyFormatter.format(preview.monthlyRewardUsd) : "Preview"}</dd>
        </div>
        <div>
          <dt>Fees</dt>
          <dd>{preview ? currencyFormatter.format(preview.protocolFeeUsd + preview.operatorFeeUsd) : "Shown before confirm"}</dd>
        </div>
        <div>
          <dt>Exit</dt>
          <dd>{product.exit}</dd>
        </div>
      </dl>

      {preview && (
        <div className="review-box" role="status">
          <span>Ready to deposit</span>
          <strong>{currencyFormatter.format(preview.amountUsd)} exposure</strong>
          <p>{preview.slashingExposurePct.toFixed(2)}% modeled slashing exposure</p>
        </div>
      )}

      {confirmed && (
        <div className="success-box" role="status">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <strong>Deposit confirmed</strong>
            <span>{lastTxHash}</span>
          </div>
        </div>
      )}

      {flowError && (
        <div className="error-box" role="alert">
          <Info aria-hidden="true" />
          <span>{flowError}</span>
        </div>
      )}

      <div className="action-stack">
        {!walletConnected ? (
          <button className="primary-button primary-button--wide" type="button" onClick={() => void connectWallet()} disabled={connecting}>
            {connecting ? <Loader2 className="spin" aria-hidden="true" /> : <Wallet aria-hidden="true" />}
            {connecting ? "Connecting" : "Connect Wallet"}
          </button>
        ) : (
          <>
            <button className="secondary-button" type="button" onClick={() => void createPreview()} disabled={!amountIsValid || previewing}>
              {previewing ? <Loader2 className="spin" aria-hidden="true" /> : <Zap aria-hidden="true" />}
              {previewing ? "Checking route" : "Preview deposit"}
            </button>
            <button className="primary-button" type="button" onClick={() => void confirmDeposit()} disabled={!preview || confirming || confirmed}>
              {confirming ? <Loader2 className="spin" aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
              {confirmed ? "Confirmed" : confirming ? "Confirming" : "Confirm deposit"}
            </button>
          </>
        )}
      </div>

      <p className="fine-print">{finePrint}</p>
    </aside>
  );
}

function PortfolioPanel({
  assets,
  avsList,
  operators,
  portfolioValue,
  positions,
  rewardsValue
}: {
  assets: Asset[];
  avsList: Avs[];
  operators: Operator[];
  portfolioValue: number;
  positions: Position[];
  rewardsValue: number;
}) {
  return (
    <section className="portfolio-panel" aria-labelledby="portfolio-title">
      <div className="section-heading">
        <p>Portfolio</p>
        <h2 id="portfolio-title">Your restaked assets</h2>
      </div>

      <div className="portfolio-summary">
        <SummaryTile icon={<PiggyBank aria-hidden="true" />} label="Restaked value" value={currencyFormatter.format(portfolioValue)} />
        <SummaryTile icon={<Coins aria-hidden="true" />} label="Accrued rewards" value={currencyFormatter.format(rewardsValue)} />
        <SummaryTile icon={<Gem aria-hidden="true" />} label="Active positions" value={String(positions.length)} />
      </div>

      <div className="position-list">
        {positions.length === 0 ? (
          <div className="empty-state">
            <Banknote aria-hidden="true" />
            <span>No deposits yet.</span>
          </div>
        ) : (
          positions.map((position) => {
            const asset = assets.find((item) => item.id === position.assetId);
            const operator = operators.find((item) => item.id === position.operatorId);
            const product = matchProduct(position);
            const avsNames = avsList
              .filter((item) => position.avsIds.includes(item.id))
              .map((item) => item.name)
              .join(", ");

            return (
              <article className="position-row" key={position.id}>
                <div>
                  <strong>
                    {numberFormatter.format(position.amount)} {product?.tokenOut ?? asset?.symbol ?? position.assetId}
                  </strong>
                  <span>
                    Backed by {asset?.symbol ?? position.assetId} through {operator?.name ?? position.operatorId}
                  </span>
                </div>
                <div>
                  <span>{avsNames || "Managed AVS route"}</span>
                </div>
                <div className="position-value">
                  <strong>{currencyFormatter.format(position.amountUsd)}</strong>
                  <span>{position.projectedApy.toFixed(2)}% APY</span>
                </div>
                <span className={`risk-badge risk-badge--${riskTone(position.riskLevel)}`}>{position.riskLevel}</span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function RewardsPanel({
  activity,
  product,
  selectedAvs,
  selectedOperator
}: {
  activity: ActivityItem[];
  product: EarnProduct;
  selectedAvs: Avs[];
  selectedOperator?: Operator;
}) {
  return (
    <section className="rewards-panel" aria-labelledby="rewards-title">
      <div className="section-heading">
        <p>Route details</p>
        <h2 id="rewards-title">What happens after deposit</h2>
      </div>

      <div className="route-card">
        <div className="route-icon">
          <CircleDollarSign aria-hidden="true" />
        </div>
        <div>
          <strong>{product.tokenOut} starts earning</strong>
          <p>{product.description}</p>
        </div>
      </div>

      <div className="incentive-list" aria-label="Reward sources">
        {product.incentives.map((item) => (
          <span key={item}>
            <Sparkles aria-hidden="true" />
            {item}
          </span>
        ))}
      </div>

      <dl className="operator-card">
        <div>
          <dt>Managed operator</dt>
          <dd>{selectedOperator?.name ?? "Route operator"}</dd>
        </div>
        <div>
          <dt>AVS coverage</dt>
          <dd>{selectedAvs.map((avs) => avs.name).join(", ")}</dd>
        </div>
        <div>
          <dt>Designed for</dt>
          <dd>{product.bestFor}</dd>
        </div>
      </dl>

      <ol className="activity-list" aria-label="Recent activity">
        {activity.slice(0, 5).map((item) => (
          <li key={item.id}>
            <span className={`activity-dot activity-dot--${item.type}`} aria-hidden="true" />
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span>
                {dateFormatter.format(new Date(item.createdAt))}
                {item.txHash ? ` - ${item.txHash}` : ""}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StrategyPanel({
  preview,
  product,
  selectedAvs,
  selectedOperator
}: {
  preview: RestakePreview | null;
  product: EarnProduct;
  selectedAvs: Avs[];
  selectedOperator?: Operator;
}) {
  return (
    <aside className="strategy-panel" aria-labelledby="strategy-title">
      <div className="section-heading">
        <p>Route</p>
        <h2 id="strategy-title">Strategy preview</h2>
      </div>
      <div className="route-visual" aria-hidden="true">
        <span>ETH</span>
        <i />
        <span>{product.tokenOut}</span>
        <i />
        <span>AVS</span>
      </div>
      <dl className="strategy-metrics">
        <div>
          <dt>Modeled APY</dt>
          <dd>{preview ? `${preview.projectedApy.toFixed(2)}%` : `${product.headlineApy.toFixed(2)}%`}</dd>
        </div>
        <div>
          <dt>Exposure</dt>
          <dd>{preview ? currencyFormatter.format(preview.amountUsd) : "Preview"}</dd>
        </div>
        <div>
          <dt>Operator</dt>
          <dd>{selectedOperator?.name ?? "Managed route"}</dd>
        </div>
      </dl>
      <div className="avs-stack">
        {selectedAvs.map((avs) => (
          <span key={avs.id}>
            <BadgeCheck aria-hidden="true" />
            {avs.name}
          </span>
        ))}
      </div>
    </aside>
  );
}

function LoadingShell() {
  return (
    <main className="app-shell" aria-busy="true">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">R1</span>
          <div>
            <p>Restake One</p>
            <span>Loading demo</span>
          </div>
        </div>
      </header>
      <section className="loading-grid" aria-label="Loading workspace">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="skeleton" key={index} />
        ))}
      </section>
    </main>
  );
}

function MarketMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="market-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildRealPreview(request: RestakePreviewRequest, asset: Asset, product: EarnProduct): RestakePreview {
  const amountUsd = request.amount * asset.priceUsd;
  const projectedApy = product.headlineApy;

  return {
    amount: request.amount,
    amountUsd: roundClient(amountUsd, 2),
    assetId: request.assetId,
    avsIds: request.avsIds,
    estimatedGasUsd: 0,
    monthlyRewardUsd: roundClient((amountUsd * projectedApy) / 100 / 12, 2),
    operatorFeeUsd: roundClient(amountUsd * 0.0008, 2),
    operatorId: request.operatorId,
    projectedApy,
    protocolFeeUsd: roundClient(amountUsd * 0.0025, 2),
    slashingExposurePct: product.risk === "Higher" ? 4.8 : product.risk === "Balanced" ? 3.1 : 2.2,
    warnings: realVaultReady
      ? ["Live wallet transaction required before any position is recorded."]
      : ["No vault contract configured. Preview is read-only until VITE_RESTAKE_VAULT_ADDRESS is set."]
  };
}

function SummaryTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="summary-tile">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RiskItem({ icon, text, title }: { icon: React.ReactNode; text: string; title: string }) {
  return (
    <article className="risk-item">
      {icon}
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

function createDraftKey(input: RestakePreviewRequest) {
  return JSON.stringify({
    amount: input.amount,
    assetId: input.assetId,
    avsIds: input.avsIds.slice().sort(),
    operatorId: input.operatorId
  });
}

function estimateReceiptAmount(amount: number, asset?: Asset, product?: EarnProduct) {
  if (!asset || !product || !Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const receiptPrice = product.id === "points" ? 3720 : product.id === "boost" ? 3665 : 3638;
  return (amount * asset.priceUsd) / receiptPrice;
}

function matchProduct(position: Position) {
  return products.find(
    (product) =>
      product.operatorId === position.operatorId &&
      product.avsIds.length === position.avsIds.length &&
      product.avsIds.every((avsId) => position.avsIds.includes(avsId))
  );
}

function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function riskTone(risk: string) {
  if (risk.toLowerCase() === "high") {
    return "higher";
  }
  if (risk.toLowerCase() === "medium") {
    return "balanced";
  }
  return "lower";
}

function riskLevelFromProduct(product: EarnProduct): Position["riskLevel"] {
  if (product.risk === "Higher") {
    return "high";
  }

  if (product.risk === "Balanced") {
    return "medium";
  }

  return "low";
}

function formatChainName(chainId: string) {
  const knownChains: Record<string, string> = {
    "0x1": "Ethereum Mainnet",
    "0x5": "Goerli",
    "0xaa36a7": "Sepolia",
    "0x89": "Polygon",
    "0xa": "Optimism",
    "0xa4b1": "Arbitrum One",
    "0x2105": "Base"
  };

  return knownChains[chainId.toLowerCase()] ?? `Chain ${Number.parseInt(chainId, 16)}`;
}

function weiHexToEth(hex: string) {
  const wei = BigInt(hex);
  return Number(wei) / 1e18;
}

function ethToWeiHex(amount: number) {
  const [wholePart, decimalPart = ""] = amount.toString().split(".");
  const wholeWei = BigInt(wholePart || "0") * 10n ** 18n;
  const decimalWei = BigInt((decimalPart.padEnd(18, "0").slice(0, 18) || "0"));
  return `0x${(wholeWei + decimalWei).toString(16)}`;
}

function roundClient(value: number, decimals: number) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}
