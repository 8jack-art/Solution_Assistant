import React, { useState, useEffect, useRef } from 'react'
import { Group, Text, ActionIcon, Tooltip, Stack, Card, Badge } from '@mantine/core'
import { IconPlayerPlay, IconPlayerStop, IconCopy, IconDownload, IconRefresh, IconEye, IconEyeOff } from '@tabler/icons-react'
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
 * CKEditor 5 输出组件 (兼容版本)
 * 在CKEditor5不可用时，使用增强的div作为备选方案
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
  const [showLineNumbers, setShowLineNumbers] = useState(false)
  const [prevContentLength, setPrevContentLength] = useState(0)
  const [isCKEditorLoaded, setIsCKEditorLoaded] = useState(false)
  const [CKEditorComponent, setCKEditorComponent] = useState<any>(null)
  const [ClassicEditorClass, setClassicEditorClass] = useState<any>(null)
  const editorRef = useRef<any>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 尝试动态加载CKEditor5
  useEffect(() => {
    const loadCKEditor = async () => {
      try {
        console.log('尝试加载CKEditor5...')
        
        // 动态导入CKEditor5
        const [{ CKEditor }, ClassicEditor] = await Promise.all([
          import('@ckeditor/ckeditor5-react'),
          import('@ckeditor/ckeditor5-build-classic')
        ])
        
        console.log('CKEditor5加载成功')
        setCKEditorComponent(() => CKEditor)
        setClassicEditorClass(() => ClassicEditor.default)
        setIsCKEditorLoaded(true)
      } catch (error) {
        console.warn('CKEditor5加载失败，使用备选方案:', error)
        setIsCKEditorLoaded(false)
      }
    }
    
    loadCKEditor()
  }, [])

  // 检测内容是否刚完成生成
  useEffect(() => {
    if (!isGenerating && content.length > 0 && prevContentLength > 0) {
      console.log('[CKEditor5Output] 生成完成，内容长度:', content.length)
    }
    setPrevContentLength(content.length)
  }, [isGenerating, content.length, prevContentLength])

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

  const handleReady = (editor: any) => {
    editorRef.current = editor
    console.log('[CKEditor5Output] 编辑器已就绪')
  }

  const handleChange = (_event: any, editor: any) => {
    // 只读模式下不允许修改
    if (editor.isReadOnly) return
  }

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

  const handleStopReplay = () => {
    setReplayMode(false)
    notifications.show({
      title: '停止重播',
      message: '已显示完整内容',
      color: 'orange',
      autoClose: 2000,
    })
  }

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

  // 如果CKEditor5加载成功，使用CKEditor5
  if (isCKEditorLoaded && CKEditorComponent && ClassicEditorClass) {
    const CKEditor = CKEditorComponent
    const Editor = ClassicEditorClass
    
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

          {/* CKEditor5 只读模式 */}
          <div 
            ref={scrollAreaRef}
            style={{ 
              maxHeight: `${maxHeight}px`, 
              overflowY: 'auto',
              border: '1px solid #E5E6EB',
              borderRadius: '8px',
              backgroundColor: '#F8F9FA'
            }}
          >
            <CKEditor
              editor={Editor}
              config={{
                language: 'zh-cn',
                toolbar: [],
                readOnly: true,
                placeholder: '生成的内容将显示在这里...'
              }}
              data={displayContent}
              onReady={handleReady}
              onChange={handleChange}
              disabled={true}
            />
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

  // CKEditor5未加载时的备选方案：增强的div
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
      <Stack gap="md">
        {/* 标题和状态 */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={500} c="#1D2129">生成内容</Text>
            <Badge size="xs" color="orange" variant="light">
              基础版
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

        {/* 增强的div显示区域 */}
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
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {displayContent || '生成的内容将显示在这里...'}
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
              {replayMode ? '重播模式' : '显示模式'} • 文本模式
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
