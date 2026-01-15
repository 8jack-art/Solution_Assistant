import { Paper, Text, Badge, Loader, Center, Box, Group, ScrollArea } from '@mantine/core'
import { useReportStore } from '../../stores/reportStore'
import type { ReportStyleConfig, ResourceMap } from '../../types/report'
import { useMemo, useEffect, useCallback, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 默认样式配置
const defaultStyleConfig: ReportStyleConfig = {
  fonts: {
    body: '宋体',
    heading: '黑体',
    number: 'Times New Roman'
  },
  fontSizes: {
    title: 32,
    body: 16,
    tableTitle: 18,
    tableHeader: 14,
    tableBody: 14
  },
  paragraph: {
    lineSpacing: 1.5,
    spaceBefore: 0,
    spaceAfter: 0,
    firstLineIndent: 2,
    headingIndent: 0
  },
  // 独立段落样式默认值
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
      top: 2.54,
      bottom: 2.54,
      left: 3.17,
      right: 3.17
    },
    orientation: 'portrait'
  },
  table: {
    headerBg: 'EEEEEE',
    border: 'single',
    zebraStripe: true,
    alignment: 'left'
  }
}

// 默认封面
const defaultCover = {
  enabled: true,
  title: '投资方案报告',
  subtitle: '',
  projectName: '',
  companyName: '',
  author: '',
  date: new Date().toISOString().split('T')[0]
}

// 默认目录
const defaultTOC = {
  enabled: true,
  title: '目录',
  includePageNumbers: true,
  depth: 3
}

// 检测内容是否为Markdown格式
const isMarkdownContent = (content: string): boolean => {
  if (!content) return false
  // 以#开头或包含markdown特征
  return content.startsWith('#') || 
         /^#{1,6}\s/.test(content) || 
         content.includes('**') || 
         content.includes('\n- ') || 
         content.includes('\n* ') || 
         content.includes('\n1. ')
}

// 将Markdown转换为HTML（带缓存）
let markdownCache: Map<string, string> = new Map()
const convertToHtml = (content: string): string => {
  if (!content) return ''
  
  // 检查缓存
  if (markdownCache.has(content)) {
    return markdownCache.get(content)!
  }
  
  let html = content
  
  // 如果是Markdown格式，转换为HTML
  if (isMarkdownContent(content)) {
    try {
      const result = marked.parse(content)
      html = typeof result === 'string' ? result : String(result)
    } catch (e) {
      console.warn('Markdown转换失败:', e)
      html = content
    }
  }
  
  // 使用DOMPurify消毒HTML，防止XSS攻击
  try {
    html = DOMPurify.sanitize(html)
  } catch (e) {
    console.warn('HTML消毒失败:', e)
  }
  
  // 清理缓存（防止内存泄漏）
  if (markdownCache.size > 100) {
    const firstKey = markdownCache.keys().next().value as string
    markdownCache.delete(firstKey)
  }
  
  // 添加到缓存
  markdownCache.set(content, html)
  
  return html
}

