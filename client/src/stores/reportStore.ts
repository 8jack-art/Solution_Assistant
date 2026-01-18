import { create } from 'zustand'
import { reportApi } from '../services/reportApi'
import { 
  ReportVariable, 
  ReportTemplate, 
  ReportHistoryItem,
  ReportStyleConfig,
  defaultStyleConfig,
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
  customVariablesByProject: Record<string, Record<string, string>>  // 自定义变量按项目ID隔离
  cachedTableDataJSON: Record<string, Record<string, string>>  // 缓存的表格数据JSON（用于LLM提示词），按项目ID隔离
  
  // 加载状态
  isLoading: boolean
  error: string | null
  
  // 项目概况操作
  saveProjectOverview: (content: string) => Promise<void>
  loadProjectOverview: () => Promise<void>
  
  // 自定义变量操作（按项目隔离）
  getCustomVariables: () => Record<string, string>
  addCustomVariable: (key: string, value: string) => void
  removeCustomVariable: (key: string) => void
  updateCustomVariable: (key: string, value: string) => void
  clearCustomVariables: () => void
  saveCustomVariables: () => Promise<void>
  loadCustomVariables: () => Promise<void>
  
  // 变量插入
  variableToInsert: string | null
  
  // 样式配置
  styleConfig: ReportStyleConfig
  wordStyleConfig: ReportStyleConfig  // Word导出专用样式配置
  styleConfigs: any[]
  
  // 资源（表格和图表）
  resources: ResourceMap
  
  // 内部初始化方法
  _init: () => Promise<void>
  
  // Actions
  setProjectId: (id: string) => void
  setReportId: (id: string | null) => void
  setReportTitle: (title: string) => void
  setReportContent: (content: string) => void
  setGenerationStatus: (status: 'idle' | 'generating' | 'paused' | 'completed' | 'failed') => void
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
   
  // 资源操作
  updateResources: (resources: Partial<ResourceMap>) => void
   
  // 缓存表格数据JSON（按项目ID隔离）
  getCachedTableDataJSON: () => Record<string, string>
   
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
  resources: {
    tables: {},
    charts: {}
  },
  customVariablesByProject: {},
  cachedTableDataJSON: {},

  // 获取当前项目的自定义变量
  getCustomVariables: () => {
    const { customVariablesByProject, projectId } = get()
    if (!projectId) return {}
    return (customVariablesByProject || {})[projectId] || {}
  },

  // 自定义变量操作实现（按项目隔离）
  addCustomVariable: (key: string, value: string) => {
    const { projectId, customVariablesByProject } = get()
    if (!projectId) return
    set((state) => ({
      customVariablesByProject: {
        ...state.customVariablesByProject,
        [projectId]: {
          ...((state.customVariablesByProject || {})[projectId] || {}),
          [key]: value
        }
      }
    }))
  },
  
  removeCustomVariable: (key: string) => {
    const { projectId, customVariablesByProject } = get()
    if (!projectId) return
    set((state) => {
      const projectVariables = { ...((state.customVariablesByProject || {})[projectId] || {}) }
      delete projectVariables[key]
      return {
        customVariablesByProject: {
          ...state.customVariablesByProject,
          [projectId]: projectVariables
        }
      }
    })
  },
  
  updateCustomVariable: (key: string, value: string) => {
    const { projectId, customVariablesByProject } = get()
    if (!projectId) return
    set((state) => ({
      customVariablesByProject: {
        ...state.customVariablesByProject,
        [projectId]: {
          ...((state.customVariablesByProject || {})[projectId] || {}),
          [key]: value
        }
      }
    }))
  },
  
  clearCustomVariables: () => {
    const { projectId, customVariablesByProject } = get()
    if (!projectId) return
    set((state) => ({
      customVariablesByProject: {
        ...state.customVariablesByProject,
        [projectId]: {}
      }
    }))
  },

  // 保存自定义变量到后端
  saveCustomVariables: async () => {
    const { projectId, customVariablesByProject } = get()
    if (!projectId) {
      throw new Error('缺少项目ID')
    }
    
    const customVariables = (customVariablesByProject || {})[projectId] || {}
    
    set({ isLoading: true, error: null })
    try {
      const response = await reportApi.saveCustomVariables(projectId, customVariables)
      if (response?.success) {
        set({ isLoading: false })
      } else {
        throw new Error(response?.error || '保存自定义变量失败')
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // 从后端加载自定义变量
  loadCustomVariables: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      const response = await reportApi.getProjectOverview(projectId)
      if (response?.success) {
        const customVariables = response.data?.customVariables || {}
        set((state) => ({
          customVariablesByProject: {
            ...state.customVariablesByProject,
            [projectId]: customVariables
          }
        }))
      }
    } catch (error) {
      console.error('加载自定义变量失败:', error)
    }
  },

  // 初始化时加载默认样式配置
  _init: async () => {
    await get().loadDefaultStyleConfig()
    await get().loadDefaultWordStyleConfig()
  },

  setProjectId: (id) => set((state) => {
    // 切换项目时，清理非当前项目的缓存，避免变量串用
    const newCachedTableDataJSON: Record<string, Record<string, string>> = {}
    if (state.cachedTableDataJSON[id]) {
      newCachedTableDataJSON[id] = state.cachedTableDataJSON[id]
    }
    return { 
      projectId: id,
      cachedTableDataJSON: newCachedTableDataJSON
    }
  }),
  
  setReportId: (id) => set({ reportId: id }),
  
  setReportTitle: (title) => set({ reportTitle: title }),
  
  setReportContent: (content) => set({ reportContent: content }),
  
  setGenerationStatus: (status) => set({ generationStatus: status }),
  
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
      
      const response = await reportApi.saveStyleConfig({
        name: '预览样式',
        config: completeConfig,
        isDefault: true,
        configType: 'preview'
      })
      
      if (!response?.success) {
        throw new Error(response?.error || '保存预览样式失败')
      }
      await get().loadStyleConfigs()
      set({ isLoading: false, styleConfig: completeConfig })
    } catch (error: any) {
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
      
      const response = await reportApi.saveStyleConfig({
        name: 'Word样式',
        config: completeConfig,
        isDefault: true,
        configType: 'word'
      })
      
      if (!response?.success) {
        throw new Error(response?.error || '保存Word样式失败')
      }
      await get().loadStyleConfigs()
      set({ isLoading: false, wordStyleConfig: completeConfig })
    } catch (error: any) {
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
    
    if (!projectId) {
      set({ error: '缺少项目ID', isLoading: false })
      return
    }
    
    set({ isLoading: true, error: null })
    try {
      // 从 localStorage 读取基准收益率
      const preTaxRateStr = localStorage.getItem(`financialIndicatorsPreTaxRate_${projectId}`)
      const postTaxRateStr = localStorage.getItem(`financialIndicatorsPostTaxRate_${projectId}`)
      
      // 确保基准收益率始终有默认值（6%），避免首次加载时数据为空
      const discountRates = {
        preTaxRate: preTaxRateStr ? parseFloat(preTaxRateStr) : 6,
        postTaxRate: postTaxRateStr ? parseFloat(postTaxRateStr) : 6
      }
      
      console.log('[reportStore] 从localStorage读取基准收益率:', discountRates)
      
      const data = await reportApi.getProjectSummary(projectId, discountRates)
      
      if (!data) {
        set({ isLoading: false, error: '无法加载项目数据' })
        return
      }
      
      // API 返回的数据结构：{ success: true, data: { project, investment, revenueCost, financialIndicators, tableDataJSON } }
      const apiData = data.data || data
      
      // 构建 projectData（包含 tableDataJSON，由服务器端 buildAllTableDataJSON 生成）
      const projectData = {
        ...apiData,
        tableDataJSON: apiData.tableDataJSON || {}
      }
      
      // 直接使用 API 返回的 tableDataJSON
      const tableDataJSON = projectData.tableDataJSON
      
      // 【修复】将 {{repair_rate}} 变量也存入 tableDataJSON，确保后端使用前端计算的值
      const repairRateValue = (() => {
        const depAmort = projectData.revenueCost?.depreciationAmortization || {}
        const costConfig = projectData.revenueCost?.costConfig?.repair || {}
        const constructionInterest = projectData.investment?.partF?.合计 || 0
        
        const valueA = depAmort.A?.原值 || 0
        const valueD = depAmort.D?.原值 || 0
        const fixedAssetsOriginalValue = valueA + valueD
        const fixedAssetsInvestment = Math.max(0, fixedAssetsOriginalValue - constructionInterest)
        
        const annualRepairCost = costConfig.type === 'percentage' 
          ? fixedAssetsInvestment * (costConfig.percentageOfFixedAssets || 0) / 100
          : (costConfig.directAmount || 0)
        
        return JSON.stringify({
          标题: '修理费估算表',
          计算方式: costConfig.type === 'percentage' ? '按固定资产投资百分比' : '固定金额',
          '固定资产投资额（万元）': fixedAssetsInvestment,
          '固定资产修理费率（%）': costConfig.percentageOfFixedAssets || 0,
          '固定金额（万元）': costConfig.directAmount || 0,
          '年修理费（万元）': annualRepairCost,
          说明: costConfig.type === 'percentage' 
            ? `固定资产修理费率取${costConfig.percentageOfFixedAssets || 0}%`
            : `每年固定 ${costConfig.directAmount || 0} 万元`
        }, null, 2)
      })()
      
      // 将 repair_rate 存入 tableDataJSON
      tableDataJSON['repair_rate'] = repairRateValue
      
      // 【新增】构建 land_transfer 变量（土地流转信息）
      const otherExpenses = projectData.revenueCost?.costConfig?.otherExpenses || {}
      const hasLandTransfer = (otherExpenses.name || '').includes('土地') || 
                              (otherExpenses.name || '').includes('流转')
      const landTransferValue = hasLandTransfer 
        ? JSON.stringify({
            name: otherExpenses.name,
            remark: otherExpenses.remark || ''
          }, null, 2)
        : JSON.stringify({ name: 'ABCD', remark: '' }, null, 2)  // 如果不包含"土地"或"流转"关键词，则赋值为JSON格式的ABCD
      tableDataJSON['land_transfer'] = landTransferValue
      
      // 【新增】构建 project_overview 变量（项目概况）
      const projectOverviewValue = projectData.projectOverview 
        ? JSON.stringify({ content: projectData.projectOverview }, null, 2)
        : 'null'
      tableDataJSON['project_overview'] = projectOverviewValue
      
      // 【新增】构建 operation_load 变量（运营负荷）
      const productionRates = projectData.revenueCost?.productionRates || []
      const operationLoadValue = JSON.stringify(
        productionRates.map((p: any) => ({
          year: p.yearIndex,
          rate: `${((p.rate || 0) * 100).toFixed(0)}%`
        })),
        null,
        2
      )
      tableDataJSON['operation_load'] = operationLoadValue
      
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
        { key: '{{repair_rate}}', label: '修理费率', category: 'tableData', value: (() => {
          const depAmort = projectData.revenueCost?.depreciationAmortization || {}
          const costConfig = projectData.revenueCost?.costConfig?.repair || {}
          const constructionInterest = projectData.investment?.partF?.合计 || 0
          
          // 固定资产原值 = A原值 + D原值
          const valueA = depAmort.A?.原值 || 0
          const valueD = depAmort.D?.原值 || 0
          const fixedAssetsOriginalValue = valueA + valueD
          
          // 固定资产投资 = 固定资产原值 - 建设期利息
          const fixedAssetsInvestment = Math.max(0, fixedAssetsOriginalValue - constructionInterest)
          
          // 年修理费
          const annualRepairCost = costConfig.type === 'percentage' 
            ? fixedAssetsInvestment * (costConfig.percentageOfFixedAssets || 0) / 100
            : (costConfig.directAmount || 0)
          
          return JSON.stringify({
            标题: '修理费估算表',
            计算方式: costConfig.type === 'percentage' ? '按固定资产投资百分比' : '固定金额',
            '固定资产投资额（万元）': fixedAssetsInvestment,
            '固定资产修理费率（%）': costConfig.percentageOfFixedAssets || 0,
            '固定金额（万元）': costConfig.directAmount || 0,
            '年修理费（万元）': annualRepairCost,
            说明: costConfig.type === 'percentage' 
              ? `固定资产修理费率取${costConfig.percentageOfFixedAssets || 0}%`
              : `每年固定 ${costConfig.directAmount || 0} 万元`
          }, null, 2)
        })() },
        { key: '{{land_transfer}}', label: '土地流转信息', category: 'project', value: landTransferValue },
        // 表格数据（JSON格式，用于LLM提示词）
        { key: '{{DATA:investment_estimate}}', label: '投资估算简表JSON', category: 'tableData', value: tableDataJSON['DATA:investment_estimate'] || '{}' },
        { key: '{{DATA:depreciation_amortization}}', label: '折旧与摊销估算表JSON', category: 'tableData', value: tableDataJSON['DATA:depreciation_amortization'] || '{}' },
        { key: '{{DATA:total_cost}}', label: '总成本费用估算表JSON', category: 'tableData', value: tableDataJSON['DATA:total_cost'] || '{}' },
        { key: '{{DATA:salary_welfare}}', label: '工资及福利费用估算表JSON', category: 'tableData', value: tableDataJSON['DATA:salary_welfare'] || '{}' },
        { key: '{{DATA:revenue_tax}}', label: '含税收入估算表JSON', category: 'tableData', value: tableDataJSON['DATA:revenue_tax'] || '{}' },
        { key: '{{DATA:raw_materials}}', label: '外购原材料费估算表JSON', category: 'tableData', value: tableDataJSON['DATA:raw_materials'] || '{}' },
        { key: '{{DATA:fuel_power}}', label: '外购燃料和动力费估算表JSON', category: 'tableData', value: tableDataJSON['DATA:fuel_power'] || '{}' },
        { key: '{{DATA:profit_distribution}}', label: '利润与利润分配表JSON', category: 'tableData', value: tableDataJSON['DATA:profit_distribution'] || '{}' },
        { key: '{{DATA:project_cash_flow}}', label: '项目投资现金流量表JSON', category: 'tableData', value: tableDataJSON['DATA:project_cash_flow'] || '{}' },
        { key: '{{DATA:financial_indicators}}', label: '财务计算指标表JSON', category: 'tableData', value: tableDataJSON['DATA:financial_indicators'] || '{}' },
        { key: '{{DATA:loan_repayment}}', label: '借款还本付息计划表JSON', category: 'tableData', value: tableDataJSON['DATA:loan_repayment'] || '{}' },
        { key: '{{DATA:loan_repayment_section12}}', label: '借款还本付息计划表1.2节JSON', category: 'tableData', value: tableDataJSON['DATA:loan_repayment_section12'] || '{}' },
        { key: '{{DATA:financial_static_dynamic}}', label: '财务静态动态指标JSON', category: 'tableData', value: tableDataJSON['DATA:financial_static_dynamic'] || '{}' },
        { key: '{{DATA:project_overview}}', label: '项目概况', category: 'tableData', value: projectOverviewValue },
        { key: '{{project_overview}}', label: '项目概况', value: projectData.projectOverview || '' },
        { key: '{{operation_load}}', label: '运营负荷', value: operationLoadValue },
        { key: '{{DATA:operation_load}}', label: '运营负荷', category: 'tableData', value: operationLoadValue },
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
      
      set((state) => ({ 
        projectData: projectData,
        availableVariables: variables,
        cachedTableDataJSON: {
          ...state.cachedTableDataJSON,
          [projectId]: tableDataJSON
        },  // 按项目ID隔离存储缓存数据
        resources: { ...state.resources, tables },
        isLoading: false 
      }))
      
      await get().loadProjectOverview()
    } catch (error: any) {
      set({ error: error.message || '加载项目数据失败', isLoading: false })
    }
  },
  
  startGeneration: async () => {
    const { projectId, promptTemplate, reportTitle, cachedTableDataJSON, customVariablesByProject, availableVariables } = get()
    
    if (!projectId) {
      set({ error: '缺少项目ID' })
      return
    }
    
    if (!promptTemplate.trim()) {
      set({ error: '请输入提示词' })
      return
    }
    
    // 使用当前项目的缓存 tableDataJSON，确保与小眼睛查看的数据一致
    const tableDataJSON = (cachedTableDataJSON || {})[projectId] || {}

    // 【修复】在调用LLM之前，先替换提示词中的所有变量（自定义变量 + 系统变量）
    let processedPromptTemplate = promptTemplate

    // 1. 先替换系统变量（从 availableVariables 中获取）
    for (const variable of availableVariables) {
      if (variable.key && variable.value !== undefined) {
        // 构建正则表达式，替换所有匹配的变量
        const variablePattern = new RegExp(variable.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        processedPromptTemplate = processedPromptTemplate.replace(variablePattern, String(variable.value))
      }
    }

    // 2. 再替换自定义变量
    // 注意：customVariables 中的 key 可能包含 {{ }}，需要去掉后再构建正则
    const customVariables = (customVariablesByProject || {})[projectId] || {}
    for (const [fullKey, value] of Object.entries(customVariables)) {
      // 去掉 key 两侧的 {{ 和 }}
      const key = fullKey.replace(/^\{\{|\}\}$/g, '')
      const variablePattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      processedPromptTemplate = processedPromptTemplate.replace(variablePattern, String(value))
    }
    
    set({ isLoading: true, error: null, reportContent: '' })
    try {
      const createResponse = await reportApi.createReport({
        projectId,
        title: reportTitle
      })
      
      const createResponseAny = createResponse as any
      const reportId = (createResponseAny.data?.reportId || createResponseAny.reportId) as string
      
      if (!createResponse || !reportId) {
        throw new Error(createResponse?.error || '创建报告失败')
      }
      
      set({ reportId, generationStatus: 'generating' })
      
      await reportApi.generateReport(reportId, processedPromptTemplate, tableDataJSON, {
        onChunk: (content: string) => {
          set((state) => ({
            reportContent: state.reportContent + content,
            generationStatus: 'generating'
          }))
        },
        onComplete: () => {
          set({ generationStatus: 'completed', isLoading: false })
        },
        onError: (error: string) => {
          const errorMessage = error || '生成过程中发生错误'
          set({ error: errorMessage, generationStatus: 'failed', isLoading: false })
        }
      })
    } catch (error: any) {
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
    
    if (!reportId) {
      set({ error: '请先生成报告' })
      return
    }

    try {
      // 先加载最新的Word样式配置
      await get().loadDefaultWordStyleConfig()
      
      const { wordStyleConfig: config } = get()
      
      let content = reportContent
      if (!content || content.trim() === '' || content === '<p></p>') {
        try {
          const response = await reportApi.getReport(reportId)
          const reportData = (response as any).data?.report || (response as any).report
          if (reportData?.report_content) {
            content = reportData.report_content
            set({ reportContent: content })
          }
        } catch (e) {
          // 静默处理获取报告内容失败
        }
      }

      if (!content || content.trim() === '' || content === '<p></p>') {
        set({ error: '报告内容为空，请先生成报告' })
        return
      }

      let htmlContent = content
      const isMarkdown = content.startsWith('#') || /^#{1,6}\s/.test(content) || content.includes('**') || content.includes('\n- ')
      
      if (isMarkdown) {
        try {
          const result = await marked.parse(content)
          htmlContent = typeof result === 'string' ? result : String(result)
        } catch (e) {
          // Markdown转换失败，保持原始内容
        }
      }
      
      const completeConfig = validateAndCompleteStyleConfig(config)
      
      // 传递表格和图表资源用于变量替换
      await reportApi.exportHtml({
        title: '',  // 空字符串，不输出报告标题到Word文档
        htmlContent,
        styleConfig: completeConfig,
        resources
      })
    } catch (error: any) {
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
      resources: {
        tables: {},
        charts: {}
      },
      projectOverview: null,
      customVariablesByProject: {},
      cachedTableDataJSON: {}  // 重置所有项目的缓存数据
    })
  },
  
  setVariableToInsert: (variable) => set({ variableToInsert: variable }),
  
  insertVariable: (variable) => set({ variableToInsert: variable }),
  
  saveProjectOverview: async (content: string) => {
    const { projectId, availableVariables, cachedTableDataJSON, projectData } = get()
    if (!projectId) throw new Error('缺少项目ID')
    
    set({ isLoading: true, error: null })
    try {
      const response = await reportApi.saveProjectOverview(projectId, content)
      if (response?.success) {
        // 构建新的 project_overview 值
        const projectOverviewValue = JSON.stringify({ content }, null, 2)
        
        // 更新 projectOverview 状态
        set({ projectOverview: content, isLoading: false })
        
        // 【修复】同时更新 availableVariables 中的 {{project_overview}} 变量
        set((state) => ({
          availableVariables: state.availableVariables.map((v) => 
            v.key === '{{project_overview}}' 
              ? { ...v, value: content }
              : v
          )
        }))
        
        // 【关键修复】同时更新 cachedTableDataJSON['project_overview']，确保LLM使用最新值
        set((state) => {
          const currentProjectCachedData = state.cachedTableDataJSON[projectId] || {}
          return {
            cachedTableDataJSON: {
              ...state.cachedTableDataJSON,
              [projectId]: {
                ...currentProjectCachedData,
                'project_overview': projectOverviewValue
              }
            }
          }
        })
        
        // 【关键修复】同时更新 projectData.projectOverview，供后续使用
        if (projectData) {
          set((state) => ({
            projectData: {
              ...state.projectData,
              projectOverview: content
            }
          }))
        }
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
      if (response?.success && response.data) {
        set({ projectOverview: response.data.content || null })
        
        // 加载自定义变量（如果后端返回了）
        const customVars = response.data.customVariables
        // 确保 customVariables 是对象类型，且不是字符串被错误解析
        if (customVars && typeof customVars === 'object' && !Array.isArray(customVars)) {
          set((state) => ({
            customVariablesByProject: {
              ...state.customVariablesByProject,
              [projectId]: customVars
            }
          }))
        } else {
          // 容错：如果 customVariables 无效，清空该项目的数据
          set((state) => ({
            customVariablesByProject: {
              ...state.customVariablesByProject,
              [projectId]: {}
            }
          }))
        }
      }
    } catch (error) {
      console.error('加载项目概况失败:', error)
    }
  },
  
  // 获取当前项目的缓存表格数据JSON
  getCachedTableDataJSON: () => {
    const { cachedTableDataJSON, projectId } = get()
    if (!projectId) return {}
    return (cachedTableDataJSON || {})[projectId] || {}
  }
}))
