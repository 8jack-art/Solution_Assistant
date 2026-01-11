# DynamicCostTable.tsx 重构计划

## 概述
`DynamicCostTable.tsx` 文件包含多个成本估算表组件，存在严重违反JSX规范的问题：计算逻辑直接嵌入JSX渲染中，导致性能问题和潜在的渲染错误。

## 问题分析

### 违反规范的位置

#### 1. 外购原材料费估算表 (`renderRawMaterialsModal`)
- **行范围**: 683-1137
- **问题**:
  - 行 758-799: IIFE 内嵌复杂计算逻辑（计算原材料合计）
  - 行 801-837: `years.map()` 中直接进行算术运算
  - 行 851-890: IIFE 计算单个原材料项目合计
  - 行 892-926: 循环内嵌计算逻辑

#### 2. 外购燃料和动力费估算表 (`renderFuelPowerModal`)
- **行范围**: 2208-2558
- **问题**:
  - 行 2257-2280: IIFE 内嵌燃料费合计计算
  - 行 2282-2303: 循环内直接计算年度总额
  - 行 2317-2335: IIFE 计算单个燃料项目合计
  - 行 2337-2355: 年度计算逻辑内嵌

#### 3. 总成本费用估算表 (`renderCostDetailModal`)
- **行范围**: 2834-3567
- **问题**:
  - 行 2898-2967: 营业成本合计的大 IIFE
  - 行 2969-3024: 运营期年度计算内嵌
  - 行 3141-3156: 修理费计算 IIFE
  - 行 3195-3216: 其他费用计算 IIFE
  - 行 3274-3285: 利息支出计算
  - 行 3313-3325: 折旧费计算
  - 行 3349-3360: 摊销费计算
  - 行 3395-3470: 总成本费用合计的复杂 IIFE

## 重构策略

### 第一阶段：提取计算逻辑到 useMemo

#### 1.1 创建外购原材料费计算缓存
```typescript
const rawMaterialsData = useMemo(() => {
  const operationYears = context?.operationYears || 10;
  const years = Array.from({ length: operationYears }, (_, i) => i + 1);
  
  // 计算每年每项数据
  const itemsData = costConfig.rawMaterials.items?.map(item => {
    const yearlyAmounts = years.map(year => {
      const productionRate = costConfig.rawMaterials.applyProductionRate 
        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
        : 1;
      // ... 计算逻辑
    });
    return {
      id: item.id,
      name: item.name,
      yearlyAmounts,
      total: yearlyAmounts.reduce((sum, val) => sum + val, 0)
    };
  });
  
  // 计算汇总行
  const summaryYearlyAmounts = years.map(year => {
    // ... 计算所有原材料项目的年度合计
  });
  
  return { years, itemsData, summaryYearlyAmounts, ... };
}, [costConfig.rawMaterials, productionRates, revenueItems, context?.operationYears]);
```

#### 1.2 创建外购燃料动力费计算缓存
类似结构，缓存燃料动力费相关计算

#### 1.3 创建总成本费用计算缓存
最复杂的部分，需要缓存所有成本项目的年度数据和汇总

### 第二阶段：简化 JSX 渲染

#### 2.1 重构外购原材料费估算表
```jsx
// 重构前（违规）
{years.map((year) => {
  const productionRate = ...
  let yearTotal = 0;
  costConfig.rawMaterials.items?.forEach((item) => {
    // ... 计算逻辑
  });
  return <Table.Td>{formatNumberNoRounding(yearTotal)}</Table.Td>;
})}

// 重构后（合规）
{rawMaterialsData.summaryYearlyAmounts.map((value, idx) => (
  <Table.Td key={years[idx]}>{formatNumberNoRounding(value)}</Table.Td>
))}
```

### 第三阶段：验证和测试

1. 确保计算结果与重构前一致
2. 测试各种边界情况（空数据、极端值等）
3. 验证性能是否有改善

## 执行步骤

### 步骤 1: 创建计算缓存 hooks
- 创建 `useRawMaterialsCalculations()`
- 创建 `useFuelPowerCalculations()`
- 创建 `useCostSummaryCalculations()`

### 步骤 2: 重构外购原材料费估算表
- 导入新的 hook
- 替换内联计算为缓存数据引用
- 确保 key 使用数据 ID

### 步骤 3: 重构外购燃料和动力费估算表
- 同上步骤

### 步骤 4: 重构总成本费用估算表
- 同上步骤

### 步骤 5: 清理和优化
- 移除不再需要的辅助函数
- 确保依赖数组完整
- 添加必要的安全检查

## 注意事项

1. **保持计算逻辑一致性**: 确保重构后的计算结果与原代码完全一致
2. **处理空值和边界情况**: 对 `undefined`/`null` 做适当兜底
3. **性能优化**: 合理设置 useMemo 依赖数组，避免不必要的重复计算
4. **代码可读性**: 添加必要注释说明计算逻辑

## 预期收益

1. **性能提升**: 避免每次渲染都重新计算
2. **代码可维护性**: 计算逻辑集中管理，便于修改和测试
3. **符合规范**: 遵循大模型编程规范
4. **减少错误**: 避免渲染时的计算错误
