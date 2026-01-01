import React, { useState, useEffect, useCallback } from 'react'
import { Group, Text, Button, Badge, Stack, Card, Tooltip, ActionIcon } from '@mantine/core'
import { IconTemplate, IconCopy, IconRefresh, IconCheck, IconEdit, IconDownload } from '@tabler/icons-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { notifications } from '@mantine/notifications'
// @ts-ignore - html-to-docx 没有官方类型声明
import htmlToDocx from 'html-to-docx'

interface TiptapInputProps {
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
 * Tiptap富文本编辑器组件
 * 基于ProseMirror，支持流式输出和Word导出
 */
const TiptapInput: React.FC<TiptapInputProps> = ({
  value,
  onChange,
  placeholder = '请输入报告生成的提示词...',
  minHeight = 300,
  showTemplateButtons = true
}) => {
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  
  // Tiptap编辑器配置
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Typography,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
      updateStatistics(html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none',
      },
    },
    onCreate: () => {
      console.log('[TiptapInput] Editor created successfully')
    },
    onFocus: () => {
      console.log('[TiptapInput] Editor focused')
    },
    onBlur: () => {
      console.log('[TiptapInput] Editor blurred')
    },
  })

  // 调试信息
  useEffect(() => {
    if (editor) {
      console.log('[TiptapInput] Editor initialized:', editor)
      console.log('[TiptapInput] Editor content:', editor.getHTML())
    } else {
      console.log('[TiptapInput] Editor failed to initialize')
    }
  }, [editor])

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

  // 插入模板
  const insertTemplate = useCallback((template: string) => {
    if (editor) {
      editor.chain().focus().insertContent(template).run()
      
      notifications.show({
        title: '模板已插入',
        message: `${template.substring(0, 50)}...`,
        color: 'green',
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
      editor.commands.clearContent()
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
      editor.commands.setContent(formatted)
    }
  }, [value, editor, onChange, updateStatistics])

  // Word导出功能暂时禁用，以解决html-to-docx依赖问题
  const exportToWord = useCallback(() => {
    notifications.show({
      title: '功能禁用',
      message: 'Word导出功能暂时禁用，请使用复制功能替代',
      color: 'yellow',
    })
  }, [])

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
      <Stack gap="md">
        {/* 标题和统计信息 */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={500} c="#1D2129">提示词编辑器</Text>
            <Badge size="sm" color="blue" variant="light">
              Tiptap
            </Badge>
            {isFocused && (
              <Badge size="sm" color="green" variant="light">
                编辑中
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
                >
                  <IconTemplate size={14} />
                </Button>
              </Tooltip>
            ))}
          </Group>
        )}

        {/* Tiptap富文本编辑器 */}
        <div style={{ 
          minHeight: `${minHeight}px`, 
          border: '1px solid #E5E6EB', 
          borderRadius: '8px', 
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          borderColor: isFocused ? '#165DFF' : '#E5E6EB',
          boxShadow: isFocused ? '0 0 0 3px rgba(22, 93, 255, 0.1)' : 'none',
          backgroundColor: '#FFFFFF',
          position: 'relative',
          display: 'block',
          width: '100%'
        }}>
          <EditorContent 
            editor={editor}
            style={{
              minHeight: `${minHeight}px`,
              padding: '16px',
              fontSize: '14px',
              lineHeight: '1.6',
              backgroundColor: '#FFFFFF',
              color: '#000000',
              width: '100%',
              height: '100%',
              display: 'block',
              zIndex: 1
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          
          {/* 编辑器图标 */}
          <ActionIcon
            variant="subtle"
            color={isFocused ? 'blue' : 'gray'}
            size="lg"
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              pointerEvents: 'none',
              opacity: isFocused ? 1 : 0.5,
              zIndex: 2
            }}
          >
            <IconEdit size={18} />
          </ActionIcon>
        </div>

        {/* 底部工具栏 */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="xs" c="#86909C">
              Tiptap富文本编辑器
            </Text>
          </Group>
          
          <Group gap="xs">
            <Tooltip label="格式化内容">
              <Button
                variant="outline"
                size="xs"
                leftSection={<IconRefresh size={12} />}
                onClick={formatContent}
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
              >
                清空
              </Button>
            </Tooltip>

            <Tooltip label="导出Word">
              <Button
                variant="outline"
                size="xs"
                color="green"
                leftSection={<IconDownload size={12} />}
                onClick={exportToWord}
              >
                导出Word
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
            💡 提示：使用上方模板按钮快速插入常用提示词。支持Markdown格式、模板插入、Word导出等功能。
          </Text>
        </div>
      </Stack>
    </Card>
  )
}

export default TiptapInput
