const { config } = require('dotenv');
config();

async function testZhipuAI() {
  console.log('开始测试智谱AI连接...');
  
  try {
    // 注意：这里我们使用 http 模块而不是 node-fetch，因为项目已经是 ES Modules
    const https = require('https');
    const { URL } = require('url');
    
    // 智谱AI配置信息
    const zhipuConfig = {
      apiKey: 'YOUR_ZHIPUAI_API_KEY', // 需要替换为实际的API密钥
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: 'glm-4.5-flash'
    };
    
    // 构造请求选项
    const url = new URL(zhipuConfig.baseUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${zhipuConfig.apiKey}`
      }
    };
    
    // 发送请求
    const requestData = JSON.stringify({
      model: zhipuConfig.model,
      messages: [
        {
          role: 'user',
          content: '你好，这是一个连接测试。'
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    });
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('响应状态:', res.statusCode);
        console.log('响应头:', res.headers);
        console.log('响应数据:', data);
        
        try {
          const jsonData = JSON.parse(data);
          const content = jsonData.choices?.[0]?.message?.content;
          if (content) {
            console.log('测试成功，收到回复:', content);
          } else {
            console.log('响应格式可能不正确');
          }
        } catch (parseError) {
          console.error('解析响应数据失败:', parseError.message);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('请求失败:', error.message);
    });
    
    req.write(requestData);
    req.end();
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

testZhipuAI();