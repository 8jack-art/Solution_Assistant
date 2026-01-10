export interface User {
  id: string
  username: string
  is_admin: boolean
  is_expired: boolean
  expired_at?: string
  created_at: string
  updated_at: string
}

export interface InvestmentProject {
  id: string
  user_id: string
  user_name?: string  // 创建项目的用户名称
  project_name: string
  total_investment: number
  project_info?: string
  status: 'draft' | 'completed'
  construction_years: number
  operation_years: number
  loan_ratio: number
  loan_interest_rate: number
  construction_unit?: string  // 建设单位
  location?: string  // 项目地点
  project_type?: string  // 项目类型（曾用名：所属行业）
  industry?: string  // 兼容旧字段
  is_locked: boolean
  locked_at?: string
  // 土地信息字段
  land_mode?: 'A' | 'B' | 'C' | 'D'  // A-一次性征地, B-长期租赁, C-无土地需求, D-混合用地
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
  custom_loan_amount?: number
  created_at: string
  updated_at: string
}

export interface LLMConfig {
  id: string
  user_id: string
  name: string
  provider: string
  api_key: string
  base_url: string
  model: string
  is_default: boolean
  is_admin?: boolean  // 配置所有者是否是管理员
  created_at: string
  updated_at: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}