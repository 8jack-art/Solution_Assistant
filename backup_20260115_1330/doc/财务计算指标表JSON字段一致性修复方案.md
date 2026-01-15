# 财务计算指标表JSON字段一致性修复方案

## 问题背景

投资项目方案报告生成模块中，当用户点击可用变量"财务计算指标表"右侧的小眼睛图标时，系统弹出JSON格式的数据窗口，但该JSON数据中存在字段名称中英文重复的问题（例如同时存在"revenue"和"收入"等同义字段）。

## 问题分析

### 1. 当前JSON数据结构问题

在[`buildFinancialIndicators.ts`](server/src/utils/tableDataBuilders/buildFinancialIndicators.ts)文件中，生成的JSON数据存在以下问题：

#### summary 对象中的重复字段：
```json
{
  "totalInvestment": 0,
  "项目总投资": 0,
  "operatingCost": 0,
  "经营成本": 0,
  "revenue": 0,
  "营业收入": 0,
  "tax": 0,
  "营业税金及附加": 0,
  "profit": 0,
  "利润总额": 0,
  "incomeTax": 0,
  "所得税": 0,
  "netProfit": 0,
  "净利润": 0,
  "ebit": 0,
  "息税前利润": 0
}
```

#### projectLevel 对象中的重复字段：
```json
{
  "irr": 0,
  "财务内部收益率": 0,
  "npv": 0,
  "财务净现值": 0,
  "paybackPeriod": 0,
  "投资回收期": 0,
  "totalInvestmentROI": 0,
  "总投资收益率": 0,
  "roi": 0,
  "资本金净利润率": 0
}
```

### 2. 财务评价指标汇总表弹窗的实际字段设置

根据[`FinancialIndicatorsTable.tsx`](client/src/components/revenue-cost/FinancialIndicatorsTable.tsx)中`financialSummaryRows`的字段定义：

#### 项目投资相关：
| 序号 | 字段名称 | 单位 | 数据类型 |
|------|----------|------|----------|
| 1 | 项目总投资 | 万元 | number |
| 1.1 | 建设投资 | 万元 | number |
| 1.2 | 建设期利息 | 万元 | number |
| 2 | 资金筹措 | 万元 | number |
| 2.1 | 项目资本金 | 万元 | number |
| 2.2 | 项目债务资金 | 万元 | number |

#### 年均指标：
| 序号 | 字段名称 | 单位 | 数据类型 |
|------|----------|------|----------|
| 3 | 年均销售收入 | 万元 | number |
| 4 | 年均总成本费用 | 万元 | number |
| 5 | 年均销售税金及附加 | 万元 | number |
| 6 | 年均增值税 | 万元 | number |
| 7 | 年均息税前利润（EBIT） | 万元 | number |
| 8 | 年均利润总额 | 万元 | number |
| 9 | 年均所得税 | 万元 | number |
| 10 | 年均净利润 | 万元 | number |

#### 投资效益指标：
| 序号 | 字段名称 | 单位 | 数据类型 |
|------|----------|------|----------|
| 11 | 总投资收益率 | ％ | number |
| 12 | 投资利税率 | ％ | number |
| 13 | 项目资本金净利润率 | ％ | number |

#### 偿债能力指标：
| 序号 | 字段名称 | 单位 | 数据类型 |
|------|----------|------|----------|
| 14 | 平均利息备付率 | - | number |
| 15 | 平均偿债备付率 | - | number |

#### 项目投资税前指标：
| 序号 | 字段名称 | 单位 | 数据类型 |
|------|----------|------|----------|
| 16.1 | 财务内部收益率 | ％ | number |
| 16.2 | 项目投资财务净现值（Ic=X％） | 万元 | number |
| 16.3 | 全部投资回收期 | 年 | number |

#### 项目投资税后指标：
| 序号 | 字段名称 | 单位 | 数据类型 |
|------|----------|------|----------|
| 17.1 | 财务内部收益率 | ％ | number |
| 17.2 | 项目投资财务净现值（Ic=X％） | 万元 | number |
| 17.3 | 全部投资回收期 | 年 | number |

