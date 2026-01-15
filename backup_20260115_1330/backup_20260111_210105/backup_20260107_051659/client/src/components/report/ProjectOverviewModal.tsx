import { useState, useEffect, useMemo } from 'react'
import { Modal, Group, Button, Stack, Text, Box, Divider, Switch } from '@mantine/core'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// @ts-ignore
import Underline from '@tiptap/extension-underline'
// @ts-ignore
import Strike from '@tiptap/extension-strike'
import { 
  Sparkles, Save, Trash2, 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, 
  Heading1, Heading2, List as ListIcon, ListOrdered, Quote, 
  Undo, Redo 
} from 'lucide-react'
import { Tooltip } from '@mantine/core'
import { useReportStore } from '../../stores/reportStore'
import { notifications } from '@mantine/notifications'
import { reportApi } from '../../services/reportApi'
import { useProjectOverviewData, type ProjectOverviewData } from '../../hooks/useProjectOverviewData'

interface ProjectOverviewModalProps {
  opened: boolean
  onClose: () => void
}

// 工具栏按钮组件
interface ToolbarButtonProps {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
}

function ToolbarButton({ icon, label, isActive, disabled, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip 
      label={label} 
      position="bottom" 
      withArrow 
      styles={{ 
        tooltip: { 
          fontSize: '11px',
          padding: '4px 8px',
        } 
      }}
    >
      <Button
        variant={isActive ? 'light' : 'subtle'}
        size="xs"
        style={{ 
          minWidth: '28px', 
          height: '28px', 
          padding: '0 6px',
          borderRadius: '4px',
          background: isActive 
            ? 'var(--mantine-color-blue-0)' 
            : 'transparent',
          color: isActive 
            ? 'var(--mantine-color-blue-7)' 
            : 'var(--mantine-color-dark-6)',
          border: '1px solid transparent',
          transition: 'all 0.15s ease',
        }}
        onClick={onClick}
        disabled={disabled}
      >
        {icon}
      </Button>
    </Tooltip>
  )
}

