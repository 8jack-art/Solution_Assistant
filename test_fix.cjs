const axios = require('axios');

async function testFix() {
  console.log('测试修复后的PUT请求...');
  
  try {
    // 1. 登录获取token
    console.log('\n1. 登录获取token...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: '123456'
    });
    
    if (loginResponse.data.success) {
      console.log('✓ 登录成功');
      const token = loginResponse.data.data.token;
      
      // 2. 获取当前配置信息
      console.log('\n2. 获取当前配置信息...');
      const configResponse = await axios.get('http://localhost:3001/api/llm', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const configs = configResponse.data.data.configs;
      const targetConfig = configs.find(c => c.id === '0912b1d6-d718-11f0-afa2-0242ac120002');
      
      if (targetConfig) {
        console.log('找到目标配置:', targetConfig.name);
        
        // 3. 模拟前端可能发送的数据格式
        const frontendData = {
          name: targetConfig.name,
          provider: targetConfig.provider,
          api_key: targetConfig.api_key,
          base_url: targetConfig.base_url,
          model: targetConfig.model,
          is_default: targetConfig.is_default
        };
        
        console.log('\n3. 模拟前端发送的数据:', JSON.stringify(frontendData, null, 2));
        
        // 4. 发送PUT请求
        console.log('\n4. 发送PUT请求...');
        const putResponse = await axios.put(
          `http://localhost:3001/api/llm/${targetConfig.id}`,
          frontendData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('PUT响应:', JSON.stringify(putResponse.data, null, 2));
        
      } else {
        console.log('未找到目标配置');
      }
      
    } else {
      console.log('登录失败:', loginResponse.data.error);
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

testFix();