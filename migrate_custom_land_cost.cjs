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
    
    // 检查字段是否存在
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM investment_estimates LIKE 'custom_land_cost'"
    );
    
    if (columns.length > 0) {
      console.log('✅ custom_land_cost字段已存在');
    } else {
      console.log('⚠️  custom_land_cost字段不存在，正在添加...');
      await connection.query(
        "ALTER TABLE investment_estimates ADD COLUMN custom_land_cost DECIMAL(15,2) DEFAULT NULL COMMENT '自定义土地费用（万元）'"
      );
      console.log('✅ custom_land_cost字段添加成功');
    }
    
    // 验证字段
    const [verify] = await connection.query(
      "SHOW COLUMNS FROM investment_estimates LIKE 'custom_land_cost'"
    );
    console.log('✅ 验证结果:', verify);
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
  } finally {
    await connection.end();
  }
}

migrate();
