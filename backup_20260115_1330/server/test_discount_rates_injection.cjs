/**
 * 基准收益率注入测试
 * 
 * 测试场景：前端传递基准收益率参数到后端API，后端正确注入到projectData中
 * 
 * 问题描述：
 * 基准收益率存储在前端localStorage中，存储格式为：
 * - financialIndicatorsPreTaxRate_${projectId}
 * - financialIndicatorsPostTaxRate_${projectId}
 * 
 * 后端API getProjectSummary 需要接收这些参数并注入到 projectData.revenueCost.financialIndicators
 */

const { buildFinancialStaticDynamicJSON } = require('./dist/utils/tableDataBuilders/buildFinancialStaticDynamic.js')

console.log('='.repeat(60))
console.log('基准收益率注入测试')
console.log('='.repeat(60))

// 模拟后端 controller 中的数据注入逻辑
function simulateControllerInjection(projectData, queryParams) {
  const { preTaxRate, postTaxRate } = queryParams
  
  // 将基准收益率注入到 projectData 中，供 buildFinancialStaticDynamicJSON 使用
  if (preTaxRate !== undefined || postTaxRate !== undefined) {
    if (!projectData.revenueCost) {
      projectData.revenueCost = {}
    }
    if (!projectData.revenueCost.financialIndicators) {
      projectData.revenueCost.financialIndicators = {}
    }
    if (preTaxRate !== undefined) {
      projectData.revenueCost.financialIndicators.preTaxRate = preTaxRate
    }
    if (postTaxRate !== undefined) {
      projectData.revenueCost.financialIndicators.postTaxRate = postTaxRate
    }
    console.log('注入后的 financialIndicators:', projectData.revenueCost.financialIndicators)
  }
  
  return projectData
}

// 测试场景1：前端传递完整基准收益率
console.log('\n【测试场景1】前端传递完整基准收益率')
console.log('模拟场景：用户设置了基准税率 所得税前=8%, 所得税后=6%')
const mockQueryParams1 = {
  preTaxRate: 8,
  postTaxRate: 6
}

const mockProjectData1 = {
  investment: {
    construction_interest: 150,
    partF: { 贷款总额: 4000, 年利率: 0.05, 合计: 500 }
  },
  revenueCost: {
    // 注意：这里没有 financialIndicators，模拟数据库中不存在的情况
  }
}

const injectedData1 = simulateControllerInjection(JSON.parse(JSON.stringify(mockProjectData1)), mockQueryParams1)
const result1 = JSON.parse(buildFinancialStaticDynamicJSON(injectedData1))

console.log('输入参数:')
console.log('  - queryParams.preTaxRate:', mockQueryParams1.preTaxRate)
console.log('  - queryParams.postTaxRate:', mockQueryParams1.postTaxRate)
console.log('输出结果:')
console.log('  ', JSON.stringify(result1, null, 2))

const pass1 = result1.基准收益率.所得税前 === 8 && 
              result1.基准收益率.所得税后 === 6
console.log('验证: 所得税前=' + result1.基准收益率.所得税前 + ', 所得税后=' + result1.基准收益率.所得税后)
console.log('结果:', pass1 ? '✅ 通过' : '❌ 失败')

// 测试场景2：前端只传递所得税前基准收益率
console.log('\n【测试场景2】前端只传递所得税前基准收益率')
console.log('模拟场景：用户只设置了所得税前基准税率=10%')
const mockQueryParams2 = {
  preTaxRate: 10,
  postTaxRate: undefined
}

const mockProjectData2 = {
  investment: {
    construction_interest: 200,
    partF: { 贷款总额: 5000, 年利率: 0.048, 合计: 600 }
  },
  revenueCost: {}
}

const injectedData2 = simulateControllerInjection(JSON.parse(JSON.stringify(mockProjectData2)), mockQueryParams2)
const result2 = JSON.parse(buildFinancialStaticDynamicJSON(injectedData2))

console.log('输入参数:')
console.log('  - queryParams.preTaxRate:', mockQueryParams2.preTaxRate)
console.log('  - queryParams.postTaxRate:', mockQueryParams2.postTaxRate)
console.log('输出结果:')
console.log('  ', JSON.stringify(result2, null, 2))

const pass2 = result2.基准收益率.所得税前 === 10 && 
              result2.基准收益率.所得税后 === 0
console.log('验证: 所得税前=' + result2.基准收益率.所得税前 + ', 所得税后=' + result2.基准收益率.所得税后)
console.log('结果:', pass2 ? '✅ 通过' : '❌ 失败')

// 测试场景3：前端不传递基准收益率（数据库中有值）
console.log('\n【测试场景3】前端不传递基准收益率（数据库中有值）')
console.log('模拟场景：用户未设置基准收益率，但数据库中有默认值')
const mockQueryParams3 = {
  preTaxRate: undefined,
  postTaxRate: undefined
}

const mockProjectData3 = {
  investment: {
    construction_interest: 180,
    partF: { 贷款总额: 4500, 年利率: 0.052, 合计: 550 }
  },
  revenueCost: {
    financialIndicators: {
      preTaxRate: 7.5,   // 数据库中存储的默认值
      postTaxRate: 5.5   // 数据库中存储的默认值
    }
  }
}

const injectedData3 = simulateControllerInjection(JSON.parse(JSON.stringify(mockProjectData3)), mockQueryParams3)
const result3 = JSON.parse(buildFinancialStaticDynamicJSON(injectedData3))

console.log('输入参数:')
console.log('  - queryParams.preTaxRate:', mockQueryParams3.preTaxRate)
console.log('  - queryParams.postTaxRate:', mockQueryParams3.postTaxRate)
console.log('数据库原始值:')
console.log('  - revenueCost.financialIndicators.preTaxRate:', mockProjectData3.revenueCost.financialIndicators.preTaxRate)
console.log('  - revenueCost.financialIndicators.postTaxRate:', mockProjectData3.revenueCost.financialIndicators.postTaxRate)
console.log('输出结果:')
console.log('  ', JSON.stringify(result3, null, 2))

const pass3 = result3.基准收益率.所得税前 === 7.5 && 
              result3.基准收益率.所得税后 === 5.5
console.log('验证: 所得税前=' + result3.基准收益率.所得税前 + ', 所得税后=' + result3.基准收益率.所得税后)
console.log('结果:', pass3 ? '✅ 通过' : '❌ 失败')

// 测试场景4：前端覆盖数据库中的值
console.log('\n【测试场景4】前端覆盖数据库中的值（优先级测试）')
console.log('模拟场景：数据库中有值，但用户设置了新的基准收益率')
const mockQueryParams4 = {
  preTaxRate: 12,   // 用户新设置的值
  postTaxRate: 9    // 用户新设置的值
}

const mockProjectData4 = {
  investment: {
    construction_interest: 180,
    partF: { 贷款总额: 4500, 年利率: 0.052, 合计: 550 }
  },
  revenueCost: {
    financialIndicators: {
      preTaxRate: 7.5,   // 数据库中存储的旧值
      postTaxRate: 5.5   // 数据库中存储的旧值
    }
  }
}

const injectedData4 = simulateControllerInjection(JSON.parse(JSON.stringify(mockProjectData4)), mockQueryParams4)
const result4 = JSON.parse(buildFinancialStaticDynamicJSON(injectedData4))

console.log('数据库原始值:')
console.log('  - revenueCost.financialIndicators.preTaxRate:', mockProjectData4.revenueCost.financialIndicators.preTaxRate)
console.log('  - revenueCost.financialIndicators.postTaxRate:', mockProjectData4.revenueCost.financialIndicators.postTaxRate)
console.log('用户新设置值:')
console.log('  - queryParams.preTaxRate:', mockQueryParams4.preTaxRate)
console.log('  - queryParams.postTaxRate:', mockQueryParams4.postTaxRate)
console.log('输出结果（应该使用用户新设置的值）:')
console.log('  ', JSON.stringify(result4, null, 2))

const pass4 = result4.基准收益率.所得税前 === 12 && 
              result4.基准收益率.所得税后 === 9
console.log('验证: 所得税前=' + result4.基准收益率.所得税前 + ', 所得税后=' + result4.基准收益率.所得税后)
console.log('结果:', pass4 ? '✅ 通过（前端值优先）' : '❌ 失败')

// 汇总测试结果
console.log('\n' + '='.repeat(60))
console.log('测试汇总 - 基准收益率注入验证')
console.log('='.repeat(60))
console.log('场景1（完整参数）:      ', pass1 ? '✅ 通过' : '❌ 失败')
console.log('场景2（部分参数）:      ', pass2 ? '✅ 通过' : '❌ 失败')
console.log('场景3（数据库有值）:    ', pass3 ? '✅ 通过' : '❌ 失败')
console.log('场景4（前端覆盖）:      ', pass4 ? '✅ 通过' : '❌ 失败')

const allPassed = pass1 && pass2 && pass3 && pass4
console.log('\n' + (allPassed ? '🎉 所有测试通过！基准收益率注入功能正常！' : '⚠️ 部分测试失败，请检查'))

console.log('\n【修复总结】')
console.log('修改文件:')
console.log('1. server/src/controllers/reportController.ts')
console.log('2. client/src/services/reportApi.ts')
console.log('3. client/src/stores/reportStore.ts')
console.log('')
console.log('修改内容:')
console.log('1. 后端 API getProjectSummary 接收 preTaxRate 和 postTaxRate 查询参数')
console.log('2. 前端从 localStorage 读取基准收益率并传递给后端')
console.log('3. 后端将基准收益率注入到 projectData.revenueCost.financialIndicators')
console.log('4. buildFinancialStaticDynamicJSON 从 financialIndicators 读取基准收益率')
console.log('')
console.log('数据流:')
console.log('localStorage -> reportStore -> reportApi -> 后端API -> controller -> projectData -> buildFinancialStaticDynamicJSON -> JSON输出')

module.exports = {
  testResults: {
    scenario1: result1,
    scenario2: result2,
    scenario3: result3,
    scenario4: result4
  },
  allPassed
}
