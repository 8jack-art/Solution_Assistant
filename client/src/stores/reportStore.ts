import { create } from 'zustand'
import { reportApi, ReportVariable } from '../services/reportApi'

interface ReportTemplate {
  id: string
  name: string
  description?: string
  prompt_template: string
  is_default: boolean
  is_system: boolean
}

interface ReportHistoryItem {
  id: string
  title: string
  createdAt: string
  status: string
}

interface ReportState {
  // 报告信息
  reportId: string | null
  projectId: string | null
  reportTitle: string
  reportContent: string
  generationStatus: 'idle' | 'generating' | 'paused' | 'completed' | 'failed'
  
  // 提示词
  promptTemplate: string
  promptHtml: string
  
  // 模板
  templates: ReportTemplate[]
  selectedTemplateId: string | null
  
  // 变量
  availableVariables: ReportVariable[]
  projectData: any
  
  // 加载状态
  isLoading: boolean
  error: string | null
  
  // Actions
  setProjectId: (id: string) => void
  setReportTitle: (title: string) => void
  setPromptTemplate: (template: string) => void
  setPromptHtml: (html: string) => void
  selectTemplate: (templateId: string) => void
  
  loadTemplates: () => Promise<void>
  loadProjectData: () => Promise<void>
  startGeneration: () => Promise<void>
  pauseGeneration: () => Promise<void>
  resumeGeneration: () => Promise<void>
  stopGeneration: () => Promise<void>
  exportToWord: () => Promise<void>
  resetReport: () => void
}

export const useReportStore = create<ReportState>((set, get) => ({
  reportId: null,
  projectId: null,
  reportTitle: '投资项目方案报告',
  reportContent: '',
  generationStatus: 'idle',
  promptTemplate: '',
  promptHtml: '',
  templates: [],
  selectedTemplateId: null,
  availableVariables: [],
  projectData: null,
  isLoading: false,
  error: null,

  setProjectId: (id) => set({ projectId: id }),
  
  setReportTitle: (title) => set({ reportTitle: title }),
  
  setPromptTemplate: (template) => set({ promptTemplate: template }),
  
  setPromptHtml: (html) => set({ promptHtml: html }),
  
  selectTemplate: (templateId) => {
    const { templates } = get()
    const template = templates.find(t => t.id === templateId)
    if (template) {
      set({ 
        selectedTemplateId: templateId,
        promptTemplate: template.prompt_template,
        // 将纯文本转换为简单的 HTML 格式
        promptHtml: template.prompt_template.split('\n').map(p => `<p>${p}</p>`).join('')
      })
    }
  },

  loadTemplates: async () => {
    set({ isLoading: true, error: null })
    try {
      const templates = await reportApi.getTemplates()
      set({ templates, isLoading: false })
    } catch (error: any) {
      console.error('加载模板失败:', error)
      set({ error: error.message || '加载模板失败', isLoading: false })
    }
  },

  loadProjectData: async () => {
    const { projectId } = get()
    console.log('[ReportStore] loadProjectData called, projectId:', projectId)
    
    if (!projectId) {
      console.warn('[ReportStore] projectId is empty')
      set({ error: '缺少项目ID', isLoading: false })
      return
    }
    
    set({ isLoading: true, error: null })
    try {
      console.log('[ReportStore] Calling API to get project summary...')
      const data = await reportApi.getProjectSummary(projectId)
      console.log('[ReportStore] API response:', data)
      
      // 如果获取失败，使用空数据
      if (!data) {
        console.warn('[ReportStore] Failed to get project data, API returned null/undefined')
        set({ isLoading: false, error: '无法加载项目数据' })
        return
      }
      
      // 提取可用变量
      const variables: ReportVariable[] = [
        { key: '{{project_name}}', label: '项目名称', value: data.project?.name || '' },
        { key: '{{total_investment}}', label: '总投资额', value: data.project?.totalInvestment || 0 },
        { key: '{{construction_years}}', label: '建设期', value: data.project?.constructionYears || 0 },
        { key: '{{operation_years}}', label: '运营期', value: data.project?.operationYears || 0 },
        { key: '{{industry}}', label: '所属行业', value: data.project?.industry || '' },
        { key: '{{location}}', label: '项目地点', value: data.project?.location || '' },
        // 财务指标变量
        { key: '{{roi}}', label: '投资回报率', value: data.financialIndicators?.roi || 0 },
        { key: '{{irr}}', label: '内部收益率', value: data.financialIndicators?.irr || 0 },
        { key: '{{npv}}', label: '净现值', value: data.financialIndicators?.npv || 0 },
      ]
      
      set({ 
        projectData: data,
        availableVariables: variables,
        isLoading: false 
      })
    } catch (error: any) {
      console.error('[ReportStore] Error loading project data:', error)
      set({ error: error.message || '加载项目数据失败', isLoading: false })
    }
  },

  startGeneration: async () => {
    const { projectId, promptTemplate, reportTitle } = get()
    if (!projectId) {
      set({ error: '缺少项目ID' })
      return
    }
    
    if (!promptTemplate.trim()) {
      set({ error: '请输入提示词' })
      return
    }
    
    set({ isLoading: true, error: null, reportContent: '' })
    try {
      // 创建报告记录
      const { reportId } = await reportApi.createReport({
        projectId,
        title: reportTitle
      })
      
      set({ reportId, generationStatus: 'generating' })
      
      // 启动 SSE 流式生成
      await reportApi.generateReport(reportId, promptTemplate, {
        onChunk: (content) => {
          set((state) => ({
            reportContent: state.reportContent + content,
            generationStatus: 'generating'
          }))
        },
        onComplete: () => {
          set({ generationStatus: 'completed', isLoading: false })
        },
        onError: (error) => {
          set({ error, generationStatus: 'failed', isLoading: false })
        }
      })
    } catch (error: any) {
      console.error('生成报告失败:', error)
      set({ error: error.message || '生成报告失败', generationStatus: 'failed', isLoading: false })
    }
  },

  pauseGeneration: async () => {
    const { reportId } = get()
    if (!reportId) return
    
    try {
      await reportApi.pause(reportId)
      set({ generationStatus: 'paused' })
    } catch (error: any) {
      console.error('暂停失败:', error)
      set({ error: error.message })
    }
  },

  resumeGeneration: async () => {
    const { reportId } = get()
    if (!reportId) return
    
    try {
      await reportApi.resume(reportId)
      set({ generationStatus: 'generating' })
    } catch (error: any) {
      console.error('继续失败:', error)
      set({ error: error.message })
    }
  },

  stopGeneration: async () => {
    const { reportId } = get()
    if (!reportId) return
    
    try {
      await reportApi.stop(reportId)
      set({ generationStatus: 'idle', reportContent: '' })
    } catch (error: any) {
      console.error('停止失败:', error)
      set({ error: error.message })
    }
  },

  exportToWord: async () => {
    const { reportId } = get()
    if (!reportId) {
      set({ error: '请先生成报告' })
      return
    }
    
    try {
      await reportApi.exportWord(reportId)
    } catch (error: any) {
      console.error('导出失败:', error)
      set({ error: error.message || '导出失败' })
    }
  },

  resetReport: () => {
    set({
      reportId: null,
      reportContent: '',
      generationStatus: 'idle',
      error: null
    })
  }
}))
