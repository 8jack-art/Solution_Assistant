/**
 * 财务计算指标表JSON生成测试文件（V3 - 适配真实数据结构）
 * 模拟 ReportService.collectProjectData 返回的数据结构
 */

import { buildFinancialIndicatorsJSON } from './dist/utils/tableDataBuilders/buildFinancialIndicators.js';

// 模拟真实数据结构 - ReportService.collectProjectData 返回的数据
const mockProjectData = {
  project: {
    id: "project-123",
    name: "扶绥县山圩镇现代稻虾产业综合种养基地项目",
    description: "这是一个稻虾综合种养项目",
    constructionYears: 1,
    operationYears: 17,
    projectType: "农业",
    location: "广西"
  },
  investment: {
    estimate_data: {
      partA: { 合计: 6500 },
      partB: { 
        合计: 800,
        children: [
          { 工程或费用名称: "土地费用", 合计: 500 },
          { 工程或费用名称: "其他费用", 合计: 300 }
        ]
      },
      partC: { 合计: 200 },
      construction_interest: 300,
      partF: { 贷款总额: 4000 }
    }
  },
  revenueCost: {
    revenueTableData: {
      rows: [
        { 序号: "1", 合计: 184.77 * 17 },  // 营业收入
        { 序号: "2", 合计: 8.51 * 17 },    // 增值税
        { 序号: "3", 合计: 1.02 * 17 }     // 销售税金及附加
      ]
    },
    costTableData: {
      rows: [
        { 序号: "7", 合计: 116.15 * 17 }   // 总成本费用
      ]
    },
    profitDistributionTableData: {
      rows: [
        { 序号: "5", 合计: 53.12 * 17 },   // 利润总额
        { 序号: "8", 合计: 13.28 * 17 },   // 所得税
        { 序号: "9", 合计: 39.84 * 17 }    // 净利润
      ]
    },
    loanRepaymentTableData: {
      rows: [
        { 序号: "3.4", 合计: 2.5 },  // 利息备付率
        { 序号: "3.5", 合计: 1.8 }   // 偿债备付率
      ]
    }
  },
  financialIndicators: {
    preTaxIRR: 12.49,
    preTaxNPV: 461.13,
    preTaxStaticPaybackPeriod: 8.67,
    preTaxDynamicPaybackPeriod: 11.53,
    postTaxIRR: 10.35,
    postTaxNPV: 299.36,
    postTaxStaticPaybackPeriod: 9.87,
    postTaxDynamicPaybackPeriod: 14.25
  }
};

console.log("=".repeat(60));
console.log("财务计算指标表JSON生成测试（V3 - 适配真实数据结构）");
console.log("=".repeat(60));

// 执行生成
const jsonResult = buildFinancialIndicatorsJSON(mockProjectData);
const result = JSON.parse(jsonResult);

console.log("\n【1. 基本信息 (metadata)】");
console.log(`  项目名称: ${result.metadata.projectName}`);
console.log(`  建设期: ${result.metadata.constructionYears} 年`);
console.log(`  运营期: ${result.metadata.operationYears} 年`);

console.log("\n【2. 投资数据 (investment)】");
console.log(`  项目总投资: ${result.investment.totalInvestment} 万元`);
console.log(`  建设投资: ${result.investment.constructionInvestment} 万元`);
console.log(`  建设期利息: ${result.investment.constructionInterest} 万元`);
console.log(`  资金筹措: ${result.investment.totalFinancing} 万元`);
console.log(`  项目资本金: ${result.investment.projectEquity} 万元`);
console.log(`  项目债务资金: ${result.investment.projectDebt} 万元`);

console.log("\n【3. 年均指标 (annualAverage)】");
console.log(`  年均销售收入: ${result.annualAverage.operatingRevenue.toFixed(2)} 万元`);
console.log(`  年均总成本费用: ${result.annualAverage.totalCost.toFixed(2)} 万元`);
console.log(`  年均销售税金及附加: ${result.annualAverage.taxAndSurcharges.toFixed(2)} 万元`);
console.log(`  年均增值税: ${result.annualAverage.vat.toFixed(2)} 万元`);
console.log(`  年均息税前利润: ${result.annualAverage.ebit.toFixed(2)} 万元`);
console.log(`  年均利润总额: ${result.annualAverage.totalProfit.toFixed(2)} 万元`);
console.log(`  年均所得税: ${result.annualAverage.incomeTax.toFixed(2)} 万元`);
console.log(`  年均净利润: ${result.annualAverage.netProfit.toFixed(2)} 万元`);

console.log("\n【4. 投资效益指标 (investmentEfficiency)】");
console.log(`  总投资收益率(ROI): ${result.investmentEfficiency.roi}%`);
console.log(`  投资利税率: ${result.investmentEfficiency.investmentProfitRate}%`);
console.log(`  项目资本金净利润率(ROE): ${result.investmentEfficiency.roe}%`);

