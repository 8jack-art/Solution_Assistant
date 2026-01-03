import { pool } from './dist/db/config.js';

async function checkTableStructure() {
  try {
    console.log('🔍 检查revenue_cost_estimates表结构...');
    
    // 查看表结构
    const [structure] = await pool.query('DESCRIBE revenue_cost_estimates');
    console.log('表结构:');
    structure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ 检查表结构失败:', error);
  } finally {
    await pool.end();
  }
}

checkTableStructure();