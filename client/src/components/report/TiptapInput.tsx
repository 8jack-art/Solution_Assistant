import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import Heading from '@tiptap/extension-heading'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Blockquote from '@tiptap/extension-blockquote'
import CodeBlock from '@tiptap/extension-code-block'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import HardBreak from '@tiptap/extension-hard-break'
import History from '@tiptap/extension-history'

interface TiptapInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  showTemplateButtons?: boolean
}

/**
 * 现代化的Tiptap富文本编辑器组件
 */
const TiptapInput: React.FC<TiptapInputProps> = ({ 
  value, 
  onChange, 
  placeholder = '请输入内容...',
  minHeight = 400,
  showTemplateButtons = false,
}) => {
  // 配置Tiptap编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Bold,
      Italic,
      Strike,
      Code,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
      CodeBlock,
      HorizontalRule,
      HardBreak,
      History,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) {
    return <div>加载中...</div>
  }

  return (
    <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-white">
      {/* 工具栏 */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b border-gray-200">
        {/* 文本格式 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          粗体
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          斜体
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('strike') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          删除线
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('code') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          行内代码
        </button>
        
        <div className="w-px h-6 bg-gray-200 mx-1"></div>
        
        {/* 标题 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={!editor.can().chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          H1
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          H2
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={!editor.can().chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          H3
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          disabled={!editor.can().chain().focus().setParagraph().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('paragraph') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          正文
        </button>
        
        <div className="w-px h-6 bg-gray-200 mx-1"></div>
        
        {/* 列表 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={!editor.can().chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          无序列表
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={!editor.can().chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          有序列表
        </button>
        
        <div className="w-px h-6 bg-gray-200 mx-1"></div>
        
        {/* 其他 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={!editor.can().chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('blockquote') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          引用
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${editor.isActive('codeBlock') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
        >
          代码块
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={!editor.can().chain().focus().setHorizontalRule().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors hover:bg-gray-100 text-gray-700`}
        >
          分割线
        </button>
        
        <div className="w-px h-6 bg-gray-200 mx-1"></div>
        
        {/* 历史记录 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors hover:bg-gray-100 text-gray-700`}
        >
          撤销
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className={`px-3 py-1 text-sm rounded-md transition-colors hover:bg-gray-100 text-gray-700`}
        >
          重做
        </button>
      </div>
      
      {/* 编辑器内容 */}
      <div className="relative">
        <EditorContent 
          editor={editor}
          className="min-h-[300px] p-4 focus:outline-none"
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            minHeight: `${minHeight - 80}px`,
          }}
        />
      </div>
    </div>
  )
}

export default TiptapInput
