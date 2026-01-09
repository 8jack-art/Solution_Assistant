import React, { useEffect, useCallback, useMemo } from 'react'
import { Box, Group, Divider, Tooltip, Button, Text, Select, Paper } from '@mantine/core'
import { useReportStore } from '../../stores/reportStore'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// @ts-ignore
import Placeholder from '@tiptap/extension-placeholder'
// @ts-ignore
import Underline from '@tiptap/extension-underline'
// @ts-ignore
import Strike from '@tiptap/extension-strike'
// @ts-ignore
import TextAlign from '@tiptap/extension-text-align'
// @ts-ignore
import Link from '@tiptap/extension-link'
// @ts-ignore
import Highlight from '@tiptap/extension-highlight'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List as ListIcon, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, Link as LinkIcon, Highlighter,
} from 'lucide-react'

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

// 标题级别选择器
interface HeadingSelectorProps {
  editor: any
}

function HeadingSelector({ editor }: HeadingSelectorProps) {
  const headingOptions = [
    { value: 'paragraph', label: '正文' },
    { value: '1', label: '标题1' },
    { value: '2', label: '标题2' },
    { value: '3', label: '标题3' },
  ]

  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return '1'
    if (editor.isActive('heading', { level: 2 })) return '2'
    if (editor.isActive('heading', { level: 3 })) return '3'
    return 'paragraph'
  }

  return (
    <Select
      size="xs"
      w={80}
      value={getCurrentHeading()}
      onChange={(value) => {
        if (value === 'paragraph') {
          editor.chain().focus().setParagraph().run()
        } else if (value) {
          editor.chain().focus().toggleHeading({ level: parseInt(value) as 1 | 2 | 3 }).run()
        }
      }}
      data={headingOptions}
      styles={{
        input: {
          fontSize: '12px',
          height: '28px',
          minHeight: '28px',
        }
      }}
    />
  )
}

// 插入链接组件
interface InsertLinkProps {
  editor: any
}

