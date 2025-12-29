import axios from 'axios';

// 测试脚本：验证建设期利息详情是否自动保存
async function testConstructionInterestDetails() {
  try {
    console.log('🔍 开始测试建设期利息详情自动保存功能...');
    
    // 1. 登录获取token
    console.log('\n1. 登录系统...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 登录成功，获取到token:', token);
    
    // 2. 获取项目列表
    console.log('\n2. 获取项目列表...');
    const projectsResponse = await axios.get('http://localhost:3001/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const projects = projectsResponse.data.projects;
    if (projects.length === 0) {
      console.log('❌ 没有找到项目，请先创建一个项目');
      return;
    }
    
    const projectId = projects[0].id;
    console.log(`✅ 找到项目: ${projects[0].project_name} (ID: ${projectId})`);
    
    // 3. 获取投资估算数据
    console.log('\n3. 获取投资估算数据...');
    const investmentResponse = await axios.get(`http://localhost:3001/api/investment/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!investmentResponse.data.success || !investmentResponse.data.estimate) {
      console.log('❌ 未找到投资估算数据，请先完成投资估算');
      return;
    }
    
    const estimateData = investmentResponse.data.estimate;
    console.log('✅ 获取到投资估算数据');
    
    // 检查是否有建设期利息详情
    if (estimateData.construction_interest_details) {
      console.log('✅ 建设期利息详情已存在');
      console.log('建设期利息详情:', JSON.stringify(estimateData.construction_interest_details, null, 2));
    } else {
      console.log('⚠️ 建设期利息详情不存在，需要检查partF数据');
      
      if (estimateData.estimate_data?.partF) {
        console.log('✅ 找到partF数据，应该会自动生成建设期利息详情');
        console.log('partF数据:', JSON.stringify(estimateData.estimate_data.partF, null, 2));
      } else {
        console.log('❌ 未找到partF数据，无法生成建设期利息详情');
      }
    }
    
    // 4. 模拟访问收入及成本测算页面（触发自动保存）
    console.log('\n4. 模拟访问收入及成本测算页面...');
    const revenueCostResponse = await axios.get(`http://localhost:3001/api/revenue-cost/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (revenueCostResponse.data.success) {
      console.log('✅ 成功访问收入及成本测算页面');
    } else {
      console.log('❌ 访问收入及成本测算页面失败');
    }
    
    // 5. 再次检查投资估算数据，看建设期利息详情是否已保存
    console.log('\n5. 再次检查投资估算数据...');
    const updatedInvestmentResponse = await axios.get(`http://localhost:3001/api/investment/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (updatedInvestmentResponse.data.success && updatedInvestmentResponse.data.estimate) {
      const updatedEstimateData = updatedInvestmentResponse.data.estimate;
      
      if (updatedEstimateData.construction_interest_details) {
        console.log('✅ 建设期利息详情已自动保存到数据库');
        console.log('建设期利息详情:', JSON.stringify(updatedEstimateData.construction_interest_details, null, 2));
      } else {
        console.log('❌ 建设期利息详情未自动保存');
      }
    }
    
    console.log('\n🎉 测试完成');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testConstructionInterestDetails();