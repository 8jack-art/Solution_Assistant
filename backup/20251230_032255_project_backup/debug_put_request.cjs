const axios = require('axios');

async function debugPutRequest() {
  console.log('开始调试PUT请求...');
  
  try {
    // 1. 首先登录获取token
    console.log('\n1. 登录获取token...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: '123456'
    });
    
    if (loginResponse.data.success) {
      console.log('✓ 登录成功');
      const token = loginResponse.data.data.token;
      console.log('Token:', token.substring(0, 20) + '...');
      
      // 2. 准备更新数据
      const updateData = {
        name: "硅基流动 - zai-org/GLM-4.5-Air",
        provider: "硅基流动",
        api_key: "sk-kqvueomxdtqcznbjzatearvbwzrvhpylbgjnkmjsapnigoiu",
        base_url: "https://api.siliconflow.cn/v1",
        model: "deepseek-ai/DeepSeek-V3.2",
        is_default: true
      };
      
      console.log('\n2. 准备更新数据:', JSON.stringify(updateData, null, 2));
      
      // 3. 发送PUT请求
      console.log('\n3. 发送PUT请求...');
      const putResponse = await axios.put(
        'http://localhost:3001/api/llm/0912b1d6-d718-11f0-afa2-0242ac120002',
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('PUT响应:', JSON.stringify(putResponse.data, null, 2));
      
    } else {
      console.log('✗ 登录失败:', loginResponse.data.error);
    }
  } catch (error) {
    console.error('请求过程中发生错误:');
    console.error('错误信息:', error.message);
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugPutRequest();