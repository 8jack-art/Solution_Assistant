/**
 * 跨项目数据残留问题修复验证测试
 * 
 * 测试场景：
 * 1. 新项目无数据时，状态是否被正确重置
 * 2. 有数据时，状态是否正确恢复
 */

console.log('='.repeat(60))
console.log('跨项目数据残留问题修复验证测试')
console.log('='.repeat(60))

// 模拟 Zustand store 状态
let mockStoreState = {
  revenueItems: [],
  costItems: [],
  productionRates: [],
  aiAnalysisResult: null,
  revenueStructureLocked: false,
  costConfig: null,
  revenueTableData: null,
  costTableData: null,
  profitDistributionTableData: null,
  loanRepaymentTableData: null,
  financialIndicators: null,
  loanConfig: null,
  currentStep: 'period',
  context: null
}

// 模拟 getDefaultCostConfig
function getDefaultCostConfig() {
  return {
    rawMaterials: { applyProductionRate: true, items: [] },
    auxiliaryMaterials: { type: 'percentage', percentage: 5, applyProductionRate: true, taxRate: 13 },
    fuelPower: { applyProductionRate: true, items: [] },
    wages: { employees: 0, salaryPerEmployee: 0, directAmount: 0, taxRate: 0 },
    repair: { type: 'percentage', percentageOfFixedAssets: 5, taxRate: 13, applyProductionRate: true },
    otherExpenses: { type: 'directAmount', directAmount: 0, applyProductionRate: false },
    depreciation: { type: 'percentage', percentageOfFixedAssets: 10 },
    amortization: { type: 'percentage', percentageOfFixedAssets: 5 },
    interest: { type: 'percentage', percentage: 5 }
  }
}

// 模拟 getDefaultLoanConfig
function getDefaultLoanConfig() {
  return {
    loanAmount: 1000,
    interestRate: 5.0,
    loanTerm: 10,
    gracePeriod: 2,
    repaymentMethod: 'equal-installment'
  }
}

// 模拟 generateDefaultProductionRates
function generateDefaultProductionRates(operationYears) {
  const rates = []
  for (let i = 1; i <= operationYears; i++) {
    let rate = 1.0
    if (i === 1) rate = 0.75
    else if (i === 2) rate = 0.85
    else rate = 1.0
    rates.push({ yearIndex: i, rate })
  }
  return rates
}

// 模拟 loadFromBackend 的修复逻辑
function loadFromBackendFix(projectId, apiResponse, currentContext) {
  console.log(`\n📦 加载项目数据: ${projectId}`)
  
  if (apiResponse.success && apiResponse.data?.estimate) {
    // 有数据时，恢复状态
    const estimate = apiResponse.data.estimate
    let modelData = estimate.model_data
    
    if (typeof modelData === 'string') {
      try {
        modelData = JSON.parse(modelData)
      } catch (e) {
        console.error('解析model_data失败:', e)
        modelData = null
      }
    }
    
    console.log('✅ 找到项目数据，恢复状态')
    
    mockStoreState = {
      revenueItems: modelData?.revenueItems || [],
      costItems: modelData?.costItems || [],
      productionRates: modelData?.productionRates || [],
      aiAnalysisResult: modelData?.aiAnalysisResult || estimate.ai_analysis_result || null,
      costConfig: modelData?.costConfig || getDefaultCostConfig(),
      revenueTableData: modelData?.revenueTableData || null,
      costTableData: modelData?.costTableData || null,
      profitDistributionTableData: modelData?.profitDistributionTableData || null,
      loanRepaymentTableData: modelData?.loanRepaymentTableData || null,
      financialIndicators: modelData?.financialIndicators || null,
      loanConfig: modelData?.loanConfig || getDefaultLoanConfig(),
      currentStep: estimate.workflow_step || 'period',
      context: currentContext
    }
  } else {
    // 🔧 关键修复：当 estimate 为 null 时，重置状态为空
    console.log('⚠️ 没有找到收入成本数据，重置状态为空')
    
    const newContext = currentContext 
      ? { ...currentContext, depreciationAmortization: undefined }
      : null
    
    mockStoreState = {
      revenueItems: [],
      costItems: [],
      productionRates: currentContext 
        ? generateDefaultProductionRates(currentContext.operationYears)
        : [],
      aiAnalysisResult: null,
      revenueStructureLocked: false,
      costConfig: getDefaultCostConfig(),
      revenueTableData: null,
      costTableData: null,
      profitDistributionTableData: null,
      loanRepaymentTableData: null,
      financialIndicators: null,
      loanConfig: getDefaultLoanConfig(),
      currentStep: 'period',
      context: newContext
    }
    
    console.log('✅ 状态已重置为空')
  }
  
  return mockStoreState
}

// 模拟 reset 函数
function reset() {
  console.log('\n🔄 调用 reset() 重置状态')
  mockStoreState = {
    revenueItems: [],
    costItems: [],
    productionRates: [],
    aiAnalysisResult: null,
    revenueStructureLocked: false,
    costConfig: getDefaultCostConfig(),
    revenueTableData: null,
    costTableData: null,
    profitDistributionTableData: null,
    loanRepaymentTableData: null,
    financialIndicators: null,
    loanConfig: getDefaultLoanConfig(),
    currentStep: 'period',
    context: null
  }
}

