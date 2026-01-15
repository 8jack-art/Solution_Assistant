# investmentReturns 数据获取错误修复方案

## 问题描述
在报告生成时，`{{DATA:financial_indicators}}` 部分获取的数据不正确，`investmentReturns` 字段的所有值都是 0。

## 根本原因分析
经过深入分析，发现问题的根本原因有两个层面：

### 第一层问题：字段名称不匹配

#### 1. FinancialIndicatorsTable.tsx 中的字段名称
在 `client/src/components/revenue-cost/FinancialIndicatorsTable.tsx` 文件中，财务指标计算结果使用以下字段名称：

```typescript
interface FinancialIndicators {
  preTaxIRR: number;           // 税前财务内部收益率
  postTaxIRR: number;          // 税后财务内部收益率
  preTaxNPV: number;           // 税前财务净现值
  postTaxNPV: number;          // 税后财务净现值
  preTaxStaticPaybackPeriod: number;   // 税前静态投资回收期
  postTaxStaticPaybackPeriod: number;  // 税后静态投资回收期
  preTaxDynamicPaybackPeriod: number;   // 税前动态投资回收期
  postTaxDynamicPaybackPeriod: number;  // 税后动态投资回收期
}
```

#### 2. tableResourceBuilder.ts 中期望的字段名称
在 `client/src/utils/tableResourceBuilder.ts` 文件的 `buildFinancialIndicatorsJSON` 函数中，期望的字段名称是：

```typescript
investmentReturns: {
  firrBeforeTax: indicators.irrBeforeTax || indicators.irr || 0,
  firrAfterTax: indicators.irrAfterTax || indicators.irr || 0,
  npvBeforeTax: indicators.npvBeforeTax || indicators.npv || 0,
  npvAfterTax: indicators.npvAfterTax || indicators.npv || 0,
  paybackPeriodBeforeTax: indicators.paybackPeriodBeforeTax || indicators.paybackPeriod || 0,
  paybackPeriodAfterTax: indicators.paybackPeriodAfterTax || indicators.paybackPeriod || 0
}
```

#### 3. 字段映射关系
| 实际字段名称 (FinancialIndicatorsTable) | 期望字段名称 (tableResourceBuilder) | 说明 |
|---|---|---|
| `preTaxIRR` | `firrBeforeTax` | 税前财务内部收益率 |
| `postTaxIRR` | `firrAfterTax` | 税后财务内部收益率 |
| `preTaxNPV` | `npvBeforeTax` | 税前财务净现值 |
| `postTaxNPV` | `npvAfterTax` | 税后财务净现值 |
| `preTaxDynamicPaybackPeriod` | `paybackPeriodBeforeTax` | 税前动态投资回收期 |
| `postTaxDynamicPaybackPeriod` | `paybackPeriodAfterTax` | 税后动态投资回收期 |

### 第二层问题：财务指标数据未保存到数据库

这是更深层次的问题。即使字段名称映射正确，如果财务指标数据没有被保存到数据库，`buildFinancialIndicatorsJSON` 函数仍然无法获取到正确的数据。

#### 数据流分析
1. **计算阶段**：[`FinancialIndicatorsTable.tsx`](client/src/components/revenue-cost/FinancialIndicatorsTable.tsx:2056) 中的 `useCachedFinancialIndicators()` 函数计算财务指标数据
2. **存储阶段**：财务指标数据被缓存在组件的 `cachedFinancialIndicators` 状态中，但**从未保存到数据库**
3. **加载阶段**：[`reportStore.ts`](client/src/stores/reportStore.ts:479) 调用 `buildAllTableDataJSON(projectData)` 时，`projectData.financialIndicators` 为 `null`
4. **生成阶段**：[`buildFinancialIndicatorsJSON`](client/src/utils/tableResourceBuilder.ts:1455) 函数无法获取财务指标数据，返回全 0 值

#### 根本原因
- [`revenueCostStore.ts`](client/src/stores/revenueCostStore.ts) 中没有 `financialIndicators` 字段
- [`FinancialIndicatorsTable.tsx`](client/src/components/revenue-cost/FinancialIndicatorsTable.tsx) 中没有调用保存方法将财务指标数据保存到 store

## 修复方案
修复方案分为两个部分：

### 第一部分：修改字段名称映射

#### 修改 buildFinancialIndicatorsJSON 函数
在 `client/src/utils/tableResourceBuilder.ts` 文件的 `buildFinancialIndicatorsJSON` 函数中：

**修改前：**
```typescript
investmentReturns: {
  firrBeforeTax: indicators.irrBeforeTax || indicators.irr || 0,
  firrAfterTax: indicators.irrAfterTax || indicators.irr || 0,
  npvBeforeTax: indicators.npvBeforeTax || indicators.npv || 0,
  npvAfterTax: indicators.npvAfterTax || indicators.npv || 0,
  paybackPeriodBeforeTax: indicators.paybackPeriodBeforeTax || indicators.paybackPeriod || 0,
  paybackPeriodAfterTax: indicators.paybackPeriodAfterTax || indicators.paybackPeriod || 0
}
```

