import { ReportStyleConfig } from '../types/report'

/**
 * 构建完整的HTML模板
 * 用于html-to-docx转换
 */
export function buildHtmlTemplate(
  content: string,
  styleConfig: ReportStyleConfig,
  title: string
): string {
  const styles = generateStyles(styleConfig)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  <div class="document">
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="content">
      ${content}
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * 生成CSS样式
 */
function generateStyles(config: ReportStyleConfig): string {
  const bodyFont = config.fonts?.body || '宋体'
  const headingFont = config.fonts?.heading || '黑体'
  const titleFontSize = config.fontSizes?.title || 22
  const bodyFontSize = config.fontSizes?.body || 12
  const tableTitleFontSize = config.fontSizes?.tableTitle || 12
  const tableHeaderFontSize = config.fontSizes?.tableHeader || 10.5
  const tableBodyFontSize = config.fontSizes?.tableBody || 10.5
  // 使用body独立的行间距配置，fallback到paragraph
  const lineSpacing = config.body?.lineSpacing ?? config.paragraph?.lineSpacing ?? 1.5
  const firstLineIndent = config.body?.firstLineIndent ?? config.paragraph?.firstLineIndent ?? 2
  const headerBg = config.table?.headerBg || 'EEEEEE'
  const zebraStripe = config.table?.zebraStripe || false
  const marginTop = (config.page?.margin?.top || 2.5) * 28.35
  const marginBottom = (config.page?.margin?.bottom || 2.5) * 28.35
  const marginLeft = (config.page?.margin?.left || 2.5) * 28.35
  const marginRight = (config.page?.margin?.right || 2.5) * 28.35

  const lineSpacingValue = typeof lineSpacing === 'number' ? lineSpacing : 1.5

  return `
    @page {
      size: A4;
      margin: ${marginTop}pt ${marginRight}pt ${marginBottom}pt ${marginLeft}pt;
    }

    body {
      font-family: '${bodyFont}', serif;
      font-size: ${bodyFontSize}pt;
      line-height: ${lineSpacing};
      margin: 0;
      padding: 0;
    }

    .document {
      max-width: 100%;
    }

    .title {
      font-family: '${headingFont}', sans-serif;
      font-size: ${titleFontSize}pt;
      font-weight: bold;
      text-align: center;
      margin: 0 0 24pt 0;
    }

    .content {
      font-family: '${bodyFont}', serif;
      font-size: ${bodyFontSize}pt;
      line-height: ${lineSpacing};
    }

    .content p {
      margin: 0 0 ${12 / lineSpacingValue}pt 0;
      text-indent: ${firstLineIndent}em;
      text-align: justify;
    }

    .content h1 {
      font-family: '${headingFont}', sans-serif;
      font-size: ${titleFontSize}pt;
      font-weight: bold;
      margin: 24pt 0 16pt 0;
      page-break-after: avoid;
    }

    .content h2 {
      font-family: '${headingFont}', sans-serif;
      font-size: ${titleFontSize - 2}pt;
      font-weight: bold;
      margin: 20pt 0 12pt 0;
      page-break-after: avoid;
    }

    .content h3 {
      font-family: '${headingFont}', sans-serif;
      font-size: ${titleFontSize - 4}pt;
      font-weight: bold;
      margin: 16pt 0 10pt 0;
      page-break-after: avoid;
    }

    .content ul, .content ol {
      margin: 12pt 0;
      padding-left: 2em;
    }

    .content li {
      margin: 6pt 0;
    }

    .content blockquote {
      margin: 12pt 0;
      padding: 8pt 16pt;
      border-left: 4px solid #1890ff;
      background-color: #f5f5f5;
    }

    .content mark {
      background-color: yellow;
      padding: 0 2px;
    }

    .content a {
      color: #1890ff;
      text-decoration: underline;
    }

    /* 表格样式 */
    .content table {
      border-collapse: collapse;
      width: 100%;
      margin: 16pt 0;
      page-break-inside: avoid;
    }

    .content th {
      font-family: '${headingFont}', sans-serif;
      font-size: ${tableHeaderFontSize}pt;
      font-weight: bold;
      background-color: #${headerBg};
      text-align: center;
      padding: 8pt;
      border: 1px solid #000;
    }

    .content td {
      font-family: '${bodyFont}', serif;
      font-size: ${tableBodyFontSize}pt;
      padding: 8pt;
      border: 1px solid #000;
    }

    .content td[data-align="center"],
    .content td[data-align="center"] * {
      text-align: center !important;
    }

    .content td[data-align="right"],
    .content td[data-align="right"] * {
      text-align: right !important;
    }

    ${zebraStripe ? `
    .content tr:nth-child(even) {
      background-color: #f5f5f5;
    }
    ` : ''}

    /* 图片样式 */
    .content img {
      max-width: 100%;
      height: auto;
      margin: 16pt 0;
    }

    .content figure {
      margin: 16pt 0;
    }

    .content figcaption {
      font-size: ${bodyFontSize - 2}pt;
      color: #666;
      text-align: center;
      margin-top: 8pt;
    }

    /* 代码块样式 */
    .content pre {
      background-color: #f5f5f5;
      padding: 12pt;
      border-radius: 4pt;
      overflow-x: auto;
      margin: 12pt 0;
    }

    .content code {
      font-family: 'Courier New', monospace;
      font-size: ${bodyFontSize - 2}pt;
      background-color: #f5f5f5;
      padding: 2pt 4pt;
      border-radius: 2pt;
    }

    .content pre code {
      background-color: transparent;
      padding: 0;
    }
  `.trim()
}

/**
 * HTML转Word选项
 */
export interface HtmlToDocxOptions {
  font?: string
  fontSize?: number
  lineSpacing?: number
  margins?: {
    top: number
    bottom: number
    left: number
    right: number
  }
  table?: {
    row?: {
      cantSplit?: boolean
    }
  }
  footer?: boolean
  pageNumber?: boolean
}

/**
 * 生成html-to-docx选项
 */
export function generateDocxOptions(styleConfig: ReportStyleConfig): HtmlToDocxOptions {
  const font = styleConfig.fonts?.body || '宋体'
  const fontSize = styleConfig.fontSizes?.body || 12
  // 使用body独立的行间距配置，fallback到paragraph
  const lineSpacingRaw = styleConfig.body?.lineSpacing ?? styleConfig.paragraph?.lineSpacing ?? 1.5
  const lineSpacing = (typeof lineSpacingRaw === 'number' ? lineSpacingRaw : 1.5) * 240
  const margins = {
    top: (styleConfig.page?.margin?.top || 2.5) * 28.35 * 20,
    bottom: (styleConfig.page?.margin?.bottom || 2.5) * 28.35 * 20,
    left: (styleConfig.page?.margin?.left || 2.5) * 28.35 * 20,
    right: (styleConfig.page?.margin?.right || 2.5) * 28.35 * 20,
  }

  return {
    font,
    fontSize,
    lineSpacing,
    margins,
    table: {
      row: {
        cantSplit: true
      }
    },
    footer: true,
    pageNumber: true,
  }
}

/**
 * 移除HTML标签，只保留纯文本
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .trim()
}

/**
 * HTML转义
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 将CSS单位转换为pt
 */
export function convertToPt(value: number, unit: 'px' | 'cm' | 'mm'): number {
  switch (unit) {
    case 'px':
      return value * 0.75 // 96dpi: 1px = 0.75pt
    case 'cm':
      return value * 28.35
    case 'mm':
      return value * 2.835
    default:
      return value
  }
}

/**
 * 将CSS行高转换为line-spacing值
 */
export function convertLineSpacing(lineHeight: number | string): number {
  if (typeof lineHeight === 'number') {
    return lineHeight * 240
  }
  // 解析如 "1.5" 或 "150%" 格式
  const match = lineHeight.match(/^([\d.]+)(?:%)?$/)
  if (match) {
    return parseFloat(match[1]) * 240
  }
  return 360 // 默认1.5倍行距
}

export default {
  buildHtmlTemplate,
  generateDocxOptions,
  stripHtml,
  convertToPt,
  convertLineSpacing,
}
