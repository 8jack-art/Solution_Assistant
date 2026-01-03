const { pool } = require('./dist/db/config.js');
const { ReportService } = require('./dist/services/reportService.js');

(async () => {
  try {
    console.log('测试报告生成功能...');
    
    // 获取一个项目ID
    const [projects] = await pool.execute(
      'SELECT id FROM investment_projects LIMIT 1'
    );
    
    if (projects.length === 0) {
      console.log('没有找到项目，请先创建项目');
      process.exit(1);
    }
    
    const projectId = projects[0].id;
    console.log('使用项目ID:', projectId);
    
    // 测试数据收集
    console.log('\n=== 测试数据收集 ===');
    const projectData = await ReportService.collectProjectData(projectId);
    
    console.log('项目基本信息:', {
      name: projectData.project.name,
      totalInvestment: projectData.project.totalInvestment,
      constructionYears: projectData.project.constructionYears,
      operationYears: projectData.project.operationYears
    });
    
    console.log('投资数据键:', Object.keys(projectData.investment));
    console.log('收入成本数据键:', Object.keys(projectData.revenueCost));
    console.log('财务指标键:', Object.keys(projectData.financialIndicators));
    
    // 检查数据是否完整
    const hasInvestment = Object.keys(projectData.investment).length > 0;
    const hasRevenueCost = Object.keys(projectData.revenueCost).length > 0;
    const hasProject = projectData.project.name && projectData.project.totalInvestment;
    
    console.log('\n=== 数据完整性检查 ===');
    console.log('项目数据:', hasProject ? '✅' : '❌');
    console.log('投资估算数据:', hasInvestment ? '✅' : '❌');
    console.log('收入成本数据:', hasRevenueCost ? '✅' : '❌');
    
    if (hasInvestment && hasRevenueCost && hasProject) {
      console.log('\n✅ 数据收集成功，可以生成报告');
    } else {
      console.log('\n❌ 数据不完整，无法生成报告');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
})();