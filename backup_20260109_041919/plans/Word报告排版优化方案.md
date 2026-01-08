# Word报告排版优化方案

## 1. 现状分析

### 1.1 当前技术栈
- **前端**：React + Tiptap富文本编辑器 + 实时预览
- **后端**：Express + `docx`库生成Word文档
- **内容格式**：仅支持Markdown简单语法（标题、列表、段落）

### 1.2 当前问题
- ❌ 不支持表格（tables）
- ❌ 不支持图片（images）
- ❌ 排版样式有限
- ❌ 预览与实际Word输出可能不一致
- ❌ 无法自定义字体、字号、行间距等样式
- ❌ 不支持分章节（封面、目录、正文、附录）

---

## 2. 目标

实现"有图有表格、排版整齐、分章节"的Word报告输出：
- ✅ 支持动态图表嵌入（ECharts等）
- ✅ 支持业务数据表格（投资估算简表、收入成本明细表）
- ✅ 支持财务指标汇总表（ROI、NPV、IRR等）
- ✅ 支持样式自定义（字体、字号、行间距、页边距等）
- ✅ 支持分章节功能（封面、目录、正文、附录）
- ✅ 提示词中插入变量，生成时实时渲染表格/图表
- ✅ 预览与导出格式高度一致
- ✅ 排版整洁美观

---

## 3. 技术方案：混合输出模式 + 分章节架构

### 3.1 核心架构

```mermaid
flowchart TD
    subgraph 用户编辑阶段
        A[用户编辑提示词] --> B[VariablePicker选择变量]
        B --> C[插入 {{TABLE:xxx}} 或 {{CHART:xxx}}]
        A --> D[样式设置面板]
        D --> E[选择字体、字号、行间距等]
        A --> F[章节设置面板]
        F --> G[配置封面、目录、正文、附录内容]
    end
    
    subgraph 报告生成阶段
        C --> H[LLM生成文本内容]
        H --> I[前端解析内容中的变量标记]
        I --> J[渲染对应的表格或图表]
        J --> K[应用样式设置]
        K --> L[按章节组织内容]
        L --> M[生成预览]
    end
    
    subgraph Word导出阶段
        M --> N[后端解析内容]
        N --> O[按章节构建Word文档]
        O --> P[生成封面、目录、正文、附录]
        P --> Q[用户下载Word]
    end
```

### 3.2 章节结构设计

报告支持以下章节结构：

```typescript
interface ReportSections {
  cover: CoverSection      // 封面
  toc: TableOfContentsSection  // 目录（自动生成）
  body: BodySection[]      // 正文章节（可多个）
  appendix: AppendixSection[]  // 附录（可多个）
}

interface CoverSection {
  enabled: boolean
  title: string            // 报告标题
  subtitle?: string        // 副标题
  projectName: string      // 项目名称
  companyName?: string     // 编制单位
  author?: string          // 编制人
  date: string             // 编制日期
  logo?: string            // Logo图片base64
}

interface TableOfContentsSection {
  enabled: boolean
  title: string            // 目录标题
  includePageNumbers: boolean  // 包含页码
  depth: number            // 目录深度（1-3级标题）
}

interface BodySection {
  id: string
  title: string            // 章节标题
  content: string          // Markdown内容（含变量标记）
  level: number            // 标题级别
}

interface AppendixSection {
  id: string
  title: string            // 附录标题
  content: string          // Markdown内容（含变量标记）
}
```

### 3.3 章节模板示例

