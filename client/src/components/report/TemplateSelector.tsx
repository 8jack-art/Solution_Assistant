import { useState, useEffect } from 'react'
import { Text, Stack, Group, Badge, Paper, Button, Modal, TextInput, ActionIcon, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useReportStore } from '../../stores/reportStore'
import { 
  Plus, Edit, Trash2, Scroll, Check 
} from 'lucide-react'

export function TemplateSelector() {
  const { 
    templates, 
    selectedTemplateId, 
    selectTemplate,
    loadTemplates,
    saveTemplate,
    renameTemplate,
    deleteTemplate,
  } = useReportStore()

  const [opened, { open, close }] = useDisclosure(false)
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create')
  const [templateName, setTemplateName] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleCreate = () => {
    setEditMode('create')
    setTemplateName('')
    open()
  }

  const handleEdit = (template: any) => {
    setEditMode('edit')
    setTemplateName(template.name)
    setEditingTemplateId(template.id)
    open()
  }

  const handleDelete = async (templateId: string, isSystem: boolean) => {
    if (isSystem) {
      alert('系统模板不可删除')
      return
    }
    if (confirm('确定要删除此模板吗？')) {
      await deleteTemplate(templateId)
    }
  }

  const handleSubmit = async () => {
    if (!templateName.trim()) {
      alert('请输入模板名称')
      return
    }
    try {
      if (editMode === 'create') {
        await saveTemplate({
          name: templateName,
          description: '',
          promptTemplate: ''
        })
      } else {
        // 重命名使用模板ID查找
        if (editingTemplateId) {
          await renameTemplate(editingTemplateId, templateName)
        }
      }
      close()
      setEditingTemplateId(null)
    } catch (error) {
      // 错误已在 store 中处理
    }
  }

  return (
    <div className="template-selector">
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500} c="dark.7">报告模板</Text>
        <Tooltip label="新建模板">
          <ActionIcon 
            variant="subtle" 
            color="blue" 
            size="sm"
            onClick={handleCreate}
          >
            <Plus size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      
      <Stack gap={6}>
        {(templates || []).map(template => (
          <Paper
            key={template.id}
            p="xs"
            withBorder
            style={{ 
              cursor: 'pointer',
              borderColor: selectedTemplateId === template.id ? 'var(--mantine-color-blue-5)' : undefined,
              background: selectedTemplateId === template.id ? 'var(--mantine-color-blue-0)' : undefined,
              transition: 'all 0.15s ease'
            }}
            onClick={() => selectTemplate(template.id)}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap={6} wrap="nowrap" style={{ flex: 1, overflow: 'hidden' }}>
                <Scroll 
                  size={14} 
                  style={{ 
                    color: template.is_system ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)',
                    flexShrink: 0
                  }} 
                />
                <Text 
                  size="sm" 
                  fw={500}
                  style={{ 
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {template.name}
                </Text>
                {template.is_system && (
                  <Badge size="xs" color="blue" variant="light">系统</Badge>
                )}
              </Group>
              
              {!template.is_system && (
                <Group gap={2} onClick={(e) => e.stopPropagation()}>
                  <Tooltip label="重命名">
                    <ActionIcon 
                      variant="subtle" 
                      color="blue" 
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(template)
                      }}
                    >
                      <Edit size={12} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="删除">
                    <ActionIcon 
                      variant="subtle" 
                      color="red" 
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(template.id, template.is_system)
                      }}
                    >
                      <Trash2 size={12} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}
            </Group>
          </Paper>
        ))}

        {(!templates || templates.length === 0) && (
          <Text size="xs" c="dimmed" ta="center" py="md">
            暂无模板，点击 + 创建新模板
          </Text>
        )}
      </Stack>

      {/* 新建/重命名模板弹窗 */}
      <Modal 
        opened={opened} 
        onClose={close} 
        title={
          <Group gap={8}>
            {editMode === 'create' ? <Plus size={18} /> : <Edit size={18} />}
            <Text fw={500}>{editMode === 'create' ? '新建模板' : '重命名模板'}</Text>
          </Group>
        }
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="模板名称"
            placeholder="请输入模板名称"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
            rightSection={
              <ActionIcon 
                variant="transparent" 
                color="gray"
                onClick={handleSubmit}
                disabled={!templateName.trim()}
              >
                <Check size={16} />
              </ActionIcon>
            }
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={close}>取消</Button>
            <Button onClick={handleSubmit} color="blue">
              {editMode === 'create' ? '创建' : '保存'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  )
}

export default TemplateSelector
