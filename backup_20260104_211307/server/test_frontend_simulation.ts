import { ZhipuAIService } from './src/services/zhipuService'

const testConfig = {
  id: 'test-zhipu-simulation',
  user_id: 'test-user',
  name: 'Test Frontend Simulation',
  provider: 'zhipu',
  model: 'glm-4.6',
  api_key: 'ea5e20dc878444c989f6c6bc1f115abf.KEGYK4fkkvH05PB7',
  base_url: 'https://open.bigmodel.cn/api/paas/v4',
  is_default: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

async function simulateFrontendAPI() {
  console.log('🎭 模拟前端API调用流程')
  console.log('=' .repeat(60))
  
  try {
    console.log('\n📡 步骤1: 调用 ZhipuAIService.testConnection...')
    const result = await ZhipuAIService.testConnection(testConfig)
    
    console.log('\n📋 服务返回结果:')
    console.log('Success:', result.success)
    console.log('Content:', result.content)
    console.log('Error:', result.error)
    
    if (result.success) {
      console.log('\n✅ 服务调用成功')
      
      // 模拟前端控制器处理
      console.log('\n🎯 步骤2: 模拟控制器处理...')
      
      // 这里模拟控制器中的逻辑
      if (result.success && result.content) {
        const controllerResponse = {
          success: true,
          data: {
            message: '连接测试成功',
            content: result.content
          }
        }
        console.log('✅ 控制器处理成功')
        console.log('响应数据:', JSON.stringify(controllerResponse, null, 2))
      } else {
        const controllerResponse = {
          success: false,
          error: '连接测试失败',
          message: result.error || '未知错误'
        }
        console.log('❌ 控制器处理失败')
        console.log('错误响应:', JSON.stringify(controllerResponse, null, 2))
      }
    } else {
      console.log('\n❌ 服务调用失败')
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
  
  console.log('\n🎯 模拟测试完成')
}

// 执行模拟
simulateFrontendAPI()