```markdown
# 封面
---
title: 投资项目方案报告
subtitle: 基于XX项目的可行性分析
projectName: XX投资项目
companyName: XX投资咨询有限公司
author: 张三
date: 2024年1月

# 目录
---
enabled: true
title: 目录
includePageNumbers: true
depth: 3

# 正文 - 第一章 项目概述
---
title: 第一章 项目概述
level: 1
content: |
  ## 1.1 项目背景
  {{TABLE:project_background}}
  
  ## 1.2 项目概况
  项目名称：{{project_name}}
  投资总额：{{total_investment}}万元
  建设周期：{{construction_years}}年

# 正文 - 第二章 投资估算
---
title: 第二章 投资估算
level: 1
content: |
  ## 2.1 投资估算概述
  
  {{TABLE:investment_estimate}}
  
  ## 2.2 投资构成分析
  
  {{CHART:investment_composition}}

# 附录
---
title: 附录
content: |
  ## 附录A 财务指标明细表
  
  {{TABLE:financial_indicators}}
  
  ## 附录B 还款计划
  
  {{TABLE:loan_repayment}}
```

---

## 4. 样式自定义功能

### 4.1 可配置样式项

| 样式类别 | 配置项 | 默认值 | 可选值 |
|---------|--------|--------|--------|
| **字体设置** | 正文字体 | 仿宋_GB2312 | 仿宋_GB2312、宋体、微软雅黑、楷体 |
| | 标题字体 | 黑体 | 黑体、宋体、微软雅黑 |
| | 数字字体 | Times New Roman | Times New Roman、Arial |
| **字号设置** | 标题字号 | 二号（22pt） | 一号、二号、三号、四号、小四 |
| | 正文字号 | 小四（12pt） | 小四、五号、小五 |
| | 表名字号 | 小四（12pt） | 小四、五号 |
| | 表头字号 | 五号（10.5pt） | 五号、小五 |
| **段落设置** | 行间距 | 1.5倍 | 1.0、1.25、1.5、2.0、固定值28磅 |
| | 段前间距 | 0行 | 0、0.5、1、1.5、2行 |
| | 段后间距 | 0行 | 0、0.5、1、1.5、2行 |
| **页面设置** | 页边距-上 | 2.5厘米 | 1.0-5.0厘米 |
| | 页边距-下 | 2.5厘米 | 1.0-5.0厘米 |
| | 页边距-左 | 2.5厘米 | 1.0-5.0厘米 |
| | 页边距-右 | 2.5厘米 | 1.0-5.0厘米 |
| **表格样式** | 表头背景色 | EEEEEE | 颜色代码 |
| | 表格边框 | 实线 | 实线、虚线、无边框 |
| | 斑马纹 | 关闭 | 开启、关闭 |

### 4.2 样式配置数据结构

```typescript
interface ReportStyleConfig {
  // 字体设置
  fonts: {
    body: string        // 正文字体
    heading: string     // 标题字体
    number: string      // 数字字体
  }
  
  // 字号设置
  fontSizes: {
    title: number       // 标题字号（pt）
    body: number        // 正文字号（pt）
    tableTitle: number  // 表名字号（pt）
    tableHeader: number // 表头字号（pt）
    tableBody: number   // 表体字号（pt）
  }
  
  // 段落设置
  paragraph: {
    lineSpacing: number | 'fixed'  // 行间距倍数或固定值
    lineSpacingValue?: number       // 固定行间距值（磅）
    spaceBefore: number             // 段前间距（行）
    spaceAfter: number              // 段后间距（行）
  }
  
  // 页面设置
  page: {
    margin: {
      top: number     // 上边距（cm）
      bottom: number  // 下边距（cm）
      left: number    // 左边距（cm）
      right: number   // 右边距（cm）
    }
    orientation: 'portrait' | 'landscape'  // 纸张方向
  }
  
  // 表格样式
  table: {
    headerBg: string      // 表头背景色
    border: string        // 边框样式
    zebraStripe: boolean  // 斑马纹
    alignment: 'left' | 'center' | 'right'  // 单元格对齐
  }
}

// 默认样式配置
const defaultStyleConfig: ReportStyleConfig = {
  fonts: {
    body: '仿宋_GB2312',
    heading: '黑体',
    number: 'Times New Roman'
  },
  fontSizes: {
    title: 22,    // 二号
    body: 12,     // 小四
    tableTitle: 12,
    tableHeader: 10.5,  // 五号
    tableBody: 10.5
  },
  paragraph: {
    lineSpacing: 1.5,
    spaceBefore: 0,
    spaceAfter: 0
  },
  page: {
    margin: {
      top: 2.5,
      bottom: 2.5,
      left: 2.5,
      right: 2.5
    },
    orientation: 'portrait'
  },
  table: {
    headerBg: 'EEEEEE',
    border: 'single',
    zebraStripe: false,
    alignment: 'left'
  }
}
```

