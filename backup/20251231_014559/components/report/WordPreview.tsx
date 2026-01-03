import React, { useState, useEffect } from 'react'
import {
  Card,
  Group,
  Text,
  Stack,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Button,
  Progress,
  Badge,
} from '@mantine/core'
import { 
  IconDownload, 
  IconEye,
  IconEyeOff,
  IconZoomIn,
  IconZoomOut,
  IconRefresh,
  IconFileText,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

interface WordPreviewProps {
  content: string
  title: string
  onExport?: () => void
  maxHeight?: number
}

/**
 * Word格式预览组件
 */
const WordPreview: React.FC<WordPreviewProps> = ({
  content,
  title,
  onExport,
  maxHeight = 600
}) => {
  const [scale, setScale] = useState(1)
  const [isPreviewMode, setIsPreviewMode] = useState(true)
  const [pageCount, setPageCount] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)

  // 计算页数
  useEffect(() => {
    if (!content) {
      setPageCount(1)
      return
    }

    // 简单估算：每2000字符为一页
    const estimatedPages = Math.max(1, Math.ceil(content.length / 2000))
    setPageCount(estimatedPages)
    setCurrentPage(1)
  }, [content])

  // 格式化内容为Word样式
  const formatContent = (text: string) => {
    if (!text) return ''

    return text
      .split('\n')
      .map((line, index) => {
        // 处理标题
        if (line.startsWith('# ')) {
          return `<h1 style="font-family: 'Microsoft YaHei', sans-serif; font-size: 24px; font-weight: bold; color: #2C3E50; margin: 24px 0 16px 0; line-height: 1.5;">${line.substring(2)}</h1>`
        }
        if (line.startsWith('## ')) {
          return `<h2 style="font-family: 'Microsoft YaHei', sans-serif; font-size: 20px; font-weight: bold; color: #2C3E50; margin: 20px 0 12px 0; line-height: 1.5;">${line.substring(3)}</h2>`
        }
        if (line.startsWith('### ')) {
          return `<h3 style="font-family: 'Microsoft YaHei', sans-serif; font-size: 18px; font-weight: bold; color: #2C3E50; margin: 16px 0 8px 0; line-height: 1.5;">${line.substring(4)}</h3>`
        }
        
        // 处理列表
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return `<li style="font-family: 'Microsoft YaHei', sans-serif; font-size: 14px; color: #333333; margin: 8px 0 8px 20px; line-height: 1.6;">${line.substring(2)}</li>`
        }
        if (line.match(/^\d+\. /)) {
          return `<li style="font-family: 'Microsoft YaHei', sans-serif; font-size: 14px; color: #333333; margin: 8px 0 8px 20px; line-height: 1.6;">${line.replace(/^\d+\. /, '')}</li>`
        }
        
        // 处理空行
        if (line.trim() === '') {
          return '<br style="margin: 8px 0;">'
        }
        
        // 普通段落
        return `<p style="font-family: 'Microsoft YaHei', sans-serif; font-size: 14px; color: #333333; margin: 8px 0; line-height: 1.6; text-align: justify;">${line}</p>`
      })
      .join('\n')
  }

  // 获取当前页内容
  const getCurrentPageContent = () => {
    if (!content) return ''
    
    const lines = content.split('\n')
    const linesPerPage = Math.ceil(lines.length / pageCount)
    const startIndex = (currentPage - 1) * linesPerPage
    const endIndex = Math.min(startIndex + linesPerPage, lines.length)
    
    return lines.slice(startIndex, endIndex).join('\n')
  }

  // 缩放控制
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5))
  }

  const handleResetZoom = () => {
    setScale(1)
  }

  // 导出功能
  const handleExport = () => {
    setIsProcessing(true)
    
    setTimeout(() => {
      if (onExport) {
        onExport()
      }
      setIsProcessing(false)
    }, 500)
  }

  // 下载为HTML文件
  const handleDownloadHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #ffffff;
        }
        h1 {
            font-size: 24px;
            font-weight: bold;
            color: #2C3E50;
            margin: 24px 0 16px 0;
            border-bottom: 2px solid #2C3E50;
            padding-bottom: 8px;
        }
        h2 {
            font-size: 20px;
            font-weight: bold;
            color: #2C3E50;
            margin: 20px 0 12px 0;
            border-bottom: 1px solid #2C3E50;
            padding-bottom: 6px;
        }
        h3 {
            font-size: 18px;
            font-weight: bold;
            color: #2C3E50;
            margin: 16px 0 8px 0;
        }
        p {
            margin: 8px 0;
            text-align: justify;
        }
        ul, ol {
            margin: 8px 0 8px 20px;
        }
        li {
            margin: 4px 0;
            line-height: 1.6;
        }
        .page-break {
            page-break-before: always;
            border-top: 2px dashed #ccc;
            padding-top: 20px;
            margin-top: 20px;
        }
        @media print {
            body {
                padding: 0;
            }
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${formatContent(content)}
</body>
</html>
    `
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    notifications.show({
      title: '下载成功',
      message: 'HTML文件已下载',
      color: 'green',
    })
  }

  if (!content) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
        <Stack align="center" gap="md" style={{ minHeight: '300px' }}>
          <IconFileText size={48} color="#86909C" />
          <Text size="lg" c="#86909C" fw={500}>暂无预览内容</Text>
          <Text size="sm" c="#86909C">请先生成报告内容</Text>
        </Stack>
      </Card>
    )
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
      <Stack gap="md">
        {/* 标题和工具栏 */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={500} c="#1D2129">Word预览</Text>
            <Badge size="sm" color="blue" variant="light">
              第 {currentPage} / {pageCount} 页
            </Badge>
          </Group>
          
          <Group gap="xs">
            <Tooltip label="放大">
              <ActionIcon
                variant="light"
                color="blue"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 2}
              >
                <IconZoomIn size={16} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="缩小">
              <ActionIcon
                variant="light"
                color="blue"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <IconZoomOut size={16} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="重置缩放">
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                onClick={handleResetZoom}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="下载HTML">
              <ActionIcon
                variant="light"
                color="green"
                size="sm"
                onClick={handleDownloadHTML}
              >
                <IconDownload size={16} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label={isPreviewMode ? '编辑模式' : '预览模式'}>
              <ActionIcon
                variant="light"
                color={isPreviewMode ? 'blue' : 'gray'}
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                {isPreviewMode ? <IconEye size={16} /> : <IconEyeOff size={16} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* 缩放指示器 */}
        <Group gap="md" align="center">
          <Text size="xs" c="#86909C">缩放:</Text>
          <Progress
            value={scale * 50} // 0.5-2.0 映射到 25-100
            size="sm"
            color="blue"
            style={{ width: '100px' }}
          />
          <Text size="xs" c="#86909C">{Math.round(scale * 100)}%</Text>
        </Group>

        {/* 页面导航 */}
        {pageCount > 1 && (
          <Group gap="xs" align="center">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
              上一页
            </Button>
            
            <Text size="xs" c="#86909C">
              第 {currentPage} 页，共 {pageCount} 页
            </Text>
            
            <Button
              variant="outline"
              size="xs"
              onClick={() => setCurrentPage(prev => Math.min(pageCount, prev + 1))}
              disabled={currentPage >= pageCount}
            >
              下一页
            </Button>
          </Group>
        )}

        {/* 预览区域 */}
        <div
          style={{
            border: '2px solid #E5E6EB',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            minHeight: '400px',
            maxHeight: `${maxHeight}px`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <ScrollArea
            scrollbarSize={8}
            style={{
              height: `${maxHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${100 / scale}%`,
            }}
          >
            <div
              style={{
                padding: '40px',
                fontFamily: "'Microsoft YaHei', '微软雅黑', Arial, sans-serif",
                lineHeight: '1.6',
                color: '#333333',
                backgroundColor: '#FFFFFF',
                minHeight: '320px',
              }}
              dangerouslySetInnerHTML={{
                __html: formatContent(getCurrentPageContent())
              }}
            />
          </ScrollArea>
          
          {/* 处理中遮罩 */}
          {isProcessing && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <Stack align="center" gap="md">
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#165DFF',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }} />
                <Text size="lg" c="#165DFF" fw={500}>正在处理...</Text>
              </Stack>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <Group justify="space-between" align="center">
          <Text size="xs" c="#86909C">
            预览效果接近实际Word文档格式 • 支持分页浏览
          </Text>
          
          <Group gap="xs">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              loading={isProcessing}
              leftSection={<IconDownload size={14} />}
            >
              导出Word
            </Button>
          </Group>
        </Group>
      </Stack>
    </Card>
  )
}

export default WordPreview