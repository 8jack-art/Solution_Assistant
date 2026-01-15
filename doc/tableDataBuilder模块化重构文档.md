# tableDataBuilder 模块化重构文档

## 概述

`tableDataBuilder` 是用于将投资估算、收入成本等数据格式化为 JSON 格式的模块，主要供 LLM 提示词生成报告使用。

本次重构将原本单一的 `tableDataBuilder.ts` 文件拆分为模块化结构，提升代码可维护性和可测试性。

## 目录结构

```
server/src/utils/tableDataBuilders/
├── index.ts                           # 统一导出入口
├── shared.ts                          # 共享工具函数
├── buildInvestmentEstimate.ts         # 投资估算简表
├── buildRawMaterials.ts               # 外购原材料费估算表
├── buildFuelPower.ts                  # 外购燃料和动力费估算表
├── buildRevenueTax.ts                 # 营业收入、税金及附加估算表
├── buildDepreciationAmortization.ts   # 折旧与摊销估算表
├── buildProfitDistribution.ts         # 利润与利润分配表
├── buildProjectCashFlow.ts            # 项目投资现金流量表
├── buildLoanRepayment.ts              # 借款还本付息计划表
├── buildTotalCost.ts                  # 总成本费用估算表
├── buildFinancialIndicators.ts        # 财务评价指标汇总表
└── buildFinancialStaticDynamic.ts     # 财务静态动态指标
```

## 文件说明

### shared.ts

包含所有构建函数共用的工具函数：

- `safeParseJSON(data: any)`: 安全解析 JSON 字符串
- `formatNumber2(value: any)`: 安全获取原始数值（保留原始精度）
- `formatString(value: any)`: 安全获取字符串，空值返回空字符串

### 各 buildXXX.ts 文件

每个文件负责构建特定表格的 JSON 数据，导出格式为 `buildXXXJSON(data: any): string`。

| 文件 | 函数 | 用途 |
|------|------|------|
| buildInvestmentEstimate.ts | `buildInvestmentEstimateJSON` | 投资估算简表 |
| buildRawMaterials.ts | `buildRawMaterialsJSON` | 外购原材料费估算表 |
| buildFuelPower.ts | `buildFuelPowerJSON` | 外购燃料和动力费估算表 |
| buildWages.ts | `buildWagesJSON` | 工资及福利费估算表 |
| buildRevenueTax.ts | `buildRevenueTaxJSON` | 营业收入、税金及附加估算表 |
| buildDepreciationAmortization.ts | `buildDepreciationAmortizationJSON` | 折旧与摊销估算表 |
| buildProfitDistribution.ts | `buildProfitDistributionJSON` | 利润与利润分配表 |
| buildProjectCashFlow.ts | `buildProjectCashFlowJSON` | 项目投资现金流量表 |
| buildLoanRepayment.ts | `buildLoanRepaymentJSON` | 借款还本付息计划表 |
| buildTotalCost.ts | `buildTotalCostJSON` | 总成本费用估算表 |
| buildFinancialIndicators.ts | `buildFinancialIndicatorsJSON` | 财务评价指标汇总表 |
| buildFinancialStaticDynamic.ts | `buildFinancialStaticDynamicJSON` | 财务静态动态指标 |

### index.ts

作为模块的统一导出入口，使用 `export *` 重新导出所有构建函数和工具函数。

### tableDataBuilder.ts

主入口文件，保持向后兼容，从模块化目录导入并重新导出所有函数。

## 使用方法

### 方法一：直接导入单个构建函数

```typescript
import { buildInvestmentEstimateJSON } from './utils/tableDataBuilders/buildInvestmentEstimate.js'

const json = buildInvestmentEstimateJSON(estimateData)
```

### 方法二：从统一入口导入

```typescript
import { buildInvestmentEstimateJSON, buildRevenueTaxJSON } from './utils/tableDataBuilder.js'

const investmentJson = buildInvestmentEstimateJSON(estimateData)
const revenueJson = buildRevenueTaxJSON(revenueData)
```

### 方法三：使用聚合函数构建所有表格

```typescript
import { buildAllTableDataJSON } from './utils/tableDataBuilder.js'

const allTableData = buildAllTableDataJSON(projectData)
// 返回 Record<string, string>，键为 DATA:xxx 格式
```

## 输出变量格式

所有构建函数输出 JSON 字符串，变量名遵循 `DATA:xxx` 格式：

| 变量名 | 对应表格 |
|--------|----------|
| `DATA:investment_estimate` | 投资估算简表 |
| `DATA:depreciation_amortization` | 折旧与摊销估算表 |
| `DATA:revenue_tax` | 营业收入、税金及附加估算表 |
| `DATA:raw_materials` | 外购原材料费估算表 |
| `DATA:fuel_power` | 外购燃料和动力费估算表 |
| `DATA:wages` | 工资及福利费估算表 |
| `DATA:profit_distribution` | 利润与利润分配表 |
| `DATA:project_cash_flow` | 项目投资现金流量表 |
| `DATA:financial_indicators` | 财务评价指标汇总表 |
| `DATA:loan_repayment` | 借款还本付息计划表 |
| `DATA:total_cost` | 总成本费用估算表 |
| `DATA:financial_static_dynamic` | 财务静态动态指标 |

## 新增表格类型指南

1. 在 `server/src/utils/tableDataBuilders/` 下创建新文件 `buildXXX.ts`
2. 导入 `safeParseJSON` 等工具函数
3. 编写 `buildXXXJSON` 函数，返回 JSON 字符串
4. 在 `index.ts` 中添加导出 `export * from './buildXXX.js'`
5. （可选）在 `tableDataBuilder.ts` 的 `buildAllTableDataJSON` 中添加调用

## 向后兼容性

原 `tableDataBuilder.ts` 的导出接口保持不变，现有代码无需修改即可继续使用：

```typescript
// 原有用法，无需修改
import { buildAllTableDataJSON, buildInvestmentEstimateJSON } from './utils/tableDataBuilder.js'
```

## 数据来源

各构建函数从以下数据源获取数据：

- `projectData.investment`: 投资估算数据
- `projectData.revenueCost`: 收入成本数据（包含 revenueItems、costTableData 等）
- `projectData.depreciation`: 折旧摊销数据
- `projectData.project`: 项目基本信息（运营期、建设期等）

## 注意事项

1. 所有构建函数都返回 JSON 字符串，不是对象
2. 工具函数已从各构建函数中提取到 `shared.ts`，避免重复代码
3. 修改某个构建函数不会影响其他函数
4. TypeScript 编译已验证通过
