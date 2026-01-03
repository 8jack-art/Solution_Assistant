import axios from 'axios'
import crypto from 'crypto'

async function generateJWTToken(apiKey: string): Promise<string> {
  try {
    // 智谱AI的JWT生成方式
    // 根据官方文档，需要将API密钥分割并生成JWT
    const [id, secret] = apiKey.split('.')
    
    if (!id || !secret) {
      throw new Error('API密钥格式错误，应为id.secret格式')
    }
    
    // 创建JWT payload
    const payload = {
      iss: id,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1小时过期
      iat: Math.floor(Date.now() / 1000)
    }
    
    // 创建header
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    }
    
    // Base64URL编码
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
    
    // 创建签名
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url')
    
    return `${encodedHeader}.${encodedPayload}.${signature}`
    
  } catch (error) {
    console.error('JWT生成失败:', error)
    throw error
  }
}

async function testZhipuCorrectAuth() {
  console.log('🔐 测试智谱AI正确认证方式')
  console.log('='.repeat(60))

  const apiKey = 'd691880704c849b9a8c94e5b0d50571e.MYhOvCo29y6krtB9'
  
  // 测试1: 使用JWT令牌
  console.log('\n🧪 测试1: 使用生成的JWT令牌')
  try {
    const jwtToken = await generateJWTToken(apiKey)
    console.log('JWT令牌生成成功:', jwtToken.substring(0, 50) + '...')
    
    const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: '你好，这是一个连接测试。' }],
      max_tokens: 10,
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('JWT认证成功:', response.data)
    
    if (response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message?.content
      console.log('AI回复:', content)
    }
    
  } catch (error) {
    console.log('JWT认证失败:', error.message)
    
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status)
      console.log('响应数据:', JSON.stringify(error.response?.data, null, 2))
    }
  }

  // 测试2: 尝试使用官方SDK的正确方式
  console.log('\n🧪 测试2: 使用官方SDK')
  try {
    // 重新导入官方SDK，但这次使用正确的API密钥格式
    const { default: ZhipuAI } = await import('zhipu-sdk-js')
    
    const client = new ZhipuAI({ 
      apiKey: apiKey // 使用原始API密钥
    })
    
    const response = await client.createCompletions({
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: '你好，这是一个连接测试。' }],
      temperature: 0.1,
      maxTokens: 10
    })
    
    console.log('官方SDK成功:', response)
    
  } catch (error) {
    console.log('官方SDK失败:', error.message)
    
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status)
      console.log('响应数据:', JSON.stringify(error.response?.data, null, 2))
    }
  }
}

testZhipuCorrectAuth()