### 3. 财务计算指标表弹窗的实际字段

根据[`FinancialIndicatorsTable.tsx`](client/src/components/revenue-cost/FinancialIndicatorsTable.tsx)中财务计算指标表弹窗的字段：

| 序号 | 字段名称 | 单位 | 数据类型 |
|------|----------|------|----------|
| 1 | 项目投资财务内部收益率（%）（所得税前） | ％ | number |
| 2 | 项目投资财务内部收益率（%）（所得税后） | ％ | number |
| 3 | 项目投资财务净现值（所得税前）（ic=X%） | 万元 | number |
| 4 | 项目投资财务净现值（所得税后）（ic=X%） | 万元 | number |
| 5 | 项目静态投资回收期（年）（所得税前） | 年 | number |
| 6 | 项目静态投资回收期（年）（所得税后） | 年 | number |
| 7 | 项目动态投资回收期（年）（所得税前） | 年 | number |
| 8 | 项目动态投资回收期（年）（所得税后） | 年 | number |

## 字段映射关系设计

### 财务计算指标表JSON字段与财务评价指标汇总表字段映射

| JSON字段 | 汇总表字段 | 数据类型 | 说明 |
|----------|------------|----------|------|
| preTaxIRR | 16.1 财务内部收益率（所得税前） | number | 所得税前财务内部收益率 |
| postTaxIRR | 17.1 财务内部收益率（所得税后） | number | 所得税后财务内部收益率 |
| preTaxNPV | 16.2 项目投资财务净现值（所得税前） | number | 所得税前净现值 |
| postTaxNPV | 17.2 项目投资财务净现值（所得税后） | number | 所得税后净现值 |
| preTaxStaticPaybackPeriod | 16.3 全部投资回收期（所得税前静态） | number | 所得税前静态回收期 |
| postTaxStaticPaybackPeriod | 17.3 全部投资回收期（所得税后静态） | number | 所得税后静态回收期 |
| preTaxDynamicPaybackPeriod | 16.3 全部投资回收期（所得税前动态） | number | 所得税前动态回收期 |
| postTaxDynamicPaybackPeriod | 17.3 全部投资回收期（所得税后动态） | number | 所得税后动态回收期 |

### 新增字段（用于财务评价指标汇总表）

| JSON字段 | 汇总表字段 | 数据类型 | 说明 |
|----------|------------|----------|------|
| totalInvestment | 1 项目总投资 | number | 项目总投资（万元） |
| constructionInvestment | 1.1 建设投资 | number | 建设投资（万元） |
| constructionInterest | 1.2 建设期利息 | number | 建设期利息（万元） |
| totalFinancing | 2 资金筹措 | number | 资金筹措（万元） |
| projectEquity | 2.1 项目资本金 | number | 项目资本金（万元） |
| projectDebt | 2.2 项目债务资金 | number | 项目债务资金（万元） |
| annualOperatingRevenue | 3 年均销售收入 | number | 年均销售收入（万元） |
| annualTotalCost | 4 年均总成本费用 | number | 年均总成本费用（万元） |
| annualTaxAndSurcharges | 5 年均销售税金及附加 | number | 年均销售税金及附加（万元） |
| annualVAT | 6 年均增值税 | number | 年均增值税（万元） |
| annualEBIT | 7 年均息税前利润 | number | 年均息税前利润（万元） |
| annualTotalProfit | 8 年均利润总额 | number | 年均利润总额（万元） |
| annualIncomeTax | 9 年均所得税 | number | 年均所得税（万元） |
| annualNetProfit | 10 年均净利润 | number | 年均净利润（万元） |
| roi | 11 总投资收益率 | number | 总投资收益率（%） |
| investmentProfitRate | 12 投资利税率 | number | 投资利税率（%） |
| roe | 13 项目资本金净利润率 | number | 资本金净利润率（%） |
| interestCoverageRatio | 14 平均利息备付率 | number | 平均利息备付率 |
| debtServiceCoverageRatio | 15 平均偿债备付率 | number | 平均偿债备付率 |

