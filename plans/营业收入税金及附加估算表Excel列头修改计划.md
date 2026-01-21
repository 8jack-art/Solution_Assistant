# 营业收入、营业税金及附加和增值税估算表Excel导出列头修改计划

## 需求概述（更新）

修改"营业收入、营业税金及附加和增值税估算表"modal中导出Excel的功能：
1. 添加双层列头结构
2. 第一行：父级列头"计算期"，横跨并包含所有建设期和运营期的列
3. 第二行：
   - 建设期列：使用自然数列，从1开始编号
   - 运营期列：续接建设期的最后一个编号继续排列
4. 建设期和运营期的0值单元格显示为空字符串（保留边框）

## 期望效果示例

建设期=2年，运营期=10年：

| **序号** | **收入项目** | **合计** | **计算期** |  |  |  |  |  |  |  |  |  |  |
|----------|--------------|----------|------------|--|--|--|--|--|--|--|--|--|--|
|          |              |          | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| 1 | 营业收入 | xxx |  |  | xxx | xxx | xxx | xxx | xxx | xxx | xxx | xxx | xxx | xxx |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

**说明**：
- 建设期列（1、2）和运营期列中的0值显示为空白单元格
- 保留单元格边框，确保表格结构完整

**合并单元格说明**：
1. **序号** - 跨2行（合并第1行第1列和第2行第1列）
2. **收入项目** - 跨2行（合并第1行第2列和第2行第2列）
3. **合计** - 跨2行（合并第1行第3列和第2行第3列）
4. **计算期** - 跨1行，但横向跨越所有年度列（第4列到第15列）

## 修改方案

### 核心修改点

使用 `xlsx-js-style` 库创建双层列头，需要：

1. **创建两行表头**
   - 第一行：序号、收入项目、合计、"计算期"（合并单元格）
   - 第二行：序号、收入项目、合计、1、2、3...（连续自然数列）

2. **设置合并单元格**
   - "计算期"单元格需要横向合并，覆盖所有年度列

3. **修改年度列编号**
   - 建设期：1, 2, 3...（从1开始）
   - 运营期：续接建设期编号

### 代码修改位置

文件：`client/src/components/revenue-cost/DynamicRevenueTable.tsx`
函数：`handleExportRevenueTable()` (第943-1211行)

### 修改前代码逻辑（第956-965行）
```typescript
// 准备Excel数据（使用数组形式，确保列顺序正确）
const constructionYears = context?.constructionYears || 0;
const constructionYearHeaders = Array.from({ length: constructionYears }, (_, i) => `建设期${i + 1}`);
const operationYearHeaders = years.map(y => y.toString());
const headers = ['序号', '收入项目', '合计', ...constructionYearHeaders, ...operationYearHeaders];
const excelData: any[] = [headers];
```

### 修改后代码逻辑

```typescript
// 准备Excel数据（使用数组形式，确保列顺序正确）
const constructionYears = context?.constructionYears || 0;
const totalYearColumns = constructionYears + operationYears;

// 第二行表头：年度列使用连续自然数列
const yearHeaders: string[] = [];
for (let i = 1; i <= totalYearColumns; i++) {
  yearHeaders.push(i.toString());
}

// 第一行表头：序号、收入项目、合计、"计算期"
const headerRow1: any[] = ['序号', '收入项目', '合计'];
// 添加"计算期"占位（后续需要合并单元格）
headerRow1.push('计算期');
// 填充剩余位置（使"计算期"横跨所有年度列）
for (let i = 1; i < totalYearColumns; i++) {
  headerRow1.push('');
}

// 第二行表头：序号、收入项目、合计、各年度编号
const headerRow2: any[] = ['序号', '收入项目', '合计', ...yearHeaders];

const excelData: any[] = [headerRow1, headerRow2];

// 设置合并单元格
ws['!merges'] = [
  // "序号"跨2行：第0-1行，第0列
  { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
  // "收入项目"跨2行：第0-1行，第1列
  { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
  // "合计"跨2行：第0-1行，第2列
  { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
  // "计算期"横向跨所有年度列：第0行，第3列到第(3+totalYearColumns-1)列
  { s: { r: 0, c: 3 }, e: { r: 0, c: 3 + totalYearColumns - 1 } }
];

// 4. 建设期0值显示为空字符串
const constructionZeros = Array(constructionYears).fill('');

// 5. 运营期0值显示为空字符串（保留边框）
// 在遍历单元格设置样式时处理
const operationYearStartCol = 3 + constructionYears;
for (let R = range.s.r; R <= range.e.r; R++) {
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
    if (!ws[cellAddress]) continue;
    
    // 判断是否为运营期列
    const isOperationYearColumn = C >= operationYearStartCol;
    
    // 对于运营期数值列，检查值是否为0，如果是则显示为空字符串
    if (isOperationYearColumn && typeof ws[cellAddress].v === 'number' && ws[cellAddress].v === 0) {
      ws[cellAddress].v = '';
      ws[cellAddress].t = 's';  // 设置为字符串类型
      ws[cellAddress].s = cellStyle;  // 应用样式但保留边框
    }
  }
}
```

## 实施步骤

1. ✅ 分析DynamicRevenueTable.tsx中handleExportRevenueTable函数的列头生成逻辑
2. ✅ 修改建设期列头生成逻辑：使用自然数列替代"建设期1"、"建设期2"格式
3. ✅ 修改运营期列头生成逻辑：续接建设期编号继续编号
4. ✅ 建设期0值单元格显示为空字符串
5. ✅ 运营期0值单元格显示为空字符串（保留边框）
6. ✅ 保存修改并备份原文件
7. ✅ 测试验证修改效果

## 涉及文件
- `client/src/components/revenue-cost/DynamicRevenueTable.tsx`
