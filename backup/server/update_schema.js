import { pool } from './dist/db/config.js';

async function updateDatabaseSchema() {
  try {
    console.log('🔄 开始更新数据库表结构...');
    
    // 检查字段是否已存在
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'miaoda_admin' 
      AND TABLE_NAME = 'revenue_cost_estimates'
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('现有字段:', existingColumns);
    
    // 添加缺失的字段
    const alterStatements = [];
    
    if (!existingColumns.includes('model_data')) {
      alterStatements.push('ADD COLUMN model_data JSON NULL');
    }
    
    if (!existingColumns.includes('ai_analysis_result')) {
      alterStatements.push('ADD COLUMN ai_analysis_result JSON NULL');
    }
    
    if (!existingColumns.includes('workflow_step')) {
      alterStatements.push(`ADD COLUMN workflow_step ENUM('period', 'suggest', 'revenue', 'cost', 'profit', 'validate', 'done') DEFAULT 'period'`);
    }
    
    if (!existingColumns.includes('is_completed')) {
      alterStatements.push('ADD COLUMN is_completed BOOLEAN DEFAULT FALSE');
    }
    
    if (alterStatements.length > 0) {
      const alterSQL = `ALTER TABLE revenue_cost_estimates ${alterStatements.join(', ')}`;
      console.log('执行SQL:', alterSQL);
      
      await pool.query(alterSQL);
      console.log('✅ 数据库表结构更新成功');
    } else {
      console.log('✅ 所有字段都已存在，无需更新');
    }
    
  } catch (error) {
    console.error('❌ 更新数据库表结构失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateDatabaseSchema();