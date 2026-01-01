import React, { useState, useRef, useEffect } from 'react'
import {
  TextInput,
  Textarea,
  Group,
  Button,
  ActionIcon,
  Tooltip,
  Stack,
  Text,
  Card,
  Badge,
} from '@mantine/core'
import {
  IconEdit,
  IconEye,
  IconEyeOff,
  IconTemplate,
  IconDeviceFloppy,
  IconRefresh,
  IconCopy,
  IconCheck,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  maxHeight?: number
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
 * 提示词编辑器组件
 */
const PromptEditor: React.FC<PromptEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入报告生成的提示词...',
  minHeight = 200,
  maxHeight = 600,
  showTemplateButtons = true
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 计算字数和字符数
  useEffect(() => {
    const text = value || ''
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const chars = text.length
    
    setWordCount(words)
    setCharCount(chars)
  }, [value])

  // 插入模板
  const insertTemplate = (template: string) => {
    const newValue = value ? value + '\n\n' + template : template
    onChange(newValue)
    
    // 聚焦到文本框
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(newValue.length, newValue.length)
    }
  }

  // 复制到剪贴板
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

  // 清空内容
  const clearContent = () => {
    onChange('')
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // 格式化内容
  const formatContent = () => {
    // 简单的格式化：去除多余空行，统一标点符号
    const formatted = value
      .replace(/\n{3,}/g, '\n\n') // 最多保留2个连续换行
      .replace(/，{2,}/g, '，') // 最多保留1个连续逗号
      .replace(/。{2,}/g, '。') // 最多保留1个连续句号
      .replace(/！{2,}/g, '！') // 最多保留1个连续感叹号
      .replace(/？{2,}/g, '？') // 最多保留1个连续问号
      .trim()
    
    onChange(formatted)
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
                支持模板
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

        {/* 编辑器主体 */}
        <div style={{ position: 'relative' }}>
          {isPreviewMode ? (
            // 预览模式
            <div
              style={{
                minHeight: `${minHeight}px`,
                maxHeight: `${maxHeight}px`,
                padding: '16px',
                border: '1px solid #E5E6EB',
                borderRadius: '8px',
                backgroundColor: '#F8F9FA',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowY: 'auto',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '14px',
                lineHeight: '1.6'
              }}
            >
              {value || <Text c="#86909C">暂无内容</Text>}
            </div>
          ) : (
            // 编辑模式
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              minRows={Math.ceil(minHeight / 24)}
              maxRows={Math.ceil(maxHeight / 24)}
              styles={{
                input: {
                  minHeight: `${minHeight}px`,
                  maxHeight: `${maxHeight}px`,
                  fontFamily: 'Monaco, Consolas, monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  resize: 'vertical'
                }
              }}
              autosize={false}
            />
          )}

          {/* 浮动工具栏 */}
          <Group
            gap="xs"
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '4px',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Tooltip label={isPreviewMode ? '编辑模式' : '预览模式'}>
              <ActionIcon
                variant="subtle"
                color="blue"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                {isPreviewMode ? <IconEdit size={14} /> : <IconEye size={14} />}
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="格式化内容">
              <ActionIcon
                variant="subtle"
                color="green"
                size="sm"
                onClick={formatContent}
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="复制到剪贴板">
              <ActionIcon
                variant="subtle"
                color="orange"
                size="sm"
                onClick={copyToClipboard}
              >
                <IconCopy size={14} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="清空内容">
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={clearContent}
              >
                <IconEyeOff size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </div>

        {/* 底部工具栏 */}
        <Group justify="space-between" align="center">
          <Text size="xs" c="#86909C">
            {isPreviewMode ? '预览模式' : '编辑模式'} • 支持Markdown语法
          </Text>
          
          <Group gap="xs">
            {!isPreviewMode && (
              <Tooltip label="保存为模板">
                <Button
                  variant="outline"
                  size="xs"
                  leftSection={<IconDeviceFloppy size={12} />}
                  onClick={() => {
                    notifications.show({
                      title: '提示',
                      message: '请在主界面点击"保存为模板"按钮',
                      color: 'blue',
                    })
                  }}
                >
                  保存模板
                </Button>
              </Tooltip>
            )}
            
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
              💡 提示：您可以输入自定义提示词，或使用上方的模板按钮快速插入常用模板
            </Text>
          </div>
        )}
      </Stack>
    </Card>
  )
}

export default PromptEditor