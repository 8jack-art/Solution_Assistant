import { useState, useEffect, useRef, useCallback } from 'react'

export interface StreamReportStatus {
  type: 'status' | 'content' | 'completed' | 'error'
  status?: 'generating' | 'completed' | 'failed' | 'paused' | 'stopped'
  content?: string
  title?: string
  progress?: number
  error?: string
}

export interface UseStreamReportOptions {
  onStatusChange?: (status: StreamReportStatus) => void
  onContentUpdate?: (content: string) => void
  onComplete?: (content: string) => void
  onError?: (error: string) => void
  reconnectAttempts?: number
  reconnectInterval?: number
}

export interface UseStreamReportReturn {
  content: string
  status: 'idle' | 'generating' | 'completed' | 'failed' | 'paused' | 'stopped'
  title: string
  progress: number
  error: string | null
  isConnected: boolean
  reconnect: () => void
  disconnect: () => void
}

/**
 * 处理报告流式生成的自定义Hook
 */
export const useStreamReport = (
  reportId: string | null,
  options: UseStreamReportOptions = {}
): UseStreamReportReturn => {
  const {
    onStatusChange,
    onContentUpdate,
    onComplete,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000
  } = options

  // 状态管理
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<UseStreamReportReturn['status']>('idle')
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // 引用管理
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)

  // 清理函数
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setIsConnected(false)
  }, [])

  // 状态更新函数
  const updateStatus = useCallback((data: StreamReportStatus) => {
    setStatus(data.status || 'idle')
    setTitle(data.title || '')
    setProgress(data.progress || 0)
    setError(data.error || null)

    // 调用外部回调
    if (onStatusChange) {
      onStatusChange(data)
    }

    // 处理内容更新
    if (data.type === 'content' && data.content !== undefined) {
      setContent(data.content)
      if (onContentUpdate) {
        onContentUpdate(data.content)
      }
    }

    // 处理完成
    if (data.type === 'completed' && data.content) {
      setContent(data.content)
      setStatus('completed')
      if (onComplete) {
        onComplete(data.content)
      }
    }

    // 处理错误
    if (data.type === 'error') {
      setStatus('failed')
      setError(data.error || '未知错误')
      if (onError) {
        onError(data.error || '未知错误')
      }
    }
  }, [onStatusChange, onContentUpdate, onComplete, onError])

  // 重连函数
  const reconnect = useCallback(() => {
    if (reconnectCountRef.current >= reconnectAttempts) {
      setError(`重连失败，已达到最大重试次数 (${reconnectAttempts})`)
      setStatus('failed')
      return
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectCountRef.current++
    
    console.log(`尝试重连... (${reconnectCountRef.current}/${reconnectAttempts})`)

    reconnectTimeoutRef.current = setTimeout(() => {
      cleanup()
      connect()
    }, reconnectInterval * reconnectCountRef.current)
  }, [reconnectAttempts, reconnectInterval, cleanup])

  // 连接函数
  const connect = useCallback(() => {
    if (!reportId) {
      console.warn('reportId 为空，无法建立连接')
      return
    }

    // 清理现有连接
    cleanup()

    try {
      // 构建SSE连接URL
      const token = localStorage.getItem('token')
      const url = `/api/report/stream/${reportId}`

      // 创建EventSource实例
      const eventSource = new EventSource(url, {
        withCredentials: true
      })

      eventSourceRef.current = eventSource
      setIsConnected(true)
      reconnectCountRef.current = 0 // 重置重连计数

      // 连接成功
      eventSource.onopen = () => {
        console.log('SSE连接已建立:', url)
        setIsConnected(true)
        setError(null)
      }

      // 接收消息
      eventSource.onmessage = (event) => {
        try {
          const data: StreamReportStatus = JSON.parse(event.data)
          console.log('收到SSE数据:', data)
          updateStatus(data)
        } catch (parseError) {
          console.error('解析SSE数据失败:', parseError, event.data)
          setError('数据格式错误')
        }
      }

      // 错误处理
      eventSource.onerror = (error) => {
        console.error('SSE连接错误:', error)
        setIsConnected(false)
        
        // 如果是网络错误，尝试重连
        if (eventSource.readyState === EventSource.CLOSED) {
          reconnect()
        }
      }

      // 手动关闭处理
      eventSource.addEventListener('close', () => {
        console.log('SSE连接被手动关闭')
        eventSource.close()
      })

    } catch (connectionError) {
      console.error('建立SSE连接失败:', connectionError)
      setIsConnected(false)
      setError('连接失败')
      
      // 尝试重连
      reconnect()
    }
  }, [reportId, cleanup, updateStatus, reconnect])

  // 手动断开连接
  const disconnect = useCallback(() => {
    cleanup()
    setStatus('idle')
    setContent('')
    setError(null)
    reconnectCountRef.current = 0
  }, [cleanup])

  // 组件挂载时建立连接
  useEffect(() => {
    if (reportId) {
      connect()
    }

    return () => {
      cleanup()
    }
  }, [reportId, connect, cleanup])

  // 页面卸载时清理
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    content,
    status,
    title,
    progress,
    error,
    isConnected,
    reconnect: connect,
    disconnect
  }
}

export default useStreamReport