## 修复方案

### 1. 重构 buildFinancialIndicators.ts

将JSON数据结构重构为以下格式：

```typescript
interface FinancialIndicatorsJSON {
  // 基础信息
  metadata: {
    projectName: string;
    constructionYears: number;
    operationYears: number;
    preTaxRate: number;
    postTaxRate: number;
    generatedAt: string;
  };
  
  // 项目投资相关
  investment: {
    totalInvestment: number;          // 项目总投资
    constructionInvestment: number;   // 建设投资
    constructionInterest: number;     // 建设期利息
    totalFinancing: number;           // 资金筹措
    projectEquity: number;            // 项目资本金
    projectDebt: number;              // 项目债务资金
  };
  
  // 年均指标
  annualAverage: {
    operatingRevenue: number;         // 年均销售收入
    totalCost: number;                // 年均总成本费用
    taxAndSurcharges: number;         // 年均销售税金及附加
    vat: number;                      // 年均增值税
    ebit: number;                     // 年均息税前利润
    totalProfit: number;              // 年均利润总额
    incomeTax: number;                // 年均所得税
    netProfit: number;                // 年均净利润
  };
  
  // 投资效益指标
  investmentEfficiency: {
    roi: number;                      // 总投资收益率
    investmentProfitRate: number;     // 投资利税率
    roe: number;                      // 资本金净利润率
  };
  
  // 偿债能力指标
  solvency: {
    interestCoverageRatio: number;    // 平均利息备付率
    debtServiceCoverageRatio: number; // 平均偿债备付率
  };
  
  // 项目投资税前指标
  preTaxIndicators: {
    irr: number;                      // 财务内部收益率
    npv: number;                      // 财务净现值
    staticPaybackPeriod: number;      // 静态投资回收期
    dynamicPaybackPeriod: number;     // 动态投资回收期
  };
  
  // 项目投资税后指标
  postTaxIndicators: {
    irr: number;                      // 财务内部收益率
    npv: number;                      // 财务净现值
    staticPaybackPeriod: number;      // 静态投资回收期
    dynamicPaybackPeriod: number;     // 动态投资回收期
  };
}
```

### 2. 数据来源分析

根据[`FinancialIndicatorsTable.tsx`](client/src/components/revenue-cost/FinancialIndicatorsTable.tsx)中的计算逻辑：

#### 项目总投资相关
- `totalInvestment` = 建设投资 + 建设期利息
- `constructionInvestment` = 从`calculateConstructionInvestment(undefined)`获取
- `constructionInterest` = 从`investmentEstimate.construction_interest`获取
- `projectDebt` = 从`investmentEstimate.estimate_data.partF.贷款总额`获取
- `projectEquity` = `totalInvestment - projectDebt`

#### 年均指标
- `annualOperatingRevenue` = `calculateOperatingRevenue(undefined) / context.operationYears`
- `annualTotalCost` = `calculateTotalCost(undefined) / context.operationYears`
- `annualTaxAndSurcharges` = `calculateTaxAndSurcharges(undefined) / context.operationYears`
- `annualVAT` = `calculateVatTotal() / context.operationYears`
- `annualEBIT` = `calculateEBIT(undefined) / context.operationYears`
- `annualTotalProfit` = `calculateTotalProfit(undefined) / context.operationYears`
- `annualIncomeTax` = `calculateIncomeTax(undefined) / context.operationYears`
- `annualNetProfit` = `calculateNetProfit(undefined) / context.operationYears`

#### 投资效益指标
- `roi` = (`annualEBIT / totalInvestment`) * 100
- `investmentProfitRate` = (`annualAverageProfitAndTaxTotal / totalInvestment`) * 100
- `roe` = (`annualNetProfit / projectEquity`) * 100

#### 财务指标计算
- `preTaxIRR` = 从现金流计算
- `postTaxIRR` = 从现金流计算
- `preTaxNPV` = 从现金流计算
- `postTaxNPV` = 从现金流计算
- `preTaxStaticPaybackPeriod` = 从累计现金流计算
- `postTaxStaticPaybackPeriod` = 从累计现金流计算
- `preTaxDynamicPaybackPeriod` = 从累计动态现金流计算
- `postTaxDynamicPaybackPeriod` = 从累计动态现金流计算

