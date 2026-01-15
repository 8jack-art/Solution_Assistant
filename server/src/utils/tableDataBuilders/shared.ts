/**
 * 共享工具函数
 */

/**
 * 安全解析 JSON 字符串
 */
export const safeParseJSON = (data: any): any => {
  if (!data) return null
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (e) {
      return null
    }
  }
  return data
}

/**
 * 安全获取原始数值（保留原始精度，不截断）
 */
export const formatNumber2 = (value: any): any => {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  const num = Number(value)
  if (isNaN(num)) {
    return ''
  }
  // 浮点数精度校正
  const corrected = parseFloat(num.toFixed(10))
  return corrected
}

/**
 * 安全获取字符串，空值返回空字符串
 * 兼容处理各种破折号变体
 */
export const formatString = (value: any): string => {
  if (value === null || value === undefined) return ''
  const str = String(value).replace(/[—–─━─﹘﹣－]/g, '')
  return str.trim() || ''
}
