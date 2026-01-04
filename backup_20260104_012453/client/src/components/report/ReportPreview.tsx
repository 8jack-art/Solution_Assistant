import { Paper, Text, Badge, Loader, Center, Box } from '@mantine/core'
import { useReportStore } from '../../stores/reportStore'
import type { ReportStyleConfig } from '../../types/report'
import { useMemo } from 'react'

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
    spaceAfter: 0
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

export function ReportPreview() {
  const { 
    reportContent, 
    generationStatus, 
    styleConfig, 
    sections, 
    resources 
  } = useReportStore()

  // 获取当前配置（带默认值）
  const currentStyle = useMemo((): ReportStyleConfig => ({
    ...defaultStyleConfig,
    ...styleConfig,
    fonts: { ...defaultStyleConfig.fonts, ...styleConfig?.fonts },
    fontSizes: { ...defaultStyleConfig.fontSizes, ...styleConfig?.fontSizes },
    paragraph: { ...defaultStyleConfig.paragraph, ...styleConfig?.paragraph },
    page: { ...defaultStyleConfig.page, ...styleConfig?.page },
    table: { ...defaultStyleConfig.table, ...styleConfig?.table }
  }), [styleConfig])

  const currentSections = useMemo(() => ({
    cover: { ...defaultCover, ...sections?.cover },
    toc: { ...defaultTOC, ...sections?.toc },
    body: sections?.body || [],
    appendix: sections?.appendix || []
  }), [sections])

  // 解析Markdown内容并渲染
  const renderMarkdownContent = (content: string): React.ReactNode => {
    if (!content) return null

    const lines = content.split('\n')
    const elements: React.ReactNode[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 检测标题
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} style={{ 
            fontSize: `${currentStyle.fontSizes.title}px`, 
            fontWeight: 'bold', 
            marginTop: '16px', 
            marginBottom: '8px',
            fontFamily: currentStyle.fonts.heading
          }}>
            {line.slice(2)}
          </h1>
        )
        continue
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} style={{ 
            fontSize: `${(currentStyle.fontSizes.title ?? 32) - 4}px`, 
            fontWeight: 'bold', 
            marginTop: '14px', 
            marginBottom: '6px',
            fontFamily: currentStyle.fonts.heading
          }}>
            {line.slice(3)}
          </h2>
        )
        continue
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} style={{ 
            fontSize: `${(currentStyle.fontSizes.title ?? 32) - 8}px`, 
            fontWeight: 'bold', 
            marginTop: '12px', 
            marginBottom: '4px',
            fontFamily: currentStyle.fonts.heading
          }}>
            {line.slice(4)}
          </h3>
        )
        continue
      }

      // 检测表格标记 {{TABLE:xxx}}
      const tableMatch = line.match(/^\{\{TABLE:(\w+)\}\}\}$/)
      if (tableMatch) {
        const tableId = tableMatch[1]
        const tableResource = resources?.tables?.[tableId]
        if (tableResource) {
          elements.push(
            <div key={i} style={{ margin: '16px 0' }}>
              {renderTable(tableResource, currentStyle)}
            </div>
          )
        } else {
          elements.push(
            <div key={i} style={{ 
              padding: '16px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '4px',
              margin: '8px 0',
              fontStyle: 'italic',
              color: '#666'
            }}>
              表格 "{tableId}"（未找到资源）
            </div>
          )
        }
        continue
      }

      // 检测图表标记 {{CHART:xxx}}
      const chartMatch = line.match(/^\{\{CHART:(\w+)\}\}\}$/)
      if (chartMatch) {
        const chartId = chartMatch[1]
        const chartResource = resources?.charts?.[chartId]
        if (chartResource) {
          elements.push(
            <div key={i} style={{ margin: '16px 0' }}>
              {renderChart(chartResource, currentStyle)}
            </div>
          )
        } else {
          elements.push(
            <div key={i} style={{ 
              padding: '40px 16px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '4px',
              margin: '8px 0',
              textAlign: 'center',
              fontStyle: 'italic',
              color: '#666'
            }}>
              图表 "{chartId}"（未找到资源）
            </div>
          )
        }
        continue
      }

      // 检测列表
      if (line.startsWith('- ')) {
        elements.push(
          <div key={i} style={{ marginLeft: '20px', marginBottom: '4px' }}>
            <span style={{ marginRight: '8px' }}>•</span>{line.slice(2)}
          </div>
        )
        continue
      }
      if (line.match(/^\d+\. /)) {
        elements.push(
          <div key={i} style={{ marginLeft: '20px', marginBottom: '4px' }}>
            {line}
          </div>
        )
        continue
      }

      // 空行
      if (line.trim() === '') {
        elements.push(<br key={i} />)
        continue
      }

      // 普通段落
      elements.push(
        <div key={i} style={{ marginBottom: '4px', fontFamily: currentStyle.fonts.body }}>
          {line}
        </div>
      )
    }

    return elements
  }

  // 渲染表格
  const renderTable = (table: any, style: ReportStyleConfig) => {
    if (!table.data || !table.columns) return null

    const headerBgColor = style.table?.headerBg || 'EEEEEE'
    const showZebra = style.table?.zebraStripe

    return (
      <div style={{ overflow: 'auto' }}>
        {table.title && (
          <div style={{ 
            fontSize: `${style.fontSizes?.tableTitle || 18}px`, 
            fontWeight: 'bold',
            marginBottom: '8px',
            textAlign: 'center',
            fontFamily: style.fonts?.heading
          }}>
            {table.title}
          </div>
        )}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: `${style.fontSizes?.tableBody || 14}px`,
          fontFamily: style.fonts?.body
        }}>
          <thead>
            <tr style={{ backgroundColor: `#${headerBgColor}` }}>
              {table.columns.map((col: string, idx: number) => (
                <th 
                  key={idx}
                  style={{ 
                    padding: '8px', 
                    border: '1px solid #000',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.data.map((row: any[], rowIndex: number) => (
              <tr 
                key={rowIndex}
                style={{ 
                  backgroundColor: showZebra && rowIndex % 2 === 1 ? '#F5F5F5' : 'transparent'
                }}
              >
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex}
                    style={{ 
                      padding: '8px', 
                      border: '1px solid #000',
                      textAlign: style.table?.alignment || 'left'
                    }}
                  >
                    {cell !== undefined && cell !== null ? String(cell) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // 渲染图表占位符
  const renderChart = (chart: any, style: ReportStyleConfig) => {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fff',
        border: '1px solid #e8e8e8',
        borderRadius: '4px',
        textAlign: 'center'
      }}>
        {chart.title && (
          <div style={{ 
            fontSize: `${style.fontSizes?.tableTitle || 18}px`, 
            fontWeight: 'bold',
            marginBottom: '16px',
            fontFamily: style.fonts?.heading
          }}>
            {chart.title}
          </div>
        )}
        <div style={{ 
          height: '200px', 
          backgroundColor: '#f9f9f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed #ccc',
          borderRadius: '4px'
        }}>
          {chart.imageData ? (
            <img 
              src={chart.imageData} 
              alt={chart.title || '图表'} 
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          ) : (
            <Text c="dimmed">
              {chart.type === 'bar' ? '📊 柱状图' : 
               chart.type === 'line' ? '📈 折线图' : 
               chart.type === 'pie' ? '🥧 饼图' : '📈 图表'}
              （{chart.id}）
            </Text>
          )}
        </div>
      </div>
    )
  }

  // 渲染封面
  const renderCover = () => {
    if (!currentSections.cover.enabled) return null

    return (
      <div style={{ 
        pageBreakAfter: 'always',
        padding: '60px 40px',
        textAlign: 'center',
        minHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        {currentSections.cover.logo && (
          <div style={{ marginBottom: '40px' }}>
            <img 
              src={currentSections.cover.logo} 
              alt="Logo" 
              style={{ maxHeight: '80px' }}
            />
          </div>
        )}
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
        <div style={{ marginTop: '80px', fontFamily: currentStyle.fonts.body }}>
          {currentSections.cover.projectName && (
            <p style={{ fontSize: '20px', marginBottom: '16px' }}>
              项目名称：{currentSections.cover.projectName}
            </p>
          )}
          {currentSections.cover.companyName && (
            <p style={{ fontSize: '16px', marginBottom: '16px' }}>
              编制单位：{currentSections.cover.companyName}
            </p>
          )}
          {currentSections.cover.author && (
            <p style={{ fontSize: '16px', marginBottom: '16px' }}>
              编制人：{currentSections.cover.author}
            </p>
          )}
          <p style={{ fontSize: '16px' }}>
            编制日期：{currentSections.cover.date}
          </p>
        </div>
      </div>
    )
  }

  // 渲染目录
  const renderTOC = () => {
    if (!currentSections.toc.enabled) return null

    const tocTitles: { title: string; level: number; page: number }[] = []

    // 从正文章节提取标题
    currentSections.body.forEach(section => {
      if (section.level <= currentSections.toc.depth) {
        tocTitles.push({ title: section.title, level: section.level, page: 1 })
      }
    })

    // 从附录提取标题
    currentSections.appendix.forEach(section => {
      tocTitles.push({ title: section.title, level: 1, page: 1 })
    })

    return (
      <div style={{ 
        pageBreakAfter: 'always',
        padding: '40px',
        minHeight: '400px'
      }}>
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
          {tocTitles.map((item, index) => (
            <div 
              key={index}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px',
                marginLeft: `${(item.level - 1) * 24}px`
              }}
            >
              <span style={{ 
                flex: 1,
                fontSize: `${currentStyle.fontSizes.body}px`,
                fontWeight: item.level === 1 ? 'normal' : 'normal'
              }}>
                {item.title}
              </span>
              {currentSections.toc.includePageNumbers && (
                <span style={{ marginLeft: '16px', color: '#666' }}>
                  {item.page}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 渲染正文内容
  const renderBodyContent = () => {
    return currentSections.body.map((section) => (
      <div key={section.id} style={{ marginBottom: '24px' }}>
        <div style={{ 
          fontSize: section.level === 1 ? '24px' : section.level === 2 ? '20px' : '18px',
          fontWeight: 'bold',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: section.level === 1 ? '2px solid #1890ff' : '1px solid #e8e8e8',
          fontFamily: currentStyle.fonts.heading
        }}>
          {section.title}
        </div>
        <div style={{ 
          lineHeight: String(currentStyle.paragraph.lineSpacing || 1.5),
          fontFamily: currentStyle.fonts.body
        }}>
          {renderMarkdownContent(section.content)}
        </div>
      </div>
    ))
  }

  // 渲染附录内容
  const renderAppendixContent = () => {
    if (currentSections.appendix.length === 0) return null

    return (
      <div style={{ pageBreakBefore: 'always' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          marginBottom: '24px',
          fontFamily: currentStyle.fonts.heading
        }}>
          附录
        </h2>
        {currentSections.appendix.map((section, index) => (
          <div key={section.id} style={{ marginBottom: '24px' }}>
            <div style={{ 
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '12px',
              fontFamily: currentStyle.fonts.heading
            }}>
              附录{index + 1}：{section.title}
            </div>
            <div style={{ 
              lineHeight: String(currentStyle.paragraph.lineSpacing || 1.5),
              fontFamily: currentStyle.fonts.body
            }}>
              {renderMarkdownContent(section.content)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 渲染内容
  const renderContent = () => {
    // 如果没有任何内容，显示提示
    if (!reportContent && currentSections.body.length === 0) {
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

    return (
      <div style={{ 
        lineHeight: String(currentStyle.paragraph.lineSpacing || 1.5), 
        fontSize: `${currentStyle.fontSizes.body || 16}px`,
        fontFamily: currentStyle.fonts.body
      }}>
        {/* 封面 */}
        {renderCover()}

        {/* 目录 */}
        {renderTOC()}

        {/* AI生成的内容 */}
        {reportContent && (
          <div style={{ padding: '40px' }}>
            <div style={{ 
              fontSize: `${currentStyle.fontSizes.title}px`,
              fontWeight: 'bold',
              marginBottom: '16px',
              fontFamily: currentStyle.fonts.heading
            }}>
              报告内容
            </div>
            <div style={{ 
              lineHeight: String(currentStyle.paragraph.lineSpacing || 1.5),
              fontFamily: currentStyle.fonts.body
            }}>
              {renderMarkdownContent(reportContent)}
            </div>
          </div>
        )}

        {/* 章节配置的内容 */}
        {currentSections.body.length > 0 && (
          <div style={{ padding: '40px' }}>
            {renderBodyContent()}
          </div>
        )}

        {/* 附录 */}
        {currentSections.appendix.length > 0 && (
          <div style={{ padding: '40px' }}>
            {renderAppendixContent()}
          </div>
        )}
      </div>
    )
  }

  return (
    <Paper
      shadow="sm"
      p={0}
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        backgroundColor: '#fff',
        overflow: 'hidden'
      }}
    >
      {/* 生成状态指示器 */}
      {(generationStatus === 'generating' || generationStatus === 'paused' || generationStatus === 'completed' || generationStatus === 'failed') && (
        <Box p="md" style={{ borderBottom: '1px solid #e8e8e8' }}>
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
        </Box>
      )}

      {/* 预览内容 */}
      <div className="preview-content">
        {renderContent()}
      </div>
    </Paper>
  )
}

export default ReportPreview
