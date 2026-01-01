import { useEffect } from 'react'
import { Select, Text, Stack, Group, Badge, Paper } from '@mantine/core'
import { useReportStore } from '../../stores/reportStore'

export function TemplateSelector() {
  const { 
    templates, 
    selectedTemplateId, 
    selectTemplate,
    loadTemplates 
  } = useReportStore()

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const templateOptions = (templates || []).map(template => ({
    value: template.id,
    label: template.is_system 
      ? `${template.name} (系统模板)` 
      : template.name
  }))

  return (
    <div className="template-selector">
      <Text size="sm" fw={500} mb="xs">报告模板</Text>
      
      <Select
        data={templateOptions}
        value={selectedTemplateId}
        onChange={(value) => {
          if (value) {
            selectTemplate(value)
          }
        }}
        placeholder="选择模板或自定义提示词"
        searchable
        clearable
        size="sm"
      />

      {selectedTemplateId && (
        <Stack gap={4} mt="xs">
          {(templates || [])
            .filter(t => t.id === selectedTemplateId)
            .map(template => (
              <Group key={template.id} gap={4}>
                {template.is_system && (
                  <Badge size="xs" color="blue">系统</Badge>
                )}
                {template.description && (
                  <Text size="xs" c="dimmed">
                    {template.description}
                  </Text>
                )}
              </Group>
            ))}
        </Stack>
      )}
    </div>
  )
}

export default TemplateSelector
