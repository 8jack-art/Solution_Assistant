# NPV数据修复计划

## 问题描述

财务计算指标表中"项目投资财务净现值（所得税前）"和"项目投资财务净现值（所得税后）"两行的 total 汇总值计算不正确。

具体表现为：
- 各年份的 yearlyData 数值显示正确
- 但对应的 total 值与 yearlyData 中各年份值加总的结果不一致

## 根因分析

当前 NPV 的实现存在问题：
1. `CashFlowYearlyData` 接口缺少 NPV 相关字段
2. `generateCashFlowTableData` 函数没有计算各年份的折现值
3. `FinancialIndicators` 接口只返回单一的 NPV 值，没有 yearlyData
4. NPV total 值计算与 yearlyData 脱节

## 修复方案

### 步骤1：扩展数据接口

在 `CashFlowYearlyData` 接口中添加：
```typescript
// 各年份的折现值（用于NPV计算）
preTaxDiscountedValue: number;      // 所得税前折现值（用于NPV）
postTaxDiscountedValue: number;     // 所得税后折现值（用于NPV）
```

在 `FinancialIndicators` 接口中添加：
```typescript
preTaxNPVYearlyData: number[];      // 各年份的所得税前折现值
postTaxNPVYearlyData: number[];     // 各年份的所得税后折现值
```

### 步骤2：修改数据生成逻辑

在 `generateCashFlowTableData` 函数中，为每个年份计算折现值：
```typescript
// 计算各年份的折现值
const preTaxDiscountFactor = Math.pow(1 + preTaxRateDecimal, year);
const preTaxDiscountedValue = preTaxCashFlow / preTaxDiscountFactor;

const postTaxDiscountFactor = Math.pow(1 + postTaxRateDecimal, year);
const postTaxDiscountedValue = postTaxCashFlow / postTaxDiscountFactor;
```

### 步骤3：修改财务指标计算

在 `calculateFinancialIndicators` 函数中：
1. 从 `cashFlowTableData.yearlyData` 提取各年份的折现值
2. 计算 NPV yearlyData（使用 `reduce` 累加）
3. 更新 total 值计算方式

### 步骤4：修复表格渲染

确保表格渲染使用以下逻辑：
- total = yearlyData.reduce((sum, d) => sum + d, 0)

## 涉及文件

- `client/src/components/revenue-cost/FinancialIndicatorsTable.tsx`
  - 第3669-3704行：`CashFlowYearlyData` 接口
  - 第3725-3735行：`FinancialIndicators` 接口
  - 第3737-3907行：`generateCashFlowTableData` 函数
  - 第3910-3956行：`calculateFinancialIndicators` 函数

## 验证方法

1. 导出Excel并与表格显示数值对比
2. 检查 NPV total 值是否等于 yearlyData 各年份值的合计
3. 使用JSON数据导出验证 NPV yearlyData 结构

## 计算公式

各年份折现值 = 当年现金流 / (1+折现率)^年份

NPV = Σ(各年份折现值)

注意：NPV 的 yearlyData 是各年份的折现值，total 是这些折现值的累计和（不是简单的现金流折现总和）。
