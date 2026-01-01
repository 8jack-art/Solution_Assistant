import { Textarea, Text } from '@mantine/core'
import { useReportStore } from '../../stores/reportStore'

export function PromptEditor() {
  const {
    promptTemplate,
    setPromptTemplate,
  } = useReportStore()

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptTemplate(event.currentTarget.value)
  }

  return (
    <div className="prompt-editor">
      <Text size="sm" fw={500} mb="xs">提示词编辑</Text>
      <Textarea
        value={promptTemplate}
        onChange={handleChange}
        placeholder="请输入提示词，指导AI生成报告内容...
例如：请分析项目{{project_name}}的财务状况。"
        minRows={10}
        maxRows={20}
        autosize
        styles={{
          input: {
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.6',
          }
        }}
      />
      <Text size="xs" c="dimmed" mt="xs">
        提示：点击右侧"可用变量"可插入变量，变量会在生成时自动替换为实际数据。
      </Text>
    </div>
  )
}
