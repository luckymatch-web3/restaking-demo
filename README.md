# Restake One Demo

一个可本地运行的 Web3 liquid restaking（再质押）产品 demo。它参考真实 LRT 产品的 Earn/Stake 体验，使用模拟钱包、模拟收益产品、模拟 AVS/operator 和内存账本完成完整交互闭环，适合产品验证、投资人演示和前后端联调。

## 运行

```bash
npm install
npm run dev
```

- 前端：<http://localhost:5188>
- 后端：<http://localhost:8787/api/health>

## 验证

```bash
npm run build
npm test
```

## Demo 范围

- 已实现：模拟连接钱包、选择 Earn 产品、选择 ETH/LST 资产、金额输入、预计收到 LRT、收益/费用/风险预览、确认 deposit、仓位和活动更新。
- 未接真实链：本 demo 不托管真实资产、不请求真实签名、不执行真实合约交易。
