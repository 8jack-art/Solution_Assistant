import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseTypewriterOptions {
  speed?: number // 打字速度（毫秒）
  onComplete?: () => void
  startDelay?: number // 开始延迟（毫秒）
  disabled?: boolean // 是否禁用打字机效果
  mode?: 'streaming' | 'replay' // 模式：streaming（流式生成中）或replay（生成完成后逐字输出）
}

export interface UseTypewriterReturn {
  displayedText: string
  isComplete: boolean
  currentIndex: number
  reset: () => void
}

/**
 * 打字机效果Hook - 优化版
 * 支持流式生成和生成后重播两种模式
 */
export const useTypewriter = (
  fullText: string,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn => {
  const { speed = 30, onComplete, startDelay = 0, disabled = false, mode = 'streaming' } = options

  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  
  // 使用useRef追踪当前索引，避免依赖数组中的currentIndex导致频繁重执行
  const indexRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fullTextRef = useRef(fullText)
  const isResettingRef = useRef(false)
  
  // 清理函数
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])
  
  // 重置函数
  const reset = useCallback(() => {
    cleanup()
    indexRef.current = 0
    setDisplayedText('')
    setIsComplete(false)
    isResettingRef.current = false
  }, [cleanup])
  
  // 更新fullText引用
  useEffect(() => {
    fullTextRef.current = fullText
  }, [fullText])
  
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

    const currentDisplayedLength = indexRef.current
    
    // 根据模式处理
    if (mode === 'streaming') {
      // 流式模式：只显示新增的部分，不从头开始
      if (fullText.length >= currentDisplayedLength) {
        // 增量更新或相同：只显示新增的部分
        const newContent = fullText.slice(currentDisplayedLength)
        
        console.log(`[Typewriter-Streaming] 增量更新: 当前显示${currentDisplayedLength}字符, 新内容${newContent.length}字符`)
        
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
        // 内容减少：可能是重置，直接显示全部内容
        console.log(`[Typewriter-Streaming] 内容减少: ${currentDisplayedLength} -> ${fullText.length}, 直接显示`)
        setDisplayedText(fullText)
        setIsComplete(false)
        indexRef.current = fullText.length
      }
    } else if (mode === 'replay') {
      // 重播模式：从头开始逐字输出
      console.log(`[Typewriter-Replay] 重播模式: 总长度${fullText.length}字符`)
      
      // 重置状态
      indexRef.current = 0
      setDisplayedText('')
      setIsComplete(false)
      
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
  }, [fullText, speed, onComplete, startDelay, disabled, mode, cleanup])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    displayedText,
    isComplete,
    currentIndex: indexRef.current,
    reset
  }
}

export default useTypewriter
