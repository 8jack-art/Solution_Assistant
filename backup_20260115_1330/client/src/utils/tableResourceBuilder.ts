/**
 * 表格资源构建器
 * 用于将项目数据格式化为前端渲染资源（表格和图表）
 * 
 * 注意：buildAllTableDataJSON 函数已移至服务器端 tableDataBuilder
 * 客户端应通过 API 获取表格数据 JSON
 */

import { TableResource, ChartResource } from '../types/report'

/**
 * 构建所有表格资源（用于前端渲染）
 */
export function buildAllTableResources(projectData: any): Record<string, TableResource> {
  const tables: Record<string, TableResource> = {}
  
  if (!projectData) return tables
  
  // 投资估算简表
  tables['investment_estimate'] = buildInvestmentEstimateTable(projectData.investment)
  
  // 收入成本明细表
  if (projectData.revenueCost) {
    tables['revenue_cost_detail'] = buildRevenueCostDetailTable(projectData.revenueCost)
  }
  
  // 财务指标汇总表
  if (projectData.financialIndicators) {
    tables['financial_indicators'] = buildFinancialIndicatorsTable(projectData.financialIndicators)
  }
  
  // 借款还本付息计划表
  if (projectData.investment?.loanInfo) {
    tables['loan_repayment'] = buildLoanRepaymentTable(projectData.investment)
  }
  
  return tables
}

/**
 * 构建投资估算简表
 */
function buildInvestmentEstimateTable(investment: any): TableResource {
  if (!investment) {
    return { id: 'investment_estimate', title: '投资估算简表', columns: [], data: [] }
  }
  
  const data: Record<string, any>[] = []
  
  // 添加各部分数据
  const parts = ['partA', 'partB', 'partC', 'partD', 'partE', 'partF', 'partG']
  const partNames: Record<string, string> = {
    partA: '第一部分 工程费用',
    partB: '第二部分 工程建设其他费用',
    partC: '第三部分 预备费',
    partD: '第四部分 建设期利息',
    partE: '第五部分 流动资金',
    partF: '第六部分 固定资产投资',
    partG: '项目总投资'
  }
  
  parts.forEach((part, idx) => {
    const partData = investment[part]
    if (partData) {
      // 如果有明细数据，添加明细行
      if (partData.items && Array.isArray(partData.items)) {
        partData.items.forEach((item: any, itemIdx: number) => {
          const amount = item.amount || item.合计 || 0
          data.push({
            序号: `${idx + 1}.${itemIdx + 1}`,
            项目名称: item.name || item.项目名称 || '',
            类别: item.category || '',
            金额万元: Number(amount.toFixed(2))
          })
        })
      }
      
      // 添加部分合计行
      if (partData.合计 !== undefined) {
        data.push({
          序号: '',
          项目名称: partNames[part] || part,
          类别: '合计',
          金额万元: Number(partData.合计.toFixed(2))
        })
      }
    }
  })
  
  return {
    id: 'investment_estimate',
    title: '投资估算简表',
    columns: ['序号', '项目名称', '类别', '金额（万元）'],
    data
  }
}

/**
 * 构建收入成本明细表
 */
function buildRevenueCostDetailTable(revenueCost: any): TableResource {
  if (!revenueCost) {
    return { id: 'revenue_cost_detail', title: '收入成本明细表', columns: [], data: [] }
  }
  
  const data: Record<string, any>[] = []
  
  // 收入项目
  if (revenueCost.revenueItems && Array.isArray(revenueCost.revenueItems)) {
    data.push({ 序号: '一', 项目: '营业收入', 金额: '' })
    revenueCost.revenueItems.forEach((item: any, idx: number) => {
      data.push({ 序号: '', 项目: item.name || item.收入项目名称 || '', 金额: '' })
    })
  }
  
  // 成本项目
  if (revenueCost.costItems && Array.isArray(revenueCost.costItems)) {
    data.push({ 序号: '', 项目: '营业成本', 金额: '' })
    revenueCost.costItems.forEach((item: any, idx: number) => {
      data.push({ 序号: '', 项目: item.name || item.成本项目名称 || '', 金额: '' })
    })
  }
  
  // 修理费
  if (revenueCost.repair) {
    data.push({ 序号: '', 项目: '修理费', 金额: '' })
  }
  
  // 工资及福利费
  if (revenueCost.wages) {
    data.push({ 序号: '', 项目: '工资及福利费', 金额: '' })
  }
  
  // 其他费用
  if (revenueCost.other) {
    data.push({ 序号: '', 项目: '其他费用', 金额: '' })
  }
  
  // 营业税金及附加
  if (revenueCost.tax) {
    data.push({ 序号: '', 项目: '营业税金及附加', 金额: '' })
  }
  
  // 利润总额
  data.push({ 序号: '', 项目: '利润总额', 金额: '' })
  
  // 所得税
  data.push({ 序号: '', 项目: '所得税', 金额: '' })
  
  // 净利润
  data.push({ 序号: '', 项目: '净利润', 金额: '' })
  
  return {
    id: 'revenue_cost_detail',
    title: '收入成本明细表',
    columns: ['序号', '项目', '金额'],
    data
  }
}

