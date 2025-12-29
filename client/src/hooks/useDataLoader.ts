import { useState, useEffect, useRef, useCallback } from 'react'
import { investmentApi, dataCache } from '@/lib/api'
import { notifications } from '@mantine/notifications'

interface UseDataLoaderOptions {
  projectId: string
  autoGenerate?: boolean
  onGenerateComplete?: (data: any) => void
  onError?: (error: Error) => void
}

interface DataLoaderState {
  data: any
  loading: boolean
  error: Error | null
  retryCount: number
  lastLoadTime: number | null
}

export const useDataLoader = ({
  projectId,
  autoGenerate = false,
  onGenerateComplete,
  onError
}: UseDataLoaderOptions) => {
  const [state, setState] = useState<DataLoaderState>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
    lastLoadTime: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const maxRetries = 3

  const loadData = useCallback(async (useCache = true) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 创建新的AbortController
    abortControllerRef.current = new AbortController()

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      console.log(`[useDataLoader] 开始加载数据，项目ID: ${projectId}，使用缓存: ${useCache}`)
      
      const response = await investmentApi.getByProjectId(projectId, {
        signal: abortControllerRef.current.signal,
        useCache
      })

      if (response.success && response.data?.estimate) {
        const estimateData = response.data.estimate.estimate_data
        
        // 数据完整性检查
        if (!estimateData || !estimateData.partA || !estimateData.partG) {
          throw new Error('投资估算数据不完整')
        }

        setState(prev => ({
          ...prev,
          data: estimateData,
          loading: false,
          error: null,
          lastLoadTime: Date.now()
        }))

        console.log(`[useDataLoader] 数据加载成功，迭代次数: ${estimateData.iterationCount || '未知'}`)
        
        if (onGenerateComplete) {
          onGenerateComplete(estimateData)
        }
      } else {
        throw new Error(response.error || '未找到投资估算数据')
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[useDataLoader] 请求被取消')
        return
      }

      console.error('[useDataLoader] 数据加载失败:', error)
      
      // 尝试降级策略：从缓存恢复数据
      const cacheKey = `investment:${projectId}`
      const cachedData = dataCache.get(cacheKey)
      
      if (cachedData && cachedData.success && cachedData.data?.estimate) {
        console.log('[useDataLoader] 从缓存恢复数据')
        setState(prev => ({
          ...prev,
          data: cachedData.data.estimate.estimate_data,
          loading: false,
          error: null,
          lastLoadTime: Date.now()
        }))

        notifications.show({
          title: '⚠️ 使用缓存数据',
          message: '网络异常，已从缓存恢复数据',
          color: 'orange',
          autoClose: 4000,
        })
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error as Error,
          retryCount: prev.retryCount + 1
        }))

        if (onError) {
          onError(error as Error)
        }

        notifications.show({
          title: '❌ 数据加载失败',
          message: error.message || '请检查网络连接',
          color: 'red',
          autoClose: 6000,
        })
      }
    }
  }, [projectId, onGenerateComplete, onError])

  const retry = useCallback(() => {
    if (state.retryCount < maxRetries) {
      console.log(`[useDataLoader] 重试加载 (${state.retryCount + 1}/${maxRetries})`)
      loadData(false) // 重试时不使用缓存
    } else {
      notifications.show({
        title: '⚠️ 重试次数已达上限',
        message: '请尝试刷新页面或联系技术支持',
        color: 'orange',
        autoClose: 5000,
      })
    }
  }, [state.retryCount, loadData])

  const clearCache = useCallback(() => {
    try {
      dataCache.invalidate(`investment:${projectId}`)
      console.log('[useDataLoader] 缓存已清除')
      
      notifications.show({
        title: '🗑️ 缓存已清除',
        message: '已清除项目缓存数据',
        color: 'green',
        autoClose: 3000,
      })
    } catch (error) {
      console.error('[useDataLoader] 清除缓存失败:', error)
    }
  }, [projectId])

  const refresh = useCallback(() => {
    console.log('[useDataLoader] 强制刷新数据')
    loadData(false) // 刷新时不使用缓存
  }, [loadData])

  // 组件挂载时自动加载数据
  useEffect(() => {
    if (projectId) {
      loadData(true)
    }
  }, [projectId, loadData])

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    ...state,
    loadData,
    retry,
    clearCache,
    refresh,
    canRetry: state.retryCount < maxRetries,
    isAborted: state.error?.name === 'AbortError'
  }
}
