import axios from 'axios'

async function testZhipuJWTAuth() {
  console.log('🔐 测试智谱AI JWT认证方式')
  console.log('='.repeat(60))

  const apiKey = 'd691880704c849b9a8c94e5b0d50571e.MYhOvCo29y6krtB9'
  
  // 测试1: 尝试生成JWT令牌
  console.log('\n🧪 测试1: 生成JWT令牌')
  try {
    // 智谱AI可能需要使用API密钥生成JWT令牌
    const jwtResponse = await axios.post('https://open.bigmodel.cn/api/paas/v4/token', {
      api_key: apiKey
    })
    
    console.log('JWT令牌生成成功:', jwtResponse.data)
    
  } catch (error) {
    console.log('JWT令牌生成失败:', error.message)
    
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status)
      console.log('响应数据:', error.response?.data)
    }
  }

  // 测试2: 尝试直接使用API密钥作为认证头
  console.log('\n🧪 测试2: 直接使用API密钥')
  try {
    const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: '测试' }],
      max_tokens: 5
    }, {
      headers: {
        'Authorization': apiKey, // 不使用Bearer前缀
        'Content-Type': 'application/json'
      }
    })
    
    console.log('直接API密钥成功:', response.data)
    
  } catch (error) {
    console.log('直接API密钥失败:', error.message)
    
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status)
      console.log('响应数据:', error.response?.data)
    }
  }

  // 测试3: 尝试使用不同的端点
  console.log('\n🧪 测试3: 使用不同端点')
  try {
    const response = await axios.post('https://open.bigmodel.cn/api/paas/v3/chat/completions', {
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: '测试' }],
      max_tokens: 5
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('v3端点成功:', response.data)
    
  } catch (error) {
    console.log('v3端点失败:', error.message)
    
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status)
      console.log('响应数据:', error.response?.data)
    }
  }

  // 测试4: 尝试使用不带版本号的端点
  console.log('\n🧪 测试4: 无版本端点')
  try {
    const response = await axios.post('https://open.bigmodel.cn/api/chat/completions', {
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: '测试' }],
      max_tokens: 5
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('无版本端点成功:', response.data)
    
  } catch (error) {
    console.log('无版本端点失败:', error.message)
    
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status)
      console.log('响应数据:', error.response?.data)
    }
  }

  // 测试5: 尝试使用API密钥作为查询参数
  console.log('\n🧪 测试5: API密钥作为查询参数')
  try {
    const response = await axios.post(`https://open.bigmodel.cn/api/paas/v4/chat/completions?api_key=${encodeURIComponent(apiKey)}`, {
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: '测试' }],
      max_tokens: 5
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('查询参数方式成功:', response.data)
    
  } catch (error) {
    console.log('查询参数方式失败:', error.message)
    
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status)
      console.log('响应数据:', error.response?.data)
    }
  }
}

testZhipuJWTAuth()