/**
 * 构建财务指标汇总表
 */
function buildFinancialIndicatorsTable(indicators: any): TableResource {
  if (!indicators) {
    return { id: 'financial_indicators', title: '财务指标汇总表', columns: [], data: [] }
  }
  
  const data: Record<string, any>[] = [
    { 序号: '1', 指标名称: '项目总投资（万元）', 指标值: indicators.totalInvestment || 0 },
    { 序号: '2', 指标名称: '建设期利息（万元）', 指标值: indicators.constructionInterest || 0 },
    { 序号: '3', 指标名称: '固定资产投资（万元）', 指标值: indicators.fixedAssetInvestment || 0 },
    { 序号: '4', 指标名称: '流动资金（万元）', 指标值: indicators.workingCapital || 0 },
    { 序号: '5', 指标名称: '年均营业收入（万元）', 指标值: indicators.annualRevenue || 0 },
    { 序号: '6', 指标名称: '年均总成本费用（万元）', 指标值: indicators.annualTotalCost || 0 },
    { 序号: '7', 指标名称: '年均利润总额（万元）', 指标值: indicators.annualProfit || 0 },
    { 序号: '8', 指标名称: '年均净利润（万元）', 指标值: indicators.annualNetProfit || 0 },
    { 序号: '9', 指标名称: '投资回收期（年）', 指标值: indicators.paybackPeriod || '-' },
    { 序号: '10', 指标名称: '财务内部收益率FIRR（%）', 指标值: indicators.irr ? `${indicators.irr}%` : '-' },
    { 序号: '11', 指标名称: '财务净现值FNPV（万元）', 指标值: indicators.npv || 0 },
    { 序号: '12', 指标名称: '总投资收益率ROI（%）', 指标值: indicators.roi ? `${indicators.roi}%` : '-' },
    { 序号: '13', 指标名称: '资本金净利润率ROE（%）', 指标值: indicators.roe ? `${indicators.roe}%` : '-' },
    { 序号: '14', 指标名称: '利息备付率', 指标值: indicators.interestCoverageRatio || '-' },
    { 序号: '15', 指标名称: '偿债备偿率', 指标值: indicators.debtServiceCoverageRatio || '-' }
  ]
  
  return {
    id: 'financial_indicators',
    title: '财务指标汇总表',
    columns: ['序号', '指标名称', '指标值'],
    data
  }
}

/**
 * 构建借款还本付息计划表
 */
function buildLoanRepaymentTable(investment: any): TableResource {
  if (!investment?.loanInfo) {
    return { id: 'loan_repayment', title: '借款还本付息计划表', columns: [], data: [] }
  }
  
  const loanInfo = investment.loanInfo
  const data: Record<string, any>[] = [
    { 序号: '1', 项目: '年初借款本息和', 年份1: '', 年份2: '', 年份3: '', 年份4: '', 年份5: '', 合计: '' },
    { 序号: '2', 项目: '本年借款', 年份1: loanInfo.loanAmount || 0, 年份2: 0, 年份3: 0, 年份4: 0, 年份5: 0, 合计: loanInfo.loanAmount || 0 },
    { 序号: '3', 项目: '本年应计利息', 年份1: '', 年份2: '', 年份3: '', 年份4: '', 年份5: '', 合计: '' },
    { 序号: '4', 项目: '本年还本付息', 年份1: '', 年份2: '', 年份3: '', 年份4: '', 年份5: '', 合计: '' },
    { 序号: '5', 项目: '年末借款本息和', 年份1: '', 年份2: '', 年份3: '', 年份4: '', 年份5: '', 合计: '' }
  ]
  
  return {
    id: 'loan_repayment',
    title: '借款还本付息计划表',
    columns: ['序号', '项目', '年份1', '年份2', '年份3', '年份4', '年份5', '合计'],
    data
  }
}
