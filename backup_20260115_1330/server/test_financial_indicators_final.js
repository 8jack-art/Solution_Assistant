/**
 * 财务计算指标表 JSON 数据验证测试
 * 测试 buildFinancialIndicators.ts 的数据有效性
 */

// 使用编译后的 JS 文件
import { buildFinancialIndicatorsJSON } from './dist/utils/tableDataBuilders/buildFinancialIndicators.js';

// 模拟的 investmentEstimate 数据结构（模拟数据库返回的数据）
const mockInvestmentEstimate = {
  estimate_data: JSON.stringify({
    partA: {
      children: [
        { 建设工程费: 100, 设备购置费: 50, 安装工程费: 20, 其它费用: 10 },
        { 建设工程费: 200, 设备购置费: 100, 安装工程费: 40, 其它费用: 20 }
      ]
    },
    partB: {
      children: [
        { 工程或费用名称: '土地费用', 合计: 500 },
        { 工程或费用名称: '勘察设计费', 合计: 30 },
        { 工程或费用名称: '监理费', 合计: 15 }
      ],
      合计: 545
    },
    partC: {
      合计: 80
    },
    partF: {
      贷款总额: 1000
    }
  }),
  construction_interest: 150,  // 顶层字段：建设期利息
  basic_reserve: 50,           // 顶层字段：基本预备费
  price_reserve: 30            // 顶层字段：涨价预备费
};

// 模拟的 revenueCostModelData 数据结构
const mockRevenueCostModelData = {
  revenueTableData: {
    rows: [
      { 序号: '1', 合计: 5000 },  // 营业收入
      { 序号: '2', 合计: 600 },   // 增值税
      { 序号: '3', 合计: 400 }    // 营业税金及附加
    ]
  },
  costTableData: {
    rows: [
      { 序号: '7', 合计: 3000 }   // 总成本费用合计
    ]
  },
  profitDistributionTableData: {
    rows: [
      { 序号: '5', 合计: 1600 },  // 利润总额
      { 序号: '8', 合计: 400 },   // 所得税
      { 序号: '9', 合计: 1200 }   // 净利润
    ]
  },
  loanRepaymentTableData: {
    rows: [
      { 序号: '3.4', 合计: 2.5 },  // 利息备付率
      { 序号: '3.5', 合计: 1.8 }   // 偿债备付率
    ]
  },
  productionRates: [
    { yearIndex: 1, rate: 0.5 },
    { yearIndex: 2, rate: 0.7 },
    { yearIndex: 3, rate: 0.9 },
    { yearIndex: 4, rate: 1.0 },
    { yearIndex: 5, rate: 1.0 }
  ]
};

// 模拟的 project 数据
const mockProject = {
  id: 'test-project-001',
  name: '测试投资项目',
  description: '这是一个测试项目',
  constructionYears: 2,
  operationYears: 10,
  totalInvestment: 2000
};

// 解析 estimate_data JSON 字符串
const parsedEstimateData = JSON.parse(mockInvestmentEstimate.estimate_data);

// 构建测试数据（模拟 reportService.collectProjectData 的返回结构）
const testIndicatorsData = {
  project: {
    id: mockProject.id,
    name: mockProject.name,
    description: mockProject.description,
    constructionYears: mockProject.constructionYears,
    operationYears: mockProject.operationYears,
    totalInvestment: mockProject.totalInvestment
  },
  investment: {
    // 解析 estimate_data
    partA: {
      children: parsedEstimateData.partA.children
    },
    partB: {
      children: parsedEstimateData.partB.children,
      合计: parsedEstimateData.partB.合计
    },
    partC: {
      合计: parsedEstimateData.partC.合计
    },
    partF: {
      贷款总额: parsedEstimateData.partF.贷款总额
    },
    // 顶层字段（reportService 已添加）
    construction_interest: mockInvestmentEstimate.construction_interest,
    basic_reserve: mockInvestmentEstimate.basic_reserve,
    price_reserve: mockInvestmentEstimate.price_reserve
  },
  revenueCost: mockRevenueCostModelData,
  financialIndicators: {
    preTaxIRR: 12.5,
    postTaxIRR: 10.2,
    preTaxNPV: 500,
    postTaxNPV: 350,
    preTaxStaticPaybackPeriod: 6.5,
    postTaxStaticPaybackPeriod: 7.2,
    preTaxDynamicPaybackPeriod: 8.1,
    postTaxDynamicPaybackPeriod: 9.0
  }
};

console.log('='.repeat(60));
console.log('财务计算指标表 JSON 数据验证测试');
console.log('='.repeat(60));

