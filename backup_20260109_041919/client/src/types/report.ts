// 报告相关类型定义

export interface ReportVariable {
  key: string
  label: string
  value?: string
  category?: 'basic' | 'table' | 'chart'
}

export interface ReportTemplate {
  id: string
  name: string
  description?: string
  prompt_template: string
  is_default: boolean
  is_system: boolean
}

export interface ReportHistoryItem {
  id: string
  title: string
  createdAt: string
  status: string
}

// 段落样式配置（支持标题1、标题2、正文独立设置）
export interface ParagraphStyle {
  font: string           // 字体
  fontSize: number       // 字号（pt）
  bold: boolean          // 是否加粗
  lineSpacing: number | 'fixed'    // 行间距倍数或固定值
  lineSpacingValue?: number       // 固定行间距值（磅）
  spaceBefore: number    // 段前间距
  spaceAfter: number     // 段后间距
  firstLineIndent: number // 首行缩进（字符数）
}

// 样式配置类型
export interface ReportStyleConfig {
  // 字体设置
  fonts: {
    body: string        // 正文字体
    heading: string     // 标题字体
    number: string      // 数字字体
  }
  
  // 字号设置（保留向后兼容）
  fontSizes: {
    title: number       // 标题字号（pt）
    body: number        // 正文字号（pt）
    tableTitle: number  // 表名字号（pt）
    tableHeader: number // 表头字号（pt）
    tableBody: number   // 表体字号（pt）
  }
  
  // 段落设置（保留向后兼容）
  paragraph: {
    lineSpacing: number | 'fixed'  // 行间距倍数或固定值
    lineSpacingValue?: number       // 固定行间距值（磅）
    spaceBefore: number             // 段前间距（行）
    spaceAfter: number              // 段后间距（行）
    firstLineIndent: number         // 首行缩进（字符数，0表示无缩进，2表示2字符）
    headingIndent: number           // 标题缩进（字符数）
  }
  
