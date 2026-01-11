import axios from 'axios'

// 模拟前端API调用
const API_BASE_URL = 'http://localhost:3001/api'

async function testFrontendAPI(modelName: string) {
  console.log(`\n🧪 测试前端API - 模型: ${modelName}`)
  console.log('-'.repeat(60))
  
  try {
    const response = await axios.post(`${API_BASE_URL}/llm/test-connection`, {
      provider: '智谱AI',
      api_key: 'ea5e20dc878444c989f6c6bc1f115abf.KEGYK4fkkvH05PB7',
      base_url: 'https://open.bigmodel.cn/api/paas/v4',
      model: modelName
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log(`✅ ${modelName} - 前端API测试成功`)
    console.log(`   响应数据:`, response.data)
    return { success: true, model: modelName, response: response.data }
    
  } catch (error) {
    console.log(`❌ ${modelName} - 前端API测试失败`)
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`)
      console.log(`   错误数据:`, error.response.data)
      return { success: false, model: modelName, error: error.response.data }
    } else {
      console.log(`   网络错误: ${error.message}`)
      return { success: false, model: modelName, error: error.message }
    }
  }
}

async function main() {
  console.log('🚀 测试前端API调用机制')
  console.log('='.repeat(60))
  
  // 测试几个关键模型
  const modelsToTest = ['glm-4-flash', 'glm-4.6', 'glm-4.7', 'glm-4.5-flash']
  
  const results = []
  
  for (const model of modelsToTest) {
    const result = await testFrontendAPI(model)
    results.push(result)
    
    // 添加2秒延迟避免频率限制
    console.log('⏳ 等待2秒避免频率限制...')
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log('\n📊 前端API测试结果汇总')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`\n✅ 成功的模型 (${successful.length}):`)
  successful.forEach(r => {
    console.log(`   - ${r.model}`)
  })
  
  console.log(`\n❌ 失败的模型 (${failed.length}):`)
  failed.forEach(r => {
    console.log(`   - ${r.model}: ${JSON.stringify(r.error)}`)
  })
  
  console.log('\n🔍 分析:')
  if (successful.length === results.length) {
    console.log('   所有模型都通过前端API测试，问题可能在UI层面')
  } else if (failed.length > 0) {
    console.log('   部分模型失败，检查错误类型和频率限制')
  }
}

main().catch(console.error)
