import React, { useState, useRef } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import { ClassicEditor } from '@/config/ckeditor'
import { createSimpleEditorConfig } from '@/config/ckeditor'
import { Group, Text, Button, Badge, Stack, Card, Tooltip } from '@mantine/core'
import { IconTemplate, IconDeviceFloppy, IconCopy, IconRefresh, IconCheck } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import '@/styles/ckeditor.css'

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
 * 替换原有的 PromptEditor，提供富文本编辑功能
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
  const editorRef = useRef<any>(null)

  const handleReady = (editor: any) => {
    editorRef.current = editor
    updateStatistics(editor)
  }

  const handleChange = (_event: any, editor: any) => {
    const data = editor.getData()
    onChange(data)
    updateStatistics(editor)
  }

  const updateStatistics = (editor: any) => {
    const data = editor.getData()
    // 移除HTML标签后统计字数
    const textData = data.replace(/<[^>]*>/g, '')
    const words = textData.trim() ? textData.trim().split(/\s+/).length : 0
    const chars = data.length
    setWordCount(words)
    setCharCount(chars)
  }

  const insertTemplate = (template: string) => {
    if (editorRef.current) {
      const editor = editorRef.current
      editor.model.change((writer: any) => {
        const viewPosition = editor.editing.view.document.selection.getFirstPosition()
        const modelPosition = editor.editing.mapper.toModelPosition(viewPosition)
        writer.insertText('\n\n' + template, modelPosition)
      })
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value).then(() => {
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
  }

  const clearContent = () => {
    onChange('')
    if (editorRef.current) {
      editorRef.current.setData('')
    }
  }

  const formatContent = () => {
    // 简单的格式化：去除多余空行，统一标点符号
    let formatted = value
      .replace(/\n{3,}/g, '\n\n') // 最多保留2个连续换行
      .replace(/，{2,}/g, '，') // 最多保留1个连续逗号
      .replace(/。{2,}/g, '。') // 最多保留1个连续句号
      .replace(/！{2,}/g, '！') // 最多保留1个连续感叹号
      .replace(/？{2,}/g, '？') // 最多保留1个连续问号
      .trim()
    
    onChange(formatted)
    if (editorRef.current) {
      editorRef.current.setData(formatted)
    }
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
      <Stack gap="md">
        {/* 标题和统计信息 */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={500} c="#1D2129">提示词编辑器</Text>
            {showTemplateButtons && (
              <Badge size="sm" color="blue" variant="light">
                富文本
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

        {/* CKEditor5 编辑器 */}
        <div style={{ minHeight: `${minHeight}px` }}>
          <CKEditor
            editor={ClassicEditor}
            config={createSimpleEditorConfig()}
            data={value}
            onReady={handleReady}
            onChange={handleChange}
          />
        </div>

        {/* 底部工具栏 */}
        <Group justify="space-between" align="center">
          <Text size="xs" c="#86909C">
            富文本编辑器 • 支持Markdown语法
          </Text>
          
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
                leftSection={<IconDeviceFloppy size={12} />}
                onClick={clearContent}
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
        {value.length === 0 && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#F0F9FF',
            borderRadius: '8px',
            border: '1px solid #ADC6FF',
            marginTop: '8px'
          }}>
            <Text size="sm" c="#165DFF">
              💡 提示：您可以输入自定义提示词，或使用上方的模板按钮快速插入常用模板。支持富文本格式和Markdown语法。
            </Text>
          </div>
        )}
      </Stack>
    </Card>
  )
}

export default CKEditor5Input
