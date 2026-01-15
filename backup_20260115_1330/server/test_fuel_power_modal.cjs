/**
 * 测试外购燃料和动力费估算表JSON输出（基于modal字段结构）
 */

const { buildFuelPowerJSON } = require('./src/utils/tableDataBuilders/buildFuelPower.mjs');

// 模拟测试数据
const mockFuelPowerData = {
  operationYears: 17,
  productionRates: [
    { yearIndex: 1, rate: 0.8 },
    { yearIndex: 2, rate: 0.9 },
    { yearIndex: 3, rate: 1.0 },
    { yearIndex: 4, rate: 1.0 },
    { yearIndex: 5, rate: 1.0 }
  ],
  costConfig: {
    fuelPower: {
      items: [
        {
          id: 1,
          name: '水费',
          consumption: 10.5,
          price: 2.99,
          序号: 1
        },
        {
          id: 2,
          name: '电费',
          consumption: 100.8,
          price: 0.65,
          序号: 2
        },
        {
          id: 3,
          name: '汽油',
          consumption: 5.2,
          price: 9453,
          序号: 3
        },
        {
          id: 4,
          name: '柴油',
          consumption: 8.7,
          price: 7783,
          序号: 4
        },
        {
          id: 5,
          name: '天然气',
          consumption: 15.3,
          price: 3.75,
          序号: 5
        }
      ]
    }
  }
};

try {
  const result = buildFuelPowerJSON(mockFuelPowerData);
  const jsonData = JSON.parse(result);
  
  console.log('🔍 外购燃料和动力费估算表JSON输出测试结果：');
  console.log('标题:', jsonData.title);
  console.log('参数数量:', jsonData.parameters.length);
  console.log('summary:', jsonData.summary);
  
  console.log('\n📋 参数详情:');
  jsonData.parameters.forEach((param, index) => {
    console.log(`\n参数 ${index + 1}:`);
    console.log('  序号:', param.序号);
    console.log('  费用项目名称:', param.费用项目名称);
    
    // 显示数量字段（动态字段名）
    const quantityField = Object.keys(param).find(key => key.includes('数量'));
    if (quantityField) {
      console.log(`  ${quantityField}:`, param[quantityField]);
    }
    
    console.log('  单价（元）:', param['单价（元）']);
    console.log('  进项税率(%):', param['进项税率(%)']);
    console.log('  运营期数据长度:', param.运营期?.length || 0);
    console.log('  合计（万元）:', param['合计（万元）']);
    console.log('  年均（万元）:', param['年均（万元）']);
  });
  
  console.log('\n✅ 测试完成，JSON结构与modal字段保持一致');
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  console.error(error.stack);
}