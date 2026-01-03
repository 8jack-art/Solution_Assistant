import { pool } from './dist/db/config.js';

async function testSaveFunction() {
  try {
    console.log('🧪 测试保存功能...');
    
    // 模拟前端发送的保存数据
    const testData = {
      project_id: '8b81a17b-8661-4d4f-a672-b969ee2fece5',
      workflow_step: 'revenue',
      model_data: {
        revenueItems: [
          {
            id: 'test-item-1',
            name: '测试收入项',
            category: 'product',
            fieldTemplate: 'quantity-price',
            quantity: 100,
            unit: '吨',
            unitPrice: 5000, // 万元
            priceUnit: 'wan-yuan',
            vatRate: 0.13
          }
        ],
        productionRates: [],
        aiAnalysisResult: null,
        workflow_step: 'revenue'
      }
    };
    
    console.log('🔍 测试数据:', JSON.stringify(testData, null, 2));
    
    // 执行保存
    const [result] = await pool.query(
      `UPDATE revenue_cost_estimates 
       SET model_data = ?, workflow_step = ?, updated_at = NOW() 
       WHERE project_id = ?`,
      [
        JSON.stringify(testData.model_data),
        testData.workflow_step,
        testData.project_id
      ]
    );
    
    console.log('✅ 保存结果:', result);
    
    // 验证保存的数据
    const [saved] = await pool.query(
      'SELECT model_data FROM revenue_cost_estimates WHERE project_id = ?',
      [testData.project_id]
    );
    
    if (saved.length > 0) {
      const modelData = JSON.parse(saved[0].model_data);
      console.log('✅ 验证保存的数据:');
      console.log('  收入项数量:', modelData.revenueItems?.length || 0);
      if (modelData.revenueItems && modelData.revenueItems.length > 0) {
        const item = modelData.revenueItems[0];
        console.log('  第一个收入项:');
        console.log('    名称:', item.name);
        console.log('    单价:', item.unitPrice);
        console.log('    单位:', item.priceUnit);
        console.log('    数量:', item.quantity);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

testSaveFunction();