const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'sql.gxch.site',
    port: 3306,
    user: 'ProjInvDB',
    password: '8Pd6tTKmkzY6rYSC',
    database: 'ProjInvDB'
  });

  try {
    console.log('开始执行报告表迁移...');
    
    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'migrations/003_add_report_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // 分割SQL语句
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('执行SQL:', statement.substring(0, 100) + '...');
        await connection.execute(statement);
      }
    }
    
    console.log('报告表迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    await connection.end();
  }
}

migrate();