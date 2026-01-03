import { revenueCostApi } from './src/lib/api.js';

async function testRevenueItemSave() {
  try {
    console.log('🧪 测试收入项保存功能...');
    
    // 测试数据 - 模拟前端发送的保存数据
    const testData = {
      project_id: '8b81a17b-8661-4d4f-a672-b969ee2fece5',
      workflow_step: 'revenue',
      model_data: {
        revenueItems: [
          {
            id: 'test-item-1',
            index: 1,
            name: '测试收入项-正确价格',
            category: 'product',
            fieldTemplate: 'quantity-price',
            quantity: 100,
            unit: '吨',
            unitPrice: 5000, // 万元 - 应该保存为5000，而不是0
            priceUnit: 'wan-yuan',
            vatRate: 0.13
          },
          {
            id: 'test-item-2',
            index: 2,
            name: '测试收入项-元单位',
            category: 'service',
            fieldTemplate: 'quantity-price',
            quantity: 200,
            unit: '小时',
            unitPrice: 100000, // 元 - 应该转换为10万元保存
            priceUnit: 'yuan',
            vatRate: 0.06
          }
        ],
        costItems: [],
        productionRates: [],
        aiAnalysisResult: null,
        workflow_step: 'revenue'
      }
    };
    
    console.log('📤 发送测试数据:', JSON.stringify(testData, null, 2));
    
    // 调用保存API
    const response = await revenueCostApi.save(testData);
    
    console.log('📥 保存响应:', response);
    
    if (response.success) {
      console.log('✅ 保存成功！');
      
      // 立即查询验证数据是否正确保存
      const verifyResponse = await revenueCostApi.getByProjectId(testData.project_id);
      console.log('🔍 验证查询响应:', verifyResponse);
      
      if (verifyResponse.success && verifyResponse.data?.estimate?.model_data) {
        const savedData = verifyResponse.data.estimate.model_data;
        console.log('💾 保存到数据库的数据:', savedData);
        
        // 检查价格数据是否正确
        if (savedData.revenueItems && savedData.revenueItems.length > 0) {
          savedData.revenueItems.forEach((item, index) => {
            console.log(`📊 收入项 ${index + 1}:`, {
              name: item.name,
              unitPrice: item.unitPrice,
              priceUnit: item.priceUnit
            });
            
            if (item.unitPrice === 0) {
              console.error(`❌ 错误: 收入项 ${item.name} 的单价保存为0！`);
            } else {
              console.log(`✅ 正确: 收入项 ${item.name} 的单价正确保存为 ${item.unitPrice}`);
            }
          });
        }
      }
    } else {
      console.error('❌ 保存失败:', response.error);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testRevenueItemSave();