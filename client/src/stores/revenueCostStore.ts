import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { revenueCostApi } from '@/lib/api'
import { notifications } from '@mantine/notifications'

// 默认成本配置
const getDefaultCostConfig = (): CostConfig => ({
  rawMaterials: {
    applyProductionRate: true,
    items: [
      { id: 1, name: '原材料1', sourceType: 'percentage', linkedRevenueId: 'total', percentage: 2, quantity: 0, unitPrice: 0, directAmount: 0, taxRate: 13 },
      { id: 2, name: '原材料2', sourceType: 'quantityPrice', percentage: 0, quantity: 100, unitPrice: 0.5, directAmount: 0, taxRate: 13 },
      { id: 3, name: '原材料3', sourceType: 'directAmount', percentage: 0, quantity: 0, unitPrice: 0, directAmount: 50, taxRate: 13 },
    ]
  },
  auxiliaryMaterials: {
    type: 'percentage',
    percentage: 5,
    applyProductionRate: true,
    taxRate: 13
  },
  fuelPower: {
    applyProductionRate: true,
    items: [
      { id: 1, name: '水费', specification: '', unit: 'm³', price: 2.99, consumption: 0, totalCost: 0, applyProductionRate: true },
      { id: 2, name: '电费', specification: '', unit: 'kWh', price: 0.65, consumption: 0, totalCost: 0, applyProductionRate: true },
      { id: 3, name: '汽油', specification: '', unit: 'L', price: 9453, consumption: 1000, totalCost: 9453000, applyProductionRate: true },
      { id: 4, name: '柴油', specification: '', unit: 'L', price: 7783, consumption: 1000, totalCost: 7783000, applyProductionRate: true },
      { id: 5, name: '天然气', specification: '', unit: 'm³', price: 3.75, consumption: 0, totalCost: 0, applyProductionRate: true },
    ]
  },
  wages: {
    employees: 0,
    salaryPerEmployee: 0,
    directAmount: 0,
    taxRate: 0
  },
  repair: {
    type: 'percentage',
    percentageOfFixedAssets: 5,
    taxRate: 13,
    applyProductionRate: true
  },
  otherExpenses: {
    type: 'directAmount',
    directAmount: 0,
    applyProductionRate: false
  },
  depreciation: {
    type: 'percentage',
    percentageOfFixedAssets: 10
  },
  amortization: {
    type: 'percentage',
    percentageOfFixedAssets: 5
  },
  interest: {
    type: 'percentage',
    percentage: 5
  }
})

// 成本配置类型定义
interface WageItem {
  id: string
  name: string
  employees: number
  salaryPerEmployee: number // 万元/年
  welfareRate: number // 福利费率 %
  changeInterval?: number // 变化（年）- 工资调整的时间间隔
  changePercentage?: number // 幅度（%）- 每次调整时工资上涨的百分比
}



export interface FuelPowerItem {
  id: number;
  name: string;
  specification: string;
  unit: string;
  quantity?: number;
  unitPrice?: number;
  price?: number;
  consumption?: number;
  totalCost: number;
  applyProductionRate: boolean;
  taxRate?: number;
}

export interface CostConfig {
  rawMaterials: {
    applyProductionRate: boolean;
    items: any[]; // 使用any[]避免类型冲突
  };
  auxiliaryMaterials: {
    type: 'percentage' | 'directAmount';
    percentage?: number;
    directAmount?: number;
    applyProductionRate: boolean;
    taxRate?: number;
  };
  fuelPower: {
    applyProductionRate: boolean;
    items?: FuelPowerItem[];
  };
  wages: {
    employees: number;
    salaryPerEmployee: number;
    directAmount: number;
    taxRate?: number;
    items?: WageItem[];
  };
  repair: {
    type: 'percentage' | 'directAmount';
    percentageOfFixedAssets?: number;
    directAmount?: number;
    taxRate?: number;
    applyProductionRate?: boolean;
  };
  otherExpenses: {
    type: 'percentage' | 'directAmount';
    percentage?: number;
    directAmount?: number;
    taxRate?: number;
    applyProductionRate: boolean;
  };
  depreciation: {
    type: 'percentage' | 'directAmount';
    percentageOfFixedAssets?: number;
    directAmount?: number;
  };
  amortization: {
    type: 'percentage' | 'directAmount';
    percentageOfFixedAssets?: number;
    directAmount?: number;
  };
  interest: {
    type: 'percentage' | 'directAmount';
    percentage?: number;
    directAmount?: number;
  };
}

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
  costConfig: CostConfig
  
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
  clearAllRevenueItems: () => void
  
  // 成本项管理
  addCostItem: (item: Partial<CostItem>) => void
  updateCostItem: (id: string, updates: Partial<CostItem>) => void
  deleteCostItem: (id: string) => void
  
  // 达产率管理
  setProductionRates: (rates: ProductionRateConfig[]) => void
  updateProductionRate: (yearIndex: number, rate: number) => void
  
  // 成本配置管理
  setCostConfig: (config: CostConfig) => void
  updateCostConfig: (updates: Partial<CostConfig>) => void
  
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
 * 防抖自动保存函数
 */
