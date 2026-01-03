const { pool } = require('./dist/db/config.js');

(async () => {
  try {
    console.log('检查数据内容...');
    
    // 检查投资估算数据
    const [investmentEstimates] = await pool.execute(
      'SELECT * FROM investment_estimates LIMIT 1'
    );
    
    if (investmentEstimates.length > 0) {
      console.log('\n=== 投资估算数据示例 ===');
      const estimate = investmentEstimates[0];
      console.log('项目ID:', estimate.project_id);
      console.log('总投资:', estimate.total_investment);
      console.log('估算数据字段:', estimate.estimate_data ? '存在' : '不存在');
      
      if (estimate.estimate_data) {
        try {
          const parsedData = JSON.parse(estimate.estimate_data);
          console.log('解析后的数据键:', Object.keys(parsedData));
          console.log('数据示例:', JSON.stringify(parsedData, null, 2).substring(0, 500) + '...');
        } catch (e) {
          console.log('解析估算数据失败:', e.message);
        }
      }
    }
    
    // 检查收入成本数据
    const [revenueCostData] = await pool.execute(
      'SELECT * FROM revenue_cost_estimates LIMIT 1'
    );
    
    if (revenueCostData.length > 0) {
      console.log('\n=== 收入成本数据示例 ===');
      const estimate = revenueCostData[0];
      console.log('项目ID:', estimate.project_id);
      console.log('模型数据字段:', estimate.model_data ? '存在' : '不存在');
      
      if (estimate.model_data) {
        try {
          const parsedData = JSON.parse(estimate.model_data);
          console.log('解析后的数据键:', Object.keys(parsedData));
          console.log('数据示例:', JSON.stringify(parsedData, null, 2).substring(0, 500) + '...');
        } catch (e) {
          console.log('解析模型数据失败:', e.message);
        }
      }
    }
    
    // 检查项目数据
    const [projects] = await pool.execute(
      'SELECT * FROM investment_projects LIMIT 1'
    );
    
    if (projects.length > 0) {
      console.log('\n=== 项目数据示例 ===');
      const project = projects[0];
      console.log('项目ID:', project.id);
      console.log('项目名称:', project.project_name);
      console.log('总投资:', project.total_investment);
      console.log('建设期:', project.construction_years);
      console.log('运营期:', project.operation_years);
      console.log('项目信息:', project.project_info ? '存在' : '不存在');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
})();