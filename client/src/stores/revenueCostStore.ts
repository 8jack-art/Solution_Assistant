import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { revenueCostApi } from '@/lib/api'

/**
 * 达产率配置
 */
export interface ProductionRateConfig {
  yearIndex: number // 第 n 年运营（1-based）
  rate: number // 达产率，如 0.7 表示 70%
}

/**
 * 验证错误类型
 */
export interface ValidationError {
  code: 'EMPTY' | 'MISSING_FIELD' | 'INVALID_VAT' | 'NOT_CONVERGED' | 'INVALID_AMOUNT'
  field?: string
  rowId?: string
  message: string
}

/**
 * AI分析结果类型
 */
export interface AiAnalysisResult {
  selected_categories: Array<{
    category_code: string
    category_name: string
    category_icon: string
    relevance_score: number
    reasoning: string
    recommended_revenue_types: Array<{
      type_name: string
      priority: 'high' | 'medium' | 'low'
      suggested_vat_rate: number
      typical_pricing_model: string
      estimated_proportion: string
    }>
  }>
  total_categories: number
  analysis_summary: string
}

/**
 * AI营收类别类型（从AiAnalysisResult中提取）
 */
export type AIRevenueCategory = AiAnalysisResult['selected_categories'][number]

/**
 * AI营收类型（从AIRevenueCategory中提取）
 */
export type AIRevenueType = AIRevenueCategory['recommended_revenue_types'][number]

/**
 * 为了兼容性，同时导出AI开头的类型别名
 */
export type AIAnalysisResult = AiAnalysisResult

/**
 * 收入项类别
 */
export type RevenueCategory = 
  | 'digital-platform'    // 数字平台
  | 'agriculture-crop'    // 农业种植
  | 'manufacturing'       // 制造业
  | 'service'            // 服务业
  | 'real-estate'        // 房地产
  | 'other'              // 其他

/**
 * 收入项字段模板类型
 */
export type FieldTemplate = 
  | 'quantity-price'        // 数量 × 单价
  | 'area-yield-price'      // 面积 × 亩产量 × 单价
  | 'capacity-utilization'  // 产能 × 利用率 × 单价
  | 'subscription'          // 订阅数 × 单价
  | 'direct-amount'         // 直接金额

/**
 * 收入项数据结构
 */
export interface RevenueItem {
  id: string
  index: number
  name: string
  category: RevenueCategory
  fieldTemplate: FieldTemplate
  
  // 动态字段（根据fieldTemplate显示不同字段）
  quantity?: number         // 数量
  unitPrice?: number        // 单价
  area?: number            // 面积（亩）
  yieldPerArea?: number    // 亩产量
  capacity?: number        // 产能
  utilizationRate?: number // 利用率
  subscriptions?: number   // 订阅数
  directAmount?: number    // 直接金额
  unit?: string            // 单位
  capacityUnit?: string    // 产能单位
  
  // 价格相关字段
  priceIncreaseInterval?: number   // 涨价间隔年数
  priceIncreaseRate?: number       // 涨价幅度（%）
  
  // 税务字段
  vatRate: number          // 增值税率（如 0.13 表示13%）
  
  // 计算字段（由系统计算）
  taxableIncome?: number   // 含税收入
  nonTaxIncome?: number    // 不含税收入
  vatAmount?: number       // 增值税金额
  
  remark?: string          // 备注
}

/**
 * 成本项数据结构
 */
export interface CostItem {
  id: string
  index: number
  name: string
  category: 'raw-material' | 'labor' | 'manufacturing' | 'other'
  fieldTemplate: FieldTemplate
  
  // 动态字段
  quantity?: number
  unitPrice?: number
  directAmount?: number
  
  // 关联收入字段
  linkedRevenueId?: string  // 关联的收入项ID
  percentage?: number       // 占收入的百分比(如2表示2%)
  
  // 计算字段
  totalAmount?: number
  
  remark?: string
}

/**
 * 还本付息计划表数据
 */
export interface RepaymentScheduleData {
  interest_2_2: number[] // 2.2 付息行各年数据
}

/**
 * 折旧与摊销估算表数据
 */
export interface DepreciationAmortizationData {
  A_depreciation: number[] // A行 折旧费各年数据
  D_depreciation: number[] // D行 折旧费各年数据
  E_amortization: number[]  // E行 摊销费各年数据
}

/**
 * 项目上下文信息
 */
export interface ProjectContext {
  projectId: string
  projectName: string
  constructionYears: number
  operationYears: number
  totalInvestment: number
  engineeringItems?: Array<{
    name: string
    amount: number
  }>
  repaymentSchedule?: RepaymentScheduleData // 还本付息计划表数据
  depreciationAmortization?: DepreciationAmortizationData // 折旧与摊销估算表数据
}

