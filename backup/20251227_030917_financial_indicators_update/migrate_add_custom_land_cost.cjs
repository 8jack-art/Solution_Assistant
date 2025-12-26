const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'sql.gxch.site',
    port: 3306,
    user: 'clp2001',
    password: 'Njtech@2001',
    database: 'ProjInvDB'
  });

  try {
    console.log('开始执行数据库迁移...');
    
    // 检查列是否已存在
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'ProjInvDB' 
       AND TABLE_NAME = 'investment_estimates' 
       AND COLUMN_NAME = 'custom_land_cost'`
    );
    
    if (columns.length > 0) {
      console.log('custom_land_cost 字段已存在，跳过迁移');
      return;
    }
    
    // 添加字段
    await connection.execute(`
      ALTER TABLE investment_estimates 
      ADD COLUMN custom_land_cost DECIMAL(15,2) DEFAULT NULL 
      COMMENT '自定义土地费用（万元）' 
      AFTER custom_loan_amount
    `);
    
    console.log('✅ 成功添加 custom_land_cost 字段');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);
