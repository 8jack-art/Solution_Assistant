import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseTypewriterOptions {
  speed?: number // 打字速度（毫秒）
  onComplete?: () => void
  startDelay?: number // 开始延迟（毫秒）
  disabled?: boolean // 是否禁用打字机效果
}

export interface UseTypewriterReturn {
  displayedText: string
  isComplete: boolean
  currentIndex: number
}

/**
 * 打字机效果Hook - 优化版
 * 使用useRef追踪索引，避免不必要的重渲染
 */
export const useTypewriter = (
  fullText: string,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn => {
  const { speed = 30, onComplete, startDelay = 0, disabled = false } = options

  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  
  // 使用useRef追踪当前索引，避免依赖数组中的currentIndex导致频繁重执行
  const indexRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  
  // 清理函数
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])
  
  useEffect(() => {
    // 如果禁用，则直接显示完整文本
    if (disabled) {
      setDisplayedText(fullText)
      setIsComplete(true)
      indexRef.current = fullText.length
      return
    }

    if (!fullText) {
      setDisplayedText('')
      setIsComplete(false)
      indexRef.current = 0
      return
    }

    // 清理之前的定时器
    cleanup()

    // 重置状态
    setDisplayedText('')
    setIsComplete(false)
    indexRef.current = 0
    startTimeRef.current = Date.now()

    // 开始打字机效果
    const startTypewriter = () => {
      const typeNextChar = () => {
        if (indexRef.current < fullText.length) {
          const nextIndex = indexRef.current + 1
          // 使用函数式更新避免依赖currentIndex
          setDisplayedText(fullText.slice(0, nextIndex))
          indexRef.current = nextIndex
          
          timeoutRef.current = setTimeout(typeNextChar, speed)
        } else {
          setIsComplete(true)
          if (onComplete) {
            onComplete()
          }
        }
      }
      
      timeoutRef.current = setTimeout(typeNextChar, speed)
    }

    if (startDelay > 0) {
      timeoutRef.current = setTimeout(startTypewriter, startDelay)
    } else {
      startTypewriter()
    }

    // 清理函数
    return () => {
      cleanup()
    }
  }, [fullText, speed, onComplete, startDelay, disabled, cleanup])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    displayedText,
    isComplete,
    currentIndex: indexRef.current
  }
}

export default useTypewriter
