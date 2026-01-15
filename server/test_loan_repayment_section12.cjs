/**
 * 借款还本付息计划表1.2节 JSON 数据测试
 * 
 * 数据来源说明：
 * - 贷款利息总和：从 revenueCost.loanRepaymentTableData 中获取序号3.2"还利息"的合计值
 * - 运营期利息总和 = 贷款利息总和 - 建设期利息总和
 * - 建设期利息总和：从 investment.construction_interest 顶层字段获取
 */

const { buildLoanRepaymentSection12JSON } = require('./dist/utils/tableDataBuilders/buildLoanRepayment.js')

console.log('='.repeat(60))
console.log('借款还本付息计划表1.2节 JSON 数据测试')
console.log('='.repeat(60))

// 测试场景1：完整数据（investment + revenueCost）
console.log('\n【测试场景1】完整数据 - 从 loanRepaymentTableData 获取序号3.2')
const testData1 = {
  investment: {
    construction_interest: 150,  // 建设期利息（顶层字段）
    partF: {
      贷款总额: 4000,
      年利率: 0.05,
      建设期年限: 2
    }
  },
  revenueCost: {
    loanRepaymentTableData: {
      rows: [
        { 序号: '1', 项目: '借款还本付息计划', 合计: null, 建设期: [], 运营期: [] },
        { 序号: '1.1', 项目: '期初借款余额', 合计: null, 建设期: [], 运营期: [] },
        { 序号: '1.2', 项目: '当期还本付息', 合计: 600, 建设期: [], 运营期: [] },
        { 序号: '2', 项目: '还本付息资金来源', 合计: null, 建设期: [], 运营期: [] },
        { 序号: '2.1', 项目: '折旧摊销费', 合计: 800, 建设期: [], 运营期: [] },
        { 序号: '2.2', 项目: '所得税', 合计: 200, 建设期: [], 运营期: [] },
        { 序号: '2.3', 项目: '息税前利润', 合计: 1000, 建设期: [], 运营期: [] },
        { 序号: '3', 项目: '计算指标', 合计: null, 建设期: [], 运营期: [] },
        { 序号: '3.1', 项目: '息税折旧摊销前利润', 合计: 1800, 建设期: [], 运营期: [] },
        { 序号: '3.2', 项目: '还利息', 合计: 500, 建设期: [100, 150], 运营期: [80, 70, 50, 50] }, // 序号3.2：贷款利息总和=500
        { 序号: '3.3', 项目: '还本金', 合计: 100, 建设期: [], 运营期: [] }
      ]
    }
  }
}
const result1 = JSON.parse(buildLoanRepaymentSection12JSON(testData1))
console.log('输入数据:')
console.log('  - investment.construction_interest (建设期利息):', testData1.investment.construction_interest)
console.log('  - loanRepaymentTableData[3.2].合计 (贷款利息总和):', 500)
console.log('输出结果:')
console.log('  - 建设期利息总和:', result1.interestSummary.建设期利息总和)
console.log('  - 运营期利息总和:', result1.interestSummary.运营期利息总和)
console.log('  - 贷款利息总和:', result1.interestSummary.贷款利息总和)
console.log('计算验证:')
console.log('  - 运营期利息 = 贷款利息(500) - 建设期利息(150) = 350')
const pass1 = result1.interestSummary.建设期利息总和 === 150 && 
             result1.interestSummary.运营期利息总和 === 350 &&
             result1.interestSummary.贷款利息总和 === 500
console.log('验证:', pass1 ? '✅ 通过 - 运营期利息不再为0！' : '❌ 失败')

// 测试场景2：只有 investment 数据（无 revenueCost）
console.log('\n【测试场景2】只有 investment 数据')
const testData2 = {
  investment: {
    construction_interest: 200,
    partF: {
      贷款总额: 5000,
      年利率: 0.048,
      建设期年限: 2,
      合计: 600  // 总利息
    }
  },
  revenueCost: {}
}
const result2 = JSON.parse(buildLoanRepaymentSection12JSON(testData2))
console.log('输入数据:')
console.log('  - investment.construction_interest:', testData2.investment.construction_interest)
console.log('  - revenueCost.loanRepaymentTableData: 空')
console.log('输出结果:')
console.log('  - 建设期利息总和:', result2.interestSummary.建设期利息总和)
console.log('  - 运营期利息总和:', result2.interestSummary.运营期利息总和)
console.log('  - 贷款利息总和:', result2.interestSummary.贷款利息总和)
console.log('验证:')
console.log('  - 无 loanRepaymentTableData，使用兜底计算')
console.log('  - 运营期利息 = 0（因为贷款利息总和从 loanRepaymentTableData 获取不到）')
const pass2 = result2.interestSummary.建设期利息总和 === 200
console.log('验证:', pass2 ? '✅ 通过' : '❌ 失败')

