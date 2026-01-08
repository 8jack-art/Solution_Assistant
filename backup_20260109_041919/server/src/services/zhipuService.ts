import ZhipuAI from 'zhipu-sdk-js'
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
 * 智谱AI服务类
 * 基于官方Node.js SDK的封装
 */
export class ZhipuAIService {
  private clientCache = new Map<string, ZhipuAI>()

  /**
   * 获取或创建客户端实例
   */
  private getClient(config: LLMConfig): ZhipuAI {
    const cacheKey = `${config.api_key}-${config.base_url}`
    
    if (this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey)!
    }

    const client = new ZhipuAI({ 
      apiKey: config.api_key
      // 注意：这个SDK似乎不支持自定义base_url，使用默认的智谱AI端点
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
      console.log('智谱AI Node.js SDK连接测试')
      console.log('='.repeat(60))
      console.log('Provider:', config.provider)
      console.log('Model:', config.model)
      console.log('API Key:', config.api_key.substring(0, 8) + '***')

      const client = new ZhipuAI({ apiKey: config.api_key })
      
      const response = await client.createCompletions({
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
        maxTokens: 10
      })

      console.log('智谱AI SDK响应:', response)
      console.log('响应结构:', JSON.stringify(response, null, 2))
      
      if (response && response.choices && response.choices.length > 0) {
        const choice = response.choices[0]
        const content = choice.message?.content || choice.delta?.content || ''
        console.log('提取的内容:', content)
        
        if (content.trim()) {
          return {
            success: true,
            content
          }
        } else {
          return {
            success: false,
            error: '响应内容为空'
          }
        }
      } else {
        console.log('响应格式问题 - choices不存在或为空')
        console.log('完整响应对象:', response)
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
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      maxTokens?: number
      temperature?: number
    }
  ): Promise<ZhipuResponse> {
    try {
      const client = new ZhipuAI({ apiKey: config.api_key })
      
      const response = await client.createCompletions({
        model: config.model,
        messages,
        temperature: options?.temperature || 0.7,
        maxTokens: options?.maxTokens || 1000
      })

      if (response && response.choices && response.choices.length > 0) {
        const content = response.choices[0].message?.content || ''
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

  /**
   * 流式生成内容
   * 注意：这个SDK可能不支持流式输出，需要查看文档确认
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
      // 检查SDK是否支持流式输出
      const client = new ZhipuAI({ apiKey: config.api_key })
      
      // 如果SDK不支持流式，则回退到普通调用
      console.log('智谱AI SDK暂不支持流式输出，使用普通调用')
      
      const response = await client.createCompletions({
        model: config.model,
        messages,
        temperature: options?.temperature || 0.7,
        maxTokens: options?.maxTokens || 8000,
        stream: false // 明确不使用流式
      })

      if (response && response.choices && response.choices.length > 0) {
        const content = response.choices[0].message?.content || ''
        
        // 将内容转换为流式响应格式
        const stream = new ReadableStream({
          start(controller) {
            // 将完整内容作为一个chunk发送
            const chunk = new TextEncoder().encode(content)
            controller.enqueue(chunk)
            controller.close()
          }
        })

        return {
          success: true,
          stream
        }
      } else {
        return {
          success: false,
          error: '响应格式无效'
        }
      }
    } catch (error) {
      console.error('智谱AI SDK流式生成失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}
