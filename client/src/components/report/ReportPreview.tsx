import { Paper, Text, Badge, Loader, Center, Box, Group, ScrollArea } from '@mantine/core'
import { useReportStore } from '../../stores/reportStore'
import type { ReportStyleConfig, ResourceMap } from '../../types/report'
import { defaultStyleConfig } from '../../types/report'
import { useMemo, useEffect, useCallback, useState } from 'react'
import { marked } from 'marked'
import remarkGfm from 'remark-gfm'
import { 
  getComputedParagraphStyle, 
  getTableStyles, 
  styleToString 
} from '../../utils/styleCalculator'

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

// 样式转字符串
const styleToCssString = (style: React.CSSProperties): string => {
  return Object.entries(style)
    .map(([key, value]) => {
      if (value === undefined || value === null || value === '') return ''
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      return `${cssKey}: ${value}`
    })
    .filter(Boolean)
    .join('; ')
}

// 替换内容中的变量标记
const replaceVariablesInContent = (
  content: string, 
  resources: ResourceMap, 
  config: ReportStyleConfig,
  tableStyles: ReturnType<typeof getTableStyles>
): string => {
  if (!content) return ''

  let result = content

  // 替换表格数据变量 {{DATA:tableId}} - JSON格式数据
  result = result.replace(/\{\{DATA:(\w+)\}\}/g, (match, dataId) => {
    const tableResource = resources.tables?.[dataId]
    if (tableResource && tableResource.data) {
      const jsonStr = JSON.stringify(tableResource.data, null, 2)
      return `<pre style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${jsonStr}</pre>`
    }
    return `[表格数据 ${dataId} 未找到]`
  })

  // 替换表格变量 {{TABLE:tableId}}
  result = result.replace(/\{\{TABLE:(\w+)\}\}/g, (match, tableId) => {
    const tableResource = resources.tables?.[tableId]
    if (tableResource) {
      const columns = tableResource.columns || []
      const data = tableResource.data
      const zebraStripe = config.table?.zebraStripe

      const headerRow = columns.map((col: string) => 
        `<th style="${styleToString(tableStyles.header)}">${col}</th>`
      ).join('')

      const dataRows = data.map((row: any, rowIndex: number) => {
        const rowBg = zebraStripe && rowIndex % 2 === 1 ? 'background-color: #F5F5F5;' : ''
        const cells = columns.map((col: string) => 
          `<td style="${styleToString(tableStyles.cell)} ${rowBg}">${row[col] ?? ''}</td>`
        ).join('')
        return `<tr>${cells}</tr>`
      }).join('')

      return `
        <p style="${styleToString(tableStyles.title)}">${tableResource.title || '表格'}</p>
        <table style="${styleToString(tableStyles.table)}">
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${dataRows}</tbody>
        </table>
      `
    }
    return `[表格 ${tableId} 未找到]`
  })

  // 替换图表变量 {{CHART:chartId}}
  result = result.replace(/\{\{CHART:(\w+)\}\}/g, (match, chartId) => {
    const chartResource = resources.charts?.[chartId]
    if (chartResource && chartResource.base64Image) {
      return `
        <p style="${styleToString(tableStyles.title)}">${chartResource.title || '图表'}</p>
        <div style="text-align: center; margin: 16px 0;">
          <img src="${chartResource.base64Image}" alt="${chartResource.title || '图表'}" style="max-width: 100%; height: auto; max-height: 400px;" />
        </div>
      `
    }
    return `[图表 ${chartId} 未找到]`
  })

  return result
}

// 单页组件 - 使用配置中的页边距
function ReportPage({ 
  children, 
  pageMargin,
  style 
}: { 
  children: React.ReactNode
  pageMargin?: { top: number; bottom: number; left: number; right: number }
  style?: React.CSSProperties
}) {
  return (
    <div 
      className="report-page"
      style={{
        width: '100%',
        minHeight: '297mm',
        backgroundColor: '#fff',
        padding: `${(pageMargin?.top || 0) * 37.8}px ${(pageMargin?.right || 0) * 37.8}px ${(pageMargin?.bottom || 0) * 37.8}px ${(pageMargin?.left || 0) * 37.8}px`,
        margin: '0 auto 10px auto',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        position: 'relative',
        boxSizing: 'border-box',
        ...style
      }}
    >
      {children}
    </div>
  )
}