// 生成表格HTML（用于预览）
const generateTableHtml = (tableResource: any, config: ReportStyleConfig): string => {
  if (!tableResource?.data?.length) {
    return '<p>[表格无数据]</p>'
  }

  const columns = tableResource.columns || []
  const data = tableResource.data

  const headerRow = columns.map((col: string) => 
    `<th style="background-color: #${config.table?.headerBg || 'EEEEEE'}; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #000;">${col}</th>`
  ).join('')

  const dataRows = data.map((row: any, rowIndex: number) => {
    const rowBg = config.table?.zebraStripe && rowIndex % 2 === 1 ? 'background-color: #F5F5F5;' : ''
    const cells = columns.map((col: string) => 
      `<td style="padding: 8px; border: 1px solid #000; ${rowBg}">${row[col] ?? ''}</td>`
    ).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  return `
    <p style="font-weight: bold; font-family: ${config.fonts?.body || '宋体'}; font-size: ${config.fontSizes?.tableTitle || 18}px; margin-bottom: 8px; margin-top: 16px;">${tableResource.title || '表格'}</p>
    <table style="border-collapse: collapse; width: 100%; margin: 8px 0;">
      <thead>
        <tr>${headerRow}</tr>
      </thead>
      <tbody>
        ${dataRows}
      </tbody>
    </table>
  `
}

// 生成图表HTML（用于预览）
const generateChartHtml = (chartResource: any): string => {
  if (!chartResource?.base64Image) {
    return '<p>[图表无数据]</p>'
  }

  return `
    <p style="font-weight: bold; font-family: 黑体; font-size: 18px; text-align: center; margin-bottom: 8px; margin-top: 16px;">${chartResource.title || '图表'}</p>
    <div style="text-align: center; margin: 16px 0;">
      <img src="${chartResource.base64Image}" alt="${chartResource.title || '图表'}" style="max-width: 100%; height: auto; max-height: 400px;" />
    </div>
  `
}

// 替换内容中的变量标记
const replaceVariablesInContent = (content: string, resources: ResourceMap, config: ReportStyleConfig): string => {
  if (!content) return ''

  let result = content

  // 替换表格数据变量 {{DATA:tableId}} - JSON格式数据
  result = result.replace(/\{\{DATA:(\w+)\}\}/g, (match, dataId) => {
    const tableResource = resources.tables?.[dataId]
    if (tableResource && tableResource.data) {
      // 将表格数据转为JSON字符串显示
      const jsonStr = JSON.stringify(tableResource.data, null, 2)
      return `<pre style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${jsonStr}</pre>`
    }
    return `[表格数据 ${dataId} 未找到]`
  })

  // 替换表格变量 {{TABLE:tableId}}
  result = result.replace(/\{\{TABLE:(\w+)\}\}/g, (match, tableId) => {
    const tableResource = resources.tables?.[tableId]
    if (tableResource) {
      return generateTableHtml(tableResource, config)
    }
    return `[表格 ${tableId} 未找到]`
  })

  // 替换图表变量 {{CHART:chartId}}
  result = result.replace(/\{\{CHART:(\w+)\}\}/g, (match, chartId) => {
    const chartResource = resources.charts?.[chartId]
    if (chartResource) {
      return generateChartHtml(chartResource)
    }
    return `[图表 ${chartId} 未找到]`
  })

  return result
}

// 将配置转换为CSS样式
const configToCss = (config: ReportStyleConfig): string => {
  return `
    /* Markdown内容中的标题样式（应用配置） */
    .report-content h1 {
      font-family: ${config.heading1?.font || config.fonts?.heading || '黑体'}, sans-serif;
      font-size: ${config.heading1?.fontSize || 22}px;
      font-weight: ${config.heading1?.bold ? 'bold' : 'normal'};
      line-height: ${config.heading1?.lineSpacing || 1.5};
      margin: ${(config.heading1?.spaceBefore || 0) * 12}px 0
             ${(config.heading1?.spaceAfter || 6) * 12}px 0;
      text-indent: ${(config.heading1?.firstLineIndent || 0) * 12}px;
      border-bottom: 1px solid #e8e8e8;
      padding-bottom: 8px;
    }
    .report-content h2 {
      font-family: ${config.heading2?.font || config.fonts?.heading || '黑体'}, sans-serif;
      font-size: ${config.heading2?.fontSize || 16}px;
      font-weight: ${config.heading2?.bold ? 'bold' : 'normal'};
      line-height: ${config.heading2?.lineSpacing || 1.5};
      margin: ${(config.heading2?.spaceBefore || 6) * 12}px 0
             ${(config.heading2?.spaceAfter || 6) * 12}px 0;
      text-indent: ${(config.heading2?.firstLineIndent || 0) * 12}px;
    }
    .report-content h3 {
      font-family: ${config.fonts?.heading || '黑体'}, sans-serif;
      font-size: 18px;
      font-weight: bold;
      margin: 12px 0 6px 0;
    }
    .report-content h4, .report-content h5, .report-content h6 {
      font-family: ${config.fonts?.heading || '黑体'}, sans-serif;
      font-weight: bold;
    }
    /* 正文内容样式 */
    .report-content {
      font-family: ${config.fonts?.body || '宋体'}, serif;
      font-size: ${config.body?.fontSize || 12}px;
      line-height: ${config.body?.lineSpacing || 1.5};
    }
    .report-content p {
      margin: ${(config.body?.spaceBefore || 0) * 12}px 0
             ${(config.body?.spaceAfter || 0) * 12}px 0;
      text-indent: ${(config.body?.firstLineIndent || 2) * 12}px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      font-size: ${config.fontSizes?.tableBody || 14}px;
      font-family: ${config.fonts?.body || '宋体'}, serif;
    }
    th {
      background-color: #${config.table?.headerBg || 'EEEEEE'};
      font-weight: bold;
      text-align: center;
    }
    td {
      border: 1px solid #000;
      padding: 8px;
    }
    tr:nth-child(even) {
      background-color: ${config.table?.zebraStripe ? '#F5F5F5' : 'transparent'};
    }
  `
}

// 单页组件 - 模拟Word中的一页
function ReportPage({ 
  children, 
  pageNumber, 
  totalPages,
  style,
  isCover = false 
}: { 
  children: React.ReactNode
  pageNumber: number
  totalPages: number
  style?: React.CSSProperties
  isCover?: boolean
}) {
  return (
    <div 
      className="report-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: '#fff',
        padding: `${defaultStyleConfig.page?.margin?.top || 2.54}cm ${defaultStyleConfig.page?.margin?.right || 3.17}cm ${defaultStyleConfig.page?.margin?.bottom || 2.54}cm ${defaultStyleConfig.page?.margin?.left || 3.17}cm`,
        margin: '0 auto 10px auto',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        position: 'relative',
        boxSizing: 'border-box',
        ...style
      }}
    >
      {/* 页码 */}
      {!isCover && (
        <div 
          style={{
            position: 'absolute',
            bottom: '1cm',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '12px',
            fontFamily: defaultStyleConfig.fonts?.body || '宋体',
            color: '#666'
          }}
        >
          {pageNumber}
        </div>
      )}
      {children}
    </div>
  )
}

