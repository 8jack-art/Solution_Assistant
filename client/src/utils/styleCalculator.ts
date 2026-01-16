import type { ReportStyleConfig, ParagraphStyle } from '../types/report'

/**
 * 样式计算工具函数
 * 统一处理行间距、段落缩进等样式计算
 */

/**
 * 计算行高
 * @param lineSpacing 行间距设置（倍数或'fixed'）
 * @param fontSize 字体大小
 * @param lineSpacingValue 固定行距值（当lineSpacing为'fixed'时使用）
 * @returns CSS line-height 值（带单位的字符串）
 */
export const calculateLineHeight = (
  lineSpacing: number | 'fixed',
  fontSize: number,
  lineSpacingValue?: number
): string => {
  if (lineSpacing === 'fixed' && lineSpacingValue) {
    // 固定行距，使用像素值
    return `${lineSpacingValue}px`
  }
  // 倍数行距，使用 em 单位确保正确计算
  // em 单位相对于当前字体大小，1.5em = 1.5倍字体大小
  return `${lineSpacing}em`
}

/**
 * 计算段落缩进
 * @param indentChars 缩进字符数
 * @param fontSize 字体大小
 * @returns CSS text-indent 值
 */
export const calculateTextIndent = (
  indentChars: number,
  fontSize: number
): string => {
  if (indentChars <= 0) {
    return '0'
  }
  // 中文字符宽度约等于字体大小，使用相对计算
  // 对于中文文档，1个字符缩进 ≈ 1em（当前字体大小）
  return `${indentChars}em`
}

/**
 * 计算段落间距
 * @param spacingValue 间距值（行数）
 * @param fontSize 字体大小
 * @param lineHeight 行高（带单位的字符串，如 '1.5em' 或 '22px'）
 * @returns CSS margin 值
 */
export const calculateParagraphSpacing = (
  spacingValue: number,
  fontSize: number,
  lineHeight: string
): string => {
  if (spacingValue <= 0) {
    return '0'
  }
  
  // 计算单行高度
  let singleLineHeight: number
  if (lineHeight.endsWith('px')) {
    // 像素值
    singleLineHeight = parseFloat(lineHeight)
  } else if (lineHeight.endsWith('em')) {
    // em单位，相对于当前字体大小
    singleLineHeight = fontSize * parseFloat(lineHeight)
  } else {
    // 未知单位，假设是 em
    singleLineHeight = fontSize * parseFloat(lineHeight)
  }
  
  // 段落间距 = 间距行数 × 单行高度
  return `${spacingValue * singleLineHeight}px`
}

/**
 * 计算完整的段落样式
 * @param style 段落样式配置
 * @param baseFontSize 基础字体大小
 * @returns 完整的段落样式对象
 */
export const calculateParagraphStyle = (
  style: ParagraphStyle,
  baseFontSize: number = 12
): React.CSSProperties => {
  const {
    font,
    fontSize,
    bold,
    lineSpacing,
    lineSpacingValue,
    spaceBefore,
    spaceAfter,
    firstLineIndent
  } = style

  const lineHeight = calculateLineHeight(
    lineSpacing,
    fontSize,
    lineSpacingValue
  )

  const textIndent = calculateTextIndent(firstLineIndent, fontSize)
  
  const marginTop = calculateParagraphSpacing(spaceBefore, fontSize, lineHeight)
  const marginBottom = calculateParagraphSpacing(spaceAfter, fontSize, lineHeight)

  return {
    fontFamily: font,
    fontSize: `${fontSize}px`,
    fontWeight: bold ? 'bold' : 'normal',
    lineHeight: lineHeight,
    textIndent: textIndent,
    marginTop: marginTop,
    marginBottom: marginBottom
  }
}

/**
 * 从样式配置中提取并计算段落样式
 * @param config 完整样式配置
 * @param type 样式类型（'heading1' | 'heading2' | 'heading3' | 'body'）
 * @returns 计算后的样式对象
 */
