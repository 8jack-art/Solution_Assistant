# Word表格导出优化方案

## 当前技术栈

**富文本编辑器**：Tiptap（@tiptap/react, @tiptap/starter-kit, @mantine/tiptap）
- 项目在 [`client/src/components/report/PromptEditor.tsx`](client/src/components/report/PromptEditor.tsx:83) 和 [`client/src/components/report/ProjectOverviewModal.tsx`](client/src/components/report/ProjectOverviewModal.tsx:275) 中使用Tiptap编辑器
- Tiptap可以直接导出HTML内容

**Word生成库**：docx
- 在 [`server/src/services/reportService.ts`](server/src/services/reportService.ts:558) 中使用docx库生成Word文档

## 问题分析

当前项目使用 `docx` 库生成Word文档，主要存在以下问题：

### 1. 表格布局问题
- **列宽控制不精确**：当前使用百分比宽度，无法精确控制每列的宽度
- **行高自适应**：缺乏对行高的精确控制
- **单元格对齐**：所有单元格统一使用左对齐，无法根据数据类型设置不同对齐方式
- **边框样式单一**：所有表格使用相同的边框样式

### 2. 现有代码问题（server/src/services/reportService.ts）

#### 问题1：列宽计算过于简单
```typescript
// 当前代码（第1128行）
const columnWidth = Math.floor(100 / columns.length)
```
**问题**：所有列宽度相同，无法根据内容长度调整

#### 问题2：单元格对齐方式固定
```typescript
// 当前代码（第1172行）
alignment: AlignmentType.LEFT
```
**问题**：数字列应该右对齐，文本列应该左对齐

#### 问题3：缺乏行高控制
**问题**：没有设置行高，可能导致内容溢出或行高不一致

#### 问题4：边框样式单一
```typescript
// 当前代码（第1195-1202行）
borders: {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  // ...
}
```
**问题**：无法区分表头和数据行的边框样式

---

## 推荐方案

### 方案一：优化现有 `docx` 库使用（推荐）

**优点**：
- 无需更换依赖，改动最小
- 保持现有架构
- 可以逐步优化

**缺点**：
- `docx` 库功能有限，某些高级功能难以实现

**适用场景**：表格结构相对简单，主要需要解决布局问题

---

### 方案二：使用 `docxtemplater` 库

**优点**：
- 基于Word模板，所见即所得
- 支持复杂的表格样式
- 可以在Word中直接设计表格样式

**缺点**：
- 需要创建Word模板文件
- 学习成本较高

**适用场景**：需要高度定制化的表格样式

**安装**：
```bash
npm install docxtemplater pizzip
```

**示例代码**：
```typescript
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import fs from 'fs'

// 读取模板文件
const content = fs.readFileSync('template.docx', 'binary')
const zip = new PizZip(content)
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true
})

// 填充数据
doc.render({
  tableData: [
    { name: '项目A', value: 100 },
    { name: '项目B', value: 200 }
  ]
})

// 生成文档
const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
```

---

### 方案三：使用 `officegen` 库

**优点**：
- 支持生成多种Office格式
- API相对简单
- 社区活跃

**缺点**：
- 功能相对基础
- 样式控制有限

**适用场景**：需要同时生成Excel和Word文档

**安装**：
```bash
npm install officegen
```

---

### 方案四：使用 `easy-template-x` 库

**优点**：
- 基于模板，支持循环、条件等逻辑
- 支持图片、图表等复杂元素
- 文档完善

**缺点**：
- 需要创建模板
- 相对较新，社区较小

**适用场景**：需要复杂的文档结构

---

## 代码优化建议（基于方案一）

### 优化1：精确列宽控制