// 渲染 Markdown 内容为 HTML
function renderMarkdown(content: string, styles: {
  heading1: React.CSSProperties
  heading2: React.CSSProperties
  heading3: React.CSSProperties
  body: React.CSSProperties
  table: ReturnType<typeof getTableStyles>
}): string {
  // 使用 marked 渲染 Markdown（配置 remark-gfm 支持表格）
  const html = marked.parse(content, {
    gfm: true,  // 启用 GitHub Flavored Markdown（支持表格）
    breaks: true  // 允许换行符转换为 <br>
  }) as string
  
  // 后处理 HTML，应用样式
  let result = html
  
  // 应用标题1样式
  result = result.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (match, text) => {
    return `<h1 style="${styleToCssString(styles.heading1)}">${text}</h1>`
  })
  
  // 应用标题2样式
  result = result.replace(/<h2[^>]*>(.*?)<\/h2>/gi, (match, text) => {
    return `<h2 style="${styleToCssString(styles.heading2)}">${text}</h2>`
  })
  
  // 应用标题3样式
  result = result.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (match, text) => {
    return `<h3 style="${styleToCssString(styles.heading3)}">${text}</h3>`
  })
  
  // 应用段落样式
  result = result.replace(/<p[^>]*>(.*?)<\/p>/gi, (match, text) => {
    return `<p style="${styleToCssString(styles.body)}">${text}</p>`
  })
  
  // 应用列表项样式
  result = result.replace(/<li[^>]*>(.*?)<\/li>/gi, (match, text) => {
    return `<li style="${styleToCssString(styles.body)}">${text}</li>`
  })
  
  // 应用表格样式
  result = result.replace(/<table[^>]*>/gi, `<table style="${styleToCssString(styles.table.table)}">`)
  result = result.replace(/<thead[^>]*>/gi, `<thead style="${styleToCssString(styles.table.thead)}">`)
  result = result.replace(/<tbody[^>]*>/gi, `<tbody style="${styleToCssString(styles.table.tbody)}">`)
  result = result.replace(/<tr[^>]*>/gi, `<tr style="${styleToCssString(styles.table.row)}">`)
  result = result.replace(/<th([^>]*)>/gi, (match, attrs) => {
    return `<th style="${styleToCssString(styles.table.header)}"${attrs}>`
  })
  result = result.replace(/<td([^>]*)>/gi, (match, attrs) => {
    return `<td style="${styleToCssString(styles.table.cell)}"${attrs}>`
  })
  
  return result
}

interface MarkdownRendererProps {
  content: string
  config: ReportStyleConfig
  resources: ResourceMap
}

