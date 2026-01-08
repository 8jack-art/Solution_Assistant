import axios from 'axios'

async function testOfficialCurlFormat() {
  console.log('🔧 测试官方curl命令格式')
  console.log('='.repeat(60))

  const apiKey = 'ea5e20dc878444c989f6c6bc1f115abf.KEGYK4fkkvH05PB7'
  
  // 完全按照官方curl命令的格式
  console.log('\n🧪 测试: 官方curl命令格式')
  try {
    const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      model: 'glm-4.7',
      messages: [
        {
          role: 'system',
          content: '你是一个有用的AI助手。'
        },
        {
          role: 'user',
          content: '你好，请介绍一下自己。'
        }
      ],
      temperature: 1.0,
      stream: false  // 先测试非流式
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    console.log('✅ 官方格式测试成功!')
    console.log('响应状态:', response.status)
    console.log('响应数据:', JSON.stringify(response.data, null, 2))
    
    if (response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message?.content
      console.log('AI回复:', content)
    }
    
  } catch (error) {
    console.log('❌ 官方格式测试失败')
    
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status)
      console.log('响应数据:', JSON.stringify(error.response?.data, null, 2))
      console.log('请求头:', JSON.stringify(error.config?.headers, null, 2))
    } else {
      console.log('错误:', error.message)
    }
  }

  // 测试glm-4-flash模型
  console.log('\n🧪 测试: glm-4-flash模型')
  try {
    const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      model: 'glm-4-flash',
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
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    console.log('✅ glm-4-flash测试成功!')
    console.log('响应状态:', response.status)
    console.log('AI回复:', response.data.choices[0]?.message?.content)
    
  } catch (error) {
    console.log('❌ glm-4-flash测试失败')
    
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status)
      console.log('响应数据:', JSON.stringify(error.response?.data, null, 2))
    } else {
      console.log('错误:', error.message)
    }
  }

  // 测试glm-4.6模型
  console.log('\n🧪 测试: glm-4.6模型')
  try {
    const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      model: 'glm-4.6',
      messages: [
        {
          role: 'user',
          content: '你好，这是一个连接测试。'
        }
      ],
      temperature: 0.1,
      max_tokens: 10,
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    console.log('✅ glm-4.6测试成功!')
    console.log('响应状态:', response.status)
    console.log('AI回复:', response.data.choices[0]?.message?.content)
    
  } catch (error) {
    console.log('❌ glm-4.6测试失败')
    
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status)
      console.log('响应数据:', JSON.stringify(error.response?.data, null, 2))
    } else {
      console.log('错误:', error.message)
    }
  }
}

testOfficialCurlFormat()
