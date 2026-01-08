import ZhipuAI from 'zhipu-sdk-js'

async function testZhipuAuthDebug() {
  console.log('🔍 智谱AI认证调试测试')
  console.log('='.repeat(60))

  const apiKey = 'd691880704c849b9a8c94e5b0d50571e.MYhOvCo29y6krtB9'
  
  // 测试不同的初始化方式
  console.log('\n🧪 测试1: 标准SDK初始化')
  try {
    const client = new ZhipuAI({ apiKey })
    
    console.log('客户端创建成功')
    console.log('正在测试glm-4-flash模型...')
    
    const response = await client.createCompletions({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'user',
          content: '你好，这是一个连接测试。'
        }
      ],
      temperature: 0.1,
      maxTokens: 10
    })
    
    console.log('✅ 标准SDK测试成功')
    console.log('响应:', response)
    
  } catch (error) {
    console.log('❌ 标准SDK测试失败')
    console.log('错误详情:', error)
    
    // 检查是否是认证问题
    if (error instanceof Error && error.message.includes('401')) {
      console.log('\n🔍 检查认证头格式...')
      
      // 尝试手动构造请求来验证API密钥
      await testManualRequest(apiKey)
    }
  }

  console.log('\n🧪 测试2: 尝试不同的认证方式')
  try {
    // 尝试Bearer token格式
    const client2 = new ZhipuAI({ 
      apiKey: `Bearer ${apiKey}`
    })
    
    const response2 = await client2.createCompletions({
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: '测试' }],
      maxTokens: 5
    })
    
    console.log('✅ Bearer格式成功')
    console.log('响应:', response2)
    
  } catch (error) {
    console.log('❌ Bearer格式失败')
    console.log('错误:', error)
  }

  console.log('\n🧪 测试3: 检查SDK版本和文档')
  console.log('SDK版本检查...')
  
  // 检查SDK的默认配置
  const client3 = new ZhipuAI({ apiKey })
  console.log('客户端配置:', (client3 as any).config || '无配置信息')
}

async function testManualRequest(apiKey: string) {
  console.log('\n🔧 手动HTTP请求测试')
  
  try {
    const https = require('https')
    const { URL } = require('url')
    
    const url = new URL('https://open.bigmodel.cn/api/paas/v4/chat/completions')
    
    const data = JSON.stringify({
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: '测试' }],
      max_tokens: 5,
      temperature: 0.1
    })
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data)
      }
    }
    
    console.log('请求选项:', JSON.stringify(options.headers, null, 2))
    
    const req = https.request(options, (res: any) => {
      let responseData = ''
      
      res.on('data', (chunk: any) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        console.log('手动请求状态码:', res.statusCode)
        console.log('手动请求响应:', responseData)
        
        try {
          const parsed = JSON.parse(responseData)
          if (parsed.choices && parsed.choices.length > 0) {
            console.log('✅ 手动请求成功:', parsed.choices[0].message?.content)
          } else {
            console.log('❌ 手动请求失败:', parsed)
          }
        } catch (e) {
          console.log('解析响应失败:', responseData)
        }
      })
    })
    
    req.on('error', (error: any) => {
      console.log('手动请求错误:', error.message)
    })
    
    req.write(data)
    req.end()
    
  } catch (error) {
    console.log('手动请求异常:', error)
  }
}

// 运行测试
testZhipuAuthDebug().then(() => {
  console.log('\n🏁 认证调试测试完成')
}).catch((error) => {
  console.error('测试过程中发生异常:', error)
})
