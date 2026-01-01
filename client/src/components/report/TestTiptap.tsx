import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

interface TestTiptapProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  showTemplateButtons?: boolean
}

const TestTiptap: React.FC<TestTiptapProps> = ({ 
  value, 
  onChange, 
  placeholder = '请输入内容...',
  minHeight = 300,
  showTemplateButtons = false
}) => {
  console.log('[TestTiptap] Component rendered')
  console.log('[TestTiptap] Value:', value)
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '<p>初始内容</p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
      console.log('[TestTiptap] Content updated:', html)
    },
    onCreate: () => {
      console.log('[TestTiptap] Editor created')
    },
  })
  
  console.log('[TestTiptap] Editor instance:', editor)
  
  return (
    <div style={{ 
      width: '100%', 
      minHeight: `${minHeight}px`,
      border: '5px solid #FF0000',
      backgroundColor: '#FFFF00',
      padding: '20px',
      margin: '20px 0',
      zIndex: 9999,
      position: 'relative'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '-15px', 
        left: '20px', 
        backgroundColor: '#FF0000', 
        color: '#FFFFFF', 
        padding: '5px 15px',
        borderRadius: '5px',
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        TEST TIPTAP 组件
      </div>
      <h3 style={{ color: '#FF0000', marginBottom: '20px' }}>测试Tiptap编辑器</h3>
      <div style={{ 
        width: '100%', 
        minHeight: `${minHeight - 100}px`,
        border: '3px solid #0000FF',
        backgroundColor: '#FFFFFF',
        padding: '10px'
      }}>
        {editor ? (
          <EditorContent editor={editor} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'red' }}>
            编辑器初始化失败
          </div>
        )}
      </div>
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        编辑器状态: {editor ? '已初始化' : '初始化中'}
      </div>
    </div>
  )
}

export default TestTiptap
