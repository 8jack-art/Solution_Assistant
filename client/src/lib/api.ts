import axios from 'axios'
import { ApiResponse, InvestmentProject, InvestmentEstimate, LLMConfig } from '../types/index.js'

export type { InvestmentProject, InvestmentEstimate, LLMConfig }

const API_BASE_URL = '/api'

// 数据缓存管理器
class DataCacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  set(key: string, data: any, ttl: number = 300000) { // 默认5分钟TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }
  
  invalidate(pattern: string | RegExp) {
    if (typeof pattern === 'string') {
      this.cache.delete(pattern)
    } else {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key)
        }
      }
    }
  }
  
  clear() {
    this.cache.clear()
  }
}

export const dataCache = new DataCacheManager()

// 请求重试逻辑
const retryRequest = async (
  requestFn: () => Promise<any>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<any> => {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error
      
      // 对于4xx错误（除了429）不重试
      if (lastError.response && lastError.response.status >= 400 && lastError.response.status < 500 && lastError.response.status !== 429) {
        throw lastError
      }
      
      // 最后一次尝试不需要延迟
      if (i < maxRetries - 1) {
        // 指数退避：每次延迟时间翻倍，加上随机抖动
        const exponentialDelay = delay * Math.pow(2, i) + Math.random() * 1000
        await new Promise(resolve => setTimeout(resolve, exponentialDelay))
      }
    }
  }
  
  throw lastError
}

