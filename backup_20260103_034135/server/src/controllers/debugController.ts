import { Request, Response } from 'express'
import { z } from 'zod'

const debugTestSchema = z.object({
  provider: z.string().min(1, '服务提供商不能为空'),
  api_key: z.string().min(1, 'API密钥不能为空'),
  base_url: z.string().min(1, '基础URL不能为空'),
  model: z.string().min(1, '模型名称不能为空'),
})

export class DebugController {
  /**
   * 详细的LLM连接诊断
   */
  static async diagnoseConnection(req: Request, res: Response) {
    try {
      const configData = debugTestSchema.parse(req.body)

      console.log('='.repeat(60))
      console.log('LLM连接诊断开始')
      console.log('='.repeat(60))
      console.log('Provider:', configData.provider)
      console.log('Base URL:', configData.base_url)
      console.log('Model:', configData.model)
      console.log('API Key:', configData.api_key.substring(0, 8) + '***')
      console.log('-' .repeat(60))

      // 构建API URL
      let apiUrl = configData.base_url
      if (!apiUrl.includes('/chat/completions')) {
        apiUrl = apiUrl.replace(/\/$/, '')
        apiUrl = `${apiUrl}/chat/completions`
      }
      console.log('最终API URL:', apiUrl)

      const results: any[] = []
      const testMessages = [
        { role: 'user', content: 'Hello' }
      ]

      // 测试用例：不同的请求格式
      const testCases: {
        name: string
        headers: Record<string, string>
        body: Record<string, any>
      }[] = [
        {
          name: '标准OpenAI格式',
          headers: { 'Content-Type': 'application/json' },
          body: {
            model: configData.model,
            messages: testMessages,
            max_tokens: 10,
            temperature: 0.1
          }
        },
        {
          name: '不含max_tokens',
          headers: { 'Content-Type': 'application/json' },
          body: {
            model: configData.model,
            messages: testMessages,
            temperature: 0.1
          }
        },
        {
          name: '不含temperature',
          headers: { 'Content-Type': 'application/json' },
          body: {
            model: configData.model,
            messages: testMessages,
            max_tokens: 10
          }
        },
        {
          name: '仅必需参数',
          headers: { 'Content-Type': 'application/json' },
          body: {
            model: configData.model,
            messages: testMessages
          }
        }
      ]

      // 针对特定提供商的特殊测试
      if (configData.provider.toLowerCase().includes('zhipu') || configData.provider.includes('智谱')) {
        testCases.push({
          name: '智谱AI-带Request-Id',
          headers: { 'Content-Type': 'application/json', 'Request-Id': `debug-${Date.now()}` },
          body: {
            model: configData.model,
            messages: testMessages,
            max_tokens: 10
          }
        })
      }

      if (configData.provider.toLowerCase().includes('volcano') || configData.provider.includes('火山')) {
        testCases.push({
          name: '火山引擎-带额外header',
          headers: { 
            'Content-Type': 'application/json',
            'X-Api-Request-Id': `debug-${Date.now()}`
          },
          body: {
            model: configData.model,
            messages: testMessages,
            max_tokens: 10
          }
        })
      }

      // 执行测试
      for (const testCase of testCases) {
        console.log(`\n测试: ${testCase.name}`)
        console.log('Headers:', JSON.stringify(testCase.headers))
        console.log('Body:', JSON.stringify(testCase.body))

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000)

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${configData.api_key}`,
              ...testCase.headers
            },
            body: JSON.stringify(testCase.body),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          const responseText = await response.text()
          let responseJson = null
          try {
            responseJson = JSON.parse(responseText)
          } catch {}

          const result = {
            testCase: testCase.name,
            status: response.status,
            statusText: response.statusText,
            success: response.ok,
            responseHeaders: Object.fromEntries(response.headers.entries()),
            responseBody: responseJson || responseText,
            content: responseJson?.choices?.[0]?.message?.content || null
          }

          results.push(result)

          console.log(`结果: HTTP ${response.status} ${response.statusText}`)
          console.log(`响应: ${responseText.substring(0, 200)}`)

          // 如果成功，停止测试
          if (response.ok) {
            console.log(`\n✅ ${testCase.name} 成功!`)
            break
          }
        } catch (error: any) {
          const errorResult = {
            testCase: testCase.name,
            success: false,
            error: error.message,
            errorType: error.name
          }
          results.push(errorResult)
          console.log(`❌ 错误: ${error.message}`)
        }
      }

      // 生成诊断报告
      const successResult = results.find(r => r.success)
      const failedResults = results.filter(r => !r.success)

      console.log('\n' + '='.repeat(60))
      console.log('诊断结果汇总')
      console.log('='.repeat(60))
      console.log(`总测试数: ${results.length}`)
      console.log(`成功数: ${successResult ? 1 : 0}`)
      console.log(`失败数: ${failedResults.length}`)

      if (successResult) {
        console.log('\n✅ 连接成功!')
        console.log('推荐配置:')
        console.log('- Base URL:', configData.base_url)
        console.log('- 模型:', configData.model)
        console.log('- 成功的测试用例:', successResult.testCase)
      } else {
        console.log('\n❌ 所有测试都失败')
        console.log('可能的问题:')
        console.log('1. API密钥无效')
        console.log('2. 模型名称不正确')
        console.log('3. Base URL不正确')
        console.log('4. 提供商API格式不兼容')

        // 分析失败原因
        const errors = failedResults.filter(r => r.error)
        if (errors.length > 0) {
          console.log('\n错误类型:')
          const errorTypes = errors.map(e => e.errorType || 'unknown')
          console.log(errorTypes)
        }
      }

      res.json({
        success: !!successResult,
        data: {
          config: {
            provider: configData.provider,
            baseUrl: configData.base_url,
            model: configData.model,
            apiUrl: apiUrl
          },
          results: results,
          summary: {
            totalTests: results.length,
            successCount: successResult ? 1 : 0,
            failedCount: failedResults.length,
            recommendedTestCase: successResult?.testCase || null
          }
        }
      })
    } catch (error: any) {
      console.error('诊断过程出错:', error)
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '输入验证失败',
          message: error.errors[0].message
        })
      }
      res.status(500).json({
        success: false,
        error: '诊断过程出错',
        message: error.message
      })
    }
  }

  /**
   * 获取所有提供商的默认配置
   */
  static async getProviderConfigs(req: Request, res: Response) {
    try {
      const providers = [
        {
          id: 'bailian',
          name: '百炼(阿里)',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          defaultModel: 'qwen-plus',
          authType: 'Bearer',
          notes: '需要阿里云API密钥'
        },
        {
          id: 'zhipuai',
          name: '智谱AI',
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
          defaultModel: 'glm-4.5-flash',
          authType: 'Bearer',
          notes: '需要智谱AI API密钥(84b7开头)'
        },
        {
          id: 'volcano',
          name: '火山引擎',
          baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
          defaultModel: 'doubao-seed-1-6-251015',
          authType: 'Bearer',
          notes: '需要火山引擎API密钥'
        },
        {
          id: 'siliconflow',
          name: '硅基流动',
          baseUrl: 'https://api.siliconflow.cn/v1',
          defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
          authType: 'Bearer',
          notes: '需要硅基流动API密钥'
        }
      ]

      res.json({
        success: true,
        data: { providers }
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
}
