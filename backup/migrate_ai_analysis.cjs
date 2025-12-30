const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'sql.gxch.site',
    port: 3306,
    user: 'ProjInvDB',
    password: '8Pd6tTKmkzY6rYSC',
    database: 'ProjInvDB'
  });

  try {
    console.log('✅ 连接数据库成功');
    
    // 添加AI分析结果字段
    await connection.execute(`
      ALTER TABLE revenue_cost_estimates 
      ADD COLUMN IF NOT EXISTS ai_analysis_result JSON DEFAULT NULL COMMENT 'AI推荐营收结构分析结果'
    `);
    
    console.log('✅ 添加ai_analysis_result字段成功');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
