# FinancialIndicatorsTable.tsx 修复说明

## 问题描述

在 `client/src/components/revenue-cost/FinancialIndicatorsTable.tsx` 文件中，出现了 TypeScript 错误：
```
[ts] 找不到名称"context"。 (2304)
```

错误位置：第3827行附近

## 问题原因

函数定义与函数调用之间的参数不匹配：

1. 在第3847行，`getPreTaxCashFlows` 函数被定义为没有参数的函数：
   ```typescript
   const getPreTaxCashFlows = (): number[] => {
   ```

2. 但在第2042行调用时传递了多个参数：
   ```typescript
   const preTaxCashFlows = getPreTaxCashFlows(context, calculateConstructionInvestment, calculateWorkingCapital, ...);
   ```

3. 同样的问题也存在于 `getPostTaxCashFlows` 函数中

## 修复方案

修改了两个函数的签名，使其与调用方式匹配：

### 1. 修复 getPreTaxCashFlows 函数

将原来的函数签名：
```typescript
const getPreTaxCashFlows = (): number[] => {
```

修改为：
```typescript
const getPreTaxCashFlows = (context: any, calculateConstructionInvestment: (year?: number) => number,
                                      calculateWorkingCapital: (year?: number) => number,
                                      calculateOperatingRevenue: (year?: number) => number,
                                      calculateSubsidyIncome: (year?: number) => number,
                                      calculateFixedAssetResidual: (year?: number) => number,
                                      calculateWorkingCapitalRecovery: (year?: number) => number,
                                      calculateOperatingCost: (year?: number) => number,
                                      calculateVatAndTaxes: (year?: number) => number,
                                      calculateMaintenanceInvestment: (year?: number) => number): number[] => {
```

### 2. 修复 getPostTaxCashFlows 函数

将原来的函数签名：
```typescript
const getPostTaxCashFlows = (): number[] => {
```

修改为：
```typescript
const getPostTaxCashFlows = (context: any, calculateConstructionInvestment: (year?: number) => number,
                                                calculateWorkingCapital: (year?: number) => number,
                                                calculateOperatingRevenue: (year?: number) => number,
                                                calculateSubsidyIncome: (year?: number) => number,
                                                calculateFixedAssetResidual: (year?: number) => number,
                                                calculateWorkingCapitalRecovery: (year?: number) => number,
                                                calculateOperatingCost: (year?: number) => number,
                                                calculateVatAndTaxes: (year?: number) => number,
                                                calculateMaintenanceInvestment: (year?: number) => number,
                                                calculateAdjustedIncomeTax: (year?: number) => number): number[] => {
```

## 修复结果

1. 解决了 TypeScript 编译错误："找不到名称"context""
2. 确保函数定义与函数调用之间的参数匹配
3. 保持了原有的函数逻辑不变，只修改了函数签名

## 注意事项

这些函数是财务计算的核心部分，用于计算项目投资的现金流。修复后，它们能够正确接收和使用传入的参数，包括项目上下文和各种计算函数。