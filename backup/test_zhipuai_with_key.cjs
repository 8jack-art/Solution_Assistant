const https = require('https');
const { URL } = require('url');

// 智谱AI配置信息（使用您提供的API密钥）
const config = {
  apiKey: 'd60e7db3477f40759cfdf09b8b514334.CLJyDevcBIvhNQyz',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  model: 'glm-4.5-flash'
};

async function testZhipuAI() {
  console.log('开始测试智谱AI连接...');
  console.log('使用模型:', config.model);
  
  try {
    // 构造请求数据
    const postData = JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: '你好，这是一个连接测试。'
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    });
    
    // 解析URL
    const url = new URL(config.baseUrl);
    
    // 配置HTTPS请求选项
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log('发送请求到智谱AI...');
    
    // 发送HTTPS请求
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('响应状态码:', res.statusCode);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('响应数据:', JSON.stringify(jsonData, null, 2));
          
          if (jsonData.choices && jsonData.choices.length > 0) {
            const content = jsonData.choices[0].message.content;
            console.log('测试成功！收到回复:', content);
          } else if (jsonData.error) {
            console.log('API返回错误:', jsonData.error);
          } else {
            console.log('响应格式不符合预期');
          }
        } catch (parseError) {
          console.error('解析响应数据失败:', parseError.message);
          console.log('原始响应数据:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('请求失败:', error.message);
    });
    
    // 发送请求数据
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

// 执行测试
testZhipuAI();