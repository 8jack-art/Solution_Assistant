const EventSource = require('eventsource');

// 简化的SSE测试
async function testSSESimple() {
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
    
    // 直接测试一个报告ID的SSE流（模拟现有报告）
    const testReportId = 'test-report-' + Date.now();
    console.log('🔄 开始监听SSE流，报告ID:', testReportId);
    
    const eventSource = new EventSource(`http://localhost:3001/api/report/stream/${testReportId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    let messageCount = 0;
    
    eventSource.onmessage = (event) => {
      messageCount++;
      const data = JSON.parse(event.data);
      console.log(`📨 收到消息 #${messageCount}:`, data.type, '-', data.status || '');
      
      if (data.type === 'completed') {
        console.log('🎉 报告生成完成!');
        console.log('📄 内容长度:', data.content ? data.content.length : 0);
        eventSource.close();
      } else if (data.type === 'error') {
        console.log('❌ 生成错误:', data.error);
        eventSource.close();
      } else if (data.type === 'content') {
        console.log('📝 内容更新，当前长度:', data.content ? data.content.length : 0);
      } else if (data.type === 'status') {
        console.log('📊 状态更新:', data.status);
      }
    };
    
    eventSource.onerror = (error) => {
      console.log('❌ SSE错误:', error.message || error);
      console.log('📋 连接状态:', eventSource.readyState);
      eventSource.close();
    };
    
    // 10秒超时
    setTimeout(() => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        console.log('⏰ 测试超时，关闭连接');
        console.log('📋 最终状态:', eventSource.readyState);
        eventSource.close();
      }
    }, 10000);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 等待服务器启动
setTimeout(testSSESimple, 2000);
