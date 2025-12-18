import { pool } from './dist/db/config.js';

async function checkSavedData() {
  try {
    console.log('🔍 检查已保存的数据...');
    
    // 查看最新的数据
    const [rows] = await pool.query(`
      SELECT project_id, workflow_step, model_data, ai_analysis_result, updated_at 
      FROM revenue_cost_estimates 
      WHERE project_id = '8b81a17b-8661-4d4f-a672-b969ee2fece5'
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    if (rows.length > 0) {
      const row = rows[0];
      console.log('最新数据:');
      console.log('  project_id:', row.project_id);
      console.log('  workflow_step:', row.workflow_step);
      console.log('  updated_at:', row.updated_at);
      
      if (row.model_data) {
        try {
          const modelData = JSON.parse(row.model_data);
          console.log('  model_data.revenueItems 数量:', modelData.revenueItems?.length || 0);
          if (modelData.revenueItems && modelData.revenueItems.length > 0) {
            console.log('  收入项列表:');
            modelData.revenueItems.forEach((item, index) => {
              console.log(`    ${index + 1}. ${item.name} - 单价: ${item.unitPrice} ${item.priceUnit}`);
            });
          }
        } catch (e) {
          console.log('  model_data 解析失败:', row.model_data.substring(0, 100));
        }
      } else {
        console.log('  model_data: 空');
      }
    } else {
      console.log('  没有找到数据');
    }
    
  } catch (error) {
    console.error('❌ 检查数据失败:', error);
  } finally {
    await pool.end();
  }
}

checkSavedData();