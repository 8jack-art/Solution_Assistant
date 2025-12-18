const mysql = require('mysql2/promise');

async function checkTable() {
  const connection = await mysql.createConnection({
    host: 'sql.gxch.site',
    port: 3306,
    user: 'ProjInvDB',
    password: '8Pd6tTKmkzY6rYSC',
    database: 'ProjInvDB'
  });

  try {
    console.log('✅ 数据库连接成功');
    
    // 查看表结构
    const [columns] = await connection.query('SHOW COLUMNS FROM revenue_cost_estimates');
    console.log('\n📊 revenue_cost_estimates 表结构:');
    console.table(columns);
    
    // 检查是否有 ai_analysis_result 和 workflow_step 字段
    const hasAiAnalysis = columns.some(col => col.Field === 'ai_analysis_result');
    const hasWorkflowStep = columns.some(col => col.Field === 'workflow_step');
    const hasModelData = columns.some(col => col.Field === 'model_data');
    const hasIsCompleted = columns.some(col => col.Field === 'is_completed');
    
    console.log('\n🔍 字段检查:');
    console.log('  ai_analysis_result:', hasAiAnalysis ? '✅ 存在' : '❌ 缺失');
    console.log('  workflow_step:', hasWorkflowStep ? '✅ 存在' : '❌ 缺失');
    console.log('  model_data:', hasModelData ? '✅ 存在' : '❌ 缺失');
    console.log('  is_completed:', hasIsCompleted ? '✅ 存在' : '❌ 缺失');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkTable();