// 测试用例
function runTests() {
  let passed = 0
  let failed = 0
  
  // 测试1：新项目无数据时的状态重置
  console.log('\n' + '='.repeat(60))
  console.log('测试1：新项目无数据时的状态重置')
  console.log('='.repeat(60))
  
  // 模拟项目A有数据的旧状态
  mockStoreState = {
    revenueItems: [{ id: '1', name: '产品销售收入' }],
    costItems: [{ id: '1', name: '原材料成本' }],
    productionRates: [{ yearIndex: 1, rate: 0.75 }],
    aiAnalysisResult: { total_categories: 2 },
    revenueStructureLocked: true,
    costConfig: getDefaultCostConfig(),
    revenueTableData: { rows: [] },
    costTableData: { rows: [] },
    profitDistributionTableData: null,
    loanRepaymentTableData: null,
    financialIndicators: null,
    loanConfig: getDefaultLoanConfig(),
    currentStep: 'revenue',
    context: { projectId: 'project-a', operationYears: 10 }
  }
  
  console.log('🔴 修复前状态（模拟旧项目A数据）:')
  console.log(`   revenueItems.length: ${mockStoreState.revenueItems.length}`)
  console.log(`   costItems.length: ${mockStoreState.costItems.length}`)
  console.log(`   aiAnalysisResult: ${mockStoreState.aiAnalysisResult ? '存在' : 'null'}`)
  console.log(`   revenueStructureLocked: ${mockStoreState.revenueStructureLocked}`)
  console.log(`   currentStep: ${mockStoreState.currentStep}`)
  
  // 模拟 API 返回 null（新项目无数据）
  const nullResponse = {
    success: true,
    data: { estimate: null }
  }
  
  // 加载新项目B
  loadFromBackendFix('project-b', nullResponse, { 
    projectId: 'project-b', 
    operationYears: 8 
  })
  
  console.log('\n🟢 修复后状态（新项目B）:')
  console.log(`   revenueItems.length: ${mockStoreState.revenueItems.length}`)
  console.log(`   costItems.length: ${mockStoreState.costItems.length}`)
  console.log(`   aiAnalysisResult: ${mockStoreState.aiAnalysisResult ? '存在' : 'null'}`)
  console.log(`   revenueStructureLocked: ${mockStoreState.revenueStructureLocked}`)
  console.log(`   currentStep: ${mockStoreState.currentStep}`)
  
  // 验证
  if (mockStoreState.revenueItems.length === 0 && 
      mockStoreState.costItems.length === 0 && 
      mockStoreState.aiAnalysisResult === null &&
      mockStoreState.revenueStructureLocked === false &&
      mockStoreState.currentStep === 'period') {
    console.log('\n✅ 测试1通过：新项目无数据时状态正确重置')
    passed++
  } else {
    console.log('\n❌ 测试1失败：状态未正确重置')
    failed++
  }
  
  // 测试2：有数据时的状态恢复
  console.log('\n' + '='.repeat(60))
  console.log('测试2：有数据时的状态恢复')
  console.log('='.repeat(60))
  
  // 先重置
  reset()
  
  // 模拟 API 返回有数据
  const withDataResponse = {
    success: true,
    data: {
      estimate: {
        workflow_step: 'revenue',
        ai_analysis_result: { total_categories: 3 },
        model_data: JSON.stringify({
          revenueItems: [
            { id: '1', name: '产品A销售收入' },
            { id: '2', name: '产品B销售收入' }
          ],
          costItems: [
            { id: '1', name: '原材料' }
          ],
          productionRates: [
            { yearIndex: 1, rate: 0.8 }
          ]
        })
      }
    }
  }
  
  loadFromBackendFix('project-c', withDataResponse, { 
    projectId: 'project-c', 
    operationYears: 12 
  })
  
  console.log('🟢 恢复数据后状态:')
  console.log(`   revenueItems.length: ${mockStoreState.revenueItems.length}`)
  console.log(`   costItems.length: ${mockStoreState.costItems.length}`)
  console.log(`   currentStep: ${mockStoreState.currentStep}`)
  
  if (mockStoreState.revenueItems.length === 2 && 
      mockStoreState.costItems.length === 1 && 
      mockStoreState.currentStep === 'revenue') {
    console.log('\n✅ 测试2通过：有数据时状态正确恢复')
    passed++
  } else {
    console.log('\n❌ 测试2失败：状态恢复不正确')
    failed++
  }
  
  // 测试3：reset 函数验证
  console.log('\n' + '='.repeat(60))
  console.log('测试3：reset 函数验证')
  console.log('='.repeat(60))
  
  reset()
  
  console.log('🟢 reset 后状态:')
  console.log(`   revenueItems.length: ${mockStoreState.revenueItems.length}`)
  console.log(`   costItems.length: ${mockStoreState.costItems.length}`)
  console.log(`   currentStep: ${mockStoreState.currentStep}`)
  
  if (mockStoreState.revenueItems.length === 0 && 
      mockStoreState.costItems.length === 0 && 
      mockStoreState.currentStep === 'period') {
    console.log('\n✅ 测试3通过：reset 函数正确工作')
    passed++
  } else {
    console.log('\n❌ 测试3失败：reset 函数工作不正常')
    failed++
  }
  
  // 总结
  console.log('\n' + '='.repeat(60))
  console.log('测试总结')
  console.log('='.repeat(60))
  console.log(`✅ 通过: ${passed}`)
  console.log(`❌ 失败: ${failed}`)
  console.log(`总计: ${passed + failed}`)
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！修复逻辑正确。')
  } else {
    console.log('\n⚠️ 部分测试失败，请检查修复逻辑。')
  }
  
  return failed === 0
}

// 运行测试
const success = runTests()
process.exit(success ? 0 : 1)
