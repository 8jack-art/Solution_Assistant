import api from '../lib/api'
import { ApiResponse } from '../types'
import { 
  ExportRequest,
  ReportSections,
  ReportStyleConfig,
  ResourceMap
} from '../types/report'

export interface ReportVariable {
  key: string
  label: string
  value?: string
  category?: 'basic' | 'table' | 'chart'
}

export const reportApi = {
  // 创建报告
  async createReport(data: { projectId: string; templateId?: string; title: string }) {
    const response = await api.post<any, ApiResponse<{ reportId: string }>>('/report/create', data)
    return response
  },

  // 启动流式生成
  async generateReport(
    reportId: string,
    promptTemplate: string,
    handlers: {
      onChunk: (content: string) => void
      onComplete: () => void
      onError: (error: string) => void
    }
  ) {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/report/generate/${reportId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ promptTemplate })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || '生成失败')
    }

    if (!response.body) {
      throw new Error('无法读取响应流')
    }

    const reader = response.body.getReader()
    if (!reader) throw new Error('无法读取响应流')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          handlers.onComplete()
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)

              if (parsed.type === 'content') {
                handlers.onChunk(parsed.content || '')
              } else if (parsed.type === 'error') {
                handlers.onError(parsed.error || '生成失败')
              } else if (parsed.type === 'completed') {
                handlers.onComplete()
              } else if (parsed.status === 'failed') {
                handlers.onError(parsed.error || '生成失败')
              } else if (parsed.status === 'completed') {
                handlers.onComplete()
              }
            } catch {
              handlers.onChunk(data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },

  // 获取报告详情
  async getReport(reportId: string) {
    const response = await api.get<any, ApiResponse<{ report: any }>>(`/report/${reportId}`)
    return response
  },

  // 获取项目报告列表
  async getProjectReports(projectId: string) {
    const response = await api.get<any, ApiResponse<{ reports: any[] }>>(`/report/project/${projectId}`)
    return response
  },

  // 暂停生成
  async pause(reportId: string) {
    const response = await api.post<any, ApiResponse>(`/report/pause/${reportId}`)
    return response
  },

  // 继续生成
  async resume(reportId: string) {
    const response = await api.post<any, ApiResponse>(`/report/resume/${reportId}`)
    return response
  },

  // 停止生成
  async stop(reportId: string) {
    const response = await api.post<any, ApiResponse>(`/report/stop/${reportId}`)
    return response
  },

  // 导出 Word（支持章节、样式和资源）
  async exportWord(options: {
    title?: string
    sections?: ReportSections
    styleConfig?: ReportStyleConfig
    resources?: ResourceMap
  }) {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/report/export-with-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: options.title || '投资方案报告',
        sections: options.sections,
        styleConfig: options.styleConfig,
        resources: options.resources
      })
    })

    if (!response.ok) {
      throw new Error('导出失败')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${options.title || '投资方案报告'}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  // 导出 Word（从HTML内容导出，适用于所见即所得编辑器）
  async exportHtml(options: {
    title?: string
    htmlContent: string
    styleConfig?: ReportStyleConfig
  }) {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/report/export-html`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: options.title || '投资方案报告',
        htmlContent: options.htmlContent,
        styleConfig: options.styleConfig
      })
    })

    if (!response.ok) {
      throw new Error('导出失败')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${options.title || '投资方案报告'}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  // ==================== 样式配置 API ====================
  
  // 获取样式配置列表
  async getStyleConfigs() {
    const response = await api.get<any, ApiResponse<{ configs: any[] }>>('/report/styles')
    if (!response || !response.success) {
      return []
    }
    return (response as any).configs || []
  },

  // 获取默认样式配置
  async getDefaultStyleConfig() {
    const response = await api.get<any, ApiResponse<{ config: any }>>('/report/styles/default')
    if (!response || !response.success) {
      return null
    }
    return (response as any).config
  },

  // 保存样式配置
  async saveStyleConfig(data: { name: string; config: ReportStyleConfig; isDefault?: boolean }) {
    const response = await api.post<any, ApiResponse<{ configId: string }>>('/report/styles', data)
    return response
  },

  // 删除样式配置
  async deleteStyleConfig(configId: string) {
    const response = await api.delete<any, ApiResponse>(`/report/styles/${configId}`)
    return response
  },

  // ==================== 模板管理 API ====================

  // 获取模板列表
  async getTemplates() {
    const response = await api.get<any, ApiResponse<any>>('/report/templates')
    // 处理错误响应
    if (!response || !response.success) {
      console.warn('获取模板列表失败:', response?.error)
      return []
    }
    return (response as any).templates || []
  },

  // 保存模板
  async saveTemplate(data: { name: string; description?: string; promptTemplate: string; isDefault?: boolean }) {
    const response = await api.post<any, ApiResponse<{ templateId: string }>>('/report/templates', data)
    return response
  },

  // 更新模板
  async updateTemplate(templateId: string, data: { name?: string; description?: string; promptTemplate: string }) {
    const response = await api.put<any, ApiResponse>(`/report/templates/${templateId}`, data)
    return response
  },

  // 重命名模板
  async renameTemplate(templateId: string, name: string) {
    const response = await api.patch<any, ApiResponse>(`/report/templates/${templateId}`, { name })
    return response
  },

  // 删除模板
  async deleteTemplate(templateId: string) {
    const response = await api.delete<any, ApiResponse>(`/report/templates/${templateId}`)
    return response
  },

  // 获取项目汇总数据（用于变量替换）
  async getProjectSummary(projectId: string) {
    console.log('[reportApi] Calling getProjectSummary for projectId:', projectId)
    try {
      const response = await api.get<any, ApiResponse<any>>(`/report/project/summary/${projectId}`)
      console.log('[reportApi] Full API response:', JSON.stringify(response, null, 2))

      // 处理错误响应
      if (!response || !response.success) {
        console.warn('[reportApi] API returned error:', response?.error)
        return null
      }
      return (response as any).data
    } catch (error: any) {
      console.error('[reportApi] Exception while getting project summary:', error)
      return null
    }
  },

  // ==================== 项目概况 API ====================

  // 保存项目概况
  async saveProjectOverview(projectId: string, content: string) {
    const response = await api.post<any, ApiResponse>('/report/project/overview', {
      projectId,
      content
    })
    return response
  },

  // 获取项目概况
  async getProjectOverview(projectId: string) {
    const response = await api.get<any, ApiResponse<{ content: string }>>(`/report/project/overview/${projectId}`)
    return response
  },

  // 生成项目概况（大模型SSE流式调用）
  async generateProjectOverview(
    projectId: string,
    prompt: string,
    handlers: {
      onChunk: (content: string) => void
      onComplete: () => void
      onError: (error: string) => void
    }
  ) {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/report/generate/overview/${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || '生成失败')
    }

    if (!response.body) {
      throw new Error('无法读取响应流')
    }

    const reader = response.body.getReader()
    if (!reader) throw new Error('无法读取响应流')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          handlers.onComplete()
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)

              if (parsed.type === 'content') {
                handlers.onChunk(parsed.content || '')
              } else if (parsed.type === 'error') {
                handlers.onError(parsed.error || '生成失败')
              } else if (parsed.type === 'completed') {
                handlers.onComplete()
              }
            } catch {
              handlers.onChunk(data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },

  // 生成项目概况（非流式，生成完成后再返回结果）
  async generateProjectOverviewNonStream(projectId: string, prompt: string): Promise<{ success: boolean; content?: string; error?: string }> {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/report/generate/overview-nonstream/${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.error || '生成失败' }
    }

    const data = await response.json()
    if (data.success) {
      return { success: true, content: data.content }
    } else {
      return { success: false, error: data.error || '生成失败' }
    }
  }
}
