# Restake One Demo

一个可本地运行的 Web3 liquid restaking（再质押）产品 demo。它参考真实 LRT 产品的 Earn/Stake 体验，前端支持浏览器钱包连接、真实 ETH 余额读取和可配置 vault 后的真实 ETH deposit 交易，同时保留 modeled APY/AVS/operator 预览用于产品验证、投资人演示和前后端联调。

## 运行

```bash
npm install
npm run dev
```

- 前端：<http://localhost:5188>
- 后端：<http://localhost:8787/api/health>

## 真实钱包模式

前端会优先使用浏览器钱包（MetaMask、Rabby 等 EIP-1193 provider）：

- `Connect Wallet` 会请求真实账户。
- ETH 余额通过 `eth_getBalance` 实时读取。
- 预览仍然是产品侧的 modeled APY/fee/risk，不是收益承诺。
- 真实 deposit 需要先配置一个已部署、已审计或测试用的 vault 合约地址：

```bash
VITE_RESTAKE_VAULT_ADDRESS=0xYourVaultAddress npm run dev
```

未配置 `VITE_RESTAKE_VAULT_ADDRESS` 时，应用不会发送链上交易，避免把真实资产转到不明确地址。当前真实链上 deposit 只支持 native ETH；stETH/rETH/cbETH/swETH 需要额外接 ERC-20 approval 和 vault ABI。

## 验证

```bash
npm run build
npm test
```

## Demo 范围

- 已实现：真实浏览器钱包连接、真实 ETH 余额读取、选择 Earn 产品、金额输入、预计收到 LRT、收益/费用/风险预览、可配置 vault 后发起真实 ETH deposit 交易、前端仓位和活动更新。
- 仍需接入生产合约：本 demo 不自带已部署 vault，不托管真实资产；生产版本需要正式 vault/LRT 合约、审计、实时 APY/TVL 数据源、ERC-20 approval、赎回/退出状态机和风控披露。