/**
 * 工作流步骤
 */
export type WorkflowStep = 
  | 'period'      // 计算期确认
  | 'suggest'     // AI推荐
  | 'revenue'     // 收入建模
  | 'cost'        // 成本建模
  | 'profit'      // 利润税金
  | 'validate'    // 数据验证
  | 'done'        // 完成

/**
 * 收入成本建模状态接口
 */
interface RevenueCostState {
  // ========== 上下文数据 ==========
  context: ProjectContext | null
  
  // ========== 计算期设置 ==========
  calculationPeriod: number // 总计算期（建设期+运营期）
  baseYear: number          // 生产启动年（默认 constructionYears + 1）
  
  // ========== AI分析结果 ==========
  aiAnalysisResult: AiAnalysisResult | null
  revenueStructureLocked: boolean  // 营收结构是否锁定
  
  // ========== 主体数据 ==========
  revenueItems: RevenueItem[]
  costItems: CostItem[]
  productionRates: ProductionRateConfig[]
  
  // ========== 控制状态 ==========
  currentStep: WorkflowStep
  isSubmitting: boolean
  isSaving: boolean
  errors: ValidationError[]
  
  // ========== 操作方法 ==========
  
  // 上下文管理
  setContext: (context: ProjectContext) => void
  
  // AI分析结果管理
  setAiAnalysisResult: (result: AiAnalysisResult | null) => void
  setAIAnalysisResult: (result: AiAnalysisResult | null) => void  // 兼容性别名
  setRevenueStructureLocked: (locked: boolean) => void
  
  // 计算期管理
  updateCalculationPeriod: (calculationPeriod: number, baseYear?: number) => void
  
  // 收入项管理
  addRevenueItem: (item: Partial<RevenueItem>) => void
  updateRevenueItem: (id: string, updates: Partial<RevenueItem>) => void
  deleteRevenueItem: (id: string) => void
  
  // 成本项管理
  addCostItem: (item: Partial<CostItem>) => void
  updateCostItem: (id: string, updates: Partial<CostItem>) => void
  deleteCostItem: (id: string) => void
  
  // 达产率管理
  setProductionRates: (rates: ProductionRateConfig[]) => void
  updateProductionRate: (yearIndex: number, rate: number) => void
  
  // 步骤控制
  setCurrentStep: (step: WorkflowStep) => void
  nextStep: () => void
  prevStep: () => void
  
  // 验证
  validate: () => boolean
  clearErrors: () => void
  
  // 数据持久化
  saveToBackend: () => Promise<boolean>
  loadFromBackend: (projectId: string) => Promise<boolean>
  
  // 重置
  reset: () => void
}

/**
 * 生成默认达产率曲线
 * 规则：第1年75%，第2年85%，第3年及以后100%
 */
const generateDefaultProductionRates = (operationYears: number): ProductionRateConfig[] => {
  const rates: ProductionRateConfig[] = []
  for (let i = 1; i <= operationYears; i++) {
    let rate = 1.0
    if (i === 1) rate = 0.75
    else if (i === 2) rate = 0.85
    else rate = 1.0
    
    rates.push({
      yearIndex: i,
      rate
    })
  }
  return rates
}

/**
 * 计算收入项的含税收入（万元单位）
 * 注意：这里假设unitPrice已经是万元单位（由前端保存时转换）
 */
export const calculateTaxableIncome = (item: RevenueItem): number => {
  let taxableIncome = 0
  
  // 确保所有数值都是有效数字，避免NaN
  switch (item.fieldTemplate) {
    case 'quantity-price':
      taxableIncome = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
      break
    case 'area-yield-price':
      taxableIncome = (Number(item.area) || 0) * (Number(item.yieldPerArea) || 0) * (Number(item.unitPrice) || 0)
      break
    case 'capacity-utilization':
      taxableIncome = (Number(item.capacity) || 0) * (Number(item.utilizationRate) || 0) * (Number(item.unitPrice) || 0)
      break
    case 'subscription':
      taxableIncome = (Number(item.subscriptions) || 0) * (Number(item.unitPrice) || 0)
      break
    case 'direct-amount':
      taxableIncome = Number(item.directAmount) || 0
      break
  }
  
  // 确保返回有效数字，避免NaN
  return isNaN(taxableIncome) ? 0 : taxableIncome
}

/**
 * 计算不含税收入（万元单位）
 * 公式：不含税收入 = 含税收入 / (1 + 增值税率)
 */
export const calculateNonTaxIncome = (item: RevenueItem): number => {
  const taxableIncome = calculateTaxableIncome(item)
  // 检查vatRate是否有效，避免NaN
  const vatRate = item.vatRate || 0
  return taxableIncome / (1 + vatRate)
}

