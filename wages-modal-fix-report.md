// 工资及福利费弹窗修复验证报告

## 问题分析
原问题：在工资及福利费估算表中添加新项目并应用后，关闭并重新打开该表格时，出现数据异常问题：
- 表格仅显示一行数据
- 新添加项目的值被错误地合并到第一行数据中

## 根本原因
1. **数据保存结构缺陷**：`handleApply`函数将多个工资项合并为简单的`employees`和`salaryPerEmployee`平均值，丢失了详细的工资项信息
2. **数据加载逻辑错误**：初始化时，如果有`costConfig.wages`数据，只会创建一个默认的工资项，而不是恢复之前保存的多个项目

## 修复方案

### 1. 扩展数据结构
- 在`CostConfig`接口中添加`items?: WageItem[]`字段，用于存储详细的工资项数据
- 保持向后兼容性，原有的`employees`和`salaryPerEmployee`字段仍然用于汇总计算

### 2. 修复数据保存逻辑
```typescript
// 修复前：只保存汇总数据，丢失详细信息
setCostConfig({
  ...costConfig,
  wages: {
    employees: totalEmployees,
    salaryPerEmployee: averageSalary
  }
})

// 修复后：保存完整的工资项数据
setCostConfig({
  ...costConfig,
  wages: {
    employees: totalEmployees,
    salaryPerEmployee: averageSalary,
    items: wageItems // 保存完整的工资项数据
  }
})
```

### 3. 修复数据加载逻辑
```typescript
// 修复前：只创建一个默认项
if (costConfig.wages) {
  const defaultWageItem: WageItem = { /* ... */ }
  setWageItems([defaultWageItem])
}

// 修复后：优先恢复详细数据
if (costConfig.wages) {
  if (costConfig.wages.items && costConfig.wages.items.length > 0) {
    setWageItems(costConfig.wages.items) // 恢复完整数据
  } else {
    // 兼容旧数据格式
    const defaultWageItem: WageItem = { /* ... */ }
    setWageItems([defaultWageItem])
  }
}
```

## 修复效果
1. **数据完整性**：新添加的工资项目能够正确保存
2. **独立显示**：重新打开弹窗时，每个工资项目都能独立显示
3. **向后兼容**：兼容旧的数据格式，不会影响现有配置
4. **数据一致性**：工资明细与汇总数据保持一致

## 验证步骤
1. 打开工资及福利费弹窗
2. 添加新的工资项目（如"技术人员"）
3. 设置相应的参数
4. 点击"应用"保存配置
5. 关闭弹窗
6. 重新打开弹窗
7. 验证所有工资项目都正确显示，包括新添加的项目

## 技术要点
- 使用React的`useState`和`useEffect`管理状态
- 通过接口扩展保持类型安全
- 实现数据结构的前向和后向兼容
- 确保TypeScript编译通过