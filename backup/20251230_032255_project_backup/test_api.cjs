const axios = require('axios');

async function testAPI() {
  try {
    // 先登录获取token
    console.log('1. 登录...');
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: '123456'
    });
    
    const token = loginRes.data.data.token;
    console.log('✅ 登录成功，token:', token.substring(0, 20) + '...');
    
    // 获取项目列表
    console.log('\n2. 获取项目列表...');
    const projectsRes = await axios.get('http://localhost:3001/api/projects', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('项目数量:', projectsRes.data.data?.length || 0);
    
    if (!projectsRes.data.data || projectsRes.data.data.length === 0) {
      console.log('⚠️ 没有项目，跳过API测试');
      console.log('请在浏览器中先创建一个项目，然后再次运行此测试');
      return;
    }
    
    const projectId = projectsRes.data.data[0].id;
    console.log('✅ 找到项目ID:', projectId);
    
    // 测试修改土地费用
    console.log('\n3. 测试修改土地费用...');
    const landCostRes = await axios.post(
      `http://localhost:3001/api/investment/generate/${projectId}`,
      {
        ai_items: undefined,
        custom_loan_amount: undefined,
        custom_land_cost: 5000
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ 土地费用修改成功');
    console.log('响应:', JSON.stringify(landCostRes.data, null, 2).substring(0, 200) + '...');
    
    // 测试修改贷款额
    console.log('\n4. 测试修改贷款额...');
    const loanRes = await axios.post(
      `http://localhost:3001/api/investment/generate/${projectId}`,
      {
        ai_items: undefined,
        custom_loan_amount: 30000,
        custom_land_cost: undefined
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ 贷款额修改成功');
    console.log('响应:', JSON.stringify(loanRes.data, null, 2).substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('详细错误:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAPI();