export function ReportPreview() {
  const { 
    reportContent, 
    generationStatus, 
    styleConfig, 
    sections, 
    resources,
    projectId
  } = useReportStore()

  const [pageCount, setPageCount] = useState(0)

  // 获取当前配置（带默认值）
  const currentStyle = useMemo((): ReportStyleConfig => ({
    ...defaultStyleConfig,
    ...styleConfig,
    fonts: { ...defaultStyleConfig.fonts, ...styleConfig?.fonts },
    fontSizes: { ...defaultStyleConfig.fontSizes, ...styleConfig?.fontSizes },
    paragraph: { ...defaultStyleConfig.paragraph, ...styleConfig?.paragraph },
    heading1: { ...defaultStyleConfig.heading1, ...styleConfig?.heading1 },
    heading2: { ...defaultStyleConfig.heading2, ...styleConfig?.heading2 },
    body: { ...defaultStyleConfig.body, ...styleConfig?.body },
    page: { ...defaultStyleConfig.page, ...styleConfig?.page },
    table: { ...defaultStyleConfig.table, ...styleConfig?.table }
  }), [styleConfig])

  const currentSections = useMemo(() => ({
    cover: { ...defaultCover, ...sections?.cover },
    toc: { ...defaultTOC, ...sections?.toc },
    body: sections?.body || [],
    appendix: sections?.appendix || []
  }), [sections])

  // 计算页码
  const calculatePageCount = useCallback(() => {
    let count = 0
    if (currentSections.cover.enabled) count++
    if (currentSections.toc.enabled) count++
    if (reportContent || currentSections.body.length > 0) count++
    if (currentSections.appendix.length > 0) count++
    setPageCount(count || 1)
  }, [currentSections.cover.enabled, currentSections.toc.enabled, reportContent, currentSections.body.length, currentSections.appendix.length])

  // 构建封面内容
  const renderCover = useCallback(() => {
    if (!currentSections.cover.enabled) return null
    
    return (
      <ReportPage pageNumber={1} totalPages={pageCount} isCover={true}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            marginBottom: '20px', 
            fontFamily: currentStyle.fonts.heading 
          }}>
            {currentSections.cover.title || '投资方案报告'}
          </h1>
          {currentSections.cover.subtitle && (
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: 'normal', 
              marginBottom: '60px', 
              color: '#666', 
              fontFamily: currentStyle.fonts.body 
            }}>
              {currentSections.cover.subtitle}
            </h2>
          )}
          <div style={{ 
            marginTop: 'auto',
            marginBottom: 'auto',
            fontFamily: currentStyle.fonts.body, 
            fontSize: '16px' 
          }}>
            {currentSections.cover.projectName && (
              <p style={{ marginBottom: '16px' }}>项目名称：{currentSections.cover.projectName}</p>
            )}
            {currentSections.cover.companyName && (
              <p style={{ marginBottom: '16px' }}>编制单位：{currentSections.cover.companyName}</p>
            )}
            {currentSections.cover.author && (
              <p style={{ marginBottom: '16px' }}>编制人：{currentSections.cover.author}</p>
            )}
            <p>编制日期：{currentSections.cover.date}</p>
          </div>
        </div>
      </ReportPage>
    )
  }, [currentSections.cover, currentStyle.fonts, pageCount])

  // 构建目录内容
  const renderTOC = useCallback(() => {
    if (!currentSections.toc.enabled) return null
    
    let currentPage = 2 // 封面后是目录
    
    return (
      <ReportPage pageNumber={currentPage} totalPages={pageCount}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          marginBottom: '30px', 
          textAlign: 'center', 
          fontFamily: currentStyle.fonts.heading 
        }}>
          {currentSections.toc.title || '目录'}
        </h2>
        <div style={{ fontFamily: currentStyle.fonts.body }}>
          {/* 从正文章节提取标题 */}
          {currentSections.body.map((section, index) => {
            if (section.level > currentSections.toc.depth) return null
            const indent = (section.level - 1) * 24
            currentPage++
            return (
              <div 
                key={`toc-body-${index}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '8px', 
                  marginLeft: `${indent}px` 
                }}
              >
                <span style={{ flex: 1, fontSize: `${currentStyle.fontSizes.body}px` }}>
                  {section.title}
                </span>
                {currentSections.toc.includePageNumbers && (
                  <span style={{ marginLeft: '16px', color: '#666' }}>{currentPage}</span>
                )}
              </div>
            )
          })}

          {/* 从附录提取标题 */}
          {currentSections.appendix.map((section, index) => {
            currentPage++
            return (
              <div 
                key={`toc-appendix-${index}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '8px' 
                }}
              >
                <span style={{ flex: 1, fontSize: `${currentStyle.fontSizes.body}px` }}>
                  {section.title}
                </span>
                {currentSections.toc.includePageNumbers && (
                  <span style={{ marginLeft: '16px', color: '#666' }}>{currentPage}</span>
                )}
              </div>
            )
          })}
        </div>
      </ReportPage>
    )
  }, [currentSections.toc, currentSections.body, currentSections.appendix, currentStyle.fonts, currentStyle.fontSizes, pageCount])

  // 构建正文内容
  const renderBody = useCallback(() => {
    if (!reportContent && currentSections.body.length === 0) return null
    
    let currentPage = 1 // 封面是第1页
    if (currentSections.cover.enabled) currentPage++
    if (currentSections.toc.enabled) currentPage++
    
    // 处理reportContent：先替换变量，再转换为HTML
    const reportContentWithVars = replaceVariablesInContent(reportContent, resources, currentStyle)
    const processedReportContent = convertToHtml(reportContentWithVars)
    
    return (
      <ReportPage pageNumber={currentPage} totalPages={pageCount}>
        {/* AI生成的内容 */}
        {reportContent && (
          <div>
            <h2 style={{ 
              fontSize: `${currentStyle.fontSizes.title}px`, 
              fontWeight: 'bold', 
              marginBottom: '16px', 
              fontFamily: currentStyle.fonts.heading 
            }}>
              报告内容
            </h2>
            <div 
              className="report-content"
              style={{ 
                fontFamily: currentStyle.fonts.body, 
                lineHeight: currentStyle.paragraph.lineSpacing || 1.5 
              }}
              dangerouslySetInnerHTML={{ __html: processedReportContent }}
            />
          </div>
        )}

        {/* 章节配置的内容 */}
        {currentSections.body.map((section, index) => {
          const headingSize = section.level === 1 ? '24px' : section.level === 2 ? '20px' : '18px'
          const borderBottom = section.level === 1 ? '2px solid #1890ff' : '1px solid #e8e8e8'
          
          // 处理章节内容：先替换变量，再转换为HTML
          const contentWithVars = replaceVariablesInContent(section.content, resources, currentStyle)
          const processedContent = convertToHtml(contentWithVars)
          
          // 检查是否需要新的一页
          if (index > 0 && section.level === 1) {
            return (
              <div key={`section-${index}`} style={{ pageBreakBefore: 'always' }}>
                <div style={{ 
                  fontSize: headingSize, 
                  fontWeight: 'bold', 
                  marginBottom: '12px', 
                  paddingBottom: '8px', 
                  borderBottom: borderBottom, 
                  fontFamily: currentStyle.fonts.heading 
                }}>
                  {section.title}
                </div>
                <div 
                  className="report-content"
                  style={{ 
                    fontFamily: currentStyle.fonts.body, 
                    lineHeight: currentStyle.paragraph.lineSpacing || 1.5 
                  }}
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />
              </div>
            )
          }
          
          return (
            <div key={`section-${index}`} style={{ marginBottom: '24px' }}>
              <div style={{ 
                fontSize: headingSize, 
                fontWeight: 'bold', 
                marginBottom: '12px', 
                paddingBottom: '8px', 
                borderBottom: borderBottom, 
                fontFamily: currentStyle.fonts.heading 
              }}>
                {section.title}
              </div>
              <div 
                className="report-content"
                style={{ 
                  fontFamily: currentStyle.fonts.body, 
                  lineHeight: currentStyle.paragraph.lineSpacing || 1.5 
                }}
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            </div>
          )
        })}
      </ReportPage>
    )
  }, [reportContent, currentSections.body, currentStyle, resources, pageCount])

  // 构建附录内容
  const renderAppendix = useCallback(() => {
    if (currentSections.appendix.length === 0) return null
    
    let currentPage = 1
    if (currentSections.cover.enabled) currentPage++
    if (currentSections.toc.enabled) currentPage++
    if (reportContent || currentSections.body.length > 0) currentPage++
    
    return (
      <ReportPage pageNumber={currentPage} totalPages={pageCount} style={{ pageBreakBefore: 'always' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          marginBottom: '24px', 
          fontFamily: currentStyle.fonts.heading 
        }}>
          附录
        </h2>
        {currentSections.appendix.map((section, index) => {
          // 处理附录内容：先替换变量，再转换为HTML
          const contentWithVars = replaceVariablesInContent(section.content, resources, currentStyle)
          const processedContent = convertToHtml(contentWithVars)
          
          return (
            <div key={`appendix-${index}`} style={{ marginBottom: '24px' }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                marginBottom: '12px', 
                fontFamily: currentStyle.fonts.heading 
              }}>
                附录{index + 1}：{section.title}
              </div>
              <div 
                className="report-content"
                style={{ 
                  fontFamily: currentStyle.fonts.body, 
                  lineHeight: currentStyle.paragraph.lineSpacing || 1.5 
                }}
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            </div>
          )
        })}
      </ReportPage>
    )
  }, [reportContent, currentSections.appendix, currentSections.cover.enabled, currentSections.toc.enabled, currentSections.body.length, currentStyle, resources, pageCount])

  // 渲染空状态
  const renderEmptyState = () => {
    const hasContent = reportContent || 
                       currentSections.body.length > 0 || 
                       currentSections.appendix.length > 0 ||
                       currentSections.cover.enabled ||
                       currentSections.toc.enabled

    if (hasContent) return null

    return (
      <Center h={400}>
        <Text c="dimmed" ta="center">
          报告预览区域
          <br />
          请先配置章节内容或点击"开始生成"按钮
        </Text>
      </Center>
    )
  }

  // 更新页码
  useEffect(() => {
    calculatePageCount()
  }, [calculatePageCount])

  return (
    <div className="report-preview-container" style={{ height: '100%' }}>
      {/* 生成状态指示器 */}
      {(generationStatus === 'generating' || generationStatus === 'paused' || generationStatus === 'completed' || generationStatus === 'failed') && (
        <Box p="md" style={{ borderBottom: '1px solid #e8e8e8', backgroundColor: '#f8f9fa' }}>
          <Group justify="space-between">
            <Group>
              {generationStatus === 'generating' && (
                <Badge 
                  color="blue" 
                  variant="light" 
                  size="lg"
                >
                  <Loader size="xs" mr="xs" />
                  正在生成...
                </Badge>
              )}
              
              {generationStatus === 'paused' && (
                <Badge color="yellow" variant="light" size="lg">
                  已暂停
                </Badge>
              )}
              
              {generationStatus === 'completed' && (
                <Badge color="green" variant="light" size="lg">
                  生成完成
                </Badge>
              )}

              {generationStatus === 'failed' && (
                <Badge color="red" variant="light" size="lg">
                  生成失败
                </Badge>
              )}
            </Group>
            
            <Text size="sm" c="dimmed">
              共 {pageCount} 页
            </Text>
          </Group>
        </Box>
      )}

      {/* 预览内容 - 使用ScrollArea支持滚动 */}
      <ScrollArea style={{ height: 'calc(100vh - 180px)' }} p="md">
        {renderEmptyState()}

        {/* 封面 */}
        {renderCover()}

        {/* 目录 */}
        {renderTOC()}

        {/* 正文 */}
        {renderBody()}

        {/* 附录 */}
        {renderAppendix()}
      </ScrollArea>

      {/* 全局样式 */}
      <style>{`
        /* Markdown内容专用样式（仅在.report-content内生效） */
        .report-content ul, .report-content ol {
          margin: 8px 0;
          padding-left: 24px;
        }
        .report-content li {
          margin: 4px 0;
          line-height: ${currentStyle.paragraph?.lineSpacing || 1.5};
        }
        .report-content strong, .report-content b {
          font-weight: bold;
        }
        .report-content em, .report-content i {
          font-style: italic;
        }
        .report-content a {
          color: #1890ff;
          text-decoration: none;
        }
        .report-content a:hover {
          text-decoration: underline;
        }
        .report-content blockquote {
          border-left: 4px solid #1890ff;
          margin: 12px 0;
          padding: 8px 16px;
          background-color: #f5f5f5;
          color: #666;
        }
        .report-content code {
          font-family: 'Consolas', 'Monaco', monospace;
          background-color: #f5f5f5;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.9em;
        }
        .report-content pre {
          background-color: #f5f5f5;
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
          margin: 12px 0;
        }
        .report-content pre code {
          background-color: transparent;
          padding: 0;
        }
        .report-content hr {
          border: none;
          border-top: 1px solid #e8e8e8;
          margin: 16px 0;
        }
        ${configToCss(currentStyle)}
        
        @media print {
          .report-page {
            page-break-after: always;
            page-break-inside: avoid;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .report-page:last-child {
            page-break-after: avoid;
          }
        }
        
        /* 确保表格不会跨页 */
        .report-page table {
          page-break-inside: avoid;
        }
        
        /* 图片不会跨页 */
        .report-page img {
          page-break-inside: avoid;
        }
      `}</style>
    </div>
  )
}

// 导出获取HTML内容的方法（保留兼容，可能用于其他功能）
export const getReportPreviewHtml = (): string => {
  // 新的分页预览不再使用Tiptap编辑器，直接返回空字符串
  // 如果需要获取内容，可以从reportStore获取reportContent
  return ''
}

export default ReportPreview
