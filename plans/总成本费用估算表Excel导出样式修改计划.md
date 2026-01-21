# 总成本费用估算表Excel导出样式修改计划

## 任务概述

修改总成本费用估算表modal中的Excel导出功能，参考"营业收入、营业税金及附加和增值税估算表"的Excel导出样式。

## 修改内容

### 1. 修改文件
- `client/src/components/revenue-cost/DynamicCostTable.tsx`
- 函数：`handleExportCostTable`（第2326-2741行）

### 2. 修改要点

#### 2.1 替换Excel库
**当前**：使用 `xlsx` 库
**修改为**：使用 `xlsx-js-style` 库（动态导入）

```typescript
// 当前代码
import * as XLSX from 'xlsx';

// 修改为
import('xlsx-js-style').then((XLSX) => {
  // 导出逻辑
});
```

#### 2.2 双层列头结构

**当前表头**：
- 序号 | 成本项目 | 合计 | 1 | 2 | 3...（运营期年份）

**修改后表头**：
- 第一行：序号 | 成本项目 | 合计 | **计算期**（横向跨所有年度列）
- 第二行：序号 | 成本项目 | 合计 | 1 | 2 | 3 | 4...（连续自然数列）

#### 2.3 连续自然数列编号

**编号规则**：
- 建设期列头：1, 2, 3...（从1开始）
- 运营期列头：续接建设期继续编号，例如建设期2年、运营期10年，则运营期列头为3, 4, 5...12

```typescript
// 代码示例
const constructionYears = context?.constructionYears || 0;
const operationYears = context?.operationYears || 0;
const totalYearColumns = constructionYears + operationYears;

// 生成连续年度列头
const yearHeaders: string[] = [];
for (let i = 1; i <= totalYearColumns; i++) {
  yearHeaders.push(i.toString());
}
```

#### 2.4 建设期列数据填充

**建设期数据**：填充空字符串（因为建设期无成本费用数据）

```typescript
// 建设期列填充空字符串
const constructionZeros = Array(constructionYears).fill('');
```

#### 2.5 合并单元格设置

```typescript
ws['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },  // "序号"跨2行
  { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },  // "成本项目"跨2行
  { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },  // "合计"跨2行
  { s: { r: 0, c: 3 }, e: { r: 0, c: 3 + totalYearColumns - 1 } }  // "计算期"横向跨所有年度列
];
```

#### 2.6 列宽设置

参考营业收入表的列宽设置：
- 序号列：3
- 成本项目列：18
- 合计列：7
- 建设期列：7
- 运营期列：7

```typescript
const cols: any[] = [
  { wch: 3 },  // 序号
  { wch: 18 }, // 成本项目
  { wch: 7 },  // 合计
];
// 添加建设期列宽
for (let i = 0; i < constructionYears; i++) {
  cols.push({ wch: 7 });
}
// 添加运营期列宽
years.forEach(() => {
  cols.push({ wch: 7 });
});
ws['!cols'] = cols;
```

#### 2.7 样式设置

参考营业收入表的样式设置：
- 表头样式：加粗、居中、8号字、带边框
- 数值单元格样式：居中、8号字、带边框
- 成本项目列：左对齐

### 3. 修改步骤

1. 备份原文件 `client/src/components/revenue-cost/DynamicCostTable.tsx`
2. 修改 `handleExportCostTable` 函数
3. 添加 `xlsx-js-style` 库的动态导入
4. 重构数据准备逻辑，支持建设期列
5. 实现双层列头
6. 实现连续自然数列编号
7. 添加合并单元格设置
8. 添加样式设置
9. 测试验证

## Excel导出效果预览

```
         |         |      |     计算期      |
         |         |      | 1 | 2 | 3 | 4 | ...
   序号   | 成本项目  | 合计 |----------------|
         |         |      | 1 | 2 | 3 | 4 | ...
---------|----------|------|------------------
    1    | 营业成本  | xxx |   |   | xxx| xxx|
   1.1   | 外购原材料| xxx |   |   | xxx| xxx|
   1.2   | 外购燃料  | xxx |   |   | xxx| xxx|
    2    | 管理费用  |  0  |   |   |  0 |  0 |
    3    | 利息支出  | xxx |   |   | xxx| xxx|
    7    | 总成本合计| xxx |   |   | xxx| xxx|
```

## 注意事项

1. 建设期数据始终为空字符串（因为建设期无成本费用数据）
2. 运营期数据正常显示
3. 连续编号从1开始，建设期和运营期连续编号
4. 保持与营业收入表的导出样式一致