/**
 * 计算增值税金额（万元单位）
 * 公式：增值税 = 含税收入 - 不含税收入
 */
export const calculateVatAmount = (item: RevenueItem): number => {
  const taxableIncome = calculateTaxableIncome(item)
  const nonTaxIncome = calculateNonTaxIncome(item)
  return taxableIncome - nonTaxIncome
}

/**
 * 获取指定年份的达产率
 */
export const getProductionRateForYear = (rates: ProductionRateConfig[], year: number): number => {
  const rateConfig = rates.find(r => r.yearIndex === year)
  return rateConfig ? rateConfig.rate : 1.0
}

/**
 * 计算某年的收入（含税收入）
 * @param item 收入项
 * @param year 运营年份（1-based）
 * @param productionRate 达产率（0-1之间的小数）
 */
export const calculateYearlyRevenue = (item: RevenueItem, year: number, productionRate: number): number => {
  // 1. 计算基础含税收入（万元）
  let baseRevenue = calculateTaxableIncome(item)
  
  // 2. 应用涨价规则
  if (item.priceIncreaseInterval && item.priceIncreaseInterval > 0 && item.priceIncreaseRate && item.priceIncreaseRate > 0) {
    // 计算当前年份处于第几个涨价周期
    const priceRoundIndex = Math.floor((year - 1) / item.priceIncreaseInterval)
    // 应用涨价：每个周期涨价一次
    const priceMultiplier = Math.pow(1 + item.priceIncreaseRate / 100, priceRoundIndex)
    baseRevenue = baseRevenue * priceMultiplier
  }
  
  // 4. 应用达产率
  return baseRevenue * productionRate
}

/**
 * 创建收入成本建模状态管理
 */
