import React, { useState, useEffect, useRef } from 'react'
import {
  Card,
  Group,
  Text,
  Stack,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Progress,
  Badge,
} from '@mantine/core'
import { 
  IconCopy, 
  IconDownload,
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconPlayerPlay,
  IconPlayerPause,
  IconCheck,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

interface StreamingOutputProps {
  content: string
  isGenerating: boolean
  onCopy?: () => void
  onExport?: () => void
  maxHeight?: number
  showControls?: boolean
}

/**
 * 实时流式输出组件
 */
const StreamingOutput: React.FC<StreamingOutputProps> = ({
  content,
  isGenerating,
  onCopy,
  onExport,
  maxHeight = 500,
  showControls = true
}) => {
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const [isWordWrap, setIsWordWrap] = useState(true)
  const [showLineNumbers, setShowLineNumbers] = useState(false)
  const [copiedLines, setCopiedLines] = useState<Set<number>>(new Set())
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (isAutoScroll && scrollAreaRef.current && content) {
      const scrollElement = scrollAreaRef.current
      scrollElement.scrollTop = scrollElement.scrollHeight
    }
  }, [content, isAutoScroll])

  // 复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      notifications.show({
        title: '复制成功',
        message: '内容已复制到剪贴板',
        color: 'green',
      })
      if (onCopy) onCopy()
    }).catch(() => {
      notifications.show({
        title: '复制失败',
        message: '无法复制到剪贴板',
        color: 'red',
      })
    })
  }

  // 复制单行
  const handleCopyLine = (lineNumber: number, lineContent: string) => {
    navigator.clipboard.writeText(lineContent).then(() => {
      setCopiedLines(prev => new Set(prev).add(lineNumber))
      setTimeout(() => {
        setCopiedLines(prev => {
          const newSet = new Set(prev)
          newSet.delete(lineNumber)
          return newSet
        })
      }, 2000) // 2秒后移除复制状态
    })
  }

  // 下载内容
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `report-content-${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    notifications.show({
      title: '下载成功',
      message: '内容已下载为文本文件',
      color: 'green',
    })
    
    if (onExport) onExport()
  }

  // 格式化内容显示
  const formatContent = (text: string) => {
    if (!text) return ''
    
    // 简单的Markdown格式化
    return text
      .split('\n')
      .map((line, index) => {
        // 处理标题
        if (line.startsWith('# ')) {
          return `<h1 style="color: #1D2129; font-weight: 700; font-size: 18px; margin: 16px 0 8px 0;">${line.substring(2)}</h1>`
        }
        if (line.startsWith('## ')) {
          return `<h2 style="color: #1D2129; font-weight: 600; font-size: 16px; margin: 12px 0 6px 0;">${line.substring(3)}</h2>`
        }
        if (line.startsWith('### ')) {
          return `<h3 style="color: #1D2129; font-weight: 600; font-size: 14px; margin: 8px 0 4px 0;">${line.substring(4)}</h3>`
        }
        
        // 处理列表
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return `<li style="color: #4E5969; margin: 4px 0 4px 20px; list-style-type: disc;">${line.substring(2)}</li>`
        }
        if (line.match(/^\d+\. /)) {
          return `<li style="color: #4E5969; margin: 4px 0 4px 20px; list-style-type: decimal;">${line.replace(/^\d+\. /, '')}</li>`
        }
        
        // 处理空行
        if (line.trim() === '') {
          return '<br />'
        }
        
        // 普通段落
        return `<p style="color: #1D2129; margin: 4px 0; line-height: 1.6;">${line}</p>`
      })
      .join('\n')
  }

  // 获取行数
  const getLineCount = () => {
    if (!content) return 0
    return content.split('\n').length
  }

  // 渲染内容
  const renderContent = () => {
    if (!content) {
      return (
        <Text c="#86909C" style={{ padding: '20px', textAlign: 'center' }}>
          暂无生成内容...
        </Text>
      )
    }

    const lines = content.split('\n')
    
    return (
      <div
        ref={contentRef}
        style={{
          fontFamily: isWordWrap ? 'inherit' : 'Monaco, Consolas, monospace',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: isWordWrap ? 'pre-wrap' : 'pre',
          wordBreak: isWordWrap ? 'break-word' : 'normal',
          padding: '16px',
          backgroundColor: '#FFFFFF',
        }}
      >
        {lines.map((line, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              minHeight: '22px',
              alignItems: 'flex-start',
              position: 'relative',
              backgroundColor: copiedLines.has(index) ? '#E6F7FF' : 'transparent',
              borderRadius: '4px',
              marginBottom: '2px',
            }}
            onMouseEnter={(e) => {
              if (showLineNumbers) {
                e.currentTarget.style.backgroundColor = '#F0F9FF'
              }
            }}
            onMouseLeave={(e) => {
              if (showLineNumbers && !copiedLines.has(index)) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            {showLineNumbers && (
              <span
                style={{
                  minWidth: '40px',
                  color: '#86909C',
                  fontSize: '12px',
                  textAlign: 'right',
                  paddingRight: '8px',
                  userSelect: 'none',
                  borderRight: '1px solid #E5E6EB',
                  marginRight: '8px',
                }}
              >
                {index + 1}
              </span>
            )}
            <span
              style={{
                flex: 1,
                cursor: showLineNumbers ? 'pointer' : 'default',
              }}
              onClick={() => showLineNumbers && handleCopyLine(index + 1, line)}
              title={showLineNumbers ? '点击复制此行' : undefined}
            >
              {line || <span style={{ color: '#86909C' }}>&nbsp;</span>}
            </span>
            {showLineNumbers && (
              <Tooltip label="复制此行">
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="xs"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '2px',
                    opacity: 0.7,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopyLine(index + 1, line)
                  }}
                >
                  <IconCopy size={12} />
                </ActionIcon>
              </Tooltip>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
      <Stack gap="md">
        {/* 标题和状态 */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={500} c="#1D2129">生成内容</Text>
            {isGenerating && (
              <Group gap="xs">
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#165DFF',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }} />
                <Text size="xs" c="#165DFF">生成中...</Text>
              </Group>
            )}
          </Group>
          
          {showControls && (
            <Group gap="xs">
              <Tooltip label={isAutoScroll ? '关闭自动滚动' : '开启自动滚动'}>
                <ActionIcon
                  variant="subtle"
                  color={isAutoScroll ? 'blue' : 'gray'}
                  size="sm"
                  onClick={() => setIsAutoScroll(!isAutoScroll)}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
              
              <Tooltip label={isWordWrap ? '关闭自动换行' : '开启自动换行'}>
                <ActionIcon
                  variant="subtle"
                  color={isWordWrap ? 'blue' : 'gray'}
                  size="sm"
                  onClick={() => setIsWordWrap(!isWordWrap)}
                >
                  <IconEye size={16} />
                </ActionIcon>
              </Tooltip>
              
              <Tooltip label={showLineNumbers ? '隐藏行号' : '显示行号'}>
                <ActionIcon
                  variant="subtle"
                  color={showLineNumbers ? 'blue' : 'gray'}
                  size="sm"
                  onClick={() => setShowLineNumbers(!showLineNumbers)}
                >
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    {showLineNumbers ? '#' : '¶'}
                  </span>
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Group>

        {/* 统计信息 */}
        <Group gap="md">
          <Group gap="xs">
            <Text size="xs" c="#86909C">行数:</Text>
            <Text size="xs" fw={600} c="#165DFF">{getLineCount()}</Text>
          </Group>
          <Group gap="xs">
            <Text size="xs" c="#86909C">字符:</Text>
            <Text size="xs" fw={600} c="#165DFF">{content.length}</Text>
          </Group>
          {content && (
            <Badge size="xs" color="green" variant="light">
              <IconCheck size={8} />
            </Badge>
          )}
        </Group>

        {/* 内容显示区域 */}
        <div style={{ position: 'relative' }}>
          <ScrollArea
            ref={scrollAreaRef}
            scrollbarSize={8}
            style={{
              height: `${maxHeight}px`,
              border: '1px solid #E5E6EB',
              borderRadius: '8px',
              backgroundColor: '#F8F9FA',
            }}
          >
            {renderContent()}
          </ScrollArea>
          
          {/* 生成中的遮罩效果 */}
          {isGenerating && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40px',
                background: 'linear-gradient(transparent, rgba(255, 255, 255, 0.9))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#165DFF',
                fontWeight: 500,
              }}
            >
              正在生成内容...
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        {showControls && content && (
          <Group justify="space-between" align="center">
            <Text size="xs" c="#86909C">
              {isAutoScroll ? '自动滚动已开启' : '自动滚动已关闭'} • 
              {isWordWrap ? '自动换行已开启' : '自动换行已关闭'}
            </Text>
            
            <Group gap="xs">
              <Tooltip label="复制全部内容">
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="sm"
                  onClick={handleCopy}
                >
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>
              
              <Tooltip label="下载为文本文件">
                <ActionIcon
                  variant="light"
                  color="green"
                  size="sm"
                  onClick={handleDownload}
                >
                  <IconDownload size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        )}
      </Stack>
    </Card>
  )
}

export default StreamingOutput