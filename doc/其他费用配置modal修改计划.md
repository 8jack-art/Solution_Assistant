# 其他费用配置modal修改计划

## 需求概述

修改"其他费用配置modal"，将费用类型从固定的"直接填金额"改为可选择的下拉列表，支持"直接填金额"和"土地流转费"两种类型，并根据不同类型显示不同的输入字段和配置选项。

## 具体需求

1. **费用类型下拉选择**
   - 替换固定的"费用类型"文本框为下拉选择框
   - 选项："直接填金额"、"土地流转费"
   - 设置默认值为"直接填金额"
   - 设置`allowDeselect={false}`

2. **条件显示输入字段**
   - 当选择"直接填金额"时，保持现有的"直接金额"输入框
   - 当选择"土地流转费"时，显示"亩数"和"单价"两个文本输入框

3. **税率控制**
   - 当选择"土地流转费"时，费用税率默认为0%且不可更改
   - 当选择"直接填金额"时，保持原有的税率设置功能

4. **应用达产率控制**
   - 当选择"土地流转费"时，隐藏"应用达产率"Checkbox
   - 当选择"直接填金额"时，显示"应用达产率"Checkbox

5. **费用计算**
   - 当选择"土地流转费"时，使用"亩数"×"单价"的乘积作为费用金额
   - 当选择"直接填金额"时，直接使用输入的金额

## 技术实现方案

### 1. 数据结构修改

需要修改`otherExpenses`配置结构，添加以下字段：

```typescript
otherExpenses: {
  type: 'directAmount', // percentage, directAmount, landTransferFee
  name: '其他费用', // 费用名称
  directAmount: 0, // 直接金额
  taxRate: 9, // 费用税率（默认9%）
  applyProductionRate: false, // 默认关闭
  remark: '', // 备注字段
  expenseType: '直接填金额', // 新增：费用类型选择
  acreage: 0, // 新增：亩数（土地流转费使用）
  unitPrice: 0, // 新增：单价（土地流转费使用）
}
```

### 2. UI组件修改

#### 2.1 费用类型下拉选择框

替换原有的固定文本框：

```jsx
<Select
  label="费用类型"
  defaultValue="直接填金额"
  allowDeselect={false}
  data={[
    { value: '直接填金额', label: '直接填金额' },
    { value: '土地流转费', label: '土地流转费' },
  ]}
  value={currentConfig.expenseType || '直接填金额'}
  onChange={(value) => setTempOtherConfig({
    ...currentConfig,
    expenseType: value,
    // 当切换到土地流转费时，设置税率为0%
    ...(value === '土地流转费' ? { taxRate: 0 } : {})
  })}
/>
```

#### 2.2 条件渲染输入字段

根据费用类型显示不同的输入字段：

```jsx
{currentConfig.expenseType === '土地流转费' ? (
  <SimpleGrid cols={2}>
    <NumberInput
      label="亩数"
      value={currentConfig.acreage || 0}
      onChange={(value) => setTempOtherConfig({
        ...currentConfig,
        acreage: Number(value)
      })}
      min={0}
      decimalScale={2}
    />
    
    <NumberInput
      label="单价（元/亩）"
      value={currentConfig.unitPrice || 0}
      onChange={(value) => setTempOtherConfig({
        ...currentConfig,
        unitPrice: Number(value)
      })}
      min={0}
      decimalScale={2}
    />
  </SimpleGrid>
) : (
  <NumberInput
    label="直接金额（万元）"
    value={currentConfig.directAmount || 0}
    onChange={(value) => setTempOtherConfig({
      ...currentConfig,
      directAmount: Number(value)
    })}
    min={0}
    decimalScale={2}
  />
)}
```

#### 2.3 税率控制

```jsx
<NumberInput
  label="费用税率 (%)"
  value={currentConfig.taxRate ?? (currentConfig.expenseType === '土地流转费' ? 0 : 9)}
  onChange={(value) => setTempOtherConfig({
    ...currentConfig,
    taxRate: Number(value)
  })}
  min={0}
  max={100}
  decimalScale={2}
  allowNegative={false}
  disabled={currentConfig.expenseType === '土地流转费'}
/>
```

#### 2.4 应用达产率控制

```jsx
{currentConfig.expenseType !== '土地流转费' && (
  <Checkbox
    label="应用达产率"
    checked={currentConfig.applyProductionRate}
    onChange={(event) => setTempOtherConfig({
      ...currentConfig,
      applyProductionRate: event.currentTarget.checked
    })}
  />
)}
```

#### 2.5 费用计算显示

为土地流转费类型添加计算结果显示：

