import axios from 'axios'
import { ApiResponse, InvestmentProject, InvestmentEstimate, LLMConfig } from '../types/index.js'

export type { InvestmentProject, InvestmentEstimate, LLMConfig }

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
    api.post<any, ApiResponse<{ estimate: any }>>('/investment/calculate', params),

  save: (params: any) =>
    api.post<any, ApiResponse<{ estimate: any }>>('/investment/save', params),

  getByProjectId: (projectId: string) =>
    api.get<any, ApiResponse<{ estimate?: any }>>(`/investment/project/${projectId}`),

  generateSummary: (projectId: string, aiItems?: any[], customLoanAmount?: number, customLandCost?: number) =>
    api.post<any, ApiResponse<{ estimate: any; summary: any }>>(`/investment/generate/${projectId}`, { 
      ai_items: aiItems,
      custom_loan_amount: customLoanAmount,
      custom_land_cost: customLandCost
    }),
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
    api.post<any, ApiResponse<{ recommendations: any[] }>>(`/revenue-cost/ai-recommend/${projectId}`, params || {}),

  updateWorkflowStep: (projectId: string, step: string) =>
    api.patch<any, ApiResponse<{ step: string }>>(`/revenue-cost/workflow/${projectId}`, { step }),

  delete: (id: string) =>
    api.delete<any, ApiResponse>(`/revenue-cost/${id}`),
}

export default api