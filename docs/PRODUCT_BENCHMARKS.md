# Restaking Product Benchmarks

日期：2026-05-28  
用途：把公开 restaking/LRT 产品中的商业化模式沉淀成当前 demo 的改版依据。

## 1. 参考产品

| 产品 | 公开信息 | 对当前 demo 的启发 |
| --- | --- | --- |
| ether.fi | 官网强调 Save/Grow/Spend、Liquid vaults、Stake、weETH/eETH、DeFi integrations、audits 和风险披露。https://www.ether.fi/ | 用户不是来选 operator 的，而是来选择“让资产工作”的产品。页面要突出 Start earning、receipt token、收益来源、可组合性和安全感。 |
| ether.fi Help | weETH 是 liquid restaking token，用户在 Earn 页选择 weETH、输入数量、Stake/Deposit 并确认交易。https://help.ether.fi/zh-TW/articles/595737-weeth | 主交互应该是 Earn 页 + Stake 表单：You deposit / You receive / APY / confirm。 |
| Puffer | app 直接展示 You'll deposit、You'll receive、exchange rate、referral、Connect Wallet、TVL、APY、Rewards。https://app.puffer.fi/ | 需要把 deposit widget 放在首屏右侧，像真实 dApp，而不是把技术参数铺满。 |
| Kelp DAO | rsETH 是 LRT，用户 stake LST mint rsETH；协议帮助用户管理服务、validators、rewards。https://kelp.gitbook.io/kelp | operator/AVS 应抽象为产品策略，用户拿到 LRT receipt token，后台再做路由。 |
| Kelp Restaking Guide | 流程是 Connect Wallet -> Choose restaking method -> Enter amount -> Confirm transaction -> Portfolio monitoring。https://kerneldao.gitbook.io/kernel/getting-started/kelp/restaking-guide | 当前 demo 主流程改成：connect -> choose earn product -> amount -> preview -> confirm -> portfolio。 |
| Swell | 首页用产品卡展示 rswETH LRT、TVL、APR、users、Restake CTA、auditors/risk partners。https://www.swellnetwork.io/ | 产品选择要像商业化收益产品，有 TVL/APY/users/risk/security，而不是内部系统表格。 |

## 2. 抽象出来的商业化模式

1. 首屏不是说明页，而是可直接操作的 Earn/Stake 页面。
2. 用户关注的是资产、收到什么 token、预计 APY、退出时间、费用和风险。
3. Operator/AVS 是产品背后的策略，不应该成为普通用户的第一层决策。
4. LRT receipt token 是关键心智：用户 deposit ETH/LST，receive rstETH/boostETH/pxETH。
5. Portfolio 必须像金融产品账户，而不是交易日志：restaked value、rewards、active positions、APY、risk。
6. 风险披露必须商业化：no guarantee、receipt token liquidity、operator abstraction、exit estimate。

## 3. 本次改版落地

| 改版点 | 旧版 | 新版 |
| --- | --- | --- |
| 产品定位 | Risk Control Workbench | Restake One liquid restaking app |
| 主路径 | 选择 asset/operator/AVS | 选择 earn product + deposit asset |
| 首屏 | 内部控制台 | 用户可操作 Earn 页面 |
| 产品 | 技术组合 | Restaked ETH、AVS Boost、Points Max |
| 收益呈现 | preview metrics | modeled APY、monthly rewards、fees、receipt token |
| 风险呈现 | slashing exposure panel | risk badge、exit estimate、risk disclosures |
| 仓位 | active position table | restaked assets portfolio |
| 测试 | 技术流程 E2E | 商业化 deposit flow E2E |

## 4. 仍然是 demo 的边界

当前仍然是本地 mock：

- 不请求真实钱包签名。
- 不提交真实链上交易。
- 不移动真实资产。
- APY、TVL、fees、risk 都是模拟值。

下一步如果要接近真实商业化产品，优先补：

1. 钱包连接和链切换。
2. 真实资产余额读取。
3. Vault/strategy 合约或 mock 合约。
4. LRT receipt token mint/redeem 状态机。
5. APY、TVL、exchange rate 的实时数据源。
6. 风险披露、地区限制和 Terms 链接。
