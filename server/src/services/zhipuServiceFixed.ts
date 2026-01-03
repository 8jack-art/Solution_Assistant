import axios from 'axios'
import { LLMConfig } from '../types/index.js'

export interface ZhipuResponse {
  success: boolean
  content?: string
  error?: string
}

export interface ZhipuStreamResponse {
  success: boolean
  stream?: ReadableStream<Uint8Array>
  error?: string
}

/**
 * 智谱AI服务类 - 修复版本
 * 基于官方API的直接封装，修复认证问题
 */
export class ZhipuAIServiceFixed {
  private clientCache = new Map<string, any>()

  /**
   * 获取或创建客户端实例
   */
  private getClient(config: LLMConfig): any {
    const cacheKey = `${config.api_key}-${config.base_url}`
    
    if (this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey)
    }

    // 创建正确的axios客户端，使用Bearer认证
    const client = axios.create({
      baseURL: config.base_url,
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      withCredentials: false // 修复withCredentials问题
    })
    
    this.clientCache.set(cacheKey, client)
    return client
  }

  /**
   * 测试连接
   */
  static async testConnection(config: LLMConfig): Promise<ZhipuResponse> {
    try {
      console.log('='.repeat(60))
      console.log('智谱AI 修复版本连接测试')
      console.log('='.repeat(60))
      console.log('Provider:', config.provider)
      console.log('Model:', config.model)
      console.log('API Key:', config.api_key.substring(0, 8) + '***')

      // 使用修复的客户端
      const client = axios.create({
        baseURL: config.base_url,
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json'
        },
        withCredentials: false
      })
      
      const response = await client.post('/chat/completions', {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个有用的AI助手。'
          },
          {
            role: 'user',
            content: '你好，这是一个连接测试。'
          }
        ],
        temperature: 0.1,
        max_tokens: 10,
        stream: false
      })

      console.log('智谱AI API响应状态:', response.status)
      console.log('智谱AI API响应数据:', JSON.stringify(response.data, null, 2))
      
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message?.content || ''
        return {
          success: true,
          content
        }
      } else {
        return {
          success: false,
          error: '响应格式无效'
        }
      }
    } catch (error) {
      console.error('智谱AI API连接失败:', error)
      
      if (axios.isAxiosError(error)) {
        console.error('Axios错误详情:')
        console.error('  状态码:', error.response?.status)
        console.error('  响应数据:', error.response?.data)
        console.error('  请求头:', error.config?.headers)
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 生成内容
   */
  static async generateContent(
    config: LLMConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      maxTokens?: number
      temperature?: number
    }
  ): Promise<ZhipuResponse> {
    try {
      const client = axios.create({
        baseURL: config.base_url,
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json'
        },
        withCredentials: false
      })
      
      const response = await client.post('/chat/completions', {
        model: config.model,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
        stream: false
      })

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message?.content || ''
        return {
          success: true,
          content
        }
      } else {
        return {
          success: false,
          error: '响应格式无效'
        }
      }
    } catch (error) {
      console.error('智谱AI API生成失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 流式生成内容
   */
  static async generateContentStream(
    config: LLMConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      maxTokens?: number
      temperature?: number
    }
  ): Promise<ZhipuStreamResponse> {
    try {
      const client = axios.create({
        baseURL: config.base_url,
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json'
        },
        withCredentials: false,
        responseType: 'stream'
      })
      
      const response = await client.post('/chat/completions', {
        model: config.model,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 8000,
        stream: true
      })

      return {
        success: true,
        stream: response.data
      }
    } catch (error) {
      console.error('智谱AI API流式生成失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}
