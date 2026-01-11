export interface LLMProviderConfig {
  id: string
  name: string
  baseUrl: string
  defaultModel: string
  models: string[]
}

export const llmProviders: LLMProviderConfig[] = [
  {
    id: 'bailian',
    name: '百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen2-7b-instruct', 'qwen2-72b-instruct', 'qwen2.5-7b-instruct', 'qwen2.5-14b-instruct', 'qwen2.5-32b-instruct', 'qwen2.5-72b-instruct']
  },
  {
    id: 'zhipuai',
    name: '智谱AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4.5-flash',
    models: ['glm-3-turbo', 'glm-4', 'glm-4v', 'glm-4-plus', 'glm-4-air', 'glm-4-airx', 'glm-4-flash', 'glm-4.5-flash', 'glm-4.6']
  },
  {
    id: 'volcano',
    name: '火山引擎',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-seed-1-6-251015',
    models: ['doubao-pro-4k', 'doubao-pro-32k', 'doubao-pro-128k', 'doubao-lite-4k', 'doubao-lite-32k', 'doubao-seed-1-6-251015', 'deepseek-v3-250324']
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'zai-org/GLM-4.5-Air',
    models: [
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-14B-Instruct',
      'Qwen/Qwen2.5-32B-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
      'deepseek-ai/DeepSeek-V2.5',
      'deepseek-ai/DeepSeek-V3.2',
      'zai-org/GLM-4.5-Air',
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      'meta-llama/Meta-Llama-3.1-70B-Instruct'
    ]
  }
]

export function getProviderById(id: string): LLMProviderConfig | undefined {
  return llmProviders.find(p => p.id === id)
}

export function validateProviderAndModel(provider: string, model: string): boolean {
  if (provider.toLowerCase() === 'custom') {
    return true // 自定义服务商不验证模型
  }
  
  const providerConfig = llmProviders.find(p => p.name === provider)
  return providerConfig ? providerConfig.models.includes(model) : false
}