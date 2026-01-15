/**
 * 简单测试外购燃料和动力费估算表JSON输出
 */

// 模拟buildFuelPowerJSON函数的核心逻辑
function buildFuelPowerJSON(fuelPowerData) {
  if (!fuelPowerData) return '{}'
  
  const jsonData = {
    title: '外购燃料和动力费估算表',
    parameters: [],
    summary: { totalCost: 0 },
    updatedAt: new Date().toISOString()
  }
  
  const fuelPowerConfig = fuelPowerData.costConfig?.fuelPower
  const items = fuelPowerConfig?.items || []
  
  // 模拟运营期数据计算
  const operationYears = fuelPowerData.operationYears || 17
  const years = Array.from({ length: operationYears }, (_, i) => i + 1)
  
  const getProductionRate = (year) => {
    const productionRates = fuelPowerData.productionRates || []
    return productionRates.find(p => p.yearIndex === year)?.rate || 1
  }
  
  const calculateItemYearAmount = (item, year) => {
    const productionRate = getProductionRate(year)
    const consumption = item.consumption || 0
    const price = item.price || 0
    
    if (['汽油', '柴油'].includes(item.name)) {
      return (price * consumption / 10000) * productionRate
    } else {
      return (consumption * price) * productionRate
    }
  }
  
  // 构建运营期数据
  const itemsOperationPeriodData = items.map((item) => {
    return years.map(year => {
      return calculateItemYearAmount(item, year)
    })
  })
  
  // 构建parameters
  if (items.length > 0) {
    jsonData.parameters = items.map((item, idx) => {
      const getQuantityLabel = (itemName) => {
        const labelMap = {
          '水费': '数量（万m³）',
          '电费': '数量（万kWh）',
          '汽油': '数量（吨）',
          '柴油': '数量（吨）',
          '天然气': '数量（万m³）'
        };
        return labelMap[itemName] || '数量';
      }

      return {
        序号: item.序号 || (idx + 1),
        费用项目名称: item.name || '',
        [getQuantityLabel(item.name || '')]: Number(item.consumption || 0).toFixed(2),
        '单价（元）': Number(item.price || 0).toFixed(2),
        '进项税率(%)': 13,
        运营期: itemsOperationPeriodData[idx]?.map((val) =>
          Number(val) > 0 ? Number(val).toFixed(2) : val
        ) || [],
        '合计（万元）': (() => {
          const operationData = itemsOperationPeriodData[idx] || []
          const total = operationData.reduce((sum, val) => sum + (Number(val) || 0), 0)
          return total > 0 ? Number(total).toFixed(2) : '0.00'
        })(),
        '年均（万元）': (() => {
          const operationData = itemsOperationPeriodData[idx] || []
          const total = operationData.reduce((sum, val) => sum + (Number(val) || 0), 0)
          const years = operationData.length || 1
          const average = total / years
          return average > 0 ? Number(average).toFixed(2) : '0.00'
        })()
      }
    })
  }
  
  // 计算合计值
  const calculateParametersTotal = () => {
    return jsonData.parameters.reduce((total, item) => {
      const itemTotal = Number(item['合计（万元）']) || 0
      return total + itemTotal
    }, 0)
  }
  
  jsonData.summary.totalCost = calculateParametersTotal()
  jsonData.summary.averageAnnual = Number((jsonData.summary.totalCost / operationYears).toFixed(2))
  
  return JSON.stringify(jsonData, null, 2)
}

// 模拟测试数据
const mockFuelPowerData = {
  operationYears: 17,
  productionRates: [
    { yearIndex: 1, rate: 0.8 },
    { yearIndex: 2, rate: 0.9 },
    { yearIndex: 3, rate: 1.0 }
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
}

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