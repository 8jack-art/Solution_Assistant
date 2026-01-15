/**
 * 财务计算指标表数据测试 - v4
 * 重点测试总投资和建设期利息字段的获取
 */

import { buildFinancialIndicatorsJSON } from './src/utils/tableDataBuilders/buildFinancialIndicators.js';

// 模拟数据库中的 investmentEstimate 数据结构
// 符合前端期望的数据来源
const mockInvestmentEstimate = {
  id: 1,
  project_id: 1,
  construction_interest: 300,  // 建设期利息（顶层字段）- 前端期望的来源
  basic_reserve: 100,
  price_reserve: 50,
  estimate_data: {
    partA: {
      合计: 5000,
      children: [
        { 建设工程费: 2000, 设备购置费: 1500, 安装工程费: 500, 其它费用: 1000 }
      ]
    },
    partB: {
      合计: 1000,
      children: [
        { 工程或费用名称: '土地费用', 合计: 500 },
        { 工程或费用名称: '其他费用', 合计: 500 }
      ]
    },
    partC: {
      合计: 150,  // 预备费
      children: [
        { 费用名称: '基本预备费', 金额: 100 },
        { 费用名称: '涨价预备费', 金额: 50 }
      ]
    },
    partF: {
      贷款总额: 4000,  // 项目债务资金 - 前端期望的来源
      children: [
        { 资金来源: '银行贷款', 金额: 4000 }
      ]
    }
  }
};

// 模拟完整的项目数据
const mockProjectData = {
  project: {
    name: '测试项目',
    constructionYears: 2,
    operationYears: 10
  },
  investment: mockInvestmentEstimate,
  revenueCost: {
    revenueTableData: {
      rows: [
        { 序号: '1', 项目: '营业收入', 合计: 10000 },
        { 序号: '2', 项目: '增值税', 合计: 500 },
        { 序号: '3', 项目: '营业税金及附加', 合计: 100 }
      ]
    },
    costTableData: {
      rows: [
        { 序号: '7', 项目: '总成本费用合计', 合计: 6000 }
      ]
    },
    profitDistributionTableData: {
      rows: [
        { 序号: '5', 项目: '利润总额', 合计: 3400 },
        { 序号: '8', 项目: '所得税', 合计: 850 },
        { 序号: '9', 项目: '净利润', 合计: 2550 }
      ]
    },
    loanRepaymentTableData: {
      rows: [
        { 序号: '3.4', 项目: '利息备付率', 合计: 2.5 },
        { 序号: '3.5', 项目: '偿债备付率', 合计: 1.8 }
      ]
    }
  },
  financialIndicators: {
    preTaxIRR: 12.5,
    preTaxNPV: 1500,
    preTaxStaticPaybackPeriod: 6.5,
    preTaxDynamicPaybackPeriod: 8.2,
    postTaxIRR: 10.2,
    postTaxNPV: 800,
    postTaxStaticPaybackPeriod: 7.5,
    postTaxDynamicPaybackPeriod: 9.5
  }
};

console.log('=== 财务计算指标表数据测试 v4 ===\n');

// 运行测试
try {
  const result = buildFinancialIndicatorsJSON(mockProjectData);
  const jsonResult = JSON.parse(result);

  console.log('✅ 测试执行成功\n');
  
  // 验证投资数据
  console.log('=== 投资数据验证 ===');
  console.log('总投资 (totalInvestment):', jsonResult.investment.totalInvestment);
  console.log('  预期值: 7300 (建设投资7000 + 建设期利息300)');
  console.log('  验证:', jsonResult.investment.totalInvestment === 7300 ? '✅ 通过' : '❌ 失败');
  
  console.log('建设投资 (constructionInvestment):', jsonResult.investment.constructionInvestment);
  console.log('  预期值: 7000 (partA 5000 + partB不含土地500 + 预备费150)');
  console.log('  验证:', jsonResult.investment.constructionInvestment === 7000 ? '✅ 通过' : '❌ 失败');
  
  console.log('建设期利息 (constructionInterest):', jsonResult.investment.constructionInterest);
  console.log('  预期值: 300 (从 construction_interest 获取)');
  console.log('  验证:', jsonResult.investment.constructionInterest === 300 ? '✅ 通过' : '❌ 失败');
  
  console.log('项目债务资金 (projectDebt):', jsonResult.investment.projectDebt);
  console.log('  预期值: 4000 (从 partF.贷款总额 获取)');
  console.log('  验证:', jsonResult.investment.projectDebt === 4000 ? '✅ 通过' : '❌ 失败');
  
  console.log('项目资本金 (projectEquity):', jsonResult.investment.projectEquity);
  console.log('  预期值: 3300 (总投资7300 - 债务4000)');
  console.log('  验证:', jsonResult.investment.projectEquity === 3300 ? '✅ 通过' : '❌ 失败');
  
  // 验证投资效益指标
  console.log('\n=== 投资效益指标验证 ===');
  console.log('总投资收益率 (ROI):', jsonResult.investmentEfficiency.roi, '%');
  console.log('  年均EBIT:', jsonResult.annualAverage.ebit, '万元');
  console.log('  总投资:', jsonResult.investment.totalInvestment, '万元');
  console.log('  预期ROI: (365/7300)*100 = 5%');
  
  console.log('\n投资利税率:', jsonResult.investmentEfficiency.investmentProfitRate, '%');
  console.log('  年均利税总额:', jsonResult.annualAverage.totalProfit + jsonResult.annualAverage.vat + jsonResult.annualAverage.taxAndSurcharges, '万元');
  console.log('  预期值: (340+50+10)/7300*100 = 5.48%');
  
  console.log('\n项目资本金净利润率 (ROE):', jsonResult.investmentEfficiency.roe, '%');
  console.log('  年均净利润:', jsonResult.annualAverage.netProfit, '万元');
  console.log('  项目资本金:', jsonResult.investment.projectEquity, '万元');
  console.log('  预期值: (255/3300)*100 = 7.73%');
  
  // 验证偿债指标
  console.log('\n=== 偿债指标验证 ===');
  console.log('平均利息备付率:', jsonResult.solvency.interestCoverageRatio);
  console.log('  验证:', jsonResult.solvency.interestCoverageRatio === 2.5 ? '✅ 通过' : '❌ 失败');
  
  console.log('平均偿债备付率:', jsonResult.solvency.debtServiceCoverageRatio);
  console.log('  验证:', jsonResult.solvency.debtServiceCoverageRatio === 1.8 ? '✅ 通过' : '❌ 失败');
  
  // 整体验证
  console.log('\n=== 整体验证 ===');
  const investmentValid = jsonResult.investment.totalInvestment === 7300 &&
                          jsonResult.investment.constructionInvestment === 7000 &&
                          jsonResult.investment.constructionInterest === 300 &&
                          jsonResult.investment.projectDebt === 4000;
  
  console.log('投资数据验证:', investmentValid ? '✅ 通过' : '❌ 失败');
  
  if (investmentValid) {
    console.log('\n🎉 所有测试通过！总投资和建设期利息字段获取正确。');
  } else {
    console.log('\n❌ 部分测试失败，请检查数据获取逻辑。');
  }
  
} catch (error) {
  console.error('❌ 测试执行失败:', error.message);
  console.error(error.stack);
}
