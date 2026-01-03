# ConstructionInterestModal 类型错误修复说明

## 问题描述

在 `client/src/components/revenue-cost/ConstructionInterestModal.tsx` 文件第188行出现类型错误：

```
[ts] 类型"number | """的参数不能赋给类型"number"的参数。
不能将类型"string"分配给类型"number"。 (2345)
```

## 问题原因

1. `calculateTotal()` 函数根据条件可能返回空字符串 `''` 或数字类型
2. `formatNumber()` 函数原本只接受 `number` 类型的参数
3. 当 `calculateTotal()` 返回空字符串时，传递给 `formatNumber()` 导致类型错误

## 修复方案

修改 `formatNumber()` 函数，使其能够处理 `number` 和 `string` 两种类型的参数：

```typescript
// 格式化数字显示
const formatNumber = (value: number | string): string => {
  // 处理空字符串或非数字值
  if (value === '' || value === null || value === undefined) return ''
  
  // 转换为数字
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  // 检查是否为有效数字
  if (isNaN(numValue) || numValue === 0) return ''
  
  return numValue.toFixed(2)
}
```

## 修复内容

1. 修改函数参数类型为 `number | string`
2. 添加对空字符串、null 和 undefined 的处理
3. 添加字符串到数字的类型转换
4. 添加 NaN 值的检查
5. 保持原有的格式化逻辑

## 影响范围

- 第188行：`{formatNumber(calculateTotal())}`
- 第203行：`{formatNumber(item.getData ? item.getData(year - 1) : 0)}`

这两处调用现在都能正确处理可能返回的字符串类型值。

## 测试建议

1. 验证建设期利息详情表格正常显示
2. 确认期初借款余额、期末借款余额等字段正确显示为空
3. 确认其他数值字段正确格式化为2位小数
4. 验证合计列的计算和显示正常