export function ProjectOverviewModal({ opened, onClose }: ProjectOverviewModalProps) {
  const { projectData, projectId, projectOverview, saveProjectOverview } = useReportStore()
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lockConstructionScale, setLockConstructionScale] = useState(false)  // 锁定建设规模滑块

  // 使用 hook 处理项目数据
  const projectOverviewData = useProjectOverviewData(projectData)

  // 构建大模型 Prompt
  const buildPrompt = useMemo(() => {
    if (!projectOverviewData) return ''
    
    const project = projectData?.project || {}
    const revenueItems = projectData?.revenueItems || []
    
    // 产品/服务：优先使用localStorage保存的数据，否则从revenueItems获取
    let productsServices: string[] = []
    if (projectOverviewData?.productsServices && projectOverviewData.productsServices.length > 0) {
      productsServices = projectOverviewData.productsServices
      console.log('[buildPrompt] 使用projectOverviewData的productsServices:', productsServices)
    } else {
      productsServices = revenueItems.map((item: any) => item.name || '').filter(Boolean)
      console.log('[buildPrompt] 使用revenueItems的productsServices:', productsServices)
    }

    // 建设规模：根据锁定状态决定
    let constructionScaleText = ''
    const projectId = projectData?.project?.id || projectData?.projectId
    const lockedKey = projectId ? `project_construction_scale_locked_${projectId}` : ''
    
    if (lockConstructionScale && lockedKey) {
      // 锁定时，从localStorage读取保存的建设规模
      const lockedScale = localStorage.getItem(lockedKey)
      if (lockedScale) {
        constructionScaleText = lockedScale
        console.log('[buildPrompt] 锁定建设规模，从localStorage读取:', lockedScale.substring(0, 50) + '...')
      } else {
        // 如果localStorage没有值，使用当前值
        constructionScaleText = projectOverviewData?.constructionScale || ''
        console.log('[buildPrompt] localStorage无值，使用当前值')
      }
    } else {
      // 未锁定时，使用projectOverviewData的值
      constructionScaleText = projectOverviewData?.constructionScale || ''
      console.log('[buildPrompt] 未锁定建设规模，使用projectOverviewData:', constructionScaleText.substring(0, 50) + '...')
    }
    
    // 建设周期
    const constructionYears = project.constructionYears || 0
    const constructionPeriodText = constructionYears > 0 ? `${constructionYears}年` : '暂无数据'

    // [DEBUG] 获取当前时间，格式：2026年1月
    const currentDate = new Date()
    const currentDateText = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
    console.log('[buildPrompt] 当前时间:', currentDateText)

    console.log('[ProjectOverviewModal] 使用projectOverviewData构建Prompt:', {
      projectName: projectOverviewData.projectName,
      investmentScale: projectOverviewData.investmentScale,
      fundingSource: projectOverviewData.fundingSource,
      constructionPeriodText,
      currentDate: currentDateText
    })
    
    return `
先输出${productsServices.join('、')}变量。根据以下项目信息，生成项目概况（当前时间：${currentDateText}）：

项目名称：${projectOverviewData.projectName}
建设单位：${projectOverviewData.constructionUnit}
建设地点：${projectOverviewData.constructionSite}
建设周期：${constructionPeriodText}

建设规模信息：
${constructionScaleText}

投资规模信息：
${projectOverviewData.investmentScale}

资金来源信息：
${projectOverviewData.fundingSource}

产品/服务信息：
${productsServices.join('、')}

请按照以下JSON格式输出项目概况（不要添加markdown代码块标记，不要用\`\`\`json包裹）：
{
  "projectName": "项目名称",
  "constructionUnit": "建设单位",
  "constructionSite": "建设地点",
  "constructionScale": "你是一位专业的企业投资项目可行性研究报告撰写专家。你拥有十年以上大型项目咨询经验，根据已知的"建设规模信息"进行详细的建设规模描述",
  "investmentScale": "详细的投资规模描述，包括各分项金额",
  "fundingSource": "资金来源描述，包括贷款和自筹比例",
  "constructionPeriod": "建设周期描述。例：2年，即：2025年9月～2027年8月。",
  "productsServices": "你是一位专业的企业投资项目可行性研究报告撰写专家。你拥有十年以上大型项目咨询经验，根据产品/服务信息，列出项目所涉的主要产品或服务名称"
}
    `.trim()
  }, [projectOverviewData, projectData, lockConstructionScale])

  // JSON转HTML
  const jsonToHtml = useMemo(() => {
    return (data: ProjectOverviewData) => `
      <h3>${data.projectName}</h3>
      <p><strong>建设单位：</strong>${data.constructionUnit}</p>
      <p><strong>建设地点：</strong>${data.constructionSite}</p>
      <p><strong>建设规模：</strong>${data.constructionScale}</p>
      <p><strong>投资规模：</strong>${data.investmentScale}</p>
      <p><strong>资金来源：</strong>${data.fundingSource}</p>
      <p><strong>建设周期：</strong>${data.constructionPeriod}</p>
      <p><strong>所涉产品或服务：</strong>${data.productsServices.join('、')}</p>
    `.trim()
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Strike,
    ],
    content: '',
    editable: true, // 修改为可编辑
    editorProps: {
      attributes: {
        class: 'focus:outline-none h-full p-4 overflow-y-auto project-overview-editor',
        style: 'width: 100%; height: 100%; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word; max-width: none;',
      },
    },
    onUpdate: ({ editor }) => {
      // 在内容更新后，确保编辑器样式正确应用
      const editorElement = editor.view.dom
      if (editorElement) {
        editorElement.style.maxWidth = 'none'
        editorElement.style.width = '100%'
        const paragraphs = editorElement.querySelectorAll('p, h3, div')
        paragraphs.forEach(el => {
          ;(el as HTMLElement).style.maxWidth = 'none'
          ;(el as HTMLElement).style.wordWrap = 'break-word'
          ;(el as HTMLElement).style.overflowWrap = 'break-word'
          ;(el as HTMLElement).style.lineHeight = '1.5'
          ;(el as HTMLElement).style.setProperty('line-height', '1.5', 'important')
        })
      }
    },
  })

  // 打开时加载已保存的项目概况
  useEffect(() => {
    if (opened && editor && projectOverview) {
      editor.commands.setContent(projectOverview)
      // 确保内容加载后应用样式
      setTimeout(() => {
        const editorElement = editor.view.dom
        if (editorElement) {
          editorElement.style.maxWidth = 'none'
          editorElement.style.width = '100%'
          const paragraphs = editorElement.querySelectorAll('p, h3, div')
          paragraphs.forEach(el => {
            ;(el as HTMLElement).style.maxWidth = 'none'
            ;(el as HTMLElement).style.wordWrap = 'break-word'
            ;(el as HTMLElement).style.overflowWrap = 'break-word'
            ;(el as HTMLElement).style.lineHeight = '1.5'
            ;(el as HTMLElement).style.setProperty('line-height', '1.5', 'important')
          })
        }
      }, 100)
    }
  }, [opened, projectOverview, editor])

  // 生成项目概况
  const handleGenerate = async () => {
    if (!projectId) {
      notifications.show({
        title: '错误',
        message: '缺少项目ID',
        color: 'red',
      })
      return
    }

    if (!projectOverviewData) {
      notifications.show({
        title: '错误',
        message: '无法获取项目数据',
        color: 'red',
      })
      return
    }

    setGenerating(true)
    editor?.commands.setContent('<p style="color: var(--mantine-color-gray-5);">正在生成项目概况，请稍候...</p>')

    try {
      const prompt = buildPrompt

      const result = await reportApi.generateProjectOverviewNonStream(projectId, prompt)
      
      if (result.success && result.content) {
        try {
          const cleanContent = result.content
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim()
          
          const data = JSON.parse(cleanContent) as ProjectOverviewData
          const html = jsonToHtml(data)
          editor?.commands.setContent(html)
        } catch (e) {
          editor?.commands.setContent(`<p>${result.content}</p>`)
        }
        
        notifications.show({
          title: '成功',
          message: '项目概况生成完成',
          color: 'green',
        })
      } else {
        throw new Error(result.error || '生成失败')
      }
    } catch (error: any) {
      editor?.commands.setContent('')
      notifications.show({
        title: '错误',
        message: error.message || '生成失败',
        color: 'red',
      })
    } finally {
      setGenerating(false)
    }
  }

  // 保存项目概况
  const handleSave = async () => {
    const content = editor?.getHTML() || ''
    if (!content) {
      notifications.show({
        title: '提示',
        message: '请先生成项目概况',
        color: 'orange',
      })
      return
    }

    setSaving(true)
    try {
      await saveProjectOverview(content)
      notifications.show({
        title: '成功',
        message: '项目概况已保存',
        color: 'green',
      })
      onClose()
    } catch (error: any) {
      notifications.show({
        title: '错误',
        message: error.message || '保存失败',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  // 清空编辑器内容
  const handleClear = () => {
    editor?.commands.setContent('')
  }

  if (!editor) {
    return null
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Sparkles size={16} color="var(--mantine-color-blue-6)" />
          <Text fw={500}>AI生成项目概况</Text>
        </Group>
      }
      size="900px"
      styles={{
        body: {
          maxWidth: '900px',
          width: '900px',
          overflow: 'hidden',
        },
        content: {
          maxWidth: '900px',
          width: '900px',
        },
      }}
      centered
      closeOnClickOutside={!generating}
      closeOnEscape={!generating}
      withCloseButton={!generating}
    >
      <Stack gap="sm">
        {/* 工具栏和编辑器整体 */}
        <Box
          style={{
            border: '1px solid var(--mantine-color-gray-3)',
            borderRadius: '8px',
            background: 'var(--mantine-color-gray-0)',
            overflow: 'hidden',
          }}
        >
          {/* 工具栏 */}
          <Box 
            style={{ 
              borderBottom: '1px solid var(--mantine-color-gray-3)',
              background: 'var(--mantine-color-gray-0)',
              padding: '8px 10px 6px',
            }}
          >
            <Group justify="space-between">
              <Group gap={2} style={{ flexWrap: 'nowrap' }}>
                {/* 文字格式组 */}
                <Group gap={2}>
                  <ToolbarButton
                    icon={<Bold size={14} style={{ fontWeight: 'bold', color: 'var(--mantine-color-dark-7)' }} />}
                    label="粗体"
                    isActive={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  />
                  <ToolbarButton
                    icon={<Italic size={14} style={{ fontStyle: 'italic', color: 'var(--mantine-color-dark-7)' }} />}
                    label="斜体"
                    isActive={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  />
                  <ToolbarButton
                    icon={<UnderlineIcon size={14} style={{ textDecoration: 'underline', color: 'var(--mantine-color-dark-7)' }} />}
                    label="下划线"
                    isActive={editor.isActive('underline')}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                  />
                  <ToolbarButton
                    icon={<Strikethrough size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                    label="删除线"
                    isActive={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                  />
                  <ToolbarButton
                    icon={<Code size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                    label="行内代码"
                    isActive={editor.isActive('code')}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                  />
                </Group>

                <Divider orientation="vertical" style={{ height: '20px', alignSelf: 'center' }} />

                {/* 标题组 */}
                <Group gap={2}>
                  <ToolbarButton
                    icon={<Heading1 size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                    label="标题1"
                    isActive={editor.isActive('heading', { level: 1 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  />
                  <ToolbarButton
                    icon={<Heading2 size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                    label="标题2"
                    isActive={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  />
                </Group>

                <Divider orientation="vertical" style={{ height: '20px', alignSelf: 'center' }} />

                {/* 列表组 */}
                <Group gap={2}>
                  <ToolbarButton
                    icon={<ListIcon size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                    label="无序列表"
                    isActive={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                  />
                  <ToolbarButton
                    icon={<ListOrdered size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                    label="有序列表"
                    isActive={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  />
                  <ToolbarButton
                    icon={<Quote size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                    label="引用块"
                    isActive={editor.isActive('blockquote')}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  />
                </Group>

                <Box style={{ flex: 1 }} />

                {/* 撤销/重做组 */}
                <Group gap={2}>
                  <ToolbarButton
                    icon={<Undo size={14} style={{ color: 'var(--mantine-color-dark-5)' }} />}
                    label="撤销"
                    disabled={!editor.can().undo()}
                    onClick={() => editor.chain().focus().undo().run()}
                  />
                  <ToolbarButton
                    icon={<Redo size={14} style={{ color: 'var(--mantine-color-dark-5)' }} />}
                    label="重做"
                    disabled={!editor.can().redo()}
                    onClick={() => editor.chain().focus().redo().run()}
                  />
                </Group>
              </Group>

              {/* 操作按钮 */}
              <Group gap="xs">
                {/* 锁定建设规模滑块 */}
                <Group gap={4}>
                  <Switch
                    size="xs"
                    checked={lockConstructionScale}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked
                      setLockConstructionScale(checked)
                      
                      if (checked) {
                        // 锁定时，保存当前建设规模到localStorage
                        const projectId = projectData?.project?.id || projectData?.projectId
                        if (projectId && projectOverviewData?.constructionScale) {
                          const lockedKey = `project_construction_scale_locked_${projectId}`
                          localStorage.setItem(lockedKey, projectOverviewData.constructionScale)
                          console.log('[锁定建设规模] 已保存到localStorage:', projectOverviewData.constructionScale.substring(0, 50) + '...')
                        }
                      } else {
                        // 解锁时，删除localStorage中的锁定值
                        const projectId = projectData?.project?.id || projectData?.projectId
                        if (projectId) {
                          const lockedKey = `project_construction_scale_locked_${projectId}`
                          localStorage.removeItem(lockedKey)
                          console.log('[锁定建设规模] 已从localStorage删除')
                        }
                      }
                      console.log('[锁定建设规模] 状态:', checked ? '锁定' : '未锁定')
                    }}
                    label="锁定建设规模"
                    styles={{ label: { fontSize: '11px', color: lockConstructionScale ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-dark-5)' } }}
                  />
                </Group>
                <Button
                  variant="light"
                  color="blue"
                  size="xs"
                  leftSection={<Sparkles size={12} />}
                  onClick={handleGenerate}
                  loading={generating}
                  disabled={!projectOverviewData || generating}
                >
                  生成
                </Button>
                <Button
                  variant="light"
                  color="gray"
                  size="xs"
                  leftSection={<Trash2 size={12} />}
                  onClick={handleClear}
                  disabled={generating}
                >
                  清空
                </Button>
                <Button
                  variant="filled"
                  color="green"
                  size="xs"
                  leftSection={<Save size={12} />}
                  onClick={handleSave}
                  loading={saving}
                  disabled={generating}
                >
                  保存
                </Button>
              </Group>
            </Group>
          </Box>

          {/* 富文本编辑器 */}
          <Box
            style={{
              height: '600px',
              width: '100%',
              padding: '0',
              background: 'var(--mantine-color-body)',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <EditorContent
              editor={editor}
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            />
            <style>{`
              .project-overview-editor {
                line-height: 1.5 !important;
              }
              .project-overview-editor p,
              .project-overview-editor h3,
              .project-overview-editor div {
                line-height: 1.5 !important;
                margin-bottom: 0.75em;
              }
            `}</style>
          </Box>
        </Box>
      </Stack>
    </Modal>
  )
}

export default ProjectOverviewModal
