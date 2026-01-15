/**
 * 财务静态动态指标JSON测试
 * 
 * 数据来源：只从"设置基准收益率"modal获取：
 * - 基准收益率（所得税前）%
 * - 基准收益率（所得税后）%
 */

const { buildFinancialStaticDynamicJSON } = require('./dist/utils/tableDataBuilders/buildFinancialStaticDynamic.js')

console.log('='.repeat(60))
console.log('财务静态动态指标 JSON 测试')
console.log('='.repeat(60))

// 测试场景1：完整数据
console.log('\n【测试场景1】完整数据')
const testData1 = {
  investment: {
    construction_interest: 150,
    partF: { 贷款总额: 4000, 年利率: 0.05, 合计: 500 }
  },
  revenueCost: {
    financialIndicators: {
      preTaxRate: 8,       // 基准收益率（所得税前）
      postTaxRate: 6       // 基准收益率（所得税后）
    }
  }
}
const result1 = JSON.parse(buildFinancialStaticDynamicJSON(testData1))
console.log('输入数据:')
console.log('  - revenueCost.financialIndicators.preTaxRate:', testData1.revenueCost.financialIndicators.preTaxRate)
console.log('  - revenueCost.financialIndicators.postTaxRate:', testData1.revenueCost.financialIndicators.postTaxRate)
console.log('输出结果:')
console.log('  ', JSON.stringify(result1, null, 2))
const pass1 = result1.基准收益率.所得税前 === 8 && 
              result1.基准收益率.所得税后 === 6
console.log('验证:', pass1 ? '✅ 通过' : '❌ 失败')

// 测试场景2：直接传递 financialIndicators
console.log('\n【测试场景2】直接传递 financialIndicators')
const testData2 = {
  revenueCost: {
    preTaxRate: 10,        // 直接字段名
    postTaxRate: 7.5       // 直接字段名
  }
}
const result2 = JSON.parse(buildFinancialStaticDynamicJSON(testData2))
console.log('输入数据:')
console.log('  - revenueCost.preTaxRate:', testData2.revenueCost.preTaxRate)
console.log('  - revenueCost.postTaxRate:', testData2.revenueCost.postTaxRate)
console.log('输出结果:')
console.log('  ', JSON.stringify(result2, null, 2))
const pass2 = result2.基准收益率.所得税前 === 10 && 
              result2.基准收益率.所得税后 === 7.5
console.log('验证:', pass2 ? '✅ 通过' : '❌ 失败')

// 测试场景3：空数据
console.log('\n【测试场景3】空数据')
const testData3 = {}
const result3 = JSON.parse(buildFinancialStaticDynamicJSON(testData3))
console.log('输入数据: 空对象')
console.log('输出结果:')
console.log('  ', JSON.stringify(result3, null, 2))
const pass3 = result3.基准收益率.所得税前 === 0 && 
              result3.基准收益率.所得税后 === 0
console.log('验证:', pass3 ? '✅ 通过' : '❌ 失败')

// 测试场景4：null 数据
console.log('\n【测试场景4】null 数据')
const result4 = JSON.parse(buildFinancialStaticDynamicJSON(null))
console.log('输入数据: null')
console.log('输出结果:')
console.log('  ', JSON.stringify(result4, null, 2))
const pass4 = result4.基准收益率.所得税前 === 0 && 
              result4.基准收益率.所得税后 === 0
console.log('验证:', pass4 ? '✅ 通过' : '❌ 失败')

// 测试场景5：其他字段名兼容性
console.log('\n【测试场景5】其他字段名兼容性')
const testData5 = {
  revenueCost: {
    financialIndicators: {
      preTaxRateInput: 12,      // 兼容字段名
      postTaxRateInput: 9       // 兼容字段名
    }
  }
}
const result5 = JSON.parse(buildFinancialStaticDynamicJSON(testData5))
console.log('输入数据:')
console.log('  - revenueCost.financialIndicators.preTaxRateInput:', testData5.revenueCost.financialIndicators.preTaxRateInput)
console.log('  - revenueCost.financialIndicators.postTaxRateInput:', testData5.revenueCost.financialIndicators.postTaxRateInput)
console.log('输出结果:')
console.log('  ', JSON.stringify(result5, null, 2))
const pass5 = result5.基准收益率.所得税前 === 12 && 
              result5.基准收益率.所得税后 === 9
console.log('验证:', pass5 ? '✅ 通过' : '❌ 失败')

// 汇总测试结果
console.log('\n' + '='.repeat(60))
console.log('测试汇总 - 财务静态动态指标修复验证')
console.log('='.repeat(60))
console.log('场景1（financialIndicators字段）:', pass1 ? '✅ 通过' : '❌ 失败')
console.log('场景2（直接字段名）:            ', pass2 ? '✅ 通过' : '❌ 失败')
console.log('场景3（空对象）:                 ', pass3 ? '✅ 通过' : '❌ 失败')
console.log('场景4（null数据）:               ', pass4 ? '✅ 通过' : '❌ 失败')
console.log('场景5（兼容字段名）:             ', pass5 ? '✅ 通过' : '❌ 失败')

const allPassed = pass1 && pass2 && pass3 && pass4 && pass5
console.log('\n' + (allPassed ? '🎉 所有测试通过！修复成功！' : '⚠️ 部分测试失败，请检查'))

console.log('\n【修复总结】')
console.log('修改文件: buildFinancialStaticDynamic.ts')
console.log('修改内容:')
console.log('1. 移除了复杂的多字段计算逻辑')
console.log('2. 只返回基准收益率数据，来源为:')
console.log('   - revenueCost.financialIndicators.preTaxRate')
console.log('   - revenueCost.financialIndicators.postTaxRate')
console.log('3. JSON结构简化为只包含"基准收益率"对象')
console.log('')
console.log('注意: 这两个值来自前端"设置基准收益率"modal，存储在localStorage中。')
console.log('前端需要在调用API时将这些值传递给后端，或者存储到revenueCost中。')

module.exports = {
  testResults: {
    scenario1: result1,
    scenario2: result2,
    scenario3: result3,
    scenario5: result5
  },
  allPassed
}
