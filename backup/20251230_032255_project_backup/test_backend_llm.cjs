const dotenv = require('dotenv');
const mysql = require('mysql2');

// 加载环境变量
dotenv.config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'sql.gxch.site',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'ProjInvDB',
  password: process.env.DB_PASSWORD || '8Pd6tTKmkzY6rYSC',
  database: process.env.DB_NAME || 'ProjInvDB'
};

// 创建数据库连接
const connection = mysql.createConnection(dbConfig);

// 模拟后端LLM测试逻辑
async function testBackendLLMConnection() {
  console.log('开始模拟后端LLM连接测试...');
  
  try {
    // 连接数据库
    connection.connect((err) => {
      if (err) {
        console.error('数据库连接失败: ' + err.stack);
        return;
      }
      console.log('数据库连接成功');
      
      // 查询智谱AI配置
      connection.query('SELECT * FROM llm_configs WHERE id = ?', ['zhipuai-config-001'], async (error, results) => {
        if (error) {
          console.error('查询失败: ' + error.stack);
          connection.end();
          return;
        }
        
        if (results.length === 0) {
          console.log('未找到智谱AI配置');
          connection.end();
          return;
        }
        
        const config = results[0];
        console.log('找到智谱AI配置:');
        console.log('- ID:', config.id);
        console.log('- 名称:', config.name);
        console.log('- 提供商:', config.provider);
        console.log('- 模型:', config.model);
        console.log('- 基础URL:', config.base_url);
        
        // 模拟后端测试逻辑
        await simulateBackendTest(config);
        
        connection.end();
      });
    });
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    if (connection) {
      connection.end();
    }
  }
}

// 模拟后端测试函数
async function simulateBackendTest(config) {
  console.log('\n--- 模拟后端测试逻辑 ---');
  
  try {
    // 构建完整的API路径
    let apiUrl = config.base_url;
    // 如果 baseUrl 不包含 chat/completions，则添加
    if (!config.base_url.includes('/chat/completions')) {
      // 移除末尾的斜杠
      apiUrl = config.base_url.replace(/\/$/, '');
      apiUrl = `${apiUrl}/chat/completions`;
    }
    
    console.log('构造的API URL:', apiUrl);
    
    // 使用 Node.js 内置的 HTTPS 模块发送请求
    const https = require('https');
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
    
    const url = new URL(apiUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log('发送请求到智谱AI...');
    
    // 创建请求
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
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (jsonData.choices && jsonData.choices.length > 0) {
              console.log('✓ 测试成功！');
            } else {
              console.log('✗ 响应格式无效');
            }
          } else {
            console.log('✗ 请求失败:', jsonData.error?.message || '未知错误');
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
testBackendLLMConnection();