let saveTimeout: NodeJS.Timeout | null = null

const debouncedSave = async (showNotification: boolean = false) => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    const state = useRevenueCostStore.getState()
    if (state.context?.projectId) {
      try {
        const success = await state.saveToBackend()
        if (showNotification && success) {
          notifications.show({
            title: '✅ 自动保存成功',
            message: '数据已保存到数据库',
            color: 'green',
            autoClose: 2000,
          })
        }
      } catch (error) {
        console.error('自动保存失败:', error)
        if (showNotification) {
          notifications.show({
            title: '❌ 自动保存失败',
            message: '数据未保存，请稍后重试',
            color: 'red',
            autoClose: 3000,
          })
        }
      }
    }
  }, 1000) // 1秒防抖
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
      costConfig: getDefaultCostConfig(),
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
        // 触发自动保存
        debouncedSave()
      },
      
      // 兼容性别名
      setAIAnalysisResult: (result) => {
        set({ aiAnalysisResult: result })
        // 触发自动保存
        debouncedSave()
      },
      
      setRevenueStructureLocked: (locked) => {
        set({ revenueStructureLocked: locked })
        // 触发自动保存
        debouncedSave()
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
        // 触发自动保存
        debouncedSave()
      },
      
      updateRevenueItem: (id, updates) => {
        const state = get()
        set({
          revenueItems: state.revenueItems.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        })
        // 触发自动保存
        debouncedSave()
      },
      
      deleteRevenueItem: (id) => {
        const state = get()
        const newItems = state.revenueItems.filter(item => item.id !== id)
        // 重新计算索引
        const reindexed = newItems.map((item, idx) => ({ ...item, index: idx + 1 }))
        set({ revenueItems: reindexed })
        // 触发自动保存
        debouncedSave()
      },
      
      clearAllRevenueItems: () => {
        set({ revenueItems: [] })
        // 触发自动保存
        debouncedSave()
      },
      
      addCostItem: (item) => {
        const state = get()
        const newItem: CostItem = {
          id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 使用字符串id
          index: state.costItems.length + 1,
          name: item.name || '新成本项',
          category: 'other',
          fieldTemplate: 'quantity-price',
          ...item
        }
        set({ costItems: [...state.costItems, newItem] })
        // 触发自动保存
        debouncedSave()
      },
      
      updateCostItem: (id, updates) => {
        const state = get()
        set({
          costItems: state.costItems.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        })
        // 触发自动保存
        debouncedSave()
      },
      
      deleteCostItem: (id) => {
        const state = get()
        const newItems = state.costItems.filter(item => item.id !== id)
        const reindexed = newItems.map((item, idx) => ({ ...item, index: idx + 1 }))
        set({ costItems: reindexed })
        // 触发自动保存
        debouncedSave()
      },
      
      setProductionRates: (rates) => {
        set({ productionRates: rates })
        // 触发自动保存
        debouncedSave()
      },
      
      updateProductionRate: (yearIndex, rate) => {
        set((state) => ({
          productionRates: state.productionRates.map((item) =>
            item.yearIndex === yearIndex ? { ...item, rate } : item
          )
        }))
        // 触发自动保存
        debouncedSave()
      },
      
      // 成本配置管理
      setCostConfig: (config) => {
        set({ costConfig: config })
        // 触发自动保存
        debouncedSave()
      },
      
      updateCostConfig: (updates) => {
        set((state) => ({
          costConfig: { ...state.costConfig, ...updates }
        }))
        // 触发自动保存
        debouncedSave()
      },
      
      setCurrentStep: (step) => {
        set({ currentStep: step })
        // 触发自动保存
        debouncedSave()
      },
      
      nextStep: () => {
        const state = get()
        const steps: WorkflowStep[] = ['period', 'suggest', 'revenue', 'cost', 'profit', 'validate', 'done']
        const currentIndex = steps.indexOf(state.currentStep)
        if (currentIndex < steps.length - 1) {
          set({ currentStep: steps[currentIndex + 1] })
          // 触发自动保存
          debouncedSave()
        }
      },
      
      prevStep: () => {
        const state = get()
        const steps: WorkflowStep[] = ['period', 'suggest', 'revenue', 'cost', 'profit', 'validate', 'done']
        const currentIndex = steps.indexOf(state.currentStep)
        if (currentIndex > 0) {
          set({ currentStep: steps[currentIndex - 1] })
          // 触发自动保存
          debouncedSave()
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
            costConfig: state.costConfig,
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
              costConfig: modelData?.costConfig || getDefaultCostConfig(),
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

// 计算其他税费及附加的共享函数（供DynamicRevenueTable和FinancialIndicatorsTable共同使用）
export const calculateOtherTaxesAndSurcharges = (
  revenueItems: RevenueItem[],
  productionRates: ProductionRateConfig[],
  costConfig: CostConfig,
  year: number,
  deductibleInputTax: number = 0
): number => {
  // 计算增值税
  return (() => {
    // 计算销项税额
    const yearOutputTax = revenueItems.reduce((sum, item) => {
      const productionRate = getProductionRateForYear(productionRates, year)
      const revenue = calculateYearlyRevenue(item, year, productionRate)
      // 销项税额 = 含税收入 - 不含税收入
      return sum + (revenue - revenue / (1 + item.vatRate))
    }, 0);
    
    // 计算进项税额
    let yearInputTax = 0;
    
    // 外购原材料费进项税额
    if (costConfig.rawMaterials.items && costConfig.rawMaterials.items.length > 0) {
      const productionRate = costConfig.rawMaterials.applyProductionRate
        ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
        : 1;

      costConfig.rawMaterials.items.forEach((item: any) => {
        const baseAmount = (() => {
          if (item.sourceType === 'percentage') {
            let revenueBase = 0;
            if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
              revenueBase = revenueItems.reduce((sum, revItem) => {
                const productionRate = getProductionRateForYear(productionRates, year);
                return sum + calculateYearlyRevenue(revItem, year, productionRate);
              }, 0);
            } else {
              const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
              if (revItem) {
                const productionRate = getProductionRateForYear(productionRates, year);
                revenueBase = calculateYearlyRevenue(revItem, year, productionRate);
              }
            }
            return revenueBase * (item.percentage || 0) / 100;
          } else if (item.sourceType === 'quantityPrice') {
            return (item.quantity || 0) * (item.unitPrice || 0);
          } else if (item.sourceType === 'directAmount') {
            return item.directAmount || 0;
          }
          return 0;
        })();

        const taxRate = Number(item.taxRate) || 0;
        const taxRateDecimal = taxRate / 100;
        // 进项税额 = 含税金额 / (1 + 税率) × 税率
        yearInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
      });
    }

    // 外购燃料及动力费进项税额
    if (costConfig.fuelPower.items && costConfig.fuelPower.items.length > 0) {
      const productionRate = costConfig.fuelPower.applyProductionRate
        ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
        : 1;

      costConfig.fuelPower.items.forEach((item: any) => {
        let consumption = item.consumption || 0;
        let amount = 0;
        // 对汽油和柴油进行特殊处理：单价×数量/10000
        if (['汽油', '柴油'].includes(item.name)) {
          amount = (item.price || 0) * consumption / 10000 * productionRate;
        } else {
          amount = consumption * (item.price || 0) * productionRate;
        }
        
        const taxRate = (item.taxRate || 13) / 100;
        // 进项税额 = 含税金额 / (1 + 税率) × 税率
        yearInputTax += amount * taxRate / (1 + taxRate);
      });
    }

    // 计算进项税额（固定资产待抵扣）
    let yearFixedAssetInputTax = 0;
    if (deductibleInputTax > 0) {
      const operationYears = productionRates.length;
      const years = Array.from({ length: operationYears }, (_, i) => i + 1);
      
      // 计算每年的销项税额和进项税额
      const yearlyData = years.map((y) => {
        // 计算销项税额
        const yearOutputTax = revenueItems.reduce((sum, item) => {
          const productionRate = getProductionRateForYear(productionRates, y);
          const revenue = calculateYearlyRevenue(item, y, productionRate);
          // 销项税额 = 含税收入 - 不含税收入
          return sum + (revenue - revenue / (1 + item.vatRate));
        }, 0);
        
        // 计算进项税额
        const yearInputTax = (() => {
          // 外购原材料费进项税额
          let rawMaterialsInputTax = 0;
          if (costConfig.rawMaterials.items && costConfig.rawMaterials.items.length > 0) {
            const prodRate = costConfig.rawMaterials.applyProductionRate
              ? (productionRates?.find(p => p.yearIndex === y)?.rate || 1)
              : 1;

            costConfig.rawMaterials.items.forEach((item: any) => {
              const baseAmount = (() => {
                if (item.sourceType === 'percentage') {
                  let revenueBase = 0;
                  if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                    revenueBase = revenueItems.reduce((sum, revItem) => {
                      const prodRate = getProductionRateForYear(productionRates, y);
                      return sum + calculateYearlyRevenue(revItem, y, prodRate);
                    }, 0);
                  } else {
                    const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                    if (revItem) {
                      const prodRate = getProductionRateForYear(productionRates, y);
                      revenueBase = calculateYearlyRevenue(revItem, y, prodRate);
                    }
                  }
                  return revenueBase * (item.percentage || 0) / 100;
                } else if (item.sourceType === 'quantityPrice') {
                  return (item.quantity || 0) * (item.unitPrice || 0);
                } else if (item.sourceType === 'directAmount') {
                  return item.directAmount || 0;
                }
                return 0;
              })();

              const taxRate = Number(item.taxRate) || 0;
              const taxRateDecimal = taxRate / 100;
              // 进项税额 = 含税金额 / (1 + 税率) × 税率
              rawMaterialsInputTax += baseAmount * prodRate * taxRateDecimal / (1 + taxRateDecimal);
            });
          }

          // 外购燃料及动力费进项税额
          let fuelPowerInputTax = 0;
          if (costConfig.fuelPower.items && costConfig.fuelPower.items.length > 0) {
            const prodRate = costConfig.fuelPower.applyProductionRate
              ? (productionRates?.find(p => p.yearIndex === y)?.rate || 1)
              : 1;

            costConfig.fuelPower.items.forEach((item: any) => {
              let consumption = item.consumption || 0;
              let amount = 0;
              // 对汽油和柴油进行特殊处理：单价×数量/10000
              if (['汽油', '柴油'].includes(item.name)) {
                amount = (item.price || 0) * consumption / 10000 * prodRate;
              } else {
                amount = consumption * (item.price || 0) * prodRate;
              }
              
              const taxRate = (item.taxRate || 13) / 100;
              // 进项税额 = 含税金额 / (1 + 税率) × 税率
              fuelPowerInputTax += amount * taxRate / (1 + taxRate);
            });
          }

          return rawMaterialsInputTax + fuelPowerInputTax;
        })();
        
        return {
          year: y,
          outputTax: yearOutputTax,
          inputTax: yearInputTax
        };
      });
      
      // 计算每年的进项税额（固定资产待抵扣）
      let remainingDeductibleTax = deductibleInputTax;
      const fixedAssetInputTaxes: number[] = [];
      
      for (const data of yearlyData) {
        // 计算使增值税等于0所需的进项税额（固定资产待抵扣）
        const neededFixedAssetInputTax = data.outputTax - data.inputTax;
        
        // 如果还有剩余的待抵扣进项税，则使用需要的值，否则使用剩余值
        const actualFixedAssetInputTax = Math.min(neededFixedAssetInputTax, remainingDeductibleTax);
        
        fixedAssetInputTaxes.push(actualFixedAssetInputTax);
        remainingDeductibleTax -= actualFixedAssetInputTax;
      }
      
      // 返回指定年份的进项税额（固定资产待抵扣）
      yearFixedAssetInputTax = fixedAssetInputTaxes[year - 1] || 0;
    }
    
    // 增值税 = 销项税额 - 进项税额 - 进项税额（固定资产待抵扣）
    const vatAmount = yearOutputTax - yearInputTax - yearFixedAssetInputTax;
    
    // 城市建设维护税税率（默认7%，市区）
    const urbanTaxRate = 0.07;
    // 教育费附加税率（3%+地方2%=5%）
    const educationTaxRate = 0.05;
    // 其他税费及附加 = 增值税 × (城市建设维护税税率 + 教育费附加税率)
    return vatAmount * (urbanTaxRate + educationTaxRate);
  })();
};
