# DynamicCostTable.tsx - fixedAssetsInvestment 变量作用域修复

## 问题描述

在 `client/src/components/revenue-cost/DynamicCostTable.tsx` 文件的第2167行，使用了 `fixedAssetsInvestment` 变量，但该变量未在当前作用域中定义，导致 TypeScript 编译错误：

```
[ts] 找不到名称"fixedAssetsInvestment"。 (2304)
```

## 根本原因

`fixedAssetsInvestment` 变量最初是在 `renderRepairModal()` 函数内部定义的局部状态变量：

```typescript
const renderRepairModal = () => {
  const [fixedAssetsInvestment, setFixedAssetsInvestment] = useState(0);
  // ...
}
```

然而，在营业成本估算表的渲染逻辑中（第2167行和第2273行、第2421行、第2731行、第2864行）也使用了这个变量来计算修理费。由于 `fixedAssetsInvestment` 是 `renderRepairModal` 函数的局部变量，在组件的其他作用域中无法访问，导致了作用域错误。

## 解决方案

将 `fixedAssetsInvestment` 状态提升到组件级别，使其在整个组件中都可以访问：

1. **在组件顶部定义状态**（第186-187行）：
```typescript
// 固定资产投资状态（用于修理费计算）
const [fixedAssetsInvestment, setFixedAssetsInvestment] = useState(0)
```

2. **将计算函数提升到组件级别**（第1093-1172行）：
```typescript
// 计算固定资产投资金额：折旧与摊销估算表中A与D原值的合减去投资估算简表中"建设期利息"的数值
const calculateFixedAssetsInvestment = async () => {
  // ... 计算逻辑
  return finalInvestment;
};
```

3. **在 renderRepairModal 中移除重复的状态定义**，只保留计算修理费的逻辑：
```typescript
const renderRepairModal = () => {
  // 计算修理费金额
  const calculateRepairAmount = () => {
    if (costConfig.repair.type === 'percentage') {
      return fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
    } else {
      return costConfig.repair.directAmount || 0;
    }
  };
  // ...
};
```

4. **将 useEffect 移到组件级别**（第1267-1274行）：
```typescript
// 使用useEffect异步计算固定资产投资
React.useEffect(() => {
  const calculateInvestment = async () => {
    const investment = await calculateFixedAssetsInvestment();
    setFixedAssetsInvestment(investment);
  };
  calculateInvestment();
}, [depreciationData, context?.projectId]);
```

## 修复后的效果

- `fixedAssetsInvestment` 现在是组件级别的状态，可以在整个组件中访问
- 营业成本估算表中的修理费计算可以正常使用该变量
- 修理费配置弹窗也可以正常显示和计算
- TypeScript 编译错误已解决

## 影响范围

此修复影响以下代码位置：
- 第2167行：营业成本合计计算中的修理费
- 第2273行：营业成本运营期列计算中的修理费
- 第2421行：修理费合计列计算
- 第2731行：总成本费用合计计算中的修理费
- 第2864行：总成本费用运营期列计算中的修理费
- 第1207行：修理费配置弹窗中的显示

## 修复日期

2025-12-23