// 测试场景3：完整数据，验证序号3.2的提取
console.log('\n【测试场景3】验证序号3.2的提取')
const testData3 = {
  investment: {
    construction_interest: 300,
    partF: {
      贷款总额: 6000,
      年利率: 0.05,
      建设期年限: 3
    }
  },
  revenueCost: {
    loanRepaymentTable: {  // 也支持 loanRepaymentTable 字段名
      rows: [
        { 序号: '1', 项目: '分类', 合计: null, 建设期: [], 运营期: [] },
        { 序号: '1.1', 项目: '期初借款余额', 合计: null, 建设期: [], 运营期: [] },
        { 序号: '1.2', 项目: '当期还本付息', 合计: 1000, 建设期: [], 运营期: [] },
        { 序号: '2', 项目: '资金来源', 合计: null, 建设期: [], 运营期: [] },
        { 序号: '3', 项目: '计算指标', 合计: null, 建设期: [], 运营期: [] },
        { 序号: '3.1', 项目: '息税折旧摊销前利润', 合计: 2000, 建设期: [], 运营期: [] },
        { 序号: '3.2', 项目: '还利息', 合计: 800, 建设期: [150, 150, 150], 运营期: [100, 100, 100, 50, 50, 50] }, // 序号3.2：贷款利息总和=800
        { 序号: '3.3', 项目: '还本金', 合计: 200, 建设期: [], 运营期: [] }
      ]
    }
  }
}
const result3 = JSON.parse(buildLoanRepaymentSection12JSON(testData3))
console.log('输入数据:')
console.log('  - investment.construction_interest:', testData3.investment.construction_interest)
console.log('  - loanRepaymentTable[3.2].合计:', 800)
console.log('输出结果:')
console.log('  - 建设期利息总和:', result3.interestSummary.建设期利息总和)
console.log('  - 运营期利息总和:', result3.interestSummary.运营期利息总和)
console.log('  - 贷款利息总和:', result3.interestSummary.贷款利息总和)
console.log('计算验证:')
console.log('  - 运营期利息 = 贷款利息(800) - 建设期利息(300) = 500')
const pass3 = result3.interestSummary.建设期利息总和 === 300 && 
             result3.interestSummary.运营期利息总和 === 500 &&
             result3.interestSummary.贷款利息总和 === 800
console.log('验证:', pass3 ? '✅ 通过' : '❌ 失败')

// 测试场景4：基础信息验证
console.log('\n【测试场景4】基础信息字段验证')
console.log('基础信息:')
console.log('  - 贷款总额:', result1.basicInfo.贷款总额, '(预期: 4000)')
console.log('  - 年利率:', result1.basicInfo.年利率, '(预期: 0.05)')
console.log('  - 贷款期限:', result1.basicInfo.贷款期限, '(预期: 12)')
console.log('  - 建设期年限:', result1.basicInfo.建设期年限, '(预期: 2)')
console.log('  - 运营期年限:', result1.basicInfo.运营期年限, '(预期: 10)')
const pass4 = result1.basicInfo.贷款总额 === 4000 && 
              result1.basicInfo.贷款期限 === 12
console.log('验证:', pass4 ? '✅ 通过' : '❌ 失败')

// 测试场景5：空数据处理
console.log('\n【测试场景5】空数据处理')
const testData5 = {}
const result5 = JSON.parse(buildLoanRepaymentSection12JSON(testData5))
console.log('输入数据: 空对象')
console.log('输出结果:')
console.log('  - basicInfo.贷款总额:', result5.basicInfo.贷款总额)
console.log('  - interestSummary.建设期利息总和:', result5.interestSummary.建设期利息总和)
console.log('  - interestSummary.运营期利息总和:', result5.interestSummary.运营期利息总和)
console.log('  - interestSummary.贷款利息总和:', result5.interestSummary.贷款利息总和)
const pass5 = result5.basicInfo.贷款总额 === 0 && 
              result5.interestSummary.运营期利息总和 === 0
console.log('验证:', pass5 ? '✅ 通过' : '❌ 失败')

// 汇总测试结果
console.log('\n' + '='.repeat(60))
console.log('测试汇总 - 借款还本付息计划表1.2节修复验证')
console.log('='.repeat(60))
console.log('场景1（完整数据，从序号3.2获取）:      ', pass1 ? '✅ 通过' : '❌ 失败')
console.log('场景2（仅有investment数据）:           ', pass2 ? '✅ 通过' : '❌ 失败')
console.log('场景3（验证序号3.2提取）:              ', pass3 ? '✅ 通过' : '❌ 失败')
console.log('场景4（基础信息字段）:                 ', pass4 ? '✅ 通过' : '❌ 失败')
console.log('场景5（空数据处理）:                   ', pass5 ? '✅ 通过' : '❌ 失败')

const allPassed = pass1 && pass2 && pass3 && pass4 && pass5
console.log('\n' + (allPassed ? '🎉 所有测试通过！修复成功！' : '⚠️ 部分测试失败，请检查'))

console.log('\n【修复总结】')
console.log('数据来源说明:')
console.log('1. 贷款利息总和 = revenueCost.loanRepaymentTableData[序号3.2].合计')
console.log('2. 建设期利息总和 = investment.construction_interest (顶层字段)')
console.log('3. 运营期利息总和 = 贷款利息总和 - 建设期利息总和')
console.log('')
console.log('修复前问题: 运营期利息总是为0')
console.log('修复后: 正确从借款还本付息计划表modal中获取序号3.2的合计值')

// 导出测试结果供后续使用
module.exports = {
  testResults: {
    scenario1: result1,
    scenario2: result2,
    scenario3: result3,
    scenario5: result5
  },
  allPassed
}
