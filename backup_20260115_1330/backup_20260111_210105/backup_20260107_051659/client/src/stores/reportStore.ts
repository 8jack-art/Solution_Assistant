import { create } from 'zustand'
import { reportApi } from '../services/reportApi'
import { 
  ReportVariable, 
  ReportTemplate, 
  ReportHistoryItem,
  ReportStyleConfig,
  defaultStyleConfig,
  ReportSections,
  defaultSections,
  CoverSection,
  TableOfContentsSection,
  BodySection,
  AppendixSection,
  ResourceMap,
  TableResource,
  ChartResource
} from '../types/report'
import { buildAllTableResources } from '../utils/tableResourceBuilder'

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
  projectOverview: string | null  // 项目概况
  
  // 加载状态
  isLoading: boolean
  error: string | null
  
  // 项目概况操作
  saveProjectOverview: (content: string) => Promise<void>
  loadProjectOverview: () => Promise<void>
  
  // 变量插入
  variableToInsert: string | null
  
  // 样式配置
  styleConfig: ReportStyleConfig
  styleConfigs: any[]
  
  // 章节配置
  sections: ReportSections
  
  // 资源（表格和图表）
  resources: ResourceMap
  
  // Actions
  setProjectId: (id: string) => void
  setReportTitle: (title: string) => void
  setPromptTemplate: (template: string) => void
  setPromptHtml: (html: string) => void
  selectTemplate: (templateId: string) => void
  setVariableToInsert: (variable: string | null) => void
  insertVariable: (variable: string) => void
  
  // 样式配置操作
  updateStyleConfig: (config: Partial<ReportStyleConfig>) => void
  resetStyleConfig: () => void
  saveStyleConfig: (name: string, isDefault?: boolean) => Promise<void>
  loadStyleConfigs: () => Promise<any[]>
  loadDefaultStyleConfig: () => Promise<void>
  deleteStyleConfig: (configId: string) => Promise<void>
  applyStyleConfig: (config: ReportStyleConfig) => void
  
  // 章节配置操作
  updateSections: (sections: Partial<ReportSections>) => void
  resetSections: () => void
  
  // 资源操作
  updateResources: (resources: Partial<ResourceMap>) => void
  
  loadTemplates: () => Promise<void>
  loadProjectData: () => Promise<void>
  saveTemplate: (data: { name: string; description?: string; promptTemplate: string; isDefault?: boolean }) => Promise<void>
  renameTemplate: (templateId: string, name: string) => Promise<void>
  updateTemplate: (templateId: string, data: { name?: string; description?: string; promptTemplate: string }) => Promise<void>
  deleteTemplate: (templateId: string) => Promise<void>
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
  projectOverview: null,
  isLoading: false,
  error: null,
  variableToInsert: null,
  styleConfig: defaultStyleConfig,
  styleConfigs: [],
  sections: defaultSections,
  resources: {
    tables: {},
    charts: {}
  },

  // 初始化时加载默认样式配置
  _init: async () => {
    await get().loadDefaultStyleConfig()
  },

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
  
  // 样式配置操作
  updateStyleConfig: (config) => set((state) => ({
    styleConfig: { ...state.styleConfig, ...config }
  })),
  
  resetStyleConfig: () => set({ styleConfig: defaultStyleConfig }),
  
  // 保存样式配置
  saveStyleConfig: async (name: string, isDefault: boolean = false) => {
    const { styleConfig } = get()
    set({ isLoading: true, error: null })
    try {
      const response = await reportApi.saveStyleConfig({
        name,
        config: styleConfig,
        isDefault
      })
      if (!response?.success) {
        throw new Error(response?.error || '保存样式失败')
      }
      // 重新加载样式列表
      await get().loadStyleConfigs()
      set({ isLoading: false })
    } catch (error: any) {
      console.error('保存样式失败:', error)
      set({ error: error.message || '保存样式失败', isLoading: false })
      throw error
    }
  },
  
  // 加载样式配置列表
  loadStyleConfigs: async () => {
    set({ isLoading: true, error: null })
    try {
      const configs = await reportApi.getStyleConfigs()
      set({ styleConfigs: configs, isLoading: false })
      return configs
    } catch (error: any) {
      console.error('加载样式列表失败:', error)
      set({ error: error.message || '加载样式列表失败', isLoading: false })
      return []
    }
  },
  
  // 加载默认样式配置
  loadDefaultStyleConfig: async () => {
    set({ isLoading: true, error: null })
    try {
      const defaultConfig = await reportApi.getDefaultStyleConfig()
      if (defaultConfig) {
        // 解析存储的配置
        let config = defaultConfig.config
        if (typeof config === 'string') {
          config = JSON.parse(config)
        }
        set({ styleConfig: config, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (error: any) {
      console.error('加载默认样式失败:', error)
      set({ error: error.message || '加载默认样式失败', isLoading: false })
    }
  },
  
  // 删除样式配置
  deleteStyleConfig: async (configId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await reportApi.deleteStyleConfig(configId)
      if (!response?.success) {
        throw new Error(response?.error || '删除样式失败')
      }
      // 重新加载样式列表
      await get().loadStyleConfigs()
      set({ isLoading: false })
    } catch (error: any) {
      console.error('删除样式失败:', error)
      set({ error: error.message || '删除样式失败', isLoading: false })
      throw error
    }
  },
  
  // 应用样式配置
  applyStyleConfig: (config: ReportStyleConfig) => {
    set({ styleConfig: config })
  },
  
  // 章节配置操作
  updateSections: (sections) => set((state) => ({
    sections: { ...state.sections, ...sections }
  })),
  
  resetSections: () => set({ sections: defaultSections }),
  
  // 资源操作
  updateResources: (resources) => set((state) => ({
    resources: { ...state.resources, ...resources }
  })),
  
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
  
  saveTemplate: async (data: { name: string; description?: string; promptTemplate: string; isDefault?: boolean }) => {
    set({ isLoading: true, error: null })
    try {
      const response = await reportApi.saveTemplate(data)
      if (response?.success) {
        await get().loadTemplates()
      } else {
        throw new Error(response?.error || '保存模板失败')
      }
    } catch (error: any) {
      console.error('保存模板失败:', error)
      set({ error: error.message || '保存模板失败', isLoading: false })
      throw error
    }
  },
  
  renameTemplate: async (templateId: string, name: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await reportApi.renameTemplate(templateId, name)
      if (response?.success) {
        await get().loadTemplates()
      } else {
        throw new Error(response?.error || '重命名模板失败')
      }
    } catch (error: any) {
      console.error('重命名模板失败:', error)
      set({ error: error.message || '重命名模板失败', isLoading: false })
      throw error
    }
  },
  
  updateTemplate: async (templateId: string, data: { name?: string; description?: string; promptTemplate: string }) => {
    set({ isLoading: true, error: null })
    try {
      const response = await reportApi.updateTemplate(templateId, data)
      if (response?.success) {
        await get().loadTemplates()
      } else {
        throw new Error(response?.error || '更新模板失败')
      }
    } catch (error: any) {
      console.error('更新模板失败:', error)
      set({ error: error.message || '更新模板失败', isLoading: false })
      throw error
    }
  },
  
  deleteTemplate: async (templateId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await reportApi.deleteTemplate(templateId)
      if (response?.success) {
        set((state) => ({
          selectedTemplateId: state.selectedTemplateId === templateId ? null : state.selectedTemplateId
        }))
        await get().loadTemplates()
      } else {
        throw new Error(response?.error || '删除模板失败')
      }
    } catch (error: any) {
      console.error('删除模板失败:', error)
      set({ error: error.message || '删除模板失败', isLoading: false })
      throw error
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
      
      // 获取项目数据
      if (!data) {
        console.warn('[ReportStore] Failed to get project data, API returned null/undefined')
        set({ isLoading: false, error: '无法加载项目数据' })
        return
      }
      
      // 提取内部数据对象
      const projectData = data.data || data
      console.log('[ReportStore] project data:', JSON.stringify(projectData, null, 2))
      
      // 提取可用变量（注意：project_overview 从 projectOverview 状态获取）
      const variables: ReportVariable[] = [
        { key: '{{project_name}}', label: '项目名称', value: projectData.project?.name || '' },
        // 移除 project_description，改为使用 project_overview 变量
        // { key: '{{project_description}}', label: '项目描述', value: projectData.project?.description || '' },
        { key: '{{construction_unit}}', label: '建设单位', value: projectData.project?.constructionUnit || '' },
        { key: '{{total_investment}}', label: '总投资额', value: projectData.project?.totalInvestment || 0 },
        { key: '{{construction_years}}', label: '建设期', value: projectData.project?.constructionYears || 0 },
        { key: '{{operation_years}}', label: '运营期', value: projectData.project?.operationYears || 0 },
        { key: '{{project_type}}', label: '项目类型', value: projectData.project?.project_type || '' },
        { key: '{{location}}', label: '项目地点', value: projectData.project?.location || '' },
        { key: '{{current_date}}', label: '当前日期', value: new Date().toLocaleDateString('zh-CN') },
        // 财务指标变量
        { key: '{{roi}}', label: '投资回报率', value: projectData.financialIndicators?.roi || 0 },
        { key: '{{irr}}', label: '内部收益率', value: projectData.financialIndicators?.irr || 0 },
        { key: '{{npv}}', label: '净现值', value: projectData.financialIndicators?.npv || 0 },
        // 表格变量
        { key: '{{TABLE:investment_estimate}}', label: '投资估算简表', category: 'table' },
        { key: '{{TABLE:revenue_cost_detail}}', label: '收入成本明细表', category: 'table' },
        { key: '{{TABLE:financial_indicators}}', label: '财务指标汇总表', category: 'table' },
        { key: '{{TABLE:loan_repayment}}', label: '还款计划表', category: 'table' },
        // 图表变量
        { key: '{{CHART:investment_composition}}', label: '投资构成图', category: 'chart' },
        { key: '{{CHART:revenue_trend}}', label: '收入趋势图', category: 'chart' },
        { key: '{{CHART:cost_trend}}', label: '成本趋势图', category: 'chart' },
        { key: '{{CHART:cash_flow_trend}}', label: '现金流趋势图', category: 'chart' },
        { key: '{{CHART:profit_analysis}}', label: '利润分析图', category: 'chart' },
      ]
      
      // 构建表格资源
      const tables = buildAllTableResources(projectData)
      console.log('[ReportStore] built tables:', JSON.stringify(tables, null, 2))
      
      set((state) => ({ 
        projectData: projectData,
        availableVariables: variables,
        resources: { ...state.resources, tables },
        isLoading: false 
      }))
      
      // 加载已保存的项目概况
      await get().loadProjectOverview()
    } catch (error: any) {
      console.error('[ReportStore] Error loading project data:', error)
      set({ error: error.message || '加载项目数据失败', isLoading: false })
    }
  },
  
  startGeneration: async () => {
    const { projectId, promptTemplate, reportTitle } = get()
    console.log('[ReportStore] startGeneration called')
    console.log('[ReportStore] projectId:', projectId)
    console.log('[ReportStore] promptTemplate length:', promptTemplate?.length || 0)
    console.log('[ReportStore] reportTitle:', reportTitle)
    
    if (!projectId) {
      console.error('[ReportStore] ERROR: projectId is empty')
      set({ error: '缺少项目ID' })
      return
    }
    
    if (!promptTemplate.trim()) {
      console.error('[ReportStore] ERROR: promptTemplate is empty')
      set({ error: '请输入提示词' })
      return
    }
    
    set({ isLoading: true, error: null, reportContent: '' })
    try {
      // 创建报告记录
      console.log('[ReportStore] Creating report...')
      const createResponse = await reportApi.createReport({
        projectId,
        title: reportTitle
      })
      
      console.log('[ReportStore] Create response:', JSON.stringify(createResponse, null, 2))
      
      // 兼容两种响应格式：
      // 1. {success: true, reportId: 'xxx'}
      // 2. {success: true, data: {reportId: 'xxx'}}
      const reportId = (createResponse.data?.reportId || createResponse.reportId) as string
      
      if (!createResponse || !reportId) {
        console.error('[ReportStore] ERROR: createResponse invalid', createResponse)
        throw new Error(createResponse?.error || '创建报告失败')
      }
      
      console.log('[ReportStore] Report created, id:', reportId)
      
      set({ reportId, generationStatus: 'generating' })
      
      // 启动 SSE 流式生成
      console.log('[ReportStore] Starting SSE generation...')
      await reportApi.generateReport(reportId, promptTemplate, {
        onChunk: (content: string) => {
          console.log('[ReportStore] onChunk received, length:', content.length)
          set((state) => ({
            reportContent: state.reportContent + content,
            generationStatus: 'generating'
          }))
        },
        onComplete: () => {
          console.log('[ReportStore] onComplete called')
          set({ generationStatus: 'completed', isLoading: false })
        },
        onError: (error: string) => {
          console.error('[ReportStore] onError called, error:', error)
          const errorMessage = error || '生成过程中发生错误'
          set({ error: errorMessage, generationStatus: 'failed', isLoading: false })
        }
      })
    } catch (error: any) {
      console.error('[ReportStore] 生成报告失败:', error)
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
    const { reportId, reportTitle, sections, styleConfig, resources, reportContent } = get()
    
    console.log('[exportToWord] resources:', JSON.stringify(resources, null, 2))
    console.log('[exportToWord] tables:', JSON.stringify(resources?.tables, null, 2))
    
    if (!reportId) {
      set({ error: '请先生成报告' })
      return
    }

    // 检查报告内容是否为空
    if (!reportContent || reportContent.trim() === '') {
      set({ error: '报告内容为空，请先生成报告' })
      return
    }

    try {
      // 构建包含报告内容的sections
      // 将第一个正文章节的内容替换为LLM生成的报告内容
      const sectionsWithContent = {
        ...sections,
        body: sections.body?.length > 0
          ? sections.body.map((section, index) =>
              index === 0 ? { ...section, content: reportContent } : section
            )
          : [{ id: 'main', title: '报告正文', content: reportContent, level: 1 }]
      }

      // 确保 resources 中的 tables 不为空
      const finalResources = {
        tables: resources?.tables || {},
        charts: resources?.charts || {}
      }
      
      console.log('[exportToWord] finalResources:', JSON.stringify(finalResources, null, 2))

      await reportApi.exportWord({
        title: reportTitle,
        sections: sectionsWithContent,
        styleConfig,
        resources: finalResources
      })
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
      error: null,
      variableToInsert: null,
      styleConfig: defaultStyleConfig,
      sections: defaultSections,
      resources: {
        tables: {},
        charts: {}
      },
      projectOverview: null
    })
  },
  
  setVariableToInsert: (variable) => set({ variableToInsert: variable }),
  
  insertVariable: (variable) => set({ variableToInsert: variable }),
  
  // 项目概况保存
  saveProjectOverview: async (content: string) => {
    const { projectId } = get()
    if (!projectId) throw new Error('缺少项目ID')
    
    set({ isLoading: true, error: null })
    try {
      const response = await reportApi.saveProjectOverview(projectId, content)
      if (response?.success) {
        set({ projectOverview: content, isLoading: false })
      } else {
        throw new Error(response?.error || '保存失败')
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  // 项目概况加载
  loadProjectOverview: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      const response = await reportApi.getProjectOverview(projectId)
      if (response?.success) {
        set({ projectOverview: response.data?.content || null })
      }
    } catch (error) {
      console.error('加载项目概况失败:', error)
    }
  },
}))