// 运行测试
console.log('\n[测试1] 生成财务指标 JSON 数据...');
try {
  const jsonResult = buildFinancialIndicatorsJSON(testIndicatorsData);
  console.log('生成成功！');
  
  // 解析结果进行验证
  const result = JSON.parse(jsonResult);
  
  console.log('\n[测试2] 验证数据字段...');
  
  // 验证 metadata
  console.log('\n--- Metadata ---');
  console.log('projectName:', result.metadata?.projectName || '❌ 空');
  console.log('constructionYears:', result.metadata?.constructionYears || '❌ 空');
  console.log('operationYears:', result.metadata?.operationYears || '❌ 空');
  
  // 验证 investment 数据（关键测试）
  console.log('\n--- Investment（关键验证）---');
  console.log('totalInvestment:', result.investment?.totalInvestment ?? '❌ 空');
  console.log('constructionInvestment:', result.investment?.constructionInvestment ?? '❌ 空');
  console.log('constructionInterest:', result.investment?.constructionInterest ?? '❌ 空');
  console.log('projectEquity:', result.investment?.projectEquity ?? '❌ 空');
  console.log('projectDebt:', result.investment?.projectDebt ?? '❌ 空');
  
  // 验证 annualAverage 数据
  console.log('\n--- AnnualAverage ---');
  console.log('operatingRevenue:', result.annualAverage?.operatingRevenue ?? '❌ 空');
  console.log('totalCost:', result.annualAverage?.totalCost ?? '❌ 空');
  console.log('ebit:', result.annualAverage?.ebit ?? '❌ 空');
  console.log('netProfit:', result.annualAverage?.netProfit ?? '❌ 空');
  
  // 验证 investmentEfficiency 数据
  console.log('\n--- InvestmentEfficiency ---');
  console.log('roi:', result.investmentEfficiency?.roi ?? '❌ 空');
  console.log('roe:', result.investmentEfficiency?.roe ?? '❌ 空');
  
  // 验证 solvency 数据
  console.log('\n--- Solvency ---');
  console.log('interestCoverageRatio:', result.solvency?.interestCoverageRatio ?? '❌ 空');
  console.log('debtServiceCoverageRatio:', result.solvency?.debtServiceCoverageRatio ?? '❌ 空');
  
  // 验证 preTaxIndicators 数据
  console.log('\n--- PreTaxIndicators ---');
  console.log('irr:', result.preTaxIndicators?.irr ?? '❌ 空');
  console.log('npv:', result.preTaxIndicators?.npv ?? '❌ 空');
  console.log('dynamicPaybackPeriod:', result.preTaxIndicators?.dynamicPaybackPeriod ?? '❌ 空');
  
  // 验证 postTaxIndicators 数据
  console.log('\n--- PostTaxIndicators ---');
  console.log('irr:', result.postTaxIndicators?.irr ?? '❌ 空');
  console.log('npv:', result.postTaxIndicators?.npv ?? '❌ 空');
  console.log('dynamicPaybackPeriod:', result.postTaxIndicators?.dynamicPaybackPeriod ?? '❌ 空');
  
  // 汇总验证结果
  console.log('\n' + '='.repeat(60));
  console.log('验证结果汇总:');
  console.log('='.repeat(60));
  
  const issues = [];
  
  // 检查关键字段
  if (result.investment?.constructionInterest === 0 || result.investment?.constructionInterest === undefined) {
    issues.push('建设期利息(constructionInterest)为空或为0');
  }
  if (result.investment?.constructionInvestment === 0 || result.investment?.constructionInvestment === undefined) {
    issues.push('建设投资(constructionInvestment)为空或为0');
  }
  if (result.investment?.totalInvestment === 0 || result.investment?.totalInvestment === undefined) {
    issues.push('项目总投资(totalInvestment)为空或为0');
  }
  if (result.investment?.projectDebt === 0 || result.investment?.projectDebt === undefined) {
    issues.push('项目债务资金(projectDebt)为空或为0');
  }
  
  if (issues.length === 0) {
    console.log('✅ 所有关键字段验证通过！');
    console.log('\n预期值对照:');
    console.log('  - 建设期利息: 150 (来自 construction_interest 顶层字段)');
    console.log('  - 建设投资: 应为 (100+200+50+100+20+40+10+20) + (545-500) + 80 = 765');
    console.log('  - 项目总投资: 建设投资 + 建设期利息 = 765 + 150 = 915');
    console.log('  - 项目债务资金: 1000 (来自 partF.贷款总额)');
    console.log('  - 项目资本金: 项目总投资 - 项目债务资金 = 915 - 1000 = 0 (可能为负数)');
  } else {
    console.log('❌ 发现问题:');
    issues.forEach(issue => console.log('  - ' + issue));
  }
  
  // 输出完整 JSON（用于调试）
  console.log('\n[完整JSON输出]');
  console.log(jsonResult);
  
} catch (error) {
  console.error('测试失败:', error.message);
  console.error(error.stack);
}

// 测试空数据情况
console.log('\n' + '='.repeat(60));
console.log('[测试3] 空数据情况测试...');
console.log('='.repeat(60));

const emptyResult = buildFinancialIndicatorsJSON(null);
const emptyParsed = JSON.parse(emptyResult);

console.log('空数据返回结果:');
console.log('  totalInvestment:', emptyParsed.investment?.totalInvestment);
console.log('  constructionInvestment:', emptyParsed.investment?.constructionInvestment);
console.log('  constructionInterest:', emptyParsed.investment?.constructionInterest);
console.log('  所有字段应为 0');

console.log('\n' + '='.repeat(60));
console.log('测试完成！');
console.log('='.repeat(60));
