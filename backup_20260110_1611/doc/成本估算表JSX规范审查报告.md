# 成本估算表JSX规范审查报告

## 审查日期
2026-01-08

## 审查范围
- `client/src/components/revenue-cost/DynamicCostTable.tsx`
  - 外购原材料费估算表 ([`renderRawMaterialsModal()`](client/src/components/revenue-cost/DynamicCostTable.tsx:684))
  - 外购燃料和动力费估算表 ([`renderFuelPowerModal()`](client/src/components/revenue-cost/DynamicCostTable.tsx:2209))
  - 总成本费用估算表 ([`renderCostTableModal()`](client/src/components/revenue-cost/DynamicCostTable.tsx:2834))
- `client/src/components/revenue-cost/WagesModal.tsx`
  - 工资及福利费用估算表

---

## 审查结论：所有组件均严重违反"大模型编程规范"

---

## 一、外购原材料费估算表审查结果

### 文件位置
`client/src/components/revenue-cost/DynamicCostTable.tsx` 第684-1137行

### 违反规范详情

#### 规则1：计算逻辑前置化 - ❌ 严重违反

**问题位置：**
- 第757-800行：合计列计算直接在JSX的`{(() => { ... })()}`中执行多层遍历
- 第801-837行：运营期各年数据直接在`years.map()`中执行复杂计算

**违反代码示例：**
```tsx
// ❌ 错误：在JSX中直接执行计算
<Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
  {(() => {
    let totalSum = 0;
    years.forEach((year) => {  // 嵌套循环
      let yearTotal = 0;
      (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
        // 复杂计算逻辑...
        yearTotal += ...;
      });
      totalSum += yearTotal;
    });
    return formatNumberNoRounding(totalSum);
  })()}
</Table.Td>
```

#### 规则2：缓存计算结果 - ❌ 违反

- 完全没有使用`useMemo`缓存表格渲染数据
- 每次组件渲染都会重新执行所有计算逻辑

#### 规则3：表格key属性 - ✅ 部分符合

- 原材料项行使用了`item.id`作为key（第845行）
- years列使用`year`作为key（可接受，因为years是固定数组）

#### 规则4：空值处理 - ⚠️ 部分符合

- 部分使用了`(item.xxx || 0)`兜底
- 但在某些计算中仍可能产生NaN

#### 规则5：禁止修改原始数据 - ✅ 符合

- 使用`updateCostConfig`更新状态，符合不可变数据原则

---

## 二、外购燃料和动力费估算表审查结果

### 文件位置
`client/src/components/revenue-cost/DynamicCostTable.tsx` 第2209-2558行

### 违反规范详情

#### 规则1：计算逻辑前置化 - ❌ 严重违反

**问题位置：**
- 第2257-2280行：合计列计算直接在JSX中执行
- 第2282-2303行：运营期各年数据直接在map中执行复杂计算
- 第2317-2335行：各燃料项目合计计算直接在JSX中
- 第2468-2500行：外购燃料及动力（除税）计算直接在JSX中

#### 规则2：缓存计算结果 - ❌ 违反

- 完全没有使用`useMemo`缓存

#### 规则3：表格key属性 - ✅ 符合

- 燃料项目使用了`item.id`作为key（第2311行）

---

## 三、工资及福利费用估算表审查结果

### 文件位置
`client/src/components/revenue-cost/WagesModal.tsx`

### 违反规范详情

#### 规则1：计算逻辑前置化 - ❌ 严重违反

**问题位置：**
- 第743-751行：员工类别合计列计算直接在JSX中
- 第753-766行：运营期各年数据直接在map中执行
- 第775-787行：工资总额合计计算直接在JSX中
- 第825-838行：福利费合计计算直接在JSX中
- 第862-876行：总计计算直接在JSX中

**违反代码示例：**
```tsx
// ❌ 错误：在JSX中执行多年期计算
<Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
  {(() => {
    let totalSum = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      wageItems.forEach((item) => {
        const yearlySubtotal = calculateYearlySalary(item, year)
        yearTotal += yearlySubtotal
      });
      totalSum += yearTotal;
    });
    return formatNumber(totalSum);
  })()}
</Table.Td>
```

#### 规则2：缓存计算结果 - ❌ 严重违反

