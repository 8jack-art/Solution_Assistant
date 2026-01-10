/**
 * 表格数据生成器
 * 将投资估算、收入成本等数据格式化为 JSON 格式，用于 LLM 提示词
 */

/**
 * 辅助函数：安全解析 JSON 字符串
 */
const safeParseJSON = (data: any): any => {
  if (!data) return null
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (e) {
      return null
    }
  }
  return data
}

/**
 * 构建投资估算简表 JSON 数据
 */
export function buildInvestmentEstimateJSON(estimateData: any): string {
  if (!estimateData) return '{}'
  
  const jsonData: any = {
    title: '投资估算简表',
    summary: {
      totalInvestment: estimateData.partG?.合计 || 0,
      constructionInvestment: estimateData.partE?.合计 || 0,
      interestDuringConstruction: estimateData.partF?.合计 || 0,
      contingency: estimateData.partD?.合计 || 0
    },
    partA: {
      name: '第一部分 工程费用',
      total: estimateData.partA?.合计 || 0,
      children: (estimateData.partA?.children || []).map((item: any) => ({
        序号: item.序号,
        工程或费用名称: item.工程或费用名称,
        建设工程费: item['建设工程费（万元）'] || item.建设工程费 || 0,
        设备购置费: item['设备购置费（万元）'] || item.设备购置费 || 0,
        安装工程费: item['安装工程费（万元）'] || item.安装工程费 || 0,
        其它费用: item['其它费用（万元）'] || item.其它费用 || 0,
        合计: item['合计（万元）'] || item.合计 || 0
      }))
    },
    partB: {
      name: '第二部分 工程其它费用',
      total: estimateData.partB?.合计 || 0,
      children: (estimateData.partB?.children || []).map((item: any) => ({
        序号: item.序号,
        工程或费用名称: item.工程或费用名称,
        其它费用: item['其它费用（万元）'] || item.其它费用 || item.合计 || 0,
        合计: item['合计（万元）'] || item.合计 || 0
      }))
    },
    partC: {
      total: estimateData.partC?.合计 || 0
    },
    partD: {
      total: estimateData.partD?.合计 || 0
    },
    partE: {
      total: estimateData.partE?.合计 || 0
    },
    partF: {
      total: estimateData.partF?.合计 || 0,
      贷款总额: estimateData.partF?.贷款总额 || 0,
      年利率: (estimateData.partF?.年利率 || 0) * 100
    },
    partG: {
      total: estimateData.partG?.合计 || 0
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建折旧与摊销估算表 JSON 数据
 * 折旧数据存储在 revenueCostModelData.depreciationAmortization 中
 * 结构为: { 
 *   A_depreciation: number[], 
 *   D_depreciation: number[], 
 *   E_amortization: number[],
 *   A: { 原值, 年折旧额, 折旧年限, 残值率 },
 *   D: { 原值, 年折旧额, 折旧年限, 残值率 },
 *   E: { 原值, 年摊销额, 摊销年限, 残值率 }
 * }
 * 
 * 输出简化格式，供报告生成使用：
 * - 建筑折旧：年限、残值率（%）、年均折旧费（万元）
 * - 机器设备折旧：年限、残值率（%）、年均折旧费（万元）
 * - 无形资产摊销：年限、年摊销费（万元）
 */
export function buildDepreciationAmortizationJSON(depreciationData: any): string {
  if (!depreciationData) return '{}'
  
  // 获取折旧摊销数据（从 depreciationAmortization 字段）
  const depAmortData = depreciationData.depreciationAmortization || depreciationData
  
  // 调试日志：打印原始数据结构
  console.log('🔍 buildDepreciationAmortizationJSON 调试信息:', {
    '原始数据keys': Object.keys(depreciationData),
    'depAmortData keys': Object.keys(depAmortData),
    'A_depreciation长度': depAmortData.A_depreciation?.length || 0,
    'D_depreciation长度': depAmortData.D_depreciation?.length || 0,
    'E_amortization长度': depAmortData.E_amortization?.length || 0,
    'A参数': JSON.stringify(depAmortData.A || {}),
    'D参数': JSON.stringify(depAmortData.D || {}),
    'E参数': JSON.stringify(depAmortData.E || {})
  })
  
  // 提取年度数据
  const aDepreciation = depAmortData.A_depreciation || []
  const dDepreciation = depAmortData.D_depreciation || []
  const eAmortization = depAmortData.E_amortization || []
  
  // 提取折旧参数（优先从嵌套结构获取，如果为空则从根对象获取）
  const aParams = (depAmortData.A && Object.keys(depAmortData.A).length > 0) 
    ? depAmortData.A 
    : (depreciationData.A || {})
  const dParams = (depAmortData.D && Object.keys(depAmortData.D).length > 0) 
    ? depAmortData.D 
    : (depreciationData.D || {})
  const eParams = (depAmortData.E && Object.keys(depAmortData.E).length > 0) 
    ? depAmortData.E 
    : (depreciationData.E || {})
  
  // 构建简化格式的 JSON 数据（用于报告生成）
  const jsonData: any = {
    // 建筑折旧（房屋建筑物）
    建筑折旧: {
      年限: aParams.折旧年限 || aParams.depreciationYears || 0,
      残值率: aParams.残值率 || aParams.residualRate || 0,
      年均折旧费: aParams.年折旧额 || aParams.annualDepreciation || (aDepreciation[0] || 0)
    },
    // 机器设备折旧
    机器设备折旧: {
      年限: dParams.折旧年限 || dParams.depreciationYears || 0,
      残值率: dParams.残值率 || dParams.residualRate || 0,
      年均折旧费: dParams.年折旧额 || dParams.annualDepreciation || (dDepreciation[0] || 0)
    },
    // 无形资产摊销
    无形资产摊销: {
      年限: eParams.摊销年限 || eParams.amortizationYears || 0,
      年摊销费: eParams.年摊销额 || eParams.annualAmortization || (eAmortization[0] || 0)
    }
  }
  
  // 计算合计年均折旧费
  jsonData.年均折旧费合计 = 
    (jsonData.建筑折旧.年均折旧费 || 0) +
    (jsonData.机器设备折旧.年均折旧费 || 0) +
    (jsonData.无形资产摊销.年摊销费 || 0)
  
  console.log('✅ buildDepreciationAmortizationJSON 输出:', JSON.stringify(jsonData, null, 2))
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建营业收入、税金及附加估算表 JSON 数据
 */
export function buildRevenueTaxJSON(revenueTaxData: any): string {
  if (!revenueTaxData) return '{}'
  
  const jsonData: any = {
    title: '营业收入、营业税金及附加和增值税估算表',
    revenueItems: [],
    taxItems: [],
    vatItems: [],
    summary: {
      totalRevenue: 0,
      totalTax: 0,
      totalVAT: 0
    }
  }
  
  // 收入项目
  const revenueItems = safeParseJSON(revenueTaxData.revenueItems)
  if (revenueItems && Array.isArray(revenueItems)) {
    jsonData.revenueItems = revenueItems.map((item: any) => ({
      序号: item.序号 || item.index,
      项目名称: item.name || item.项目名称 || '',
      产品名称: item.productName || item.product_name || '',
      单位: item.unit || item.单位 || '',
      单价: item.price || item.单价 || 0,
      销量: item.quantity || item.销量 || 0,
      年营业收入: item.annualRevenue || item.年营业收入 || 0
    }))
    
    jsonData.summary.totalRevenue = jsonData.revenueItems.reduce(
      (sum: number, item: any) => sum + (item.年营业收入 || 0), 0
    )
  }
  
  // 税金项目
  const taxItems = safeParseJSON(revenueTaxData.taxItems)
  if (taxItems && Array.isArray(taxItems)) {
    jsonData.taxItems = taxItems.map((item: any) => ({
      序号: item.序号 || item.index,
      项目名称: item.name || item.项目名称 || '',
      税率: item.taxRate || item.税率 || 0,
      年税金: item.annualTax || item.年税金 || 0
    }))
    
    jsonData.summary.totalTax = jsonData.taxItems.reduce(
      (sum: number, item: any) => sum + (item.年税金 || 0), 0
    )
  }
  
  // 增值税项目
  const vatItems = safeParseJSON(revenueTaxData.vatItems)
  if (vatItems && Array.isArray(vatItems)) {
    jsonData.vatItems = vatItems.map((item: any) => ({
      序号: item.序号 || item.index,
      项目名称: item.name || item.项目名称 || '',
      税率: item.vatRate || item.税率 || 0,
      年增值税: item.annualVAT || item.年增值税 || 0
    }))
    
    jsonData.summary.totalVAT = jsonData.vatItems.reduce(
      (sum: number, item: any) => sum + (item.年增值税 || 0), 0
    )
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建外购原材料费估算表 JSON 数据
 */
export function buildRawMaterialsJSON(rawMaterialsData: any): string {
  if (!rawMaterialsData) return '{}'
  
  const jsonData: any = {
    title: '外购原材料费估算表',
    items: [],
    summary: { totalCost: 0 }
  }
  
  const items = safeParseJSON(rawMaterialsData.raw_materials)
  if (items && Array.isArray(items)) {
    jsonData.items = items.map((item: any) => ({
      序号: item.序号 || item.index,
      材料名称: item.name || item.材料名称 || '',
      单位: item.unit || item.单位 || '',
      单价: item.unitPrice || item.单价 || 0,
      年用量: item.annualQuantity || item.年用量 || 0,
      年费用: item.annualCost || item.年费用 || 0
    }))
    
    jsonData.summary.totalCost = jsonData.items.reduce(
      (sum: number, item: any) => sum + (item.年费用 || 0), 0
    )
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建外购燃料和动力费估算表 JSON 数据
 */
export function buildFuelPowerJSON(fuelPowerData: any): string {
  if (!fuelPowerData) return '{}'
  
  const jsonData: any = {
    title: '外购燃料和动力费估算表',
    items: [],
    summary: { totalCost: 0 }
  }
  
  const items = safeParseJSON(fuelPowerData.fuel_power)
  if (items && Array.isArray(items)) {
    jsonData.items = items.map((item: any) => ({
      序号: item.序号 || item.index,
      名称: item.name || item.名称 || item.fuelType || '',
      单位: item.unit || item.单位 || '',
      单价: item.unitPrice || item.单价 || 0,
      年用量: item.annualQuantity || item.年用量 || 0,
      年费用: item.annualCost || item.年费用 || 0
    }))
    
    jsonData.summary.totalCost = jsonData.items.reduce(
      (sum: number, item: any) => sum + (item.年费用 || 0), 0
    )
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建利润与利润分配表 JSON 数据
 */
export function buildProfitDistributionJSON(profitData: any): string {
  if (!profitData) return '{}'
  
  const jsonData: any = {
    title: '利润与利润分配表',
    yearlyData: [],
    summary: {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalTax: 0,
      totalNetProfit: 0
    }
  }
  
  // 解析年度利润数据
  const yearlyData = safeParseJSON(profitData.profit_distribution || profitData.yearlyProfit)
  if (yearlyData && Array.isArray(yearlyData)) {
    jsonData.yearlyData = yearlyData.map((item: any) => ({
      年份: item.year || item.年份 || 0,
      营业收入: item.revenue || item.营业收入 || 0,
      总成本费用: item.totalCost || item.总成本费用 || 0,
      营业税金及附加: item.tax || item.营业税金及附加 || 0,
      利润总额: item.profitBeforeTax || item.利润总额 || 0,
      所得税: item.incomeTax || item.所得税 || 0,
      净利润: item.netProfit || item.净利润 || 0
    }))
  }
  
  // 计算合计
  jsonData.summary.totalRevenue = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.营业收入 || 0), 0
  )
  jsonData.summary.totalCost = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.总成本费用 || 0), 0
  )
  jsonData.summary.totalProfit = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.利润总额 || 0), 0
  )
  jsonData.summary.totalTax = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.所得税 || 0), 0
  )
  jsonData.summary.totalNetProfit = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.净利润 || 0), 0
  )
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建项目投资现金流量表 JSON 数据
 */
export function buildProjectCashFlowJSON(cashFlowData: any): string {
  if (!cashFlowData) return '{}'
  
  const jsonData: any = {
    title: '项目投资现金流量表',
    yearlyData: [],
    summary: {
      totalCashInflow: 0,
      totalCashOutflow: 0,
      netCashFlow: 0,
      npv: 0,
      irr: 0
    }
  }
  
  // 解析年度现金流量数据
  const yearlyData = safeParseJSON(cashFlowData.project_cash_flow || cashFlowData.yearlyCashFlow)
  if (yearlyData && Array.isArray(yearlyData)) {
    jsonData.yearlyData = yearlyData.map((item: any) => ({
      年份: item.year || item.年份 || 0,
      现金流入: item.cashInflow || item.现金流入 || 0,
      现金流出: item.cashOutflow || item.现金流出 || 0,
      净现金流量: item.netCashFlow || item.净现金流量 || 0,
      累计净现金流量: item.cumulativeCashFlow || item.累计净现金流量 || 0,
      所得税前净现金流量: item.cashFlowBeforeTax || item.所得税前净现金流量 || 0,
      所得税后净现金流量: item.cashFlowAfterTax || item.所得税后净现金流量 || 0
    }))
  }
  
  // 计算合计
  jsonData.summary.totalCashInflow = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.现金流入 || 0), 0
  )
  jsonData.summary.totalCashOutflow = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.现金流出 || 0), 0
  )
  jsonData.summary.netCashFlow = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.净现金流量 || 0), 0
  )
  
  // 获取 NPV 和 IRR
  if (cashFlowData.npv) jsonData.summary.npv = cashFlowData.npv
  if (cashFlowData.irr) jsonData.summary.irr = cashFlowData.irr
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建财务计算指标表 JSON 数据
 */