```jsx
{currentConfig.expenseType === '土地流转费' && (
  <div style={{
    padding: '8px 12px',
    backgroundColor: '#F0F8FF',
    borderRadius: '6px',
    border: '1px solid #B0D4FF',
  }}>
    <Text size="sm" c="#1E6FFF" fw={600}>
      费用金额：{calculateLandTransferFee().toFixed(2)}万元
    </Text>
  </div>
)}
```

#### 2.6 计算函数

添加土地流转费计算函数：

```jsx
// 计算土地流转费的总金额（亩数 × 单价）
const calculateLandTransferFee = () => {
  if (currentConfig.expenseType === '土地流转费') {
    const acreage = currentConfig.acreage || 0;
    const unitPrice = currentConfig.unitPrice || 0;
    return acreage * unitPrice;
  }
  return currentConfig.directAmount || 0;
};
```

### 3. 默认配置更新

更新`getDefaultCostConfig`函数中的其他费用配置：

```typescript
// 其他费用配置
otherExpenses: {
  type: 'directAmount', // percentage, directAmount, landTransferFee
  name: '其他费用', // 费用名称
  directAmount: 0, // 直接金额
  taxRate: 9, // 费用税率（默认9%）
  applyProductionRate: false, // 默认关闭
  remark: '', // 备注字段
  expenseType: '直接填金额', // 新增：费用类型选择
  acreage: 0, // 新增：亩数（土地流转费使用）
  unitPrice: 0, // 新增：单价（土地流转费使用）
}
```

### 4. 总成本费用表计算逻辑修改

修改`calculateOtherExpenses`函数以支持新的费用类型：

```typescript
const calculateOtherExpenses = (year: number) => {
  const productionRate = costConfig.otherExpenses.applyProductionRate 
    ? getProductionRate(year) 
    : 1;
  
  if (costConfig.otherExpenses.type === 'percentage') {
    const revenueBase = (revenueItems || []).reduce(
      (sum, revItem) => sum + calculateTaxableIncome(revItem), 
      0
    );
    return revenueBase * (costConfig.otherExpenses.percentage ?? 0) / 100 * productionRate;
  }
  
  // 处理土地流转费类型
  if (costConfig.otherExpenses.expenseType === '土地流转费') {
    const acreage = costConfig.otherExpenses.acreage ?? 0;
    const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
    const directAmount = acreage * unitPrice * productionRate;
    const taxRate = 0; // 土地流转费税率为0%
    // 进项税额 = 含税金额 / (1 + 税率) × 税率
    const inputTax = directAmount * taxRate / (1 + taxRate);
    // 其他费用（除税）= 含税金额 - 进项税额
    return directAmount - inputTax;
  }
  
  // 直接金额 - 其他费用（除税）= 含税金额 - 进项税额
  const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRate;
  const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
  // 进项税额 = 含税金额 / (1 + 税率) × 税率
  const inputTax = directAmount * taxRate / (1 + taxRate);
  // 其他费用（除税）= 含税金额 - 进项税额
  return directAmount - inputTax;
};
```

## 实施步骤

1. **修改数据结构**
   - 更新`otherExpenses`配置结构，添加新字段
   - 更新`getDefaultCostConfig`函数

2. **修改UI组件**
   - 替换费用类型为下拉选择框
   - 添加条件渲染逻辑，根据费用类型显示不同输入字段
   - 添加税率控制逻辑
   - 添加应用达产率控制逻辑
   - 添加计算结果显示

3. **修改计算逻辑**
   - 更新`calculateOtherExpenses`函数
   - 添加土地流转费计算函数

4. **测试验证**
   - 测试"直接填金额"类型的完整流程
   - 测试"土地流转费"类型的完整流程
   - 验证税率控制和应用达产率控制
   - 验证总成本费用表的计算结果

## 注意事项

1. 需要确保向后兼容性，对于已有的配置数据能够正常加载和使用
2. 土地流转费的税率固定为0%，且不允许用户修改
3. 土地流转费不应用达产率，所以需要隐藏"应用达产率"选项
4. 需要确保计算结果的准确性，特别是土地流转费的亩数×单价计算
5. 需要更新相关的类型定义，确保TypeScript类型检查通过

## 预期效果

修改完成后，用户将能够：
1. 通过下拉选择框选择费用类型
2. 根据选择的费用类型，看到不同的输入字段
3. 对于"土地流转费"类型，输入亩数和单价，系统自动计算费用金额
4. 对于"直接填金额"类型，直接输入费用金额
5. 系统会根据费用类型自动设置税率和应用达产率选项
6. 计算结果会正确反映在总成本费用估算表中