- 仅缓存了`grandTotal`（第278行）
- **没有缓存多年期计算结果**，每次渲染都会重新计算所有年份的数据
- 多年期计算`calculateMultiYearTotal`函数复杂度高，应该缓存

#### 规则3：表格key属性 - ✅ 部分符合

- 工资项使用了`item.id`作为key（第359行）
- 明细表项使用了`item.id`作为key（第566、719行）

---

## 四、总成本费用估算表审查结果

### 文件位置
`client/src/components/revenue-cost/DynamicCostTable.tsx` 第2834-3567行

### 违反规范详情

#### 规则1：计算逻辑前置化 - ❌ 严重违反

**问题位置：**
- 第2898-2967行：营业成本合计列计算直接在JSX中执行，包含大量计算
- 第2969-3024行：营业成本运营期各年列计算直接在map中
- 第3035-3046行：外购原材料费计算使用即时函数
- 第3071-3085行：外购燃料及动力费计算使用即时函数
- 第3107-3119行：工资及福利费计算使用即时函数
- 第3395-3470行：总成本费用合计计算直接在JSX中

#### 规则2：缓存计算结果 - ❌ 违反

- 已有`generateCostTableData()`函数生成数据，但**没有使用useMemo缓存**
- 每次渲染都会重新调用`generateCostTableData()`

#### 规则3：表格key属性 - ✅ 部分符合

- 动态行使用了数据id
- 固定行使用索引作为key（可接受）

---

## 五、修复优先级

| 优先级 | 组件 | 问题严重程度 | 建议修复方式 |
|--------|------|--------------|--------------|
| P0 | 工资及福利费估算表 | 🔴 严重 | 重构使用useMemo缓存多年期数据 |
| P0 | 外购原材料费估算表 | 🔴 严重 | 重构使用useMemo预计算表格数据 |
| P0 | 外购燃料和动力费估算表 | 🔴 严重 | 重构使用useMemo预计算表格数据 |
| P1 | 总成本费用估算表 | 🟡 中等 | 为generateCostTableData添加useMemo缓存 |

---

## 六、修复后的代码结构示例

### 修复前（当前代码）
```tsx
// ❌ 错误：计算逻辑在JSX中
<Table.Td>
  {(() => {
    let total = 0;
    years.forEach(year => {
      // 复杂计算...
      total += calculateRawMaterialsExcludingTax(year, years);
    });
    return formatNumber(total);
  })()}
</Table.Td>
```

### 修复后（正确代码）
```tsx
// ✅ 正确：使用useMemo预计算
const rawMaterialsTableData = useMemo(() => {
  const rows = costConfig.rawMaterials.items?.map(item => ({
    id: item.id,
    name: item.name,
    total: years.reduce((sum, year) => sum + calculateItemYearTotal(item, year), 0),
    yearlyData: years.map(year => calculateItemYearTotal(item, year)),
  })) || [];
  
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const yearlyTotals = years.map((year, idx) => 
    rows.reduce((sum, row) => sum + row.yearlyData[idx], 0)
  );
  
  return { rows, grandTotal, yearlyTotals };
}, [costConfig.rawMaterials, productionRates, revenueItems, years]);

// JSX仅做纯渲染
<Table.Td>{formatNumber(rawMaterialsTableData.grandTotal)}</Table.Td>
{rawMaterialsTableData.yearlyTotals.map((value, idx) => (
  <Table.Td key={years[idx]}>{formatNumber(value)}</Table.Td>
))}
```

---

## 七、建议修复步骤

### 步骤1：重构工资及福利费估算表（WagesModal）
1. 为`years`、`wageItems`相关计算添加`useMemo`
2. 预计算多年期数据并缓存
3. 将计算逻辑移出JSX

### 步骤2：重构外购原材料费估算表
1. 创建`useMemo`计算原材料表格数据
2. 包含合计行和运营期各年数据
3. JSX仅做数据渲染

### 步骤3：重构外购燃料和动力费估算表
1. 创建`useMemo`计算燃料表格数据
2. 包含合计行和运营期各年数据
3. JSX仅做数据渲染

### 步骤4：重构总成本费用估算表
1. 为`generateCostTableData`结果添加`useMemo`缓存
2. 或创建新的表格数据计算逻辑