---

## 5. 变量标记语法

```markdown
## 投资估算分析

以下是该项目的投资估算详细数据：

{{TABLE:investment_estimate}}

投资构成情况见下图：

{{CHART:investment_composition}}

## 财务指标

关键财务指标如下：

{{TABLE:financial_indicators}}

现金流趋势分析：

{{CHART:cash_flow_trend}}
```

### 可用变量列表

| 变量Key | 标签 | 说明 |
|---------|------|------|
| `table:investment_estimate` | 投资估算简表 | 建筑工程费、设备购置费等明细 |
| `table:revenue_cost_detail` | 收入成本明细表 | 各年度收入、成本数据 |
| `table:financial_indicators` | 财务指标汇总表 | ROI、NPV、IRR、投资回收期 |
| `table:loan_repayment` | 还款计划表 | 贷款还款计划明细 |
| `table:project_background` | 项目背景表 | 项目基本信息 |
| `chart:investment_composition` | 投资构成图 | 饼图展示各部分占比 |
| `chart:revenue_trend` | 收入趋势图 | 折线图展示年度收入 |
| `chart:cost_trend` | 成本趋势图 | 折线图展示年度成本 |
| `chart:cash_flow_trend` | 现金流趋势图 | 折线图展示现金流变化 |
| `chart:profit_analysis` | 利润分析图 | 柱状图展示利润情况 |

---

## 6. 实现步骤

### Step 1：创建章节配置组件

**前端**：新建 `client/src/components/report/SectionConfigPanel.tsx`

- 封面设置（标题、副标题、项目名称、编制单位、编制人、日期）
- 目录设置（启用/禁用、包含页码、目录深度）
- 正文章节管理（添加、删除、编辑章节）
- 附录管理（添加、删除、编辑附录）

### Step 2：创建样式设置组件

**前端**：新建 `client/src/components/report/StyleSettingsPanel.tsx`

- 实现字体、字号、段落、页面、表格的设置UI
- 支持实时预览样式效果
- 保存/重置样式配置

### Step 3：扩展变量系统

**前端**：`client/src/components/report/VariablePicker.tsx`

- 添加表格变量分类（table:*）
- 添加图表变量分类（chart:*）
- 点击变量插入到编辑器光标位置

### Step 4：图表转图片组件

**前端**：`client/src/components/report/ReportPreview.tsx`

- ECharts图表渲染为Canvas
- Canvas转为Base64图片
- 支持配置图表尺寸和分辨率

### Step 5：章节内容解析与渲染

**前端**：`ReportPreview.tsx`

- 解析封面内容并渲染
- 自动生成目录（基于标题层级）
- 解析正文章节内容
- 解析附录内容
- 根据样式配置渲染

### Step 6：Word封面生成器

**后端**：`reportService.ts`

