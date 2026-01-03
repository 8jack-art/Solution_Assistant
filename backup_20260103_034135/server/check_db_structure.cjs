const { pool } = require('./dist/db/config.js');

(async () => {
  try {
    console.log('检查数据库结构...');
    
    // 获取所有表
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('\n数据库表列表:');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(tableNames);
    
    // 检查投资相关表
    const investmentTables = tableNames.filter(name => 
      name.includes('investment') || name.includes('estimate')
    );
    console.log('\n投资相关表:', investmentTables);
    
    // 检查每个表的结构
    for (const tableName of investmentTables) {
      console.log(`\n=== ${tableName} 表结构 ===`);
      const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
      console.log(columns.map(col => `${col.Field}: ${col.Type}`));
      
      // 检查是否有数据
      const [count] = await pool.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`数据行数: ${count[0].count}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
})();