const EventSource = require('eventsource');

// 测试SSE功能
async function testSSE() {
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
    
    // 生成一个报告
    const generateResponse = await fetch('http://localhost:3001/api/report/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        project_id: 'test-project-' + Date.now(),
        report_title: '测试投资方案报告',
        use_default_config: true
      })
    });
    
    const generateData = await generateResponse.json();
    if (!generateData.success) {
      throw new Error('生成报告失败: ' + generateData.error);
    }
    
    const reportId = generateData.data.report_id;
    console.log('✅ 报告生成请求成功，报告ID:', reportId);
    
    // 测试SSE流
    console.log('🔄 开始监听SSE流...');
    const eventSource = new EventSource(`http://localhost:3001/api/report/stream/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    let messageCount = 0;
    
    eventSource.onmessage = (event) => {
      messageCount++;
      const data = JSON.parse(event.data);
      console.log(`📨 收到消息 #${messageCount}:`, data.type);
      
      if (data.type === 'completed') {
        console.log('🎉 报告生成完成!');
        console.log('📄 内容长度:', data.content.length);
        eventSource.close();
      } else if (data.type === 'error') {
        console.log('❌ 生成错误:', data.error);
        eventSource.close();
      } else if (data.type === 'content') {
        console.log('📝 内容更新，当前长度:', data.content.length);
      }
    };
    
    eventSource.onerror = (error) => {
      console.log('❌ SSE错误:', error);
      eventSource.close();
    };
    
    // 30秒超时
    setTimeout(() => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        console.log('⏰ 测试超时，关闭连接');
        eventSource.close();
      }
    }, 30000);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 等待服务器启动
setTimeout(testSSE, 2000);
