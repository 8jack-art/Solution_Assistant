import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

interface TestTiptap2Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  showTemplateButtons?: boolean
}

/**
 * 超简化的Tiptap测试组件，用于诊断可见性问题
 */
const TestTiptap2: React.FC<TestTiptap2Props> = ({ 
  value, 
  onChange, 
  placeholder = '请输入...',
  minHeight = 200,
  showTemplateButtons = false,
}) => {
  console.log('[TestTiptap2] Component rendered')
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onCreate: () => console.log('[TestTiptap2] Editor created'),
  })
  
  console.log('[TestTiptap2] Editor instance:', editor)
  
  return (
    <div 
      style={{
        width: '100%',
        minHeight: `${minHeight}px`,
        border: '5px solid #FF0000',
        padding: '20px',
        margin: '20px 0',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        zIndex: 999999,
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: '-15px',
          left: '15px',
          backgroundColor: '#FF0000',
          color: '#FFFFFF',
          padding: '5px 15px',
          borderRadius: '5px',
          fontWeight: 'bold',
          fontSize: '14px',
          zIndex: 1000000,
        }}
      >
        测试Tiptap编辑器
      </div>
      
      <div style={{ 
        width: '100%',
        minHeight: `${minHeight}px`,
        backgroundColor: '#FFFFCC',
        border: '2px solid #FFD700',
        padding: '10px',
      }}>
        {editor ? (
          <>
            <div style={{ 
              marginBottom: '10px',
              padding: '5px',
              backgroundColor: '#D4EDDA',
              color: '#155724',
              borderRadius: '3px',
              fontSize: '12px',
            }}>
              编辑器状态: 已初始化
            </div>
            <EditorContent 
              editor={editor}
              style={{
                width: '100%',
                minHeight: `${minHeight - 40}px`,
                fontSize: '16px',
                lineHeight: '1.6',
                color: '#000000',
                outline: 'none',
              }}
            />
          </>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFCCCC',
            color: '#FF0000',
            fontSize: '18px',
            fontWeight: 'bold',
          }}>
            编辑器初始化失败！
          </div>
        )}
      </div>
    </div>
  )
}

export default TestTiptap2