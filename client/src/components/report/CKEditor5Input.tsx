import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Group, Text, Button, Badge, Stack, Card, Tooltip, Loader } from '@mantine/core'
import { IconTemplate, IconCopy, IconRefresh, IconCheck } from '@tabler/icons-react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import { notifications } from '@mantine/notifications'

interface CKEditor5InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  showTemplateButtons?: boolean
}

// 预定义的提示词模板
const PROMPT_TEMPLATES = [
  {
    name: '标准投资报告',
    template: `请基于以下项目数据生成一份专业的投资方案报告：

报告应包含以下部分：
1. 项目概述
2. 投资估算分析
3. 财务指标分析
4. 收入成本分析
5. 投资效益评估
6. 风险分析与建议

请使用专业的财务分析术语，确保数据准确性和分析深度。`
  },
  {
    name: '简洁版报告',
    template: `请生成一份简洁的投资方案报告，重点突出：
- 项目基本情况
- 投资规模与结构
- 财务可行性
- 主要风险点
- 投资建议

请确保内容精炼、重点突出。`
  },
  {
    name: '详细分析报告',
    template: `请生成详细的投资方案分析报告，包括：

## 项目基本情况
- 项目背景与目标
- 建设内容与规模
- 投资主体与周期

## 投资估算分析
- 总投资构成分析
- 各分项投资明细
- 投资合理性评估

## 财务效益分析
- 收入预测与来源
- 成本费用分析
- 盈利能力评估
- 清偿能力分析

## 风险分析
- 市场风险
- 技术风险
- 财务风险
- 政策风险

## 投资建议
- 投资决策建议
- 风险控制措施
- 后续管理建议

请确保分析深入、数据准确、建议可行。`
  }
]

/**
 * CKEditor 5 输入组件
 * 使用动态导入解决CKEditor5 v44.3.0 IIFE格式导出与Vite/ESM的兼容性问题
 */
