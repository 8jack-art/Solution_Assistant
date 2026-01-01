import React, { useEffect } from 'react'
import { Text, Box, Button, Group, Divider } from '@mantine/core'
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
  Undo, Redo 
} from 'lucide-react'

export function PromptEditor(): React.ReactElement {
  const {
    promptTemplate,
    setPromptTemplate,
    variableToInsert,
    setVariableToInsert,
  } = useReportStore()

  // 创建 Tiptap 编辑器
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '请输入提示词，指导AI生成报告内容...\n例如：请分析项目{{project_name}}的财务状况。',
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

  // 处理变量插入
  useEffect(() => {
    if (editor && variableToInsert) {
      editor.commands.insertContent(variableToInsert)
      setVariableToInsert(null)
    }
  }, [variableToInsert, editor, setVariableToInsert])

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
    <div className="prompt-editor">
      <Text size="sm" fw={500} mb="xs" c="dark.7">提示词编辑</Text>
      
      {/* 工具栏 */}
      <Box 
        style={{ 
          border: '1px solid var(--mantine-color-gray-3)',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          background: 'linear-gradient(180deg, #fafbfc 0%, #f5f6f8 100%)',
          padding: '10px 12px 8px',
        }}
      >
        <Group gap={3} mb={6} style={{ flexWrap: 'nowrap' }}>
          {/* 文字格式组 */}
          <Box style={{ display: 'flex', gap: '2px' }}>
            <Button
              variant={editor.isActive('bold') ? 'filled' : 'subtle'}
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                background: editor.isActive('bold') ? 'var(--mantine-color-blue-6)' : undefined,
              }}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="粗体"
            >
              <Bold size={14} style={{ fontWeight: 'bold' }} />
            </Button>
            <Button
              variant={editor.isActive('italic') ? 'filled' : 'subtle'}
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                background: editor.isActive('italic') ? 'var(--mantine-color-blue-6)' : undefined,
              }}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="斜体"
            >
              <Italic size={14} style={{ fontStyle: 'italic' }} />
            </Button>
            <Button
              variant={editor.isActive('underline') ? 'filled' : 'subtle'}
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                background: editor.isActive('underline') ? 'var(--mantine-color-blue-6)' : undefined,
              }}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="下划线"
            >
              <UnderlineIcon size={14} style={{ textDecoration: 'underline' }} />
            </Button>
            <Button
              variant={editor.isActive('strike') ? 'filled' : 'subtle'}
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                background: editor.isActive('strike') ? 'var(--mantine-color-blue-6)' : undefined,
              }}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="删除线"
            >
              <Strikethrough size={14} />
            </Button>
            <Button
              variant={editor.isActive('code') ? 'filled' : 'subtle'}
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                background: editor.isActive('code') ? 'var(--mantine-color-blue-6)' : undefined,
              }}
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="代码"
            >
              <Code size={14} />
            </Button>
          </Box>

          <Divider orientation="vertical" style={{ height: '20px', alignSelf: 'center' }} />

          {/* 标题组 */}
          <Box style={{ display: 'flex', gap: '2px' }}>
            <Button
              variant={editor.isActive('heading', { level: 1 }) ? 'filled' : 'subtle'}
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                fontWeight: 'bold',
                background: editor.isActive('heading', { level: 1 }) ? 'var(--mantine-color-blue-6)' : undefined,
              }}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="标题1"
            >
              H1
            </Button>
            <Button
              variant={editor.isActive('heading', { level: 2 }) ? 'filled' : 'subtle'}
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                fontWeight: 'bold',
                background: editor.isActive('heading', { level: 2 }) ? 'var(--mantine-color-blue-6)' : undefined,
              }}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="标题2"
            >
              H2
            </Button>
          </Box>

          <Divider orientation="vertical" style={{ height: '20px', alignSelf: 'center' }} />

          {/* 列表组 */}
          <Box style={{ display: 'flex', gap: '2px' }}>
            <Button
              variant={editor.isActive('bulletList') ? 'filled' : 'subtle'}
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                background: editor.isActive('bulletList') ? 'var(--mantine-color-blue-6)' : undefined,
              }}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="无序列表"
            >
              <ListIcon size={14} />
            </Button>
            <Button
              variant={editor.isActive('orderedList') ? 'filled' : 'subtle'}
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                background: editor.isActive('orderedList') ? 'var(--mantine-color-blue-6)' : undefined,
              }}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="有序列表"
            >
              <ListOrdered size={14} />
            </Button>
            <Button
              variant={editor.isActive('blockquote') ? 'filled' : 'subtle'}
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                background: editor.isActive('blockquote') ? 'var(--mantine-color-blue-6)' : undefined,
              }}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="引用"
            >
              <Quote size={14} />
            </Button>
          </Box>

          <Box style={{ flex: 1 }} />

          {/* 撤销/重做组 */}
          <Box style={{ display: 'flex', gap: '2px' }}>
            <Button
              variant="subtle"
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                color: 'var(--mantine-color-gray-6)',
              }}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="撤销"
            >
              <Undo size={14} />
            </Button>
            <Button
              variant="subtle"
              size="xs"
              style={{ 
                minWidth: '28px', 
                height: '28px', 
                padding: '0 6px',
                borderRadius: '4px',
                color: 'var(--mantine-color-gray-6)',
              }}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="重做"
            >
              <Redo size={14} />
            </Button>
          </Box>
        </Group>
      </Box>

      {/* 编辑器内容 */}
      <Box
        style={{
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: '0 0 8px 8px',
          minHeight: '180px',
          background: 'var(--mantine-color-body)',
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
        💡 提示：点击右侧"可用变量"可插入变量，变量会在生成时自动替换为实际数据。
      </Text>
    </div>
  )
}
