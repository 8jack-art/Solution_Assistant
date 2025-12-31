// 使用原生fetch测试SSE
async function testSSENative() {
  console.log('🧪 开始测试SSE流式输出功能...');
  
  try {
    // 首先登录获取token
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: '123456'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      throw new Error('登录失败: ' + loginData.error);
    }
    
    const token = loginData.data.token;
    console.log('✅ 登录成功，获得token');
    
    // 直接测试SSE端点
    const testReportId = 'test-report-' + Date.now();
    console.log('🔄 开始测试SSE流，报告ID:', testReportId);
    
    const response = await fetch(`http://localhost:3001/api/report/stream/${testReportId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('📡 SSE响应状态:', response.status);
    console.log('📡 SSE响应头:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 200) {
      console.log('✅ SSE连接成功');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('🔚 流结束');
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('📨 收到SSE消息:', data.type, '-', data.status || '');
              
              if (data.type === 'error') {
                console.log('❌ 服务器错误:', data.error);
                return;
              }
            } catch (e) {
              console.log('⚠️ 解析消息失败:', line);
            }
          }
        }
      }
    } else {
      const errorText = await response.text();
      console.log('❌ SSE连接失败:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 等待服务器启动
setTimeout(testSSENative, 2000);
