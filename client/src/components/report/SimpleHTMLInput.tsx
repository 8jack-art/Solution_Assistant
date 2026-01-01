import React, { useState, useRef, useEffect } from 'react'

interface SimpleHTMLInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  showTemplateButtons?: boolean
}

/**
 * 超简化的HTML编辑器组件，用于诊断渲染上下文问题
 */
const SimpleHTMLInput: React.FC<SimpleHTMLInputProps> = ({ 
  value, 
  onChange, 
  placeholder = '请输入...',
  minHeight = 200,
  showTemplateButtons = false,
}) => {
  console.log('[SimpleHTMLInput] Component rendered')
  const [isFocused, setIsFocused] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  
  // 初始化编辑器内容
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p></p>'
    }
  }, [value])
  
  // 处理输入事件
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }
  
  return (
    <div 
      style={{
        width: '100%',
        minHeight: `${minHeight}px`,
        border: '5px solid #00FF00',
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
          backgroundColor: '#00FF00',
          color: '#000000',
          padding: '5px 15px',
          borderRadius: '5px',
          fontWeight: 'bold',
          fontSize: '14px',
          zIndex: 1000000,
        }}
      >
        简单HTML编辑器
      </div>
      
      <div style={{ 
        width: '100%',
        minHeight: `${minHeight}px`,
        backgroundColor: '#E8F5E8',
        border: '2px solid #4CAF50',
        padding: '10px',
      }}>
        <div style={{ 
          marginBottom: '10px',
          padding: '5px',
          backgroundColor: '#D4EDDA',
          color: '#155724',
          borderRadius: '3px',
          fontSize: '12px',
        }}>
          编辑器状态: 已就绪 (简单HTML实现)
        </div>
        
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            width: '100%',
            minHeight: `${minHeight - 40}px`,
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#000000',
            outline: 'none',
            backgroundColor: '#FFFFFF',
            border: isFocused ? '1px solid #2196F3' : '1px solid #DDDDDD',
            borderRadius: '4px',
            padding: '8px',
          }}
          data-placeholder={placeholder}
        />
        
        {!value.trim() && !isFocused && (
          <div style={{
            position: 'absolute',
            top: '55px',
            left: '40px',
            color: '#999999',
            pointerEvents: 'none',
            fontSize: '16px',
          }}>
            {placeholder}
          </div>
        )}
      </div>
    </div>
  )
}

export default SimpleHTMLInput