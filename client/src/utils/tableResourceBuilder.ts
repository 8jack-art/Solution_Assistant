import { TableResource } from '../types/report'

/**
 * 表格资源构建器
 * 将投资估算、收入成本等数据格式化为 TableResource 格式
 */

/**
 * 构建投资估算简表
 */
export function buildInvestmentEstimateTable(estimateData: any): TableResource | null {
  if (!estimateData) return null

  const tableData: Record<string, any>[] = []
  const totalInvestment = estimateData.partG?.合计 || 0

  // 添加A部分数据（第一部分 工程费用）
  if (estimateData.partA?.children) {
    estimateData.partA.children.forEach((item: any, index: number) => {
      tableData.push({
        序号: item.序号 || `${index + 1}`,
        类别: '一、工程费用',
        名称: item.工程或费用名称 || '',
        建设工程费: (item.建设工程费 || 0).toFixed(2),
        设备购置费: (item.设备购置费 || 0).toFixed(2),
        安装工程费: (item.安装工程费 || 0).toFixed(2),
        其它费用: (item.其它费用 || 0).toFixed(2),
        合计: (item.合计 || 0).toFixed(2),
        占总投资比例: totalInvestment > 0 ? `${(((item.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '0%'
      })
    })
  }

  // 添加A部分合计
  if (estimateData.partA) {
    tableData.push({
      序号: '一',
      类别: '一、工程费用 合计',
      名称: '',
      建设工程费: (estimateData.partA.children?.reduce((sum: number, item: any) => sum + (item.建设工程费 || 0), 0) || 0).toFixed(2),
      设备购置费: (estimateData.partA.children?.reduce((sum: number, item: any) => sum + (item.设备购置费 || 0), 0) || 0).toFixed(2),
      安装工程费: (estimateData.partA.children?.reduce((sum: number, item: any) => sum + (item.安装工程费 || 0), 0) || 0).toFixed(2),
      其它费用: (estimateData.partA.children?.reduce((sum: number, item: any) => sum + (item.其它费用 || 0), 0) || 0).toFixed(2),
      合计: (estimateData.partA.合计 || 0).toFixed(2),
      占总投资比例: totalInvestment > 0 ? `${(((estimateData.partA.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '0%'
    })
  }

  // 添加B部分数据（第二部分 其它费用）
  if (estimateData.partB?.children) {
    estimateData.partB.children.forEach((item: any) => {
      tableData.push({
        序号: item.序号 || '',
        类别: '二、其它费用',
        名称: item.工程或费用名称 || '',
        建设工程费: '0.00',
        设备购置费: '0.00',
        安装工程费: '0.00',
        其它费用: (item.其它费用 || item.合计 || 0).toFixed(2),
        合计: (item.合计 || 0).toFixed(2),
        占总投资比例: totalInvestment > 0 ? `${(((item.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '0%'
      })
    })
  }

  // 添加C部分（一、二部分合计）
  if (estimateData.partC) {
    tableData.push({
      序号: '三',
      类别: '第一、二部分合计',
      名称: '',
      建设工程费: (estimateData.partC.建设工程费 || 0).toFixed(2),
      设备购置费: (estimateData.partC.设备购置费 || 0).toFixed(2),
      安装工程费: (estimateData.partC.安装工程费 || 0).toFixed(2),
      其它费用: (estimateData.partC.其它费用 || 0).toFixed(2),
      合计: (estimateData.partC.合计 || 0).toFixed(2),
      占总投资比例: totalInvestment > 0 ? `${(((estimateData.partC.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '0%'
    })
  }

  // 添加D部分（建设期利息）
  if (estimateData.partD) {
    tableData.push({
      序号: '四',
      类别: '建设期利息',
      名称: '',
      建设工程费: '0.00',
      设备购置费: '0.00',
      安装工程费: '0.00',
      其它费用: '0.00',
      合计: (estimateData.partD.合计 || 0).toFixed(2),
      占总投资比例: totalInvestment > 0 ? `${(((estimateData.partD.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '0%'
    })
  }

  // 添加G部分（总投资）
  if (estimateData.partG) {
    tableData.push({
      序号: '六',
      类别: '总投资',
      名称: estimateData.partG.工程或费用名称 || '',
      建设工程费: '0.00',
      设备购置费: '0.00',
      安装工程费: '0.00',
      其它费用: '0.00',
      合计: (estimateData.partG.合计 || 0).toFixed(2),
      占总投资比例: '100.00%'
    })
  }

  return {
    id: 'investment_estimate',
    title: '投资估算简表',
    columns: ['序号', '类别', '名称', '建设工程费', '设备购置费', '安装工程费', '其它费用', '合计', '占总投资比例'],
    data: tableData,
    style: {
      headerBg: 'EEEEEE',
      stripe: true,
      align: 'center'
    }
  }
}

/**
 * 构建收入成本明细表
 */
export function buildRevenueCostTable(revenueCostData: any): TableResource | null {
  if (!revenueCostData) return null

  const tableData: Record<string, any>[] = []

  // 收入项目
  if (revenueCostData.revenueItems && Array.isArray(revenueCostData.revenueItems)) {
    const totalRevenue = revenueCostData.revenueItems.reduce((sum: number, item: any) => sum + (item.annualRevenue || 0), 0)
    
    revenueCostData.revenueItems.forEach((item: any, index: number) => {
      tableData.push({
        序号: index + 1,
        类型: '收入',
        名称: item.name || '',
        单价: (item.price || 0).toFixed(2),
        数量: item.quantity || 0,
        单位: item.unit || '',
        年收入: (item.annualRevenue || 0).toFixed(2),
        占收入比例: totalRevenue > 0 ? `${((item.annualRevenue / totalRevenue) * 100).toFixed(2)}%` : '0%'
      })
    })

    // 收入合计
    tableData.push({
      序号: '',
      类型: '收入合计',
      名称: '',
      单价: '',
      数量: '',
      单位: '',
      年收入: totalRevenue.toFixed(2),
      占收入比例: '100.00%'
    })
  }

  // 成本项目
  if (revenueCostData.costItems && Array.isArray(revenueCostData.costItems)) {
    const totalCost = revenueCostData.costItems.reduce((sum: number, item: any) => sum + (item.annualCost || 0), 0)

    revenueCostData.costItems.forEach((item: any, index: number) => {
      tableData.push({
        序号: index + 1,
        类型: '成本',
        名称: item.name || '',
        单价: (item.unitCost || 0).toFixed(2),
        数量: item.quantity || 0,
        单位: item.unit || '',
        年成本: (item.annualCost || 0).toFixed(2),
        占成本比例: totalCost > 0 ? `${((item.annualCost / totalCost) * 100).toFixed(2)}%` : '0%'
      })
    })

    // 成本合计
    tableData.push({
      序号: '',
      类型: '成本合计',
      名称: '',
      单价: '',
      数量: '',
      单位: '',
      年成本: totalCost.toFixed(2),
      占成本比例: '100.00%'
    })
  }

  return {
    id: 'revenue_cost_detail',
    title: '收入成本明细表',
    columns: ['序号', '类型', '名称', '单价', '数量', '单位', '年收入/成本', '占比'],
    data: tableData,
    style: {
      headerBg: 'EEEEEE',
      stripe: true,
      align: 'center'
    }
  }
}

/**
 * 构建财务指标汇总表
 */
export function buildFinancialIndicatorsTable(financialData: any): TableResource | null {
  if (!financialData) return null

  const indicators = financialData.financialIndicators || financialData || {}
  const revenueCost = financialData.revenueCost || {}

  // 计算年收入和年成本
  const totalRevenue = revenueCost.revenueItems?.reduce((sum: number, item: any) => sum + (item.annualRevenue || 0), 0) || 0
  const totalCost = revenueCost.costItems?.reduce((sum: number, item: any) => sum + (item.annualCost || 0), 0) || 0
  const annualProfit = totalRevenue - totalCost

  const tableData: Record<string, any>[] = [
    {
      指标: '投资回报率 (ROI)',
      数值: `${(indicators.roi || 0).toFixed(2)}%`,
      说明: '年净利润 / 总投资 × 100%'
    },
    {
      指标: '内部收益率 (IRR)',
      数值: `${(indicators.irr || 0).toFixed(2)}%`,
      说明: '使NPV为零的折现率'
    },
    {
      指标: '净现值 (NPV)',
      数值: `${(indicators.npv || 0).toFixed(2)} 万元`,
      说明: '未来现金流现值减去初始投资'
    },
    {
      指标: '年营业收入',
      数值: `${totalRevenue.toFixed(2)} 万元`,
      说明: '项目正常运营年度收入'
    },
    {
      指标: '年运营成本',
      数值: `${totalCost.toFixed(2)} 万元`,
      说明: '项目正常运营年度成本'
    },
    {
      指标: '年净利润',
      数值: `${annualProfit.toFixed(2)} 万元`,
      说明: '年营业收入 - 年运营成本'
    },
    {
      指标: '投资回收期',
      数值: `${(indicators.paybackPeriod || 0).toFixed(2)} 年`,
      说明: '收回初始投资所需时间'
    }
  ]

  return {
    id: 'financial_indicators',
    title: '财务指标汇总表',
    columns: ['指标', '数值', '说明'],
    data: tableData,
    style: {
      headerBg: 'EEEEEE',
      stripe: false,
      align: 'left'
    }
  }
}

/**
 * 构建还款计划表
 */
export function buildLoanRepaymentTable(loanData: any): TableResource | null {
  if (!loanData) return null

  const tableData: Record<string, any>[] = []

  // 从 construction_interest_details 或 loan_repayment_schedule 获取
  const repaymentSchedule = loanData.loan_repayment_schedule_simple || loanData.loan_repayment_schedule_detailed || loanData.construction_interest_details

  if (repaymentSchedule) {
    // 如果是分年利息数据
    if (repaymentSchedule.分年数据 && Array.isArray(repaymentSchedule.分年数据)) {
      repaymentSchedule.分年数据.forEach((year: any, index: number) => {
        tableData.push({
          年份: year.年份 || index + 1,
          期初本金: (year.期初本金累计 || 0).toFixed(2),
          当期借款: (year.当期借款金额 || 0).toFixed(2),
          当期利息: (year.当期利息 || 0).toFixed(2),
          期末本息: ((year.期初本金累计 || 0) + (year.当期借款金额 || 0) + (year.当期利息 || 0)).toFixed(2)
        })
      })
    } else if (Array.isArray(repaymentSchedule)) {
      repaymentSchedule.forEach((year: any, index: number) => {
        tableData.push({
          年份: year.年份 || index + 1,
          期初本金: (year.期初本金累计 || year.principal || 0).toFixed(2),
          当期借款: (year.当期借款金额 || year.loanAmount || 0).toFixed(2),
          当期利息: (year.当期利息 || year.interest || 0).toFixed(2),
          期末本息: ((year.期初本金累计 || 0) + (year.当期借款金额 || 0) + (year.当期利息 || 0)).toFixed(2)
        })
      })
    }
  }

  // 如果没有数据，添加空行提示
  if (tableData.length === 0) {
    tableData.push({
      年份: '-',
      期初本金: '暂无数据',
      当期借款: '暂无数据',
      当期利息: '暂无数据',
      期末本息: '暂无数据'
    })
  }

  return {
    id: 'loan_repayment',
    title: '还款计划表',
    columns: ['年份', '期初本金(万元)', '当期借款(万元)', '当期利息(万元)', '期末本息(万元)'],
    data: tableData,
    style: {
      headerBg: 'EEEEEE',
      stripe: true,
      align: 'center'
    }
  }
}

/**
 * 根据项目数据构建所有表格资源
 */
export function buildAllTableResources(projectData: any): Record<string, TableResource> {
  const tables: Record<string, TableResource> = {}

  // 投资估算表格
  const investmentTable = buildInvestmentEstimateTable(projectData.investment)
  if (investmentTable) {
    tables[investmentTable.id] = investmentTable
  }

  // 收入成本表格
  const revenueCostTable = buildRevenueCostTable(projectData.revenueCost)
  if (revenueCostTable) {
    tables[revenueCostTable.id] = revenueCostTable
  }

  // 财务指标表格
  const financialTable = buildFinancialIndicatorsTable(projectData)
  if (financialTable) {
    tables[financialTable.id] = financialTable
  }

  // 还款计划表格
  const loanTable = buildLoanRepaymentTable(projectData.investment)
  if (loanTable) {
    tables[loanTable.id] = loanTable
  }

  return tables
}
