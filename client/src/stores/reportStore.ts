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
  ChartResource,
  validateAndCompleteStyleConfig
} from '../types/report'
import { buildAllTableResources } from '../utils/tableResourceBuilder'
import { buildHtmlTemplate } from '../utils/htmlTemplateBuilder'
import { marked } from 'marked'

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
  customVariables: Record<string, string>  // 自定义变量 key -> value
  
  // 加载状态
  isLoading: boolean
  error: string | null
  
  // 项目概况操作
  saveProjectOverview: (content: string) => Promise<void>
  loadProjectOverview: () => Promise<void>
  
  // 自定义变量操作
  addCustomVariable: (key: string, value: string) => void
  removeCustomVariable: (key: string) => void
  updateCustomVariable: (key: string, value: string) => void
  clearCustomVariables: () => void
  
  // 变量插入
  variableToInsert: string | null
  
  // 样式配置
  styleConfig: ReportStyleConfig
  wordStyleConfig: ReportStyleConfig  // Word导出专用样式配置
  styleConfigs: any[]
  
  // 章节配置
  sections: ReportSections
  
  // 资源（表格和图表）
  resources: ResourceMap
  
  // 内部初始化方法
  _init: () => Promise<void>
  
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
  updateWordStyleConfig: (config: Partial<ReportStyleConfig>) => void
  resetStyleConfig: () => void
  resetWordStyleConfig: () => void
  saveStyleConfig: () => Promise<void>
  saveWordStyleConfig: () => Promise<void>
  saveStyleConfigWithParams: (name: string, isDefault?: boolean) => Promise<void>
  loadStyleConfigs: () => Promise<any[]>
  loadDefaultStyleConfig: () => Promise<void>
  loadDefaultWordStyleConfig: () => Promise<void>
  deleteStyleConfig: (configId: string) => Promise<void>
  applyStyleConfig: (config: ReportStyleConfig) => void
  applyWordStyleConfig: (config: ReportStyleConfig) => void
  
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
  wordStyleConfig: defaultStyleConfig,
  styleConfigs: [],
  sections: defaultSections,
  resources: {
    tables: {},
    charts: {}
  },
  customVariables: {},

  // 自定义变量操作实现
  addCustomVariable: (key: string, value: string) => {
    set((state) => ({
      customVariables: { ...state.customVariables, [key]: value }
    }))
  },
  
  removeCustomVariable: (key: string) => {
    set((state) => {
      const newVariables = { ...state.customVariables }
      delete newVariables[key]
      return { customVariables: newVariables }
    })
  },
  
  updateCustomVariable: (key: string, value: string) => {
    set((state) => ({
      customVariables: { ...state.customVariables, [key]: value }
    }))
  },
  
  clearCustomVariables: () => {
    set({ customVariables: {} })
  },

  // 初始化时加载默认样式配置
  _init: async () => {
    await get().loadDefaultStyleConfig()
    await get().loadDefaultWordStyleConfig()
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
  
  updateWordStyleConfig: (config) => set((state) => ({
    wordStyleConfig: { ...state.wordStyleConfig, ...config }
  })),
  
  resetStyleConfig: () => set({ styleConfig: defaultStyleConfig }),
  
  resetWordStyleConfig: () => set({ wordStyleConfig: defaultStyleConfig }),
  
  // 保存预览样式配置
  saveStyleConfig: async () => {
    const { styleConfig } = get()
    set({ isLoading: true, error: null })
    try {
      const completeConfig = validateAndCompleteStyleConfig(styleConfig)
      console.log('[saveStyleConfig] 准备保存预览样式配置:', JSON.stringify(completeConfig, null, 2))
      
      const response = await reportApi.saveStyleConfig({
        name: '预览样式',
        config: completeConfig,
        isDefault: true,
        configType: 'preview'
      })
      
      console.log('[saveStyleConfig] API响应:', JSON.stringify(response, null, 2))
      
      if (!response?.success) {
        throw new Error(response?.error || '保存预览样式失败')
      }
      await get().loadStyleConfigs()
      set({ isLoading: false, styleConfig: completeConfig })
      console.log('[saveStyleConfig] 保存成功')
    } catch (error: any) {
      console.error('保存预览样式失败:', error)
      set({ error: error.message || '保存预览样式失败', isLoading: false })
      throw error
    }
  },
  
  // 保存Word样式配置
  saveWordStyleConfig: async () => {
    const { wordStyleConfig } = get()
    set({ isLoading: true, error: null })
    try {
      const completeConfig = validateAndCompleteStyleConfig(wordStyleConfig)
      console.log('[saveWordStyleConfig] 准备保存Word样式配置:', JSON.stringify(completeConfig, null, 2))
      
      const response = await reportApi.saveStyleConfig({
        name: 'Word样式',
        config: completeConfig,
        isDefault: true,
        configType: 'word'
      })
      
      console.log('[saveWordStyleConfig] API响应:', JSON.stringify(response, null, 2))
      
      if (!response?.success) {
        throw new Error(response?.error || '保存Word样式失败')
      }
      await get().loadStyleConfigs()
      set({ isLoading: false, wordStyleConfig: completeConfig })
      console.log('[saveWordStyleConfig] 保存成功')
    } catch (error: any) {
      console.error('保存Word样式失败:', error)
      set({ error: error.message || '保存Word样式失败', isLoading: false })
      throw error
    }
  },
  
  // 保存样式配置（带参数版本）
  saveStyleConfigWithParams: async (name: string, isDefault: boolean = false) => {
    const { styleConfig } = get()
    set({ isLoading: true, error: null })
    try {
      const completeConfig = validateAndCompleteStyleConfig(styleConfig)
      const response = await reportApi.saveStyleConfig({
        name,
        config: completeConfig,
        isDefault
      })
      if (!response?.success) {
        throw new Error(response?.error || '保存样式失败')
      }
      await get().loadStyleConfigs()
      set({ isLoading: false, styleConfig: completeConfig })
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
  
  // 加载默认预览样式配置
  loadDefaultStyleConfig: async () => {
    set({ isLoading: true, error: null })
    try {
      const defaultConfig = await reportApi.getDefaultStyleConfig('preview')
      if (defaultConfig) {
        let config = defaultConfig.config
        if (typeof config === 'string') {
          config = JSON.parse(config)
        }
        const completeConfig = validateAndCompleteStyleConfig(config)
        set({ styleConfig: completeConfig, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (error: any) {
      console.error('加载默认预览样式失败:', error)
      set({ error: error.message || '加载默认预览样式失败', isLoading: false })
    }
  },
  
  // 加载默认Word样式配置
  loadDefaultWordStyleConfig: async () => {
    set({ isLoading: true, error: null })
    try {
      const defaultConfig = await reportApi.getDefaultStyleConfig('word')
      if (defaultConfig) {
        let config = defaultConfig.config
        if (typeof config === 'string') {
          config = JSON.parse(config)
        }
        const completeConfig = validateAndCompleteStyleConfig(config)
        set({ wordStyleConfig: completeConfig, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (error: any) {
      console.error('加载默认Word样式失败:', error)
      set({ error: error.message || '加载默认Word样式失败', isLoading: false })
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
      await get().loadStyleConfigs()
      set({ isLoading: false })
    } catch (error: any) {
      console.error('删除样式失败:', error)
      set({ error: error.message || '删除样式失败', isLoading: false })
      throw error
    }
  },
  
  // 应用预览样式配置
  applyStyleConfig: (config: ReportStyleConfig) => {
    set({ styleConfig: config })
  },
  
  // 应用Word样式配置
  applyWordStyleConfig: (config: ReportStyleConfig) => {
    set({ wordStyleConfig: config })
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
      
      if (!data) {
        console.warn('[ReportStore] Failed to get project data, API returned null/undefined')
        set({ isLoading: false, error: '无法加载项目数据' })
        return
      }
      
      const projectData = data.data || data
      console.log('[ReportStore] project data:', JSON.stringify(projectData, null, 2))
      
      const variables: ReportVariable[] = [
        { key: '{{project_name}}', label: '项目名称', value: projectData.project?.name || '' },
        { key: '{{construction_unit}}', label: '建设单位', value: projectData.project?.constructionUnit || '' },
        { key: '{{total_investment}}', label: '总投资额', value: projectData.project?.totalInvestment || 0 },
        { key: '{{construction_years}}', label: '建设期', value: projectData.project?.constructionYears || 0 },
        { key: '{{operation_years}}', label: '运营期', value: projectData.project?.operationYears || 0 },
        { key: '{{project_type}}', label: '项目类型', value: projectData.project?.project_type || '' },
        { key: '{{location}}', label: '项目地点', value: projectData.project?.location || '' },
        { key: '{{current_date}}', label: '当前日期', value: new Date().toLocaleDateString('zh-CN') },
        { key: '{{roi}}', label: '投资回报率', value: projectData.financialIndicators?.roi || 0 },
        { key: '{{irr}}', label: '内部收益率', value: projectData.financialIndicators?.irr || 0 },
        { key: '{{npv}}', label: '净现值', value: projectData.financialIndicators?.npv || 0 },
        // 表格数据（JSON格式，用于LLM提示词）
        { key: '{{DATA:investment_estimate}}', label: '投资估算简表JSON', category: 'tableData' },
        { key: '{{DATA:depreciation_amortization}}', label: '折旧与摊销估算表JSON', category: 'tableData' },
        { key: '{{DATA:revenue_tax}}', label: '营业收入税金及附加估算表JSON', category: 'tableData' },
        { key: '{{DATA:raw_materials}}', label: '外购原材料费估算表JSON', category: 'tableData' },
        { key: '{{DATA:fuel_power}}', label: '外购燃料和动力费估算表JSON', category: 'tableData' },
        { key: '{{DATA:profit_distribution}}', label: '利润与利润分配表JSON', category: 'tableData' },
        { key: '{{DATA:project_cash_flow}}', label: '项目投资现金流量表JSON', category: 'tableData' },
        { key: '{{DATA:financial_indicators}}', label: '财务计算指标表JSON', category: 'tableData' },
        { key: '{{DATA:loan_repayment}}', label: '借款还本付息计划表JSON', category: 'tableData' },
        { key: '{{DATA:financial_summary}}', label: '财务评价指标汇总表JSON', category: 'tableData' },
        // 表格资源（渲染HTML）
        { key: '{{TABLE:investment_estimate}}', label: '投资估算简表', category: 'table' },
        { key: '{{TABLE:revenue_cost_detail}}', label: '收入成本明细表', category: 'table' },
        { key: '{{TABLE:financial_indicators}}', label: '财务指标汇总表', category: 'table' },
        { key: '{{TABLE:loan_repayment}}', label: '还款计划表', category: 'table' },
        // 图表资源
        { key: '{{CHART:investment_composition}}', label: '投资构成图', category: 'chart' },
        { key: '{{CHART:revenue_trend}}', label: '收入趋势图', category: 'chart' },
        { key: '{{CHART:cost_trend}}', label: '成本趋势图', category: 'chart' },
        { key: '{{CHART:cash_flow_trend}}', label: '现金流趋势图', category: 'chart' },
        { key: '{{CHART:profit_analysis}}', label: '利润分析图', category: 'chart' },
      ]
      
      const tables = buildAllTableResources(projectData)
      console.log('[ReportStore] built tables:', JSON.stringify(tables, null, 2))
      
      set((state) => ({ 
        projectData: projectData,
        availableVariables: variables,
        resources: { ...state.resources, tables },
        isLoading: false 
      }))
      
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
      console.log('[ReportStore] Creating report...')
      const createResponse = await reportApi.createReport({
        projectId,
        title: reportTitle
      })
      
      console.log('[ReportStore] Create response:', JSON.stringify(createResponse, null, 2))
      
      const createResponseAny = createResponse as any
      const reportId = (createResponseAny.data?.reportId || createResponseAny.reportId) as string
      
      if (!createResponse || !reportId) {
        console.error('[ReportStore] ERROR: createResponse invalid', createResponse)
        throw new Error(createResponse?.error || '创建报告失败')
      }
      
      console.log('[ReportStore] Report created, id:', reportId)
      
      set({ reportId, generationStatus: 'generating' })
      
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
    const { reportId, reportTitle, reportContent, wordStyleConfig, resources } = get()
    
    console.log('[exportToWord] 开始导出Word文档')
    console.log('[exportToWord] reportId:', reportId)
    console.log('[exportToWord] wordStyleConfig:', JSON.stringify(wordStyleConfig, null, 2))
    console.log('[exportToWord] resources:', JSON.stringify(resources, null, 2))
    
    if (!reportId) {
      set({ error: '请先生成报告' })
      return
    }

    try {
      // 先加载最新的Word样式配置
      console.log('[exportToWord] 加载最新Word样式配置...')
      await get().loadDefaultWordStyleConfig()
      
      const { wordStyleConfig: config } = get()
      console.log('[exportToWord] 加载后的wordStyleConfig:', JSON.stringify(config, null, 2))
      
      let content = reportContent
      if (!content || content.trim() === '' || content === '<p></p>') {
        console.log('[exportToWord] 前端 reportContent 为空，尝试从数据库获取...')
        try {
          const response = await reportApi.getReport(reportId)
          const reportData = (response as any).data?.report || (response as any).report
          if (reportData?.report_content) {
            content = reportData.report_content
            console.log('[exportToWord] 从数据库获取到报告内容，长度:', content.length)
            set({ reportContent: content })
          }
        } catch (e) {
          console.error('[exportToWord] 获取报告内容失败:', e)
        }
      }

      if (!content || content.trim() === '' || content === '<p></p>') {
        set({ error: '报告内容为空，请先生成报告' })
        return
      }

      let htmlContent = content
      const isMarkdown = content.startsWith('#') || /^#{1,6}\s/.test(content) || content.includes('**') || content.includes('\n- ')
      console.log('[exportToWord] 是否为Markdown格式:', isMarkdown)
      
      if (isMarkdown) {
        try {
          const result = await marked.parse(content)
          htmlContent = typeof result === 'string' ? result : String(result)
          console.log('[exportToWord] Markdown转换为HTML成功，转换后长度:', htmlContent.length)
        } catch (e) {
          console.error('[exportToWord] Markdown转换失败:', e)
        }
      } else {
        console.log('[exportToWord] 内容已是HTML格式，直接使用')
      }
      
      console.log('[exportToWord] 使用html-to-docx导出')
      
      const completeConfig = validateAndCompleteStyleConfig(config)
      console.log('[exportToWord] completeConfig:', JSON.stringify(completeConfig, null, 2))
      
      // 传递表格和图表资源用于变量替换
      await reportApi.exportHtml({
        title: reportTitle,
        htmlContent,
        styleConfig: completeConfig,
        resources
      })
      
      console.log('[exportToWord] Word导出成功')
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
      wordStyleConfig: defaultStyleConfig,
      sections: defaultSections,
      resources: {
        tables: {},
        charts: {}
      },
      projectOverview: null,
      customVariables: {}
    })
  },
  
  setVariableToInsert: (variable) => set({ variableToInsert: variable }),
  
  insertVariable: (variable) => set({ variableToInsert: variable }),
  
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
