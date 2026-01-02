import React, { useState, useEffect, useCallback } from 'react'
import { Text, Box, Button, Group, Divider, Tooltip, ActionIcon } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useReportStore } from '../../stores/reportStore'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// @ts-ignore
import Placeholder from '@tiptap/extension-placeholder'
// @ts-ignore
import Underline from '@tiptap/extension-underline'
// @ts-ignore
import Strike from '@tiptap/extension-strike'
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, 
  Heading1, Heading2, List as ListIcon, ListOrdered, Quote, 
  Undo, Redo, Save, Check, X
} from 'lucide-react'
import { VariableMenu } from './VariableMenu'

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

export function PromptEditor(): React.ReactElement {
  const {
    promptTemplate,
    setPromptTemplate,
    saveTemplate,
    updateTemplate,
    selectedTemplateId,
    templates,
  } = useReportStore()

  const [isSaving, setIsSaving] = useState(false)
  const [showVariableMenu, setShowVariableMenu] = useState(false)
  const [variableMenuPosition, setVariableMenuPosition] = useState({ x: 0, y: 0 })

  // 创建 Tiptap 编辑器
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '请输入提示词，指导AI生成报告内容...\n输入 / 可插入变量',
      }),
      Underline,
      Strike,
    ],
    content: promptTemplate,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (html !== promptTemplate) {
        setPromptTemplate(html)
      }
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // 处理 "/" 按键
        if (event.key === '/' && !showVariableMenu) {
          event.preventDefault()
          const coords = view.coordsAtPos(view.state.selection.from)
          setVariableMenuPosition({ x: coords.left, y: coords.top + 20 })
          setShowVariableMenu(true)
          return true
        }
        
        // ESC 关闭菜单
        if (event.key === 'Escape' && showVariableMenu) {
          setShowVariableMenu(false)
          return true
        }
        
        return false
      },
    },
  })

  // 同步外部内容变化到编辑器
  useEffect(() => {
    if (editor && promptTemplate !== editor.getHTML()) {
      const selection = editor.state.selection
      // @ts-ignore - setContent options type mismatch
      editor.commands.setContent(promptTemplate, false)
      try {
        editor.commands.setTextSelection(selection)
      } catch {
        // 忽略位置恢复错误
      }
    }
  }, [promptTemplate, editor])

  // 点击编辑器外部关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (showVariableMenu) {
        setShowVariableMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showVariableMenu])

  // 保存提示词为模板
  const handleSavePrompt = async () => {
    if (!promptTemplate || promptTemplate === '<p></p>') {
      notifications.show({
        title: '提示',
        message: '提示词内容为空，请先输入提示词',
        color: 'orange',
      })
      return
    }
    
    setIsSaving(true)
    try {
      // 获取当前选定的模板信息
      const selectedTemplate = templates?.find(t => t.id === selectedTemplateId)
      
      if (selectedTemplateId && selectedTemplate) {
        // 更新现有模板
        await updateTemplate(selectedTemplateId, {
          name: selectedTemplate.name,
          description: selectedTemplate.description || '',
          promptTemplate: promptTemplate
        })
        notifications.show({
          title: '成功',
          message: `模板 "${selectedTemplate.name}" 已更新`,
          color: 'green',
          icon: <Check size={16} />,
        })
      } else {
        // 创建新模板
        await saveTemplate({
          name: `模板-${new Date().toLocaleDateString()}`,
          description: '',
          promptTemplate: promptTemplate
        })
        notifications.show({
          title: '成功',
          message: '提示词已保存为新模板',
          color: 'green',
          icon: <Check size={16} />,
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '错误',
        message: error.message || '保存失败，请稍后重试',
        color: 'red',
        icon: <X size={16} />,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!editor) {
    return (
      <Box 
        style={{ 
          minHeight: '220px', 
          border: '1px solid var(--mantine-color-gray-3)', 
          borderRadius: '8px',
          padding: '12px',
          background: 'var(--mantine-color-body)'
        }} 
      />
    )
  }

  return (
    <div className="prompt-editor" onClick={(e) => e.stopPropagation()}>
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500} c="dark.7">提示词编辑</Text>
        <Tooltip label={selectedTemplateId ? '保存到当前模板' : '保存为新模板'}>
          <ActionIcon 
            variant="subtle" 
            color="blue" 
            size="sm"
            onClick={handleSavePrompt}
            loading={isSaving}
          >
            <Save size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      
      {/* 工具栏 - 浅色背景，黑色图标 */}
      <Box 
        style={{ 
          border: '1px solid var(--mantine-color-gray-3)',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          background: 'var(--mantine-color-gray-0)',
          padding: '8px 10px 6px',
        }}
      >
        <Group gap={2} style={{ flexWrap: 'nowrap' }}>
          {/* 文字格式组 */}
          <Group gap={2}>
            <ToolbarButton
              icon={<Bold size={14} style={{ fontWeight: 'bold', color: 'var(--mantine-color-dark-7)' }} />}
              label="粗体 (Ctrl+B)"
              isActive={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              icon={<Italic size={14} style={{ fontStyle: 'italic', color: 'var(--mantine-color-dark-7)' }} />}
              label="斜体 (Ctrl+I)"
              isActive={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              icon={<UnderlineIcon size={14} style={{ textDecoration: 'underline', color: 'var(--mantine-color-dark-7)' }} />}
              label="下划线 (Ctrl+U)"
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
              label="撤销 (Ctrl+Z)"
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
            />
            <ToolbarButton
              icon={<Redo size={14} style={{ color: 'var(--mantine-color-dark-5)' }} />}
              label="重做 (Ctrl+Y)"
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
            />
          </Group>
        </Group>
      </Box>

      {/* 编辑器内容 */}
      <Box
        style={{
          border: '1px solid var(--mantine-color-gray-3)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          minHeight: '180px',
          background: 'var(--mantine-color-body)',
          position: 'relative',
        }}
      >
        <Box style={{ padding: '14px 16px' }}>
          {/* @ts-ignore - EditorContent type mismatch */}
          <EditorContent 
            editor={editor} 
            style={{ 
              minHeight: '160px',
              fontSize: '14px',
              lineHeight: '1.7',
            }} 
          />
        </Box>
        
        {/* 变量菜单 */}
        {showVariableMenu && editor && (
          <VariableMenu
            editor={editor}
            position={variableMenuPosition}
            onClose={() => setShowVariableMenu(false)}
          />
        )}
      </Box>

      {/* 移除默认焦点框样式 */}
      <style>{`
        .tiptap:focus {
          outline: none !important;
        }
        .tiptap p.is-editor-empty:first-child::before {
          color: var(--mantine-color-gray-5);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>

      <Text size="xs" c="dimmed" mt="xs">
        💡 提示：输入 / 可快速插入变量，变量会在生成时自动替换为实际数据。
      </Text>
    </div>
  )
}
