import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
  IconCheck,
  IconClock,
  IconGauge,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

interface EnhancedStreamingOutputProps {
  content: string
  isGenerating: boolean
  onCopy?: () => void
  onExport?: () => void
  maxHeight?: number
  showControls?: boolean
  showTypewriter?: boolean
  typewriterSpeed?: number
  showProgress?: boolean
  estimatedTotalChars?: number
}

const EnhancedStreamingOutputInner: React.FC<EnhancedStreamingOutputProps> = ({
  content,
  isGenerating,
  onCopy,
  onExport,
  maxHeight = 500,
  showControls = true,
  showTypewriter = false,
  typewriterSpeed = 30,
  showProgress = true,
  estimatedTotalChars = 20000,
}) => {
  const finalContent = content
  
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const [isWordWrap, setIsWordWrap] = useState(true)
  const [showLineNumbers, setShowLineNumbers] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [speed, setSpeed] = useState(0)
  
  // 调试：记录内容变化
  const prevContentRef = useRef<string>('')
  useEffect(() => {
    if (prevContentRef.current !== finalContent) {
      console.log('[EnhancedStreamingOutput] 内容变化:',
        prevContentRef.current.length, '->', finalContent.length,
        '差值:', finalContent.length - prevContentRef.current.length)
      prevContentRef.current = finalContent
    }
  }, [finalContent])
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isAutoScroll && scrollAreaRef.current && finalContent) {
      const scrollToBottom = () => {
        const scrollElement = scrollAreaRef.current
        if (scrollElement) {
          const targetScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight
          if (scrollElement.scrollTop >= targetScrollTop - 50) {
            scrollElement.scrollTop = targetScrollTop
          }
        }
      }
      requestAnimationFrame(scrollToBottom)
    }
  }, [finalContent, isAutoScroll])

  useEffect(() => {
    if (isGenerating && !startTime) {
      setStartTime(Date.now())
    } else if (!isGenerating && startTime) {
      setStartTime(null)
    }

    if (isGenerating) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - (startTime || Date.now()))
        if (startTime && content.length > 0) {
          const seconds = (Date.now() - startTime) / 1000
          const charsPerSecond = content.length / seconds
          setSpeed(charsPerSecond)
        }
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isGenerating, startTime, content.length])

  const handleCopy = () => {
    navigator.clipboard.writeText(finalContent).then(() => {
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

  const handleDownload = () => {
    const blob = new Blob([finalContent], { type: 'text/plain;charset=utf-8' })
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

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  const progressPercentage = showProgress && estimatedTotalChars > 0 
    ? Math.min((finalContent.length / estimatedTotalChars) * 100, 100)
    : 0

  const estimatedRemainingTime = speed > 0 && finalContent.length < estimatedTotalChars
    ? ((estimatedTotalChars - finalContent.length) / speed) * 1000
    : 0

  const lineCount = useMemo(() => {
    if (!finalContent) return 0
    return finalContent.split('\n').length
  }, [finalContent])

  const lines = useMemo(() => {
    if (!finalContent) return []
    return finalContent.split('\n')
  }, [finalContent])

  const renderContent = () => {
    if (!finalContent) {
      return (
        <Text c="#86909C" style={{ padding: '20px', textAlign: 'center' }}>
          {isGenerating ? '正在生成内容...' : '暂无生成内容...'}
        </Text>
      )
    }
    
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
            key={`line-${index}`}
            style={{
              display: 'flex',
              minHeight: '22px',
              alignItems: 'flex-start',
              marginBottom: '2px',
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
            <span style={{ flex: 1 }}>
              {line || <span style={{ color: '#86909C' }}>&nbsp;</span>}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
      <Stack gap="md">
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
            {!isGenerating && finalContent && (
              <Badge size="xs" color="green" variant="light">
                <IconCheck size={8} />
              </Badge>
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
                  {isWordWrap ? <IconEye size={16} /> : <IconEyeOff size={16} />}
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

        <Group gap="md" wrap="wrap">
          <Group gap="xs">
            <Text size="xs" c="#86909C">行数:</Text>
            <Text size="xs" fw={600} c="#165DFF">{lineCount}</Text>
          </Group>
          <Group gap="xs">
            <Text size="xs" c="#86909C">字符:</Text>
            <Text size="xs" fw={600} c="#165DFF">{finalContent.length}</Text>
          </Group>
          {isGenerating && (
            <Group gap="xs">
              <IconClock size={12} />
              <Text size="xs" c="#86909C">用时:</Text>
              <Text size="xs" fw={600} c="#FF7D00">{formatTime(elapsedTime)}</Text>
            </Group>
          )}
          {speed > 0 && (
            <Group gap="xs">
              <IconGauge size={12} />
              <Text size="xs" c="#86909C">速度:</Text>
              <Text size="xs" fw={600} c="#52C41A">{speed.toFixed(1)} 字符/秒</Text>
            </Group>
          )}
        </Group>

        {showProgress && (
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>生成进度</Text>
              <Group gap="xs">
                <Text size="sm" c="#86909C">{progressPercentage.toFixed(1)}%</Text>
                {estimatedRemainingTime > 0 && isGenerating && (
                  <Text size="sm" c="#86909C">剩余约 {formatTime(estimatedRemainingTime)}</Text>
                )}
              </Group>
            </Group>
            <Progress 
              value={progressPercentage} 
              color={isGenerating ? "blue" : "green"}
              size="md"
              animated={isGenerating}
            />
          </div>
        )}

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

        {showControls && finalContent && (
          <Group justify="space-between" align="center">
            <Text size="xs" c="#86909C">
              {isAutoScroll ? '自动滚动已开启' : '自动滚动已关闭'} • 
              {isWordWrap ? '自动换行已开启' : '自动换行已关闭'}
            </Text>
            <Group gap="xs">
              <Tooltip label="复制全部内容">
                <ActionIcon variant="light" color="blue" size="sm" onClick={handleCopy}>
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="下载为文本文件">
                <ActionIcon variant="light" color="green" size="sm" onClick={handleDownload}>
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

const EnhancedStreamingOutput = React.memo(EnhancedStreamingOutputInner)

export default EnhancedStreamingOutput
