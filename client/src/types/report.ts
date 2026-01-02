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

// 样式配置类型
export interface ReportStyleConfig {
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
    firstLineIndent: number         // 首行缩进（字符数，0表示无缩进，2表示2字符）
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
    firstLineIndent: 2  // 默认首行缩进2字符
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
