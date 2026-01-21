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

/**
 * HTML转Markdown转换器
 * 将编辑器中的HTML内容转换为Markdown格式保存
 */
function htmlToMarkdown(html: string): string {
  if (!html) return ''
  
  let markdown = html
    // 替换标题
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    // 替换粗体和斜体
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')  // 下划线保留HTML标签
    .replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~')
    .replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
    // 替换列表
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '\n')
    // 替换引用
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n')
    // 替换段落
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // 移除剩余的HTML标签
    .replace(/<[^>]+>/g, '')
    // 清理多余的空行
    .replace(/\n{3,}/g, '\n\n')
    // 修复列表后的空行问题
    .replace(/(- .*)\n\n(?=#)/g, '$1\n')
    .replace(/(> .*)\n\n(?=#)/g, '$1\n')
    
  return markdown.trim()
}

/**
 * Markdown转HTML转换器
 * 将保存的Markdown内容转换为HTML供编辑器显示
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  
  let html = markdown
    // 处理代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // 处理行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 处理粗体
    .replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>')
    // 处理删除线
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    // 处理下划线（保留）
    // 处理斜体
    .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
    // 处理标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 处理引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // 处理无序列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 处理段落（最后的换行处理）
    .replace(/\n\n/g, '</p><p>')
    
  // 包装在段落标签中
  let result = '<p>' + html + '</p>'
  result = result.replace(/<p><\/p>/g, '<p></p>')
  result = result.replace(/<p>(<h[1-6]>)/g, '$1')
  result = result.replace(/(<\/h[1-6]>)<\/p>/g, '$1')
  result = result.replace(/<p>(<blockquote>)/g, '$1')
  result = result.replace(/(<\/blockquote>)<\/p>/g, '$1')
  result = result.replace(/<p>(<li>)/g, '<ul>$1')
  result = result.replace(/<\/li><\/p>/g, '$1</ul>')
  return result
}

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
  const { projectData, projectId, projectOverview, saveProjectOverview, getCachedTableDataJSON } = useReportStore()
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lockConstructionScale, setLockConstructionScale] = useState(false)  // 锁定建设规模滑块

  // 使用 hook 处理项目数据
  const projectOverviewData = useProjectOverviewData(projectData)

  // 从 {{DATA:revenue_tax}} 提取产品/服务名称列表（单一数据来源）
  const productsServicesFromRevenueTax = useMemo(() => {
    const tableDataJSON = getCachedTableDataJSON()
    const revenueTaxJson = tableDataJSON['DATA:revenue_tax']
    
    if (!revenueTaxJson || revenueTaxJson === 'null') {
      console.log('[productsServices] DATA:revenue_tax 无数据，尝试从savedInfo获取')
      return null  // 返回null表示需要回退
    }
    
    try {
      const data = JSON.parse(revenueTaxJson)
      // 从含税收入表提取产品名称
      const products = data?.products || data?.产品 || []
      if (Array.isArray(products) && products.length > 0) {
        const names = products.map((p: any) => p.name || p.产品名称 || p.产品 || '').filter(Boolean)
        console.log('[productsServices] 从DATA:revenue_tax提取:', names)
        return names
      }
      // 如果没有products字段，尝试从rows提取
      const rows = data?.rows || data?.数据 || []
      if (Array.isArray(rows) && rows.length > 0) {
        const names = rows.map((r: any) => r.name || r.产品 || r.产品名称 || r.项目 || '').filter(Boolean)
        console.log('[productsServices] 从DATA:revenue_tax.rows提取:', names)
        return names
      }
      console.log('[productsServices] DATA:revenue_tax 格式不符合预期:', data)
      return null
    } catch (e) {
      console.error('[productsServices] 解析DATA:revenue_tax失败:', e)
      return null
    }
  }, [getCachedTableDataJSON])

  // 最终使用的项目产品/服务列表（优先从DATA:revenue_tax，回退到useProjectOverviewData）
  const productsServices = useMemo(() => {
    // 优先从 DATA:revenue_tax 获取
    if (productsServicesFromRevenueTax && productsServicesFromRevenueTax.length > 0) {
      return productsServicesFromRevenueTax
    }
    // 回退到 useProjectOverviewData 中的 savedInfo.productsServices
    if (projectOverviewData?.productsServices && projectOverviewData.productsServices.length > 0) {
      console.log('[productsServices] 从savedInfo.productsServices回退获取:', projectOverviewData.productsServices)
      return projectOverviewData.productsServices
    }
    // 最终兜底
    console.log('[productsServices] 无产品数据，使用兜底值')
    return ['暂无产品或服务数据']
  }, [productsServicesFromRevenueTax, projectOverviewData])

  // 构建大模型 Prompt
  const buildPrompt = useMemo(() => {
    if (!projectOverviewData) return ''
    
    const project = projectData?.project || {}
    
    // 建设规模：根据锁定状态决定
    let constructionScaleText = ''
    const projectId = projectData?.project?.id || projectData?.projectId
    const lockedKey = projectId ? `project_construction_scale_locked_${projectId}` : ''
    
    if (lockConstructionScale && lockedKey) {
      const lockedScale = localStorage.getItem(lockedKey)
      if (lockedScale) {
        constructionScaleText = lockedScale
      } else {
        constructionScaleText = projectOverviewData?.constructionScale || ''
      }
    } else {
      constructionScaleText = projectOverviewData?.constructionScale || ''
    }
    
    // 建设周期：根据当前时间和建设期推算起止时间
    const constructionYears = project.constructionYears || 0
    const constructionPeriodText = constructionYears > 0 
      ? (() => {
          const now = new Date()
          const startYear = now.getFullYear()
          const startMonth = now.getMonth() + 1  // 月份从0开始
          const endYear = startYear + constructionYears
          const endMonth = startMonth
          return `${constructionYears}年，即：${startYear}年${startMonth}月～${endYear}年${endMonth}月`
        })()
      : '暂无数据'

    // [DEBUG] 获取当前时间，格式：2026年1月
    const currentDate = new Date()
    const currentDateText = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
    
    return `
根据以下项目信息，生成项目概况（当前时间：${currentDateText}）：

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

产品/服务信息（来自{{DATA:revenue_tax}}）：
${productsServices.join('、')}

请按照以下JSON格式输出项目概况（不要添加markdown代码块标记，不要用\`\`\`json包裹）：
{
  "projectName": "项目名称",
  "constructionUnit": "建设单位",
  "constructionSite": "建设地点",
  "constructionScale": "详细的建设规模描述",
  "investmentScale": "详细的投资规模描述，包括各分项金额",
  "fundingSource": "资金来源描述，包括贷款和自筹比例",
  "constructionPeriod": "建设周期描述。例：2年，即：2025年9月～2027年8月。",
  "productsServices": "列出项目所涉的主要产品或服务名称"
}
    `.trim()
  }, [projectOverviewData, projectData, lockConstructionScale, productsServices])

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

  // 打开时加载已保存的项目概况（将Markdown转换为HTML显示）
  useEffect(() => {
    if (opened && editor && projectOverview) {
      // 将保存的Markdown内容转换为HTML
      const htmlContent = markdownToHtml(projectOverview)
      editor.commands.setContent(htmlContent)
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

  // 保存项目概况（将HTML转换为Markdown格式保存）
  const handleSave = async () => {
    const htmlContent = editor?.getHTML() || ''
    if (!htmlContent || htmlContent === '<p></p>') {
      notifications.show({
        title: '提示',
        message: '请先生成项目概况',
        color: 'orange',
      })
      return
    }

    // 将HTML转换为Markdown格式
    const markdownContent = htmlToMarkdown(htmlContent)

    setSaving(true)
    try {
      await saveProjectOverview(markdownContent)
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
                        }
                      } else {
                        // 解锁时，删除localStorage中的锁定值
                        const projectId = projectData?.project?.id || projectData?.projectId
                        if (projectId) {
                          const lockedKey = `project_construction_scale_locked_${projectId}`
                          localStorage.removeItem(lockedKey)
                        }
                      }
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
