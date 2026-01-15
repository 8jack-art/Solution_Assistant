/**
 * 构建财务评价指标汇总表 JSON 数据
 * 严格按照"财务评价指标汇总表"modal中表格渲染的数据进行取值
 * 适配 ReportService.collectProjectData 返回的数据结构
 */

import { safeParseJSON } from './shared.js'

export interface FinancialIndicatorsJSON {
  // 基础信息
  metadata: {
    projectName: string;
    constructionYears: number;
    operationYears: number;
    generatedAt: string;
  };
  
  // 项目投资相关
  investment: {
    totalInvestment: number;          // 项目总投资（万元）
    constructionInvestment: number;   // 建设投资（万元）
    constructionInterest: number;     // 建设期利息（万元）
    totalFinancing: number;           // 资金筹措（万元）
    projectEquity: number;            // 项目资本金（万元）
    projectDebt: number;              // 项目债务资金（万元）
  };
  
  // 年均指标
  annualAverage: {
    operatingRevenue: number;         // 年均销售收入（万元）- 税前
    totalCost: number;                // 年均总成本费用（万元）- 税前
    taxAndSurcharges: number;         // 年均销售税金及附加（万元）
    vat: number;                      // 年均增值税（万元）
    ebit: number;                     // 年均息税前利润（万元）
    totalProfit: number;              // 年均利润总额（万元）
    incomeTax: number;                // 年均所得税（万元）
    netProfit: number;                // 年均净利润（万元）
  };
  
  // 投资效益指标
  investmentEfficiency: {
    roi: number;                      // 总投资收益率（%）
    investmentProfitRate: number;     // 投资利税率（%）
    roe: number;                      // 项目资本金净利润率（%）
  };
  
  // 偿债能力指标
  solvency: {
    interestCoverageRatio: number;    // 平均利息备付率
    debtServiceCoverageRatio: number; // 平均偿债备付率
  };
  
  // 项目投资税前指标
  preTaxIndicators: {
    irr: number;                      // 财务内部收益率（%）
    npv: number;                      // 财务净现值（万元）
    staticPaybackPeriod: number;      // 静态投资回收期（年）
    dynamicPaybackPeriod: number;     // 动态投资回收期（年）
  };
  
  // 项目投资税后指标
  postTaxIndicators: {
    irr: number;                      // 财务内部收益率（%）
    npv: number;                      // 财务净现值（万元）
    staticPaybackPeriod: number;      // 静态投资回收期（年）
    dynamicPaybackPeriod: number;     // 动态投资回收期（年）
  };
}

export function buildFinancialIndicatorsJSON(indicatorsData: any): string {
  if (!indicatorsData) {
    return JSON.stringify(createDefaultStructure(), null, 2)
  }

  // 尝试解析嵌套的财务指标数据
  const indicatorsJSON = typeof indicatorsData === 'string' ? safeParseJSON(indicatorsData) : indicatorsData

  // 从 projectData 中提取各部分数据
  // 适配 ReportService.collectProjectData 返回的数据结构
  const project = indicatorsJSON.project || {}
  const investment = indicatorsJSON.investment || {}
  const revenueCost = indicatorsJSON.revenueCost || {}
  const financialIndicators = indicatorsJSON.financialIndicators || {}
  
  // 借款还本付息计划表数据可能在 revenueCost 中
  const loanRepaymentTableData = revenueCost.loanRepaymentTableData || {}

  // 构建基础元数据
  const metadata = {
    projectName: project.name || '',
    constructionYears: project.constructionYears || 0,
    operationYears: project.operationYears || 0,
    generatedAt: new Date().toISOString()
  }
  
  // 构建项目投资数据
  const investmentData = buildInvestmentData(investment)
  
  // 构建年均指标数据
  const annualAverage = buildAnnualAverageData(revenueCost, project.operationYears || 1)
  
  // 构建投资效益指标 - 按前端公式计算
  const investmentEfficiency = buildInvestmentEfficiencyData(investmentData, annualAverage)
  
  // 构建偿债能力指标 - 从 loanRepaymentTableData 获取
  const solvency = buildSolvencyData(loanRepaymentTableData)
  
  // 构建税前指标
  const preTaxIndicators = buildPreTaxIndicatorsData(financialIndicators)
  
  // 构建税后指标
  const postTaxIndicators = buildPostTaxIndicatorsData(financialIndicators)

  const result: FinancialIndicatorsJSON = {
    metadata,
    investment: investmentData,
    annualAverage,
    investmentEfficiency,
    solvency,
    preTaxIndicators,
    postTaxIndicators
  }
  
  return JSON.stringify(result, null, 2)
}