## 修复实现代码

### 1. 服务器端修复代码

创建新的修复版本文件 `buildFinancialIndicators.fixed.ts`：

```typescript
/**
 * 构建财务评价指标汇总表 JSON 数据（修复版本）
 * 解决字段中英文重复问题，确保与财务评价指标汇总表弹窗字段一致
 */

export interface FinancialIndicatorsJSON {
  // 基础信息
  metadata: {
    projectName: string;
    constructionYears: number;
    operationYears: number;
    preTaxRate: number;
    postTaxRate: number;
    generatedAt: string;
  };
  
  // 项目投资相关
  investment: {
    totalInvestment: number;          // 项目总投资（万元）
    constructionInvestment: number;   // 建设投资（万元）
    constructionInterest: number;     // 建设期利息（万元）
    totalFinancing: number;           // 资金筹措（万元）
    projectEquity: number;            // 项目资本金（万元）
    projectDebt: number;              // 项目债务资金（万元）
  };
  
  // 年均指标
  annualAverage: {
    operatingRevenue: number;         // 年均销售收入（万元）
    totalCost: number;                // 年均总成本费用（万元）
    taxAndSurcharges: number;         // 年均销售税金及附加（万元）
    vat: number;                      // 年均增值税（万元）
    ebit: number;                     // 年均息税前利润（万元）
    totalProfit: number;              // 年均利润总额（万元）
    incomeTax: number;                // 年均所得税（万元）
    netProfit: number;                // 年均净利润（万元）
  };
  
  // 投资效益指标
  investmentEfficiency: {
    roi: number;                      // 总投资收益率（%）
    investmentProfitRate: number;     // 投资利税率（%）
    roe: number;                      // 项目资本金净利润率（%）
  };
  
  // 偿债能力指标
  solvency: {
    interestCoverageRatio: number;    // 平均利息备付率
    debtServiceCoverageRatio: number; // 平均偿债备付率
  };
  
  // 项目投资税前指标
  preTaxIndicators: {
    irr: number;                      // 财务内部收益率（%）
    npv: number;                      // 财务净现值（万元）
    staticPaybackPeriod: number;      // 静态投资回收期（年）
    dynamicPaybackPeriod: number;     // 动态投资回收期（年）
  };
  
  // 项目投资税后指标
  postTaxIndicators: {
    irr: number;                      // 财务内部收益率（%）
    npv: number;                      // 财务净现值（万元）
    staticPaybackPeriod: number;      // 静态投资回收期（年）
    dynamicPaybackPeriod: number;     // 动态投资回收期（年）
  };
}

export function buildFinancialIndicatorsJSONFixed(indicatorsData: any): string {
  // 实现数据提取和转换逻辑
  // 详见完整实现代码...
}
```

### 2. 数据提取逻辑

#### 项目投资数据提取
```typescript
function buildInvestmentData(indicatorsJSON: any, context: any): FinancialIndicatorsJSON['investment'] {
  // 从 estimate_data 中提取
  const estimateData = indicatorsJSON.estimate_data
  
  // 建设投资 = partA + partB + partC - 土地费用
  let partATotal = Number(estimateData.partA?.合计) || 0
  let partBTotal = Number(estimateData.partB?.合计) || 0
  let landCost = 0
  if (estimateData.partB?.children) {
    const landItem = estimateData.partB.children.find((item: any) => item.工程或费用名称 === '土地费用')
    landCost = Number(landItem?.合计) || 0
  }
  let partCTotal = Number(estimateData.partC?.合计) || 0
  
  const constructionInvestment = partATotal + (partBTotal - landCost) + partCTotal
  const constructionInterest = Number(estimateData.partD?.合计) || Number(indicatorsJSON.construction_interest) || 0
  const projectDebt = Number(estimateData.partF?.贷款总额) || 0
  
  const totalInvestment = constructionInvestment + constructionInterest
  const projectEquity = totalInvestment - projectDebt
  
  return {
    totalInvestment,
    constructionInvestment,
    constructionInterest,
    totalFinancing: totalInvestment,
    projectEquity,
    projectDebt
  }
}
```