console.log("\n【5. 偿债能力指标 (solvency)】");
console.log(`  平均利息备付率: ${result.solvency.interestCoverageRatio}`);
console.log(`  平均偿债备付率: ${result.solvency.debtServiceCoverageRatio}`);

console.log("\n【6. 税前指标 (preTaxIndicators)】");
console.log(`  财务内部收益率(IRR): ${result.preTaxIndicators.irr}%`);
console.log(`  财务净现值(NPV): ${result.preTaxIndicators.npv} 万元`);
console.log(`  静态投资回收期: ${result.preTaxIndicators.staticPaybackPeriod} 年`);
console.log(`  动态投资回收期: ${result.preTaxIndicators.dynamicPaybackPeriod} 年`);

console.log("\n【7. 税后指标 (postTaxIndicators)】");
console.log(`  财务内部收益率(IRR): ${result.postTaxIndicators.irr}%`);
console.log(`  财务净现值(NPV): ${result.postTaxIndicators.npv} 万元`);
console.log(`  静态投资回收期: ${result.postTaxIndicators.staticPaybackPeriod} 年`);
console.log(`  动态投资回收期: ${result.postTaxIndicators.dynamicPaybackPeriod} 年`);

// 数据验证
console.log("\n" + "=".repeat(60));
console.log("数据验证结果");
console.log("=".repeat(60));

let allPassed = true;

// 验证 investment 数据
const investmentTests = [
  { name: "总投资", value: result.investment.totalInvestment, expected: 7300 },
  { name: "建设投资", value: result.investment.constructionInvestment, expected: 7000 },
  { name: "建设期利息", value: result.investment.constructionInterest, expected: 300 },
  { name: "项目债务资金", value: result.investment.projectDebt, expected: 4000 }
];

console.log("\n[投资数据验证]");
investmentTests.forEach(test => {
  const passed = test.value > 0;
  const status = passed ? "✅" : "❌";
  console.log(`  ${status} ${test.name}: ${test.value} (${passed ? '有值' : '为空'})`);
  if (!passed) allPassed = false;
});

// 验证 investmentEfficiency 数据
const efficiencyTests = [
  { name: "总投资收益率(ROI)", value: result.investmentEfficiency.roi },
  { name: "投资利税率", value: result.investmentEfficiency.investmentProfitRate },
  { name: "资本金净利润率(ROE)", value: result.investmentEfficiency.roe }
];

console.log("\n[投资效益指标验证]");
efficiencyTests.forEach(test => {
  const passed = test.value > 0;
  const status = passed ? "✅" : "❌";
  console.log(`  ${status} ${test.name}: ${test.value}% (${passed ? '有值' : '为空'})`);
  if (!passed) allPassed = false;
});

// 验证 solvency 数据
const solvencyTests = [
  { name: "利息备付率", value: result.solvency.interestCoverageRatio },
  { name: "偿债备付率", value: result.solvency.debtServiceCoverageRatio }
];

console.log("\n[偿债能力指标验证]");
solvencyTests.forEach(test => {
  const passed = test.value > 0;
  const status = passed ? "✅" : "❌";
  console.log(`  ${status} ${test.name}: ${test.value} (${passed ? '有值' : '为空'})`);
  if (!passed) allPassed = false;
});

// 验证 preTaxIndicators 数据
const preTaxTests = [
  { name: "税前IRR", value: result.preTaxIndicators.irr, min: 10 },
  { name: "税前NPV", value: result.preTaxIndicators.npv, min: 0 }
];

console.log("\n[税前指标验证]");
preTaxTests.forEach(test => {
  const passed = test.value >= test.min;
  const status = passed ? "✅" : "❌";
  console.log(`  ${status} ${test.name}: ${test.value} (${passed ? '有效' : '无效'})`);
  if (!passed) allPassed = false;
});

// 验证 postTaxIndicators 数据
const postTaxTests = [
  { name: "税后IRR", value: result.postTaxIndicators.irr, min: 5 },
  { name: "税后NPV", value: result.postTaxIndicators.npv, min: 0 }
];

console.log("\n[税后指标验证]");
postTaxTests.forEach(test => {
  const passed = test.value >= test.min;
  const status = passed ? "✅" : "❌";
  console.log(`  ${status} ${test.name}: ${test.value} (${passed ? '有效' : '无效'})`);
  if (!passed) allPassed = false;
});

// 最终结果
console.log("\n" + "=".repeat(60));
if (allPassed) {
  console.log("✅ 所有关键字段数据验证通过！");
  console.log("  - investment 字段: 有值");
  console.log("  - investmentEfficiency 字段: 有值");
  console.log("  - solvency 字段: 有值");
} else {
  console.log("❌ 部分字段验证失败，请检查数据来源");
}
console.log("=".repeat(60));

// 输出完整JSON供调试
console.log("\n【完整JSON输出】");
console.log(jsonResult);
