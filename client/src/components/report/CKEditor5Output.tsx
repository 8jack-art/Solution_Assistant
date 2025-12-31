import React, { useState, useEffect, useRef } from 'react'
import { Group, Text, ActionIcon, Tooltip, Stack, Card, Badge } from '@mantine/core'
import { IconPlayerPlay, IconPlayerStop, IconCopy, IconDownload, IconRefresh } from '@tabler/icons-react'
import { useTypewriter } from '@/hooks/useTypewriter'
import { notifications } from '@mantine/notifications'

interface CKEditor5OutputProps {
  content: string
  isGenerating: boolean
  onCopy?: () => void
  onExport?: () => void
  maxHeight?: number
  showControls?: boolean
  enableReplay?: boolean
  typewriterSpeed?: number
}

/**
 * CKEditor 5 输出组件 (简化版，避免构建问题)
 * 使用div显示内容，避免CKEditor5构建问题
 */
const CKEditor5Output: React.FC<CKEditor5OutputProps> = ({
  content,
  isGenerating,
  onCopy,
  onExport,
  maxHeight = 500,
  showControls = true,
  enableReplay = true,
  typewriterSpeed = 30
}) => {
  const [replayMode, setReplayMode] = useState(false)
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 使用打字机效果
  const { displayedText, isComplete, reset } = useTypewriter(
    replayMode ? content : content,
    {
      speed: typewriterSpeed,
      disabled: !replayMode && !isGenerating,
      mode: replayMode ? 'replay' : 'streaming',
      onComplete: () => {
        if (replayMode) {
          console.log('[CKEditor5Output] 重播完成')
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
  const displayContent = replayMode ? displayedText : content

  // 自动滚动到底部
  useEffect(() => {
    if (isAutoScroll && scrollAreaRef.current && displayContent) {
      const scrollElement = scrollAreaRef.current
      scrollElement.scrollTop = scrollElement.scrollHeight
    }
  }, [displayContent, isAutoScroll])

  // 重播功能
  const handleReplay = () => {
    setReplayMode(true)
    reset()
    notifications.show({
      title: '开始重播',
      message: '正在逐字显示内容',
      color: 'blue',
      autoClose: 2000,
    })
  }

  // 停止重播
  const handleStopReplay = () => {
    setReplayMode(false)
    notifications.show({
      title: '停止重播',
      message: '已显示完整内容',
      color: 'orange',
      autoClose: 2000,
    })
  }

  // 复制功能
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

  // 下载功能
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

  // 计算行数
  const lineCount = displayContent ? displayContent.split('\n').length : 0

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
      <Stack gap="md">
        {/* 标题和状态 */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={500} c="#1D2129">生成内容</Text>
            <Badge size="xs" color="blue" variant="light">
              富文本显示
            </Badge>
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
            {!isGenerating && content && (
              <Badge size="xs" color="green" variant="light">
                完成
              </Badge>
            )}
            {replayMode && (
              <Badge size="xs" color="blue" variant="light">
                重播中
              </Badge>
            )}
          </Group>

          {/* 控制按钮 */}
          {showControls && (
            <Group gap="xs">
              {enableReplay && !isGenerating && content && (
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
            </Group>
          )}
        </Group>

        {/* 统计信息 */}
        <Group gap="md" wrap="wrap">
          <Group gap="xs">
            <Text size="xs" c="#86909C">行数:</Text>
            <Text size="xs" fw={600} c="#165DFF">{lineCount}</Text>
          </Group>
          <Group gap="xs">
            <Text size="xs" c="#86909C">字符:</Text>
            <Text size="xs" fw={600} c="#165DFF">{displayContent.length}</Text>
          </Group>
          {replayMode && !isComplete && (
            <Group gap="xs">
              <Text size="xs" c="#86909C">进度:</Text>
              <Text size="xs" fw={600} c="#165DFF">
                {Math.round((displayedText.length / content.length) * 100)}%
              </Text>
            </Group>
          )}
        </Group>

        {/* 富文本内容显示区域 */}
        <div 
          ref={scrollAreaRef}
          style={{ 
            maxHeight: `${maxHeight}px`, 
            overflowY: 'auto',
            border: '1px solid #E5E6EB',
            borderRadius: '8px',
            backgroundColor: '#F8F9FA',
            padding: '16px',
            fontSize: '14px',
            lineHeight: '1.6',
            fontFamily: 'inherit',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {displayContent || (
            <Text size="sm" c="#86909C">
              生成的内容将显示在这里...
            </Text>
          )}
        </div>

        {/* 生成中的遮罩效果 */}
        {isGenerating && (
          <div
            style={{
              position: 'relative',
              marginTop: '-40px',
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

        {/* 底部工具栏 */}
        {showControls && content && (
          <Group justify="space-between" align="center">
            <Text size="xs" c="#86909C">
              {isAutoScroll ? '自动滚动已开启' : '自动滚动已关闭'} • 
              {replayMode ? '重播模式' : '显示模式'}
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

export default CKEditor5Output
