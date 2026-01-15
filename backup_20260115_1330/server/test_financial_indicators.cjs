/**
 * 测试财务指标数据修复
 */

const { buildFinancialIndicatorsJSON } = require('./src/utils/tableDataBuilders/buildFinancialIndicators.ts')
const { buildFinancialStaticDynamicJSON } = require('./src/utils/tableDataBuilders/buildFinancialStaticDynamic.ts')
const { ReportService } = require('./src/services/reportService.ts')

// 模拟测试数据
const testData = {
  // 空数据测试
  emptyData: null,
  
  // 基础收入成本数据
  basicRevenueCost: {
    revenueItems: [
      { annualRevenue: 1000 },
      { annualRevenue: 2000 }
    ],
    costItems: [
      { annualCost: 800 },
      { annualCost: 1200 }
    ]
  },
  
  // 包含财务指标的数据
  withFinancialIndicators: {
    financialIndicators: {
      irr: 12.5,
      npv: 5000,
      paybackPeriod: 5.2,
      roi: 15.8,
      totalInvestmentROI: 18.2
    }
  },
  
  // 完整的项目数据
  completeProjectData: {
    project: {
      constructionYears: 2,
      operationYears: 10
    },
    investment: {
      partE: { 合计: 8000 },
      partF: { 合计: 1200 },
      partG: { 合计: 10000 }
    },
    revenueCost: {
      revenueItems: [
        { annualRevenue: 3000 },
        { annualRevenue: 3500 }
      ],
      costItems: [
        { annualCost: 2000 },
        { annualCost: 2200 }
      ]
    },
    financialIndicators: {
      irr: 15.2,
      npv: 8000,
      paybackPeriod: 4.5,
      roi: 18.5,
      totalInvestmentROI: 20.1
    }
  }
}

console.log('=== 测试财务指标数据修复 ===\n')

// 测试1: buildFinancialIndicatorsJSON 处理空数据
console.log('1. 测试 buildFinancialIndicatorsJSON 处理空数据:')
try {
  const result1 = buildFinancialIndicatorsJSON(testData.emptyData)
  const parsed1 = JSON.parse(result1)
  console.log('✅ 成功处理空数据')
  console.log('  标题:', parsed1.title)
  console.log('  项目级别指标数量:', Object.keys(parsed1.projectLevel).length)
  console.log('  汇总数据数量:', Object.keys(parsed1.summary).length)
  console.log('  IRR值:', parsed1.projectLevel.财务内部收益率)
} catch (error) {
  console.log('❌ 处理空数据失败:', error.message)
}

// 测试2: buildFinancialIndicatorsJSON 处理有财务指标的数据
console.log('\n2. 测试 buildFinancialIndicatorsJSON 处理有财务指标的数据:')
try {
  const result2 = buildFinancialIndicatorsJSON(testData.withFinancialIndicators)
  const parsed2 = JSON.parse(result2)
  console.log('✅ 成功处理有财务指标的数据')
  console.log('  IRR:', parsed2.projectLevel.财务内部收益率)
  console.log('  NPV:', parsed2.projectLevel.财务净现值)
  console.log('  ROI:', parsed2.projectLevel.资本金净利润率)
} catch (error) {
  console.log('❌ 处理有财务指标的数据失败:', error.message)
}

// 测试3: buildFinancialStaticDynamicJSON 处理空数据
console.log('\n3. 测试 buildFinancialStaticDynamicJSON 处理空数据:')
try {
  const result3 = buildFinancialStaticDynamicJSON(testData.emptyData)
  const parsed3 = JSON.parse(result3)
  console.log('✅ 成功处理空数据')
  console.log('  标题:', parsed3.title)
  console.log('  建设期:', parsed3.basicInfo.建设期)
  console.log('  运营期:', parsed3.basicInfo.运营期)
  console.log('  总投资收益率:', parsed3.staticIndicators.总投资收益率)
} catch (error) {
  console.log('❌ 处理空数据失败:', error.message)
}

// 测试4: buildFinancialStaticDynamicJSON 处理完整数据
console.log('\n4. 测试 buildFinancialStaticDynamicJSON 处理完整数据:')
try {
  const result4 = buildFinancialStaticDynamicJSON(testData.completeProjectData)
  const parsed4 = JSON.parse(result4)
  console.log('✅ 成功处理完整数据')
  console.log('  项目总投资:', parsed4.basicInfo.项目总投资)
  console.log('  年均销售收入:', parsed4.annualMetrics.年均销售收入)
  console.log('  年均利润总额:', parsed4.annualMetrics.年均利润总额)
  console.log('  总投资收益率:', parsed4.staticIndicators.总投资收益率)
  console.log('  财务内部收益率税前:', parsed4.dynamicIndicators.财务内部收益率税前)
} catch (error) {
  console.log('❌ 处理完整数据失败:', error.message)
}

// 测试5: extractFinancialIndicators 方法
console.log('\n5. 测试 extractFinancialIndicators 方法:')
try {
  const result5 = ReportService.extractFinancialIndicators(testData.basicRevenueCost)
  console.log('✅ 成功提取财务指标')
  console.log('  总收入:', result5.totalRevenue)
  console.log('  总成本:', result5.totalCost)
  console.log('  利润:', result5.profit)
  console.log('  利润率:', result5.profitMargin)
  console.log('  IRR:', result5.irr)
  console.log('  NPV:', result5.npv)
} catch (error) {
  console.log('❌ 提取财务指标失败:', error.message)
}

console.log('\n=== 测试完成 ===')