/**
 * 创建默认结构
 */
function createDefaultStructure(): FinancialIndicatorsJSON {
  return {
    metadata: {
      projectName: '',
      constructionYears: 0,
      operationYears: 0,
      generatedAt: new Date().toISOString()
    },
    investment: {
      totalInvestment: 0,
      constructionInvestment: 0,
      constructionInterest: 0,
      totalFinancing: 0,
      projectEquity: 0,
      projectDebt: 0
    },
    annualAverage: {
      operatingRevenue: 0,
      totalCost: 0,
      taxAndSurcharges: 0,
      vat: 0,
      ebit: 0,
      totalProfit: 0,
      incomeTax: 0,
      netProfit: 0
    },
    investmentEfficiency: {
      roi: 0,
      investmentProfitRate: 0,
      roe: 0
    },
    solvency: {
      interestCoverageRatio: 0,
      debtServiceCoverageRatio: 0
    },
    preTaxIndicators: {
      irr: 0,
      npv: 0,
      staticPaybackPeriod: 0,
      dynamicPaybackPeriod: 0
    },
    postTaxIndicators: {
      irr: 0,
      npv: 0,
      staticPaybackPeriod: 0,
      dynamicPaybackPeriod: 0
    }
  }
}

/**
 * 构建项目投资数据
 * 数据来源：investment 对象
 * 参考前端 FinancialIndicatorsTable.tsx 2752-2762行 financialSummaryRows 计算逻辑
 * 
 * 前端期望的数据来源：
 * 1. 建设期利息：investmentEstimate.construction_interest（顶层字段）
 * 2. 贷款总额：investmentEstimate.estimate_data.partF.贷款总额
 * 3. 建设投资：通过 calculateConstructionInvestment 函数计算
 *    - 从 estimate_data.partA.children 提取第一部分工程费用
 *    - 从 estimate_data.partB 提取第二部分工程其它费用
 *    - 从 basic_reserve 和 price_reserve 获取预备费
 */
