import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { cn } from '@/lib/utils'

interface MessageProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose?: () => void
  duration?: number
}

export const Message: React.FC<MessageProps> = ({ 
  message, 
  type = 'info', 
  onClose,
  duration = 3000 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg transition-all transform translate-y-0 opacity-100',
        typeStyles[type]
      )}
    >
      {message}
    </div>
  )
}

export const useMessage = () => {
  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    
    const root = React.createRoot(container)
    root.render(
      <Message
        message={message}
        type={type}
        onClose={() => {
          root.unmount()
          document.body.removeChild(container)
        }}
      />
    )
  }

  return { showMessage }
}