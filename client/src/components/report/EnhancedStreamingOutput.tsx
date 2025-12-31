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
  Button,
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
  IconPlayerPlay,
  IconPlayerStop,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useTypewriter } from '@/hooks/useTypewriter'

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
  enableReplay?: boolean // 是否启用生成后重播功能
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
  enableReplay = true,
}) => {
  const finalContent = content
  
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const [isWordWrap, setIsWordWrap] = useState(true)
  const [showLineNumbers, setShowLineNumbers] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [replayMode, setReplayMode] = useState(false)
  const [prevContentLength, setPrevContentLength] = useState(0)
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // 检测内容是否刚完成生成
  useEffect(() => {
    if (!isGenerating && finalContent.length > 0 && prevContentLength > 0) {
      // 生成刚完成，可以触发重播
      console.log('[EnhancedStreamingOutput] 生成完成，内容长度:', finalContent.length)
    }
    setPrevContentLength(finalContent.length)
  }, [isGenerating, finalContent.length, prevContentLength])
  
  // 使用打字机效果
  // 生成中时使用streaming模式，生成完成后可以使用replay模式
  const { displayedText, isComplete, reset } = useTypewriter(
    replayMode ? finalContent : finalContent,
    {
      speed: typewriterSpeed,
      disabled: !showTypewriter,
      mode: replayMode ? 'replay' : 'streaming',
      onComplete: () => {
        if (replayMode) {
          console.log('[EnhancedStreamingOutput] 重播完成')
          notifications.show({
            title: '重播完成',
            message: '内容已全部显示',
            color: 'green',
            autoClose: 2000,
          })
        }
      },
    }
  )
  
  // 根据模式决定显示的内容
  const displayContent = showTypewriter ? displayedText : finalContent
  
  // 自动滚动到底部
  useEffect(() => {
    if (isAutoScroll && scrollAreaRef.current && displayContent) {
      const scrollElement = scrollAreaRef.current
      const targetScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight
      if (scrollElement.scrollTop >= targetScrollTop - 50) {
        scrollElement.scrollTop = targetScrollTop
      }
    }
  }, [displayContent, isAutoScroll])

  // 计时和速度统计
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

  // 重播功能
  const handleReplay = useCallback(() => {
    setReplayMode(true)
    reset()
    notifications.show({
      title: '开始重播',
      message: '正在逐字显示内容',
      color: 'blue',
      autoClose: 2000,
    })
  }, [reset])
  
  // 停止重播
  const handleStopReplay = useCallback(() => {
    setReplayMode(false)
    notifications.show({
      title: '停止重播',
      message: '已显示完整内容',
      color: 'orange',
      autoClose: 2000,
    })
  }, [])

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
    if (!displayContent) return 0
    return displayContent.split('\n').length
  }, [displayContent])

  const lines = useMemo(() => {
    if (!displayContent) return []
    return displayContent.split('\n')
  }, [displayContent])

  const renderContent = () => {
    if (!displayContent) {
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
            {replayMode && (
              <Badge size="xs" color="blue" variant="light">
                重播中
              </Badge>
            )}
          </Group>
          
          {showControls && (
            <Group gap="xs">
              {enableReplay && !isGenerating && finalContent && showTypewriter && (
                <>
                  {!replayMode ? (
                    <Tooltip label="逐字重播内容">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={handleReplay}
                      >
                        <IconPlayerPlay size={16} />
                      </ActionIcon>
                    </Tooltip>
                  ) : (
                    <Tooltip label="停止重播">
                      <ActionIcon
                        variant="subtle"
                        color="orange"
                        size="sm"
                        onClick={handleStopReplay}
                      >
                        <IconPlayerStop size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </>
              )}
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
            <Text size="xs" fw={600} c="#165DFF">{displayContent.length}</Text>
          </Group>
          {isGenerating && (
            <Group gap="xs">
              <IconClock size={12} />
              <Text size="xs" c="#86909C">用时:</Text>
              <Text size="xs" fw={600} c="#FF7D00">{formatTime(elapsedTime)}</Text>
            </Group>
          )}
          {speed > 0 && isGenerating && (
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
