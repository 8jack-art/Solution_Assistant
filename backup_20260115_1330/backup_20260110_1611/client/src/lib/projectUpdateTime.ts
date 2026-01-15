/**
 * 项目修改时间管理工具
 * 使用localStorage缓存各项目的最后修改时间
 */

// 缓存键前缀
const CACHE_KEY_PREFIX = 'project_update_time_'

/**
 * 设置项目的最后修改时间为当前系统时间
 * @param projectId 项目ID
 */
export const setProjectUpdateTime = (projectId: string): void => {
  if (!projectId) return
  const key = `${CACHE_KEY_PREFIX}${projectId}`
  const now = new Date().toISOString()
  localStorage.setItem(key, now)
  console.log(`[项目修改时间] 已更新项目 ${projectId} 的修改时间: ${now}`)
}

/**
 * 获取项目的最后修改时间
 * @param projectId 项目ID
 * @returns ISO格式的时间字符串，如果没有记录则返回null
 */
export const getProjectUpdateTime = (projectId: string): string | null => {
  if (!projectId) return null
  const key = `${CACHE_KEY_PREFIX}${projectId}`
  return localStorage.getItem(key)
}

/**
 * 删除项目的修改时间记录
 * @param projectId 项目ID
 */
export const clearProjectUpdateTime = (projectId: string): void => {
  if (!projectId) return
  const key = `${CACHE_KEY_PREFIX}${projectId}`
  localStorage.removeItem(key)
}

/**
 * 清除所有项目的修改时间记录
 */
export const clearAllProjectUpdateTime = (): void => {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key))
  console.log(`[项目修改时间] 已清除 ${keysToRemove.length} 个项目的修改时间记录`)
}
