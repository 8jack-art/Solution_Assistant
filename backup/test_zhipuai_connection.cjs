const dotenv = require('dotenv');
const mysql = require('mysql2');
const https = require('https');

// 加载环境变量
dotenv.config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// 创建数据库连接
const connection = mysql.createConnection(dbConfig);

async function testZhipuAIConnection() {
  console.log('开始测试智谱AI连接...');
  
  try {
    // 连接数据库
    connection.connect((err) => {
      if (err) {
        console.error('数据库连接失败: ' + err.stack);
        return;
      }
      console.log('数据库连接成功');
      
      // 查询智谱AI配置
      connection.query('SELECT * FROM llm_configs WHERE provider LIKE "%智谱%" LIMIT 1', (error, results) => {
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
        console.log('- 名称:', config.name);
        console.log('- 提供商:', config.provider);
        console.log('- 模型:', config.model);
        console.log('- 基础URL:', config.base_url);
        
        // 构造完整的API URL
        const baseUrl = config.base_url.endsWith('/chat/completions') 
          ? config.base_url 
          : config.base_url.replace(/\/$/, '') + '/chat/completions';
        
        console.log('完整API URL:', baseUrl);
        
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
        const url = new URL(baseUrl);
        
        // 配置HTTPS请求选项
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
        
        // 发送HTTPS请求
        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            console.log('响应状态码:', res.statusCode);
            console.log('响应头:', res.headers);
            
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
            
            // 关闭数据库连接
            connection.end();
          });
        });
        
        req.on('error', (error) => {
          console.error('请求失败:', error.message);
          connection.end();
        });
        
        // 发送请求数据
        req.write(postData);
        req.end();
      });
    });
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    if (connection) {
      connection.end();
    }
  }
}

// 执行测试
testZhipuAIConnection();