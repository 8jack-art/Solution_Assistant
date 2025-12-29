// 用户接口
export interface User {
  id: string
  username: string
  password_hash: string
  is_admin: boolean
  is_expired: boolean
  expired_at?: string
  created_at: string
  updated_at: string
}

// 投资项目接口
export interface InvestmentProject {
  id: string
  user_id: string
  project_name: string
  total_investment: number
  project_info?: string
  status: 'draft' | 'completed'
  construction_years: number
  operation_years: number
  loan_ratio: number
  loan_interest_rate: number
  is_locked: boolean
  locked_at?: string
  // 土地信息字段
  land_mode?: 'A' | 'B' | 'C' | 'D' | 'E'  // A-一次性征地, B-长期租赁, C-无土地需求, D-混合用地, E-AI自主决策
  land_area?: number  // 土地面积(亩)
  land_unit_price?: number  // 土地单价(万元/亩或万元/亩/年)
  land_cost?: number  // 土地费用(万元)
  land_remark?: string  // 土地信息备注
  land_lease_area?: number  // 租赁土地面积(亩,混合模式)
  land_lease_unit_price?: number  // 租赁土地单价(万元/亩/年,混合模式)
  land_purchase_area?: number  // 征地面积(亩,混合模式)
  land_purchase_unit_price?: number  // 征地单价(万元/亩,混合模式)
  seedling_compensation?: number  // 征地青苗补偿费(万元)
  lease_seedling_compensation?: number  // 租赁青苗补偿费(万元)
  created_at: string
  updated_at: string
}

// 投资估算接口
export interface InvestmentEstimate {
  id: string
  project_id: string
  estimate_data?: any
  total_investment?: number
  building_investment?: number
  construction_interest?: number
  gap_rate?: number
  construction_cost: number
  equipment_cost: number
  installation_cost: number
  other_cost: number
  land_cost: number
  basic_reserve: number
  price_reserve: number
  construction_period: number
  iteration_count: number
  final_total: number
  loan_amount: number
  loan_rate: number
  custom_loan_amount?: number | null
  custom_land_cost?: number | null
  // 新增贷款相关数据字段
  construction_interest_details?: any // 建设期利息详情JSON
  loan_repayment_schedule_simple?: any // 还本付息计划简表JSON（等额本金）
  loan_repayment_schedule_detailed?: any // 还本付息计划表JSON（等额本息）
  created_at: string
  updated_at: string
}

// 营收成本估算接口
export interface RevenueCostEstimate {
  id: string
  project_id: string
  calculation_period: number
  operation_period: number
  production_start_year: number
  full_production_year: number
  annual_revenue: number
  annual_cost: number
  depreciation_years: number
  residual_rate: number
  amortization_years: number
  vat_rate: number
  additional_tax_rate: number
  created_at: string
  updated_at: string
}

// LLM 配置接口
export interface LLMConfig {
  id: string
  user_id: string
  name: string
  provider: string
  api_key: string
  base_url: string
  model: string
  is_default: boolean
  created_at: string
  updated_at: string
}

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// JWT 载荷接口
export interface JwtPayload {
  userId: string
  username: string
  isAdmin: boolean
}

// 认证请求接口
export interface AuthRequest {
  user?: JwtPayload
  body?: any
  params?: any
  query?: any
  headers?: any
}