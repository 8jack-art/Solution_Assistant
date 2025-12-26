const axios = require('axios');

async function testFrontendFlow() {
  console.log('开始模拟前端测试流程...');
  
  try {
    // 1. 首先尝试登录获取token
    console.log('\n1. 尝试登录...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: '123456'
    });
    
    if (loginResponse.data.success) {
      console.log('✓ 登录成功');
      const token = loginResponse.data.data.token;
      console.log('Token:', token.substring(0, 20) + '...');
      
      // 2. 使用token测试获取LLM配置
      console.log('\n2. 获取LLM配置列表...');
      const configResponse = await axios.get('http://localhost:3001/api/llm', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('配置响应:', JSON.stringify(configResponse.data, null, 2));
      
      // 3. 测试连接智谱AI配置
      console.log('\n3. 测试智谱AI连接...');
      const testResponse = await axios.post('http://localhost:3001/api/llm/test-connection', {
        provider: '智谱AI',
        api_key: 'd60e7db3477f40759cfdf09b8b514334.CLJyDevcBIvhNQyz',
        base_url: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4.5-flash'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('测试响应:', JSON.stringify(testResponse.data, null, 2));
      
    } else {
      console.log('✗ 登录失败:', loginResponse.data.error);
    }
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFrontendFlow();