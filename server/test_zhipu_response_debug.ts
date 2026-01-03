import { ZhipuAIService } from './src/services/zhipuService'

const testConfig = {
  id: 'test-zhipu-debug',
  user_id: 'test-user',
  name: 'Test Debug',
  provider: 'zhipu',
  model: 'glm-4.6',
  api_key: 'ea5e20dc878444c989f6c6bc1f115abf.KEGYK4fkkvH05PB7',
  base_url: 'https://open.bigmodel.cn/api/paas/v4',
  is_default: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

async function debugZhipuResponse() {
  console.log('🔍 调试智谱AI响应格式')
  console.log('=' .repeat(60))
  
  try {
    console.log('\n📡 调用 testConnection 方法...')
    const result = await ZhipuAIService.testConnection(testConfig)
    
    console.log('\n📋 完整返回结果:')
    console.log(JSON.stringify(result, null, 2))
    
    if (result.success) {
      console.log('\n✅ 连接成功')
    } else {
      console.log('\n❌ 连接失败')
      console.log('错误信息:', result.error)
    }
    
  } catch (error) {
    console.error('\n💥 捕获到异常:')
    console.error('错误类型:', (error as Error).constructor.name)
    console.error('错误消息:', (error as Error).message)
    if ((error as any).response) {
      console.error('响应数据:', (error as any).response.data)
      console.error('响应状态:', (error as any).response.status)
    }
  }
  
  console.log('\n🎯 测试完成')
}

// 执行调试
debugZhipuResponse()