```typescript
// 创建Word封面
function createCoverPage(cover: CoverSection, styleConfig: ReportStyleConfig): Paragraph[] {
  const paragraphs: Paragraph[] = []
  
  // 标题
  paragraphs.push(new Paragraph({
    children: [new TextRun({
      text: cover.title,
      font: styleConfig.fonts.heading,
      size: 44,  // 初号
      bold: true
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 }
  }))
  
  // 副标题（如果有）
  if (cover.subtitle) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: cover.subtitle,
        font: styleConfig.fonts.body,
        size: 24
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    }))
  }
  
  // 空行
  paragraphs.push(new Paragraph({ text: '', spacing: { after: 800 } }))
  
  // 项目名称
  paragraphs.push(new Paragraph({
    children: [new TextRun({
      text: `项目名称：${cover.projectName}`,
      font: styleConfig.fonts.body,
      size: styleConfig.fontSizes.body * 2
    })],
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 2400 },  // 左缩进2字符
    spacing: { after: 200 }
  }))
  
  // 编制单位（如果有）
  if (cover.companyName) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: `编制单位：${cover.companyName}`,
        font: styleConfig.fonts.body,
        size: styleConfig.fontSizes.body * 2
      })],
      alignment: AlignmentType.LEFT,
      indent: { firstLine: 2400 },
      spacing: { after: 200 }
    }))
  }
  
  // 编制人（如果有）
  if (cover.author) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: `编制人：${cover.author}`,
        font: styleConfig.fonts.body,
        size: styleConfig.fontSizes.body * 2
      })],
      alignment: AlignmentType.LEFT,
      indent: { firstLine: 2400 },
      spacing: { after: 200 }
    }))
  }
  
  // 编制日期
  paragraphs.push(new Paragraph({
    children: [new TextRun({
      text: `编制日期：${cover.date}`,
      font: styleConfig.fonts.body,
      size: styleConfig.fontSizes.body * 2
    })],
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 2400 },
    spacing: { after: 200 }
  }))
  
  return paragraphs
}
```

### Step 7：Word目录生成器

**后端**：`reportService.ts`

```typescript
// 创建Word目录
function createTableOfContents(
  toc: TableOfContentsSection,
  bodySections: BodySection[],
  styleConfig: ReportStyleConfig
): Paragraph[] {
  const paragraphs: Paragraph[] = []
  
  // 目录标题
  paragraphs.push(new Paragraph({
    children: [new TextRun({
      text: toc.title,
      font: styleConfig.fonts.heading,
      size: styleConfig.fontSizes.title * 2,
      bold: true
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 400 }
  }))
  
  // 提取所有标题
  const headings: { text: string; level: number; page?: number }[] = []
  
  for (const section of bodySections) {
    // 添加章节标题
    headings.push({ text: section.title, level: section.level })
    
    // 解析章节内容中的子标题
    const subheadings = extractHeadings(section.content)
    headings.push(...subheadings)
  }
  
  // 生成目录条目
  for (const heading of headings) {
    if (heading.level > toc.depth) continue
    
    const indent = (heading.level - 1) * 480  // 每级缩进2字符
    
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: heading.text,
          font: styleConfig.fonts.body,
          size: styleConfig.fontSizes.body * 2
        }),
        ...(toc.includePageNumbers ? [
          new TextRun({
            text: '\t',  // 制表符
          }),
          new TextRun({
            text: '—  —  —',  // 省略号占位（实际页码在Word中自动生成）
          })
        ] : [])
      ],
      indent: { firstLine: indent },
      spacing: { after: 100 }
    }))
  }
  
  return paragraphs
}

// 提取Markdown中的标题
function extractHeadings(content: string): { text: string; level: number }[] {
  const headings: { text: string; level: number }[] = []
  const lines = content.split('\n')
  
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      headings.push({
        text: match[2].trim(),
        level: match[1].length
      })
    }
  }
  
  return headings
}
```

### Step 8：Word正文和附录生成

**后端**：`reportService.ts`

```typescript
// 创建章节内容
function createSectionContent(
  section: BodySection | AppendixSection,
  resources: ResourceMap,
  styleConfig: ReportStyleConfig
): any[] {
  const elements: any[] = []
  
  // 章节标题
  if ('level' in section) {
    // 正文章节标题
    elements.push(createStyledParagraph(section.title, styleConfig, {
      isHeading: true,
      alignment: AlignmentType.LEFT
    }))
  } else {
    // 附录标题
    elements.push(createStyledParagraph(section.title, styleConfig, {
      isHeading: true,
      alignment: AlignmentType.LEFT
    }))
  }
  
  // 解析正文内容
  const contentElements = parseContentToWord(section.content, resources, styleConfig)
  elements.push(...contentElements)
  
  return elements
}
```

