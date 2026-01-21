 # 借款还本付息计划表Excel导出样式修改计划

## 任务目标

修改借款还本付息计划表modal的Excel导出功能，参考营业收入表的导出样式：
- 使用xlsx-js-style库
- 合并"建设期"和"运营期"列头为"计算期"
- 保持现有列结构

## 修改文件

- `client/src/components/revenue-cost/LoanRepaymentScheduleTable.tsx`

## 修改步骤

### 1. 备份原文件
- 复制当前文件到 `backup_20260118_1630_LoanRepaymentScheduleTable.tsx`

### 2. 修改导入
- 将 `import * as XLSX from 'xlsx'` 改为动态导入 `import('xlsx-js-style')`

### 3. 修改handleExportExcel函数

#### 3.1 替换Excel库使用方式
```typescript
// 改为动态导入
const XLSX = await import('xlsx-js-style');
```

#### 3.2 修改第一行列头
```typescript
// 修改前
const header1 = [
  '序号',
  '项目',
  '合计',
  ...Array(constructionYears).fill('建设期'),
  ...Array(operationYears).fill('运营期')
];

// 修改后
const header1 = [
  '序号',
  '项目',
  '合计',
  ...Array(totalYears).fill('计算期')
];
```

#### 3.3 保留第二行年份编号（已是连续自然数，无需修改）
```typescript
const header2 = ['', '', ''];
for (let i = 1; i <= totalYears; i++) {
  header2.push(i.toString());
}
```

#### 3.4 修改合并单元格逻辑
```typescript
// 修改前
if (constructionYears > 0) {
  ws['!merges'] = ws['!merges'] || [];
  ws['!merges'].push({ s: { r: 0, c: 3 }, e: { r: 0, c: 3 + constructionYears - 1 } });
}
if (operationYears > 0) {
  ws['!merges'] = ws['!merges'] || [];
  ws['!merges'].push({ s: { r: 0, c: 3 + constructionYears }, e: { r: 0, c: 3 + constructionYears + operationYears - 1 } });
}

// 修改后 - 合并为单个"计算期"跨所有年份
if (totalYears > 0) {
  ws['!merges'] = ws['!merges'] || [];
  ws['!merges'].push({ s: { r: 0, c: 3 }, e: { r: 0, c: 3 + totalYears - 1 } });
}
```

#### 3.5 添加表头样式设置
参考营业收入表的样式设置，包括：
- 字体加粗、居中对齐
- 背景填充色 `F7F8FA`
- 边框设置
- 数值列2位小数格式化

### 4. 保留现有逻辑
- 数据行生成逻辑保持不变
- 列宽设置保持不变（序号8、项目25、合计15、年份12）
- 分类行加粗逻辑保持不变

## 预期效果

导出Excel文件结构：
```
| 序号 | 项目 | 合计 |      计算期       |
|      |      |      | 1  | 2  | 3  | ... | N  |
|------|------|------|----|----|----|----|----|
| 数据行1                     |
| 数据行2                     |
| ...                         |
```

## 对比表

| 项目 | 当前实现 | 修改后 |
|------|----------|--------|
| 列头第一行 | 序号、项目、合计、建设期×N、运营期×M | 序号、项目、合计、计算期×N |
| 列头合并 | 建设期和运营期分开合并 | 合并为单个"计算期"跨所有年份 |
| Excel库 | xlsx | xlsx-js-style |
| 样式 | 基础样式 | 带边框、背景色、居中对齐等完整样式 |