export const getComputedParagraphStyle = (
  config: ReportStyleConfig,
  type: 'heading1' | 'heading2' | 'heading3' | 'body'
): React.CSSProperties => {
  // 优先使用独立样式配置
  const paragraphStyle = config[type]
  
  // 调试日志
  console.log(`[getComputedParagraphStyle] type=${type}`, {
    hasParagraphStyle: !!paragraphStyle,
    paragraphStyle,
    configBody: config.body,
    configParagraph: config.paragraph
  })
  
  if (paragraphStyle) {
    return calculateParagraphStyle(paragraphStyle)
  }

  // 向后兼容：使用旧配置
  const fallbackStyle: ParagraphStyle = {
    font: config.fonts?.body || '宋体',
    fontSize: config.fontSizes?.body || 12,
    bold: false,
    lineSpacing: config.paragraph?.lineSpacing || 1.5,
    lineSpacingValue: config.paragraph?.lineSpacingValue,
    spaceBefore: config.paragraph?.spaceBefore || 0,
    spaceAfter: config.paragraph?.spaceAfter || 0,
    firstLineIndent: config.paragraph?.firstLineIndent || 2
  }

  // 标题样式特殊处理
  if (type === 'heading1') {
    fallbackStyle.font = config.fonts?.heading || '黑体'
    fallbackStyle.fontSize = config.fontSizes?.title || 22
    fallbackStyle.bold = true
    fallbackStyle.firstLineIndent = config.paragraph?.headingIndent || 0
  } else if (type === 'heading2') {
    fallbackStyle.font = config.fonts?.heading || '黑体'
    fallbackStyle.fontSize = 16
    fallbackStyle.bold = true
    fallbackStyle.firstLineIndent = config.paragraph?.headingIndent || 0
  } else if (type === 'heading3') {
    fallbackStyle.font = config.fonts?.heading || '黑体'
    fallbackStyle.fontSize = 15
    fallbackStyle.bold = true
    fallbackStyle.firstLineIndent = config.paragraph?.headingIndent || 0
  }

  return calculateParagraphStyle(fallbackStyle)
}

/**
 * 计算表格样式
 * @param config 样式配置
 * @returns 表格样式对象
 */
export const getTableStyles = (config: ReportStyleConfig) => {
  const {
    fonts,
    fontSizes,
    table
  } = config

  return {
    table: {
      borderCollapse: 'collapse' as const,
      width: '100%',
      margin: '8px 0',
      fontSize: `${fontSizes?.tableBody || 12}px`,
      fontFamily: fonts?.body || '宋体'
    },
    thead: {
      backgroundColor: table?.headerBg ? `#${table.headerBg}` : '#EEEEEE'
    },
    tbody: {
      // tbody 样式
    },
    row: {
      // 行样式
    },
    header: {
      backgroundColor: table?.headerBg ? `#${table.headerBg}` : '#EEEEEE',
      fontWeight: 'bold' as const,
      textAlign: 'center' as const,
      padding: '8px',
      border: '1px solid #000',
      fontFamily: fonts?.body || '宋体',
      fontSize: `${fontSizes?.tableHeader || 12}px`
    },
    cell: {
      padding: '8px',
      border: '1px solid #000',
      textAlign: table?.alignment || 'left' as const,
      fontFamily: fonts?.body || '宋体',
      fontSize: `${fontSizes?.tableBody || 12}px`
    },
    title: {
      fontWeight: 'bold' as const,
      fontFamily: fonts?.body || '宋体',
      fontSize: `${fontSizes?.tableTitle || 18}px`,
      marginBottom: '8px',
      marginTop: '16px'
    }
  }
}

/**
 * 创建样式缓存键
 * @param config 样式配置
 * @returns 缓存键字符串
 */
export const createStyleCacheKey = (config: ReportStyleConfig): string => {
  return JSON.stringify({
    fonts: config.fonts,
    fontSizes: config.fontSizes,
    paragraph: config.paragraph,
    heading1: config.heading1,
    heading2: config.heading2,
    heading3: config.heading3,
    body: config.body,
    table: config.table
  })
}

/**
 * 样式对象转字符串工具函数
 * @param style CSS样式对象
 * @returns CSS字符串
 */
export const styleToString = (style: React.CSSProperties): string => {
  return Object.entries(style)
    .map(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return ''
      }
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      return `${cssKey}: ${value}`
    })
    .filter(Boolean)
    .join('; ')
}
