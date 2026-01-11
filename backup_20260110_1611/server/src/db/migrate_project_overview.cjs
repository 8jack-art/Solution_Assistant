// 项目概况表迁移脚本
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'sql.gxch.site',
  port: 3306,
  user: 'ProjInvDB',
  password: '8Pd6tTKmkzY6rYSC',
  database: 'ProjInvDB',
};

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 创建 report_project_overview 表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS report_project_overview (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        content LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_project_id (project_id),
        UNIQUE INDEX idx_project_id_unique (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ 表 report_project_overview 创建成功');
    
    // 验证表是否存在
    const [tables] = await connection.execute("SHOW TABLES LIKE 'report_project_overview'");
    if (tables.length > 0) {
      console.log('✅ 验证成功：表已存在');
    } else {
      console.log('❌ 验证失败：表不存在');
    }
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
