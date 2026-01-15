// @ts-ignore - 智谱AI SDK可能没有类型定义
import { Zhipu } from 'zhipu'
import { LLMConfig } from '../types/index.js'

export interface ZhipuResponse {
  success: boolean
  content?: string
  error?: string
}

export class ZhipuService {
  private static clientCache = new Map<string, any>()

  /**
   * 获取或创建客户端实例
   */
  private static getClient(config: LLMConfig): any {
    const cacheKey = `${config.api_key}-${config.base_url}`
    
    if (this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey)!
    }

    // @ts-ignore
    const client = new Zhipu(config.api_key)
    this.clientCache.set(cacheKey, client)
    return client
  }

  /**
   * 测试连接
   */
  static async testConnection(config: LLMConfig): Promise<ZhipuResponse> {
    try {
      console.log('='.repeat(60))
      console.log('智谱AI SDK连接测试')
      console.log('='.repeat(60))
      console.log('Provider:', config.provider)
      console.log('Model:', config.model)
      console.log('API Key:', config.api_key.substring(0, 8) + '***')

      const client = this.getClient(config)
      
      const response = await client.chat({
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
        max_tokens: 10
      })

      console.log('智谱AI SDK响应:', response)
      
      if (response && response.choices && response.choices.length > 0) {
        const content = response.choices[0].message?.content || ''
        return {
          success: true,
          content
        }
      } else if (response && response.data && response.data.choices) {
        // 兼容不同版本的响应格式
        const content = response.data.choices[0]?.message?.content || ''
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
      console.error('智谱AI SDK连接失败:', error)
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
    messages: Array<{ role: string; content: string }>,
    options?: {
      maxTokens?: number
      temperature?: number
    }
  ): Promise<ZhipuResponse> {
    try {
      const client = this.getClient(config)
      
      const response = await client.chat({
        model: config.model,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000
      })

      if (response && response.choices && response.choices.length > 0) {
        const content = response.choices[0].message?.content || ''
        return {
          success: true,
          content
        }
      } else if (response && response.data && response.data.choices) {
        // 兼容不同版本的响应格式
        const content = response.data.choices[0]?.message?.content || ''
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
      console.error('智谱AI SDK生成失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}