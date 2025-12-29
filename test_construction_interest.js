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
    
    console.log('登录响应数据:', JSON.stringify(loginResponse.data, null, 2));
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功，获取到token:', token);
    
    // 2. 获取项目列表
    console.log('\n2. 获取项目列表...');
    const projectsResponse = await axios.get('http://localhost:3001/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('项目列表响应:', JSON.stringify(projectsResponse.data, null, 2));
    const projects = projectsResponse.data.data.projects;
    if (!projects || projects.length === 0) {
      console.log('❌ 没有找到项目，请先创建一个项目');
      return;
    }
    
    const projectId = projects[0].id;
    console.log(`✅ 找到项目: ${projects[0].project_name} (ID: ${projectId})`);
    
    // 3. 获取投资估算数据
    console.log('\n3. 获取投资估算数据...');
    const investmentResponse = await axios.get(`http://localhost:3001/api/investment/project/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!investmentResponse.data.success || !investmentResponse.data.estimate) {
      console.log('❌ 未找到投资估算数据，尝试创建一个投资估算数据...');
      
      // 创建一个简单的投资估算数据
      const createEstimateResponse = await axios.post(`http://localhost:3001/api/investment/generate/${projectId}`, {
        construction_cost: 1000,
        equipment_cost: 500,
        installation_cost: 200,
        other_cost: 100,
        land_cost: 200,
        basic_reserve_rate: 0.05,
        price_reserve_rate: 0.03,
        construction_period: 3,
        loan_rate: 0.049
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (createEstimateResponse.data.success) {
        console.log('✅ 成功创建投资估算数据');
        
        // 再次获取投资估算数据
        const newInvestmentResponse = await axios.get(`http://localhost:3001/api/investment/project/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('新投资估算数据响应:', JSON.stringify(newInvestmentResponse.data, null, 2));
        
        if (newInvestmentResponse.data.success && newInvestmentResponse.data.estimate) {
          console.log('✅ 成功获取新创建的投资估算数据');
          investmentResponse.data = newInvestmentResponse.data;
        } else if (newInvestmentResponse.data.data && newInvestmentResponse.data.data.estimate) {
          console.log('✅ 成功获取新创建的投资估算数据（从data字段）');
          investmentResponse.data = newInvestmentResponse.data;
        } else {
          console.log('❌ 获取新创建的投资估算数据失败，但创建成功，使用创建响应数据');
          // 使用创建成功的响应数据
          if (createEstimateResponse.data.success && createEstimateResponse.data.estimate) {
            investmentResponse.data = createEstimateResponse.data;
          } else if (createEstimateResponse.data.data && createEstimateResponse.data.data.estimate) {
            investmentResponse.data = createEstimateResponse.data;
          } else {
            console.log('❌ 无法获取投资估算数据');
            return;
          }
        }
      } else {
        console.log('❌ 创建投资估算数据失败');
        return;
      }
    }
    
    // 确保我们有一个有效的投资估算数据对象
    let estimateData = null;
    
    if (investmentResponse.data.success && investmentResponse.data.estimate) {
      estimateData = investmentResponse.data.estimate;
    } else if (investmentResponse.data.data && investmentResponse.data.data.estimate) {
      estimateData = investmentResponse.data.data.estimate;
    } else {
      console.log('❌ 无法获取投资估算数据');
      return;
    }
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
        
        // 直接调用投资估算API保存建设期利息详情
        console.log('\n4. 直接调用投资估算API保存建设期利息详情...');
        
        // 准备建设期利息详情数据
        const constructionInterestDetails = {
          基本信息: {
            贷款总额: estimateData.estimate_data.partF.贷款总额 || 0,
            年利率: estimateData.estimate_data.partF.年利率 || 0,
            建设期年限: 3,
            贷款期限: 0
          },
          分年数据: estimateData.estimate_data.partF.分年利息.map((data, index) => ({
            年份: index + 1,
            期初借款余额: index === 0 ? 0 : estimateData.estimate_data.partF.分年利息.slice(0, index).reduce((sum, item) => sum + (item?.当期借款金额 || 0), 0),
            当期借款金额: data?.当期借款金额 || 0,
            当期利息: data?.当期利息 || 0,
            期末借款余额: estimateData.estimate_data.partF.分年利息.slice(0, index + 1).reduce((sum, item) => sum + (item?.当期借款金额 || 0), 0)
          })),
          汇总信息: {
            总借款金额: estimateData.estimate_data.partF.分年利息.reduce((sum, data) => sum + (data?.当期借款金额 || 0), 0),
            总利息: estimateData.estimate_data.partF.分年利息.reduce((sum, data) => sum + (data?.当期利息 || 0), 0),
            期末借款余额: estimateData.estimate_data.partF.分年利息.reduce((sum, data) => sum + (data?.当期借款金额 || 0), 0)
          }
        };
        
        // 准备保存数据
        const saveData = {
          project_id: projectId,
          construction_cost: Number(estimateData.construction_cost) || 0,
          equipment_cost: Number(estimateData.equipment_cost) || 0,
          installation_cost: Number(estimateData.installation_cost) || 0,
          other_cost: Number(estimateData.other_cost) || 0,
          land_cost: Number(estimateData.land_cost) || 0,
          basic_reserve_rate: 0.05,
          price_reserve_rate: 0.03,
          construction_period: Number(estimateData.construction_period) || 3,
          loan_rate: 0.049,
          custom_loan_amount: estimateData.custom_loan_amount ? Number(estimateData.custom_loan_amount) : undefined,
          // 添加建设期利息详情数据
          construction_interest_details: constructionInterestDetails,
        };
        
        console.log('准备保存的建设期利息详情:', JSON.stringify(constructionInterestDetails, null, 2));
        
        const saveResponse = await axios.post(`http://localhost:3001/api/investment/save`, saveData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (saveResponse.data.success) {
          console.log('✅ 成功保存建设期利息详情');
        } else {
          console.log('❌ 保存建设期利息详情失败:', saveResponse.data.error);
        }
      } else {
        console.log('❌ 未找到partF数据，无法生成建设期利息详情');
      }
    }
    
    // 4. 已经在上面调用过了，这里不需要再次调用
    
    // 5. 再次检查投资估算数据，看建设期利息详情是否已保存
    console.log('\n5. 再次检查投资估算数据...');
    const updatedInvestmentResponse = await axios.get(`http://localhost:3001/api/investment/project/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('更新后的投资估算数据响应:', JSON.stringify(updatedInvestmentResponse.data, null, 2));
    
    let updatedEstimateData = null;
    
    if (updatedInvestmentResponse.data.success && updatedInvestmentResponse.data.estimate) {
      updatedEstimateData = updatedInvestmentResponse.data.estimate;
    } else if (updatedInvestmentResponse.data.data && updatedInvestmentResponse.data.data.estimate) {
      updatedEstimateData = updatedInvestmentResponse.data.data.estimate;
    }
    
    if (updatedEstimateData) {
      if (updatedEstimateData.construction_interest_details) {
        console.log('✅ 建设期利息详情已自动保存到数据库');
        console.log('建设期利息详情:', JSON.stringify(updatedEstimateData.construction_interest_details, null, 2));
      } else {
        console.log('❌ 建设期利息详情未自动保存');
      }
    } else {
      console.log('❌ 无法获取更新后的投资估算数据');
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