export const useRevenueCostStore = create<RevenueCostState>()(
  devtools(
    (set, get) => ({
      // ========== 初始状态 ==========
      context: null,
      calculationPeriod: 0,
      baseYear: 0,
      aiAnalysisResult: null,
      revenueStructureLocked: false,
      revenueItems: [],
      costItems: [],
      productionRates: [],
      currentStep: 'period',
      isSubmitting: false,
      isSaving: false,
      errors: [],
      
      // ========== 操作方法实现 ==========
      
      setContext: (context) => {
        set({ 
          context,
          calculationPeriod: context.constructionYears + context.operationYears,
          baseYear: context.constructionYears + 1,
          productionRates: generateDefaultProductionRates(context.operationYears)
        })
      },
      
      setAiAnalysisResult: (result) => {
        set({ aiAnalysisResult: result })
      },
      
      // 兼容性别名
      setAIAnalysisResult: (result) => {
        set({ aiAnalysisResult: result })
      },
      
      setRevenueStructureLocked: (locked) => {
        set({ revenueStructureLocked: locked })
      },
      
      updateCalculationPeriod: (calculationPeriod, baseYear) => {
        const state = get()
        const newBaseYear = baseYear || state.context?.constructionYears! + 1
        const operationYears = calculationPeriod - (state.context?.constructionYears || 0)
        
        set({
          calculationPeriod,
          baseYear: newBaseYear,
          productionRates: generateDefaultProductionRates(operationYears)
        })
      },
      
      addRevenueItem: (item) => {
        const state = get()
        const newItem: RevenueItem = {
          id: `revenue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          index: state.revenueItems.length + 1,
          name: item.name || '新收入项',
          category: item.category || 'other',
          fieldTemplate: item.fieldTemplate || 'quantity-price',
          vatRate: item.vatRate || 0.13,
          ...item
        }
        set({ revenueItems: [...state.revenueItems, newItem] })
      },
      
      updateRevenueItem: (id, updates) => {
        const state = get()
        set({
          revenueItems: state.revenueItems.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        })
      },
      
      deleteRevenueItem: (id) => {
        const state = get()
        const newItems = state.revenueItems.filter(item => item.id !== id)
        // 重新计算索引
        const reindexed = newItems.map((item, idx) => ({ ...item, index: idx + 1 }))
        set({ revenueItems: reindexed })
      },
      
      addCostItem: (item) => {
        const state = get()
        const newItem: CostItem = {
          id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          index: state.costItems.length + 1,
          name: item.name || '新成本项',
          category: item.category || 'other',
          fieldTemplate: item.fieldTemplate || 'quantity-price',
          ...item
        }
        set({ costItems: [...state.costItems, newItem] })
      },
      
      updateCostItem: (id, updates) => {
        const state = get()
        set({
          costItems: state.costItems.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        })
      },
      
      deleteCostItem: (id) => {
        const state = get()
        const newItems = state.costItems.filter(item => item.id !== id)
        const reindexed = newItems.map((item, idx) => ({ ...item, index: idx + 1 }))
        set({ costItems: reindexed })
      },
      
      setProductionRates: (rates) => {
        set({ productionRates: rates })
      },
      
      updateProductionRate: (yearIndex, rate) => {
        const state = get()
        set({
          productionRates: state.productionRates.map(item =>
            item.yearIndex === yearIndex ? { ...item, rate } : item
          )
        })
      },
      
      setCurrentStep: (step) => {
        set({ currentStep: step })
      },
      
      nextStep: () => {
        const state = get()
        const steps: WorkflowStep[] = ['period', 'suggest', 'revenue', 'cost', 'profit', 'validate', 'done']
        const currentIndex = steps.indexOf(state.currentStep)
        if (currentIndex < steps.length - 1) {
          set({ currentStep: steps[currentIndex + 1] })
        }
      },
      
      prevStep: () => {
        const state = get()
        const steps: WorkflowStep[] = ['period', 'suggest', 'revenue', 'cost', 'profit', 'validate', 'done']
        const currentIndex = steps.indexOf(state.currentStep)
        if (currentIndex > 0) {
          set({ currentStep: steps[currentIndex - 1] })
        }
      },
      
      validate: () => {
        const state = get()
        const errors: ValidationError[] = []
        
        // 验证收入项
        state.revenueItems.forEach(item => {
          if (!item.name || item.name.trim() === '') {
            errors.push({
              code: 'EMPTY',
              field: 'name',
              rowId: item.id,
              message: `收入项 ${item.index} 名称不能为空`
            })
          }
          
          // 验证增值税率
          if (item.vatRate < 0 || item.vatRate > 1) {
            errors.push({
              code: 'INVALID_VAT',
              field: 'vatRate',
              rowId: item.id,
              message: `收入项 ${item.index} 增值税率无效`
            })
          }
        })
        
        // 验证达产率
        state.productionRates.forEach(rate => {
          if (rate.rate < 0 || rate.rate > 1) {
            errors.push({
              code: 'INVALID_AMOUNT',
              field: 'productionRate',
              message: `第 ${rate.yearIndex} 年达产率无效`
            })
          }
        })
        
        set({ errors })
        return errors.length === 0
      },
      
      clearErrors: () => {
        set({ errors: [] })
      },
      
      saveToBackend: async () => {
        const state = get()
        try {
          set({ isSaving: true })
          
          if (!state.context?.projectId) {
            throw new Error('项目ID不存在')
          }
          
          // 确保传递完整的model_data结构
          const modelData = {
            revenueItems: state.revenueItems,
            costItems: state.costItems,
            productionRates: state.productionRates,
            aiAnalysisResult: state.aiAnalysisResult,
            workflow_step: state.currentStep
          };
          
          console.log('💾 正在保存数据到后端:', {
            project_id: state.context.projectId,
            model_data: modelData,
            workflow_step: state.currentStep
          });
          
          const response = await revenueCostApi.save({
            project_id: state.context.projectId,
            model_data: modelData,
            workflow_step: state.currentStep
          })
          
          set({ isSaving: false })
          console.log('✅ 数据保存成功:', response);
          return response.success
        } catch (error) {
          console.error('❌ 保存失败:', error)
          set({ isSaving: false })
          return false
        }
      },
      
      loadFromBackend: async (projectId: string) => {
        try {
          set({ isSubmitting: true })
          
          const response = await revenueCostApi.getByProjectId(projectId)
          
          if (response.success && response.data?.estimate) {
            const estimate = response.data.estimate
            
            // 解析model_data
            let modelData = null
            if (typeof estimate.model_data === 'string') {
              try {
                modelData = JSON.parse(estimate.model_data)
              } catch (e) {
                console.error('解析model_data失败:', e)
              }
            } else {
              modelData = estimate.model_data
            }
            
            // 更新状态
            set({
              revenueItems: modelData?.revenueItems || [],
              costItems: modelData?.costItems || [],
              productionRates: modelData?.productionRates || [],
              aiAnalysisResult: modelData?.aiAnalysisResult || estimate.ai_analysis_result || null,
              currentStep: estimate.workflow_step || 'period'
            })
          }
          
          set({ isSubmitting: false })
          return response.success
        } catch (error) {
          console.error('加载失败:', error)
          set({ isSubmitting: false })
          return false
        }
      },
      
      reset: () => {
        set({
          context: null,
          calculationPeriod: 0,
          baseYear: 0,
          aiAnalysisResult: null,
          revenueStructureLocked: false,
          revenueItems: [],
          costItems: [],
          productionRates: [],
          currentStep: 'period',
          isSubmitting: false,
          isSaving: false,
          errors: []
        })
      }
    }),
    { name: 'RevenueCostStore' }
  )
)