**修改后：**
```typescript
investmentReturns: {
  firrBeforeTax: indicators.preTaxIRR || 0,
  firrAfterTax: indicators.postTaxIRR || 0,
  npvBeforeTax: indicators.preTaxNPV || 0,
  npvAfterTax: indicators.postTaxNPV || 0,
  paybackPeriodBeforeTax: indicators.preTaxDynamicPaybackPeriod || 0,
  paybackPeriodAfterTax: indicators.postTaxDynamicPaybackPeriod || 0
}
```

#### 修改 buildFinancialSummaryJSON 函数
同样在 `buildFinancialSummaryJSON` 函数中也进行了相同的字段名称映射修改。

### 第二部分：添加财务指标数据保存机制

#### 1. 在 revenueCostStore 中添加 financialIndicators 字段

在 `RevenueCostState` 接口中添加：
```typescript
// ========== 财务指标数据 ==========
financialIndicators: any | null  // 财务指标数据（IRR、NPV、投资回收期等）
```

在初始状态中添加：
```typescript
financialIndicators: null,
```

在 reset 方法中添加：
```typescript
financialIndicators: null,
```

#### 2. 在 revenueCostStore 中添加 setFinancialIndicators 方法

```typescript
setFinancialIndicators: (data: any) => {
  set({ financialIndicators: data })
  // 触发自动保存
  debouncedSave()
},
```

#### 3. 在 saveToBackend 方法中包含 financialIndicators

```typescript
const modelData = {
  revenueItems: state.revenueItems,
  costItems: state.costItems,
  productionRates: state.productionRates,
  aiAnalysisResult: state.aiAnalysisResult,
  costConfig: state.costConfig,
  workflow_step: state.currentStep,
  revenueTableData: state.revenueTableData,
  costTableData: state.costTableData,
  profitDistributionTableData: state.profitDistributionTableData,
  loanRepaymentTableData: state.loanRepaymentTableData,
  financialIndicators: state.financialIndicators,  // 新增
  // 添加折旧与摊销数据
  depreciationAmortization: state.context?.depreciationAmortization || null
};
```

#### 4. 在 loadFromBackend 方法中加载 financialIndicators

```typescript
set({
  revenueItems: modelData?.revenueItems || [],
  costItems: modelData?.costItems || [],
  productionRates: modelData?.productionRates || [],
  aiAnalysisResult: modelData?.aiAnalysisResult || estimate.ai_analysis_result || null,
  costConfig: modelData?.costConfig || getDefaultCostConfig(),
  revenueTableData: modelData?.revenueTableData || null,
  costTableData: modelData?.costTableData || null,
  profitDistributionTableData: modelData?.profitDistributionTableData || null,
  loanRepaymentTableData: modelData?.loanRepaymentTableData || null,
  financialIndicators: modelData?.financialIndicators || null,  // 新增
  loanConfig: modelData?.loanConfig || getDefaultLoanConfig(),
  currentStep: estimate.workflow_step || 'period',
  context: newContext
})
```

#### 5. 在 FinancialIndicatorsTable 中保存财务指标数据

在 `useCachedFinancialIndicators` 函数中添加保存逻辑：

```typescript
// 基于现金流表数据计算财务指标
const indicators = calculateFinancialIndicators(cashFlowTableData);

// 缓存结果
setCachedFinancialIndicators(indicators);
setLastCalculationKey(calculationKey);

// 保存财务指标数据到 store
setFinancialIndicators(indicators);

return indicators;
```

## 实施步骤
1. ✅ 修改 `client/src/utils/tableResourceBuilder.ts` 文件中的字段名称映射
2. ✅ 在 `client/src/stores/revenueCostStore.ts` 中添加 `financialIndicators` 字段
3. ✅ 在 `client/src/stores/revenueCostStore.ts` 中添加 `setFinancialIndicators` 方法
4. ✅ 在 `client/src/stores/revenueCostStore.ts` 的 `saveToBackend` 方法中包含 `financialIndicators`
5. ✅ 在 `client/src/stores/revenueCostStore.ts` 的 `loadFromBackend` 方法中加载 `financialIndicators`
6. ✅ 在 `client/src/stores/revenueCostStore.ts` 的 `reset` 方法中重置 `financialIndicators`
7. ✅ 在 `client/src/components/revenue-cost/FinancialIndicatorsTable.tsx` 中调用 `setFinancialIndicators` 保存数据
8. ⏳ 测试财务指标数据是否能正确保存和加载
9. ⏳ 验证报告生成功能

## 验证方法
1. 在财务指标表页面，打开"财务计算指标表"弹窗
2. 检查财务指标是否正确计算（IRR、NPV、投资回收期等）
3. 刷新页面，再次打开财务指标表，确认数据是否保持
4. 在报告生成页面，点击"生成报告"按钮
5. 检查生成的报告内容中 `{{DATA:financial_indicators}}` 部分的 `investmentReturns` 数据
6. 确认以下字段是否正确显示：
   - `税前.财务内部收益率`
   - `税前.财务净现值`
   - `税前.全部投资回收期`
   - `税后.财务内部收益率`
   - `税后.财务净现值`
   - `税后.全部投资回收期`

## 修改文件清单
1. `client/src/utils/tableResourceBuilder.ts` - 修改字段名称映射
2. `client/src/stores/revenueCostStore.ts` - 添加财务指标字段和保存方法
3. `client/src/components/revenue-cost/FinancialIndicatorsTable.tsx` - 添加保存财务指标数据的逻辑