function buildInvestmentData(investment: any): FinancialIndicatorsJSON['investment'] {
  // investment 可能是：
  // 1. 完整的 investmentEstimate 对象（包含 estimate_data 和顶层字段）
  // 2. 只有 estimate_data 的对象
  
  // 提取 estimate_data（如果存在）
  const estimateData = investment?.estimate_data || investment

  let constructionInvestment = 0
  let constructionInterest = 0
  let projectDebt = 0

  if (estimateData) {
    // 1. 建设期利息 - 前端从 investmentEstimate.construction_interest 获取
    // 优先从 investment 顶层对象获取（reportService 已添加）
    constructionInterest = Number(investment?.construction_interest) || 
                          Number(estimateData?.construction_interest) || 0
    
    // 如果 estimate_data 中没有 construction_interest，尝试从其他路径获取
    if (constructionInterest === 0) {
      // 尝试从 partD 获取（建设期利息可能在 partD）
      constructionInterest = Number(estimateData?.partD?.合计) || 
                            Number(estimateData?.partD?.total) || 0
    }

    // 2. 项目债务资金 - 前端从 investmentEstimate.estimate_data.partF.贷款总额 获取
    projectDebt = Number(estimateData?.partF?.贷款总额) || 
                  Number(estimateData?.partF?.合计) || 
                  Number(estimateData?.partF?.total) || 0

    // 3. 建设投资 = partA + partB + partC - 土地费用
    // 前端 calculateConstructionInvestment(undefined) 的计算逻辑
    
    // 3.1 计算 partA 合计（第一部分工程费用）
    let partATotal = 0
    if (estimateData?.partA?.children) {
      // 从 children 中累加各项费用
      estimateData.partA.children.forEach((item: any) => {
        partATotal += Number(item.建设工程费) || 0
        partATotal += Number(item.设备购置费) || 0
        partATotal += Number(item.安装工程费) || 0
        partATotal += Number(item.其它费用) || 0
      })
    } else {
      partATotal = Number(estimateData?.partA?.合计) || 
                   Number(estimateData?.partA?.total) || 0
    }

    // 3.2 计算 partB 合计（第二部分工程其它费用）
    let partBTotal = Number(estimateData?.partB?.合计) || 
                     Number(estimateData?.partB?.total) || 0

    // 3.3 提取土地费用
    let landCost = 0
    if (estimateData?.partB?.children) {
      const landItem = estimateData.partB.children.find((item: any) =>
        item.工程或费用名称?.includes('土地') || 
        item.name?.includes('土地')
      )
      landCost = Number(landItem?.合计) || 
                 Number(landItem?.total) || 0
    }

    // 3.4 获取预备费 - 从 investment 顶层对象获取（reportService 已添加）
    const basicReserve = Number(investment?.basic_reserve) || 
                        Number(estimateData?.basic_reserve) || 
                        Number(estimateData?.partC?.basic_reserve) || 0
    const priceReserve = Number(investment?.price_reserve) || 
                        Number(estimateData?.price_reserve) || 
                        Number(estimateData?.partC?.price_reserve) || 0
    
    // 如果 estimateData.partC 有合计，可能是基本预备费和涨价预备费的总和
    const partCTotalFromC = Number(estimateData?.partC?.合计) || 
                            Number(estimateData?.partC?.total) || 0
    
    // 如果 basic_reserve 和 price_reserve 都是0，但 partC 有合计，则使用 partC 合计
    const reserveFees = (basicReserve > 0 || priceReserve > 0) 
      ? basicReserve + priceReserve 
      : partCTotalFromC

    // 3.5 计算各项合计
    // 建筑安装工程费 = (第一部分工程费用合计 - 设备购置费)
    let equipmentFee = 0
    if (estimateData?.partA?.children) {
      estimateData.partA.children.forEach((item: any) => {
        equipmentFee += Number(item.设备购置费) || 0
      })
    }
    const buildingInstallationFee = partATotal - equipmentFee

    // 工程其他费用 = 第二部分工程其它费用合计 - 土地费用
    const engineeringOtherFees = partBTotal - landCost

    // 无形资产费用 = 土地费用
    const intangibleAssetFees = landCost

    // 3.6 建设投资合计 = partA + engineeringOtherFees + intangibleAssetFees + reserveFees
    constructionInvestment = partATotal + engineeringOtherFees + intangibleAssetFees + reserveFees
  }

  // 确保 investment 顶层字段已正确传递
  if (constructionInterest === 0 && investment?.construction_interest) {
    constructionInterest = Number(investment.construction_interest) || 0
  }
  if (projectDebt === 0 && investment?.estimate_data?.partF?.贷款总额) {
    projectDebt = Number(investment.estimate_data.partF.贷款总额) || 0
  }

  const totalInvestment = constructionInvestment + constructionInterest
  const totalFinancing = totalInvestment
  const projectEquity = Math.max(0, totalInvestment - projectDebt)

  return {
    totalInvestment: Number(totalInvestment.toFixed(2)),
    constructionInvestment: Number(constructionInvestment.toFixed(2)),
    constructionInterest: Number(constructionInterest.toFixed(2)),
    totalFinancing: Number(totalFinancing.toFixed(2)),
    projectEquity: Number(projectEquity.toFixed(2)),
    projectDebt: Number(projectDebt.toFixed(2))
  }
}

/**
 * 构建年均指标数据
 * 数据来源：revenueCost
 * 参考前端 FinancialIndicatorsTable.tsx 2722-2731行
 */
