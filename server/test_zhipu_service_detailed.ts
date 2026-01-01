import { ZhipuAIService } from './src/services/zhipuService.js'
import { LLMConfig } from './src/types/index.js'

async function testZhipuServiceDetailed() {
  console.log('🔍 详细测试ZhipuAIService响应格式')
  console.log('='.repeat(70))

  const config: LLMConfig = {
    id: 'test-1',
    user_id: 'test-user',
    name: '智谱AI测试',
    provider: '智谱AI',
    model: 'glm-4.6',
    api_key: 'd691880704c849b9a8c94e5b0d50571e.MYhOvCo29y6krtB9',
    base_url: 'https://open.bigmodel.cn/api/paas/v4',
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  try {
    console.log('\n📋 测试配置:')
    console.log('  Provider:', config.provider)
    console.log('  Model:', config.model)
    console.log('  API Key:', config.api_key.substring(0, 8) + '***')
    console.log('  Base URL:', config.base_url)

    console.log('\n🚀 调用ZhipuAIService.testConnection...')
    
    // 直接调用服务方法
    const result = await ZhipuAIService.testConnection(config)
    
    console.log('\n📊 原始响应结果:')
    console.log('  Success:', result.success)
    console.log('  Content:', result.content)
    console.log('  Error:', result.error)
    
    if (result.success) {
      console.log('\n✅ 服务层测试成功')
      console.log('  响应内容长度:', result.content?.length || 0)
      console.log('  响应内容预览:', result.content?.substring(0, 100) + (result.content && result.content.length > 100 ? '...' : ''))
    } else {
      console.log('\n❌ 服务层测试失败')
      console.log('  错误信息:', result.error)
    }
    
  } catch (error) {
    console.error('\n💥 捕获到异常:')
    console.error('  错误类型:', typeof error)
    console.error('  错误名称:', error instanceof Error ? error.name : 'N/A')
    console.error('  错误消息:', error instanceof Error ? error.message : String(error))
    console.error('  错误堆栈:', error instanceof Error ? error.stack : 'N/A')
  }
}

// 测试多个模型
async function testMultipleModels() {
  console.log('\n\n🔄 测试多个模型的响应格式')
  console.log('='.repeat(70))
  
  const models = ['glm-4-flash', 'glm-4.6', 'glm-4.7', 'glm-4.5-flash']
  
  for (const model of models) {
    console.log(`\n🧪 测试模型: ${model}`)
    console.log('-'.repeat(40))
    
    const config: LLMConfig = {
      id: `test-${model}`,
      user_id: 'test-user',
      name: '智谱AI测试',
      provider: '智谱AI',
      model: model,
      api_key: 'd691880704c849b9a8c94e5b0d50571e.MYhOvCo29y6krtB9',
      base_url: 'https://open.bigmodel.cn/api/paas/v4',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    try {
      const result = await ZhipuAIService.testConnection(config)
      
      if (result.success) {
        console.log(`✅ ${model} - 成功`)
        console.log(`   内容: "${result.content?.substring(0, 50)}..."`)
      } else {
        console.log(`❌ ${model} - 失败`)
        console.log(`   错误: "${result.error}"`)
      }
    } catch (error) {
      console.log(`💥 ${model} - 异常`)
      console.log(`   错误: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    // 等待2秒避免频率限制
    if (models.indexOf(model) < models.length - 1) {
      console.log('⏳ 等待2秒...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

// 运行测试
async function main() {
  try {
    await testZhipuServiceDetailed()
    await testMultipleModels()
  } catch (error) {
    console.error('\n💥 主测试流程异常:', error)
  }
  
  console.log('\n🏁 测试完成')
}

main()