function MarkdownRenderer({ content, config, resources }: MarkdownRendererProps) {
  // 计算所有样式
  const styles = useMemo(() => ({
    heading1: getComputedParagraphStyle(config, 'heading1'),
    heading2: getComputedParagraphStyle(config, 'heading2'),
    heading3: getComputedParagraphStyle(config, 'heading3'),
    body: getComputedParagraphStyle(config, 'body'),
    table: getTableStyles(config)
  }), [config])
  
  // 替换变量并渲染
  const contentWithVars = useMemo(() => {
    return replaceVariablesInContent(content, resources, config, styles.table)
  }, [content, resources, config, styles.table])
  
  // 渲染 Markdown
  const htmlContent = useMemo(() => {
    return renderMarkdown(contentWithVars, {
      heading1: styles.heading1,
      heading2: styles.heading2,
      heading3: styles.heading3,
      body: styles.body,
      table: styles.table
    })
  }, [contentWithVars, styles])
  
  return (
    <div 
      className="report-content"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

export function ReportPreview() {
  const { 
    reportContent, 
    generationStatus, 
    styleConfig, 
    sections, 
    resources
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
    heading3: { ...defaultStyleConfig.heading3, ...styleConfig?.heading3 },
    body: { ...defaultStyleConfig.body, ...styleConfig?.body },
    page: { ...defaultStyleConfig.page, ...styleConfig?.page },
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
      <ReportPage pageMargin={currentStyle.page?.margin}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontSize: `${currentStyle.fontSizes?.title || 32}px`, 
            fontWeight: 'bold', 
            marginBottom: '20px', 
            fontFamily: currentStyle.fonts.heading 
          }}>
            {currentSections.cover.title || '投资方案报告'}
          </h1>
          {currentSections.cover.subtitle && (
            <h2 style={{ 
              fontSize: `${currentStyle.fontSizes?.title ? currentStyle.fontSizes.title * 0.67 : 24}px`, 
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
  }, [currentSections.cover, currentStyle.fonts, currentStyle.fontSizes, pageCount])

  // 构建目录内容
  const renderTOC = useCallback(() => {
    if (!currentSections.toc.enabled) return null
    
    let currentPage = 2 // 封面后是目录
    
    return (
      <ReportPage pageMargin={currentStyle.page?.margin}>
        <h2 style={{ 
          fontSize: `${currentStyle.heading1?.fontSize || 22}px`, 
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
  }, [currentSections.toc, currentSections.body, currentSections.appendix, currentStyle.fonts, currentStyle.fontSizes, currentStyle.heading1, pageCount])

  // 构建正文内容
  const renderBody = useCallback(() => {
    if (!reportContent && currentSections.body.length === 0) return null
    
    let currentPage = 1 // 封面是第1页
    if (currentSections.cover.enabled) currentPage++
    if (currentSections.toc.enabled) currentPage++
    
    return (
      <ReportPage pageMargin={currentStyle.page?.margin}>
        {/* AI生成的内容 */}
        {reportContent && (
          <MarkdownRenderer 
            content={reportContent} 
            config={currentStyle} 
            resources={resources} 
          />
        )}

        {/* 章节配置的内容 */}
        {currentSections.body.map((section, index) => {
          const headingSize = section.level === 1 
            ? currentStyle.heading1?.fontSize || 22
            : section.level === 2 
              ? currentStyle.heading2?.fontSize || 16
              : currentStyle.heading3?.fontSize || 15
          const borderBottom = section.level === 1 ? '2px solid #1890ff' : '1px solid #e8e8e8'
          
          // 检查是否需要新的一页
          if (index > 0 && section.level === 1) {
            return (
              <div key={`section-${index}`} style={{ pageBreakBefore: 'always' }}>
                <div style={{ 
                  fontSize: `${headingSize}px`, 
                  fontWeight: 'bold', 
                  marginBottom: '12px', 
                  paddingBottom: '8px', 
                  borderBottom: borderBottom, 
                  fontFamily: currentStyle.fonts.heading 
                }}>
                  {section.title}
                </div>
                <MarkdownRenderer 
                  content={section.content} 
                  config={currentStyle} 
                  resources={resources} 
                />
              </div>
            )
          }
          
          return (
            <div key={`section-${index}`} style={{ marginBottom: '24px' }}>
              <div style={{ 
                fontSize: `${headingSize}px`, 
                fontWeight: 'bold', 
                marginBottom: '12px', 
                paddingBottom: '8px', 
                borderBottom: borderBottom, 
                fontFamily: currentStyle.fonts.heading 
              }}>
                {section.title}
              </div>
              <MarkdownRenderer 
                content={section.content} 
                config={currentStyle} 
                resources={resources} 
              />
            </div>
          )
        })}
      </ReportPage>
    )
  }, [reportContent, currentSections.body, currentSections.cover.enabled, currentSections.toc.enabled, currentStyle, resources, pageCount])

  // 构建附录内容
  const renderAppendix = useCallback(() => {
    if (currentSections.appendix.length === 0) return null
    
    return (
      <ReportPage pageMargin={currentStyle.page?.margin} style={{ pageBreakBefore: 'always' }}>
        <h2 style={{ 
          fontSize: `${currentStyle.heading1?.fontSize || 22}px`, 
          fontWeight: 'bold', 
          marginBottom: '24px', 
          fontFamily: currentStyle.fonts.heading 
        }}>
          附录
        </h2>
        {currentSections.appendix.map((section, index) => (
          <div key={`appendix-${index}`} style={{ marginBottom: '24px' }}>
            <div style={{ 
              fontSize: `${currentStyle.heading2?.fontSize || 16}px`, 
              fontWeight: 'bold', 
              marginBottom: '12px', 
              fontFamily: currentStyle.fonts.heading 
            }}>
              附录{index + 1}：{section.title}
            </div>
            <MarkdownRenderer 
              content={section.content} 
              config={currentStyle} 
              resources={resources} 
            />
          </div>
        ))}
      </ReportPage>
    )
  }, [currentSections.appendix, currentSections.cover.enabled, currentSections.toc.enabled, currentSections.body.length, currentStyle, resources, pageCount])

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

      {/* 预览内容 */}
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
        .report-content {
          font-family: '宋体', serif;
        }
        .report-content h1 {
          font-weight: bold;
        }
        .report-content h2 {
          font-weight: bold;
        }
        .report-content h3 {
          font-weight: bold;
        }
        .report-content p {
          margin: 0;
        }
        .report-content li {
          line-height: inherit;
        }
        
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
          .report-page table {
            page-break-inside: avoid;
          }
          .report-page img {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}

// 导出获取HTML内容的方法
export const getReportPreviewHtml = (): string => {
  return ''
}

export default ReportPreview