function buildAnnualAverageData(
  revenueCost: any, 
  operationYears: number
): FinancialIndicatorsJSON['annualAverage'] {
  const opYears = operationYears || 1

  // 初始值
  let operatingRevenuePreTax = 0
  let totalCostPreTax = 0
  let totalProfit = 0
  let incomeTax = 0
  let netProfit = 0
  let taxAndSurcharges = 0
  let vat = 0
  let inputTaxTotal = 0  // 进项税额
  let ebitTotal = 0       // 息税前利润（序号19）

  // 从 revenueTableData 提取
  const revenueTableData = revenueCost.revenueTableData || revenueCost.revenue_table_data
  if (revenueTableData) {
    const rows = revenueTableData.rows || []
    const revenueRow = rows.find((r: any) => r.序号 === '1')
    const vatRow = rows.find((r: any) => r.序号 === '2')
    const taxRow = rows.find((r: any) => r.序号 === '3')
    // 进项税额从序号2.2获取（营业收入、营业税金及附加和增值税估算表）
    const inputTaxRow = rows.find((r: any) => r.序号 === '2.2')

    operatingRevenuePreTax = Number(revenueRow?.合计) || 0
    vat = Number(vatRow?.合计) || 0
    taxAndSurcharges = Number(taxRow?.合计) || 0
    inputTaxTotal = Number(inputTaxRow?.合计) || 0
  }

  // 从 costTableData 提取
  const costTableData = revenueCost.costTableData || revenueCost.cost_table_data
  if (costTableData) {
    const rows = costTableData.rows || []
    const totalCostRow = rows.find((r: any) => r.序号 === '7')
    const totalCostTotal = Number(totalCostRow?.合计) || 0
    
    // 年均总成本 = (总成本费用合计 + 进项税) / 运营期
    totalCostPreTax = totalCostTotal + inputTaxTotal
  }

  // 从 profitDistributionTableData 提取
  const profitDistributionTableData = revenueCost.profitDistributionTableData || 
                                       revenueCost.profit_distribution_table_data
  if (profitDistributionTableData) {
    const rows = profitDistributionTableData.rows || []
    const totalProfitRow = rows.find((r: any) => r.序号 === '5')
    const incomeTaxRow = rows.find((r: any) => r.序号 === '8')
    const netProfitRow = rows.find((r: any) => r.序号 === '9')
    // 年均息税前利润从序号19（息税前利润）获取
    const ebitRow = rows.find((r: any) => r.序号 === '19')

    totalProfit = Number(totalProfitRow?.合计) || 0
    incomeTax = Number(incomeTaxRow?.合计) || 0
    netProfit = Number(netProfitRow?.合计) || 0
    // ebit 从序号19获取，然后除以运营期
    ebitTotal = Number(ebitRow?.合计) || 0
  }

  return {
    operatingRevenue: Number((operatingRevenuePreTax / opYears).toFixed(2)),
    totalCost: Number((totalCostPreTax / opYears).toFixed(2)),
    taxAndSurcharges: Number((taxAndSurcharges / opYears).toFixed(2)),
    vat: Number((vat / opYears).toFixed(2)),
    ebit: Number((ebitTotal / opYears).toFixed(2)),
    totalProfit: Number((totalProfit / opYears).toFixed(2)),
    incomeTax: Number((incomeTax / opYears).toFixed(2)),
    netProfit: Number((netProfit / opYears).toFixed(2))
  }
}

/**
 * 构建投资效益指标
 * 数据来源：计算得出
 * 参考前端 FinancialIndicatorsTable.tsx 2765-2776行
 * 
 * 公式：
 * 1. 总投资收益率(ROI) = 年均EBIT / 项目总投资 × 100%
 * 2. 投资利税率 = 年利税总额 / 项目总投资 × 100%
 *    年利税总额 = 年均利润总额 + 年均税金总额
 *    年均税金总额 = 年均增值税 + 年均销售税金及附加
 * 3. 项目资本金净利润率(ROE) = 年均净利润 / 项目资本金 × 100%
 */