```typescript
/**
 * 创建带样式的Word表格（优化版）
 */
static createStyledTable(
  tableData: Record<string, any>[],
  columns: string[],
  styleConfig: ReportStyleConfig
): Table {
  if (!tableData || tableData.length === 0) {
    return new Table({
      rows: [],
      width: { size: 100, type: WidthType.PERCENTAGE }
    })
  }

  // 定义列宽配置（单位：EMU，1cm ≈ 360000 EMU）
  const columnWidths = this.calculateColumnWidths(columns)

  // 创建表头行
  const headerRow = new TableRow({
    children: columns.map((col, index) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: col,
                bold: true,
                size: (styleConfig.fontSizes.tableHeader || 20) * 2,
                font: styleConfig.fonts.heading,
                color: '000000'
              })
            ],
            alignment: AlignmentType.CENTER
          })
        ],
        shading: {
          fill: styleConfig.table.headerBg || 'EEEEEE'
        },
        width: { size: columnWidths[index], type: WidthType.DXA }
      })
    ),
    tableHeader: true,
    height: { value: 600, rule: 'atLeast' } // 设置最小行高
  })

  // 创建数据行
  const dataRows = tableData.map((row, rowIndex) =>
    new TableRow({
      children: columns.map((col, index) => {
        // 判断是否为数字列
        const isNumeric = this.isNumericColumn(col)
        const cellValue = String(row[col] ?? '')

        return new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cellValue,
                  size: (styleConfig.fontSizes.tableBody || 20) * 2,
                  font: styleConfig.fonts.body,
                  color: '000000'
                })
              ],
              alignment: isNumeric ? AlignmentType.RIGHT : AlignmentType.LEFT
            })
          ],
          shading: styleConfig.table.zebraStripe && rowIndex % 2 === 1
            ? { fill: 'F5F5F5' }
            : undefined,
          width: { size: columnWidths[index], type: WidthType.DXA },
          verticalAlign: 'center' // 垂直居中
        })
      }),
      height: { value: 400, rule: 'atLeast' } // 设置最小行高
    })
  )

  // 表格边框样式（表头使用粗边框）
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0)

  return new Table({
    rows: [headerRow, ...dataRows],
    width: {
      size: tableWidth,
      type: WidthType.DXA
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
    },
    // 表格整体布局
    layout: TableLayoutType.FIXED // 固定布局，避免自动调整
  })
}

/**
 * 计算列宽
 */
private static calculateColumnWidths(columns: string[]): number[] {
  // 基础宽度（EMU）
  const baseWidth = 1000000 // 约2.8cm

  // 根据列名判断宽度
  const widthMap: Record<string, number> = {
    '序号': 400000,          // 约1.1cm
    '工程或费用名称': 2000000, // 约5.6cm
    '建设工程费（万元）': 1200000,
    '设备购置费（万元）': 1200000,
    '安装工程费（万元）': 1200000,
    '其它费用（万元）': 1200000,
    '合计（万元）': 1200000,
    '单位': 600000,
    '数量': 800000,
    '单位价值（元）': 1000000,
    '占总投资比例': 1000000,
    '备注': 1500000,
    '项目': 2000000,
    '数值': 1200000,
    '单位': 600000
  }

  return columns.map(col => widthMap[col] || baseWidth)
}

/**
 * 判断是否为数字列
 */
private static isNumericColumn(columnName: string): boolean {
  const numericColumns = [
    '建设工程费（万元）',
    '设备购置费（万元）',
    '安装工程费（万元）',
    '其它费用（万元）',
    '合计（万元）',
    '数量',
    '单位价值（元）',
    '占总投资比例',
    '数值',
    '年收入',
    '年成本',
    '占比'
  ]

  return numericColumns.includes(columnName)
}
```

### 优化2：添加表格样式配置接口

```typescript
/**
 * 扩展表格样式配置
 */
interface TableStyleConfig {
  // 列宽配置
  columnWidths?: number[]  // 单位：EMU

  // 对齐方式
  headerAlignment?: 'left' | 'center' | 'right'
  numericAlignment?: 'left' | 'center' | 'right'
  textAlignment?: 'left' | 'center' | 'right'

  // 行高配置
  headerRowHeight?: number  // 单位：twips（1/20磅）
  dataRowHeight?: number

  // 边框样式
  headerBorder?: {
    top?: { style: BorderStyle; size: number; color: string }
    bottom?: { style: BorderStyle; size: number; color: string }
    left?: { style: BorderStyle; size: number; color: string }
    right?: { style: BorderStyle; size: number; color: string }
  }
  dataBorder?: {
    top?: { style: BorderStyle; size: number; color: string }
    bottom?: { style: BorderStyle; size: number; color: string }
    left?: { style: BorderStyle; size: number; color: string }
    right?: { style: BorderStyle; size: number; color: string }
  }

  // 垂直对齐
  verticalAlign?: 'top' | 'center' | 'bottom'

  // 表格布局
  layout?: 'fixed' | 'auto'
}
```

### 优化3：支持合并单元格

```typescript
/**
 * 创建支持合并单元格的表格
 */
static createMergedTable(
  tableData: Record<string, any>[],
  columns: string[],
  mergeConfig: Array<{ row: number; col: number; rowSpan: number; colSpan: number }>,
  styleConfig: ReportStyleConfig
): Table {
  const columnWidths = this.calculateColumnWidths(columns)

  const rows = tableData.map((row, rowIndex) => {
    const cells = columns.map((col, colIndex) => {
      // 检查是否需要合并
      const merge = mergeConfig.find(m => m.row === rowIndex && m.col === colIndex)

      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: String(row[col] ?? ''),
                size: (styleConfig.fontSizes.tableBody || 20) * 2,
                font: styleConfig.fonts.body
              })
            ],
            alignment: this.isNumericColumn(col) ? AlignmentType.RIGHT : AlignmentType.LEFT
          })
        ],
        width: { size: columnWidths[colIndex], type: WidthType.DXA },
        rowSpan: merge?.rowSpan || 1,
        columnSpan: merge?.colSpan || 1,
        shading: rowIndex % 2 === 1 ? { fill: 'F5F5F5' } : undefined
      })
    })

    return new TableRow({ children: cells })
  })

  return new Table({
    rows,
    width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA }
  })
}
```

---

## 实施建议

### 阶段一：快速优化（1-2天）
1. 实现列宽精确控制
2. 实现数字列右对齐
3. 添加行高控制
4. 优化边框样式

### 阶段二：功能增强（3-5天）
1. 添加表格样式配置接口
2. 支持合并单元格
3. 实现更灵活的样式控制
4. 添加表格模板功能

### 阶段三：长期优化（可选）
1. 考虑迁移到 `docxtemplater` 或其他模板库
2. 实现更复杂的表格布局
3. 添加表格样式预设

---

## 总结

**推荐方案**：优先使用**方案一**（优化现有 `docx` 库），原因：
1. 改动最小，风险最低
2. 可以快速解决主要问题
3. 保持现有架构不变

**后续考虑**：如果需要更复杂的表格样式，可以考虑迁移到 `docxtemplater` 等模板库。

**关键优化点**：
1. ✅ 精确列宽控制
2. ✅ 数字列右对齐
3. ✅ 行高控制
4. ✅ 优化边框样式
5. ✅ 垂直居中对齐