// 性能监控
const monitorRequest = (url: string, startTime: number) => {
  const duration = Date.now() - startTime
  
  // 记录慢请求
  if (duration > 3000) {
    console.warn(`[API Performance] Slow request: ${url} took ${duration}ms`)
  }
  
  // 发送到监控系统（如果可用）
  // @ts-ignore - analytics可能不存在
  if (window.analytics) {
    // @ts-ignore
    window.analytics.track('API Request', {
      url,
      duration,
      success: duration < 10000 // 假设10秒内为成功
    })
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 增加到60秒超时
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    // 直接返回response.data，即 { success: true/false, data?: {...}, error?: string }
    return response.data
  },
  (error) => {
    // 401 Unauthorized 或 403 Forbidden 都表示令牌无效
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    // 如果后端返回了错误响应体，也要返回，而不是reject
    if (error.response?.data) {
      return Promise.resolve(error.response.data)
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (username: string, password: string) =>
    api.post<any, ApiResponse<{ user: any; token: string }>>('/auth/login', {
      username,
      password,
    }),

  register: (username: string, password: string, isAdmin = false) =>
    api.post<any, ApiResponse<{ user: any }>>('/auth/register', {
      username,
      password,
      isAdmin,
    }),

  getCurrentUser: () =>
    api.get<any, ApiResponse<{ user: any }>>('/auth/me'),

  getTestUsers: () =>
    api.get<any, ApiResponse<{ testUsers: any[] }>>('/auth/test-users'),
}

export const projectApi = {
  create: (projectData: any) =>
    api.post<any, ApiResponse<{ project: any }>>('/projects', projectData),

  getByUserId: () =>
    api.get<any, ApiResponse<{ projects: any[] }>>('/projects'),

  getById: (id: string) =>
    api.get<any, ApiResponse<{ project: any; estimate?: any }>>(`/projects/${id}`),

  update: (id: string, updates: any) =>
    api.put<any, ApiResponse<{ project: any }>>(`/projects/${id}`, updates),

  updateStatus: (id: string, status: 'draft' | 'completed') =>
    api.patch<any, ApiResponse<{ project: any }>>(`/projects/${id}/status`, { status }),

  lock: (id: string) =>
    api.patch<any, ApiResponse<{ project: any }>>(`/projects/${id}/lock`),

  unlock: (id: string) =>
    api.patch<any, ApiResponse<{ project: any }>>(`/projects/${id}/unlock`),

  delete: (id: string) =>
    api.delete<any, ApiResponse>(`/projects/${id}`),
}

export const investmentApi = {
  calculate: (params: any) =>
    retryRequest(async () => {
      const startTime = Date.now()
      const response = await api.post<any, ApiResponse<{ estimate: any }>>('/investment/calculate', params)
      monitorRequest('/investment/calculate', startTime)
      return response
    }),

  save: (params: any) =>
    retryRequest(async () => {
      const startTime = Date.now()
      const response = await api.post<any, ApiResponse<{ estimate: any }>>('/investment/save', params)
      monitorRequest('/investment/save', startTime)
      return response
    }),

  getByProjectId: (projectId: string, options?: { signal?: AbortSignal; useCache?: boolean }) => {
    const cacheKey = `investment:${projectId}`
    
    // 尝试从缓存获取
    if (options?.useCache !== false) {
      const cachedData = dataCache.get(cacheKey)
      if (cachedData) {
        return Promise.resolve(cachedData)
      }
    }
    
    return retryRequest(async () => {
      const startTime = Date.now()
      const response = await api.get<any, ApiResponse<{ estimate?: any }>>(`/investment/project/${projectId}`, {
        signal: options?.signal
      })
      monitorRequest(`/investment/project/${projectId}`, startTime)
      
      // 缓存结果
      if (options?.useCache !== false && response.success) {
        dataCache.set(cacheKey, response)
      }
      
      return response
    })
  },

  generateSummary: (projectId: string, aiItems?: any[], customLoanAmount?: number, customLandCost?: number) =>
    retryRequest(async () => {
      const startTime = Date.now()
      const response = await api.post<any, ApiResponse<{ estimate: any; summary: any }>>(`/investment/generate/${projectId}`, {
        ai_items: aiItems,
        custom_loan_amount: customLoanAmount,
        custom_land_cost: customLandCost
      })
      monitorRequest(`/investment/generate/${projectId}`, startTime)
      return response
    }),

  // 提供缓存失效方法
  invalidateCache: (projectId: string) => {
    dataCache.invalidate(`investment:${projectId}`)
  }
}

export const llmConfigApi = {
  getProviders: () =>
    api.get<any, ApiResponse<{ providers: any[] }>>('/llm/providers'),

  create: (config: any) =>
    api.post<any, ApiResponse<{ config: any }>>('/llm/create', config),

  getByUserId: () =>
    api.get<any, ApiResponse<{ configs: any[] }>>('/llm'),

  getDefault: () =>
    api.get<any, ApiResponse<{ config?: any }>>('/llm/default'),

  update: (id: string, updates: any) =>
    api.put<any, ApiResponse<{ config: any }>>(`/llm/${id}`, updates),

  setDefault: (configId: string) =>
    api.post<any, ApiResponse<{ config: any }>>('/llm/set-default', { config_id: configId }),

  delete: (id: string) =>
    api.delete<any, ApiResponse>(`/llm/${id}`),

  testConnection: (config: any) =>
    api.post<any, ApiResponse<{ message: string; content?: string }>>('/llm/test-connection', config),

  generateInvestmentContent: (params: any) =>
    api.post<any, ApiResponse<{ content: string; config_name: string }>>('/llm/generate-investment-content', params),

  analyzeProjectInfo: (projectInfo: string) =>
    api.post<any, ApiResponse<{ analyzed_data: any; config_name: string }>>('/llm/analyze-project-info', {
      project_info: projectInfo,
      use_default_config: true
    }, {
      timeout: 60000 // 为项目分析设置60秒超时
    }),

  analyzeEngineeringItems: (params: { project_name: string; project_description?: string; total_investment: number }) =>
    api.post<any, ApiResponse<{ 
      items: any[]; 
      suggestions?: string[];
      analysis?: {
        project_type?: string;
        cost_breakdown?: string;
        reasoning?: string;
      };
      config_name: string;
      debug_info?: {
        timestamp: string;
        prompt_length: number;
        response_length: number;
        items_count: number;
      };
    }>>('/llm/analyze-engineering-items', {
      ...params,
      use_default_config: true
    }),

  subdivideEngineeringItem: (params: { 
    item_name: string; 
    item_remark: string; 
    total_amount: number;
    project_name: string;
    project_description?: string;
  }) =>
    api.post<any, ApiResponse<{ 
      subItems: Array<{
        name: string;
        quantity: number;
        unit: string;
        unit_price: number;
        construction_ratio: number;
        equipment_ratio: number;
        installation_ratio: number;
        other_ratio: number;
      }>;
      config_name: string;
    }>>('/llm/subdivide-engineering-item', {
      ...params,
      use_default_config: true
    }),
}

export const revenueCostApi = {
  save: (params: any) =>
    api.post<any, ApiResponse<{ estimate: any }>>('/revenue-cost/save', params),

  getByProjectId: (projectId: string) =>
    api.get<any, ApiResponse<{ estimate?: any }>>(`/revenue-cost/project/${projectId}`),

  aiRecommend: (projectId: string, params?: any) =>
    api.post<any, ApiResponse<{ 
      analysis: {
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
      config_name: string
    }>>(`/revenue-cost/ai-recommend/${projectId}`, params || {}, {
      timeout: 120000 // AI分析需要更长的超时时间（2分钟）
    }),

  analyzePricing: (type_name: string) =>
    api.post<any, ApiResponse<{
      vat_rate: number
      pricing_model: string
    }>>('/revenue-cost/analyze-pricing', { type_name }, {
      timeout: 60000 // 1分钟超时
    }),

  generateItems: (projectId: string, params: {
    revenueStructure: any
    investmentData: any
  }) =>
    api.post<any, ApiResponse<{
      revenue_items: Array<{
        name: string
        category: string
        unit: string
        quantity: number
        unitPrice: number
        vatRate: number
      }>
    }>>(`/revenue-cost/generate-items/${projectId}`, params, {
      timeout: 120000 // AI生成需要更长的超时时间（2分钟）
    }),

  estimateItem: (projectId: string, itemName: string) =>
    api.post<any, ApiResponse<{
      category: string
      fieldTemplate: string
      quantity?: number
      unitPrice?: number
      vatRate?: number
      area?: number
      yieldPerArea?: number
      capacity?: number
      utilizationRate?: number
      subscriptions?: number
      directAmount?: number
    }>>(`/revenue-cost/estimate-item/${projectId}`, { itemName }, {
      timeout: 60000 // 1分钟超时
    }),

  updateWorkflowStep: (projectId: string, step: string) =>
    api.patch<any, ApiResponse<{ step: string }>>(`/revenue-cost/workflow/${projectId}`, { step }),

  delete: (id: string) =>
    api.delete<any, ApiResponse>(`/revenue-cost/${id}`),
}

export default api