import { useState, useEffect, useCallback, useRef } from 'react'

interface UseDataLoaderOptions<T> {
  initialData?: T
  maxRetries?: number
  retryDelay?: number
}

interface UseDataLoaderResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  cancel: () => void
}

/**
 * 统一的数据加载Hook
 * 提供自动重试、请求取消、错误处理等功能
 */
export function useDataLoader<T>(
  dataFetcher: (signal?: AbortSignal) => Promise<T>,
  dependencies: any[],
  options: UseDataLoaderOptions<T> = {}
): UseDataLoaderResult<T> {
  const [data, setData] = useState<T | null>(options.initialData || null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef<number>(0)
  
  const fetchData = useCallback(async () => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    
    try {
      setLoading(true)
      setError(null)
      
      const result = await dataFetcher(abortControllerRef.current.signal)
      setData(result)
      retryCountRef.current = 0 // 重置重试计数
    } catch (err: any) {
      // 忽略被取消的请求
      if (err.name === 'AbortError') {
        return
      }
      
      const errorMessage = err.message || 'Unknown error occurred'
      setError(errorMessage)
      
      // 自动重试逻辑
      const maxRetries = options.maxRetries || 3
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++
        const delay = (options.retryDelay || 1000) * Math.pow(2, retryCountRef.current - 1)
        
        setTimeout(() => {
          fetchData()
        }, delay)
      }
    } finally {
      setLoading(false)
    }
  }, dependencies)
  
  useEffect(() => {
    fetchData()
    
    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])
  
  const refetch = useCallback(async () => {
    retryCountRef.current = 0
    await fetchData()
  }, [fetchData])
  
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])
  
  return { data, loading, error, refetch, cancel }
}