export function buildFinancialIndicatorsJSON(financialData: any): string {
  if (!financialData) return '{}'
  
  const indicators = financialData.financialIndicators || {}
  const investment = financialData.investment || {}
  const revenueCost = financialData.revenueCost || {}
  
  // 计算年均收入和成本
  const revenueItems = safeParseJSON(revenueCost.revenueItems) || []
  const costItems = safeParseJSON(revenueCost.costItems) || []
  
  const totalRevenue = revenueItems.reduce(
    (sum: number, item: any) => sum + (item.annualRevenue || 0), 0
  ) || indicators.totalRevenue || 0
  
  const totalCost = costItems.reduce(
    (sum: number, item: any) => sum + (item.annualCost || 0), 0
  ) || indicators.totalCost || 0
  
  const jsonData: any = {
    title: '财务计算指标表',
    investment: {
      totalInvestment: investment.partG?.合计 || indicators.totalInvestment || 0,
      constructionInvestment: investment.partE?.合计 || 0,
      interestDuringConstruction: investment.partF?.合计 || 0,
      contingency: investment.partD?.合计 || 0
    },
    annualMetrics: {
      revenue: totalRevenue,
      totalCost: totalCost,
      profit: totalRevenue - totalCost,
      tax: indicators.annualTax || 0,
      vat: indicators.annualVAT || 0,
      ebit: indicators.annualEBIT || (totalRevenue - totalCost + (indicators.annualTax || 0))
    },
    profitability: {
      roi: indicators.roi || 0,
      roe: indicators.roe || 0,
      netProfitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost - (indicators.annualTax || 0)) / totalRevenue) * 100 : 0
    },
    liquidity: {
      interestCoverageRatio: indicators.interestCoverageRatio || 0,
      debtServiceCoverageRatio: indicators.debtServiceCoverageRatio || 0
    },
    investmentReturns: {
      firrBeforeTax: indicators.firrBeforeTax || indicators.irr || 0,
      firrAfterTax: indicators.firrAfterTax || indicators.irr || 0,
      npvBeforeTax: indicators.npvBeforeTax || indicators.npv || 0,
      npvAfterTax: indicators.npvAfterTax || indicators.npv || 0,
      paybackPeriodBeforeTax: indicators.paybackPeriodBeforeTax || indicators.paybackPeriod || 0,
      paybackPeriodAfterTax: indicators.paybackPeriodAfterTax || indicators.paybackPeriod || 0
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建借款还本付息计划表 JSON 数据
 */
export function buildLoanRepaymentJSON(loanData: any, context?: any): string {
  if (!loanData) return '{}'
  
  const constructionYears = context?.constructionYears || loanData.partF?.建设期年限 || 2
  const operationYears = context?.operationYears || 10
  const totalYears = constructionYears + operationYears
  
  const jsonData: any = {
    title: '借款还本付息计划表',
    context: {
      constructionYears,
      operationYears,
      totalYears,
      loanAmount: loanData.partF?.贷款总额 || 0,
      annualInterestRate: (loanData.partF?.年利率 || 0) * 100
    },
    yearlyData: [],
    summary: {
      totalInterest: 0,
      totalRepayment: 0
    }
  }
  
  // 解析还款计划数据
  const repaymentSchedule = loanData.loan_repayment_schedule_simple || 
                            loanData.loan_repayment_schedule_detailed ||
                            loanData.construction_interest_details
  
  if (repaymentSchedule) {
    const scheduleData = safeParseJSON(repaymentSchedule)
    if (scheduleData?.rows && Array.isArray(scheduleData.rows)) {
      jsonData.yearlyData = scheduleData.rows.map((row: any) => ({
        序号: row.序号,
        项目: row.项目,
        合计: row.合计,
        建设期: row.建设期 || [],
        运营期: row.运营期 || []
      }))
    }
  } else if (loanData.partF?.分年利息) {
    // 从分年利息构建
    const yearlyInterest = loanData.partF.分年利息 || []
    for (let i = 0; i < totalYears; i++) {
      const isConstruction = i < constructionYears
      jsonData.yearlyData.push({
        年份: i + 1,
        时期: isConstruction ? '建设期' : '运营期',
        当期借款金额: isConstruction ? (yearlyInterest[i]?.当期借款金额 || 0) : 0,
        当期利息: yearlyInterest[i]?.当期利息 || 0,
        当期付息: yearlyInterest[i]?.当期利息 || 0
      })
    }
    
    jsonData.summary.totalInterest = yearlyInterest.reduce(
      (sum: number, item: any) => sum + (item.当期利息 || 0), 0
    )
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建财务评价指标汇总表 JSON 数据
 */
export function buildFinancialSummaryJSON(financialData: any, context?: any): string {
  if (!financialData) return '{}'
  
  const indicators = financialData.financialIndicators || {}
  const investment = financialData.investment || {}
  const revenueCost = financialData.revenueCost || {}
  
  const constructionYears = context?.constructionYears || investment.partF?.建设期年限 || 2
  const operationYears = context?.operationYears || 10
  
  // 计算年均数据
  const revenueItems = safeParseJSON(revenueCost.revenueItems) || []
  const costItems = safeParseJSON(revenueCost.costItems) || []
  
  const totalRevenue = revenueItems.reduce(
    (sum: number, item: any) => sum + (item.annualRevenue || 0), 0
  ) || indicators.totalRevenue || 0
  
  const totalCost = costItems.reduce(
    (sum: number, item: any) => sum + (item.annualCost || 0), 0
  ) || indicators.totalCost || 0
  
  const totalInvestment = investment.partG?.合计 || indicators.totalInvestment || 0
  const equity = indicators.equity || (totalInvestment * 0.3)
  const constructionInvestment = investment.partE?.合计 || 0
  const constructionInterest = investment.partF?.合计 || 0
  const annualTax = indicators.annualTax || 0
  const annualVAT = indicators.annualVAT || 0
  const annualProfit = totalRevenue - totalCost
  const annualEBIT = indicators.annualEBIT || (annualProfit + annualTax + (constructionInterest / constructionYears))
  const annualNetProfit = annualProfit - annualTax
  
  // 计算指标
  const roi = totalInvestment > 0 ? (annualEBIT / totalInvestment) * 100 : 0
  const investmentTaxRate = totalInvestment > 0 ? ((annualEBIT + annualTax + annualVAT) / totalInvestment) * 100 : 0
  const roe = equity > 0 ? (annualNetProfit / equity) * 100 : 0
  
  const jsonData: any = {
    title: '财务评价指标汇总表',
    basicInfo: {
      projectName: financialData.project?.name || '',
      constructionYears,
      operationYears,
      totalInvestment,
      equity,
      debt: totalInvestment - equity
    },
    annualMetrics: {
      revenue: totalRevenue,
      totalCost,
      profit: annualProfit,
      ebit: annualEBIT,
      netProfit: annualNetProfit,
      tax: annualTax,
      vat: annualVAT
    },
    investment: {
      totalInvestment,
      constructionInvestment,
      interestDuringConstruction: constructionInterest,
      equity,
      debt: totalInvestment - equity
    },
    profitability: {
      roi: { value: roi, unit: '%', description: '总投资收益率' },
      investmentTaxRate: { value: investmentTaxRate, unit: '%', description: '投资利税率' },
      roe: { value: roe, unit: '%', description: '项目资本金净利润率' },
      netProfitMargin: { 
        value: totalRevenue > 0 ? (annualNetProfit / totalRevenue) * 100 : 0, 
        unit: '%', 
        description: '净利润率' 
      }
    },
    liquidity: {
      interestCoverageRatio: { 
        value: indicators.interestCoverageRatio || 0, 
        unit: '-', 
        description: '平均利息备付率' 
      },
      debtServiceCoverageRatio: { 
        value: indicators.debtServiceCoverageRatio || 0, 
        unit: '-', 
        description: '平均偿债备付率' 
      }
    },
    investmentReturns: {
      firrBeforeTax: { 
        value: indicators.firrBeforeTax || indicators.irr || 0, 
        unit: '%', 
        description: '财务内部收益率（税前）' 
      },
      firrAfterTax: { 
        value: indicators.firrAfterTax || indicators.irr || 0, 
        unit: '%', 
        description: '财务内部收益率（税后）' 
      },
      npvBeforeTax: { 
        value: indicators.npvBeforeTax || indicators.npv || 0, 
        unit: '万元', 
        description: '财务净现值（税前）' 
      },
      npvAfterTax: { 
        value: indicators.npvAfterTax || indicators.npv || 0, 
        unit: '万元', 
        description: '财务净现值（税后）' 
      },
      paybackPeriodBeforeTax: { 
        value: indicators.paybackPeriodBeforeTax || indicators.paybackPeriod || 0, 
        unit: '年', 
        description: '投资回收期（税前）' 
      },
      paybackPeriodAfterTax: { 
        value: indicators.paybackPeriodAfterTax || indicators.paybackPeriod || 0, 
        unit: '年', 
        description: '投资回收期（税后）' 
      }
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建所有表格数据 JSON
 */
export function buildAllTableDataJSON(projectData: any): Record<string, string> {
  const jsonData: Record<string, string> = {}
  
  // 获取建设期和运营期
  const context = {
    constructionYears: projectData.investment?.partF?.建设期年限 || 
                      projectData.project?.constructionYears || 2,
    operationYears: projectData.project?.operationYears || 10
  }
  
  // 投资估算简表
  jsonData['DATA:investment_estimate'] = buildInvestmentEstimateJSON(projectData.investment)
  
  // 折旧与摊销估算表 - 从 revenueCost.depreciationAmortization 获取数据
  jsonData['DATA:depreciation_amortization'] = buildDepreciationAmortizationJSON(
    projectData.revenueCost || {}
  )
  
  // 营业收入税金及附加估算表
  jsonData['DATA:revenue_tax'] = buildRevenueTaxJSON(
    projectData.revenueTax || projectData.revenueCost
  )
  
  // 外购原材料费估算表
  jsonData['DATA:raw_materials'] = buildRawMaterialsJSON(projectData)
  
  // 外购燃料和动力费估算表
  jsonData['DATA:fuel_power'] = buildFuelPowerJSON(projectData)
  
  // 利润与利润分配表
  jsonData['DATA:profit_distribution'] = buildProfitDistributionJSON(
    projectData.profitDistribution || projectData.profit
  )
  
  // 项目投资现金流量表
  jsonData['DATA:project_cash_flow'] = buildProjectCashFlowJSON(
    projectData.projectCashFlow || projectData.cashFlow
  )
  
  // 财务计算指标表
  jsonData['DATA:financial_indicators'] = buildFinancialIndicatorsJSON(projectData)
  
  // 借款还本付息计划表
  jsonData['DATA:loan_repayment'] = buildLoanRepaymentJSON(projectData.investment, context)
  
  // 财务评价指标汇总表
  jsonData['DATA:financial_summary'] = buildFinancialSummaryJSON(projectData, context)
  
  return jsonData
}
