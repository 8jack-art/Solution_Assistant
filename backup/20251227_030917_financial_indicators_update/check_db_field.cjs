const mysql = require('mysql2/promise');

async function checkField() {
  const connection = await mysql.createConnection({
    host: 'sql.gxch.site',
    port: 3306,
    user: 'ProjInvDB',
    password: '8Pd6tTKmkzY6rYSC',
    database: 'ProjInvDB'
  });

  try {
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM investment_estimates LIKE 'custom_land_cost'"
    );
    
    console.log('custom_land_cost字段查询结果:');
    console.log(columns);
    
    if (columns.length > 0) {
      console.log('✅ custom_land_cost字段已存在');
    } else {
      console.log('❌ custom_land_cost字段不存在，需要添加');
      
      // 尝试添加字段
      await connection.execute(
        "ALTER TABLE investment_estimates ADD COLUMN custom_land_cost DECIMAL(15,2) DEFAULT NULL COMMENT '自定义土地费用（万元）'"
      );
      console.log('✅ 成功添加custom_land_cost字段');
    }
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkField();
