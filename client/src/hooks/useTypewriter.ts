import { useState, useEffect, useRef } from 'react'

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
 * 打字机效果Hook
 */
export const useTypewriter = (
  fullText: string,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn => {
  const { speed = 30, onComplete, startDelay = 0, disabled = false } = options

  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    // 如果禁用，则直接显示完整文本
    if (disabled) {
      setDisplayedText(fullText)
      setIsComplete(true)
      setCurrentIndex(fullText.length)
      return
    }

    if (!fullText) {
      setDisplayedText('')
      setIsComplete(false)
      setCurrentIndex(0)
      return
    }

    // 清理之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 重置状态
    setDisplayedText('')
    setIsComplete(false)
    setCurrentIndex(0)
    startTimeRef.current = Date.now()

    // 开始打字机效果
    const startTypewriter = () => {
      const typeNextChar = () => {
        if (currentIndex < fullText.length) {
          setDisplayedText(fullText.slice(0, currentIndex + 1))
          setCurrentIndex(currentIndex + 1)
          
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [fullText, speed, onComplete, startDelay, disabled, currentIndex])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    displayedText,
    isComplete,
    currentIndex
  }
}

export default useTypewriter
