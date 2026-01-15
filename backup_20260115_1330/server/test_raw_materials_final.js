/**
 * 测试外购原材料费估算表最终修改后的功能
 */
import { buildRawMaterialsJSON } from './dist/utils/tableDataBuilders/buildRawMaterials.js';

// 模拟测试数据
const testRawMaterialsData = {
  operationYears: 17,
  productionRates: [
    { yearIndex: 1, rate: 0.8 },
    { yearIndex: 2, rate: 0.9 },
    { yearIndex: 3, rate: 1.0 },
    { yearIndex: 4, rate: 1.0 },
    { yearIndex: 5, rate: 1.0 },
    { yearIndex: 6, rate: 1.0 },
    { yearIndex: 7, rate: 1.0 },
    { yearIndex: 8, rate: 1.0 },
    { yearIndex: 9, rate: 1.0 },
    { yearIndex: 10, rate: 1.0 },
    { yearIndex: 11, rate: 1.0 },
    { yearIndex: 12, rate: 1.0 },
    { yearIndex: 13, rate: 1.0 },
    { yearIndex: 14, rate: 1.0 },
    { yearIndex: 15, rate: 1.0 },
    { yearIndex: 16, rate: 1.0 },
    { yearIndex: 17, rate: 1.0 }
  ],
  costConfig: {
    rawMaterials: {
      items: [
        {
          序号: '1',
          name: '原材料A',
          unit: '吨',
          sourceType: 'percentage',
          percentage: 10,
          linkedRevenueId: 'total'
        },
        {
          序号: '2',
          name: '原材料B',
          unit: '件',
          sourceType: 'quantityPrice',
          quantity: 100,
          unitPrice: 0.05
        },
        {
          序号: '3',
          name: '原材料C',
          sourceType: 'directAmount',
          directAmount: 50
        }
      ]
    },
    revenueItems: [
      {
        id: 'total',
        fieldTemplate: 'direct-amount',
        directAmount: 1000
      }
    ]
  }
};

try {
  const result = buildRawMaterialsJSON(testRawMaterialsData);
  const jsonData = JSON.parse(result);
  
  console.log('✅ 外购原材料费估算表最终测试成功！');
  console.log('📊 输出JSON结构:');
  console.log(JSON.stringify(jsonData, null, 2));
  
  // 验证关键字段
  console.log('\n🔍 验证结果:');
  
  // 检查是否删除了rows字段
  console.log(`是否包含rows字段: ${jsonData.hasOwnProperty('rows')} (应为false)`);
  
  // 检查summary字段
  console.log(`summary.totalCost: ${jsonData.summary.totalCost} (应为所有参数项合计值总和)`);
  console.log(`summary.averageAnnual: ${jsonData.summary.averageAnnual} (应为totalCost除以17)`);
  
  // 检查参数项的合计字段
  const item1 = jsonData.parameters[0];
  const item2 = jsonData.parameters[1];
  const item3 = jsonData.parameters[2];
  
  console.log(`原材料A合计（万元）: ${item1['合计（万元）']} (应为1670.00)`);
  console.log(`原材料B合计（万元）: ${item2['合计（万元）']} (应为83.50)`);
  console.log(`原材料C合计（万元）: ${item3['合计（万元）']} (应为835.00)`);
  
  // 验证totalCost计算
  const expectedTotal = 1670 + 83.5 + 835;
  console.log(`预期totalCost: ${expectedTotal}, 实际totalCost: ${jsonData.summary.totalCost}`);
  console.log(`totalCost计算正确: ${jsonData.summary.totalCost === expectedTotal}`);
  
  // 验证averageAnnual计算
  const expectedAverage = expectedTotal / 17;
  console.log(`预期averageAnnual: ${expectedAverage.toFixed(2)}, 实际averageAnnual: ${jsonData.summary.averageAnnual}`);
  console.log(`averageAnnual计算正确: ${jsonData.summary.averageAnnual === Number(expectedAverage.toFixed(2))}`);
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
}