### Step 9：Word文档整体组装

**后端**：`reportService.ts`

```typescript
// 创建完整的Word文档
function createCompleteDocument(
  sections: ReportSections,
  resources: ResourceMap,
  styleConfig: ReportStyleConfig
): Document {
  const allChildren: any[] = []
  
  // 1. 封面
  if (sections.cover.enabled) {
    const coverPage = createCoverPage(sections.cover, styleConfig)
    allChildren.push(...coverPage)
    allChildren.push(new Paragraph({ text: '', pageBreak: true }))  // 分页
  }
  
  // 2. 目录
  if (sections.toc.enabled) {
    const tocPage = createTableOfContents(sections.toc, sections.body, styleConfig)
    allChildren.push(...tocPage)
    allChildren.push(new Paragraph({ text: '', pageBreak: true }))  // 分页
  }
  
  // 3. 正文章节
  for (const section of sections.body) {
    const sectionContent = createSectionContent(section, resources, styleConfig)
    allChildren.push(...sectionContent)
  }
  
  // 4. 附录
  if (sections.appendix.length > 0) {
    // 附录开始分节（新页面，横向或不同边距）
    for (const appendix of sections.appendix) {
      const appendixContent = createSectionContent(appendix, resources, styleConfig)
      allChildren.push(...appendixContent)
    }
  }
  
  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: styleConfig.fonts.body,
            size: styleConfig.fontSizes.body * 2
          }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          size: {
            width: 11906,
            height: 16838
          },
          margin: {
            top: Math.round(styleConfig.page.margin.top * 566.7),
            bottom: Math.round(styleConfig.page.margin.bottom * 566.7),
            left: Math.round(styleConfig.page.margin.left * 566.7),
            right: Math.round(styleConfig.page.margin.right * 566.7)
          }
        }
      },
      children: allChildren
    }]
  })
}
```

---

## 7. 详细实现任务

### 7.1 前端任务

| 任务 | 文件 | 说明 |
|------|------|------|
| 章节配置面板 | 新建 `SectionConfigPanel.tsx` | 封面、目录、正文、附录设置 |
| 样式设置面板 | 新建 `StyleSettingsPanel.tsx` | 字体、字号、段落、页面、表格设置 |
| 变量选择器 | `VariablePicker.tsx` | 添加表格/图表变量分类 |
| 样式状态管理 | `reportStore.ts` | 添加样式配置和章节配置的状态管理 |
| 图表转图片 | `ReportPreview.tsx` | ECharts转Base64功能 |
| 预览组件更新 | `ReportPreview.tsx` | 解析并渲染封面、目录、正文、附录，应用样式 |
| 表格渲染组件 | 新建 `TableRenderer.tsx` | 根据tableId渲染HTML表格 |
| 图表渲染组件 | 新建 `ChartRenderer.tsx` | 根据chartId渲染ECharts图表 |
| 导出API更新 | `reportApi.ts` | 支持章节配置、样式配置和图片数据传输 |

### 7.2 后端任务

| 任务 | 文件 | 说明 |
|------|------|------|
| 章节配置类型 | `reportService.ts` | 定义ReportSections及相关接口 |
| 样式配置类型 | `reportService.ts` | 定义ReportStyleConfig接口 |
| 封面生成器 | `reportService.ts` | 创建Word封面页 |
| 目录生成器 | `reportService.ts` | 自动生成目录（含页码占位符） |
| 章节内容生成 | `reportService.ts` | 解析正文和附录内容 |
| 扩展Markdown解析 | `reportService.ts` | 解析`{{TABLE:*}}`、`{{CHART:*}}` |
| 表格生成器 | `reportService.ts` | 使用`docx`库生成Word表格（带样式） |
| 段落样式生成 | `reportService.ts` | 创建带字体、字号、行间距的段落 |
| 文档整体组装 | `reportService.ts` | 按章节组装完整Word文档 |
| 图片生成器 | `reportService.ts` | 解析Base64图片并嵌入Word |
| 定义表格模板 | `reportService.ts` | 定义各业务表格的数据结构 |