function InsertLink({ editor }: InsertLinkProps) {
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('请输入链接地址:', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  return (
    <ToolbarButton
      icon={<LinkIcon size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
      label="插入链接"
      isActive={editor.isActive('link')}
      onClick={setLink}
    />
  )
}

interface ReportEditorProps {
  /** 是否为只读模式（用于预览） */
  readonly?: boolean
  /** 自定义样式配置 */
  styleConfig?: React.CSSProperties
}

export function ReportEditor({ readonly = false, styleConfig }: ReportEditorProps) {
  const {
    reportContent,
    styleConfig: storeStyleConfig,
    reportId,
  } = useReportStore()

  // 更新报告内容的方法
  const updateReportContent = useCallback((content: string) => {
    useReportStore.setState({ reportContent: content })
  }, [])

  // 获取当前样式配置（使用body独立的行间距配置）
  const currentStyle = useMemo(() => {
    const lineSpacing = storeStyleConfig?.body?.lineSpacing ?? 
                        storeStyleConfig?.paragraph?.lineSpacing ?? 1.5
    return {
      fontFamily: storeStyleConfig?.fonts?.body || '宋体',
      fontSize: (storeStyleConfig?.fontSizes?.body || 16) + 'px',
      lineHeight: typeof lineSpacing === 'number' ? lineSpacing : 1.5,
    }
  }, [storeStyleConfig])

  // 创建 Tiptap 编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false
        }
      }),
      Placeholder.configure({
        placeholder: '开始编辑报告内容...',
      }),
      Underline,
      Strike,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: reportContent,
    editable: !readonly,
    onUpdate: ({ editor }) => {
      if (!readonly) {
        const html = editor.getHTML()
        if (html !== reportContent) {
          updateReportContent(html)
        }
      }
    },
    editorProps: {
      attributes: {
        class: 'report-editor-content',
        style: `font-family: ${currentStyle.fontFamily}; font-size: ${currentStyle.fontSize}; line-height: ${currentStyle.lineHeight};`,
      },
    },
  })

  // 同步外部内容变化到编辑器
  useEffect(() => {
    if (editor && reportContent !== editor.getHTML()) {
      const selection = editor.state.selection
      // @ts-ignore - setContent options type mismatch
      editor.commands.setContent(reportContent, false)
      try {
        editor.commands.setTextSelection(selection)
      } catch {
        // 忽略位置恢复错误
      }
    }
  }, [reportContent, editor])

  // 快捷键支持
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // 只读模式下禁用快捷键
      if (readonly) return

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'b':
            event.preventDefault()
            editor.chain().focus().toggleBold().run()
            break
          case 'i':
            event.preventDefault()
            editor.chain().focus().toggleItalic().run()
            break
          case 'u':
            event.preventDefault()
            editor.chain().focus().toggleUnderline().run()
            break
          case 'z':
            if (event.shiftKey) {
              event.preventDefault()
              editor.chain().focus().redo().run()
            }
            break
          case 'y':
            event.preventDefault()
            editor.chain().focus().redo().run()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor, readonly])

  if (!editor) {
    return (
      <Paper
        style={{
          minHeight: '400px',
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: '8px',
          padding: '12px',
          background: 'var(--mantine-color-body)',
          ...styleConfig,
        }}
      />
    )
  }

  return (
    <div className="report-editor" style={styleConfig}>
      {/* 标题 */}
      {!readonly && (
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500} c="dark.7">报告内容编辑</Text>
          <Text size="xs" c="dimmed">
            {reportId ? '已保存' : '未保存'}
          </Text>
        </Group>
      )}

      {/* 工具栏 - 只读模式不显示 */}
      {!readonly && (
        <Box
          style={{
            border: '1px solid var(--mantine-color-gray-3)',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            background: 'var(--mantine-color-gray-0)',
            padding: '8px 10px 6px',
          }}
        >
          <Group gap={4} style={{ flexWrap: 'nowrap' }}>
            {/* 标题级别选择 */}
            <HeadingSelector editor={editor} />

            <Divider orientation="vertical" style={{ height: '20px', alignSelf: 'center' }} />

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
                icon={<Highlighter size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                label="高亮"
                isActive={editor.isActive('highlight')}
                onClick={() => editor.chain().focus().toggleHighlight().run()}
              />
            </Group>

            <Divider orientation="vertical" style={{ height: '20px', alignSelf: 'center' }} />

            {/* 对齐方式组 */}
            <Group gap={2}>
              <ToolbarButton
                icon={<AlignLeft size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                label="左对齐"
                isActive={editor.isActive({ textAlign: 'left' })}
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
              />
              <ToolbarButton
                icon={<AlignCenter size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                label="居中对齐"
                isActive={editor.isActive({ textAlign: 'center' })}
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
              />
              <ToolbarButton
                icon={<AlignRight size={14} style={{ color: 'var(--mantine-color-dark-7)' }} />}
                label="右对齐"
                isActive={editor.isActive({ textAlign: 'right' })}
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
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

            <Divider orientation="vertical" style={{ height: '20px', alignSelf: 'center' }} />

            {/* 链接和工具 */}
            <Group gap={2}>
              <InsertLink editor={editor} />
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
      )}

      {/* 编辑器内容 */}
      <Box
        style={{
          border: '1px solid var(--mantine-color-gray-3)',
          borderTop: readonly ? '1px solid var(--mantine-color-gray-3)' : 'none',
          borderRadius: readonly ? '8px' : '0 0 8px 8px',
          minHeight: '400px',
          background: 'var(--mantine-color-body)',
          position: 'relative',
        }}
      >
        <Box style={{ padding: '16px 20px' }}>
          {/* @ts-ignore - EditorContent type mismatch */}
          <EditorContent
            editor={editor}
            style={{
              minHeight: '380px',
            }}
          />
        </Box>
      </Box>

      {/* 只读模式的提示 */}
      {readonly && (
        <Text size="xs" c="dimmed" mt="xs" ta="center">
          💡 只读模式 - 预览效果与导出Word一致
        </Text>
      )}

      {/* 样式 */}
      <style>{`
        .report-editor .ProseMirror {
          outline: none !important;
          min-height: 360px;
        }
        .report-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: var(--mantine-color-gray-5);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .report-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .report-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.83em;
          margin-bottom: 0.5em;
        }
        .report-editor h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 0.67em;
          margin-bottom: 0.5em;
        }
        .report-editor ul, .report-editor ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .report-editor blockquote {
          border-left: 4px solid var(--mantine-color-blue-4);
          margin: 0.5em 0;
          padding-left: 1em;
          color: var(--mantine-color-dark-6);
          background: var(--mantine-color-gray-0);
        }
        .report-editor .editor-link {
          color: var(--mantine-color-blue-6);
          text-decoration: underline;
          cursor: pointer;
        }
        .report-editor mark {
          background-color: yellow;
          padding: 0 2px;
        }
      `}</style>
    </div>
  )
}

export default ReportEditor