function buildInvestmentEfficiencyData(
  investment: FinancialIndicatorsJSON['investment'],
  annualAverage: FinancialIndicatorsJSON['annualAverage']
): FinancialIndicatorsJSON['investmentEfficiency'] {
  const { totalInvestment, projectEquity } = investment
  const { ebit, totalProfit, vat, taxAndSurcharges, netProfit } = annualAverage

  // 1. 总投资收益率(ROI) = 年均EBIT / 项目总投资 × 100%
  const roi = totalInvestment > 0 ? (ebit / totalInvestment) * 100 : 0

  // 2. 投资利税率 = 年利税总额 / 项目总投资 × 100%
  // 年利税总额 = 年均利润总额 + 年均税金总额
  // 年均税金总额 = 年均增值税 + 年均销售税金及附加
  const annualAverageTaxTotal = vat + taxAndSurcharges
  const annualAverageProfitAndTaxTotal = totalProfit + annualAverageTaxTotal
  const investmentProfitRate = totalInvestment > 0 
    ? (annualAverageProfitAndTaxTotal / totalInvestment) * 100 
    : 0

  // 3. 项目资本金净利润率(ROE) = 年均净利润 / 项目资本金 × 100%
  const roe = projectEquity > 0 ? (netProfit / projectEquity) * 100 : 0

  return {
    roi: Number(roi.toFixed(2)),
    investmentProfitRate: Number(investmentProfitRate.toFixed(2)),
    roe: Number(roe.toFixed(2))
  }
}

/**
 * 构建偿债能力指标
 * 数据来源：loanRepaymentTableData（从借款还本付息计划表获取）
 * 参考前端 FinancialIndicatorsTable.tsx 2779-2792行
 */
function buildSolvencyData(loanRepaymentTableData: any): FinancialIndicatorsJSON['solvency'] {
  const rows = loanRepaymentTableData?.rows || []

  // 从借款还本付息计划表获取利息备付率和偿债备付率的合计值
  const interestCoverageRow = rows.find((r: any) => r.序号 === '3.4')
  const debtServiceCoverageRow = rows.find((r: any) => r.序号 === '3.5')

  const interestCoverageRatio = Number(interestCoverageRow?.合计) || 
                                Number(interestCoverageRow?.data) || 0
  const debtServiceCoverageRatio = Number(debtServiceCoverageRow?.合计) || 
                                   Number(debtServiceCoverageRow?.data) || 0

  return {
    interestCoverageRatio: Number(interestCoverageRatio.toFixed(2)),
    debtServiceCoverageRatio: Number(debtServiceCoverageRatio.toFixed(2))
  }
}

/**
 * 构建税前指标
 * 数据来源：financialIndicators
 */
function buildPreTaxIndicatorsData(financialIndicators: any): FinancialIndicatorsJSON['preTaxIndicators'] {
  const irr = Number(financialIndicators.preTaxIRR || 
                    financialIndicators.irr || 
                    financialIndicators.preTaxIrr || 0)
  const npv = Number(financialIndicators.preTaxNPV || 
                    financialIndicators.npv || 
                    financialIndicators.preTaxNpv || 0)
  const staticPaybackPeriod = Number(financialIndicators.preTaxStaticPaybackPeriod || 
                                     financialIndicators.staticPaybackPeriod || 0)
  const dynamicPaybackPeriod = Number(financialIndicators.preTaxDynamicPaybackPeriod || 
                                       financialIndicators.dynamicPaybackPeriod || 0)

  return {
    irr: Number(irr.toFixed(2)),
    npv: Number(npv.toFixed(2)),
    staticPaybackPeriod: Number(staticPaybackPeriod.toFixed(2)),
    dynamicPaybackPeriod: Number(dynamicPaybackPeriod.toFixed(2))
  }
}

/**
 * 构建税后指标
 * 数据来源：financialIndicators
 */
function buildPostTaxIndicatorsData(financialIndicators: any): FinancialIndicatorsJSON['postTaxIndicators'] {
  const irr = Number(financialIndicators.postTaxIRR || 
                    financialIndicators.postTaxIrr || 0)
  const npv = Number(financialIndicators.postTaxNPV || 
                    financialIndicators.postTaxNpv || 0)
  const staticPaybackPeriod = Number(financialIndicators.postTaxStaticPaybackPeriod || 0)
  const dynamicPaybackPeriod = Number(financialIndicators.postTaxDynamicPaybackPeriod || 0)

  return {
    irr: Number(irr.toFixed(2)),
    npv: Number(npv.toFixed(2)),
    staticPaybackPeriod: Number(staticPaybackPeriod.toFixed(2)),
    dynamicPaybackPeriod: Number(dynamicPaybackPeriod.toFixed(2))
  }
}
