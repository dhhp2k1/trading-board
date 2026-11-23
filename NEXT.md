# TradingBoard next 研发计划

基线为 v0.8.8（`f932194`）。使用场景为 A 股交易时段看盘，主要关注境内交易产品，美股用于隔夜参考。

## 首期：自选组强弱与隔夜对照

- 沿用现有行情接口、用户分组及 Lightweight Charts。展示同组涨跌幅中位数、上涨家数和有效家数，让用户能分辨普涨和少数股票拉动。成交额暂缓，待核对不同产品的字段和单位后再补充成交最活跃标的。
- 将选定的美股参考标的最近一个完整常规交易日表现，与境内观察组并列展示。两侧分别标明交易日期。
- 用已知输入核对中位数、覆盖数、缺失行情与跨日情况。行情源失败时，用户仍可使用原有自选、图表和更新入口。

## 第二期：同指数 ETF 对照

- 先在 A 股交易时段抽样核验 AKShare 的东财 ETF 接口，记录上游更新时间、延迟、缺失和连续请求失败情况。与现有东财路径共享上游，按补充字段接入。
- 核对基金跟踪指数后再分组。优先展示成交额、买卖一档价差及各字段时点。参考估值有效且时点可确认时展示折溢价，跨境与境内股票 ETF 分开处理。

## 条件成熟后再评估

- 分组多到列表难以比较时，试用 Apache ECharts 做热图。借鉴 Finviz 的筛选交互，行情仍由国内来源提供。
- 需要一两个技术指标时先评估 trading-signals。若多副图和绘图体验成为核心需求，以 KLineChart 做同数据样板，对照午休断点、均价、复权、叠加与已有划线后再决定是否迁移。

资料：[工具目录](https://hft.md/tradingview/)、[AKShare ETF 接口](https://akshare.akfamily.xyz/data/fund/fund_public.html)、[ECharts](https://echarts.apache.org/en/feature.html)、[KLineChart](https://klinecharts.com/guide/indicator)、[trading-signals](https://github.com/bennycode/trading-signals)。