#### 年均指标数据提取
```typescript
function buildAnnualAverageData(indicatorsJSON: any, context: any): FinancialIndicatorsJSON['annualAverage'] {
  const operationYears = context.operationYears || 1
  
  // 从财务指标中提取税前总量数据
  const fi = indicatorsJSON.financialIndicators || {}
  
  // 税前数据：营业收入、总成本费用
  const operatingRevenuePreTax = Number(fi.annualRevenue || 0)
  const totalCostPreTax = Number(fi.annualTotalCost || 0)
  
  // 税后数据：利润总额、所得税、净利润
  const totalProfit = Number(fi.annualTotalProfit || 0)
  const incomeTax = Number(fi.annualIncomeTax || 0)
  const netProfit = Number(fi.annualNetProfit || 0)
  
  // 税金及附加数据
  const taxAndSurcharges = Number(fi.annualTaxAndSurcharges || 0)
  const vat = Number(fi.annualVAT || 0)
  
  // 年均指标使用税前数据
  return {
    operatingRevenue: operatingRevenuePreTax / operationYears,    // 年均销售收入（税前）
    totalCost: totalCostPreTax / operationYears,                // 年均总成本费用（税前）
    taxAndSurcharges: taxAndSurcharges / operationYears,     // 年均销售税金及附加
    vat: vat / operationYears,                                  // 年均增值税
    ebit: (operatingRevenuePreTax - taxAndSurcharges - totalCostPreTax + netProfit + incomeTax) / operationYears, // 年均息税前利润
    totalProfit: totalProfit / operationYears,              // 年均利润总额
    incomeTax: incomeTax / operationYears,                // 年均所得税
    netProfit: netProfit / operationYears                  // 年均净利润
  }
}
```

### 3. 客户端修复代码

#### 更新 reportStore.ts 中的变量定义
```typescript
// 在 loadProjectData 方法中更新 financial_indicators 变量
{
  key: '{{DATA:financial_indicators}}',
  label: '财务计算指标表JSON',
  category: 'tableData',
  value: tableDataJSON['DATA:financial_indicators'] || '{}'
}
```

#### 新增财务评价指标汇总表变量
```typescript
// 添加财务评价指标汇总表专用变量
{
  key: '{{DATA:financial_evaluation_summary}}',
  label: '财务评价指标汇总表JSON',
  category: 'tableData',
  value: tableDataJSON['DATA:financial_evaluation_summary'] || '{}'
}
```

## 实施步骤

### 步骤1: 重构服务器端JSON生成逻辑

1. 创建 `buildFinancialIndicators.fixed.ts` 文件
2. 实现新的数据结构和提取逻辑
3. 在主文件中引用新的构建函数

### 步骤2: 更新客户端数据提取逻辑

1. 修改 `reportStore.ts` 中的变量定义
2. 确保与服务器端数据结构一致
3. 更新 VariablePicker 组件中的字段映射

### 步骤3: 测试验证

1. 验证JSON弹窗数据正确性
2. 验证与财务评价指标汇总表字段一致
3. 验证报告生成功能正常

## 相关文件

- [`server/src/utils/tableDataBuilders/buildFinancialIndicators.ts`](server/src/utils/tableDataBuilders/buildFinancialIndicators.ts) - 服务器端JSON生成
- [`client/src/stores/reportStore.ts`](client/src/stores/reportStore.ts) - 客户端变量管理
- [`client/src/components/report/VariablePicker.tsx`](client/src/components/report/VariablePicker.tsx) - 变量选择器组件
- [`client/src/components/revenue-cost/FinancialIndicatorsTable.tsx`](client/src/components/revenue-cost/FinancialIndicatorsTable.tsx) - 财务指标表格组件
- [`doc/财务计算指标表数据一致性修复计划.md`](doc/财务计算指标表数据一致性修复计划.md) - 相关技术文档