---

## 8. 数据结构设计

### 8.1 报告完整数据结构

```typescript
interface ReportData {
  sections: ReportSections
  style: ReportStyleConfig
  resources: ResourceMap
  filename?: string
}

interface ReportSections {
  cover: CoverSection
  toc: TableOfContentsSection
  body: BodySection[]
  appendix: AppendixSection[]
}

interface CoverSection {
  enabled: boolean
  title: string
  subtitle?: string
  projectName: string
  companyName?: string
  author?: string
  date: string
  logo?: string
}

interface TableOfContentsSection {
  enabled: boolean
  title: string
  includePageNumbers: boolean
  depth: number
}

interface BodySection {
  id: string
  title: string
  content: string
  level: number
}

interface AppendixSection {
  id: string
  title: string
  content: string
}
```

### 8.2 表格数据结构

```typescript
interface TableResource {
  id: string
  title: string
  columns: string[]
  data: Record<string, any>[]
  style?: {
    headerBg?: string
    stripe?: boolean
    align?: 'left' | 'center' | 'right'
  }
}
```

### 8.3 图表数据结构

```typescript
interface ChartResource {
  id: string
  type: 'pie' | 'line' | 'bar'
  title: string
  base64Image: string
  width?: number
  height?: number
}
```

### 8.4 资源Map

```typescript
interface ResourceMap {
  tables: Record<string, TableResource>
  charts: Record<string, ChartResource>
}
```

---

## 9. 验收标准

- [ ] 用户可配置封面（标题、副标题、项目名称、编制单位、编制人、日期）
- [ ] 用户可启用/禁用目录，可设置目录深度和页码
- [ ] 用户可添加、编辑、删除正文章节
- [ ] 用户可添加、编辑、删除附录
- [ ] 用户可通过变量选择器插入表格/图表变量
- [ ] 用户可通过样式设置面板自定义字体、字号、行间距
- [ ] 报告可插入投资估算简表，数据准确
- [ ] 报告可插入收入成本明细表，支持多行数据
- [ ] 报告可插入财务指标汇总表（ROI、NPV、IRR）
- [ ] 报告可嵌入ECharts图表（柱状图、折线图、饼图）
- [ ] 预览界面实时显示封面、目录、正文、附录
- [ ] 预览界面实时显示样式效果
- [ ] Word导出后包含封面页
- [ ] Word导出后自动生成目录
- [ ] Word导出后正文和附录格式正确
- [ ] Word文档应用了用户设置的字体、字号、行间距
- [ ] 预览界面与导出Word格式高度一致

---

## 10. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 目录页码不准确 | 用户困惑 | Word中目录是域，需要更新域才能显示正确页码；提供说明 |
| 章节跨页断裂 | 阅读体验差 | 使用分节符，必要时强制分页 |
| 图片体积过大 | Word文件过大 | 压缩图片质量，控制尺寸 |
| 表格跨页断裂 | 阅读体验差 | 设置表格标题行重复（tableHeader: true） |
| 预览与导出不一致 | 用户困惑 | 统一使用相同解析逻辑和样式配置 |
| 图表渲染不一致 | 预览与导出图片不同 | 使用相同Canvas配置渲染 |
| 变量标记错误 | 解析失败 | 提供标准化模板，减少错误 |
| 字体不支持 | 样式失效 | 降级到默认字体，提供警告 |

---

## 11. 后续优化（可选）

- 支持预设样式模板（一键应用"正式报告"、"简洁报告"等样式）
- 支持预设章节模板（一键生成标准报告结构）
- 支持图表交互（鼠标悬停显示数据）
- 支持多图表组合布局
- 支持页眉页脚（章节不同页眉）
- 支持自定义页面方向（横向/纵向）
- 支持分节符和分页控制
- 支持批量导出多个报告
