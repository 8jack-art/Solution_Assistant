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

    // 检查是否是增量更新（新内容比当前显示的多或相等）
    const currentDisplayedLength = indexRef.current
    
    if (fullText.length >= currentDisplayedLength) {
      // 增量更新或相同：只显示新增的部分
      const newContent = fullText.slice(currentDisplayedLength)
      
      console.log(`[Typewriter] 增量更新: 当前显示${currentDisplayedLength}字符, 新内容${newContent.length}字符`)
      
      // 开始打字新增内容
      const typeNextChar = () => {
        if (indexRef.current < fullText.length) {
          const nextIndex = indexRef.current + 1
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
    } else {
      // 内容减少：可能是重置，不应该发生，如果是重置则重新开始
      console.log(`[Typewriter] 内容减少: ${currentDisplayedLength} -> ${fullText.length}, 重置显示`)
      setDisplayedText(fullText)
      setIsComplete(false)
      indexRef.current = fullText.length
      
      // 重新开始打字机效果（从0开始）
      const startTypewriter = () => {
        const typeNextChar = () => {
          if (indexRef.current < fullText.length) {
            const nextIndex = indexRef.current + 1
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