const CKEditor5Input: React.FC<CKEditor5InputProps> = ({
  value,
  onChange,
  placeholder = '请输入报告生成的提示词...',
  minHeight = 300,
  showTemplateButtons = true
}) => {
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [editor, setEditor] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [editorLoaded, setEditorLoaded] = useState(false)
  const editorRef = useRef<any>(null)

  // 加载CKEditor5
  useEffect(() => {
    let mounted = true

    const loadEditor = async () => {
      try {
        console.log('[CKEditor5Input] 开始加载CKEditor5...')
        const module = await import('@ckeditor/ckeditor5-build-classic')
        
        if (!mounted) return
        
        // 获取编辑器类
        const EditorClass = module.default || module
        console.log('[CKEditor5Input] EditorClass:', typeof EditorClass, EditorClass?.create ? 'has create' : 'no create')
        
        editorRef.current = EditorClass
        setEditorLoaded(true)
      } catch (error) {
        console.error('[CKEditor5Input] 加载CKEditor5失败:', error)
      }
    }

    loadEditor()

    return () => {
      mounted = false
    }
  }, [])

  // 更新统计信息
  const updateStatistics = useCallback((text: string) => {
    const plainText = text.replace(/<[^>]*>/g, '')
    const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0
    const chars = plainText.length
    setWordCount(words)
    setCharCount(chars)
  }, [])

  // 监听内容变化
  useEffect(() => {
    updateStatistics(value)
  }, [value, updateStatistics])

  const handleReady = useCallback((editorInstance: any) => {
    console.log('[CKEditor5Input] 编辑器已就绪')
    setEditor(editorInstance)
    setIsReady(true)
    updateStatistics(value)
  }, [value, updateStatistics])

  const handleChange = useCallback((_event: any, editorInstance: any) => {
    const data = editorInstance.getData()
    onChange(data)
    updateStatistics(data)
  }, [onChange, updateStatistics])

  // 插入模板
  const insertTemplate = useCallback((template: string) => {
    if (editor) {
      const selection = editor.model.document.selection
      editor.model.change((writer: any) => {
        const insertPosition = selection.getFirstPosition()
        writer.insertText(template, insertPosition)
      })
    }
  }, [editor])

  // 复制到剪贴板
  const copyToClipboard = useCallback(() => {
    const plainText = value.replace(/<[^>]*>/g, '')
    navigator.clipboard.writeText(plainText).then(() => {
      notifications.show({
        title: '复制成功',
        message: '提示词已复制到剪贴板',
        color: 'green',
      })
    }).catch(() => {
      notifications.show({
        title: '复制失败',
        message: '无法复制到剪贴板',
        color: 'red',
      })
    })
  }, [value])

  // 清空内容
  const clearContent = useCallback(() => {
    onChange('')
    updateStatistics('')
    if (editor) {
      editor.setData('')
    }
  }, [editor, onChange, updateStatistics])

  // 格式化内容
  const formatContent = useCallback(() => {
    let formatted = value
      .replace(/<p><\/p>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/，{2,}/g, '，')
      .replace(/。{2,}/g, '。')
      .replace(/！{2,}/g, '！')
      .replace(/？{2,}/g, '？')
      .trim()
    
    onChange(formatted)
    updateStatistics(formatted)
    if (editor) {
      editor.setData(formatted)
    }
  }, [value, editor, onChange, updateStatistics])

  // 渲染编辑器
  const renderEditor = () => {
    if (!editorLoaded) {
      return (
        <div style={{ 
          minHeight: `${minHeight}px`, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid #E5E6EB',
          borderRadius: '8px',
          backgroundColor: '#F7F8FA'
        }}>
          <Group gap="sm">
            <Loader size="sm" />
            <Text size="sm" c="#86909C">正在加载CKEditor5编辑器...</Text>
          </Group>
        </div>
      )
    }

    return (
      <div style={{ minHeight: `${minHeight}px`, border: '1px solid #E5E6EB', borderRadius: '8px', overflow: 'hidden' }}>
        <CKEditor
          editor={editorRef.current}
          data={value}
          onChange={handleChange}
          onReady={handleReady}
          placeholder={placeholder}
          config={{
            language: 'zh-cn',
            toolbar: [
              'undo', 'redo',
              '|', 'bold', 'italic', 'underline',
              '|', 'bulletedList', 'numberedList',
              '|', 'heading',
              '|', 'link', 'blockQuote',
              '|', 'codeBlock'
            ],
            heading: {
              options: [
                { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
              ]
            },
            codeBlock: {
              languages: [
                { language: 'plaintext', label: 'Plain text' },
                { language: 'javascript', label: 'JavaScript' },
                { language: 'css', label: 'CSS' },
                { language: 'sql', label: 'SQL' }
              ]
            },
            placeholder: placeholder
          }}
          disabled={false}
        />
      </div>
    )
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
      <Stack gap="md">
        {/* 标题和统计信息 */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={500} c="#1D2129">提示词编辑器</Text>
            <Badge size="sm" color="blue" variant="light">
              CKEditor5
            </Badge>
            {isReady && (
              <Badge size="sm" color="green" variant="light">
                已就绪
              </Badge>
            )}
          </Group>
          
          <Group gap="md">
            <Group gap="xs">
              <Text size="xs" c="#86909C">字符:</Text>
              <Text size="xs" fw={600} c="#165DFF">{charCount}</Text>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="#86909C">单词:</Text>
              <Text size="xs" fw={600} c="#165DFF">{wordCount}</Text>
            </Group>
          </Group>
        </Group>

        {/* 模板按钮 */}
        {showTemplateButtons && (
          <Group gap="xs" mb="sm">
            {PROMPT_TEMPLATES.map((template, index) => (
              <Tooltip key={index} label={`插入${template.name}模板`}>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => insertTemplate(template.template)}
                  style={{ height: '28px' }}
                  disabled={!isReady}
                >
                  <IconTemplate size={14} />
                </Button>
              </Tooltip>
            ))}
          </Group>
        )}

        {/* CKEditor5 富文本编辑器 */}
        {renderEditor()}

        {/* 底部工具栏 */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="xs" c="#86909C">
              CKEditor5 富文本编辑器
            </Text>
          </Group>
          
          <Group gap="xs">
            <Tooltip label="格式化内容">
              <Button
                variant="outline"
                size="xs"
                leftSection={<IconRefresh size={12} />}
                onClick={formatContent}
                disabled={!isReady}
              >
                格式化
              </Button>
            </Tooltip>
            
            <Tooltip label="复制到剪贴板">
              <Button
                variant="outline"
                size="xs"
                leftSection={<IconCopy size={12} />}
                onClick={copyToClipboard}
              >
                复制
              </Button>
            </Tooltip>
            
            <Tooltip label="清空内容">
              <Button
                variant="outline"
                size="xs"
                color="red"
                onClick={clearContent}
                disabled={!isReady}
              >
                清空
              </Button>
            </Tooltip>
            
            {value.trim() && (
              <Tooltip label="内容完整">
                <Badge color="green" variant="light" size="xs">
                  <IconCheck size={10} />
                </Badge>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* 提示信息 */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#F0F9FF',
          borderRadius: '8px',
          border: '1px solid #ADC6FF',
          marginTop: '8px'
        }}>
          <Text size="sm" c="#165DFF">
            💡 提示：使用上方模板按钮快速插入常用提示词。支持格式化、标题、列表等富文本功能。
          </Text>
        </div>
      </Stack>
    </Card>
  )
}

export default CKEditor5Input