  // 新增：标题和正文独立段落样式
  heading1: ParagraphStyle   // 标题1样式
  heading2: ParagraphStyle   // 标题2样式
  body: ParagraphStyle       // 正文样式
  
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
export const defaultStyleConfig: ReportStyleConfig = {
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
    spaceAfter: 0,
    firstLineIndent: 2,  // 默认首行缩进2字符
    headingIndent: 0     // 默认标题无缩进
  },
  // 新增：标题和正文独立段落样式
  heading1: {
    font: '黑体',
    fontSize: 22,        // 二号
    bold: true,
    lineSpacing: 1.5,
    spaceBefore: 0,
    spaceAfter: 6,
    firstLineIndent: 0
  },
  heading2: {
    font: '黑体',
    fontSize: 16,        // 小三
    bold: true,
    lineSpacing: 1.5,
    spaceBefore: 6,
    spaceAfter: 6,
    firstLineIndent: 0
  },
  body: {
    font: '宋体',
    fontSize: 12,        // 小四
    bold: false,
    lineSpacing: 1.5,
    spaceBefore: 0,
    spaceAfter: 0,
    firstLineIndent: 2   // 首行缩进2字符
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

// 章节配置类型
export interface CoverSection {
  enabled: boolean
  title: string            // 报告标题
  subtitle?: string        // 副标题
  projectName: string      // 项目名称
  companyName?: string     // 编制单位
  author?: string          // 编制人
  date: string             // 编制日期
  logo?: string            // Logo图片base64
}

export interface TableOfContentsSection {
  enabled: boolean
  title: string            // 目录标题
  includePageNumbers: boolean  // 包含页码
  depth: number            // 目录深度（1-3级标题）
}

export interface BodySection {
  id: string
  title: string            // 章节标题
  content: string          // Markdown内容（含变量标记）
  level: number            // 标题级别
}

export interface AppendixSection {
  id: string
  title: string            // 附录标题
  content: string          // Markdown内容（含变量标记）
}

export interface ReportSections {
  cover: CoverSection
  toc: TableOfContentsSection
  body: BodySection[]
  appendix: AppendixSection[]
}

// 默认章节配置
export const defaultSections: ReportSections = {
  cover: {
    enabled: true,
    title: '投资项目方案报告',
    subtitle: '',
    projectName: '',
    companyName: '',
    author: '',
    date: new Date().toLocaleDateString('zh-CN'),
    logo: ''
  },
  toc: {
    enabled: true,
    title: '目录',
    includePageNumbers: true,
    depth: 3
  },
  body: [],
  appendix: []
}

// 表格资源类型
export interface TableResource {
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

// 图表资源类型
export interface ChartResource {
  id: string
  type: 'pie' | 'line' | 'bar'
  title: string
  base64Image: string  // 图片数据
  width?: number
  height?: number
}

// 资源Map
export interface ResourceMap {
  tables: Record<string, TableResource>
  charts: Record<string, ChartResource>
}

// 导出请求数据结构
export interface ExportRequest {
  content: string              // 报告内容（含变量标记）
  sections: ReportSections      // 章节配置
  resources: ResourceMap       // 表格和图表数据
  styleConfig: ReportStyleConfig  // 样式配置
  filename: string             // 文件名
}

/**
 * 验证并补全样式配置
 * 确保配置包含所有必要字段，使用默认值填充缺失字段
 */
export function validateAndCompleteStyleConfig(config: Partial<ReportStyleConfig>): ReportStyleConfig {
  // 补全 fonts
  const fonts = {
    body: config.fonts?.body ?? defaultStyleConfig.fonts.body,
    heading: config.fonts?.heading ?? defaultStyleConfig.fonts.heading,
    number: config.fonts?.number ?? defaultStyleConfig.fonts.number,
  }

  // 补全 fontSizes
  const fontSizes = {
    title: config.fontSizes?.title ?? defaultStyleConfig.fontSizes.title,
    body: config.fontSizes?.body ?? defaultStyleConfig.fontSizes.body,
    tableTitle: config.fontSizes?.tableTitle ?? defaultStyleConfig.fontSizes.tableTitle,
    tableHeader: config.fontSizes?.tableHeader ?? defaultStyleConfig.fontSizes.tableHeader,
    tableBody: config.fontSizes?.tableBody ?? defaultStyleConfig.fontSizes.tableBody,
  }

  // 补全 paragraph
  const paragraph = {
    lineSpacing: config.paragraph?.lineSpacing ?? defaultStyleConfig.paragraph.lineSpacing,
    lineSpacingValue: config.paragraph?.lineSpacingValue ?? defaultStyleConfig.paragraph.lineSpacingValue,
    spaceBefore: config.paragraph?.spaceBefore ?? defaultStyleConfig.paragraph.spaceBefore,
    spaceAfter: config.paragraph?.spaceAfter ?? defaultStyleConfig.paragraph.spaceAfter,
    firstLineIndent: config.paragraph?.firstLineIndent ?? defaultStyleConfig.paragraph.firstLineIndent,
    headingIndent: config.paragraph?.headingIndent ?? defaultStyleConfig.paragraph.headingIndent,
  }

  // 补全 heading1
  const heading1 = {
    font: config.heading1?.font ?? defaultStyleConfig.heading1.font,
    fontSize: config.heading1?.fontSize ?? defaultStyleConfig.heading1.fontSize,
    bold: config.heading1?.bold ?? defaultStyleConfig.heading1.bold,
    lineSpacing: config.heading1?.lineSpacing ?? defaultStyleConfig.heading1.lineSpacing,
    lineSpacingValue: config.heading1?.lineSpacingValue ?? defaultStyleConfig.heading1.lineSpacingValue,
    spaceBefore: config.heading1?.spaceBefore ?? defaultStyleConfig.heading1.spaceBefore,
    spaceAfter: config.heading1?.spaceAfter ?? defaultStyleConfig.heading1.spaceAfter,
    firstLineIndent: config.heading1?.firstLineIndent ?? defaultStyleConfig.heading1.firstLineIndent,
  }

  // 补全 heading2
  const heading2 = {
    font: config.heading2?.font ?? defaultStyleConfig.heading2.font,
    fontSize: config.heading2?.fontSize ?? defaultStyleConfig.heading2.fontSize,
    bold: config.heading2?.bold ?? defaultStyleConfig.heading2.bold,
    lineSpacing: config.heading2?.lineSpacing ?? defaultStyleConfig.heading2.lineSpacing,
    lineSpacingValue: config.heading2?.lineSpacingValue ?? defaultStyleConfig.heading2.lineSpacingValue,
    spaceBefore: config.heading2?.spaceBefore ?? defaultStyleConfig.heading2.spaceBefore,
    spaceAfter: config.heading2?.spaceAfter ?? defaultStyleConfig.heading2.spaceAfter,
    firstLineIndent: config.heading2?.firstLineIndent ?? defaultStyleConfig.heading2.firstLineIndent,
  }

  // 补全 body
  const body = {
    font: config.body?.font ?? defaultStyleConfig.body.font,
    fontSize: config.body?.fontSize ?? defaultStyleConfig.body.fontSize,
    bold: config.body?.bold ?? defaultStyleConfig.body.bold,
    lineSpacing: config.body?.lineSpacing ?? defaultStyleConfig.body.lineSpacing,
    lineSpacingValue: config.body?.lineSpacingValue ?? defaultStyleConfig.body.lineSpacingValue,
    spaceBefore: config.body?.spaceBefore ?? defaultStyleConfig.body.spaceBefore,
    spaceAfter: config.body?.spaceAfter ?? defaultStyleConfig.body.spaceAfter,
    firstLineIndent: config.body?.firstLineIndent ?? defaultStyleConfig.body.firstLineIndent,
  }

  // 补全 page
  const page = {
    margin: {
      top: config.page?.margin?.top ?? defaultStyleConfig.page.margin.top,
      bottom: config.page?.margin?.bottom ?? defaultStyleConfig.page.margin.bottom,
      left: config.page?.margin?.left ?? defaultStyleConfig.page.margin.left,
      right: config.page?.margin?.right ?? defaultStyleConfig.page.margin.right,
    },
    orientation: config.page?.orientation ?? defaultStyleConfig.page.orientation,
  }

  // 补全 table
  const table = {
    headerBg: config.table?.headerBg ?? defaultStyleConfig.table.headerBg,
    border: config.table?.border ?? defaultStyleConfig.table.border,
    zebraStripe: config.table?.zebraStripe ?? defaultStyleConfig.table.zebraStripe,
    alignment: config.table?.alignment ?? defaultStyleConfig.table.alignment,
  }

  return {
    fonts,
    fontSizes,
    paragraph,
    heading1,
    heading2,
    body,
    page,
    table,
  }
}
